import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { activateSubscription } from '@/lib/payments/activate';

export const runtime = 'nodejs';

interface DarajaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

export async function POST(request: Request) {
  let body: DarajaCallback;
  try { body = await request.json() as DarajaCallback; }
  catch { return NextResponse.json({ ResultCode: 1, ResultDesc: 'Bad request' }); }

  const { stkCallback } = body.Body;
  const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

  const [payment] = await db.select().from(payments)
    .where(eq(payments.mpesaCheckoutRequestId, CheckoutRequestID)).limit(1);

  if (!payment) {
    console.error('[mpesa/callback] Unknown CheckoutRequestID:', CheckoutRequestID);
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  if (ResultCode !== 0) {
    await db.update(payments).set({
      status: 'failed', failureReason: ResultDesc, updatedAt: new Date(),
    }).where(eq(payments.id, payment.id));
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  const items = CallbackMetadata?.Item ?? [];
  const getMeta = (name: string) => items.find(i => i.Name === name)?.Value;
  const mpesaReceiptNumber = String(getMeta('MpesaReceiptNumber') ?? '');

  await db.update(payments).set({
    status: 'success', mpesaReceiptNumber, updatedAt: new Date(),
  }).where(eq(payments.id, payment.id));

  await activateSubscription(db, payment.orgId, payment.planPurchased as 'pro' | 'firm', payment.periodDays);

  console.log(`[mpesa/callback] Payment ${payment.id} succeeded. Receipt: ${mpesaReceiptNumber}`);
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
