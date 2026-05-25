import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { auditReports, usageLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { generateAuditReport, type WorkingPaperSummary, type ReportEngagementContext } from '@/lib/ai/audit-report';

export const maxDuration = 120;

// ─── GET: fetch existing report for this engagement ───────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  const report = await db.query.auditReports.findFirst({
    where: (r, { eq, and }) => and(eq(r.engagementId, engagementId), eq(r.orgId, session.orgId)),
    orderBy: (r, { desc }) => [desc(r.version)],
  });

  return NextResponse.json({ report: report ?? null });
}

// ─── POST: generate (or regenerate) report ────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  try {
    // Fetch engagement + client
    const engagement = await db.query.engagements.findFirst({
      where: (e, { eq, and }) => and(eq(e.id, engagementId), eq(e.orgId, session.orgId)),
      with: { client: true } as any,
    });
    if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });

    // Fetch org for AI config + firm name
    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.id, session.orgId),
    });

    // Fetch all working papers for this engagement
    const papers = await db.query.workingPapers.findMany({
      where: (wp, { eq }) => eq(wp.engagementId, engagementId),
    });

    if (papers.length === 0) {
      return NextResponse.json(
        { error: 'No working papers found. Generate working papers before creating the audit report.' },
        { status: 400 }
      );
    }

    // Parse working papers into summaries
    const wpSummaries: WorkingPaperSummary[] = papers.map(wp => {
      let parsed: any = {};
      try { parsed = JSON.parse(wp.content ?? '{}'); } catch {}

      const keyObs: any[] = Array.isArray(parsed.keyObservations) ? parsed.keyObservations : [];
      return {
        auditArea: wp.auditArea,
        areaLabel: parsed.title?.split(' Working Paper')[0] || wp.auditArea,
        paperRef: parsed.paperRef || `WP-${wp.auditArea.toUpperCase().slice(0, 4)}-001`,
        preliminaryConclusion: parsed.preliminaryConclusion || '',
        evidenceSufficiency: typeof parsed.evidenceSufficiency === 'number' ? parsed.evidenceSufficiency : 50,
        highRiskCount: keyObs.filter((o: any) => o.risk === 'high').length,
        mediumRiskCount: keyObs.filter((o: any) => o.risk === 'medium').length,
        keyObservations: keyObs.slice(0, 5).map((o: any) => ({
          observation: o.observation || '',
          risk: o.risk || 'low',
          assertionAffected: o.assertionAffected || '',
        })),
        dataLimitations: Array.isArray(parsed.dataLimitations) ? parsed.dataLimitations : [],
      };
    });

    // Compute TB imbalance from financials (same logic as working-paper generate route)
    const financials = await db.query.extractedFinancials.findMany({
      where: (f, { eq }) => eq(f.engagementId, engagementId),
    });
    let debitTotal = 0, creditTotal = 0;
    for (const f of financials) {
      const bal = parseFloat(f.currentYearBalance);
      if (bal > 0) debitTotal += bal;
      else if (bal < 0) creditTotal += Math.abs(bal);
    }
    const tbImbalance = Math.round(Math.abs(debitTotal - creditTotal));

    const client = (engagement as any).client;
    const context: ReportEngagementContext = {
      clientName: client?.name || 'Client',
      entityType: client?.entityType?.replace(/_/g, ' ') || 'limited company',
      financialYearEnd: new Date(engagement.financialYearEnd).toLocaleDateString('en-KE', {
        day: 'numeric', month: 'long', year: 'numeric',
      }),
      auditType: engagement.auditType,
      materialityAmount: parseFloat(engagement.materialityAmount || '0'),
      materialityBasis: engagement.materialityBasis || undefined,
      performanceMateriality: parseFloat(engagement.performanceMateriality || '0'),
      auditorFirmName: org?.name || 'Audit Firm',
      hasTBImbalance: tbImbalance > 0,
      tbImbalance: tbImbalance > 0 ? tbImbalance : undefined,
    };

    const aiConfig = {
      provider: (org?.aiProvider || 'groq') as any,
      model: org?.aiModel || 'llama-3.3-70b-versatile',
    };

    // Upsert stub immediately
    const existing = await db.query.auditReports.findFirst({
      where: (r, { eq, and }) => and(eq(r.engagementId, engagementId), eq(r.orgId, session.orgId)),
    });
    const nextVersion = existing ? (existing.version + 1) : 1;

    let reportId: string;
    if (existing) {
      await db.update(auditReports)
        .set({ generationStatus: 'generating', version: nextVersion, updatedAt: new Date() })
        .where(eq(auditReports.id, existing.id));
      reportId = existing.id;
    } else {
      const [stub] = await db.insert(auditReports).values({
        engagementId,
        orgId:            session.orgId,
        isDraft:          true,
        aiGenerated:      true,
        version:          nextVersion,
        generationStatus: 'generating',
        updatedAt:        new Date(),
      }).returning();
      reportId = stub.id;
    }

    const report = await db.query.auditReports.findFirst({
      where: (r, { eq }) => eq(r.id, reportId),
    });

    after(async () => {
      try {
        const result = await generateAuditReport(context, wpSummaries, aiConfig);
        await db.update(auditReports).set({
          reportType:                     result.reportType,
          addressee:                      result.addressee,
          opinionParagraph:               result.opinionParagraph,
          basisOfOpinion:                 result.basisOfOpinion,
          keyAuditMatters:                result.keyAuditMatters as any,
          responsibilitiesOfManagement:   result.responsibilitiesOfManagement,
          auditorResponsibilities:        result.auditorResponsibilities,
          otherReportingResponsibilities: result.otherReportingResponsibilities ?? null,
          emphasisOfMatter:               result.emphasisOfMatter ?? null,
          fullReportContent:              result.fullReportContent,
          generationStatus:               'done',
          updatedAt:                      new Date(),
        }).where(eq(auditReports.id, reportId));
        await db.insert(usageLogs).values({
          orgId: session.orgId, userId: session.userId, engagementId,
          action: 'generate_audit_report',
        }).catch(() => {});
      } catch (err) {
        console.error('Audit report background generation failed:', err);
        await db.update(auditReports)
          .set({ generationStatus: 'error', updatedAt: new Date() })
          .where(eq(auditReports.id, reportId))
          .catch(() => {});
      }
    });

    return NextResponse.json({ report }, { status: 202 });

  } catch (error) {
    console.error('Audit report generation error:', error);
    return NextResponse.json({ error: 'Failed to generate audit report' }, { status: 500 });
  }
}

// ─── PATCH: approve report ────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;
  const body = await req.json().catch(() => ({}));

  const existing = await db.query.auditReports.findFirst({
    where: (r, { eq, and }) => and(eq(r.engagementId, engagementId), eq(r.orgId, session.orgId)),
  });
  if (!existing) return NextResponse.json({ error: 'No report found' }, { status: 404 });

  const update: Record<string, any> = { updatedAt: new Date() };

  if (body.action === 'approve') {
    update.isDraft = false;
    update.approvedBy = session.userId;
    update.approvedAt = new Date();
  } else if (body.action === 'revert_to_draft') {
    update.isDraft = true;
    update.approvedBy = null;
    update.approvedAt = null;
  }

  const [updated] = await db.update(auditReports)
    .set(update)
    .where(and(eq(auditReports.engagementId, engagementId), eq(auditReports.orgId, session.orgId)))
    .returning();

  return NextResponse.json({ report: updated });
}
