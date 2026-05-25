/**
 * Pure deadline generator - no AI, no external calls, pure date arithmetic.
 * Kenya statutory filing deadlines computed from a financial year-end date.
 */

export interface DeadlineInput {
  engagementId: string;
  orgId: string;
  deadlineType: string;
  label: string;
  authority: string;
  dueDate: Date;
  status: string;
  notes: string | null;
  filedDate: Date | null;
}

/**
 * Returns a new Date set to the nth day of a given month/year.
 * Months are 1-indexed (1 = January).
 */
function dateOn(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Adds `months` calendar months to `date`, returning a new Date.
 * The day is clamped to the last day of the target month, so
 * Mar 31 + 1 month = Apr 30 (not May 1).
 */
function addMonths(date: Date, months: number): Date {
  const absMonth = date.getUTCMonth() + months;
  const year  = date.getUTCFullYear() + Math.floor(absMonth / 12);
  const month = ((absMonth % 12) + 12) % 12; // 0-indexed, always in [0,11]
  // Last day of the target month
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDay);
  return new Date(Date.UTC(year, month, day));
}

/**
 * Given a financial year-end date, generate all standard Kenya statutory
 * filing deadlines. Returned objects are ready to insert into filing_deadlines.
 *
 * Key logic:
 *   - financialYearEnd = last day of the fiscal year (e.g. 31 Dec 2024)
 *   - "month following year-end" = month of (financialYearEnd + 1 month)
 *   - Corporate tax instalments use the TAX YEAR which starts on the 1st day
 *     of the month after financialYearEnd (e.g. 1 Jan 2025 for Dec year-end),
 *     so instalment months are offset from that start date.
 */
export function generateDeadlines(
  financialYearEnd: Date,
  engagementId: string,
  orgId: string,
): DeadlineInput[] {
  const ye = financialYearEnd;
  const yeYear = ye.getUTCFullYear();
  const yeMonth = ye.getUTCMonth() + 1; // 1-indexed

  // Month immediately following year-end (1-indexed)
  const nextMonthDate = addMonths(ye, 1);
  const nm = nextMonthDate.getUTCMonth() + 1;
  const nmYear = nextMonthDate.getUTCFullYear();

  // Tax year starts on the 1st of the month after year-end.
  // Instalment due dates: 20th of 4th, 6th, 9th, 12th month of the tax year.
  const taxYearStart = new Date(Date.UTC(nmYear, nm - 1, 1));

  function taxYearMonthDate(monthOffset: number, day: number): Date {
    const d = addMonths(taxYearStart, monthOffset - 1);
    return dateOn(d.getUTCFullYear(), d.getUTCMonth() + 1, day);
  }

  // Annual Income Tax Return: 6 months after year-end
  const itrDate = addMonths(ye, 6);
  const itrDue = dateOn(itrDate.getUTCFullYear(), itrDate.getUTCMonth() + 1, 30);

  // Annual Return (Companies Registry): ~7 months after year-end (42 days after AGM approximation)
  const annualReturnDate = addMonths(ye, 7);
  const annualReturnDue = dateOn(
    annualReturnDate.getUTCFullYear(),
    annualReturnDate.getUTCMonth() + 1,
    ye.getUTCDate(), // same day-of-month as year-end
  );

  // ICPAK audit completion: 3 months after year-end
  const icpakDate = addMonths(ye, 3);
  const icpakDue = dateOn(
    icpakDate.getUTCFullYear(),
    icpakDate.getUTCMonth() + 1,
    ye.getUTCDate(),
  );

  // Format month name for labels (e.g. "Dec", "Jun")
  const yeMonthShort = ye.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });

  const base = { status: 'pending', notes: null, filedDate: null, engagementId, orgId };

  const deadlines: DeadlineInput[] = [
    // KRA - VAT Return (monthly, for the final month of the year)
    {
      ...base,
      deadlineType: 'vat_return',
      label: `VAT Return (${yeMonthShort})`,
      authority: 'KRA',
      dueDate: dateOn(nmYear, nm, 20),
    },
    // KRA - PAYE Return
    {
      ...base,
      deadlineType: 'paye_return',
      label: `PAYE Return (${yeMonthShort})`,
      authority: 'KRA',
      dueDate: dateOn(nmYear, nm, 9),
    },
    // KRA - NSSF Contribution
    {
      ...base,
      deadlineType: 'nssf_contribution',
      label: 'NSSF Contribution',
      authority: 'KRA',
      dueDate: dateOn(nmYear, nm, 15),
    },
    // KRA - NHIF Contribution
    {
      ...base,
      deadlineType: 'nhif_contribution',
      label: 'NHIF Contribution',
      authority: 'KRA',
      dueDate: dateOn(nmYear, nm, 9),
    },
    // KRA - Corporate Tax Instalment 1 (4th month of tax year)
    {
      ...base,
      deadlineType: 'corp_tax_instalment_1',
      label: 'Corporate Tax Instalment 1',
      authority: 'KRA',
      dueDate: taxYearMonthDate(4, 20),
    },
    // KRA - Corporate Tax Instalment 2 (6th month)
    {
      ...base,
      deadlineType: 'corp_tax_instalment_2',
      label: 'Corporate Tax Instalment 2',
      authority: 'KRA',
      dueDate: taxYearMonthDate(6, 20),
    },
    // KRA - Corporate Tax Instalment 3 (9th month)
    {
      ...base,
      deadlineType: 'corp_tax_instalment_3',
      label: 'Corporate Tax Instalment 3',
      authority: 'KRA',
      dueDate: taxYearMonthDate(9, 20),
    },
    // KRA - Corporate Tax Instalment 4 (12th month)
    {
      ...base,
      deadlineType: 'corp_tax_instalment_4',
      label: 'Corporate Tax Instalment 4',
      authority: 'KRA',
      dueDate: taxYearMonthDate(12, 20),
    },
    // KRA - Annual Income Tax Return
    {
      ...base,
      deadlineType: 'annual_income_tax_return',
      label: 'Annual Income Tax Return (ITR)',
      authority: 'KRA',
      dueDate: itrDue,
    },
    // Companies Registry - Annual Return
    {
      ...base,
      deadlineType: 'annual_return',
      label: 'Annual Return (Companies Act 2015)',
      authority: 'Companies Registry',
      dueDate: annualReturnDue,
    },
    // ICPAK - Audit Completion Target
    {
      ...base,
      deadlineType: 'audit_completion',
      label: 'Audit Completion Target',
      authority: 'ICPAK',
      dueDate: icpakDue,
    },
  ];

  return deadlines;
}
