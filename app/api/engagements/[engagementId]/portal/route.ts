import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientPortalTokens, documentRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { randomBytes } from 'crypto';

// ── GET: fetch portal token + document requests ──────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  const [token, requests] = await Promise.all([
    db.query.clientPortalTokens.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.engagementId, engagementId), eq(t.orgId, session.orgId)),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    }),
    db.query.documentRequests.findMany({
      where: (r, { eq, and }) =>
        and(eq(r.engagementId, engagementId), eq(r.orgId, session.orgId)),
      orderBy: (r, { asc }) => [asc(r.createdAt)],
    }),
  ]);

  return NextResponse.json({ token: token ?? null, requests });
}

// ── POST: create / reset portal token ────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  const body = await req.json().catch(() => ({}));
  const clientEmail: string | undefined = body.clientEmail ?? undefined;
  const clientName: string | undefined = body.clientName ?? undefined;

  // Deactivate any existing tokens for this engagement
  await db
    .update(clientPortalTokens)
    .set({ isActive: false })
    .where(
      and(
        eq(clientPortalTokens.engagementId, engagementId),
        eq(clientPortalTokens.orgId, session.orgId)
      )
    );

  const token = randomBytes(16).toString('hex'); // 32 hex chars
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const [created] = await db
    .insert(clientPortalTokens)
    .values({
      engagementId,
      orgId: session.orgId,
      token,
      clientEmail: clientEmail ?? null,
      clientName: clientName ?? null,
      expiresAt,
      isActive: true,
    })
    .returning();

  return NextResponse.json({ token: created }, { status: 201 });
}

// ── DELETE: deactivate portal token ──────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  await db
    .update(clientPortalTokens)
    .set({ isActive: false })
    .where(
      and(
        eq(clientPortalTokens.engagementId, engagementId),
        eq(clientPortalTokens.orgId, session.orgId)
      )
    );

  return NextResponse.json({ ok: true });
}
