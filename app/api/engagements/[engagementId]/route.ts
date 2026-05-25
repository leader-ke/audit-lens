import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { engagements } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { z } from 'zod';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  const engagement = await db.query.engagements.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, engagementId), eq(e.orgId, session.orgId)),
    with: {
      client: true,
      files: true,
      workingPapers: true,
      findings: true,
    } as any,
  });

  if (!engagement) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ engagement });
}

const UpdateSchema = z.object({
  status: z.enum(['planning', 'fieldwork', 'completion', 'reporting', 'signed_off', 'archived']).optional(),
  materialityAmount: z.number().optional(),
  materialityBasis: z.string().optional(),
  performanceMateriality: z.number().optional(),
  trivialThreshold: z.number().optional(),
  assignedPartner: z.string().uuid().optional(),
  assignedManager: z.string().uuid().optional(),
  engagementRef: z.string().optional(),
}).strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  try {
    const body = await req.json();
    const data = UpdateSchema.parse(body);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.status !== undefined) updates.status = data.status;
    if (data.materialityAmount !== undefined) updates.materialityAmount = data.materialityAmount.toString();
    if (data.materialityBasis !== undefined) updates.materialityBasis = data.materialityBasis;
    if (data.performanceMateriality !== undefined) updates.performanceMateriality = data.performanceMateriality.toString();
    if (data.trivialThreshold !== undefined) updates.trivialThreshold = data.trivialThreshold.toString();
    if (data.assignedPartner !== undefined) updates.assignedPartner = data.assignedPartner;
    if (data.assignedManager !== undefined) updates.assignedManager = data.assignedManager;
    if (data.engagementRef !== undefined) updates.engagementRef = data.engagementRef;

    const [updated] = await db.update(engagements)
      .set(updates)
      .where(and(eq(engagements.id, engagementId), eq(engagements.orgId, session.orgId)))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ engagement: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Update engagement error:', error);
    return NextResponse.json({ error: 'Failed to update engagement' }, { status: 500 });
  }
}
