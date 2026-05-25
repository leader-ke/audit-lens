import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createIntaSendCheckout } from '@/lib/intasend/client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  if (!process.env.INTASEND_SECRET_KEY) {
    return NextResponse.json({ error: 'IntaSend not configured on server' }, { status: 503 });
  }

  const body = await request.json() as { plan?: string };
  const plan = body.plan === 'firm' ? 'firm' : 'pro';
  const amountKes = plan === 'firm' ? 8000 : 2500;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const [payment] = await db.insert(payments).values({
    orgId: session.orgId,
    userId: session.userId,
    provider: 'intasend',
    status: 'pending',
    amountKes,
    planPurchased: plan as 'pro' | 'firm',
    periodDays: 30,
  }).returning({ id: payments.id });

  const nameParts = session.fullName.split(' ');
  const firstName = nameParts[0] ?? 'User';
  const lastName = nameParts.slice(1).join(' ') || 'N/A';

  try {
    const result = await createIntaSendCheckout({
      amountKes,
      email: session.email,
      firstName,
      lastName,
      apiRef: payment.id,
      redirectUrl: `${appUrl}/dashboard/settings?payment=success`,
    });
    return NextResponse.json({ url: result.url });
  } catch (err: unknown) {
    await db.update(payments).set({
      status: 'failed', failureReason: (err as Error).message, updatedAt: new Date(),
    }).where(eq(payments.id, payment.id));
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
