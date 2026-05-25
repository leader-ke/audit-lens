/**
 * KRA iTax Reconciliation Engine (v2)
 *
 * Produces analytical risk flags, not conclusions.
 * Each observation distinguishes:
 *   - ANALYTICAL  : computed from TB assumptions; requires auditor confirmation
 *   - STRUCTURAL  : control/classification gap regardless of amount
 *   - INFORMATIONAL: contextual note, no risk rating
 *
 * Key design rules:
 *   - Never assert "under-remittance confirmed" - use "exposure requiring reconciliation"
 *   - Never derive PAYE from unclassified labour accounts without flagging the classification gap
 *   - Never assume all revenue is VATable - flag potential exempt lines
 *   - Never aggregate analytical + structural gaps into a single liability conclusion
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExtractedFinancial {
  id: string;
  accountCode: string | null;
  accountName: string;
  accountType: string;
  auditArea: string | null;
  currentYearBalance: string;
}

export interface ItaxReconciliationInput {
  financials: ExtractedFinancial[];
  engagementId: string;
  orgId: string;
  taxYear: number;
}

/** Risk type tags attached to each observation */
export type ObservationRiskType = 'analytical' | 'structural' | 'informational';

export interface TaggedObservation {
  text: string;
  type: ObservationRiskType;
}

export interface ItaxReconciliationResult {
  engagementId: string;
  orgId: string;
  taxYear: number;
  // VAT
  vatRevenueBase: string;
  vatExpectedOutput: string;
  vatPerTb: string;
  vatDifference: string;
  vatObservations: string[];
  // PAYE
  payePayrollBase: string;
  payePerTb: string;
  payeDifference: string;
  payeObservations: string[];
  // Corporate Tax
  corpTaxPbt: string;
  corpTaxExpected: string;
  corpTaxPerTb: string;
  corpTaxDifference: string;
  corpTaxObservations: string[];
  // Overall
  overallRiskLevel: 'low' | 'medium' | 'high';
  // Separates what kind of risk was found
  riskNature: 'none' | 'structural_only' | 'analytical_only' | 'structural_and_analytical';
  summary: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNum(s: string | null | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmt2(n: number): string { return n.toFixed(2); }

function nameContains(name: string, ...frags: string[]): boolean {
  const l = name.toLowerCase();
  return frags.some(f => l.includes(f.toLowerCase()));
}

function kes(n: number): string {
  return `KES ${Math.round(n).toLocaleString('en-KE')}`;
}

// ── VAT ───────────────────────────────────────────────────────────────────────

// Account names that commonly indicate non-standard VAT treatment
const POSSIBLY_EXEMPT_TERMS = [
  'grant', 'donation', 'subsidy', 'capitation', 'levy',
  'student fee', 'school fee', 'tuition', 'fee income',
  'government grant', 'donor', 'transfer', 'bursary',
];

function computeVat(financials: ExtractedFinancial[]): {
  vatRevenueBase: number;
  vatExpectedOutput: number;
  vatPerTb: number;
  vatDifference: number;
  vatObservations: TaggedObservation[];
  hasStructural: boolean;
  hasAnalytical: boolean;
} {
  const obs: TaggedObservation[] = [];

  const revenueAccounts = financials.filter(f => f.accountType.toLowerCase() === 'revenue');

  // Split flagged-possibly-exempt vs remaining revenue lines.
  // "Remaining" does NOT mean "confirmed VATable" - it means "not flagged exempt by name pattern".
  // The actual VATable base requires a sales ledger classification and client VAT schedule.
  const possiblyExemptAccounts = revenueAccounts.filter(f =>
    POSSIBLY_EXEMPT_TERMS.some(t => f.accountName.toLowerCase().includes(t))
  );
  const unflaggedRevenueAccounts = revenueAccounts.filter(f =>
    !POSSIBLY_EXEMPT_TERMS.some(t => f.accountName.toLowerCase().includes(t))
  );

  const totalRevenue = revenueAccounts.reduce(
    (sum, f) => sum + Math.abs(toNum(f.currentYearBalance)), 0
  );
  const possiblyExemptTotal = possiblyExemptAccounts.reduce(
    (sum, f) => sum + Math.abs(toNum(f.currentYearBalance)), 0
  );
  const unflaggedRevenueTotal = unflaggedRevenueAccounts.reduce(
    (sum, f) => sum + Math.abs(toNum(f.currentYearBalance)), 0
  );

  // vatRevenueBase = unflagged revenue only - stored as the analytical indicator.
  // It is NOT a derived VATable base. Label it clearly in observations.
  const vatRevenueBase = unflaggedRevenueTotal;
  const vatExpectedOutput = vatRevenueBase * 0.16; // theoretical max on unflagged lines

  // VAT per TB
  const vatTbAccounts = financials.filter(
    f => f.accountType.toLowerCase() === 'liability' &&
      nameContains(f.accountName, 'vat payable', 'output vat', 'vat control', 'vat')
  );
  const vatPerTb = vatTbAccounts.reduce(
    (sum, f) => sum + Math.abs(toNum(f.currentYearBalance)), 0
  );
  const vatDifference = vatExpectedOutput - vatPerTb;

  let hasStructural = false;
  let hasAnalytical = false;

  if (revenueAccounts.length === 0) {
    obs.push({ type: 'structural', text: 'No revenue accounts found in TB - VAT base is not determinable.' });
    hasStructural = true;
    return { vatRevenueBase: 0, vatExpectedOutput: 0, vatPerTb: 0, vatDifference: 0, vatObservations: obs, hasStructural, hasAnalytical };
  }

  // Upfront caveat: VAT base is never derived directly from revenue in a real audit
  obs.push({
    type: 'structural',
    text: `VAT base cannot be derived from revenue accounts alone. Revenue in the TB (${kes(totalRevenue)}) is not equivalent to the VATable supply base. The actual VATable base requires: (1) a supply-type classification of each revenue line (standard-rated, zero-rated, exempt), (2) the client's VAT schedule or sales ledger analysis, and (3) reconciliation to monthly VAT 3 returns. This analysis uses an unconfirmed proxy only.`,
  });
  hasStructural = true;

  if (vatTbAccounts.length === 0) {
    obs.push({ type: 'structural', text: 'No VAT payable or output VAT account identified in TB. Verify whether the entity is VAT-registered. If registered, output VAT may be netted within a combined creditors account or not yet accrued.' });
  }

  if (possiblyExemptAccounts.length > 0) {
    const names = possiblyExemptAccounts.map(a => a.accountName).join(', ');
    obs.push({
      type: 'analytical',
      text: `Revenue lines with potentially exempt or non-standard characteristics flagged by name (${kes(possiblyExemptTotal)}): ${names}. Excluded from the proxy indicator. Note: name-pattern exclusion is not a VAT classification - confirm supply type with the client's VAT schedule.`,
    });
    hasAnalytical = true;
  }

  if (vatRevenueBase > 0 && vatTbAccounts.length > 0) {
    if (Math.abs(vatDifference) / (vatExpectedOutput || 1) > 0.05) {
      if (vatDifference > 0) {
        obs.push({
          type: 'analytical',
          text: `Proxy indicator: if all unflagged revenue (${kes(vatRevenueBase)}) were standard-rated, theoretical output VAT would be ${kes(vatExpectedOutput)}; TB VAT balance is ${kes(vatPerTb)} - a gap of ${kes(vatDifference)}. This is an unconfirmed analytical indicator. The gap may arise because: (a) some unflagged revenue is zero-rated or exempt, (b) credit notes reduce output tax, (c) VAT is accounted for on a cash basis, or (d) accrual timing differences. Do not conclude under-remittance without reconciling to VAT 3 returns.`,
        });
      } else {
        obs.push({
          type: 'analytical',
          text: `TB VAT balance (${kes(vatPerTb)}) exceeds theoretical output tax on unflagged revenue (${kes(vatExpectedOutput)}) by ${kes(Math.abs(vatDifference))}. Possible causes: input VAT netted in the control account, prior-period adjustments, or over-accrual. Obtain VAT returns for reconciliation.`,
        });
      }
      hasAnalytical = true;
    } else {
      obs.push({ type: 'informational', text: `TB VAT balance is broadly consistent with the theoretical maximum output tax on unflagged revenue. This does not confirm compliance - reconcile against VAT 3 returns.` });
    }
  }

  obs.push({
    type: 'informational',
    text: `Proxy indicator basis: ${kes(vatRevenueBase)} unflagged revenue x 16%. This is the theoretical ceiling assuming all unflagged lines are standard-rated - the actual VATable base is almost certainly lower. Do not use this figure as a filed or computed VAT liability.`,
  });

  return { vatRevenueBase, vatExpectedOutput, vatPerTb, vatDifference, vatObservations: obs, hasStructural, hasAnalytical };
}

// ── PAYE ──────────────────────────────────────────────────────────────────────

// Account name patterns that indicate payroll-type costs regardless of audit area classification
const PAYROLL_COST_TERMS = [
  'salary', 'salaries', 'wages', 'wage', 'payroll',
  'staff cost', 'staff expense', 'labour cost', 'labor cost',
  'direct labour', 'direct labor', 'personnel', 'remuneration',
  'employee cost', 'manpower',
];

function computePaye(financials: ExtractedFinancial[]): {
  payePayrollBase: number;
  payePerTb: number;
  payeDifference: number;
  payeObservations: TaggedObservation[];
  hasStructural: boolean;
  hasAnalytical: boolean;
} {
  const obs: TaggedObservation[] = [];
  let hasStructural = false;
  let hasAnalytical = false;

  // Primary: expenses in audit area = 'payroll'
  const classifiedPayroll = financials.filter(
    f => f.accountType.toLowerCase() === 'expense' && f.auditArea === 'payroll'
  );
  const classifiedBase = classifiedPayroll.reduce(
    (sum, f) => sum + Math.abs(toNum(f.currentYearBalance)), 0
  );

  // Secondary scan: expense accounts with payroll-sounding names NOT in payroll area
  const unclassifiedPayrollLike = financials.filter(
    f => f.accountType.toLowerCase() === 'expense' &&
      f.auditArea !== 'payroll' &&
      PAYROLL_COST_TERMS.some(t => f.accountName.toLowerCase().includes(t))
  );
  const unclassifiedBase = unclassifiedPayrollLike.reduce(
    (sum, f) => sum + Math.abs(toNum(f.currentYearBalance)), 0
  );

  const payePayrollBase = classifiedBase;

  // PAYE per TB
  const payeTbAccounts = financials.filter(
    f => f.accountType.toLowerCase() === 'liability' &&
      nameContains(f.accountName, 'paye payable', 'paye control', 'paye')
  );
  const payePerTb = payeTbAccounts.reduce(
    (sum, f) => sum + Math.abs(toNum(f.currentYearBalance)), 0
  );

  const payeExpected = classifiedBase * 0.25;
  const payeDifference = payeExpected - payePerTb;

  if (payeTbAccounts.length === 0) {
    obs.push({ type: 'structural', text: 'No PAYE payable account identified in TB. If the entity has employees, PAYE should have a liability balance at year-end for the final month\'s deduction.' });
    hasStructural = true;
  }

  if (classifiedBase === 0 && unclassifiedPayrollLike.length > 0) {
    // Classification gap - cannot derive PAYE base, and even if reclassified the nature of costs is unknown
    const names = unclassifiedPayrollLike.map(a => `${a.accountName} (${kes(Math.abs(toNum(a.currentYearBalance)))})`).join('; ');
    obs.push({
      type: 'structural',
      text: `Payroll-type expense accounts exist (${kes(unclassifiedBase)}) but are not classified to the payroll audit area: ${names}. PAYE base is not derivable for two compounding reasons: (1) accounts are not in the payroll area, preventing TB-level classification; (2) even if reclassified, 'Direct Labour' and similar labels may include contract workers, casual labourers, or outsourced staff - none of which are employment income subject to PAYE. PAYE applies only to employment income under a contract of service. Obtain the payroll register, distinguish employed vs contracted workers, and reconcile gross pay per register to these TB accounts before forming any view on PAYE exposure.`,
    });
    hasStructural = true;
  } else if (classifiedBase === 0 && unclassifiedPayrollLike.length === 0) {
    obs.push({
      type: 'structural',
      text: 'No payroll or labour expense accounts found in TB. Confirm whether entity has employees. If so, payroll costs may be embedded in Cost of Sales or other composite expense lines - request a cost breakdown.',
    });
    hasStructural = true;
  } else if (classifiedBase > 0) {
    // Normal path: we have a classified payroll base
    if (unclassifiedPayrollLike.length > 0) {
      const names = unclassifiedPayrollLike.map(a => a.accountName).join(', ');
      obs.push({
        type: 'analytical',
        text: `Additional payroll-type accounts outside the classified payroll area detected (${kes(unclassifiedBase)}): ${names}. These are excluded from the PAYE base estimate. Note: accounts labelled 'Direct Labour', 'Contract Labour', or similar may represent contracted parties rather than employees - PAYE applies only to employment income. Verify employment vs contractor status before including these in the PAYE base.`,
      });
      hasAnalytical = true;
    }

    if (payeTbAccounts.length > 0 && Math.abs(payeDifference) / (payeExpected || 1) > 0.05) {
      if (payeDifference > 0) {
        obs.push({
          type: 'analytical',
          text: `PAYE analytical gap: estimated PAYE on classified payroll (${kes(classifiedBase)} x 25% blended = ${kes(payeExpected)}) exceeds PAYE payable per TB (${kes(payePerTb)}) by ${kes(payeDifference)}. This is an analytical indicator using a blended 25% approximation - actual PAYE depends on individual income tax brackets. Requires reconciliation against monthly PAYE returns (P10/iTax submissions).`,
        });
        hasAnalytical = true;
      } else {
        obs.push({
          type: 'analytical',
          text: `PAYE payable per TB (${kes(payePerTb)}) exceeds blended estimate (${kes(payeExpected)}). Possible causes: high-income earners with marginal rates above 25%, prior-period adjustments, or outstanding remittance. Obtain P10 returns for reconciliation.`,
        });
        hasAnalytical = true;
      }
    }

    obs.push({
      type: 'informational',
      text: 'PAYE estimate uses 25% blended approximation. Actual liability depends on the income distribution of employees across KRA tax bands (10%-30%). This estimate is indicative only.',
    });
  }

  return { payePayrollBase, payePerTb, payeDifference, payeObservations: obs, hasStructural, hasAnalytical };
}

// ── Corporate Tax ─────────────────────────────────────────────────────────────

function computeCorpTax(financials: ExtractedFinancial[]): {
  corpTaxPbt: number;
  corpTaxExpected: number;
  corpTaxPerTb: number;
  corpTaxDifference: number;
  corpTaxObservations: TaggedObservation[];
  hasStructural: boolean;
  hasAnalytical: boolean;
} {
  const obs: TaggedObservation[] = [];
  let hasStructural = false;
  let hasAnalytical = false;

  const totalRevenue = financials
    .filter(f => f.accountType.toLowerCase() === 'revenue')
    .reduce((sum, f) => sum + Math.abs(toNum(f.currentYearBalance)), 0);

  const totalExpenses = financials
    .filter(f => f.accountType.toLowerCase() === 'expense')
    .reduce((sum, f) => sum + Math.abs(toNum(f.currentYearBalance)), 0);

  const corpTaxPbt = totalRevenue - totalExpenses;

  // Deferred tax accounts present?
  const deferredTaxAccounts = financials.filter(
    f => nameContains(f.accountName, 'deferred tax', 'deferred taxation')
  );

  // Search all non-revenue, non-equity account types - TB mappers sometimes classify
  // "Income Tax Expense" under a generic type rather than 'expense'. Cast a wide net.
  const taxExpenseAccounts = financials.filter(
    f => !['revenue', 'equity'].includes(f.accountType.toLowerCase()) &&
      nameContains(
        f.accountName,
        'income tax expense', 'income tax', 'tax expense', 'tax charge',
        'corporation tax', 'corporate tax', 'current tax',
      )
  );
  const corpTaxPerTb = taxExpenseAccounts.reduce(
    (sum, f) => sum + Math.abs(toNum(f.currentYearBalance)), 0
  );

  const taxPayableAccounts = financials.filter(
    f => f.accountType.toLowerCase() === 'liability' &&
      nameContains(f.accountName, 'tax payable', 'income tax payable', 'corporation tax payable', 'current tax payable')
  );

  const standardTax = corpTaxPbt > 0 ? corpTaxPbt * 0.30 : 0;
  const minimumTax = totalRevenue * 0.01;
  const corpTaxExpected = Math.max(standardTax, minimumTax);
  const corpTaxDifference = corpTaxExpected - corpTaxPerTb;

  if (taxExpenseAccounts.length === 0) {
    obs.push({ type: 'structural', text: 'No income tax expense or current tax account found in TB. Verify whether corporate tax has been accrued. If no accrual exists and the entity is tax-liable, this is a potential omission in the financial statements.' });
    hasStructural = true;
  } else {
    // Acknowledge the actual TB account(s) found - do not treat them as absent
    const found = taxExpenseAccounts.map(a => `${a.accountName}: ${kes(Math.abs(toNum(a.currentYearBalance)))}`).join('; ');
    obs.push({
      type: 'informational',
      text: `Income tax account(s) identified in TB: ${found}. These are the starting point for the tax charge reconciliation - not the computed statutory estimate.`,
    });
  }

  if (taxPayableAccounts.length === 0 && taxExpenseAccounts.length > 0) {
    obs.push({ type: 'structural', text: 'Income tax expense is recognised but no current tax payable account exists in TB. Instalment tax payments (ITX) may have zeroed the payable, or the liability may be embedded within a combined creditors account. Obtain the tax computation and instalment tax payment schedule.' });
    hasStructural = true;
  }

  if (minimumTax > standardTax) {
    obs.push({
      type: 'informational',
      text: `Minimum tax (1% of revenue = ${kes(minimumTax)}) exceeds 30% of computed PBT (${kes(standardTax)}). Kenya minimum tax applies where computed PBT is low or where a loss is recorded. Confirm applicability given any pending High Court challenge to minimum tax provisions.`,
    });
  }

  if (corpTaxPbt < 0) {
    obs.push({
      type: 'informational',
      text: `Entity shows a pre-tax loss of ${kes(Math.abs(corpTaxPbt))} per TB balances. Minimum tax of 1% of revenue (${kes(minimumTax)}) may still apply. Verify that the loss is not a result of misclassification of capital items as operating expenses.`,
    });
  }

  if (deferredTaxAccounts.length > 0) {
    const dtTotal = deferredTaxAccounts.reduce((sum, f) => sum + Math.abs(toNum(f.currentYearBalance)), 0);
    obs.push({
      type: 'informational',
      text: `Deferred tax accounts identified (${kes(dtTotal)}). These represent timing differences between accounting profit and taxable income - they partially explain any gap between estimated current tax liability and the TB tax expense. Full tax computation reconciliation required to quantify the current vs deferred split.`,
    });
  }

  if (corpTaxPerTb > 0 && corpTaxExpected > 0) {
    const effectiveBase = corpTaxPbt > 0 ? corpTaxPbt : totalRevenue;
    const effectiveRate = corpTaxPerTb / effectiveBase;

    if (Math.abs(corpTaxDifference) / corpTaxExpected > 0.05) {
      // Acknowledge both the actual TB value AND the computed estimate - neither overrides the other
      obs.push({
        type: 'analytical',
        text: `Tax charge per TB (${kes(corpTaxPerTb)}) differs from the computed statutory estimate (${kes(corpTaxExpected)}) by ${kes(Math.abs(corpTaxDifference))}. The TB figure is the starting point - the computed estimate is an analytical cross-check only. The reconciliation between them must account for: (a) deferred tax movement (timing differences), (b) capital allowances and wear and tear deductions, (c) tax-exempt income, (d) prior-year tax adjustments, and (e) instalment tax payments. A full tax computation is required before characterising this as an under- or over-provision.`,
      });
      hasAnalytical = true;
    } else {
      obs.push({
        type: 'informational',
        text: `Tax expense per TB (${kes(corpTaxPerTb)}) is broadly consistent with the statutory rate estimate (${kes(corpTaxExpected)}). Confirm against the full tax computation - deferred tax movements and allowances may still cause the final numbers to differ materially.`,
      });
    }

    obs.push({
      type: 'informational',
      text: `Indicative effective tax rate: ${(effectiveRate * 100).toFixed(1)}% of ${corpTaxPbt > 0 ? 'PBT' : 'revenue'}. Statutory rate is 30%. A different effective rate is normal and expected - it must be explained in the tax note to the financial statements per IAS 12.`,
    });
  } else if (corpTaxPerTb === 0 && corpTaxExpected > 0) {
    obs.push({
      type: 'analytical',
      text: `No tax expense found in TB but the statutory estimate is ${kes(corpTaxExpected)}. Possible causes: (a) full tax computation results in a lower or nil liability due to allowances, tax losses, or timing differences; (b) tax accrual is omitted; (c) instalment tax payments have been debited and the liability netted. Obtain the full tax computation before concluding on omission or under-provision.`,
    });
    hasAnalytical = true;
  }

  return { corpTaxPbt, corpTaxExpected, corpTaxPerTb, corpTaxDifference, corpTaxObservations: obs, hasStructural, hasAnalytical };
}

// ── Overall Risk ──────────────────────────────────────────────────────────────

function computeOverallRisk(
  vat: { hasStructural: boolean; hasAnalytical: boolean; vatDifference: number; vatExpectedOutput: number },
  paye: { hasStructural: boolean; hasAnalytical: boolean },
  corp: { hasStructural: boolean; hasAnalytical: boolean; corpTaxDifference: number; corpTaxExpected: number },
): { level: 'low' | 'medium' | 'high'; nature: ItaxReconciliationResult['riskNature'] } {
  const anyStructural = vat.hasStructural || paye.hasStructural || corp.hasStructural;
  const anyAnalytical = vat.hasAnalytical || paye.hasAnalytical || corp.hasAnalytical;

  // Structural gaps are always at least medium regardless of amount
  let analyticalScore = 0;
  if (vat.vatExpectedOutput > 0) {
    const pct = Math.abs(vat.vatDifference) / vat.vatExpectedOutput;
    if (pct > 0.20) analyticalScore += 3;
    else if (pct > 0.05) analyticalScore += 1;
  }
  if (corp.corpTaxExpected > 0) {
    const pct = Math.abs(corp.corpTaxDifference) / corp.corpTaxExpected;
    if (pct > 0.20) analyticalScore += 3;
    else if (pct > 0.05) analyticalScore += 1;
  }

  let level: 'low' | 'medium' | 'high';
  if (anyStructural && analyticalScore >= 3) level = 'high';
  else if (anyStructural || analyticalScore >= 3) level = 'medium';
  else if (anyAnalytical || analyticalScore >= 1) level = 'medium';
  else level = 'low';

  let nature: ItaxReconciliationResult['riskNature'];
  if (anyStructural && anyAnalytical) nature = 'structural_and_analytical';
  else if (anyStructural) nature = 'structural_only';
  else if (anyAnalytical) nature = 'analytical_only';
  else nature = 'none';

  return { level, nature };
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function computeItaxReconciliation(
  financials: ExtractedFinancial[],
  engagementId: string,
  orgId: string,
  taxYear: number,
): ItaxReconciliationResult {
  const vat = computeVat(financials);
  const paye = computePaye(financials);
  const corp = computeCorpTax(financials);
  const risk = computeOverallRisk(vat, paye, corp);

  const payeExpected = paye.payePayrollBase * 0.25;

  const summary = [
    `iTax analytical review for year ${taxYear}.`,
    `Risk nature: ${risk.nature.replace(/_/g, ' ')}.`,
    vat.vatRevenueBase > 0
      ? `VAT: assumed VATable base ${kes(vat.vatRevenueBase)}, estimated output ${kes(vat.vatExpectedOutput)}, TB balance ${kes(vat.vatPerTb)}.`
      : 'VAT: revenue base not determinable from TB classification.',
    paye.payePayrollBase > 0
      ? `PAYE: classified payroll base ${kes(paye.payePayrollBase)}, blended estimate ${kes(payeExpected)}, PAYE per TB ${kes(paye.payePerTb)}.`
      : 'PAYE: payroll base not classifiable from TB alone.',
    corp.corpTaxPbt !== 0
      ? `Corp Tax: PBT ${kes(corp.corpTaxPbt)}, computed liability ${kes(corp.corpTaxExpected)}, TB tax expense ${kes(corp.corpTaxPerTb)}.`
      : 'Corp Tax: insufficient data for full assessment.',
    `All figures are analytical indicators. No liability conclusions should be drawn without reconciliation to iTax returns.`,
  ].join(' ');

  // Flatten tagged observations to string[] for backward compatibility with stored schema
  const flatObs = (tagged: TaggedObservation[]): string[] =>
    tagged.map(o => `[${o.type.toUpperCase()}] ${o.text}`);

  return {
    engagementId,
    orgId,
    taxYear,
    vatRevenueBase: fmt2(vat.vatRevenueBase),
    vatExpectedOutput: fmt2(vat.vatExpectedOutput),
    vatPerTb: fmt2(vat.vatPerTb),
    vatDifference: fmt2(vat.vatDifference),
    vatObservations: flatObs(vat.vatObservations),
    payePayrollBase: fmt2(paye.payePayrollBase),
    payePerTb: fmt2(paye.payePerTb),
    payeDifference: fmt2(paye.payeDifference),
    payeObservations: flatObs(paye.payeObservations),
    corpTaxPbt: fmt2(corp.corpTaxPbt),
    corpTaxExpected: fmt2(corp.corpTaxExpected),
    corpTaxPerTb: fmt2(corp.corpTaxPerTb),
    corpTaxDifference: fmt2(corp.corpTaxDifference),
    corpTaxObservations: flatObs(corp.corpTaxObservations),
    overallRiskLevel: risk.level,
    riskNature: risk.nature,
    summary,
  };
}
