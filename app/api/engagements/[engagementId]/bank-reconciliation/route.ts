/**
 * BANK RECONCILIATION API
 *
 * GET  /api/engagements/[engagementId]/bank-reconciliation  - fetch latest reconciliation
 * POST /api/engagements/[engagementId]/bank-reconciliation  - upload CSV, parse, match, save
 * PATCH /api/engagements/[engagementId]/bank-reconciliation - update notes or isReconciled
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bankReconciliations, extractedFinancials, engagements } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { parseCSVBankStatement, matchTransactions } from '@/lib/audit/bank-statement-parser';
import { z } from 'zod';

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
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

  const [reconciliation] = await db
    .select()
    .from(bankReconciliations)
    .where(
      and(
        eq(bankReconciliations.engagementId, engagementId),
        eq(bankReconciliations.orgId, session.orgId),
      ),
    )
    .orderBy(desc(bankReconciliations.version))
    .limit(1);

  return NextResponse.json({ reconciliation: reconciliation ?? null });
}

// ── POST (multipart CSV upload) ───────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  // Verify engagement
  const engagement = await db.query.engagements.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, engagementId), eq(e.orgId, session.orgId)),
  });
  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const accountName = (formData.get('accountName') as string | null) ?? 'Cash & Bank';

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });
  }

  const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_CSV_BYTES) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
  }

  // Read CSV text
  let csvText: string;
  try {
    csvText = await file.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 400 });
  }

  // Parse CSV
  const parseResult = parseCSVBankStatement(csvText);
  const { transactions, closingBalance, warnings } = parseResult;

  if (transactions.length === 0) {
    return NextResponse.json(
      { error: 'No valid transactions found in CSV', warnings },
      { status: 422 },
    );
  }

  // Fetch TB cash balance from extractedFinancials
  // Sum all cash_and_bank asset accounts
  const cashRows = await db
    .select({ bal: extractedFinancials.currentYearBalance })
    .from(extractedFinancials)
    .where(
      and(
        eq(extractedFinancials.engagementId, engagementId),
        eq(extractedFinancials.orgId, session.orgId),
        eq(extractedFinancials.auditArea, 'cash_and_bank'),
        eq(extractedFinancials.accountType, 'asset'),
      ),
    );

  let tbCashBalance = 0;
  for (const row of cashRows) {
    tbCashBalance += parseFloat(row.bal ?? '0');
  }

  const bankClosingBalance = closingBalance ?? 0;

  // Run matching
  const matchResult = matchTransactions(transactions, tbCashBalance, bankClosingBalance);
  const { matchedItems, unmatchedBankItems, difference } = matchResult;

  // Determine current version
  const [latest] = await db
    .select({ version: bankReconciliations.version })
    .from(bankReconciliations)
    .where(
      and(
        eq(bankReconciliations.engagementId, engagementId),
        eq(bankReconciliations.orgId, session.orgId),
      ),
    )
    .orderBy(desc(bankReconciliations.version))
    .limit(1);

  const nextVersion = latest ? latest.version + 1 : 1;

  // Save to DB
  const [saved] = await db
    .insert(bankReconciliations)
    .values({
      engagementId,
      orgId: session.orgId,
      accountName,
      bankClosingBalance: bankClosingBalance.toString(),
      tbCashBalance: tbCashBalance.toString(),
      difference: difference.toString(),
      transactions: transactions as unknown as Record<string, unknown>[],
      matchedItems: matchedItems as unknown as Record<string, unknown>[],
      unmatchedBankItems: unmatchedBankItems as unknown as Record<string, unknown>[],
      unmatchedTbItems: [] as unknown as Record<string, unknown>[],
      isReconciled: Math.abs(difference) < 0.01,
      version: nextVersion,
    })
    .returning();

  return NextResponse.json({
    reconciliation: saved,
    parseWarnings: warnings,
    stats: {
      totalTransactions: transactions.length,
      flaggedCount: matchedItems.length,
      unmatchedCount: unmatchedBankItems.length,
      tbCashBalance,
      bankClosingBalance,
      difference,
    },
  });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

const PatchSchema = z.object({
  notes: z.string().optional(),
  isReconciled: z.boolean().optional(),
}).strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let data: z.infer<typeof PatchSchema>;
  try {
    data = PatchSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }

  // Find latest reconciliation
  const [existing] = await db
    .select()
    .from(bankReconciliations)
    .where(
      and(
        eq(bankReconciliations.engagementId, engagementId),
        eq(bankReconciliations.orgId, session.orgId),
      ),
    )
    .orderBy(desc(bankReconciliations.version))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'No reconciliation found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.isReconciled !== undefined) updates.isReconciled = data.isReconciled;

  const [updated] = await db
    .update(bankReconciliations)
    .set(updates)
    .where(eq(bankReconciliations.id, existing.id))
    .returning();

  return NextResponse.json({ reconciliation: updated });
}
