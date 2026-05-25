/**
 * SYSTEMIC ISSUES REGISTER
 *
 * Detects cross-cutting audit issues that affect multiple working papers.
 * Issues are stored once on the engagement and referenced by all WPs - they
 * must NOT be re-derived independently in each working paper.
 *
 * Each issue carries a wpRef (the WP that *owns* the analysis) and an
 * affectedAreas list (WPs that should cross-reference it).
 */

import type { AnalyticsResult } from './analytics';

export interface SystemicIssue {
  code: string;           // 'TAX_MISMATCH' | 'TB_IMBALANCE' | 'NO_PRIOR_YEAR' etc.
  severity: 'low' | 'medium' | 'high';
  description: string;    // concise factual statement
  wpRef: string;          // e.g. "WP-TAX-001" - the WP that owns this issue
  affectedAreas: string[]; // audit areas that should cross-reference
  crossRefText: string;   // the exact sentence WPs should use
}

const ALL_AREAS = [
  'revenue', 'expenses', 'receivables', 'payables', 'cash_and_bank',
  'fixed_assets', 'payroll', 'tax', 'equity', 'provisions_and_liabilities',
  'inventory', 'investments', 'related_parties', 'going_concern', 'opening_balances',
];

function fmtKes(n: number): string {
  return `KES ${Math.abs(n).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number, dp = 1): string {
  return `${n.toFixed(dp)}%`;
}

export function detectSystemicIssues(
  analytics: AnalyticsResult,
  tbWarnings: string[],
  materialityAmount: number,
): SystemicIssue[] {
  const issues: SystemicIssue[] = [];
  const t = analytics.totals;

  // ── 1. TAX_MISMATCH ─────────────────────────────────────────────────────────
  // Flag when effective CIT rate deviates from Kenya's 30% by more than 5pp.
  if (t.taxExpense > 0 && t.netProfit > 0) {
    const pretaxProfit = t.netProfit + t.taxExpense;
    const effectiveRate = t.taxExpense / pretaxProfit;
    if (Math.abs(effectiveRate - 0.30) > 0.05) {
      const ratePct = effectiveRate * 100;
      issues.push({
        code: 'TAX_MISMATCH',
        severity: 'high',
        description: `Tax expense ${fmtKes(t.taxExpense)} implies effective rate of ${fmtPct(ratePct)} vs Kenya CIT rate of 30%; creates uncertainty over presentation and classification.`,
        wpRef: 'WP-TAX-001',
        affectedAreas: ['tax', 'equity', 'expenses', 'going_concern'],
        crossRefText: `Refer WP-TAX-001: tax expense classification inconsistency (effective rate ${fmtPct(ratePct)} vs 30% CIT)`,
      });
    }
  }

  // ── 2. TB_IMBALANCE ──────────────────────────────────────────────────────────
  // Flag when the trial balance does not balance.
  const imbalanceWarning = tbWarnings.find(w => w.toLowerCase().includes('does not balance'));
  if (imbalanceWarning) {
    // Try to extract a difference amount from the warning text
    const amountMatch = imbalanceWarning.match(/[\d,]+(?:\.\d+)?/g);
    const diffAmount = amountMatch ? amountMatch[amountMatch.length - 1] : 'unknown';
    issues.push({
      code: 'TB_IMBALANCE',
      severity: 'medium',
      description: `Trial balance does not balance; difference of ${diffAmount}. All account balances and derived ratios are unreliable until resolved.`,
      wpRef: 'WP-GEN-000',
      affectedAreas: [...ALL_AREAS],
      crossRefText: 'Refer WP-GEN-000: trial balance does not balance - all figures subject to resolution of TB difference',
    });
  }

  // ── 3. NO_PRIOR_YEAR ─────────────────────────────────────────────────────────
  // Flag when no prior year comparatives are available.
  if (t.totalRevenuePY === 0) {
    issues.push({
      code: 'NO_PRIOR_YEAR',
      severity: 'low',
      description: 'No prior year comparatives available; analytical procedures limited to current year only.',
      wpRef: 'WP-GEN-000',
      affectedAreas: [...ALL_AREAS],
      crossRefText: 'Refer WP-GEN-000: no prior year comparatives - analytical benchmarks are current-year only',
    });
  }

  // ── 4. NEGATIVE_WORKING_CAPITAL ──────────────────────────────────────────────
  if (t.totalCurrentAssets < t.totalCurrentLiabilities) {
    const shortfall = t.totalCurrentLiabilities - t.totalCurrentAssets;
    issues.push({
      code: 'NEGATIVE_WORKING_CAPITAL',
      severity: 'medium',
      description: `Current liabilities exceed current assets by ${fmtKes(shortfall)}; potential working capital pressure indicators.`,
      wpRef: 'WP-GCC-001',
      affectedAreas: ['going_concern', 'payables', 'cash_and_bank'],
      crossRefText: `Refer WP-GCC-001: negative working capital (shortfall ${fmtKes(shortfall)}) - going concern assessment in progress`,
    });
  }

  // ── 5. HIGH_PAYROLL_RATIO ────────────────────────────────────────────────────
  // Flag when payroll exceeds 60% of revenue (tighter than analytics engine's 70% flag).
  if (t.totalRevenueCY > 0) {
    const payrollRatio = analytics.ratios.find(r => r.name === 'Payroll as % of Revenue');
    const payrollPct = payrollRatio?.value;
    if (payrollPct != null && payrollPct > 60) {
      issues.push({
        code: 'HIGH_PAYROLL_RATIO',
        severity: 'medium',
        description: `Payroll represents ${fmtPct(payrollPct)} of revenue - focus area for ghost worker and compliance testing.`,
        wpRef: 'WP-PAY-001',
        affectedAreas: ['payroll', 'expenses'],
        crossRefText: `Refer WP-PAY-001: payroll ${fmtPct(payrollPct)} of revenue - ghost worker and PAYE compliance risk`,
      });
    }
  }

  // ── 6. EQUITY_NO_SOCE ────────────────────────────────────────────────────────
  // Always flag - no SOCE is ever present in a trial balance.
  issues.push({
    code: 'EQUITY_NO_SOCE',
    severity: 'low',
    description: 'No statement of changes in equity provided; share capital movements, dividends, and prior period adjustments cannot be tested from TB alone.',
    wpRef: 'WP-EQU-001',
    affectedAreas: ['equity'],
    crossRefText: 'Refer WP-EQU-001: no SOCE available - equity movements cannot be traced from TB data alone',
  });

  return issues;
}
