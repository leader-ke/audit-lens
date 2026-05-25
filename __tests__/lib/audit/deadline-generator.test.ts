import { describe, it, expect } from 'vitest';
import { generateDeadlines } from '@/lib/audit/deadline-generator';

const ENG_ID = 'eng-test';
const ORG_ID = 'org-test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dec31(year: number) {
  return new Date(Date.UTC(year, 11, 31)); // 31 Dec
}

function jun30(year: number) {
  return new Date(Date.UTC(year, 5, 30)); // 30 Jun
}

function mar31(year: number) {
  return new Date(Date.UTC(year, 2, 31)); // 31 Mar
}

// ─── Count and structure ──────────────────────────────────────────────────────

describe('generateDeadlines - structure', () => {
  it('returns exactly 11 deadlines for a Dec 31 year-end', () => {
    const deadlines = generateDeadlines(dec31(2024), ENG_ID, ORG_ID);
    expect(deadlines).toHaveLength(11);
  });

  it('returns exactly 11 deadlines for a Jun 30 year-end', () => {
    const deadlines = generateDeadlines(jun30(2024), ENG_ID, ORG_ID);
    expect(deadlines).toHaveLength(11);
  });

  it('all deadlines have engagementId and orgId set', () => {
    const deadlines = generateDeadlines(dec31(2024), ENG_ID, ORG_ID);
    for (const d of deadlines) {
      expect(d.engagementId).toBe(ENG_ID);
      expect(d.orgId).toBe(ORG_ID);
    }
  });

  it('all deadlines start with status "pending"', () => {
    const deadlines = generateDeadlines(dec31(2024), ENG_ID, ORG_ID);
    for (const d of deadlines) {
      expect(d.status).toBe('pending');
    }
  });

  it('all deadlines have null filedDate and null notes', () => {
    const deadlines = generateDeadlines(dec31(2024), ENG_ID, ORG_ID);
    for (const d of deadlines) {
      expect(d.filedDate).toBeNull();
      expect(d.notes).toBeNull();
    }
  });

  it('all deadlines have a dueDate that is a valid Date', () => {
    const deadlines = generateDeadlines(dec31(2024), ENG_ID, ORG_ID);
    for (const d of deadlines) {
      expect(d.dueDate).toBeInstanceOf(Date);
      expect(isNaN(d.dueDate.getTime())).toBe(false);
    }
  });

  it('deadline types include all expected Kenya statutory categories', () => {
    const deadlines = generateDeadlines(dec31(2024), ENG_ID, ORG_ID);
    const types = deadlines.map(d => d.deadlineType);
    expect(types).toContain('vat_return');
    expect(types).toContain('paye_return');
    expect(types).toContain('nssf_contribution');
    expect(types).toContain('nhif_contribution');
    expect(types).toContain('corp_tax_instalment_1');
    expect(types).toContain('corp_tax_instalment_2');
    expect(types).toContain('corp_tax_instalment_3');
    expect(types).toContain('corp_tax_instalment_4');
    expect(types).toContain('annual_income_tax_return');
    expect(types).toContain('annual_return');
    expect(types).toContain('audit_completion');
  });
});

// ─── Dec 31 year-end specific dates ──────────────────────────────────────────

describe('generateDeadlines - Dec 31 year-end dates', () => {
  const deadlines = generateDeadlines(dec31(2024), ENG_ID, ORG_ID);
  const byType = Object.fromEntries(deadlines.map(d => [d.deadlineType, d]));

  it('VAT return is 20 Jan 2025 for Dec 31 year-end', () => {
    const d = byType['vat_return'].dueDate;
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(0); // January (0-indexed)
    expect(d.getUTCDate()).toBe(20);
  });

  it('PAYE return is 9 Jan 2025 for Dec 31 year-end', () => {
    const d = byType['paye_return'].dueDate;
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(9);
  });

  it('NSSF contribution is 15 Jan 2025 for Dec 31 year-end', () => {
    const d = byType['nssf_contribution'].dueDate;
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(15);
  });

  it('NHIF contribution is 9 Jan 2025 for Dec 31 year-end', () => {
    const d = byType['nhif_contribution'].dueDate;
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(9);
  });

  it('Annual Income Tax Return is 30 Jun 2025 (6 months after Dec year-end)', () => {
    const d = byType['annual_income_tax_return'].dueDate;
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(5); // June
    expect(d.getUTCDate()).toBe(30);
  });

  it('Corporate Tax Instalment 1 is in the 4th month of tax year (Apr 2025)', () => {
    const d = byType['corp_tax_instalment_1'].dueDate;
    // Tax year starts Jan 2025; 4th month = Apr 2025
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(3); // April
    expect(d.getUTCDate()).toBe(20);
  });

  it('Corporate Tax Instalment 2 is in the 6th month of tax year (Jun 2025)', () => {
    const d = byType['corp_tax_instalment_2'].dueDate;
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(5); // June
    expect(d.getUTCDate()).toBe(20);
  });

  it('Corporate Tax Instalment 3 is in the 9th month of tax year (Sep 2025)', () => {
    const d = byType['corp_tax_instalment_3'].dueDate;
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(8); // September
    expect(d.getUTCDate()).toBe(20);
  });

  it('Corporate Tax Instalment 4 is in the 12th month of tax year (Dec 2025)', () => {
    const d = byType['corp_tax_instalment_4'].dueDate;
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(11); // December
    expect(d.getUTCDate()).toBe(20);
  });

  it('Audit completion target is 3 months after year-end (31 Mar 2025)', () => {
    const d = byType['audit_completion'].dueDate;
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(2); // March
    expect(d.getUTCDate()).toBe(31);
  });
});

// ─── Jun 30 year-end ──────────────────────────────────────────────────────────

describe('generateDeadlines - Jun 30 year-end dates', () => {
  const deadlines = generateDeadlines(jun30(2024), ENG_ID, ORG_ID);
  const byType = Object.fromEntries(deadlines.map(d => [d.deadlineType, d]));

  it('VAT return is 20 Jul 2024 for Jun 30 year-end', () => {
    const d = byType['vat_return'].dueDate;
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(6); // July
    expect(d.getUTCDate()).toBe(20);
  });

  it('Annual ITR is 30 Dec 2024 for Jun 30 year-end (6 months after Jun)', () => {
    const d = byType['annual_income_tax_return'].dueDate;
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(11); // December
    expect(d.getUTCDate()).toBe(30);
  });

  it('Corp Tax Instalment 1 is in Oct 2024 (4th month of tax year starting Jul)', () => {
    const d = byType['corp_tax_instalment_1'].dueDate;
    // Tax year starts Jul 2024; 4th month = Oct 2024
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(9); // October
    expect(d.getUTCDate()).toBe(20);
  });

  it('Corp Tax Instalment 4 is in Jun 2025 (12th month of tax year)', () => {
    const d = byType['corp_tax_instalment_4'].dueDate;
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(5); // June
    expect(d.getUTCDate()).toBe(20);
  });
});

// ─── Mar 31 year-end ─────────────────────────────────────────────────────────

describe('generateDeadlines - Mar 31 year-end dates', () => {
  const deadlines = generateDeadlines(mar31(2025), ENG_ID, ORG_ID);
  const byType = Object.fromEntries(deadlines.map(d => [d.deadlineType, d]));

  it('VAT return is 20 Apr 2025 for Mar 31 year-end', () => {
    const d = byType['vat_return'].dueDate;
    expect(d.getUTCMonth()).toBe(3); // April
    expect(d.getUTCDate()).toBe(20);
  });

  it('Annual ITR is 30 Sep 2025 (6 months after Mar year-end)', () => {
    const d = byType['annual_income_tax_return'].dueDate;
    expect(d.getUTCMonth()).toBe(8); // September
    expect(d.getUTCDate()).toBe(30);
  });
});

// ─── Labels ───────────────────────────────────────────────────────────────────

describe('generateDeadlines - labels', () => {
  it('VAT return label includes the month short name', () => {
    const deadlines = generateDeadlines(dec31(2024), ENG_ID, ORG_ID);
    const vat = deadlines.find(d => d.deadlineType === 'vat_return');
    expect(vat?.label).toMatch(/Dec/);
  });

  it('all deadlines have a non-empty label', () => {
    const deadlines = generateDeadlines(dec31(2024), ENG_ID, ORG_ID);
    for (const d of deadlines) {
      expect(d.label).toBeTruthy();
      expect(d.label.length).toBeGreaterThan(3);
    }
  });

  it('all deadlines have a recognised authority', () => {
    const deadlines = generateDeadlines(dec31(2024), ENG_ID, ORG_ID);
    const validAuthorities = ['KRA', 'Companies Registry', 'ICPAK'];
    for (const d of deadlines) {
      expect(validAuthorities).toContain(d.authority);
    }
  });
});
