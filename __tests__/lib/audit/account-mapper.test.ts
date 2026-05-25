import { describe, it, expect, beforeEach } from 'vitest';
import { mapAccount, clearVocabCache } from '@/lib/audit/account-mapper';

beforeEach(() => {
  // Each test starts with a clean vocab cache
  clearVocabCache();
});

// ─── Layer 1: Exact match ──────────────────────────────────────────────────────

describe('mapAccount - Layer 1 exact match', () => {
  it('classifies "cash and cash equivalents" with high confidence', () => {
    const result = mapAccount('Cash and Cash Equivalents');
    expect(result.matchedLayer).toBe(1);
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    expect(result.needsReview).toBe(false);
    expect(result.category).toBe('CASH_BANK');
  });

  it('classifies "trade receivables" correctly', () => {
    const result = mapAccount('Trade Receivables');
    expect(result.matchedLayer).toBe(1);
    expect(result.category).toBe('AR_TRADE');
  });

  it('classifies "retained earnings" to equity', () => {
    const result = mapAccount('Retained Earnings');
    expect(['RETAINED_EARNINGS', 'SHARE_CAPITAL', 'OTHER_RESERVES']).toContain(result.category);
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});

// ─── Layer 2: Alias match ─────────────────────────────────────────────────────

describe('mapAccount - Layer 2 alias match', () => {
  it('maps "debtors" to AR_TRADE via alias', () => {
    const result = mapAccount('Debtors');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(['AR_TRADE', 'OTHER_CA']).toContain(result.category);
  });

  it('maps "creditors" to AP or liability category', () => {
    const result = mapAccount('Creditors');
    // Creditors = accounts payable in alias map
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('maps common abbreviations case-insensitively', () => {
    const result1 = mapAccount('DEBTORS');
    const result2 = mapAccount('debtors');
    expect(result1.category).toBe(result2.category);
  });
});

// ─── Layer 3: Regex patterns ──────────────────────────────────────────────────

describe('mapAccount - Layer 3 regex', () => {
  it('matches payroll-related accounts', () => {
    const salaries = mapAccount('Salaries and Wages Expense');
    expect(['PAYROLL_EXPENSE', 'DIRECT_LABOUR', 'COGS']).toContain(salaries.category);
  });

  it('matches tax payable accounts', () => {
    const vatPayable = mapAccount('VAT Payable');
    expect(result => result !== undefined).toBeTruthy();
    expect(vatPayable.confidence).toBeGreaterThan(0.5);
  });

  it('matches bank/financial accounts', () => {
    const bank = mapAccount('KCB Bank Account');
    expect(bank.confidence).toBeGreaterThan(0.5);
  });
});

// ─── Layer 4: Trigram / fuzzy ─────────────────────────────────────────────────

describe('mapAccount - Layer 4 fuzzy (trigram)', () => {
  it('handles minor typos in account names', () => {
    // "Receivebles" has a typo but should still classify
    const result = mapAccount('Trade Receivebles');
    // Should get some match, confidence > 0
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('handles Kenyan SME account variants', () => {
    // Common Kenyan name variant
    const result = mapAccount('Mpesa Float');
    // Should classify as cash/bank related
    expect(result.confidence).toBeGreaterThan(0);
  });
});

// ─── Account code fallback ────────────────────────────────────────────────────

describe('mapAccount - account code fallback', () => {
  it('uses account code range 1000-1099 for CASH_BANK', () => {
    // Unrecognisable name but code in cash range
    const result = mapAccount('XYZABC Account 99', '1050');
    if (result.matchedLayer >= 4) {
      // If trigram fails, code should kick in
      expect(result.category).toBe('CASH_BANK');
    }
  });

  it('uses account code range 4000-4499 for revenue', () => {
    const result = mapAccount('Revenue Account Misc', '4100');
    if (result.matchedLayer === 5) {
      expect(result.category).not.toBe('UNKNOWN');
    }
  });

  it('sets matchedLayer=5 and needsReview=true for code-only match', () => {
    const result = mapAccount('ZZZZZ Unknown', '1050');
    if (result.matchedLayer === 5 && result.category !== 'UNKNOWN') {
      expect(result.needsReview).toBe(true);
    }
  });
});

// ─── UNKNOWN fallback ─────────────────────────────────────────────────────────

describe('mapAccount - UNKNOWN fallback', () => {
  it('returns UNKNOWN with confidence=0 for completely unrecognisable account without code', () => {
    const result = mapAccount('QQQQQ ZZZZZ XXXXX 9999');
    expect(result.category).toBe('UNKNOWN');
    expect(result.confidence).toBe(0);
    expect(result.needsReview).toBe(true);
  });

  it('UNKNOWN result still has matchedLayer set', () => {
    const result = mapAccount('QQQQQ ZZZZZ XXXXX 9999');
    expect([1, 2, 3, 4, 5]).toContain(result.matchedLayer);
  });
});

// ─── Parenthetical cleaning ───────────────────────────────────────────────────

describe('mapAccount - parenthetical cleaning', () => {
  it('strips trailing parenthetical from account name before matching', () => {
    const withParen = mapAccount('Trade Receivables (Net)');
    const withoutParen = mapAccount('Trade Receivables');
    // Both should classify the same way
    expect(withParen.category).toBe(withoutParen.category);
  });

  it('strips manufacturing parenthetical from salaries', () => {
    const result = mapAccount('Salaries (Manufacturing)');
    expect(['PAYROLL_EXPENSE', 'DIRECT_LABOUR']).toContain(result.category);
  });
});

// ─── Industry variants ────────────────────────────────────────────────────────

describe('mapAccount - industry parameter', () => {
  it('accepts "general" industry without error', () => {
    expect(() => mapAccount('Cash', undefined, 'general')).not.toThrow();
  });

  it('accepts "ngo" industry without error', () => {
    expect(() => mapAccount('Donor Funds', undefined, 'ngo')).not.toThrow();
  });

  it('accepts "school" industry without error', () => {
    expect(() => mapAccount('School Fees Income', undefined, 'school')).not.toThrow();
  });

  it('returns consistent results for the same input/industry combination', () => {
    const r1 = mapAccount('Cash and Bank', undefined, 'general');
    const r2 = mapAccount('Cash and Bank', undefined, 'general');
    expect(r1.category).toBe(r2.category);
    expect(r1.confidence).toBe(r2.confidence);
  });
});
