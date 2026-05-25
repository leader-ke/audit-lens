import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';
import { initiateStkPush, normalisePhone } from '@/lib/mpesa/daraja';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json() as { phone?: string; plan?: string };
  const { phone, plan = 'pro' } = body;

  if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  if (!['pro', 'firm'].includes(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_SHORTCODE) {
    return NextResponse.json({ error: 'M-Pesa not configured on server' }, { status: 503 });
  }

  let normalisedPhone: string;
  try {
    normalisedPhone = normalisePhone(phone);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const amountKes = plan === 'firm' ? 8000 : 2500;

  const [payment] = await db.insert(payments).values({
    orgId: session.orgId,
    userId: session.userId,
    provider: 'mpesa',
    status: 'pending',
    amountKes,
    planPurchased: plan as 'pro' | 'firm',
    periodDays: 30,
    mpesaPhone: normalisedPhone,
  }).returning({ id: payments.id });

  try {
    const result = await initiateStkPush({
      phone: normalisedPhone,
      amountKes,
      accountReference: `AuditLens-${plan === 'firm' ? 'Firm' : 'Pro'}-${session.orgId.slice(0, 8).toUpperCase()}`,
      description: `AuditLens ${plan === 'firm' ? 'Firm' : 'Pro'} Subscription (30 days)`,
    });

    await db.update(payments).set({
      mpesaCheckoutRequestId: result.checkoutRequestId,
      mpesaMerchantRequestId: result.merchantRequestId,
      updatedAt: new Date(),
    }).where(eq(payments.id, payment.id));

    return NextResponse.json({
      paymentId: payment.id,
      checkoutRequestId: result.checkoutRequestId,
      message: result.responseDescription,
    });
  } catch (err: unknown) {
    await db.update(payments).set({
      status: 'failed',
      failureReason: (err as Error).message,
      updatedAt: new Date(),
    }).where(eq(payments.id, payment.id));

    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
