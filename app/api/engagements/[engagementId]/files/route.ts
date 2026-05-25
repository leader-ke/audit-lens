/**
 * FILE UPLOAD + TRIAL BALANCE PROCESSING
 * POST /api/engagements/[engagementId]/files
 *
 * Accepts multipart/form-data with a CSV or Excel trial balance.
 * Parses it immediately, populates extracted_financials, and saves the file record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { engagementFiles, extractedFinancials, engagements } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { encryptField } from '@/lib/encryption';
import { parseTrialBalance } from '@/lib/audit/trial-balance-parser';
import { mapAccounts } from '@/lib/audit/account-mapper';
import { computeAnalytics } from '@/lib/audit/analytics';
import { FS_CATEGORY_META } from '@/lib/audit/fs-categories';
import type { IndustryType } from '@/lib/audit/industry-templates';
import { detectSystemicIssues } from '@/lib/audit/systemic-issues';

const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream', // some browsers send this for .csv
];

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// DELETE /api/engagements/[engagementId]/files?fileId=xxx
// Deletes a file record. If it's a trial balance, also clears extracted_financials.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;
  const fileId = req.nextUrl.searchParams.get('fileId');
  if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 });

  const file = await db.query.engagementFiles.findFirst({
    where: (f, { eq, and }) => and(
      eq(f.id, fileId),
      eq(f.engagementId, engagementId),
      eq(f.orgId, session.orgId),
    ),
  });
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  // If it's a trial balance, clear the parsed financials too
  if (file.documentType === 'trial_balance') {
    await db.delete(extractedFinancials).where(
      and(
        eq(extractedFinancials.engagementId, engagementId),
        eq(extractedFinancials.orgId, session.orgId),
      )
    );
  }

  await db.delete(engagementFiles).where(eq(engagementFiles.id, fileId));

  return NextResponse.json({ deleted: true, clearedFinancials: file.documentType === 'trial_balance' });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { engagementId } = await params;

  const files = await db.query.engagementFiles.findMany({
    where: (f, { eq, and }) => and(
      eq(f.engagementId, engagementId),
      eq(f.orgId, session.orgId),
    ),
    orderBy: (f, { desc }) => [desc(f.createdAt)],
  });

  return NextResponse.json({ files });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  // Verify engagement belongs to this org
  const engagement = await db.query.engagements.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, engagementId), eq(e.orgId, session.orgId)),
    with: { client: true } as any,
  });
  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const documentType = (formData.get('documentType') as string) || 'trial_balance';

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 });

  const mimeType = file.type || 'application/octet-stream';
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  const isCsv = file.name.endsWith('.csv') || mimeType.includes('csv');

  if (!isExcel && !isCsv && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: 'Unsupported file type. Please upload a CSV or Excel file.' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Save initial file record
  const materialityAmount = parseFloat(engagement.materialityAmount || '0') || 100_000;
  // For trial balance uploads, clean up any previous failed records first
  // (failed records contain no extracted data and are just noise)
  if (documentType === 'trial_balance') {
    await db.delete(engagementFiles).where(
      and(
        eq(engagementFiles.engagementId, engagementId),
        eq(engagementFiles.orgId, session.orgId),
        eq(engagementFiles.documentType, 'trial_balance' as any),
        eq(engagementFiles.processingStatus, 'failed'),
      )
    );
  }

  const safeFilename = `${engagementId}-${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;

  const [fileRecord] = await db.insert(engagementFiles).values({
    engagementId,
    orgId: session.orgId,
    filename: safeFilename,
    originalName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    blobUrl: `local://${safeFilename}`, // replaced with Vercel Blob URL in production
    documentType: documentType as any,
    processingStatus: 'processing',
    uploadedBy: session.userId,
  }).returning();

  // For trial balance documents - parse immediately
  if (documentType === 'trial_balance') {
    try {
      const result = parseTrialBalance(buffer, mimeType, materialityAmount);

      // Determine industry from client entity type
      const clientEntityType: string = (engagement as any).client?.entityType ?? 'limited_company';
      const industryMap: Record<string, IndustryType> = {
        sacco: 'sacco', ngo: 'ngo', school: 'school',
        manufacturing: 'manufacturing', retail: 'retail',
        saas: 'saas_tech', tech: 'saas_tech',
      };
      const industry: IndustryType = industryMap[clientEntityType] ?? 'general';

      // Run multi-layer account mapper (Layers 1–4)
      const mappedAccounts = mapAccounts(
        result.lines.map(l => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          currentYearBalance: l.currentYearBalance,
          priorYearBalance: l.priorYearBalance,
        })),
        industry,
      );

      // Run analytics engine - computes ratios, anomalies, summary
      const analytics = computeAnalytics(mappedAccounts, materialityAmount);

      // Detect cross-cutting systemic issues and store on the engagement
      const systemicIssues = detectSystemicIssues(analytics, result.warnings, materialityAmount);
      await db.update(engagements)
        .set({
          aiRiskSummary: JSON.stringify({ systemicIssues, generatedAt: new Date().toISOString() }),
          updatedAt: new Date(),
        })
        .where(eq(engagements.id, engagementId));

      // Clear any existing financials for this engagement (re-upload replaces)
      await db.delete(extractedFinancials)
        .where(and(
          eq(extractedFinancials.engagementId, engagementId),
          eq(extractedFinancials.orgId, session.orgId),
        ));

      // Insert all parsed + mapped lines
      if (result.lines.length > 0) {
        await db.insert(extractedFinancials).values(
          result.lines.map((line, idx) => {
            const mapped = mappedAccounts[idx];
            const meta = FS_CATEGORY_META[mapped?.fsCategory ?? 'UNKNOWN'];
            return {
              engagementId,
              orgId: session.orgId,
              accountCode: line.accountCode,
              accountName: line.accountName,
              accountType: line.accountType,
              // Use mapper's audit area if available (more precise than keyword-only)
              auditArea: mapped?.auditArea ?? line.auditArea,
              currentYearBalance: line.currentYearBalance.toString(),
              priorYearBalance: line.priorYearBalance?.toString(),
              varianceAmount: line.varianceAmount?.toString(),
              variancePct: line.variancePct?.toString(),
              isMaterial: line.isMaterial,
              isFlagged: line.isFlagged || (mapped?.needsReview ?? false),
              flagReason: line.flagReason ?? (mapped?.needsReview ? `Mapping confidence ${Math.round((mapped?.mappingConfidence ?? 0) * 100)}% - needs review` : undefined),
              // Mapper provenance - enables downstream citation of classification source
              fsCategory: mapped?.fsCategory ?? undefined,
              mappingConfidence: mapped?.mappingConfidence != null ? mapped.mappingConfidence.toString() : undefined,
              matchedLayer: mapped?.matchedLayer ?? undefined,
            };
          })
        );
      }

      // Store analytics summary + raw TB for AI context
      const analyticsText = analytics.summaryForAI;
      const rawText = result.lines.map((l, idx) => {
        const mapped = mappedAccounts[idx];
        return `${l.accountCode ? l.accountCode + ' | ' : ''}${l.accountName} | Cat: ${mapped?.fsCategory ?? '?'} | CY: ${l.currentYearBalance} | PY: ${l.priorYearBalance ?? 'N/A'}`;
      }).join('\n');

      await db.update(engagementFiles)
        .set({
          extractedText: encryptField(`${analyticsText}\n\n=== RAW TRIAL BALANCE ===\n${rawText}`),
          processingStatus: 'done',
          updatedAt: new Date(),
        })
        .where(eq(engagementFiles.id, fileRecord.id));

      return NextResponse.json({
        file: { ...fileRecord, processingStatus: 'done' },
        parsed: {
          lineCount: result.lines.length,
          detectedFormat: result.detectedFormat,
          isBalanced: result.isBalanced,
          totalDebits: result.totalDebits,
          totalCredits: result.totalCredits,
          materialAccounts: result.lines.filter(l => l.isMaterial).length,
          flaggedAccounts: result.lines.filter(l => l.isFlagged).length,
          needsReview: mappedAccounts.filter(a => a.needsReview).length,
          warnings: result.warnings,
          analytics: {
            totalRevenue: analytics.totals.totalRevenueCY,
            grossMargin: analytics.totals.grossMargin,
            currentRatio: analytics.ratios.find(r => r.name === 'Current Ratio')?.value,
            anomalyCount: analytics.anomalies.length,
            highRiskAnomalies: analytics.anomalies.filter(a => a.severity === 'high').length,
          },
        },
      });

    } catch (err: unknown) {
      await db.update(engagementFiles)
        .set({
          processingStatus: 'failed',
          processingError: (err as Error).message,
          updatedAt: new Date(),
        })
        .where(eq(engagementFiles.id, fileRecord.id));

      return NextResponse.json(
        { error: (err as Error).message || 'Failed to parse trial balance' },
        { status: 422 }
      );
    }
  }

  // For non-TB documents - mark done without parsing
  await db.update(engagementFiles)
    .set({ processingStatus: 'done', updatedAt: new Date() })
    .where(eq(engagementFiles.id, fileRecord.id));

  return NextResponse.json({ file: { ...fileRecord, processingStatus: 'done' } });
}
