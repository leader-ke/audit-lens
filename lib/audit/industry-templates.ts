/**
 * INDUSTRY TEMPLATES
 *
 * Kenya-specific chart-of-accounts dictionaries for 7 entity types.
 * Each template provides the exact match dictionary, alias dictionary,
 * and regex patterns for Layer 1–3 classification.
 *
 * Covers: General, SACCO, NGO, School, Manufacturing, Retail, SaaS/Tech
 */

import type { FSCategory } from './fs-categories';

export type IndustryType =
  | 'general'           // Limited companies, professional firms
  | 'sacco'             // SACCOs regulated by SASRA
  | 'ngo'               // NGOs / CBOs / foundations
  | 'school'            // Schools, colleges, universities
  | 'manufacturing'     // Manufacturing / FMCG
  | 'retail'            // Retail / wholesale / trading
  | 'saas_tech';        // SaaS / technology / fintech

export interface MatchRule {
  category: FSCategory;
  confidence: number;  // 0–1
}

export interface IndustryTemplate {
  industry: IndustryType;
  label: string;
  /** Layer 1: Exact match (normalised lowercase). Highest priority. */
  exactMatch: Record<string, FSCategory>;
  /** Layer 2: Alias match (normalised lowercase). */
  aliasMatch: Record<string, FSCategory>;
  /** Layer 3: Regex patterns, evaluated in order. */
  regexPatterns: Array<{ pattern: RegExp; category: FSCategory; confidence: number }>;
  /** Key financial ratios relevant to this industry */
  keyRatios: string[];
  /** Accounts that are high-risk / require special attention */
  highRiskAccounts: string[];
}

// ─── Normalise helper ─────────────────────────────────────────────────────────

function n(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ─── General template (applies to all entities as baseline) ──────────────────

const GENERAL_EXACT: Record<string, FSCategory> = {
  // Cash & Bank
  [n('cash at bank')]: 'CASH_BANK',
  [n('cash in hand')]: 'CASH_BANK',
  [n('cash and cash equivalents')]: 'CASH_BANK',
  [n('petty cash')]: 'CASH_BANK',
  [n('mpesa')]: 'MPESA_FLOAT',
  [n('mpesa float')]: 'MPESA_FLOAT',
  [n('mpesa account')]: 'MPESA_FLOAT',
  [n('mobile money')]: 'MPESA_FLOAT',
  // Receivables
  [n('trade receivables')]: 'AR_TRADE',
  [n('trade debtors')]: 'AR_TRADE',
  [n('accounts receivable')]: 'AR_TRADE',
  [n('sundry debtors')]: 'AR_OTHER',
  [n('other receivables')]: 'AR_OTHER',
  [n('prepayments')]: 'PREPAYMENTS',
  [n('prepaid expenses')]: 'PREPAYMENTS',
  [n('deposits paid')]: 'PREPAYMENTS',
  [n('advance payments')]: 'PREPAYMENTS',
  [n('staff advances')]: 'AR_OTHER',
  // Inventory
  [n('inventory')]: 'INVENTORY',
  [n('stock in trade')]: 'INVENTORY',
  [n('closing stock')]: 'INVENTORY',
  [n('goods in transit')]: 'INVENTORY',
  // Investments
  [n('short term investments')]: 'INVESTMENTS_ST',
  [n('treasury bills')]: 'INVESTMENTS_ST',
  [n('fixed deposit')]: 'INVESTMENTS_ST',
  [n('call deposit')]: 'INVESTMENTS_ST',
  [n('long term investments')]: 'INVESTMENTS_LT',
  [n('investments in subsidiaries')]: 'INVESTMENTS_ASSOC',
  [n('investments in associates')]: 'INVESTMENTS_ASSOC',
  // PPE
  [n('property plant and equipment')]: 'PPE_GROSS',
  [n('plant and machinery')]: 'PPE_GROSS',
  [n('office equipment')]: 'PPE_GROSS',
  [n('furniture and fittings')]: 'PPE_GROSS',
  [n('motor vehicles')]: 'PPE_GROSS',
  [n('land and buildings')]: 'PPE_GROSS',
  [n('computers and equipment')]: 'PPE_GROSS',
  [n('accumulated depreciation')]: 'ACCUM_DEPRECIATION',
  [n('accumulated depreciation on ppe')]: 'ACCUM_DEPRECIATION',
  [n('goodwill')]: 'INTANGIBLES',
  [n('intangible assets')]: 'INTANGIBLES',
  [n('software licences')]: 'INTANGIBLES',
  // Tax
  [n('tax recoverable')]: 'TAX_RECOVERABLE',
  [n('withholding tax recoverable')]: 'TAX_RECOVERABLE',
  [n('deferred tax asset')]: 'DEFERRED_TAX_ASSET',
  // Payables
  [n('trade payables')]: 'AP_TRADE',
  [n('trade creditors')]: 'AP_TRADE',
  [n('accounts payable')]: 'AP_TRADE',
  [n('other payables')]: 'AP_OTHER',
  [n('sundry creditors')]: 'AP_OTHER',
  [n('accruals')]: 'ACCRUALS',
  [n('accrued liabilities')]: 'ACCRUALS',
  [n('accrued expenses')]: 'ACCRUALS',
  [n('deferred revenue')]: 'DEFERRED_REVENUE',
  [n('unearned revenue')]: 'DEFERRED_REVENUE',
  [n('income in advance')]: 'DEFERRED_REVENUE',
  [n('bank overdraft')]: 'ST_BORROWINGS',
  [n('overdraft')]: 'ST_BORROWINGS',
  [n('short term loan')]: 'ST_BORROWINGS',
  [n('current portion of long term loan')]: 'ST_BORROWINGS',
  [n('tax payable')]: 'TAX_PAYABLE',
  [n('income tax payable')]: 'TAX_PAYABLE',
  [n('corporation tax')]: 'TAX_PAYABLE',
  [n('vat payable')]: 'VAT_PAYABLE',
  [n('vat liability')]: 'VAT_PAYABLE',
  [n('output vat')]: 'VAT_PAYABLE',
  [n('paye payable')]: 'PAYE_PAYABLE',
  [n('paye')]: 'PAYE_PAYABLE',
  [n('nssf payable')]: 'NSSF_NHIF_PAYABLE',
  [n('nhif payable')]: 'NSSF_NHIF_PAYABLE',
  [n('shif payable')]: 'NSSF_NHIF_PAYABLE',
  [n('nssf contribution')]: 'NSSF_NHIF_PAYABLE',
  [n('dividend payable')]: 'DIVIDEND_PAYABLE',
  [n('long term loan')]: 'LT_BORROWINGS',
  [n('term loan')]: 'LT_BORROWINGS',
  [n('deferred tax liability')]: 'DEFERRED_TAX_LIABILITY',
  // Equity
  [n('share capital')]: 'SHARE_CAPITAL',
  [n('ordinary shares')]: 'SHARE_CAPITAL',
  [n('paid up capital')]: 'SHARE_CAPITAL',
  [n('share premium')]: 'SHARE_PREMIUM',
  [n('retained earnings')]: 'RETAINED_EARNINGS',
  [n('retained profit')]: 'RETAINED_EARNINGS',
  [n('accumulated surplus')]: 'RETAINED_EARNINGS',
  [n('profit and loss account')]: 'RETAINED_EARNINGS',
  [n('revaluation reserve')]: 'REVALUATION_RESERVE',
  [n('general reserve')]: 'OTHER_RESERVES',
  [n('capital reserve')]: 'OTHER_RESERVES',
  [n('statutory reserve')]: 'OTHER_RESERVES',
  [n('drawings')]: 'DRAWINGS',
  // Revenue
  [n('revenue')]: 'REVENUE_SALES',
  [n('sales')]: 'REVENUE_SALES',
  [n('turnover')]: 'REVENUE_SALES',
  [n('gross revenue')]: 'REVENUE_SALES',
  [n('net revenue')]: 'REVENUE_SALES',
  [n('service income')]: 'REVENUE_SERVICES',
  [n('professional fees earned')]: 'REVENUE_SERVICES',
  [n('consulting fees')]: 'REVENUE_SERVICES',
  [n('fees income')]: 'REVENUE_SERVICES',
  [n('rental income')]: 'REVENUE_RENTAL',
  [n('rent received')]: 'REVENUE_RENTAL',
  [n('interest income')]: 'REVENUE_INTEREST',
  [n('interest received')]: 'REVENUE_INTEREST',
  [n('other income')]: 'REVENUE_OTHER',
  [n('sundry income')]: 'REVENUE_OTHER',
  [n('miscellaneous income')]: 'REVENUE_OTHER',
  // COGS
  [n('cost of goods sold')]: 'COGS',
  [n('cost of sales')]: 'COGS',
  [n('direct costs')]: 'COGS',
  [n('cost of revenue')]: 'COGS',
  [n('purchases')]: 'COGS',
  [n('opening stock')]: 'COGS',
  // Operating expenses
  [n('salaries and wages')]: 'PAYROLL_EXPENSE',
  [n('staff costs')]: 'PAYROLL_EXPENSE',
  [n('salaries')]: 'PAYROLL_EXPENSE',
  [n('wages')]: 'PAYROLL_EXPENSE',
  [n('nssf contribution expense')]: 'PAYROLL_BENEFITS',
  [n('nhif contribution expense')]: 'PAYROLL_BENEFITS',
  [n('pension contribution')]: 'PAYROLL_BENEFITS',
  [n('gratuity expense')]: 'PAYROLL_BENEFITS',
  [n('housing allowance')]: 'PAYROLL_BENEFITS',
  [n('rent expense')]: 'RENT_EXPENSE',
  [n('office rent')]: 'RENT_EXPENSE',
  [n('lease expense')]: 'RENT_EXPENSE',
  [n('electricity')]: 'UTILITIES_EXPENSE',
  [n('water and electricity')]: 'UTILITIES_EXPENSE',
  [n('utilities')]: 'UTILITIES_EXPENSE',
  [n('internet expense')]: 'UTILITIES_EXPENSE',
  [n('depreciation')]: 'DEPRECIATION_EXPENSE',
  [n('depreciation expense')]: 'DEPRECIATION_EXPENSE',
  [n('amortisation')]: 'AMORTISATION_EXPENSE',
  [n('audit fees')]: 'PROFESSIONAL_FEES',
  [n('legal fees')]: 'PROFESSIONAL_FEES',
  [n('professional fees')]: 'PROFESSIONAL_FEES',
  [n('consultancy fees')]: 'PROFESSIONAL_FEES',
  [n('advertising')]: 'MARKETING_EXPENSE',
  [n('marketing expense')]: 'MARKETING_EXPENSE',
  [n('travel expense')]: 'TRAVEL_EXPENSE',
  [n('travel and accommodation')]: 'TRAVEL_EXPENSE',
  [n('per diem')]: 'TRAVEL_EXPENSE',
  [n('repairs and maintenance')]: 'MAINTENANCE_EXPENSE',
  [n('maintenance expense')]: 'MAINTENANCE_EXPENSE',
  [n('insurance')]: 'INSURANCE_EXPENSE',
  [n('insurance expense')]: 'INSURANCE_EXPENSE',
  [n('interest expense')]: 'FINANCE_COSTS',
  [n('bank charges')]: 'FINANCE_COSTS',
  [n('finance costs')]: 'FINANCE_COSTS',
  [n('income tax expense')]: 'TAX_EXPENSE',
  [n('corporate tax expense')]: 'TAX_EXPENSE',
};

const GENERAL_ALIASES: Record<string, FSCategory> = {
  // More informal names used in Kenyan SME accounting
  [n('bank account')]: 'CASH_BANK',
  [n('bank balance')]: 'CASH_BANK',
  [n('cash')]: 'CASH_BANK',
  [n('debtors')]: 'AR_TRADE',
  [n('customers')]: 'AR_TRADE',
  [n('creditors')]: 'AP_TRADE',
  [n('suppliers')]: 'AP_TRADE',
  [n('stock')]: 'INVENTORY',
  [n('goods')]: 'INVENTORY',
  [n('equipment')]: 'PPE_GROSS',
  [n('vehicles')]: 'PPE_GROSS',
  [n('buildings')]: 'PPE_GROSS',
  [n('land')]: 'PPE_GROSS',
  [n('capital')]: 'SHARE_CAPITAL',
  [n('profits')]: 'RETAINED_EARNINGS',
  [n('losses')]: 'RETAINED_EARNINGS',
  [n('borrowing')]: 'LT_BORROWINGS',
  [n('loan')]: 'LT_BORROWINGS',
  [n('tax')]: 'TAX_PAYABLE',
  [n('vat')]: 'VAT_PAYABLE',
  [n('staff')]: 'PAYROLL_EXPENSE',
  [n('payroll')]: 'PAYROLL_EXPENSE',
};

const GENERAL_PATTERNS: Array<{ pattern: RegExp; category: FSCategory; confidence: number }> = [
  { pattern: /mpesa|m-pesa|mobile\s*money|paybill/i, category: 'MPESA_FLOAT', confidence: 0.95 },
  { pattern: /cash.*bank|bank.*cash/i, category: 'CASH_BANK', confidence: 0.92 },
  { pattern: /petty\s*cash|cash\s*in\s*hand|cash\s*float/i, category: 'CASH_BANK', confidence: 0.92 },
  { pattern: /trade\s*receiv|trade\s*debt/i, category: 'AR_TRADE', confidence: 0.93 },
  { pattern: /account.*receiv|debtor/i, category: 'AR_TRADE', confidence: 0.88 },
  { pattern: /receiv(able)?s?$/i, category: 'AR_TRADE', confidence: 0.82 },
  { pattern: /prepay|prepaid|advance.*paid|deposit.*paid/i, category: 'PREPAYMENTS', confidence: 0.88 },
  { pattern: /staff.*advanc|advance.*staff/i, category: 'AR_OTHER', confidence: 0.85 },
  { pattern: /inventor|stock|raw\s*material|work\s*in\s*prog|finished\s*goods/i, category: 'INVENTORY', confidence: 0.88 },
  { pattern: /treasury\s*bill|t-bill|fixed\s*deposit|call\s*deposit/i, category: 'INVESTMENTS_ST', confidence: 0.90 },
  { pattern: /property.*plant|plant.*equipment|ppe/i, category: 'PPE_GROSS', confidence: 0.90 },
  { pattern: /motor\s*vehicle|motor\s*car|company\s*car/i, category: 'PPE_GROSS', confidence: 0.90 },
  { pattern: /furniture|fittings|fixture/i, category: 'PPE_GROSS', confidence: 0.87 },
  { pattern: /accumulated\s*deprec|depn.*accum/i, category: 'ACCUM_DEPRECIATION', confidence: 0.93 },
  { pattern: /goodwill|intangible|software|licence|brand/i, category: 'INTANGIBLES', confidence: 0.85 },
  { pattern: /withholding\s*tax.*rec|wht.*rec/i, category: 'TAX_RECOVERABLE', confidence: 0.90 },
  { pattern: /deferred\s*tax.*asset/i, category: 'DEFERRED_TAX_ASSET', confidence: 0.92 },
  { pattern: /trade\s*payable|trade\s*credit/i, category: 'AP_TRADE', confidence: 0.92 },
  { pattern: /account.*payable|creditor/i, category: 'AP_TRADE', confidence: 0.85 },
  { pattern: /accru(al|ed)/i, category: 'ACCRUALS', confidence: 0.88 },
  { pattern: /deferred\s*revenue|unearned|income.*advance|advance.*income/i, category: 'DEFERRED_REVENUE', confidence: 0.88 },
  { pattern: /overdraft|bank.*overdraft/i, category: 'ST_BORROWINGS', confidence: 0.92 },
  { pattern: /paye|pay\s*as\s*you\s*earn/i, category: 'PAYE_PAYABLE', confidence: 0.90 },
  { pattern: /nssf|nhif|shif|national\s*(social|hospital)/i, category: 'NSSF_NHIF_PAYABLE', confidence: 0.92 },
  { pattern: /vat\s*payable|vat\s*liab|output\s*vat/i, category: 'VAT_PAYABLE', confidence: 0.92 },
  { pattern: /tax\s*payable|income\s*tax.*payable|corp.*tax/i, category: 'TAX_PAYABLE', confidence: 0.88 },
  { pattern: /related\s*party|director.*loan|shareholder.*loan|due\s*to.*(direct|share)/i, category: 'RELATED_PARTY_PAYABLE', confidence: 0.88 },
  { pattern: /term\s*loan|long.?term.*loan|bank\s*loan/i, category: 'LT_BORROWINGS', confidence: 0.85 },
  { pattern: /deferred\s*tax.*liab/i, category: 'DEFERRED_TAX_LIABILITY', confidence: 0.92 },
  { pattern: /share\s*capital|ordinary\s*share|paid.?up|authorised.*capital/i, category: 'SHARE_CAPITAL', confidence: 0.90 },
  { pattern: /share\s*premium/i, category: 'SHARE_PREMIUM', confidence: 0.93 },
  { pattern: /retained.*earn|accumulated.*surplus|profit.*loss.*account/i, category: 'RETAINED_EARNINGS', confidence: 0.88 },
  { pattern: /revaluation/i, category: 'REVALUATION_RESERVE', confidence: 0.88 },
  { pattern: /revenue|sales|turnover/i, category: 'REVENUE_SALES', confidence: 0.80 },
  { pattern: /fee.*income|income.*fee|service.*income|professional.*fee.*earned/i, category: 'REVENUE_SERVICES', confidence: 0.85 },
  { pattern: /rental.*income|rent.*received|rent.*income/i, category: 'REVENUE_RENTAL', confidence: 0.88 },
  { pattern: /interest.*income|interest.*received/i, category: 'REVENUE_INTEREST', confidence: 0.88 },
  { pattern: /grant|donation.*received|bursary\s*income/i, category: 'REVENUE_GRANTS', confidence: 0.85 },
  { pattern: /cost.*sales|cost.*goods|cogs|direct\s*cost|purchase/i, category: 'COGS', confidence: 0.82 },
  { pattern: /salary|salaries|wage|remuneration/i, category: 'PAYROLL_EXPENSE', confidence: 0.85 },
  { pattern: /pension|gratuity|leave.*pay|staff.*benefit/i, category: 'PAYROLL_BENEFITS', confidence: 0.82 },
  { pattern: /rent.*expense|lease.*expense|occupancy/i, category: 'RENT_EXPENSE', confidence: 0.85 },
  { pattern: /electric|water|utility|power|generator/i, category: 'UTILITIES_EXPENSE', confidence: 0.82 },
  { pattern: /depreciation/i, category: 'DEPRECIATION_EXPENSE', confidence: 0.88 },
  { pattern: /amortis/i, category: 'AMORTISATION_EXPENSE', confidence: 0.88 },
  { pattern: /audit.*fee|external.*audit|statutory.*audit/i, category: 'PROFESSIONAL_FEES', confidence: 0.90 },
  { pattern: /legal.*fee|advocate|solicitor/i, category: 'PROFESSIONAL_FEES', confidence: 0.88 },
  { pattern: /advertising|marketing|promotion|brand/i, category: 'MARKETING_EXPENSE', confidence: 0.85 },
  { pattern: /travel|accommodation|hotel|per\s*diem|subsistence/i, category: 'TRAVEL_EXPENSE', confidence: 0.82 },
  { pattern: /repair|maintenance|service.*contract/i, category: 'MAINTENANCE_EXPENSE', confidence: 0.82 },
  { pattern: /insurance|premium.*insurance/i, category: 'INSURANCE_EXPENSE', confidence: 0.85 },
  { pattern: /interest.*expense|bank.*charge|finance.*cost|loan.*interest/i, category: 'FINANCE_COSTS', confidence: 0.85 },
  { pattern: /income.*tax.*expense|tax.*charge|deferred.*tax.*expense/i, category: 'TAX_EXPENSE', confidence: 0.85 },
];

// ─── SACCO template ───────────────────────────────────────────────────────────

const SACCO_EXTRA_EXACT: Record<string, FSCategory> = {
  [n('member shares')]: 'MEMBER_SHARES',
  [n('ordinary shares')]: 'MEMBER_SHARES',
  [n('share capital sacco')]: 'MEMBER_SHARES',
  [n('member deposits')]: 'MEMBER_DEPOSITS',
  [n('savings deposits')]: 'MEMBER_DEPOSITS',
  [n('demand deposits')]: 'MEMBER_DEPOSITS',
  [n('fixed deposits members')]: 'MEMBER_DEPOSITS',
  [n('loans to members')]: 'LOANS_TO_MEMBERS',
  [n('member loans')]: 'LOANS_TO_MEMBERS',
  [n('normal loans')]: 'LOANS_TO_MEMBERS',
  [n('emergency loans')]: 'LOANS_TO_MEMBERS',
  [n('development loans')]: 'LOANS_TO_MEMBERS',
  [n('interest on loans')]: 'INTEREST_INCOME_LOANS',
  [n('interest income from loans')]: 'INTEREST_INCOME_LOANS',
  [n('sasra levy')]: 'SACCO_LEVY',
  [n('regulatory levy')]: 'SACCO_LEVY',
  [n('dividends on shares')]: 'DIVIDENDS_INTEREST_REBATE',
  [n('interest rebate')]: 'DIVIDENDS_INTEREST_REBATE',
};

const SACCO_EXTRA_PATTERNS: Array<{ pattern: RegExp; category: FSCategory; confidence: number }> = [
  { pattern: /member.*share|share.*capital.*sacco/i, category: 'MEMBER_SHARES', confidence: 0.93 },
  { pattern: /member.*deposit|savings.*deposit|fixed.*deposit.*member/i, category: 'MEMBER_DEPOSITS', confidence: 0.92 },
  { pattern: /loan.*member|member.*loan|normal.*loan|emergency.*loan|development.*loan/i, category: 'LOANS_TO_MEMBERS', confidence: 0.93 },
  { pattern: /interest.*on.*loan|loan.*interest.*income/i, category: 'INTEREST_INCOME_LOANS', confidence: 0.92 },
  { pattern: /sasra|regulatory.*levy/i, category: 'SACCO_LEVY', confidence: 0.92 },
  { pattern: /dividend.*share|interest.*rebate/i, category: 'DIVIDENDS_INTEREST_REBATE', confidence: 0.88 },
];

// ─── NGO template ─────────────────────────────────────────────────────────────

const NGO_EXTRA_EXACT: Record<string, FSCategory> = {
  [n('donor funds')]: 'DONOR_FUNDS',
  [n('grants received')]: 'DONOR_FUNDS',
  [n('donor grants')]: 'DONOR_FUNDS',
  [n('restricted funds')]: 'RESTRICTED_FUNDS',
  [n('designated funds')]: 'RESTRICTED_FUNDS',
  [n('project funds')]: 'RESTRICTED_FUNDS',
  [n('programme expenses')]: 'PROGRAMME_EXPENSE',
  [n('project expenses')]: 'PROGRAMME_EXPENSE',
  [n('activity expenses')]: 'PROGRAMME_EXPENSE',
  [n('direct programme costs')]: 'PROGRAMME_EXPENSE',
  [n('fundraising costs')]: 'FUNDRAISING_EXPENSE',
};

const NGO_EXTRA_PATTERNS: Array<{ pattern: RegExp; category: FSCategory; confidence: number }> = [
  { pattern: /donor|grant.*income|grant.*receiv/i, category: 'DONOR_FUNDS', confidence: 0.92 },
  { pattern: /restricted|designated|project.*fund/i, category: 'RESTRICTED_FUNDS', confidence: 0.88 },
  { pattern: /programme|project.*expense|activity.*cost/i, category: 'PROGRAMME_EXPENSE', confidence: 0.88 },
  { pattern: /fundrais/i, category: 'FUNDRAISING_EXPENSE', confidence: 0.88 },
];

// ─── School template ──────────────────────────────────────────────────────────

const SCHOOL_EXTRA_EXACT: Record<string, FSCategory> = {
  [n('school fees')]: 'SCHOOL_FEES',
  [n('tuition fees')]: 'SCHOOL_FEES',
  [n('exam fees')]: 'SCHOOL_FEES',
  [n('registration fees')]: 'SCHOOL_FEES',
  [n('boarding fees')]: 'BOARDING_INCOME',
  [n('hostel income')]: 'BOARDING_INCOME',
  [n('capitation grant')]: 'CAPITATION_GRANT',
  [n('government grant')]: 'CAPITATION_GRANT',
  [n('free day secondary education')]: 'CAPITATION_GRANT',
  [n('school supplies')]: 'SCHOOL_SUPPLIES',
  [n('stationery')]: 'SCHOOL_SUPPLIES',
  [n('textbooks')]: 'SCHOOL_SUPPLIES',
  [n('lab supplies')]: 'SCHOOL_SUPPLIES',
};

const SCHOOL_EXTRA_PATTERNS: Array<{ pattern: RegExp; category: FSCategory; confidence: number }> = [
  { pattern: /school.*fee|tuition|exam.*fee|registration.*fee/i, category: 'SCHOOL_FEES', confidence: 0.92 },
  { pattern: /boarding|hostel.*income|accommodation.*income/i, category: 'BOARDING_INCOME', confidence: 0.90 },
  { pattern: /capitation|free\s*day|fdse|government.*grant/i, category: 'CAPITATION_GRANT', confidence: 0.90 },
  { pattern: /stationery|textbook|lab.*supplies|school.*supplies/i, category: 'SCHOOL_SUPPLIES', confidence: 0.85 },
];

// ─── Manufacturing template ───────────────────────────────────────────────────

const MANUFACTURING_EXTRA_EXACT: Record<string, FSCategory> = {
  [n('raw materials')]: 'RAW_MATERIALS',
  [n('raw material inventory')]: 'RAW_MATERIALS',
  [n('materials stock')]: 'RAW_MATERIALS',
  [n('work in progress')]: 'WIP_INVENTORY',
  [n('work in process')]: 'WIP_INVENTORY',
  [n('wip')]: 'WIP_INVENTORY',
  [n('finished goods')]: 'FINISHED_GOODS',
  [n('finished goods inventory')]: 'FINISHED_GOODS',
  [n('factory overhead')]: 'FACTORY_OVERHEAD',
  [n('manufacturing overhead')]: 'FACTORY_OVERHEAD',
  [n('production overhead')]: 'FACTORY_OVERHEAD',
  [n('direct labour')]: 'DIRECT_LABOUR',
  [n('direct materials')]: 'DIRECT_MATERIALS',
};

const MANUFACTURING_EXTRA_PATTERNS: Array<{ pattern: RegExp; category: FSCategory; confidence: number }> = [
  { pattern: /raw\s*material/i, category: 'RAW_MATERIALS', confidence: 0.93 },
  { pattern: /work\s*in\s*pro(gress|cess)|wip/i, category: 'WIP_INVENTORY', confidence: 0.93 },
  { pattern: /finished\s*goods/i, category: 'FINISHED_GOODS', confidence: 0.93 },
  { pattern: /factory.*overhead|manufacturing.*overhead|production.*overhead/i, category: 'FACTORY_OVERHEAD', confidence: 0.90 },
  { pattern: /direct\s*labour/i, category: 'DIRECT_LABOUR', confidence: 0.88 },
  { pattern: /direct\s*material/i, category: 'DIRECT_MATERIALS', confidence: 0.88 },
];

// ─── Retail template ──────────────────────────────────────────────────────────

const RETAIL_EXTRA_EXACT: Record<string, FSCategory> = {
  [n('merchandise inventory')]: 'INVENTORY',
  [n('trading stock')]: 'INVENTORY',
  [n('shrinkage')]: 'OTHER_OPEX',
  [n('point of sale')]: 'REVENUE_SALES',
};

const RETAIL_EXTRA_PATTERNS: Array<{ pattern: RegExp; category: FSCategory; confidence: number }> = [
  { pattern: /merchandise|trading\s*stock/i, category: 'INVENTORY', confidence: 0.90 },
  { pattern: /shrinkage|stock\s*loss/i, category: 'OTHER_OPEX', confidence: 0.85 },
];

// ─── SaaS / Tech template ─────────────────────────────────────────────────────

const SAAS_EXTRA_EXACT: Record<string, FSCategory> = {
  [n('subscription revenue')]: 'SUBSCRIPTION_REVENUE',
  [n('annual recurring revenue')]: 'SUBSCRIPTION_REVENUE',
  [n('monthly recurring revenue')]: 'SUBSCRIPTION_REVENUE',
  [n('saas revenue')]: 'SUBSCRIPTION_REVENUE',
  [n('cloud infrastructure')]: 'TECH_INFRASTRUCTURE',
  [n('hosting costs')]: 'TECH_INFRASTRUCTURE',
  [n('server costs')]: 'TECH_INFRASTRUCTURE',
  [n('aws costs')]: 'TECH_INFRASTRUCTURE',
  [n('customer acquisition cost')]: 'CUSTOMER_ACQUISITION',
  [n('deferred revenue saas')]: 'DEFERRED_REVENUE',
};

const SAAS_EXTRA_PATTERNS: Array<{ pattern: RegExp; category: FSCategory; confidence: number }> = [
  { pattern: /subscription|recurring.*revenue|saas/i, category: 'SUBSCRIPTION_REVENUE', confidence: 0.92 },
  { pattern: /hosting|cloud|server|aws|gcp|azure/i, category: 'TECH_INFRASTRUCTURE', confidence: 0.88 },
  { pattern: /customer.*acqui(sition)?|cac/i, category: 'CUSTOMER_ACQUISITION', confidence: 0.85 },
];

// ─── Template registry ────────────────────────────────────────────────────────

export const INDUSTRY_TEMPLATES: Record<IndustryType, IndustryTemplate> = {
  general: {
    industry: 'general',
    label: 'General (Limited Company)',
    exactMatch: GENERAL_EXACT,
    aliasMatch: GENERAL_ALIASES,
    regexPatterns: GENERAL_PATTERNS,
    keyRatios: ['Current Ratio', 'Quick Ratio', 'Gross Margin', 'Net Margin', 'Debt/Equity', 'DSO', 'DPO'],
    highRiskAccounts: ['Revenue', 'Cash at Bank', 'Trade Receivables', 'Related Party Transactions'],
  },
  sacco: {
    industry: 'sacco',
    label: 'SACCO (SASRA Regulated)',
    exactMatch: { ...GENERAL_EXACT, ...SACCO_EXTRA_EXACT },
    aliasMatch: { ...GENERAL_ALIASES },
    regexPatterns: [...SACCO_EXTRA_PATTERNS, ...GENERAL_PATTERNS],
    keyRatios: ['Capital Adequacy Ratio', 'Loan-to-Deposit Ratio', 'Non-Performing Loan Ratio', 'Liquidity Ratio'],
    highRiskAccounts: ['Loans to Members', 'Member Deposits', 'SASRA Compliance', 'NPL Provisions'],
  },
  ngo: {
    industry: 'ngo',
    label: 'NGO / CBO / Foundation',
    exactMatch: { ...GENERAL_EXACT, ...NGO_EXTRA_EXACT },
    aliasMatch: { ...GENERAL_ALIASES },
    regexPatterns: [...NGO_EXTRA_PATTERNS, ...GENERAL_PATTERNS],
    keyRatios: ['Programme Ratio', 'Admin Overhead %', 'Donor Fund Utilisation %', 'Restricted vs Unrestricted'],
    highRiskAccounts: ['Donor Funds', 'Restricted Funds', 'Programme Expenses', 'NGO Compliance (PBO Act)'],
  },
  school: {
    industry: 'school',
    label: 'School / Educational Institution',
    exactMatch: { ...GENERAL_EXACT, ...SCHOOL_EXTRA_EXACT },
    aliasMatch: { ...GENERAL_ALIASES },
    regexPatterns: [...SCHOOL_EXTRA_PATTERNS, ...GENERAL_PATTERNS],
    keyRatios: ['Fee Collection Rate', 'Capitation % of Revenue', 'Payroll % of Revenue', 'Facilities Investment'],
    highRiskAccounts: ['School Fees (collection)', 'Capitation Grants', 'Payroll (ghost teachers)', 'School Supplies'],
  },
  manufacturing: {
    industry: 'manufacturing',
    label: 'Manufacturing / FMCG',
    exactMatch: { ...GENERAL_EXACT, ...MANUFACTURING_EXTRA_EXACT },
    aliasMatch: { ...GENERAL_ALIASES },
    regexPatterns: [...MANUFACTURING_EXTRA_PATTERNS, ...GENERAL_PATTERNS],
    keyRatios: ['Gross Margin', 'Inventory Turnover', 'Days Inventory Outstanding', 'Capacity Utilisation'],
    highRiskAccounts: ['Raw Materials', 'WIP', 'Finished Goods', 'Cost of Production', 'Excise Duty'],
  },
  retail: {
    industry: 'retail',
    label: 'Retail / Wholesale / Trading',
    exactMatch: { ...GENERAL_EXACT, ...RETAIL_EXTRA_EXACT },
    aliasMatch: { ...GENERAL_ALIASES },
    regexPatterns: [...RETAIL_EXTRA_PATTERNS, ...GENERAL_PATTERNS],
    keyRatios: ['Gross Margin', 'Inventory Days', 'Stock Turn', 'Shrinkage %', 'Same-Store Growth'],
    highRiskAccounts: ['Inventory', 'Cash Receipts', 'Shrinkage', 'Supplier Discounts'],
  },
  saas_tech: {
    industry: 'saas_tech',
    label: 'SaaS / Technology / Fintech',
    exactMatch: { ...GENERAL_EXACT, ...SAAS_EXTRA_EXACT },
    aliasMatch: { ...GENERAL_ALIASES },
    regexPatterns: [...SAAS_EXTRA_PATTERNS, ...GENERAL_PATTERNS],
    keyRatios: ['MRR/ARR', 'Churn Rate', 'LTV:CAC Ratio', 'Gross Margin', 'Deferred Revenue Movement'],
    highRiskAccounts: ['Subscription Revenue (recognition)', 'Deferred Revenue', 'Customer Acquisition Costs', 'CBK Compliance (fintech)'],
  },
};

export function getTemplate(industry?: IndustryType | string | null): IndustryTemplate {
  return INDUSTRY_TEMPLATES[(industry as IndustryType) ?? 'general'] ?? INDUSTRY_TEMPLATES.general;
}
