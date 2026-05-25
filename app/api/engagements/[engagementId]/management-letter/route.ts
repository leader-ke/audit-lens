import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { managementLetters, usageLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import {
  generateManagementLetter,
  type WPFindingSummary,
  type LetterEngagementContext,
} from '@/lib/ai/management-letter';

export const maxDuration = 120;

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { engagementId } = await params;

  const letter = await db.query.managementLetters.findFirst({
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

    const papers = await db.query.workingPapers.findMany({
      where: (wp, { eq }) => eq(wp.engagementId, engagementId),
    });

    if (papers.length === 0) {
      return NextResponse.json(
        { error: 'No working papers found. Generate working papers before creating the management letter.' },
        { status: 400 }
      );
    }

    // Build WP finding summaries
    const wpSummaries: WPFindingSummary[] = papers.map(wp => {
      let parsed: any = {};
      try { parsed = JSON.parse(wp.content ?? '{}'); } catch {}

      return {
        auditArea: wp.auditArea,
        areaLabel: parsed.title?.split(' Working Paper')[0] || wp.auditArea,
        paperRef: parsed.paperRef || `WP-${wp.auditArea.toUpperCase().slice(0, 4)}-001`,
        keyObservations: (Array.isArray(parsed.keyObservations) ? parsed.keyObservations : [])
          .map((o: any) => ({
            observation: o.observation ?? '',
            risk: o.risk ?? 'low',
            assertionAffected: o.assertionAffected ?? '',
            recommendation: o.recommendation ?? undefined,
          })),
        areasForFurtherTesting: Array.isArray(parsed.areasForFurtherTesting)
          ? parsed.areasForFurtherTesting
          : [],
      };
    });

    const client = (engagement as any).client;
    const context: LetterEngagementContext = {
      clientName: client?.name || 'Client',
      entityType: client?.entityType?.replace(/_/g, ' ') || 'limited company',
      financialYearEnd: new Date(engagement.financialYearEnd).toLocaleDateString('en-KE', {
        day: 'numeric', month: 'long', year: 'numeric',
      }),
      auditType: engagement.auditType,
      auditorFirmName: org?.name || 'Audit Firm',
      materialityAmount: parseFloat(engagement.materialityAmount || '0'),
    };

    const aiConfig = {
      provider: (org?.aiProvider || 'groq') as any,
      model: org?.aiModel || 'llama-3.3-70b-versatile',
    };

    // Upsert stub immediately
    const existing = await db.query.managementLetters.findFirst({
      where: (l, { eq, and }) => and(eq(l.engagementId, engagementId), eq(l.orgId, session.orgId)),
    });
    const nextVersion = existing ? existing.version + 1 : 1;

    let letterId: string;
    if (existing) {
      await db.update(managementLetters)
        .set({ generationStatus: 'generating', version: nextVersion, updatedAt: new Date() })
        .where(eq(managementLetters.id, existing.id));
      letterId = existing.id;
    } else {
      const [stub] = await db.insert(managementLetters).values({
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

    const letter = await db.query.managementLetters.findFirst({
      where: (l, { eq }) => eq(l.id, letterId),
    });

    after(async () => {
      try {
        const result = await generateManagementLetter(context, wpSummaries, aiConfig);
        await db.update(managementLetters).set({
          findings:          result.findings as any,
          introduction:      result.introduction,
          conclusion:        result.conclusion,
          fullLetterContent: result.fullLetterContent,
          generationStatus:  'done',
          updatedAt:         new Date(),
        }).where(eq(managementLetters.id, letterId));
        await db.insert(usageLogs).values({
          orgId: session.orgId, userId: session.userId, engagementId,
          action: 'generate_management_letter',
        }).catch(() => {});
      } catch (err) {
        console.error('Management letter background generation failed:', err);
        await db.update(managementLetters)
          .set({ generationStatus: 'error', updatedAt: new Date() })
          .where(eq(managementLetters.id, letterId))
          .catch(() => {});
      }
    });

    return NextResponse.json({ letter }, { status: 202 });

  } catch (error) {
    console.error('Management letter generation error:', error);
    return NextResponse.json({ error: 'Failed to generate management letter' }, { status: 500 });
  }
}

// ─── PATCH: update management response for a finding, or finalise ─────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { engagementId } = await params;

  const body = await req.json().catch(() => ({}));

  const existing = await db.query.managementLetters.findFirst({
    where: (l, { eq, and }) => and(eq(l.engagementId, engagementId), eq(l.orgId, session.orgId)),
  });
  if (!existing) return NextResponse.json({ error: 'No letter found' }, { status: 404 });

  const update: Record<string, any> = { updatedAt: new Date() };

  if (body.action === 'finalise') {
    update.isDraft = false;
  } else if (body.action === 'revert_to_draft') {
    update.isDraft = true;
  } else if (body.action === 'update_response' && typeof body.findingIndex === 'number') {
    // Update management response for a specific finding
    const findings = Array.isArray(existing.findings) ? [...existing.findings as any[]] : [];
    if (findings[body.findingIndex]) {
      findings[body.findingIndex] = { ...findings[body.findingIndex], managementResponse: body.response ?? '' };
    }
    update.findings = findings;
  }

  const [updated] = await db.update(managementLetters)
    .set(update)
    .where(and(eq(managementLetters.engagementId, engagementId), eq(managementLetters.orgId, session.orgId)))
    .returning();

  return NextResponse.json({ letter: updated });
}
