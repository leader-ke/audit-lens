import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { filingDeadlines, engagements } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { generateDeadlines } from '@/lib/audit/deadline-generator';
import { z } from 'zod';

// ── GET: return all deadlines, auto-generating if none exist ─────────────────
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

  // Fetch existing deadlines
  let deadlines = await db
    .select()
    .from(filingDeadlines)
    .where(
      and(
        eq(filingDeadlines.engagementId, engagementId),
        eq(filingDeadlines.orgId, session.orgId),
      ),
    )
    .orderBy(asc(filingDeadlines.dueDate));

  // Auto-generate if none exist
  if (deadlines.length === 0) {
    const generated = generateDeadlines(
      new Date(engagement.financialYearEnd),
      engagementId,
      session.orgId,
    );

    if (generated.length > 0) {
      await db.insert(filingDeadlines).values(
        generated.map((d) => ({
          engagementId: d.engagementId,
          orgId: d.orgId,
          deadlineType: d.deadlineType,
          label: d.label,
          authority: d.authority,
          dueDate: d.dueDate,
          status: d.status,
          notes: d.notes,
          filedDate: d.filedDate,
        })),
      );

      deadlines = await db
        .select()
        .from(filingDeadlines)
        .where(
          and(
            eq(filingDeadlines.engagementId, engagementId),
            eq(filingDeadlines.orgId, session.orgId),
          ),
        )
        .orderBy(asc(filingDeadlines.dueDate));
    }
  }

  return NextResponse.json({ deadlines });
}

// ── PATCH: update a deadline's status, notes, or filedDate ──────────────────
const PatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'filed', 'overdue', 'not_applicable']),
  notes: z.string().optional(),
  filedDate: z.string().datetime({ offset: true }).optional().nullable(),
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

  // Verify the deadline belongs to this engagement + org
  const existing = await db.query.filingDeadlines.findFirst({
    where: (d, { eq, and }) =>
      and(
        eq(d.id, data.id),
        eq(d.engagementId, engagementId),
        eq(d.orgId, session.orgId),
      ),
  });
  if (!existing) return NextResponse.json({ error: 'Deadline not found' }, { status: 404 });

  const updates: Record<string, unknown> = {
    status: data.status,
    updatedAt: new Date(),
  };
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.filedDate !== undefined) {
    updates.filedDate = data.filedDate ? new Date(data.filedDate) : null;
  }

  const [updated] = await db
    .update(filingDeadlines)
    .set(updates)
    .where(
      and(
        eq(filingDeadlines.id, data.id),
        eq(filingDeadlines.engagementId, engagementId),
        eq(filingDeadlines.orgId, session.orgId),
      ),
    )
    .returning();

  return NextResponse.json({ deadline: updated });
}
