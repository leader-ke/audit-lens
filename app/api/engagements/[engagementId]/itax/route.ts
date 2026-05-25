/**
 * KRA iTax Reconciliation API
 *
 * GET  /api/engagements/[engagementId]/itax  - fetch latest reconciliation or null
 * POST /api/engagements/[engagementId]/itax  - compute from TB and upsert to DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { itaxReconciliations, extractedFinancials, engagements } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { computeItaxReconciliation } from '@/lib/audit/itax-engine';

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  const engagement = await db.query.engagements.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, engagementId), eq(e.orgId, session.orgId)),
  });
  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });

  const [reconciliation] = await db
    .select()
    .from(itaxReconciliations)
    .where(
      and(
        eq(itaxReconciliations.engagementId, engagementId),
        eq(itaxReconciliations.orgId, session.orgId),
      ),
    )
    .orderBy(desc(itaxReconciliations.createdAt))
    .limit(1);

  return NextResponse.json({ reconciliation: reconciliation ?? null });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  // Verify engagement belongs to org
  const engagement = await db.query.engagements.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, engagementId), eq(e.orgId, session.orgId)),
  });
  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });

  // Resolve tax year from request body or derive from financial year end
  let taxYear: number;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.taxYear && typeof body.taxYear === 'number') {
      taxYear = body.taxYear;
    } else {
      taxYear = engagement.financialYearEnd
        ? new Date(engagement.financialYearEnd).getFullYear()
        : new Date().getFullYear();
    }
  } catch {
    taxYear = new Date().getFullYear();
  }

  // Fetch all extracted financials for the engagement
  const financials = await db
    .select()
    .from(extractedFinancials)
    .where(
      and(
        eq(extractedFinancials.engagementId, engagementId),
        eq(extractedFinancials.orgId, session.orgId),
      ),
    );

  if (financials.length === 0) {
    return NextResponse.json(
      { error: 'No trial balance data found. Upload and process a trial balance first.' },
      { status: 422 },
    );
  }

  // Run the engine
  const result = computeItaxReconciliation(financials, engagementId, session.orgId, taxYear);

  // Upsert: delete existing, insert fresh
  await db
    .delete(itaxReconciliations)
    .where(
      and(
        eq(itaxReconciliations.engagementId, engagementId),
        eq(itaxReconciliations.orgId, session.orgId),
      ),
    );

  const [reconciliation] = await db
    .insert(itaxReconciliations)
    .values({
      engagementId: result.engagementId,
      orgId: result.orgId,
      taxYear: result.taxYear,
      vatRevenueBase: result.vatRevenueBase,
      vatExpectedOutput: result.vatExpectedOutput,
      vatPerTb: result.vatPerTb,
      vatDifference: result.vatDifference,
      vatObservations: result.vatObservations,
      payePayrollBase: result.payePayrollBase,
      payePerTb: result.payePerTb,
      payeDifference: result.payeDifference,
      payeObservations: result.payeObservations,
      corpTaxPbt: result.corpTaxPbt,
      corpTaxExpected: result.corpTaxExpected,
      corpTaxPerTb: result.corpTaxPerTb,
      corpTaxDifference: result.corpTaxDifference,
      corpTaxObservations: result.corpTaxObservations,
      overallRiskLevel: result.overallRiskLevel,
      riskNature: result.riskNature,
      summary: result.summary,
    })
    .returning();

  return NextResponse.json({ reconciliation }, { status: 201 });
}
