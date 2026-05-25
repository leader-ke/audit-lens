/**
 * TRIAL BALANCE PARSER
 *
 * Accepts CSV or Excel exports from QuickBooks, Sage, Xero, Tally, and manual spreadsheets.
 * Auto-detects column layout, handles debit/credit or single balance columns.
 * Infers account type and audit area from account name/code.
 */

import * as XLSX from 'xlsx';
import type { AuditArea } from './isa-standards';

export interface ParsedTBLine {
  accountCode?: string;
  accountName: string;
  accountType: string;      // asset | liability | equity | revenue | expense
  auditArea?: AuditArea;
  currentYearBalance: number;  // positive = debit normal (assets/expenses), negative = credit normal
  priorYearBalance?: number;
  varianceAmount?: number;
  variancePct?: number;
  isMaterial: boolean;
  isFlagged: boolean;
  flagReason?: string;
}

export interface TBParseResult {
  lines: ParsedTBLine[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  detectedFormat: string;
  warnings: string[];
}

// ─── Column detection keywords ────────────────────────────────────────────────

const DEBIT_COLS = ['debit', 'dr', 'debit balance', 'debits'];
const CREDIT_COLS = ['credit', 'cr', 'credit balance', 'credits'];
const BALANCE_COLS = ['balance', 'amount', 'net', 'closing balance', 'closing', 'total', 'net balance'];
const PY_COLS = ['prior year', 'prev year', 'previous year', 'py', 'prior', 'last year', 'fy-1', 'fy23', 'fy22', 'fy21', 'fy2023', 'fy2022', '2023', '2022', '2021'];
const CY_COLS = ['current year', 'curr year', 'cy', 'current', 'this year', 'fy', 'fy24', 'fy2024', '2024', '2025'];
const CODE_COLS = ['code', 'account code', 'acc code', 'gl code', 'account no', 'account number', 'a/c', 'acct', 'no.'];
const NAME_COLS = ['account name', 'account', 'description', 'name', 'ledger', 'gl account', 'account description'];
const TYPE_COLS = ['type', 'account type', 'category', 'class'];

function normalise(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9 \/]/g, '').replace(/\s+/g, ' ');
}

function parseNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return isNaN(v) ? undefined : v;
  const s = String(v).replace(/[,\s]/g, '').replace(/\(([0-9.]+)\)/, '-$1');
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

function matchCol(headers: string[], candidates: string[], exclude: number[] = []): number {
  // Pass 1: exact match (highest specificity)
  for (let i = 0; i < headers.length; i++) {
    if (exclude.includes(i)) continue;
    const norm = headers[i]; // already normalised by callers
    if (candidates.some(c => norm === c)) return i;
  }
  // Pass 2: substring match (only when candidate is long enough to be unambiguous)
  for (let i = 0; i < headers.length; i++) {
    if (exclude.includes(i)) continue;
    const norm = headers[i];
    if (candidates.some(c => c.length > 3 && norm.includes(c))) return i;
  }
  return -1;
}

function matchColFuzzy(headers: string[], candidates: string[], exclude: number[] = []): number {
  for (let i = 0; i < headers.length; i++) {
    if (exclude.includes(i)) continue;
    const norm = headers[i];
    if (candidates.some(c => norm.includes(c))) return i;
  }
  return -1;
}

// ─── Account type inference ───────────────────────────────────────────────────

function inferAccountType(name: string, code?: string): string {
  const n = name.toLowerCase();

  // Compound patterns - checked first because single-keyword checks can misfire.
  // e.g. "Long Term Bank Loan" contains "bank" (asset keyword) AND "loan" (liability keyword).
  // The compound check resolves the ambiguity before the generic checks run.
  if (/bank loan|bank overdraft|bank facility|term loan/.test(n)) return 'liability';
  if (/vat recoverable|input vat|vat refund|recoverable tax|tax recoverable/.test(n)) return 'asset';
  if (/right of use asset|rou asset|right-of-use/.test(n)) return 'asset';
  if (/lease liability/.test(n)) return 'liability';

  // Asset indicators
  if (/cash|bank|mpesa|receivable|debtor|prepay|deposit paid|inventory|stock|equipment|vehicle|furniture|land|building|plant|machinery|investment held|intangible|goodwill|fixture/.test(n)) return 'asset';
  // Liability indicators
  if (/payable|creditor|accrual|overdraft|loan|borrowing|deferred revenue|advance received|tax payable|vat|paye payable|nssf|nhif|shif|provision|bond payable/.test(n)) return 'liability';
  // Equity indicators
  if (/share capital|equity|retained|reserve|dividend|owner|capital/.test(n)) return 'equity';
  // Revenue indicators
  if (/revenue|sales|income|turnover|fees earned|interest income|grant|donation received|rental income|commission income/.test(n)) return 'revenue';
  // Expense indicators
  if (/expense|cost|wages|salary|rent|utilities|depreciation|amortisation|admin|selling|distribution|insurance|professional|audit fee|bank charge|forex|loss/.test(n)) return 'expense';

  // Code-based inference (common Kenyan chart of accounts ranges)
  if (code) {
    const c = parseInt(code.replace(/\D/g, '')) || 0;
    if (c >= 1000 && c < 2000) return 'asset';
    if (c >= 2000 && c < 3000) return 'liability';
    if (c >= 3000 && c < 4000) return 'equity';
    if (c >= 4000 && c < 5000) return 'revenue';
    if (c >= 5000 && c < 9000) return 'expense';
  }

  return 'asset'; // default - flagged for review
}

function inferAuditArea(name: string, type: string): AuditArea | undefined {
  const n = name.toLowerCase();
  if (/cash|bank|mpesa|petty cash|float/.test(n)) return 'cash_and_bank';
  if (/receivable|debtor|trade debtor|other debtor|prepayment/.test(n)) return 'receivables';
  if (/payable|creditor|trade creditor|accrual|other payable/.test(n)) return 'payables';
  if (/property|plant|equipment|furniture|vehicle|machinery|land|building|depreciation|fixture|intangible|right of use|rou asset|right-of-use/.test(n)) return 'fixed_assets';
  if (/revenue|sales|income|turnover|fees earned|grant|donation received/.test(n)) return 'revenue';
  if (/inventory|stock|raw material|work in progress|finished goods/.test(n)) return 'inventory';
  if (/investment|securities|shares held|bonds|treasury/.test(n)) return 'investments';
  if (/salary|wages|payroll|paye|nssf|nhif|shif|housing levy|leave|gratuity|staff cost/.test(n)) return 'payroll';
  if (/vat|tax payable|withholding|deferred tax|current tax|kra/.test(n)) return 'tax';
  if (/share capital|equity|retained|reserve|dividend/.test(n)) return 'equity';
  if (/provision|contingent|legal/.test(n)) return 'provisions_and_liabilities';
  if (/related|director loan|shareholder loan|intercompany/.test(n)) return 'related_parties';
  if (/overdraft|borrowing|loan|facility/.test(n)) return 'going_concern';
  if (type === 'expense') return 'expenses';
  return undefined;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseTrialBalance(
  fileBuffer: Buffer,
  mimeType: string,
  materialityAmount: number,
): TBParseResult {
  const warnings: string[] = [];

  // Parse workbook
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
  } catch {
    throw new Error('Could not read file. Please upload a valid CSV or Excel file.');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) throw new Error('File appears to be empty or has only one row.');

  // Find header row - the first row that has BOTH a name/code column AND an amount
  // column, AND at least 2 non-empty cells.
  //
  // This prevents document titles like "Sample Trial Balance - FY2024" from being
  // mistaken for a header row just because they contain the word "balance".
  let headerRowIdx = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i] as string[];
    const normed = row.map(c => normalise(String(c)));
    const nonEmptyCells = normed.filter(c => c.trim() !== '').length;
    if (nonEmptyCells < 2) continue; // Title rows / blank rows have ≤ 1 non-empty cell

    const hasNameCol = normed.some(c =>
      NAME_COLS.some(n => c.includes(n)) || CODE_COLS.some(n => c === n || c.includes(n))
    );
    const hasAmountCol = normed.some(c =>
      DEBIT_COLS.some(n => c.includes(n)) ||
      CREDIT_COLS.some(n => c.includes(n)) ||
      BALANCE_COLS.some(n => c === n || c.includes(n))
    );

    if (hasNameCol && hasAmountCol) {
      // Strong match: both a name-type and an amount-type header found
      headerRowIdx = i;
      headers = row.map(String);
      break;
    }
    if (hasNameCol || hasAmountCol) {
      // Weak match: only one type found - keep searching for a stronger row
      if (headerRowIdx < 0) {
        headerRowIdx = i;
        headers = row.map(String);
      }
    }
  }

  if (headerRowIdx < 0) {
    // Last resort: assume first row is headers
    headers = (rows[0] as string[]).map(String);
    headerRowIdx = 0;
    warnings.push('Could not confidently detect header row - assumed first row.');
  }

  // Detect columns - order matters: find code first, then exclude it from name search
  const normedHeaders = headers.map(normalise);
  let codeCol = matchCol(normedHeaders, CODE_COLS);
  if (codeCol < 0) codeCol = matchColFuzzy(normedHeaders, CODE_COLS);
  const excludeFromName = codeCol >= 0 ? [codeCol] : [];
  let nameCol = matchCol(normedHeaders, NAME_COLS, excludeFromName);
  const nameColExplicit = nameCol >= 0; // true when header was explicitly recognised
  if (nameCol < 0) nameCol = matchColFuzzy(normedHeaders, NAME_COLS, excludeFromName);
  if (nameCol < 0) nameCol = codeCol === 0 ? 1 : 0; // fallback: first col that isn't codeCol

  // Only validate the name column content when it was NOT explicitly labelled -
  // if the header says "Account Name" / "Description" etc. we trust it.
  // When nameCol was a fallback (col 0, unrecognised header), check whether the
  // values are actually numeric codes and try to find a real description column.
  const sampleRows = rows.slice(headerRowIdx + 1, headerRowIdx + 11);
  function looksLikePureNumber(v: unknown): boolean {
    const s = String(v ?? '').trim();
    return s.length > 0 && /^-?[\d,. ]+$/.test(s);
  }
  if (!nameColExplicit) {
    const nameColValues = sampleRows.map(r => (r as unknown[])[nameCol]).filter(v => v !== '' && v !== null && v !== undefined);
    const numericNameCount = nameColValues.filter(looksLikePureNumber).length;
    if (nameColValues.length > 0 && numericNameCount / nameColValues.length > 0.6) {
      // Name column looks numeric - try to find a non-numeric column for names
      let betterNameCol = -1;
      for (let i = 0; i < headers.length; i++) {
        if (i === codeCol || i === nameCol) continue;
        const vals = sampleRows.map(r => (r as unknown[])[i]).filter(v => v !== '' && v !== null && v !== undefined);
        if (vals.length === 0) continue;
        const textCount = vals.filter(v => !looksLikePureNumber(v)).length;
        if (textCount / vals.length > 0.6) { betterNameCol = i; break; }
      }
      if (betterNameCol >= 0) {
        // Use the numeric column as code and the text column as name
        if (codeCol < 0) codeCol = nameCol;
        nameCol = betterNameCol;
        warnings.push('Account name column appeared to contain codes - found a better description column.');
      } else {
        // No text column found at all - flag hard
        warnings.push(
          'WARNING: Account names look like numeric codes rather than descriptions. ' +
          'Your trial balance may be missing an account description column. ' +
          'Generated working papers will have limited analytical value. ' +
          'Please export a trial balance that includes descriptive account names.'
        );
      }
    }
  }

  const typeCol = matchCol(normedHeaders, TYPE_COLS);
  let debitCol = matchCol(normedHeaders, DEBIT_COLS);
  if (debitCol < 0) debitCol = matchColFuzzy(normedHeaders, DEBIT_COLS);
  let creditCol = matchCol(normedHeaders, CREDIT_COLS);
  if (creditCol < 0) creditCol = matchColFuzzy(normedHeaders, CREDIT_COLS);

  // For CY/PY: try explicit labels first, then positional
  let cyCol = matchColFuzzy(normedHeaders, CY_COLS);
  const pyCol = matchColFuzzy(normedHeaders, PY_COLS);

  // If no debit/credit and no cy/py, find balance columns positionally
  let balanceCol = matchCol(normedHeaders, BALANCE_COLS);
  if (balanceCol < 0) balanceCol = matchColFuzzy(normedHeaders, BALANCE_COLS);

  // Determine format
  let detectedFormat: string;
  if (debitCol >= 0 && creditCol >= 0) {
    detectedFormat = 'debit/credit';
  } else if (cyCol >= 0 && pyCol >= 0) {
    detectedFormat = 'current year / prior year';
  } else if (balanceCol >= 0) {
    detectedFormat = 'single balance column';
    cyCol = balanceCol;
  } else {
    // Last resort: find numeric columns
    const numericCols: number[] = [];
    for (let i = 0; i < headers.length; i++) {
      if (i === nameCol || i === codeCol || i === typeCol) continue;
      // Check if this column has numeric values
      const sample = rows.slice(headerRowIdx + 1, headerRowIdx + 6)
        .map(r => (r as unknown[])[i])
        .filter(v => v !== '' && v !== null && v !== undefined);
      if (sample.length > 0 && sample.some(v => parseNum(v) !== undefined)) {
        numericCols.push(i);
      }
    }
    if (numericCols.length >= 2) {
      debitCol = numericCols[0];
      creditCol = numericCols[1];
      detectedFormat = 'inferred debit/credit';
      warnings.push('Column headers not recognised - inferred first two numeric columns as debit/credit.');
    } else if (numericCols.length === 1) {
      cyCol = numericCols[0];
      detectedFormat = 'inferred single balance';
      warnings.push('Column headers not recognised - using first numeric column as balance.');
    } else {
      throw new Error('Could not find any numeric columns in the file. Please check the format.');
    }
  }

  // Parse data rows
  const lines: ParsedTBLine[] = [];
  let totalDebits = 0;
  let totalCredits = 0;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rawName = String(row[nameCol] ?? '').trim();

    // Skip blank rows, totals rows, section headers
    if (!rawName) continue;
    if (/^total|^sub.?total|^grand total|^net|^balance/i.test(rawName) && !rawName.match(/\d{4,}/)) continue;
    if (row.every(v => v === '' || v === null || v === undefined)) continue;

    const accountCode = codeCol >= 0 ? String(row[codeCol] ?? '').trim() || undefined : undefined;
    const accountName = rawName;

    // Compute balance
    let currentYearBalance: number;

    if (debitCol >= 0 && creditCol >= 0) {
      const dr = parseNum(row[debitCol]) ?? 0;
      const cr = parseNum(row[creditCol]) ?? 0;
      currentYearBalance = dr - cr;
      if (dr > 0) totalDebits += dr;
      if (cr > 0) totalCredits += cr;
    } else {
      currentYearBalance = parseNum(row[cyCol!]) ?? 0;
      if (currentYearBalance > 0) totalDebits += currentYearBalance;
      else totalCredits += Math.abs(currentYearBalance);
    }

    // Skip zero-balance lines unless they have an account code (might be intentional)
    if (currentYearBalance === 0 && !accountCode) continue;

    const priorYearBalance = pyCol >= 0 ? (parseNum(row[pyCol]) ?? undefined) : undefined;
    const varianceAmount = priorYearBalance !== undefined ? currentYearBalance - priorYearBalance : undefined;
    const variancePct = priorYearBalance !== undefined && priorYearBalance !== 0
      ? (varianceAmount! / Math.abs(priorYearBalance)) * 100
      : undefined;

    const rawType = typeCol >= 0 ? String(row[typeCol] ?? '').trim().toLowerCase() : '';
    const accountType = rawType || inferAccountType(accountName, accountCode);
    const auditArea = inferAuditArea(accountName, accountType);

    const absBalance = Math.abs(currentYearBalance);
    const isMaterial = absBalance >= materialityAmount;

    // Flag items - stratified so "flagged" means something actionable, not just "it's material"
    let isFlagged = false;
    let flagReason: string | undefined;

    if (variancePct !== undefined && Math.abs(variancePct) > 50 && absBalance > materialityAmount * 0.1) {
      isFlagged = true;
      flagReason = `${variancePct > 0 ? '+' : ''}${variancePct.toFixed(0)}% variance vs prior year`;
    }
    // Only flag for size when balance is truly dominant - 50x materiality prevents
    // mass-flagging in engagements where most material accounts are > 10x materiality.
    if (absBalance > materialityAmount * 50) {
      isFlagged = true;
      flagReason = flagReason ? flagReason + '; critical balance (exceeds 50x materiality)' : 'Critical balance (exceeds 50x materiality)';
    }

    lines.push({
      accountCode,
      accountName,
      accountType,
      auditArea,
      currentYearBalance,
      priorYearBalance,
      varianceAmount,
      variancePct,
      isMaterial,
      isFlagged,
      flagReason,
    });
  }

  if (lines.length === 0) {
    throw new Error('No valid account lines found. Please check the file format.');
  }

  // ─── Critical data-quality checks ────────────────────────────────────────────

  // 1. Detect if balances look like account codes rather than monetary values.
  //    Symptom: accountName = "1000", balance = 1000.
  //    ONLY fires when the account NAME itself is a bare number - not when a
  //    properly-labelled account code column coincidentally equals a small balance.
  //    (e.g. account code 1000 with a KES 1,000 petty cash balance is valid.)
  const codeEqualsBalanceCount = lines.filter(l => {
    const nameIsNumeric = /^\d+$/.test(l.accountName.trim());
    if (!nameIsNumeric) return false; // Real descriptive name → not a symptom
    const nameAsNum = parseFloat(l.accountName.trim());
    return !isNaN(nameAsNum) && Math.abs(nameAsNum - Math.abs(l.currentYearBalance)) < 0.01;
  }).length;
  if (codeEqualsBalanceCount / lines.length > 0.4) {
    throw new Error(
      'The uploaded file appears to contain account codes in the balance column, not monetary amounts. ' +
      'Account codes were detected as balances (e.g., account 1000 has balance 1,000). ' +
      'Please export a trial balance that includes a separate monetary amount column (Debit/Credit or Balance). ' +
      'AuditLens cannot generate meaningful working papers from code-only data.'
    );
  }

  // 2. Warn if all balances are whole numbers (no cents) - might be codes or rounded estimates.
  const allWholeNumbers = lines.every(l => Number.isInteger(l.currentYearBalance));
  const maxBalance = Math.max(...lines.map(l => Math.abs(l.currentYearBalance)));
  if (allWholeNumbers && maxBalance < 100_000 && lines.length > 5) {
    warnings.push(
      'All balances are whole numbers and the largest is under KES 100,000. ' +
      'Please verify these are real monetary amounts and not account code numbers. ' +
      'Materiality analysis may not be reliable.'
    );
  }

  // 3. Check that account names are not all pure numbers (codes without descriptions).
  const pureNumericNameCount = lines.filter(l => /^\d+$/.test(l.accountName.trim())).length;
  if (pureNumericNameCount / lines.length > 0.5) {
    throw new Error(
      'The uploaded file does not contain account descriptions - account names appear to be numeric codes only. ' +
      'A trial balance must include descriptive account names (e.g., "Trade Receivables", "Salaries Expense") ' +
      'for meaningful audit analysis. Please export your trial balance with account descriptions included.'
    );
  }

  // 4. Materiality base check: if total debits < trivial (when materiality > 0, likely misconfigured)
  if (totalDebits < 1 && lines.length > 2) {
    warnings.push('Total debits are zero or negative. Verify trial balance balances are populated correctly.');
  }

  // ─── Balance check ────────────────────────────────────────────────────────────
  const imbalance = Math.abs(totalDebits - totalCredits);
  const isBalanced = imbalance < 1; // Allow rounding errors

  if (!isBalanced && detectedFormat === 'debit/credit') {
    const diffFormatted = imbalance.toLocaleString('en-KE', { minimumFractionDigits: 2 });
    const likelyCause = diagnoseImbalance(imbalance, totalDebits, lines);
    warnings.push(
      `Trial balance does not balance - difference of ${diffFormatted}. ${likelyCause}`
    );
  }

  return { lines, totalDebits, totalCredits, isBalanced, detectedFormat, warnings };
}

/**
 * Deterministic imbalance diagnosis - no AI, pure arithmetic.
 * Returns a human-readable likely-cause string.
 */
function diagnoseImbalance(
  diff: number,
  totalDebits: number,
  lines: Array<{ accountName: string; accountCode?: string; currentYearBalance: number }>,
): string {
  // 1. Tiny difference → rounding
  if (diff < 100) {
    return 'Likely cause: rounding or currency conversion. Difference is under 100, probably safe to proceed.';
  }

  // 2. Transposition error: difference divisible by 9
  //    (swapping two adjacent digits always produces a multiple of 9)
  if (Math.round(diff) % 9 === 0) {
    return `Likely cause: transposition error. Difference (${Math.round(diff)}) is divisible by 9, which typically means two digits were swapped when entering an amount.`;
  }

  // 3. Exact match: an account balance equals the difference
  //    → that account may be on the wrong side (debit vs credit)
  const exactMatch = lines.find(l => Math.abs(Math.abs(l.currentYearBalance) - diff) < 1);
  if (exactMatch) {
    const label = exactMatch.accountCode
      ? `${exactMatch.accountCode} - ${exactMatch.accountName}`
      : exactMatch.accountName;
    return `Likely cause: "${label}" (balance ${diff.toLocaleString('en-KE', { minimumFractionDigits: 2 })}) may be posted on the wrong side; moving it to the other column would close the gap.`;
  }

  // 4. Half-difference match: an account balance equals diff/2
  //    → that account may be posted twice or its sign reversed (doubles the effect)
  const halfDiff = diff / 2;
  const halfMatch = lines.find(l => Math.abs(Math.abs(l.currentYearBalance) - halfDiff) < 1);
  if (halfMatch) {
    const label = halfMatch.accountCode
      ? `${halfMatch.accountCode} - ${halfMatch.accountName}`
      : halfMatch.accountName;
    return `Likely cause: "${label}" (balance ${halfDiff.toLocaleString('en-KE', { minimumFractionDigits: 2 })}) may be duplicated or sign-reversed; a doubled entry would create exactly this difference.`;
  }

  // 5. Large relative difference → incomplete export
  const totalBase = totalDebits || 1;
  if (diff / totalBase > 0.1) {
    return 'Likely cause: incomplete export. The difference is more than 10% of total debits, suggesting an entire section (e.g. equity, long-term liabilities) may be missing from the export.';
  }

  // 6. Round number → missing lump-sum entry
  if (diff % 1_000 === 0) {
    return `Likely cause: missing account or journal entry. The difference (${diff.toLocaleString('en-KE', { minimumFractionDigits: 2 })}) is a round number, which usually points to a lump-sum entry that was not included in the export.`;
  }

  // 7. Fallback
  return 'Check the source file for posting errors, missing accounts, or an incomplete export.';
}
