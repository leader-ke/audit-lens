import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documentRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const CreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  documentType: z.string().optional(),
  isRequired: z.boolean().optional().default(true),
  dueDate: z.string().datetime().optional(),
});

const PatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'received', 'not_available']).optional(),
  clientResponse: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
});

// ── GET: list all document requests ──────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  const requests = await db.query.documentRequests.findMany({
    where: (r, { eq, and }) =>
      and(eq(r.engagementId, engagementId), eq(r.orgId, session.orgId)),
    orderBy: (r, { asc }) => [asc(r.createdAt)],
  });

  return NextResponse.json({ requests });
}

// ── POST: create new document request ────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  try {
    const body = await req.json();
    const data = CreateSchema.parse(body);

    const [created] = await db
      .insert(documentRequests)
      .values({
        engagementId,
        orgId: session.orgId,
        title: data.title,
        description: data.description ?? null,
        documentType: data.documentType ?? null,
        isRequired: data.isRequired ?? true,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: 'pending',
      })
      .returning();

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Create document request error:', error);
    return NextResponse.json({ error: 'Failed to create document request' }, { status: 500 });
  }
}

// ── PATCH: update status / response / fields ─────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  try {
    const body = await req.json();
    const data = PatchSchema.parse(body);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.status !== undefined) updates.status = data.status;
    if (data.clientResponse !== undefined) updates.clientResponse = data.clientResponse;
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;

    const [updated] = await db
      .update(documentRequests)
      .set(updates)
      .where(
        and(
          eq(documentRequests.id, data.id),
          eq(documentRequests.engagementId, engagementId),
          eq(documentRequests.orgId, session.orgId)
        )
      )
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ request: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Update document request error:', error);
    return NextResponse.json({ error: 'Failed to update document request' }, { status: 500 });
  }
}

// ── DELETE: delete a document request ────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const [deleted] = await db
    .delete(documentRequests)
    .where(
      and(
        eq(documentRequests.id, id),
        eq(documentRequests.engagementId, engagementId),
        eq(documentRequests.orgId, session.orgId)
      )
    )
    .returning();

  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
