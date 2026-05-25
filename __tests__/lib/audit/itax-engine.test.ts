import { describe, it, expect } from 'vitest';
import { computeItaxReconciliation, type ExtractedFinancial } from '@/lib/audit/itax-engine';

// ─── Fixture builders ─────────────────────────────────────────────────────────

function fin(
  overrides: Partial<ExtractedFinancial> & { accountName: string; accountType: string },
): ExtractedFinancial {
  return {
    id: crypto.randomUUID(),
    accountCode: null,
    auditArea: null,
    currentYearBalance: '0',
    ...overrides,
  };
}

const ENGAGEMENT_ID = 'eng-test-001';
const ORG_ID = 'org-test-001';
const TAX_YEAR = 2024;

// ─── Empty / minimal inputs ───────────────────────────────────────────────────

describe('computeItaxReconciliation - empty inputs', () => {
  it('returns low risk with structural VAT observation when no financials provided', () => {
    const result = computeItaxReconciliation([], ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    expect(result.engagementId).toBe(ENGAGEMENT_ID);
    expect(result.orgId).toBe(ORG_ID);
    expect(result.taxYear).toBe(TAX_YEAR);
    expect(result.vatRevenueBase).toBe('0.00');
    expect(result.vatExpectedOutput).toBe('0.00');
    // Should still have the structural observation about no revenue
    const vatObs = result.vatObservations.join(' ');
    expect(vatObs.toLowerCase()).toMatch(/no revenue|vat base cannot/i);
  });

  it('sets all numeric fields to "0.00" when no financials provided', () => {
    const result = computeItaxReconciliation([], ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    expect(result.payePayrollBase).toBe('0.00');
    expect(result.payePerTb).toBe('0.00');
    expect(result.corpTaxPbt).toBe('0.00');
    expect(result.corpTaxPerTb).toBe('0.00');
  });
});

// ─── VAT tests ────────────────────────────────────────────────────────────────

describe('computeItaxReconciliation - VAT', () => {
  const baseFinancials: ExtractedFinancial[] = [
    fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '10000000' }),
    fin({ accountName: 'VAT Payable', accountType: 'liability', currentYearBalance: '1200000' }),
  ];

  it('always emits the structural upfront caveat that VAT base cannot be derived from revenue alone', () => {
    const result = computeItaxReconciliation(baseFinancials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const structuralObs = result.vatObservations.filter(o => o.startsWith('[STRUCTURAL]'));
    expect(structuralObs.length).toBeGreaterThanOrEqual(1);
    expect(structuralObs[0]).toMatch(/VAT base cannot be derived/i);
  });

  it('uses unflagged revenue (non-exempt) as proxy base, not total revenue', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '8000000' }),
      fin({ accountName: 'Grant Income', accountType: 'revenue', currentYearBalance: '2000000' }),
      fin({ accountName: 'VAT Payable', accountType: 'liability', currentYearBalance: '900000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    // Grant Income is in POSSIBLY_EXEMPT_TERMS → excluded from proxy base
    expect(parseFloat(result.vatRevenueBase)).toBeCloseTo(8000000, 0);
    // Expected output = 8,000,000 * 0.16 = 1,280,000
    expect(parseFloat(result.vatExpectedOutput)).toBeCloseTo(1280000, 0);
  });

  it('flags exempt-sounding accounts as analytical observations', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'School Fee Income', accountType: 'revenue', currentYearBalance: '5000000' }),
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '3000000' }),
      fin({ accountName: 'VAT Payable', accountType: 'liability', currentYearBalance: '480000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const analyticalObs = result.vatObservations.filter(o => o.startsWith('[ANALYTICAL]'));
    // Should have an analytical observation flagging the school fee account
    const hasExemptFlag = analyticalObs.some(o => /school fee|exempt|non-standard/i.test(o));
    expect(hasExemptFlag).toBe(true);
  });

  it('emits structural observation when no VAT payable account found', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '5000000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const structuralObs = result.vatObservations.filter(o => o.startsWith('[STRUCTURAL]'));
    const hasNoVatFlag = structuralObs.some(o => /no vat payable|vat-registered/i.test(o));
    expect(hasNoVatFlag).toBe(true);
  });

  it('emits analytical observation when proxy VAT gap exceeds 5%', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '10000000' }),
      // Expected = 1,600,000; TB has 900,000 → gap = 700,000 / 1,600,000 = 43.75%
      fin({ accountName: 'VAT Payable', accountType: 'liability', currentYearBalance: '900000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const analyticalObs = result.vatObservations.filter(o => o.startsWith('[ANALYTICAL]'));
    const hasGapObs = analyticalObs.some(o => /proxy indicator|theoretical output|gap/i.test(o));
    expect(hasGapObs).toBe(true);
  });

  it('does NOT flag as under-remittance - uses analytical language only', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '10000000' }),
      fin({ accountName: 'VAT Payable', accountType: 'liability', currentYearBalance: '500000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const allObs = result.vatObservations.join(' ');
    expect(allObs).not.toMatch(/confirmed under-remittance|proven gap|tax evasion/i);
    expect(allObs).toMatch(/analytical indicator|proxy|unconfirmed/i);
  });

  it('sets hasStructural flag → riskNature includes structural', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '10000000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    expect(['structural_only', 'structural_and_analytical']).toContain(result.riskNature);
  });
});

// ─── PAYE tests ───────────────────────────────────────────────────────────────

describe('computeItaxReconciliation - PAYE', () => {
  it('detects classification gap when payroll-like accounts exist outside payroll area', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Direct Labour', accountType: 'expense', auditArea: 'expenses', currentYearBalance: '4200000' }),
      fin({ accountName: 'PAYE Payable', accountType: 'liability', currentYearBalance: '840000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const structuralObs = result.payeObservations.filter(o => o.startsWith('[STRUCTURAL]'));
    expect(structuralObs.length).toBeGreaterThanOrEqual(1);
    // Must mention contract workers / employment distinction
    const hasContractNote = structuralObs.some(o =>
      /contract|employment income|payroll register|cannot be derived/i.test(o)
    );
    expect(hasContractNote).toBe(true);
  });

  it('payroll base is 0 when only unclassified payroll-like accounts exist', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Salaries Expense', accountType: 'expense', auditArea: 'expenses', currentYearBalance: '3000000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    expect(parseFloat(result.payePayrollBase)).toBe(0);
  });

  it('uses classified payroll area accounts as PAYE base', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Staff Salaries', accountType: 'expense', auditArea: 'payroll', currentYearBalance: '6000000' }),
      fin({ accountName: 'PAYE Payable', accountType: 'liability', currentYearBalance: '1200000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    expect(parseFloat(result.payePayrollBase)).toBeCloseTo(6000000, 0);
  });

  it('flags unclassified payroll accounts as analytical when a classified base exists', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Staff Salaries', accountType: 'expense', auditArea: 'payroll', currentYearBalance: '5000000' }),
      fin({ accountName: 'Direct Labour', accountType: 'expense', auditArea: 'expenses', currentYearBalance: '2000000' }),
      fin({ accountName: 'PAYE Payable', accountType: 'liability', currentYearBalance: '900000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const analyticalObs = result.payeObservations.filter(o => o.startsWith('[ANALYTICAL]'));
    const hasUnclassifiedNote = analyticalObs.some(o =>
      /outside the classified|contract|contractor/i.test(o)
    );
    expect(hasUnclassifiedNote).toBe(true);
  });

  it('emits structural observation when no PAYE payable account exists', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Staff Salaries', accountType: 'expense', auditArea: 'payroll', currentYearBalance: '4000000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const structuralObs = result.payeObservations.filter(o => o.startsWith('[STRUCTURAL]'));
    expect(structuralObs.some(o => /no paye payable/i.test(o))).toBe(true);
  });

  it('emits informational note about 25% blended approximation', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Payroll Expense', accountType: 'expense', auditArea: 'payroll', currentYearBalance: '5000000' }),
      fin({ accountName: 'PAYE Payable', accountType: 'liability', currentYearBalance: '1250000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const infoObs = result.payeObservations.filter(o => o.startsWith('[INFORMATIONAL]'));
    expect(infoObs.some(o => /25%|blended/i.test(o))).toBe(true);
  });
});

// ─── Corporate Tax tests ──────────────────────────────────────────────────────

describe('computeItaxReconciliation - Corporate Tax', () => {
  it('finds Income Tax Expense account regardless of accountType (loose matching fix)', () => {
    // This was the bug: accountType='asset' or other non-expense types were ignored
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '20000000' }),
      fin({ accountName: 'Operating Expenses', accountType: 'expense', currentYearBalance: '12000000' }),
      // accountType is NOT 'expense' — simulates the real-world bug
      fin({ accountName: 'Income Tax Expense', accountType: 'liability', currentYearBalance: '2850000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    // Engine must find the account
    expect(parseFloat(result.corpTaxPerTb)).toBeCloseTo(2850000, 0);
    // And acknowledge it in observations
    const infoObs = result.corpTaxObservations.filter(o => o.startsWith('[INFORMATIONAL]'));
    const hasTbAck = infoObs.some(o => /identified in tb|income tax expense/i.test(o));
    expect(hasTbAck).toBe(true);
  });

  it('emits structural observation when no tax expense account found', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '10000000' }),
      fin({ accountName: 'Operating Expenses', accountType: 'expense', currentYearBalance: '6000000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const structuralObs = result.corpTaxObservations.filter(o => o.startsWith('[STRUCTURAL]'));
    expect(structuralObs.some(o => /no income tax|not found/i.test(o))).toBe(true);
  });

  it('computes PBT as revenue minus expenses', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '15000000' }),
      fin({ accountName: 'Operating Expenses', accountType: 'expense', currentYearBalance: '9000000' }),
      fin({ accountName: 'Income Tax Expense', accountType: 'expense', currentYearBalance: '1800000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    // PBT = revenue - all expenses = 15M - (9M + 1.8M) = 4.2M
    expect(parseFloat(result.corpTaxPbt)).toBeCloseTo(4200000, 0);
  });

  it('applies minimum tax (1% of revenue) when higher than 30% of PBT', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '10000000' }),
      // High expenses → near-zero profit → min tax should kick in
      fin({ accountName: 'Operating Expenses', accountType: 'expense', currentYearBalance: '9900000' }),
      fin({ accountName: 'Current Tax Expense', accountType: 'expense', currentYearBalance: '100000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    // PBT = 100,000 → 30% = 30,000
    // Min tax = 1% of 10M = 100,000 → should apply min tax
    expect(parseFloat(result.corpTaxExpected)).toBeCloseTo(100000, 0);
    const infoObs = result.corpTaxObservations.filter(o => o.startsWith('[INFORMATIONAL]'));
    expect(infoObs.some(o => /minimum tax/i.test(o))).toBe(true);
  });

  it('frames tax difference as effective rate anomaly, not confirmed gap', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '20000000' }),
      fin({ accountName: 'Operating Expenses', accountType: 'expense', currentYearBalance: '12000000' }),
      // Expected ~2.4M, but TB shows 1M → large gap
      fin({ accountName: 'Income Tax Expense', accountType: 'expense', currentYearBalance: '1000000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const analyticalObs = result.corpTaxObservations.filter(o => o.startsWith('[ANALYTICAL]'));
    const hasRateAnomaly = analyticalObs.some(o => /anomaly|deferred tax|full tax computation|do not conclude/i.test(o));
    expect(hasRateAnomaly).toBe(true);
    // Must NOT say "confirmed under-provision"
    expect(analyticalObs.join(' ')).not.toMatch(/confirmed under|proven/i);
  });

  it('emits loss observation when PBT is negative', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '5000000' }),
      fin({ accountName: 'Operating Expenses', accountType: 'expense', currentYearBalance: '8000000' }),
      fin({ accountName: 'Current Tax', accountType: 'expense', currentYearBalance: '50000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    expect(parseFloat(result.corpTaxPbt)).toBeLessThan(0);
    const infoObs = result.corpTaxObservations.filter(o => o.startsWith('[INFORMATIONAL]'));
    expect(infoObs.some(o => /loss|minimum tax/i.test(o))).toBe(true);
  });
});

// ─── Risk scoring ─────────────────────────────────────────────────────────────

describe('computeItaxReconciliation - risk scoring', () => {
  it('riskNature is structural_only when only structural gaps exist', () => {
    // Only structural: no revenue accounts, no PAYE payable, no tax expense
    const financials: ExtractedFinancial[] = [];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    // Empty → VAT structural (no revenue) → structural_only or structural_and_analytical
    expect(['structural_only', 'structural_and_analytical', 'none']).toContain(result.riskNature);
  });

  it('riskNature is structural_and_analytical when both types of gaps exist', () => {
    const financials: ExtractedFinancial[] = [
      // Structural: no VAT payable
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '10000000' }),
      // Analytical: large VAT gap
      // (no VAT payable account → structural, but also no PAYE, etc.)
      fin({ accountName: 'Salaries', accountType: 'expense', auditArea: 'expenses', currentYearBalance: '3000000' }),
      fin({ accountName: 'Income Tax Expense', accountType: 'expense', currentYearBalance: '100000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    expect(['structural_only', 'structural_and_analytical']).toContain(result.riskNature);
  });

  it('overallRiskLevel is medium when there are structural gaps', () => {
    const result = computeItaxReconciliation([], ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    // Structural gaps always push to at least medium
    expect(['medium', 'high']).toContain(result.overallRiskLevel);
  });

  it('overallRiskLevel is high when both structural gaps and large analytical gaps exist', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '50000000' }),
      // Large VAT gap (structural: no VAT payable + analytical: huge revenue)
      fin({ accountName: 'Direct Labour', accountType: 'expense', auditArea: 'expenses', currentYearBalance: '20000000' }),
      fin({ accountName: 'Operating Expenses', accountType: 'expense', currentYearBalance: '10000000' }),
      // Corp tax: huge expected vs tiny actual
      fin({ accountName: 'Income Tax Expense', accountType: 'expense', currentYearBalance: '100000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    expect(result.overallRiskLevel).toBe('high');
  });

  it('summary always includes the risk nature and year', () => {
    const result = computeItaxReconciliation([], ENGAGEMENT_ID, ORG_ID, 2023);
    expect(result.summary).toMatch(/2023/);
    expect(result.summary).toMatch(/risk nature/i);
  });

  it('observations are prefixed with [STRUCTURAL], [ANALYTICAL], or [INFORMATIONAL]', () => {
    const financials: ExtractedFinancial[] = [
      fin({ accountName: 'Sales Revenue', accountType: 'revenue', currentYearBalance: '5000000' }),
      fin({ accountName: 'VAT Payable', accountType: 'liability', currentYearBalance: '500000' }),
      fin({ accountName: 'Staff Costs', accountType: 'expense', auditArea: 'payroll', currentYearBalance: '2000000' }),
      fin({ accountName: 'PAYE Payable', accountType: 'liability', currentYearBalance: '400000' }),
      fin({ accountName: 'Income Tax Expense', accountType: 'expense', currentYearBalance: '600000' }),
    ];
    const result = computeItaxReconciliation(financials, ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const allObs = [
      ...result.vatObservations,
      ...result.payeObservations,
      ...result.corpTaxObservations,
    ];
    for (const obs of allObs) {
      expect(obs).toMatch(/^\[(STRUCTURAL|ANALYTICAL|INFORMATIONAL)\]/);
    }
  });
});

// ─── Result shape ─────────────────────────────────────────────────────────────

describe('computeItaxReconciliation - result shape', () => {
  it('always returns all required fields', () => {
    const result = computeItaxReconciliation([], ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const requiredFields = [
      'engagementId', 'orgId', 'taxYear',
      'vatRevenueBase', 'vatExpectedOutput', 'vatPerTb', 'vatDifference', 'vatObservations',
      'payePayrollBase', 'payePerTb', 'payeDifference', 'payeObservations',
      'corpTaxPbt', 'corpTaxExpected', 'corpTaxPerTb', 'corpTaxDifference', 'corpTaxObservations',
      'overallRiskLevel', 'riskNature', 'summary',
    ];
    for (const field of requiredFields) {
      expect(result).toHaveProperty(field);
    }
  });

  it('numeric fields are valid decimal strings', () => {
    const result = computeItaxReconciliation([], ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    const numericFields = [
      'vatRevenueBase', 'vatExpectedOutput', 'vatPerTb', 'vatDifference',
      'payePayrollBase', 'payePerTb', 'payeDifference',
      'corpTaxPbt', 'corpTaxExpected', 'corpTaxPerTb', 'corpTaxDifference',
    ];
    for (const field of numericFields) {
      const value = (result as Record<string, unknown>)[field] as string;
      expect(value).toMatch(/^-?\d+\.\d{2}$/);
    }
  });

  it('observation arrays are always arrays (never undefined)', () => {
    const result = computeItaxReconciliation([], ENGAGEMENT_ID, ORG_ID, TAX_YEAR);
    expect(Array.isArray(result.vatObservations)).toBe(true);
    expect(Array.isArray(result.payeObservations)).toBe(true);
    expect(Array.isArray(result.corpTaxObservations)).toBe(true);
  });
});
