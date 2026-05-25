import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { activateSubscription } from '@/lib/payments/activate';

export const runtime = 'nodejs';

interface IntaSendWebhookPayload {
  invoice?: {
    state?: string;
    api_ref?: string;
    failed_reason?: string;
  };
}

export async function POST(request: Request) {
  let body: IntaSendWebhookPayload;
  try { body = await request.json() as IntaSendWebhookPayload; }
  catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const invoice = body.invoice;
  if (!invoice?.api_ref) return NextResponse.json({ ok: true });

  const [payment] = await db.select().from(payments)
    .where(eq(payments.id, invoice.api_ref)).limit(1);

  if (!payment) {
    console.error('[intasend/webhook] Unknown payment ref:', invoice.api_ref);
    return NextResponse.json({ ok: true });
  }

  const state = invoice.state?.toUpperCase();
  if (state === 'COMPLETE') {
    await db.update(payments).set({ status: 'success', updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
    await activateSubscription(db, payment.orgId, payment.planPurchased as 'pro' | 'firm', payment.periodDays);
    console.log(`[intasend/webhook] Payment ${payment.id} succeeded`);
  } else if (state === 'FAILED' || state === 'CANCELLED') {
    await db.update(payments).set({
      status: 'failed', failureReason: invoice.failed_reason ?? state, updatedAt: new Date(),
    }).where(eq(payments.id, payment.id));
  }

  return NextResponse.json({ ok: true });
}
