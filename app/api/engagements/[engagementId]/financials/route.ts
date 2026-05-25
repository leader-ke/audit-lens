import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/middleware';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { engagementId } = await params;

  const financials = await db.query.extractedFinancials.findMany({
    where: (f, { eq, and }) => and(
      eq(f.engagementId, engagementId),
      eq(f.orgId, session.orgId),
    ),
    orderBy: (f, { desc }) => [desc(f.isFlagged), desc(f.isMaterial)],
  });

  return NextResponse.json({ financials });
}
