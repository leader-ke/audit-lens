import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const CreateClientSchema = z.object({
  name: z.string().min(2),
  entityType: z.enum(['limited_company', 'public_company', 'ngo', 'sacco', 'county_government',
    'national_government', 'parastatals', 'church', 'school', 'bank', 'insurance', 'other']),
  registrationNumber: z.string().optional(),
  kraPin: z.string().optional(),
  industry: z.string().optional(),
  financialYearEnd: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allClients = await db.query.clients.findMany({
    where: (c, { eq, and }) => and(eq(c.orgId, session.orgId), eq(c.isActive, true)),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });

  return NextResponse.json({ clients: allClients });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = CreateClientSchema.parse(body);

    // Check plan limits
    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.id, session.orgId),
    });
    const clientCount = await db.$count(clients, and(eq(clients.orgId, session.orgId), eq(clients.isActive, true)));
    if (org && clientCount >= org.maxClients) {
      return NextResponse.json(
        { error: `Client limit reached (${org.maxClients}) for your plan. Upgrade to add more clients.` },
        { status: 403 }
      );
    }

    const [client] = await db.insert(clients).values({
      orgId: session.orgId,
      createdBy: session.userId,
      ...data,
    }).returning();

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Create client error:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
