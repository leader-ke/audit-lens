/**
 * BANK STATEMENT PARSER
 *
 * Parses CSV bank statements into structured transactions.
 * Handles debit/credit columns or single amount column.
 * Auto-matches transactions against TB cash balance.
 */

const MAX_ROWS = 2000;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedTransaction {
  date: string;           // ISO date string YYYY-MM-DD
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
  rawLine: string;
  isFlagged?: boolean;
  flagReasons?: string[];
}

export interface ParseCSVResult {
  transactions: ParsedTransaction[];
  closingBalance: number | null;
  warnings: string[];
}

export interface MatchedItem {
  bankTxn: ParsedTransaction;
  flagReasons: string[];
}

export interface MatchResult {
  matchedItems: MatchedItem[];
  unmatchedBankItems: ParsedTransaction[];
  difference: number;
}

// ── Date parsing ──────────────────────────────────────────────────────────────

/** Parse DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD into YYYY-MM-DD. Returns null if unparseable. */
function parseDate(raw: string): string | null {
  const s = raw.trim();

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const dt = new Date(`${y}-${m}-${d}`);
    if (!isNaN(dt.getTime())) return `${y}-${m}-${d}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    const dt = new Date(`${y}-${mm}-${dd}`);
    if (!isNaN(dt.getTime())) return `${y}-${mm}-${dd}`;
  }

  // MM/DD/YYYY - guard against ambiguous dates only when day > 12
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    if (parseInt(d, 10) > 12) {
      // must be MM/DD/YYYY
      const mm = m.padStart(2, '0');
      const dd = d.padStart(2, '0');
      const dt = new Date(`${y}-${mm}-${dd}`);
      if (!isNaN(dt.getTime())) return `${y}-${mm}-${dd}`;
    }
  }

  return null;
}

// ── Number parsing ────────────────────────────────────────────────────────────

function parseNum(v: string | undefined | null): number | null {
  if (v === undefined || v === null || v.trim() === '' || v.trim() === '-') return null;
  const s = v.trim()
    .replace(/,/g, '')
    .replace(/\(([0-9.]+)\)/, '-$1'); // (1234) -> -1234
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ── CSV line splitter (handles quoted fields) ─────────────────────────────────

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

// ── Header detection keywords ─────────────────────────────────────────────────

const DATE_KEYWORDS = ['date', 'txn date', 'transaction date', 'value date', 'posting date', 'trans date'];
const DESC_KEYWORDS = ['description', 'narration', 'particulars', 'detail', 'reference', 'memo', 'transaction', 'narrative'];
const DEBIT_KEYWORDS = ['debit', 'dr', 'withdrawal', 'withdrawals', 'debit amount', 'payments'];
const CREDIT_KEYWORDS = ['credit', 'cr', 'deposit', 'deposits', 'credit amount', 'receipts'];
const BALANCE_KEYWORDS = ['balance', 'running balance', 'closing balance', 'available balance', 'ledger balance'];
const AMOUNT_KEYWORDS = ['amount', 'net amount', 'value'];

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function findCol(headers: string[], keywords: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i]);
    if (keywords.includes(h)) return i;
  }
  // partial match fallback
  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i]);
    if (keywords.some(k => h.includes(k) || k.includes(h))) return i;
  }
  return -1;
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseCSVBankStatement(csvText: string): ParseCSVResult {
  const warnings: string[] = [];
  const transactions: ParsedTransaction[] = [];

  // Normalise line endings
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Find header row - look for a line containing date and description-like keywords
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const cells = splitCSVLine(lines[i]);
    const normed = cells.map(norm);
    const hasDate = normed.some(c => DATE_KEYWORDS.some(k => c.includes(k.replace(/ /g, '')) || c === k));
    const hasDesc = normed.some(c => DESC_KEYWORDS.some(k => c.includes(k) || k.includes(c)));
    const hasAmount = normed.some(c =>
      [...DEBIT_KEYWORDS, ...CREDIT_KEYWORDS, ...AMOUNT_KEYWORDS, ...BALANCE_KEYWORDS].some(k => c === k || c.includes(k))
    );
    if (hasDate && (hasDesc || hasAmount)) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    warnings.push('Could not detect header row - using first row as header');
    headerIdx = 0;
  }

  const headers = splitCSVLine(lines[headerIdx]);

  const dateCol = findCol(headers, DATE_KEYWORDS);
  const descCol = findCol(headers, DESC_KEYWORDS);
  const debitCol = findCol(headers, DEBIT_KEYWORDS);
  const creditCol = findCol(headers, CREDIT_KEYWORDS);
  const balanceCol = findCol(headers, BALANCE_KEYWORDS);
  const amountCol = debitCol === -1 && creditCol === -1 ? findCol(headers, AMOUNT_KEYWORDS) : -1;

  if (dateCol === -1) warnings.push('Date column not detected - rows with unparseable dates will be skipped');
  if (descCol === -1) warnings.push('Description column not detected');
  if (debitCol === -1 && creditCol === -1 && amountCol === -1) {
    warnings.push('No amount columns detected - debit/credit will be null for all rows');
  }

  let skipped = 0;
  const dataLines = lines.slice(headerIdx + 1);

  for (const rawLine of dataLines) {
    if (transactions.length >= MAX_ROWS) {
      warnings.push(`Truncated at ${MAX_ROWS} rows`);
      break;
    }

    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const cells = splitCSVLine(trimmed);
    if (cells.length < 2) continue;

    // Parse date
    const rawDate = dateCol >= 0 ? cells[dateCol] ?? '' : '';
    const parsedDate = parseDate(rawDate);
    if (!parsedDate) {
      skipped++;
      continue;
    }

    const description = descCol >= 0 ? (cells[descCol] ?? '').replace(/^"|"$/g, '') : '';

    let debit: number | null = null;
    let credit: number | null = null;

    if (debitCol >= 0 || creditCol >= 0) {
      debit = parseNum(cells[debitCol] ?? null);
      credit = parseNum(cells[creditCol] ?? null);
      // Ensure values are positive (some banks export negative debits)
      if (debit !== null && debit < 0) { credit = Math.abs(debit); debit = null; }
      if (credit !== null && credit < 0) { debit = Math.abs(credit); credit = null; }
    } else if (amountCol >= 0) {
      const amt = parseNum(cells[amountCol] ?? null);
      if (amt !== null) {
        if (amt < 0) debit = Math.abs(amt);
        else credit = amt;
      }
    }

    const balance = balanceCol >= 0 ? parseNum(cells[balanceCol] ?? null) : null;

    transactions.push({ date: parsedDate, description, debit, credit, balance, rawLine });
  }

  if (skipped > 0) {
    warnings.push(`Skipped ${skipped} row(s) with unrecognised date format`);
  }

  // Closing balance: last non-null balance value
  let closingBalance: number | null = null;
  for (let i = transactions.length - 1; i >= 0; i--) {
    if (transactions[i].balance !== null) {
      closingBalance = transactions[i].balance;
      break;
    }
  }

  // Fallback: sum credits minus debits
  if (closingBalance === null && transactions.length > 0) {
    let sum = 0;
    for (const t of transactions) {
      sum += (t.credit ?? 0) - (t.debit ?? 0);
    }
    closingBalance = sum;
    warnings.push('No running balance column found - closing balance estimated from net transactions');
  }

  return { transactions, closingBalance, warnings };
}

// ── Flagging helpers ──────────────────────────────────────────────────────────

const SUSPICIOUS_DESC_PATTERNS = [
  /\bCASH\b/i,
  /\bWITHDRAWAL\b/i,
  /\bWITHDRAW\b/i,
  /\bATM\b/i,
  /\bPETTY\b/i,
  /\bREVERSAL\b/i,
  /\bCORRECTION\b/i,
  /\bADJUSTMENT\b/i,
  /\bCHEQUE RETURN\b/i,
  /\bDISHONOURED\b/i,
  /\bUNEXPLAINED\b/i,
];

function isRoundNumber(n: number): boolean {
  return n > 0 && n % 1000 === 0;
}

function isLateMonth(dateStr: string): boolean {
  const day = parseInt(dateStr.slice(8, 10), 10);
  return day >= 28;
}

function flagTransaction(txn: ParsedTransaction): { isFlagged: boolean; flagReasons: string[] } {
  const flagReasons: string[] = [];
  const amount = txn.debit ?? txn.credit ?? 0;

  if (isRoundNumber(amount) && amount >= 100000) {
    flagReasons.push(`Round number large amount (${amount.toLocaleString()})`);
  }

  if (SUSPICIOUS_DESC_PATTERNS.some(p => p.test(txn.description))) {
    flagReasons.push(`Unusual description: "${txn.description}"`);
  }

  if (isLateMonth(txn.date)) {
    flagReasons.push('Late-month entry (day >= 28)');
  }

  if (txn.debit !== null && txn.debit >= 500000) {
    flagReasons.push(`Large withdrawal (${txn.debit.toLocaleString()})`);
  }

  return { isFlagged: flagReasons.length > 0, flagReasons };
}

// ── Auto-matching ─────────────────────────────────────────────────────────────

export function matchTransactions(
  bankTxns: ParsedTransaction[],
  tbCashBalance: number,
  bankClosingBalance: number,
): MatchResult {
  const matchedItems: MatchedItem[] = [];
  const unmatchedBankItems: ParsedTransaction[] = [];

  for (const txn of bankTxns) {
    const { isFlagged, flagReasons } = flagTransaction(txn);

    if (isFlagged) {
      matchedItems.push({ bankTxn: { ...txn, isFlagged: true, flagReasons }, flagReasons });
    } else {
      unmatchedBankItems.push({ ...txn, isFlagged: false, flagReasons: [] });
    }
  }

  const difference = bankClosingBalance - tbCashBalance;

  return { matchedItems, unmatchedBankItems, difference };
}
