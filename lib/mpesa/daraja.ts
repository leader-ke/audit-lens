/**
 * Safaricom Daraja API client - M-Pesa STK Push (Lipa Na M-Pesa Online)
 *
 * Docs: https://developer.safaricom.co.ke/Documentation
 *
 * Required env vars:
 *   MPESA_CONSUMER_KEY        - from Daraja app
 *   MPESA_CONSUMER_SECRET     - from Daraja app
 *   MPESA_SHORTCODE           - Business shortcode (Paybill or Till)
 *   MPESA_PASSKEY             - Lipa Na M-Pesa Online passkey from Daraja
 *   MPESA_CALLBACK_URL        - Public HTTPS URL for Daraja to POST results to
 *   MPESA_ENV                 - "sandbox" or "production"
 */

const MPESA_ENV   = process.env.MPESA_ENV ?? "sandbox";
const BASE_URL    = MPESA_ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

const CONSUMER_KEY    = process.env.MPESA_CONSUMER_KEY!;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET!;
const SHORTCODE       = process.env.MPESA_SHORTCODE!;
const PASSKEY         = process.env.MPESA_PASSKEY!;
const CALLBACK_URL    = process.env.MPESA_CALLBACK_URL!;

// ─── Access Token ──────────────────────────────────────────────────────────────

/** Fetch a short-lived OAuth access token from Daraja. */
export async function getDarajaAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Daraja auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── Timestamp & Password ──────────────────────────────────────────────────────

/** Returns { timestamp, password } required by every STK push request. */
function getTimestampAndPassword() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14); // YYYYMMDDHHmmss
  const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");
  return { timestamp, password };
}

// ─── STK Push ─────────────────────────────────────────────────────────────────

export interface StkPushParams {
  phone: string;       // 254XXXXXXXXX format
  amountKes: number;
  accountReference: string; // e.g. "CaseLens Pro - ORG_ID"
  description: string;      // e.g. "CaseLens Pro Subscription"
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseDescription: string;
}

/**
 * Initiate an STK Push (Lipa Na M-Pesa Online).
 * The user will receive a PIN prompt on their phone.
 * Daraja will POST the result to MPESA_CALLBACK_URL.
 */
export async function initiateStkPush(params: StkPushParams): Promise<StkPushResult> {
  const token = await getDarajaAccessToken();
  const { timestamp, password } = getTimestampAndPassword();

  const body = {
    BusinessShortCode: SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(params.amountKes),
    PartyA: params.phone,
    PartyB: SHORTCODE,
    PhoneNumber: params.phone,
    CallBackURL: CALLBACK_URL,
    AccountReference: params.accountReference,
    TransactionDesc: params.description,
  };

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    CustomerMessage?: string;
    errorCode?: string;
    errorMessage?: string;
  };

  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(data.errorMessage ?? data.ResponseDescription ?? `STK Push failed (${res.status})`);
  }

  return {
    merchantRequestId: data.MerchantRequestID!,
    checkoutRequestId: data.CheckoutRequestID!,
    responseDescription: data.ResponseDescription!,
  };
}

// ─── STK Query ─────────────────────────────────────────────────────────────────

export interface StkQueryResult {
  resultCode: string;   // "0" = success
  resultDesc: string;
}

/**
 * Query the status of an STK Push by CheckoutRequestID.
 * Use this for polling in the absence of a callback (e.g. dev/sandbox).
 */
export async function queryStkStatus(checkoutRequestId: string): Promise<StkQueryResult> {
  const token = await getDarajaAccessToken();
  const { timestamp, password } = getTimestampAndPassword();

  const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  const data = await res.json() as {
    ResultCode?: string;
    ResultDesc?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
  };

  return {
    resultCode: data.ResultCode ?? data.ResponseCode ?? "unknown",
    resultDesc: data.ResultDesc ?? data.ResponseDescription ?? "Unknown",
  };
}

// ─── Phone normalisation ───────────────────────────────────────────────────────

/**
 * Normalise a Kenyan phone number to 254XXXXXXXXX format.
 * Accepts: 07XXXXXXXX, +254XXXXXXXXX, 254XXXXXXXXX
 */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  throw new Error(`Invalid Kenyan phone number: ${raw}`);
}
