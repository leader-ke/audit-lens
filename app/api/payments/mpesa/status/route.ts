import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/middleware';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('paymentId');
  if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 });

  const [payment] = await db.select({
    id: payments.id,
    status: payments.status,
    mpesaReceiptNumber: payments.mpesaReceiptNumber,
    failureReason: payments.failureReason,
    updatedAt: payments.updatedAt,
  }).from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.orgId, session.orgId)))
    .limit(1);

  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(payment);
}
