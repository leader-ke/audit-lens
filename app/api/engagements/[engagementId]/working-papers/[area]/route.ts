import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workingPapers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';

// GET a specific working paper by audit area
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string; area: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId, area } = await params;

  const paper = await db.query.workingPapers.findFirst({
    where: (w, { eq, and }) => and(
      eq(w.engagementId, engagementId),
      eq(w.orgId, session.orgId),
      eq(w.auditArea, area as any),
    ),
  });

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ workingPaper: paper });
}

// PATCH - mark reviewed / approved / add review notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string; area: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId, area } = await params;
  const body = await req.json();

  // Find the paper by engagement + area
  const existing = await db.query.workingPapers.findFirst({
    where: (w, { eq, and }) => and(
      eq(w.engagementId, engagementId),
      eq(w.orgId, session.orgId),
      eq(w.auditArea, area as any),
    ),
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.reviewed === true) {
    updates.reviewed = true;
    updates.reviewedBy = session.userId;
    updates.reviewedAt = new Date();
  }
  if (body.reviewed === false) {
    updates.reviewed = false;
    updates.reviewedBy = null;
    updates.reviewedAt = null;
  }
  if (body.reviewNotes !== undefined) updates.reviewNotes = body.reviewNotes;
  if (body.approved === true) {
    updates.approved = true;
    updates.approvedBy = session.userId;
    updates.approvedAt = new Date();
  }

  const [updated] = await db.update(workingPapers)
    .set(updates)
    .where(eq(workingPapers.id, existing.id))
    .returning();

  return NextResponse.json({ workingPaper: updated });
}
