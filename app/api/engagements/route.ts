import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { engagements, engagementFiles, workingPapers } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { PLAN_LIMITS } from '@/lib/audit/isa-standards';
import { z } from 'zod';

const CreateEngagementSchema = z.object({
  clientId: z.string().uuid(),
  engagementRef: z.string().optional(),
  financialYearStart: z.string(),
  financialYearEnd: z.string(),
  auditType: z.enum(['statutory', 'internal', 'special_purpose', 'review', 'compilation', 'forensic', 'tax', 'compliance', 'performance']),
  materialityAmount: z.number().optional(),
  materialityBasis: z.string().optional(),
  performanceMateriality: z.number().optional(),
  trivialThreshold: z.number().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allEngagements = await db.query.engagements.findMany({
    where: (e, { eq }) => eq(e.orgId, session.orgId),
    with: { client: true } as any,
    orderBy: (e, { desc }) => [desc(e.createdAt)],
  });

  return NextResponse.json({ engagements: allEngagements });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = CreateEngagementSchema.parse(body);

    // Check monthly engagement limit
    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.id, session.orgId),
    });
    if (org) {
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);
      const monthCount = await db.$count(
        engagements,
        and(eq(engagements.orgId, session.orgId), gte(engagements.createdAt, thisMonthStart))
      );
      if (monthCount >= org.maxEngagementsPerMonth) {
        return NextResponse.json(
          { error: `Monthly engagement limit (${org.maxEngagementsPerMonth}) reached. Upgrade your plan.` },
          { status: 403 }
        );
      }
    }

    const [engagement] = await db.insert(engagements).values({
      orgId: session.orgId,
      createdBy: session.userId,
      clientId: data.clientId,
      engagementRef: data.engagementRef,
      financialYearStart: new Date(data.financialYearStart),
      financialYearEnd: new Date(data.financialYearEnd),
      auditType: data.auditType,
      materialityAmount: data.materialityAmount?.toString(),
      materialityBasis: data.materialityBasis,
      performanceMateriality: data.performanceMateriality?.toString(),
      trivialThreshold: data.trivialThreshold?.toString(),
      plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : undefined,
      plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : undefined,
    }).returning();

    return NextResponse.json({ engagement }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Create engagement error:', error);
    return NextResponse.json({ error: 'Failed to create engagement' }, { status: 500 });
  }
}
