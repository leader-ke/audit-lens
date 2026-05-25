import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { clients, engagements, organizationMembers } from '@/lib/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const [org, user, [clientCount], [engagementCount], [memberCount]] = await Promise.all([
    db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.id, session.orgId),
    }),
    db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, session.userId),
    }),
    db.select({ count: count() }).from(clients)
      .where(and(eq(clients.orgId, session.orgId), eq(clients.isActive, true))),
    db.select({ count: count() }).from(engagements)
      .where(and(eq(engagements.orgId, session.orgId), gte(engagements.createdAt, thisMonthStart))),
    db.select({ count: count() }).from(organizationMembers)
      .where(eq(organizationMembers.orgId, session.orgId)),
  ]);

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      fullName: session.fullName,
      icpakNumber: user?.icpakNumber ?? null,
    },
    org,
    role: session.role,
    usage: {
      clients: clientCount.count,
      engagementsThisMonth: engagementCount.count,
      members: memberCount.count,
    },
  });
}
