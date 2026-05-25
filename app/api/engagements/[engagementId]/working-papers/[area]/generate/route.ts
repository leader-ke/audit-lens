/**
 * WORKING PAPER GENERATION ENDPOINT
 * POST /api/engagements/[engagementId]/working-papers/[area]/generate
 *
 * The core AI feature: generates an ISA-compliant working paper for a
 * specific audit area based on the trial balance and any uploaded documents.
 */
import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { workingPapers, usageLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { generateWorkingPaper, type TrialBalanceLine, type EngagementContext, type VerbosityMode } from '@/lib/ai/working-paper';
import type { SystemicIssue } from '@/lib/audit/systemic-issues';
import { mapAccounts } from '@/lib/audit/account-mapper';
import { computeAnalytics } from '@/lib/audit/analytics';
import type { IndustryType } from '@/lib/audit/industry-templates';
import { AUDIT_AREAS, type AuditArea } from '@/lib/audit/isa-standards';
import { decryptField } from '@/lib/encryption';

export const maxDuration = 120; // 2 minutes - Claude needs 15–30s for a full working paper

const VALID_AREAS = Object.keys(AUDIT_AREAS) as AuditArea[];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string; area: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId, area } = await params;

  if (!VALID_AREAS.includes(area as AuditArea)) {
    return NextResponse.json({ error: 'Invalid audit area' }, { status: 400 });
  }

  try {
    // Fetch engagement
    const engagement = await db.query.engagements.findFirst({
      where: (e, { eq, and }) => and(eq(e.id, engagementId), eq(e.orgId, session.orgId)),
      with: { client: true } as any,
    });
    if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });

    // Parse systemic issues register from the engagement (populated during file upload)
    let systemicIssues: SystemicIssue[] | undefined;
    if (engagement.aiRiskSummary) {
      try {
        const parsed = JSON.parse(engagement.aiRiskSummary);
        if (Array.isArray(parsed.systemicIssues)) {
          systemicIssues = parsed.systemicIssues as SystemicIssue[];
        }
      } catch {
        // malformed JSON - proceed without systemic issues
      }
    }

    // Check plan feature access
    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.id, session.orgId),
    });

    // Get trial balance data
    const financials = await db.query.extractedFinancials.findMany({
      where: (f, { eq }) => eq(f.engagementId, engagementId),
    });

    if (financials.length === 0) {
      return NextResponse.json(
        { error: 'No trial balance data found. Please upload and process a trial balance first.' },
        { status: 400 }
      );
    }

    // Get any uploaded documents for additional context
    const files = await db.query.engagementFiles.findMany({
      where: (f, { eq, and }) => and(
        eq(f.engagementId, engagementId),
        eq(f.processingStatus, 'done')
      ),
    });

    const additionalText = files
      .map(f => {
        if (!f.extractedText) return '';
        try { return decryptField(f.extractedText); } catch { return ''; }
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    // Build trial balance lines - fsCategory may be stored from a previous upload
    // (after the schema migration); for older rows it will be null, so we fall back
    // to the mapper results below.
    const trialBalanceLines: TrialBalanceLine[] = financials.map(f => ({
      accountCode: f.accountCode || undefined,
      accountName: f.accountName,
      accountType: f.accountType,
      currentYearBalance: parseFloat(f.currentYearBalance),
      priorYearBalance: f.priorYearBalance ? parseFloat(f.priorYearBalance) : undefined,
      variancePct: f.variancePct ? parseFloat(f.variancePct) : undefined,
      isMaterial: f.isMaterial,
      isFlagged: f.isFlagged,
      flagReason: f.flagReason || undefined,
      fsCategory: (f as any).fsCategory || undefined,
      mappingConfidence: (f as any).mappingConfidence ? parseFloat((f as any).mappingConfidence) : undefined,
    }));

    // Compute TB balance check using SIGN of balance - not account type.
    // Credit-normal accounts (liabilities, equity, revenue, contra-assets) are stored
    // as NEGATIVE balances in this system. Positive balance = debit side; negative = credit side.
    // Using account_type + Math.abs() is WRONG because contra-asset/contra-expense accounts
    // (e.g. Accumulated Depreciation, Accrued Expenses) are stored as negative but tagged
    // with debit-nature types - that approach inflates debit totals and produces a false imbalance.
    let tbDebitTotal = 0;
    let tbCreditTotal = 0;
    for (const line of trialBalanceLines) {
      if (line.currentYearBalance > 0) {
        tbDebitTotal += line.currentYearBalance;
      } else if (line.currentYearBalance < 0) {
        tbCreditTotal += Math.abs(line.currentYearBalance);
      }
    }
    const tbImbalance = Math.round(Math.abs(tbDebitTotal - tbCreditTotal));

    const engagementContext: EngagementContext = {
      clientName: (engagement as any).client?.name || 'Client',
      entityType: (engagement as any).client?.entityType || 'limited_company',
      financialYearEnd: engagement.financialYearEnd.toLocaleDateString('en-KE', {
        day: 'numeric', month: 'long', year: 'numeric'
      }),
      auditType: engagement.auditType,
      materialityAmount: parseFloat(engagement.materialityAmount || '0'),
      performanceMateriality: parseFloat(engagement.performanceMateriality || '0'),
      trivialThreshold: parseFloat(engagement.trivialThreshold || '0'),
      materialityBasis: engagement.materialityBasis || undefined,
      tbImbalance: tbImbalance > 0 ? tbImbalance : undefined,
    };

    const aiConfig = {
      provider: (org?.aiProvider || 'groq') as any,
      model: org?.aiModel || 'llama-3.3-70b-versatile',
    };

    // Run analytics engine to pre-compute ratios, anomalies, and financial summary
    const clientEntityType: string = (engagement as any).client?.entityType ?? 'limited_company';
    const industryMap: Record<string, IndustryType> = {
      sacco: 'sacco', ngo: 'ngo', school: 'school',
      manufacturing: 'manufacturing', retail: 'retail',
      saas: 'saas_tech', tech: 'saas_tech',
    };
    const industry: IndustryType = industryMap[clientEntityType] ?? 'general';

    const mappedAccounts = mapAccounts(
      trialBalanceLines.map(l => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        currentYearBalance: l.currentYearBalance,
        priorYearBalance: l.priorYearBalance,
      })),
      industry,
    );

    // Enrich TB lines with mapper results - fills fsCategory for rows that
    // predate the schema migration or weren't stored during upload.
    const enrichedLines: TrialBalanceLine[] = trialBalanceLines.map((line, idx) => ({
      ...line,
      fsCategory: line.fsCategory || mappedAccounts[idx]?.fsCategory,
      mappingConfidence: line.mappingConfidence ?? mappedAccounts[idx]?.mappingConfidence,
    }));

    const analytics = computeAnalytics(mappedAccounts, engagementContext.materialityAmount);

    // Accept verbosity from query param; default to 'concise' for smaller datasets
    const verbosity = (req.nextUrl.searchParams.get('verbosity') as VerbosityMode) || 'concise';

    // Upsert stub immediately so the client can start polling
    const paperRef = `${AUDIT_AREAS[area as AuditArea]?.workingPaperRef || 'WP'}-${Date.now().toString().slice(-4)}`;
    const existing = await db.query.workingPapers.findFirst({
      where: (w, { eq, and }) => and(eq(w.engagementId, engagementId), eq(w.auditArea, area as AuditArea)),
    });

    let paperId: string;
    if (existing) {
      await db.update(workingPapers).set({
        generationStatus: 'generating',
        version: (existing.version || 1) + 1,
        updatedAt: new Date(),
      }).where(eq(workingPapers.id, existing.id));
      paperId = existing.id;
    } else {
      const [stub] = await db.insert(workingPapers).values({
        engagementId,
        orgId:            session.orgId,
        auditArea:        area as AuditArea,
        paperRef,
        title:            AUDIT_AREAS[area as AuditArea]?.label || area,
        aiGenerated:      true,
        aiProvider:       aiConfig.provider,
        aiModel:          aiConfig.model,
        generationStatus: 'generating',
      }).returning();
      paperId = stub.id;
    }

    const savedPaper = await db.query.workingPapers.findFirst({
      where: (w, { eq }) => eq(w.id, paperId),
    });

    // Capture for after() closure
    const capturedVerbosity = verbosity;
    const capturedAnalytics = analytics;
    const capturedLines     = enrichedLines;
    const capturedText      = additionalText;
    const capturedIssues    = systemicIssues;
    const capturedStart     = Date.now();

    after(async () => {
      try {
        const workingPaper = await generateWorkingPaper(
          area as AuditArea,
          capturedLines,
          engagementContext,
          aiConfig,
          capturedText || undefined,
          capturedIssues,
          capturedVerbosity,
          capturedAnalytics.summaryForAI || undefined,
        );
        const processingTimeMs = Date.now() - capturedStart;

        const extractedCitations = [
          ...workingPaper.analyticalProcedures.flatMap((p: any) => p.citation ? [p.citation] : []),
          ...workingPaper.keyObservations.flatMap((o: any) => o.citation ? [o.citation] : []),
        ];

        await db.update(workingPapers).set({
          paperRef,
          title:            workingPaper.title,
          isaReference:     workingPaper.isaReference,
          content:          JSON.stringify(workingPaper, null, 2),
          aiProvider:       aiConfig.provider,
          aiModel:          aiConfig.model,
          sourceCitations:  extractedCitations,
          reviewed:         false,
          reviewedBy:       null,
          reviewedAt:       null,
          approved:         false,
          approvedBy:       null,
          approvedAt:       null,
          generationStatus: 'done',
          updatedAt:        new Date(),
        }).where(eq(workingPapers.id, paperId));

        await db.insert(usageLogs).values({
          orgId: session.orgId, userId: session.userId, engagementId,
          action: 'working_paper_generate',
          auditArea: area as AuditArea,
          aiProvider: aiConfig.provider,
          aiModel: aiConfig.model,
          processingTimeMs,
        }).catch(() => {});
      } catch (err) {
        console.error('Working paper background generation failed:', err);
        await db.update(workingPapers)
          .set({ generationStatus: 'error', updatedAt: new Date() })
          .where(eq(workingPapers.id, paperId))
          .catch(() => {});
      }
    });

    return NextResponse.json({ workingPaper: savedPaper }, { status: 202 });
  } catch (error) {
    console.error('Working paper generation error:', error);
    return NextResponse.json({ error: 'Failed to generate working paper' }, { status: 500 });
  }
}
