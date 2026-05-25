import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { engagementLetters, usageLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import {
  generateEngagementLetter,
  type EngagementLetterContext,
} from '@/lib/ai/engagement-letter';

export const maxDuration = 120;

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { engagementId } = await params;

  const letter = await db.query.engagementLetters.findFirst({
    where: (l, { eq, and }) => and(eq(l.engagementId, engagementId), eq(l.orgId, session.orgId)),
    orderBy: (l, { desc }) => [desc(l.version)],
  });

  return NextResponse.json({ letter: letter ?? null });
}

// ─── POST: generate / regenerate ─────────────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { engagementId } = await params;

  try {
    const engagement = await db.query.engagements.findFirst({
      where: (e, { eq, and }) => and(eq(e.id, engagementId), eq(e.orgId, session.orgId)),
      with: { client: true } as any,
    });
    if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });

    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.id, session.orgId),
    });

    // Optionally resolve the partner name from the assigned partner user
    let auditorPartnerName: string | undefined;
    if (engagement.assignedPartner) {
      const partner = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, engagement.assignedPartner!),
      });
      auditorPartnerName = partner?.fullName ?? undefined;
    }

    const client = (engagement as any).client;
    const context: EngagementLetterContext = {
      clientName:       client?.name || 'Client',
      entityType:       client?.entityType?.replace(/_/g, ' ') || 'limited company',
      financialYearEnd: new Date(engagement.financialYearEnd).toLocaleDateString('en-KE', {
        day: 'numeric', month: 'long', year: 'numeric',
      }),
      auditType:        engagement.auditType,
      auditorFirmName:  org?.name || 'Audit Firm',
      materialityAmount: parseFloat(engagement.materialityAmount || '0'),
      auditorPartnerName,
    };

    const aiConfig = {
      provider: (org?.aiProvider || 'anthropic') as any,
      model:    org?.aiModel    || 'claude-sonnet-4-6',
    };

    // Upsert stub immediately so the client has something to poll
    const existing = await db.query.engagementLetters.findFirst({
      where: (l, { eq, and }) => and(eq(l.engagementId, engagementId), eq(l.orgId, session.orgId)),
    });
    const nextVersion = existing ? existing.version + 1 : 1;

    let letterId: string;
    if (existing) {
      await db.update(engagementLetters)
        .set({ generationStatus: 'generating', version: nextVersion, updatedAt: new Date() })
        .where(eq(engagementLetters.id, existing.id));
      letterId = existing.id;
    } else {
      const [stub] = await db.insert(engagementLetters).values({
        engagementId,
        orgId:            session.orgId,
        isDraft:          true,
        aiGenerated:      true,
        version:          nextVersion,
        generationStatus: 'generating',
        updatedAt:        new Date(),
      }).returning();
      letterId = stub.id;
    }

    const letter = await db.query.engagementLetters.findFirst({
      where: (l, { eq }) => eq(l.id, letterId),
    });

    // Generate in background - survives tab switches and client navigation
    after(async () => {
      try {
        const result = await generateEngagementLetter(context, aiConfig);
        await db.update(engagementLetters).set({
          introduction:                  result.introduction,
          financialStatementsComponents: result.financialStatementsComponents,
          scope:                         result.scope,
          managementResponsibilities:    result.managementResponsibilities,
          auditorResponsibilities:       result.auditorResponsibilities,
          limitationOfAuditRisk:         result.limitationOfAuditRisk,
          reportingClause:               result.reportingClause,
          feesClause:                    result.feesClause,
          independenceStatement:         result.independenceStatement,
          confidentialityClause:         result.confidentialityClause,
          liabilityClause:               result.liabilityClause,
          governingLawClause:            result.governingLawClause,
          otherMatters:                  result.otherMatters,
          acceptanceBlock:               result.acceptanceBlock,
          fullLetterContent:             result.fullLetterContent,
          generationStatus:              'done',
          updatedAt:                     new Date(),
        }).where(eq(engagementLetters.id, letterId));
        await db.insert(usageLogs).values({
          orgId: session.orgId, userId: session.userId, engagementId,
          action: 'generate_engagement_letter',
        }).catch(() => {});
      } catch (err) {
        console.error('Engagement letter background generation failed:', err);
        await db.update(engagementLetters)
          .set({ generationStatus: 'error', updatedAt: new Date() })
          .where(eq(engagementLetters.id, letterId))
          .catch(() => {});
      }
    });

    return NextResponse.json({ letter }, { status: 202 });

  } catch (error) {
    console.error('Engagement letter generation error:', error);
    return NextResponse.json({ error: 'Failed to generate engagement letter' }, { status: 500 });
  }
}

// ─── PATCH: finalise or revert_to_draft ──────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { engagementId } = await params;

  const body = await req.json().catch(() => ({}));

  const existing = await db.query.engagementLetters.findFirst({
    where: (l, { eq, and }) => and(eq(l.engagementId, engagementId), eq(l.orgId, session.orgId)),
  });
  if (!existing) return NextResponse.json({ error: 'No letter found' }, { status: 404 });

  const update: Record<string, any> = { updatedAt: new Date() };

  if (body.action === 'finalise') {
    update.isDraft = false;
  } else if (body.action === 'revert_to_draft') {
    update.isDraft = true;
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const [updated] = await db.update(engagementLetters)
    .set(update)
    .where(and(eq(engagementLetters.engagementId, engagementId), eq(engagementLetters.orgId, session.orgId)))
    .returning();

  return NextResponse.json({ letter: updated });
}
