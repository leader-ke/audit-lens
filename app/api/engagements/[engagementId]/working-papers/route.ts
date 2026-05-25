import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workingPapers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  const papers = await db.query.workingPapers.findMany({
    where: (wp, { eq, and }) => and(
      eq(wp.engagementId, engagementId),
      eq(wp.orgId, session.orgId)
    ),
    orderBy: (wp, { asc }) => [asc(wp.auditArea)],
  });

  return NextResponse.json({ papers });
}
