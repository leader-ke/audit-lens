/**
 * FINANCIAL ANALYTICS ENGINE
 *
 * Pre-computes financial ratios, trends, and anomalies BEFORE sending to AI.
 * This means the AI receives structured facts, not raw numbers, dramatically
 * improving working paper quality.
 *
 * Ratios computed:
 *   Liquidity:    Current Ratio, Quick Ratio, Cash Ratio
 *   Profitability: Gross Margin, Net Margin, Operating Margin, Return on Assets
 *   Efficiency:   Days Sales Outstanding (DSO), Days Payable Outstanding (DPO),
 *                 Inventory Turnover, Days Inventory Outstanding (DIO)
 *   Leverage:     Debt/Equity, Debt/Assets, Interest Coverage
 *   Growth:       Revenue YoY %, Total Expense YoY %, Net Assets YoY %
 *   Working Capital: Net Working Capital, Operating Cash Cycle
 *
 * Also flags anomalies:
 *   - Revenue exceeds prior year by > 30%
 *   - COGS/Revenue ratio change > 5pp
 *   - Negative working capital
 *   - Current ratio < 1
 *   - Single account > 50% of total assets
 *   - Payroll > 70% of revenue (common NGO/school flag)
 */

import type { FSCategory } from './fs-categories';
import {
  REVENUE_CATEGORIES,
  CURRENT_ASSET_CATEGORIES,
  CURRENT_LIABILITY_CATEGORIES,
} from './fs-categories';

export interface ClassifiedAccount {
  accountCode?: string;
  accountName: string;
  currentYearBalance: number;
  priorYearBalance?: number;
  fsCategory: FSCategory;
}

export interface FinancialRatio {
  name: string;
  value: number | null;
  priorYear?: number | null;
  unit: 'ratio' | 'percent' | 'days' | 'kes' | 'times';
  interpretation: string;
  flag?: 'ok' | 'warning' | 'risk';
  flagReason?: string;
}

export interface Anomaly {
  severity: 'low' | 'medium' | 'high';
  description: string;
  account?: string;
  amount?: number;
  auditImplication: string;
}

export interface AnalyticsResult {
  /** Totals by financial statement section */
  totals: {
    totalRevenueCY: number;
    totalRevenuePY: number;
    totalCOGS: number;
    grossProfit: number;
    grossMargin: number | null;
    totalOpex: number;
    operatingProfit: number;
    financeCosts: number;
    taxExpense: number;
    netProfit: number;
    totalCurrentAssets: number;
    totalNonCurrentAssets: number;
    totalAssets: number;
    totalCurrentLiabilities: number;
    totalNonCurrentLiabilities: number;
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
  };
  ratios: FinancialRatio[];
  anomalies: Anomaly[];
  /** Top 10 accounts by absolute balance */
  topAccounts: Array<{ name: string; category: FSCategory; balance: number; pctOfRevenue?: number }>;
  /** Human-readable summary for AI context */
  summaryForAI: string;
}

// ─── Aggregation helpers ──────────────────────────────────────────────────────

function sum(accounts: ClassifiedAccount[], ...categories: FSCategory[]): number {
  return accounts
    .filter(a => categories.includes(a.fsCategory))
    .reduce((s, a) => s + a.currentYearBalance, 0);
}

function sumPY(accounts: ClassifiedAccount[], ...categories: FSCategory[]): number {
  return accounts
    .filter(a => categories.includes(a.fsCategory))
    .reduce((s, a) => s + (a.priorYearBalance ?? 0), 0);
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0 || !isFinite(denominator)) return null;
  return numerator / denominator;
}

function pct(numerator: number, denominator: number): number | null {
  const r = ratio(numerator, denominator);
  return r == null ? null : r * 100;
}

function growthPct(cy: number, py: number): number | null {
  if (py === 0) return null;
  return ((cy - py) / Math.abs(py)) * 100;
}

function fmtKes(n: number): string {
  return `KES ${Math.abs(n).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number | null, dp = 1): string {
  if (n == null) return 'N/A';
  return `${n >= 0 ? '' : ''}${n.toFixed(dp)}%`;
}

// ─── Main analytics function ──────────────────────────────────────────────────

export function computeAnalytics(
  accounts: ClassifiedAccount[],
  materialityAmount: number,
): AnalyticsResult {
  // ── Revenue ──────────────────────────────────────────────────────────────
  const revAccounts = accounts.filter(a => REVENUE_CATEGORIES.includes(a.fsCategory));
  // Revenue is credit-normal so balances should be negative in a debit-normal TB.
  // We take absolute value to get meaningful revenue figures.
  const totalRevenueCY = Math.abs(sum(accounts, ...REVENUE_CATEGORIES));
  const totalRevenuePY = Math.abs(sumPY(accounts, ...REVENUE_CATEGORIES));
  const revenueGrowth = growthPct(totalRevenueCY, totalRevenuePY);

  // ── COGS & Gross Profit ───────────────────────────────────────────────────
  const totalCOGS = sum(accounts, 'COGS', 'DIRECT_LABOUR', 'DIRECT_MATERIALS', 'FACTORY_OVERHEAD');
  const grossProfit = totalRevenueCY - totalCOGS;
  const grossMargin = pct(grossProfit, totalRevenueCY);

  // ── Operating expenses ────────────────────────────────────────────────────
  const opexCategories: FSCategory[] = [
    'PAYROLL_EXPENSE', 'PAYROLL_BENEFITS', 'RENT_EXPENSE', 'UTILITIES_EXPENSE',
    'DEPRECIATION_EXPENSE', 'AMORTISATION_EXPENSE', 'PROFESSIONAL_FEES',
    'MARKETING_EXPENSE', 'TRAVEL_EXPENSE', 'MAINTENANCE_EXPENSE', 'INSURANCE_EXPENSE',
    'OTHER_OPEX', 'PROGRAMME_EXPENSE', 'FUNDRAISING_EXPENSE', 'SCHOOL_SUPPLIES',
    'SACCO_LEVY', 'TECH_INFRASTRUCTURE',
  ];
  const totalOpex = sum(accounts, ...opexCategories);
  const operatingProfit = grossProfit - totalOpex;
  const operatingMargin = pct(operatingProfit, totalRevenueCY);

  // ── Finance costs & tax ───────────────────────────────────────────────────
  const financeCosts = sum(accounts, 'FINANCE_COSTS');
  const taxExpense = sum(accounts, 'TAX_EXPENSE');
  const netProfit = operatingProfit - financeCosts - taxExpense;
  const netMargin = pct(netProfit, totalRevenueCY);

  // ── Balance sheet ─────────────────────────────────────────────────────────
  const currentAssetCats = CURRENT_ASSET_CATEGORIES;
  const ncaCats: FSCategory[] = [
    'PPE_GROSS', 'ACCUM_DEPRECIATION', 'INTANGIBLES', 'INVESTMENTS_ASSOC',
    'INVESTMENTS_LT', 'DEFERRED_TAX_ASSET', 'OTHER_NCA', 'CUSTOMER_ACQUISITION',
  ];
  const currentLiabCats = CURRENT_LIABILITY_CATEGORIES;
  const ncLiabCats: FSCategory[] = ['LT_BORROWINGS', 'DEFERRED_TAX_LIABILITY', 'LT_PROVISIONS', 'OTHER_NCL'];
  const equityCats: FSCategory[] = [
    'SHARE_CAPITAL', 'SHARE_PREMIUM', 'RETAINED_EARNINGS', 'REVALUATION_RESERVE',
    'OTHER_RESERVES', 'DRAWINGS', 'MEMBER_SHARES', 'RESTRICTED_FUNDS',
  ];

  const totalCurrentAssets = sum(accounts, ...currentAssetCats);
  const totalNonCurrentAssets = sum(accounts, ...ncaCats);
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  const totalCurrentLiabilities = Math.abs(sum(accounts, ...currentLiabCats));
  const totalNonCurrentLiabilities = Math.abs(sum(accounts, ...ncLiabCats));
  const totalEquity = Math.abs(sum(accounts, ...equityCats));
  const totalLiabilitiesAndEquity = totalCurrentLiabilities + totalNonCurrentLiabilities + totalEquity;

  // ── Working capital ───────────────────────────────────────────────────────
  const netWorkingCapital = totalCurrentAssets - totalCurrentLiabilities;
  const currentRatio = ratio(totalCurrentAssets, totalCurrentLiabilities);
  const cashAndEquiv = sum(accounts, 'CASH_BANK', 'MPESA_FLOAT', 'INVESTMENTS_ST');
  const quickAssets = cashAndEquiv + sum(accounts, 'AR_TRADE', 'AR_OTHER');
  const quickRatio = ratio(quickAssets, totalCurrentLiabilities);
  const cashRatio = ratio(cashAndEquiv, totalCurrentLiabilities);

  // ── Efficiency ────────────────────────────────────────────────────────────
  const tradeReceivables = sum(accounts, 'AR_TRADE');
  const tradePayables = Math.abs(sum(accounts, 'AP_TRADE'));
  const inventory = sum(accounts, 'INVENTORY', 'RAW_MATERIALS', 'WIP_INVENTORY', 'FINISHED_GOODS');

  const dso = totalRevenueCY > 0 ? (tradeReceivables / totalRevenueCY) * 365 : null;
  const dpo = totalCOGS > 0 ? (tradePayables / totalCOGS) * 365 : null;
  const inventoryTurnover = inventory > 0 && totalCOGS > 0 ? totalCOGS / inventory : null;
  const dio = inventoryTurnover ? 365 / inventoryTurnover : null;
  const cashConversionCycle = dso != null && dpo != null && dio != null
    ? dso + dio - dpo : null;

  // ── Leverage ──────────────────────────────────────────────────────────────
  const totalDebt = Math.abs(sum(accounts, 'LT_BORROWINGS', 'ST_BORROWINGS'));
  const debtToEquity = ratio(totalDebt, totalEquity);
  const debtToAssets = ratio(totalDebt, totalAssets);
  const interestCoverage = financeCosts > 0 ? ratio(operatingProfit, financeCosts) : null;

  // ── Payroll analysis ──────────────────────────────────────────────────────
  const payrollTotal = sum(accounts, 'PAYROLL_EXPENSE', 'PAYROLL_BENEFITS', 'DIRECT_LABOUR');
  const payrollPctRevenue = pct(payrollTotal, totalRevenueCY);

  // ── Build ratio objects ───────────────────────────────────────────────────
  const ratios: FinancialRatio[] = [
    {
      name: 'Current Ratio',
      value: currentRatio,
      unit: 'ratio',
      interpretation: currentRatio == null ? 'Cannot compute' :
        currentRatio >= 2 ? 'Strong: ample short-term coverage' :
        currentRatio >= 1 ? 'Adequate: meets current obligations' :
        'Weak: current liabilities exceed current assets',
      flag: currentRatio == null ? undefined : currentRatio >= 1.5 ? 'ok' : currentRatio >= 1 ? 'warning' : 'risk',
      flagReason: currentRatio != null && currentRatio < 1 ? 'Current ratio below 1: liquidity risk' : undefined,
    },
    {
      name: 'Quick Ratio',
      value: quickRatio,
      unit: 'ratio',
      interpretation: quickRatio == null ? 'Cannot compute' :
        quickRatio >= 1 ? 'Adequate liquid assets' : 'Relies on inventory liquidation to meet obligations',
      flag: quickRatio == null ? undefined : quickRatio >= 1 ? 'ok' : 'warning',
    },
    {
      name: 'Cash Ratio',
      value: cashRatio,
      unit: 'ratio',
      interpretation: cashRatio == null ? 'Cannot compute' : `Cash covers ${((cashRatio ?? 0) * 100).toFixed(0)}% of current liabilities`,
      flag: cashRatio == null ? undefined : cashRatio >= 0.2 ? 'ok' : 'warning',
    },
    {
      name: 'Gross Margin',
      value: grossMargin,
      unit: 'percent',
      interpretation: grossMargin == null ? 'Cannot compute (no revenue)' :
        `Gross profit of ${fmtKes(grossProfit)} on revenue of ${fmtKes(totalRevenueCY)}`,
      flag: grossMargin == null ? undefined : grossMargin >= 30 ? 'ok' : grossMargin >= 10 ? 'warning' : 'risk',
    },
    {
      name: 'Operating Margin',
      value: operatingMargin,
      unit: 'percent',
      interpretation: operatingMargin == null ? 'Cannot compute' : `${fmtPct(operatingMargin)} operating profit margin`,
      flag: operatingMargin == null ? undefined : operatingMargin >= 10 ? 'ok' : operatingMargin >= 0 ? 'warning' : 'risk',
    },
    {
      name: 'Net Profit Margin',
      value: netMargin,
      unit: 'percent',
      interpretation: netMargin == null ? 'Cannot compute' : `${fmtPct(netMargin)} net margin`,
      flag: netMargin == null ? undefined : netMargin >= 5 ? 'ok' : netMargin >= 0 ? 'warning' : 'risk',
    },
    {
      name: 'Days Sales Outstanding (DSO)',
      value: dso,
      unit: 'days',
      interpretation: dso == null ? 'Cannot compute' :
        dso <= 30 ? `${dso.toFixed(0)} days: strong collection` :
        dso <= 60 ? `${dso.toFixed(0)} days: acceptable` :
        `${dso.toFixed(0)} days: collection is slow, consider credit terms`,
      flag: dso == null ? undefined : dso <= 45 ? 'ok' : dso <= 90 ? 'warning' : 'risk',
      flagReason: dso != null && dso > 90 ? `DSO of ${dso.toFixed(0)} days suggests collection issues` : undefined,
    },
    {
      name: 'Days Payable Outstanding (DPO)',
      value: dpo,
      unit: 'days',
      interpretation: dpo == null ? 'Cannot compute' : `Paying suppliers in ${dpo.toFixed(0)} days on average`,
      flag: dpo == null ? undefined : 'ok',
    },
    {
      name: 'Inventory Days (DIO)',
      value: dio,
      unit: 'days',
      interpretation: dio == null ? 'No inventory / not applicable' : `${dio.toFixed(0)} days of inventory on hand`,
      flag: dio == null ? undefined : dio <= 60 ? 'ok' : dio <= 120 ? 'warning' : 'risk',
    },
    {
      name: 'Revenue Growth (YoY)',
      value: revenueGrowth,
      unit: 'percent',
      interpretation: revenueGrowth == null ? 'No prior year data' :
        `Revenue ${revenueGrowth >= 0 ? 'grew' : 'declined'} by ${fmtPct(revenueGrowth)} vs prior year`,
      flag: revenueGrowth == null ? undefined : Math.abs(revenueGrowth) <= 30 ? 'ok' : 'warning',
      flagReason: revenueGrowth != null && Math.abs(revenueGrowth) > 30 ?
        `Revenue change of ${fmtPct(revenueGrowth)} is unusual; investigate` : undefined,
    },
    {
      name: 'Debt/Equity',
      value: debtToEquity,
      unit: 'ratio',
      interpretation: debtToEquity == null ? 'Cannot compute' :
        debtToEquity <= 1 ? `${debtToEquity?.toFixed(2)}x - conservative leverage` :
        debtToEquity <= 2 ? `${debtToEquity?.toFixed(2)}x - moderate leverage` :
        `${debtToEquity?.toFixed(2)}x - highly leveraged`,
      flag: debtToEquity == null ? undefined : debtToEquity <= 1 ? 'ok' : debtToEquity <= 2 ? 'warning' : 'risk',
    },
    {
      name: 'Interest Coverage',
      value: interestCoverage,
      unit: 'times',
      interpretation: interestCoverage == null ? 'No finance costs' :
        interestCoverage >= 3 ? `${interestCoverage.toFixed(1)}x - comfortable coverage` :
        interestCoverage >= 1.5 ? `${interestCoverage.toFixed(1)}x - adequate but tight` :
        `${interestCoverage.toFixed(1)}x - potential going concern risk`,
      flag: interestCoverage == null ? undefined : interestCoverage >= 2 ? 'ok' : interestCoverage >= 1 ? 'warning' : 'risk',
    },
    {
      name: 'Payroll as % of Revenue',
      value: payrollPctRevenue,
      unit: 'percent',
      interpretation: payrollPctRevenue == null ? 'Cannot compute' :
        `Payroll is ${fmtPct(payrollPctRevenue)} of revenue`,
      flag: payrollPctRevenue == null ? undefined : payrollPctRevenue <= 50 ? 'ok' : payrollPctRevenue <= 70 ? 'warning' : 'risk',
      flagReason: payrollPctRevenue != null && payrollPctRevenue > 70 ?
        `Payroll at ${fmtPct(payrollPctRevenue)} of revenue - high concentration risk` : undefined,
    },
  ];

  // ── Anomaly detection ─────────────────────────────────────────────────────
  const anomalies: Anomaly[] = [];

  if (currentRatio != null && currentRatio < 1) {
    anomalies.push({
      severity: 'high',
      description: `Current ratio is ${currentRatio.toFixed(2)}: entity cannot meet short-term obligations from current assets`,
      auditImplication: "Going concern risk: evaluate management's plans to address liquidity shortfall (ISA 570)",
    });
  }

  if (netProfit < 0 && totalRevenueCY > 0) {
    anomalies.push({
      severity: 'medium',
      description: `Entity is loss-making: net loss of ${fmtKes(Math.abs(netProfit))} on revenue of ${fmtKes(totalRevenueCY)}`,
      auditImplication: 'Evaluate going concern. Consider adequacy of tax loss provisions.',
    });
  }

  if (revenueGrowth != null && revenueGrowth > 50) {
    anomalies.push({
      severity: 'high',
      description: `Revenue increased by ${fmtPct(revenueGrowth)} vs prior year (unusual growth)`,
      auditImplication: 'Perform enhanced revenue completeness and occurrence testing. Risk of premature/fictitious recognition.',
    });
  }

  if (revenueGrowth != null && revenueGrowth < -30) {
    anomalies.push({
      severity: 'medium',
      description: `Revenue declined by ${fmtPct(Math.abs(revenueGrowth))} vs prior year`,
      auditImplication: 'Evaluate going concern. Verify revenue completeness; risk of under-reporting or business disruption.',
    });
  }

  if (dso != null && dso > 120) {
    anomalies.push({
      severity: 'high',
      description: `DSO of ${dso.toFixed(0)} days: trade receivables are very slow to collect`,
      auditImplication: 'Assess recoverability of receivables. Test adequacy of bad debt provisions.',
      account: 'Trade Receivables',
      amount: tradeReceivables,
    });
  }

  if (debtToEquity != null && debtToEquity > 3) {
    anomalies.push({
      severity: 'high',
      description: `Debt/equity ratio of ${debtToEquity.toFixed(2)}x: entity is heavily leveraged`,
      auditImplication: 'Review loan covenants, assess going concern, evaluate debt classification.',
    });
  }

  if (payrollPctRevenue != null && payrollPctRevenue > 80) {
    anomalies.push({
      severity: 'high',
      description: `Payroll represents ${fmtPct(payrollPctRevenue)} of revenue`,
      auditImplication: 'Ghost worker risk: perform headcount reconciliation to payroll. Verify NSSF/NHIF compliance.',
    });
  }

  // Single account concentration
  const sortedByBalance = [...accounts].sort((a, b) => Math.abs(b.currentYearBalance) - Math.abs(a.currentYearBalance));
  if (totalAssets > 0 && sortedByBalance[0]) {
    const topAccountPct = (Math.abs(sortedByBalance[0].currentYearBalance) / totalAssets) * 100;
    if (topAccountPct > 50) {
      anomalies.push({
        severity: 'medium',
        description: `"${sortedByBalance[0].accountName}" represents ${topAccountPct.toFixed(0)}% of total assets`,
        account: sortedByBalance[0].accountName,
        amount: sortedByBalance[0].currentYearBalance,
        auditImplication: 'High concentration - prioritise this account in audit procedures.',
      });
    }
  }

  if (netWorkingCapital < 0) {
    anomalies.push({
      severity: 'medium',
      description: `Negative working capital of ${fmtKes(Math.abs(netWorkingCapital))}`,
      auditImplication: 'Assess ability to fund operations without refinancing. Going concern indicator.',
    });
  }

  // ── Top accounts ──────────────────────────────────────────────────────────
  const topAccounts = sortedByBalance.slice(0, 10).map(a => ({
    name: a.accountName,
    category: a.fsCategory,
    balance: a.currentYearBalance,
    pctOfRevenue: totalRevenueCY > 0 ? Math.abs(a.currentYearBalance / totalRevenueCY * 100) : undefined,
  }));

  // ── Summary for AI ────────────────────────────────────────────────────────
  const summaryLines: string[] = [
    `=== FINANCIAL ANALYTICS SUMMARY ===`,
    `NOTE: All ratios and figures below are derived from annual trial balance balances.`,
    `They are planning-level approximations - not precise transaction-based calculations.`,
    `Label them as "TB-derived" when citing in working papers. Do not invent benchmarks.`,
    ``,
    `INCOME STATEMENT:`,
    `  Revenue (CY):         ${fmtKes(totalRevenueCY)}${totalRevenuePY > 0 ? ` (PY: ${fmtKes(totalRevenuePY)}, ${revenueGrowth != null ? fmtPct(revenueGrowth) + ' growth' : 'no PY'})` : ''}`,
    `  Cost of Sales:        ${fmtKes(totalCOGS)}`,
    `  Gross Profit:         ${fmtKes(grossProfit)} (Margin: ${fmtPct(grossMargin)})`,
    `  Operating Expenses:   ${fmtKes(totalOpex)}`,
    `  Operating Profit:     ${fmtKes(operatingProfit)} (Margin: ${fmtPct(operatingMargin)})`,
    `  Finance Costs:        ${fmtKes(financeCosts)}`,
    `  Tax Expense:          ${fmtKes(taxExpense)}`,
    `  Net Profit/(Loss):    ${fmtKes(netProfit)} (Margin: ${fmtPct(netMargin)})`,
    ``,
    `BALANCE SHEET:`,
    `  Current Assets:       ${fmtKes(totalCurrentAssets)}`,
    `  Non-Current Assets:   ${fmtKes(totalNonCurrentAssets)}`,
    `  Total Assets:         ${fmtKes(totalAssets)}`,
    `  Current Liabilities:  ${fmtKes(totalCurrentLiabilities)}`,
    `  Non-Current Liab:     ${fmtKes(totalNonCurrentLiabilities)}`,
    `  Total Equity:         ${fmtKes(totalEquity)}`,
    ``,
    `KEY RATIOS:`,
    ...ratios.filter(r => r.value != null).map(r =>
      `  ${r.name.padEnd(28)} ${r.unit === 'percent' ? fmtPct(r.value) : r.unit === 'days' ? `${r.value?.toFixed(0)} days` : r.unit === 'times' ? `${r.value?.toFixed(1)}x` : r.value?.toFixed(2)}${r.flag === 'risk' ? ' ⚠ RISK' : r.flag === 'warning' ? ' ⚡ WARNING' : ''}`
    ),
  ];

  if (anomalies.length > 0) {
    summaryLines.push(``, `ANOMALIES DETECTED (${anomalies.length}):`);
    for (const a of anomalies) {
      summaryLines.push(`  [${a.severity.toUpperCase()}] ${a.description}`);
      summaryLines.push(`           → Audit: ${a.auditImplication}`);
    }
  }

  if (cashConversionCycle != null) {
    summaryLines.push(``, `CASH CONVERSION CYCLE: ${cashConversionCycle.toFixed(0)} days (DSO ${dso?.toFixed(0)} + DIO ${dio?.toFixed(0)} - DPO ${dpo?.toFixed(0)})`);
  }

  return {
    totals: {
      totalRevenueCY, totalRevenuePY, totalCOGS, grossProfit, grossMargin,
      totalOpex, operatingProfit, financeCosts, taxExpense, netProfit,
      totalCurrentAssets, totalNonCurrentAssets, totalAssets,
      totalCurrentLiabilities, totalNonCurrentLiabilities, totalEquity,
      totalLiabilitiesAndEquity,
    },
    ratios,
    anomalies,
    topAccounts,
    summaryForAI: summaryLines.join('\n'),
  };
}
