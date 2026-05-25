/**
 * FINANCIAL STATEMENT CATEGORIES
 *
 * Canonical classification of every account line into its financial statement
 * position. This is the target vocabulary that all matching layers resolve to.
 *
 * Structure mirrors IFRS presentation order (IAS 1):
 *   Balance Sheet: NCA → CA → Equity → NCL → CL
 *   P&L: Revenue → COGS → Gross Profit → Opex → EBIT → Finance → PBT → Tax → PAT
 */

import type { AuditArea } from './isa-standards';

// ─── Canonical categories ──────────────────────────────────────────────────────

export type FSCategory =
  // ── Balance Sheet: Non-Current Assets ──
  | 'PPE_GROSS'               // Property, plant & equipment - at cost
  | 'ACCUM_DEPRECIATION'      // Accumulated depreciation (contra-asset, negative)
  | 'INTANGIBLES'             // Goodwill, software, licences
  | 'INVESTMENTS_ASSOC'       // Investments in associates / subsidiaries
  | 'INVESTMENTS_LT'          // Long-term financial investments
  | 'DEFERRED_TAX_ASSET'      // Deferred tax asset
  | 'OTHER_NCA'               // Other non-current assets
  // ── Balance Sheet: Current Assets ──
  | 'INVENTORY'               // Stock, raw materials, WIP, finished goods
  | 'AR_TRADE'                // Trade receivables / debtors
  | 'AR_OTHER'                // Other receivables
  | 'PREPAYMENTS'             // Prepayments and deposits
  | 'TAX_RECOVERABLE'         // Tax recoverable / refund due
  | 'CASH_BANK'               // Cash at bank and in hand
  | 'MPESA_FLOAT'             // M-Pesa float / mobile wallet (Kenya-specific)
  | 'INVESTMENTS_ST'          // Short-term investments / treasury bills
  | 'OTHER_CA'                // Other current assets
  // ── Balance Sheet: Equity ──
  | 'SHARE_CAPITAL'           // Ordinary shares / paid-up capital
  | 'SHARE_PREMIUM'           // Share premium
  | 'RETAINED_EARNINGS'       // Retained earnings / accumulated surplus
  | 'REVALUATION_RESERVE'     // Asset revaluation reserve
  | 'OTHER_RESERVES'          // Capital reserve, statutory reserve
  | 'DRAWINGS'                // Owner drawings (sole trader / partnership)
  // ── Balance Sheet: Non-Current Liabilities ──
  | 'LT_BORROWINGS'           // Long-term bank loans, bonds
  | 'DEFERRED_TAX_LIABILITY'  // Deferred tax liability
  | 'LT_PROVISIONS'           // Long-term provisions (e.g., leave pay, warranty)
  | 'OTHER_NCL'               // Other non-current liabilities
  // ── Balance Sheet: Current Liabilities ──
  | 'AP_TRADE'                // Trade payables / creditors
  | 'AP_OTHER'                // Other payables
  | 'ACCRUALS'                // Accrued expenses
  | 'DEFERRED_REVENUE'        // Unearned income / deferred revenue
  | 'ST_BORROWINGS'           // Short-term borrowings / overdraft
  | 'TAX_PAYABLE'             // Corporate tax payable
  | 'VAT_PAYABLE'             // VAT payable / output VAT net
  | 'PAYE_PAYABLE'            // PAYE payable
  | 'NSSF_NHIF_PAYABLE'       // NSSF / NHIF / SHIF payable
  | 'DIVIDEND_PAYABLE'        // Dividend payable
  | 'RELATED_PARTY_PAYABLE'   // Due to related parties
  | 'OTHER_CL'                // Other current liabilities
  // ── P&L: Revenue ──
  | 'REVENUE_SALES'           // Product / goods sales
  | 'REVENUE_SERVICES'        // Service / professional fees revenue
  | 'REVENUE_RENTAL'          // Rental / property income
  | 'REVENUE_INTEREST'        // Interest income
  | 'REVENUE_GRANTS'          // Donor grants / government grants
  | 'REVENUE_DONATIONS'       // Donations received
  | 'REVENUE_OTHER'           // Other income
  // ── P&L: Cost of Sales ──
  | 'COGS'                    // Cost of goods sold / direct costs
  | 'DIRECT_LABOUR'           // Direct labour (manufacturing)
  | 'DIRECT_MATERIALS'        // Direct materials (manufacturing)
  // ── P&L: Operating Expenses ──
  | 'PAYROLL_EXPENSE'         // Salaries, wages, staff costs
  | 'PAYROLL_BENEFITS'        // Pension, NSSF, medical, housing allowance
  | 'RENT_EXPENSE'            // Rent and lease expense
  | 'UTILITIES_EXPENSE'       // Water, electricity, internet
  | 'DEPRECIATION_EXPENSE'    // Depreciation charge
  | 'AMORTISATION_EXPENSE'    // Amortisation charge
  | 'PROFESSIONAL_FEES'       // Audit, legal, consultancy
  | 'MARKETING_EXPENSE'       // Advertising, promotion, marketing
  | 'TRAVEL_EXPENSE'          // Travel, accommodation, per diem
  | 'MAINTENANCE_EXPENSE'     // Repairs and maintenance
  | 'INSURANCE_EXPENSE'       // Insurance premiums
  | 'FINANCE_COSTS'           // Interest expense, bank charges
  | 'TAX_EXPENSE'             // Income tax expense
  | 'OTHER_OPEX'              // Other operating expenses
  // ── SACCO-specific ──
  | 'MEMBER_SHARES'           // Member share capital (SACCO)
  | 'MEMBER_DEPOSITS'         // Member savings deposits (SACCO)
  | 'LOANS_TO_MEMBERS'        // Loans & advances to members (SACCO)
  | 'INTEREST_INCOME_LOANS'   // Interest on loans to members (SACCO)
  | 'SACCO_LEVY'              // SASRA levy / regulatory fee (SACCO)
  | 'DIVIDENDS_INTEREST_REBATE' // Dividends on shares / interest rebate (SACCO)
  // ── NGO-specific ──
  | 'DONOR_FUNDS'             // Donor funds received
  | 'RESTRICTED_FUNDS'        // Restricted funds / designated reserves
  | 'PROGRAMME_EXPENSE'       // Programme / project expenditure (NGO)
  | 'FUNDRAISING_EXPENSE'     // Fundraising costs (NGO)
  // ── School-specific ──
  | 'SCHOOL_FEES'             // Tuition / school fees income
  | 'BOARDING_INCOME'         // Boarding / hostel income
  | 'CAPITATION_GRANT'        // Government capitation grants
  | 'SCHOOL_SUPPLIES'         // School supplies / consumables
  // ── Manufacturing-specific ──
  | 'RAW_MATERIALS'           // Raw materials inventory
  | 'WIP_INVENTORY'           // Work-in-progress
  | 'FINISHED_GOODS'          // Finished goods inventory
  | 'FACTORY_OVERHEAD'        // Factory overhead / absorption
  // ── SaaS/Tech-specific ──
  | 'SUBSCRIPTION_REVENUE'    // SaaS subscription revenue (MRR/ARR)
  | 'TECH_INFRASTRUCTURE'     // Server / hosting / cloud costs
  | 'CUSTOMER_ACQUISITION'    // Customer acquisition cost (capitalised)
  // ── Unresolved ──
  | 'UNKNOWN';                // Could not classify - needs human review

// ─── Category metadata ────────────────────────────────────────────────────────

export interface FSCategoryMeta {
  category: FSCategory;
  label: string;
  statement: 'BS' | 'PL';      // Balance Sheet or P&L
  bsSection?: 'NCA' | 'CA' | 'EQUITY' | 'NCL' | 'CL';  // BS section
  plSection?: 'REVENUE' | 'COGS' | 'OPEX' | 'FINANCE' | 'TAX';  // P&L section
  normalBalance: 'DEBIT' | 'CREDIT';  // Expected normal balance
  auditArea: import('./isa-standards').AuditArea;  // Maps to working paper
  isContra?: boolean;            // e.g. accumulated depreciation
  isMaterialityRelevant?: boolean;  // High-value accounts for materiality calc
}

export const FS_CATEGORY_META: Record<FSCategory, FSCategoryMeta> = {
  PPE_GROSS:           { category: 'PPE_GROSS', label: 'Property, Plant & Equipment (Cost)', statement: 'BS', bsSection: 'NCA', normalBalance: 'DEBIT', auditArea: 'fixed_assets', isMaterialityRelevant: true },
  ACCUM_DEPRECIATION:  { category: 'ACCUM_DEPRECIATION', label: 'Accumulated Depreciation', statement: 'BS', bsSection: 'NCA', normalBalance: 'CREDIT', auditArea: 'fixed_assets', isContra: true },
  INTANGIBLES:         { category: 'INTANGIBLES', label: 'Intangible Assets', statement: 'BS', bsSection: 'NCA', normalBalance: 'DEBIT', auditArea: 'fixed_assets' },
  INVESTMENTS_ASSOC:   { category: 'INVESTMENTS_ASSOC', label: 'Investments in Associates', statement: 'BS', bsSection: 'NCA', normalBalance: 'DEBIT', auditArea: 'investments' },
  INVESTMENTS_LT:      { category: 'INVESTMENTS_LT', label: 'Long-term Investments', statement: 'BS', bsSection: 'NCA', normalBalance: 'DEBIT', auditArea: 'investments' },
  DEFERRED_TAX_ASSET:  { category: 'DEFERRED_TAX_ASSET', label: 'Deferred Tax Asset', statement: 'BS', bsSection: 'NCA', normalBalance: 'DEBIT', auditArea: 'tax' },
  OTHER_NCA:           { category: 'OTHER_NCA', label: 'Other Non-Current Assets', statement: 'BS', bsSection: 'NCA', normalBalance: 'DEBIT', auditArea: 'fixed_assets' },
  INVENTORY:           { category: 'INVENTORY', label: 'Inventory / Stock', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'inventory', isMaterialityRelevant: true },
  AR_TRADE:            { category: 'AR_TRADE', label: 'Trade Receivables', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'receivables', isMaterialityRelevant: true },
  AR_OTHER:            { category: 'AR_OTHER', label: 'Other Receivables', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'receivables' },
  PREPAYMENTS:         { category: 'PREPAYMENTS', label: 'Prepayments & Deposits', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'receivables' },
  TAX_RECOVERABLE:     { category: 'TAX_RECOVERABLE', label: 'Tax Recoverable', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'tax' },
  CASH_BANK:           { category: 'CASH_BANK', label: 'Cash at Bank & In Hand', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'cash_and_bank', isMaterialityRelevant: true },
  MPESA_FLOAT:         { category: 'MPESA_FLOAT', label: 'M-Pesa Float / Mobile Wallet', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'cash_and_bank' },
  INVESTMENTS_ST:      { category: 'INVESTMENTS_ST', label: 'Short-term Investments', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'investments' },
  OTHER_CA:            { category: 'OTHER_CA', label: 'Other Current Assets', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'receivables' },
  SHARE_CAPITAL:       { category: 'SHARE_CAPITAL', label: 'Share Capital', statement: 'BS', bsSection: 'EQUITY', normalBalance: 'CREDIT', auditArea: 'equity' },
  SHARE_PREMIUM:       { category: 'SHARE_PREMIUM', label: 'Share Premium', statement: 'BS', bsSection: 'EQUITY', normalBalance: 'CREDIT', auditArea: 'equity' },
  RETAINED_EARNINGS:   { category: 'RETAINED_EARNINGS', label: 'Retained Earnings', statement: 'BS', bsSection: 'EQUITY', normalBalance: 'CREDIT', auditArea: 'equity', isMaterialityRelevant: true },
  REVALUATION_RESERVE: { category: 'REVALUATION_RESERVE', label: 'Revaluation Reserve', statement: 'BS', bsSection: 'EQUITY', normalBalance: 'CREDIT', auditArea: 'equity' },
  OTHER_RESERVES:      { category: 'OTHER_RESERVES', label: 'Other Reserves', statement: 'BS', bsSection: 'EQUITY', normalBalance: 'CREDIT', auditArea: 'equity' },
  DRAWINGS:            { category: 'DRAWINGS', label: 'Drawings', statement: 'BS', bsSection: 'EQUITY', normalBalance: 'DEBIT', auditArea: 'equity' },
  LT_BORROWINGS:       { category: 'LT_BORROWINGS', label: 'Long-term Borrowings', statement: 'BS', bsSection: 'NCL', normalBalance: 'CREDIT', auditArea: 'going_concern', isMaterialityRelevant: true },
  DEFERRED_TAX_LIABILITY: { category: 'DEFERRED_TAX_LIABILITY', label: 'Deferred Tax Liability', statement: 'BS', bsSection: 'NCL', normalBalance: 'CREDIT', auditArea: 'tax' },
  LT_PROVISIONS:       { category: 'LT_PROVISIONS', label: 'Long-term Provisions', statement: 'BS', bsSection: 'NCL', normalBalance: 'CREDIT', auditArea: 'provisions_and_liabilities' },
  OTHER_NCL:           { category: 'OTHER_NCL', label: 'Other Non-Current Liabilities', statement: 'BS', bsSection: 'NCL', normalBalance: 'CREDIT', auditArea: 'provisions_and_liabilities' },
  AP_TRADE:            { category: 'AP_TRADE', label: 'Trade Payables', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'payables', isMaterialityRelevant: true },
  AP_OTHER:            { category: 'AP_OTHER', label: 'Other Payables', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'payables' },
  ACCRUALS:            { category: 'ACCRUALS', label: 'Accruals', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'payables' },
  DEFERRED_REVENUE:    { category: 'DEFERRED_REVENUE', label: 'Deferred Revenue', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'revenue' },
  ST_BORROWINGS:       { category: 'ST_BORROWINGS', label: 'Short-term Borrowings / Overdraft', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'going_concern' },
  TAX_PAYABLE:         { category: 'TAX_PAYABLE', label: 'Tax Payable', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'tax' },
  VAT_PAYABLE:         { category: 'VAT_PAYABLE', label: 'VAT Payable', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'tax' },
  PAYE_PAYABLE:        { category: 'PAYE_PAYABLE', label: 'PAYE Payable', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'payroll' },
  NSSF_NHIF_PAYABLE:   { category: 'NSSF_NHIF_PAYABLE', label: 'NSSF / NHIF / SHIF Payable', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'payroll' },
  DIVIDEND_PAYABLE:    { category: 'DIVIDEND_PAYABLE', label: 'Dividend Payable', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'equity' },
  RELATED_PARTY_PAYABLE: { category: 'RELATED_PARTY_PAYABLE', label: 'Due to Related Parties', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'related_parties' },
  OTHER_CL:            { category: 'OTHER_CL', label: 'Other Current Liabilities', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'payables' },
  REVENUE_SALES:       { category: 'REVENUE_SALES', label: 'Sales Revenue', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue', isMaterialityRelevant: true },
  REVENUE_SERVICES:    { category: 'REVENUE_SERVICES', label: 'Service Revenue', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue', isMaterialityRelevant: true },
  REVENUE_RENTAL:      { category: 'REVENUE_RENTAL', label: 'Rental Income', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue' },
  REVENUE_INTEREST:    { category: 'REVENUE_INTEREST', label: 'Interest Income', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue' },
  REVENUE_GRANTS:      { category: 'REVENUE_GRANTS', label: 'Grant Income', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue' },
  REVENUE_DONATIONS:   { category: 'REVENUE_DONATIONS', label: 'Donations Received', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue' },
  REVENUE_OTHER:       { category: 'REVENUE_OTHER', label: 'Other Income', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue' },
  COGS:                { category: 'COGS', label: 'Cost of Goods Sold', statement: 'PL', plSection: 'COGS', normalBalance: 'DEBIT', auditArea: 'expenses', isMaterialityRelevant: true },
  DIRECT_LABOUR:       { category: 'DIRECT_LABOUR', label: 'Direct Labour', statement: 'PL', plSection: 'COGS', normalBalance: 'DEBIT', auditArea: 'payroll' },
  DIRECT_MATERIALS:    { category: 'DIRECT_MATERIALS', label: 'Direct Materials', statement: 'PL', plSection: 'COGS', normalBalance: 'DEBIT', auditArea: 'expenses' },
  PAYROLL_EXPENSE:     { category: 'PAYROLL_EXPENSE', label: 'Salaries & Wages', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'payroll', isMaterialityRelevant: true },
  PAYROLL_BENEFITS:    { category: 'PAYROLL_BENEFITS', label: 'Staff Benefits (NSSF/Pension/Medical)', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'payroll' },
  RENT_EXPENSE:        { category: 'RENT_EXPENSE', label: 'Rent & Lease Expense', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  UTILITIES_EXPENSE:   { category: 'UTILITIES_EXPENSE', label: 'Utilities', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  DEPRECIATION_EXPENSE:{ category: 'DEPRECIATION_EXPENSE', label: 'Depreciation', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'fixed_assets' },
  AMORTISATION_EXPENSE:{ category: 'AMORTISATION_EXPENSE', label: 'Amortisation', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'fixed_assets' },
  PROFESSIONAL_FEES:   { category: 'PROFESSIONAL_FEES', label: 'Professional Fees (Audit/Legal)', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  MARKETING_EXPENSE:   { category: 'MARKETING_EXPENSE', label: 'Marketing & Advertising', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  TRAVEL_EXPENSE:      { category: 'TRAVEL_EXPENSE', label: 'Travel & Accommodation', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  MAINTENANCE_EXPENSE: { category: 'MAINTENANCE_EXPENSE', label: 'Repairs & Maintenance', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  INSURANCE_EXPENSE:   { category: 'INSURANCE_EXPENSE', label: 'Insurance', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  FINANCE_COSTS:       { category: 'FINANCE_COSTS', label: 'Finance Costs / Interest Expense', statement: 'PL', plSection: 'FINANCE', normalBalance: 'DEBIT', auditArea: 'going_concern' },
  TAX_EXPENSE:         { category: 'TAX_EXPENSE', label: 'Income Tax Expense', statement: 'PL', plSection: 'TAX', normalBalance: 'DEBIT', auditArea: 'tax' },
  OTHER_OPEX:          { category: 'OTHER_OPEX', label: 'Other Operating Expenses', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  MEMBER_SHARES:       { category: 'MEMBER_SHARES', label: 'Member Shares (SACCO)', statement: 'BS', bsSection: 'EQUITY', normalBalance: 'CREDIT', auditArea: 'equity' },
  MEMBER_DEPOSITS:     { category: 'MEMBER_DEPOSITS', label: 'Member Deposits/Savings (SACCO)', statement: 'BS', bsSection: 'CL', normalBalance: 'CREDIT', auditArea: 'payables' },
  LOANS_TO_MEMBERS:    { category: 'LOANS_TO_MEMBERS', label: 'Loans to Members (SACCO)', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'receivables', isMaterialityRelevant: true },
  INTEREST_INCOME_LOANS:{ category: 'INTEREST_INCOME_LOANS', label: 'Interest on Member Loans', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue' },
  SACCO_LEVY:          { category: 'SACCO_LEVY', label: 'SASRA Regulatory Levy', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  DIVIDENDS_INTEREST_REBATE: { category: 'DIVIDENDS_INTEREST_REBATE', label: 'Member Dividends / Interest Rebate', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'equity' },
  DONOR_FUNDS:         { category: 'DONOR_FUNDS', label: 'Donor Funds', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue' },
  RESTRICTED_FUNDS:    { category: 'RESTRICTED_FUNDS', label: 'Restricted Funds', statement: 'BS', bsSection: 'EQUITY', normalBalance: 'CREDIT', auditArea: 'equity' },
  PROGRAMME_EXPENSE:   { category: 'PROGRAMME_EXPENSE', label: 'Programme Expenditure (NGO)', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses', isMaterialityRelevant: true },
  FUNDRAISING_EXPENSE: { category: 'FUNDRAISING_EXPENSE', label: 'Fundraising Costs', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  SCHOOL_FEES:         { category: 'SCHOOL_FEES', label: 'School Fees', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue', isMaterialityRelevant: true },
  BOARDING_INCOME:     { category: 'BOARDING_INCOME', label: 'Boarding / Hostel Income', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue' },
  CAPITATION_GRANT:    { category: 'CAPITATION_GRANT', label: 'Government Capitation Grant', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue' },
  SCHOOL_SUPPLIES:     { category: 'SCHOOL_SUPPLIES', label: 'School Supplies & Consumables', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  RAW_MATERIALS:       { category: 'RAW_MATERIALS', label: 'Raw Materials Inventory', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'inventory' },
  WIP_INVENTORY:       { category: 'WIP_INVENTORY', label: 'Work-in-Progress', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'inventory' },
  FINISHED_GOODS:      { category: 'FINISHED_GOODS', label: 'Finished Goods', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'inventory' },
  FACTORY_OVERHEAD:    { category: 'FACTORY_OVERHEAD', label: 'Factory Overhead', statement: 'PL', plSection: 'COGS', normalBalance: 'DEBIT', auditArea: 'expenses' },
  SUBSCRIPTION_REVENUE:{ category: 'SUBSCRIPTION_REVENUE', label: 'Subscription Revenue (SaaS)', statement: 'PL', plSection: 'REVENUE', normalBalance: 'CREDIT', auditArea: 'revenue', isMaterialityRelevant: true },
  TECH_INFRASTRUCTURE: { category: 'TECH_INFRASTRUCTURE', label: 'Tech Infrastructure / Hosting', statement: 'PL', plSection: 'OPEX', normalBalance: 'DEBIT', auditArea: 'expenses' },
  CUSTOMER_ACQUISITION:{ category: 'CUSTOMER_ACQUISITION', label: 'Customer Acquisition Cost', statement: 'BS', bsSection: 'NCA', normalBalance: 'DEBIT', auditArea: 'fixed_assets' },
  UNKNOWN:             { category: 'UNKNOWN', label: 'Unclassified', statement: 'BS', bsSection: 'CA', normalBalance: 'DEBIT', auditArea: 'expenses' },
};

/** All categories that are revenue lines */
export const REVENUE_CATEGORIES: FSCategory[] = [
  'REVENUE_SALES', 'REVENUE_SERVICES', 'REVENUE_RENTAL', 'REVENUE_INTEREST',
  'REVENUE_GRANTS', 'REVENUE_DONATIONS', 'REVENUE_OTHER',
  'SCHOOL_FEES', 'BOARDING_INCOME', 'CAPITATION_GRANT',
  'INTEREST_INCOME_LOANS', 'DONOR_FUNDS', 'SUBSCRIPTION_REVENUE',
];

/** All categories that are current assets */
export const CURRENT_ASSET_CATEGORIES: FSCategory[] = [
  'INVENTORY', 'AR_TRADE', 'AR_OTHER', 'PREPAYMENTS', 'TAX_RECOVERABLE',
  'CASH_BANK', 'MPESA_FLOAT', 'INVESTMENTS_ST', 'OTHER_CA',
  'LOANS_TO_MEMBERS', 'RAW_MATERIALS', 'WIP_INVENTORY', 'FINISHED_GOODS',
];

/** All categories that are current liabilities */
export const CURRENT_LIABILITY_CATEGORIES: FSCategory[] = [
  'AP_TRADE', 'AP_OTHER', 'ACCRUALS', 'DEFERRED_REVENUE', 'ST_BORROWINGS',
  'TAX_PAYABLE', 'VAT_PAYABLE', 'PAYE_PAYABLE', 'NSSF_NHIF_PAYABLE',
  'DIVIDEND_PAYABLE', 'RELATED_PARTY_PAYABLE', 'OTHER_CL', 'MEMBER_DEPOSITS',
];
