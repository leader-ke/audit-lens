import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientPortalTokens, documentRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function resolveToken(token: string) {
  const record = await db.query.clientPortalTokens.findFirst({
    where: (t, { eq }) => eq(t.token, token),
  });

  if (!record) return { error: 'Invalid link', status: 404 };
  if (!record.isActive) return { error: 'This portal link has been deactivated', status: 403 };
  if (record.expiresAt && record.expiresAt < new Date()) {
    return { error: 'This portal link has expired', status: 403 };
  }

  return { record };
}

// ── GET: validate token and return portal data ────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const result = await resolveToken(token);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { record } = result;

  // Update lastAccessedAt (fire-and-forget, non-blocking)
  db.update(clientPortalTokens)
    .set({ lastAccessedAt: new Date() })
    .where(eq(clientPortalTokens.id, record.id))
    .catch(() => {});

  // Fetch engagement with client + org
  const engagement = await db.query.engagements.findFirst({
    where: (e, { eq }) => eq(e.id, record.engagementId),
    with: {
      client: true,
      org: true,
    } as any,
  });

  if (!engagement) {
    return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  }

  // Fetch document requests
  const requests = await db.query.documentRequests.findMany({
    where: (r, { eq }) => eq(r.engagementId, record.engagementId),
    orderBy: (r, { asc }) => [asc(r.createdAt)],
  });

  // Fetch management letter (draft or finalised)
  const letter = await db.query.managementLetters.findFirst({
    where: (l, { eq }) => eq(l.engagementId, record.engagementId),
    orderBy: (l, { desc }) => [desc(l.version)],
  });

  const client = (engagement as any).client;
  const org = (engagement as any).org;

  // Strip internal risk scores from findings - expose only deficiency + recommendation
  const publicFindings =
    letter && Array.isArray(letter.findings)
      ? (letter.findings as any[]).map((f: any) => ({
          area: f.area ?? '',
          deficiency: f.deficiency ?? '',
          recommendation: f.recommendation ?? '',
          managementResponse: f.managementResponse ?? null,
        }))
      : [];

  return NextResponse.json({
    portal: {
      clientName: record.clientName,
      clientEmail: record.clientEmail,
      permissions: record.permissions,
      expiresAt: record.expiresAt,
    },
    engagement: {
      id: engagement.id,
      clientName: client?.name ?? '',
      financialYearEnd: engagement.financialYearEnd,
      auditType: engagement.auditType,
      firmName: org?.name ?? '',
      engagementRef: engagement.engagementRef,
    },
    documentRequests: requests,
    managementLetter: letter
      ? {
          isDraft: letter.isDraft,
          findings: publicFindings,
        }
      : null,
  });
}

// ── PATCH: client responds to a document request ──────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const result = await resolveToken(token);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { record } = result;

  const body = await req.json().catch(() => ({}));

  const schema = z.object({
    requestId: z.string().uuid(),
    clientResponse: z.string().optional(),
    status: z.enum(['pending', 'received', 'not_available']).optional(),
  });

  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.clientResponse !== undefined) updates.clientResponse = data.clientResponse;
  if (data.status !== undefined) updates.status = data.status;

  const [updated] = await db
    .update(documentRequests)
    .set(updates)
    .where(
      and(
        eq(documentRequests.id, data.requestId),
        eq(documentRequests.engagementId, record.engagementId)
      )
    )
    .returning();

  if (!updated) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

  // Update lastAccessedAt
  db.update(clientPortalTokens)
    .set({ lastAccessedAt: new Date() })
    .where(eq(clientPortalTokens.id, record.id))
    .catch(() => {});

  return NextResponse.json({ request: updated });
}
