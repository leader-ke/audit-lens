/**
 * IntaSend API client - card payments for Kenyan businesses
 * Copied from case-lens and adapted for AuditLens.
 */

const INTASEND_ENV = process.env.INTASEND_ENV ?? 'sandbox';
const BASE_URL = INTASEND_ENV === 'production'
  ? 'https://payment.intasend.com'
  : 'https://sandbox.intasend.com';

const SECRET_KEY = process.env.INTASEND_SECRET_KEY!;
const PUBLIC_KEY = process.env.INTASEND_PUBLIC_KEY!;

export interface IntaSendCheckoutParams {
  amountKes: number;
  email: string;
  firstName: string;
  lastName: string;
  apiRef: string;
  redirectUrl: string;
}

export interface IntaSendCheckoutResult {
  id: string;
  url: string;
}

export async function createIntaSendCheckout(
  params: IntaSendCheckoutParams
): Promise<IntaSendCheckoutResult> {
  const res = await fetch(`${BASE_URL}/api/v1/checkout/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_key: PUBLIC_KEY,
      method: 'CARD-PAYMENT',
      currency: 'KES',
      amount: String(params.amountKes),
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      api_ref: params.apiRef,
      redirect_url: params.redirectUrl,
    }),
  });

  const raw = await res.text();
  let data: { id?: string; url?: string; redirect_url?: string; errors?: unknown; detail?: unknown } = {};
  try { data = JSON.parse(raw); } catch { /* ignore */ }

  const checkoutUrl = data.redirect_url ?? data.url;
  if (!res.ok || !checkoutUrl) {
    let errMsg = `IntaSend ${res.status}: ${raw.slice(0, 300)}`;
    if (typeof data.detail === 'string' && data.detail) errMsg = data.detail;
    else if (Array.isArray(data.errors)) {
      errMsg = data.errors.map((e: unknown) => typeof e === 'object' && e !== null
        ? String((e as Record<string, unknown>).detail ?? JSON.stringify(e))
        : String(e)
      ).join(' | ');
    }
    throw new Error(errMsg);
  }

  return { id: data.id ?? '', url: checkoutUrl };
}
