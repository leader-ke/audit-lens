/**
 * ISA STANDARDS LIBRARY - AuditLens Kenya
 *
 * Hardcoded International Standards on Auditing (ISAs) as adopted in Kenya.
 * These are NEVER AI-generated. AI matches audit evidence against these definitions.
 * Updated against ICPAK pronouncements and IAASB clarified ISAs.
 *
 * Kenya context: ICPAK adopted the Clarified ISAs effective for audits of financial
 * statements for periods beginning on or after 15 December 2009. Kenya follows IFRS
 * for listed entities, IFRS for SMEs for private companies, and IPSAS for public sector.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'significant';
export type AuditArea =
  | 'revenue' | 'expenses' | 'receivables' | 'payables' | 'cash_and_bank'
  | 'fixed_assets' | 'payroll' | 'tax' | 'equity' | 'provisions_and_liabilities'
  | 'inventory' | 'investments' | 'related_parties' | 'going_concern' | 'opening_balances';

export type Assertion =
  | 'existence' | 'completeness' | 'accuracy' | 'cutoff'
  | 'classification' | 'presentation' | 'valuation' | 'rights_and_obligations';

// ─── ISA Definitions ──────────────────────────────────────────────────────────

export interface ISAStandard {
  isaNumber: string;
  title: string;
  objective: string;
  keyRequirements: string[];
  documentationRequirements: string[];
  kenyaSpecificNotes: string[];
}

export const ISA_STANDARDS: Record<string, ISAStandard> = {
  'ISA-200': {
    isaNumber: 'ISA 200',
    title: 'Overall Objectives of the Independent Auditor',
    objective: 'Obtain reasonable assurance about whether financial statements are free from material misstatement, whether due to fraud or error, and to issue an auditor\'s report in accordance with ISA findings.',
    keyRequirements: [
      'Comply with all ISAs relevant to the audit',
      'Apply professional skepticism throughout the audit',
      'Apply professional judgement throughout the audit',
      'Obtain sufficient appropriate audit evidence',
    ],
    documentationRequirements: [
      'Evidence of compliance with relevant ethical requirements',
      'Conclusions on compliance with independence requirements',
    ],
    kenyaSpecificNotes: [
      'Auditors must be members of ICPAK in good standing',
      'Comply with ICPAK Code of Ethics for Professional Accountants',
      'Continuing Professional Development (CPD) requirement: 40 hours per year',
    ],
  },

  'ISA-210': {
    isaNumber: 'ISA 210',
    title: 'Agreeing the Terms of Audit Engagements',
    objective: 'Establish whether preconditions for an audit are present and confirm a common understanding between auditor and management of the terms of engagement.',
    keyRequirements: [
      'Determine if the financial reporting framework is acceptable',
      'Obtain agreement from management on its responsibilities',
      'Agree on terms of engagement in an audit engagement letter',
      'Re-confirm engagement terms for recurring audits if circumstances change',
    ],
    documentationRequirements: [
      'Signed audit engagement letter',
      'Documentation of preconditions for the audit',
    ],
    kenyaSpecificNotes: [
      'Companies Act 2015 (Cap 486) requires auditor appointment by shareholders',
      'Engagement letter must reference compliance with Kenyan law',
      'For regulated entities (banks, insurance), include reference to relevant regulator (CBK, IRA, RBA)',
    ],
  },

  'ISA-230': {
    isaNumber: 'ISA 230',
    title: 'Audit Documentation',
    objective: 'Prepare documentation that provides a sufficient and appropriate record of the basis for the auditor\'s report and evidence that the audit was planned and performed in accordance with ISAs.',
    keyRequirements: [
      'Document the overall audit strategy and audit plan',
      'Document nature, timing, and extent of procedures performed',
      'Document results of procedures and evidence obtained',
      'Document significant matters arising and conclusions reached',
      'Complete assembly of the final audit file within 60 days of audit report date',
    ],
    documentationRequirements: [
      'Overall audit strategy',
      'Audit plan with nature, timing, extent of procedures',
      'Working papers for all significant areas',
      'Communications with management and those charged with governance',
    ],
    kenyaSpecificNotes: [
      'Audit files must be retained for at least 7 years per ICPAK requirements',
      'For listed entities (NSE), additional documentation per CMA requirements',
    ],
  },

  'ISA-240': {
    isaNumber: 'ISA 240',
    title: 'Auditor\'s Responsibilities Relating to Fraud',
    objective: 'Identify and assess risks of material misstatement due to fraud, and obtain sufficient appropriate audit evidence regarding the assessed risks.',
    keyRequirements: [
      'Maintain professional skepticism throughout',
      'Discuss fraud risks with the engagement team',
      'Make inquiries of management about fraud risks',
      'Consider fraud risk factors (incentive/pressure, opportunity, rationalization)',
      'Presume revenue recognition is a fraud risk',
      'Presume management override of controls is a fraud risk',
      'Perform journal entry testing',
    ],
    documentationRequirements: [
      'Team discussion about fraud risks',
      'Fraud risk factors identified',
      'Assessed risks of material misstatement due to fraud',
      'Significant management override risks identified',
      'Results of journal entry testing',
    ],
    kenyaSpecificNotes: [
      'Kenya Fraud Risk Factors: procurement irregularities are HIGH risk in both public and private sector',
      'Mobile money (M-Pesa) transactions require specific audit procedures - review B2C/C2B statements',
      'Related party transactions are a significant fraud risk in family-owned businesses',
      'Cash handling is high risk - Kenya is still partially cash-based economy',
      'Ghost workers/payroll fraud is common in Kenyan entities - verify employee existence',
      'Under-declaration of revenue to KRA is a common fraud - reconcile with tax returns',
      'For county governments: procurement and payments fraud is extremely high risk per KENAO reports',
    ],
  },

  'ISA-260': {
    isaNumber: 'ISA 260',
    title: 'Communication with Those Charged with Governance',
    objective: 'Communicate auditor\'s responsibilities, planned scope and timing of audit, and significant findings to those charged with governance.',
    keyRequirements: [
      'Communicate auditor responsibilities and planned approach',
      'Communicate significant qualitative aspects of accounting practices',
      'Report significant difficulties encountered during audit',
      'Report significant matters arising during audit',
      'Report independence matters',
    ],
    documentationRequirements: [
      'Written communications to those charged with governance',
      'Oral communications - nature and date',
    ],
    kenyaSpecificNotes: [
      'For companies: Board of Directors or Audit Committee',
      'For NGOs: Board of Trustees or Governing Council',
      'For county governments: County Assembly and County Executive',
      'Management letter is the primary communication tool in Kenya',
    ],
  },

  'ISA-265': {
    isaNumber: 'ISA 265',
    title: 'Communicating Deficiencies in Internal Control',
    objective: 'Communicate significant deficiencies and material weaknesses in internal control identified during the audit to management and those charged with governance.',
    keyRequirements: [
      'Determine whether deficiencies identified constitute significant deficiencies or material weaknesses',
      'Communicate material weaknesses in writing to those charged with governance',
      'Communicate significant deficiencies in writing to management',
      'Include description, potential effects, and recommendations',
    ],
    documentationRequirements: [
      'Written communication of internal control deficiencies',
      'Management letter with findings',
    ],
    kenyaSpecificNotes: [
      'ICPAK requires management letter to be issued for all statutory audits',
      'Findings should follow Condition-Criteria-Cause-Effect-Recommendation (CCEER) format',
    ],
  },

  'ISA-300': {
    isaNumber: 'ISA 300',
    title: 'Planning an Audit of Financial Statements',
    objective: 'Plan the audit so that it will be performed in an effective manner by establishing the overall audit strategy and audit plan.',
    keyRequirements: [
      'Develop and document overall audit strategy',
      'Develop and document detailed audit plan',
      'Plan the nature, timing and extent of audit procedures',
      'Communicate with predecessor auditor if initial engagement',
      'Consider applicable financial reporting framework',
    ],
    documentationRequirements: [
      'Overall audit strategy',
      'Audit plan',
      'Any significant changes to strategy or plan during audit',
    ],
    kenyaSpecificNotes: [
      'Consider KRA tax compliance in planning - common audit findings relate to tax',
      'Consider industry-specific risks (e.g., NGOs: donor restrictions; SACCOs: CBK regulations)',
      'Plan around year-end closing dates - most Kenyan companies: 31 December or 30 June',
    ],
  },

  'ISA-315': {
    isaNumber: 'ISA 315',
    title: 'Identifying and Assessing the Risks of Material Misstatement (Revised 2019)',
    objective: 'Identify and assess risks of material misstatement at financial statement and assertion levels through understanding the entity and its environment, including internal control.',
    keyRequirements: [
      'Obtain understanding of the entity and its environment',
      'Obtain understanding of the applicable financial reporting framework',
      'Obtain understanding of entity\'s internal control (5 components: Control Environment, Risk Assessment, Control Activities, Information Systems, Monitoring)',
      'Identify and assess risks of material misstatement at financial statement and assertion level',
      'Identify significant risks requiring special audit consideration',
      'Assess risks that can only be addressed through substantive procedures',
    ],
    documentationRequirements: [
      'Discussion among engagement team',
      'Entity understanding documentation (industry, regulatory environment, operations, objectives)',
      'Internal control documentation',
      'Risk Assessment documentation - entity level and assertion level',
      'Identified significant risks and rationale',
    ],
    kenyaSpecificNotes: [
      'Entity understanding must include KRA compliance status',
      'For regulated entities: CBK (banks), IRA (insurance), RBA (pensions), CMA (listed)',
      'Related party transactions are a significant risk in most Kenyan private companies',
      'Consider owner-manager influence on financial reporting',
      'Kenya-specific industry risks: Agriculture (weather), Tourism (security), Real Estate (land title disputes)',
      'Public sector: PFMA 2012 compliance, procurement regulations (PPRA)',
    ],
  },

  'ISA-320': {
    isaNumber: 'ISA 320',
    title: 'Materiality in Planning and Performing an Audit',
    objective: 'Apply the concept of materiality in planning and performing the audit.',
    keyRequirements: [
      'Determine materiality for the financial statements as a whole',
      'Determine performance materiality',
      'Determine specific materiality for particular classes of transactions if applicable',
      'Determine clearly trivial threshold',
      'Revise materiality if information obtained during audit changes initial assessment',
    ],
    documentationRequirements: [
      'Materiality for financial statements as a whole',
      'Performance materiality',
      'Materiality for specific areas if applicable',
      'Revisions to materiality and reasons',
    ],
    kenyaSpecificNotes: [],
  },

  'ISA-330': {
    isaNumber: 'ISA 330',
    title: 'Auditor\'s Responses to Assessed Risks',
    objective: 'Design and implement appropriate responses to address assessed risks of material misstatement.',
    keyRequirements: [
      'Design and perform overall audit responses to address assessed risks at financial statement level',
      'Design and perform further audit procedures at assertion level',
      'Test operating effectiveness of controls when assessed at below high risk',
      'Design and perform substantive procedures for all material classes of transactions',
      'Perform substantive analytical procedures or tests of details (or both)',
    ],
    documentationRequirements: [
      'Overall responses to assessed risks at financial statement level',
      'Nature, timing and extent of further audit procedures',
      'Linkage of procedures to assessed risks',
      'Results of audit procedures',
      'Conclusions on sufficiency and appropriateness of evidence',
    ],
    kenyaSpecificNotes: [],
  },

  'ISA-450': {
    isaNumber: 'ISA 450',
    title: 'Evaluation of Misstatements Identified During the Audit',
    objective: 'Evaluate the effect of identified misstatements on the audit and the effect of uncorrected misstatements on the financial statements.',
    keyRequirements: [
      'Accumulate all identified misstatements',
      'Determine whether overall audit strategy and plan need revision',
      'Communicate misstatements to appropriate level of management',
      'Request management to correct all misstatements',
      'Evaluate whether uncorrected misstatements are material',
    ],
    documentationRequirements: [
      'Schedule of accumulated misstatements (corrected and uncorrected)',
      'Management confirmation of understanding of misstatements',
      'Conclusion on whether uncorrected misstatements are material',
    ],
    kenyaSpecificNotes: [],
  },

  'ISA-500': {
    isaNumber: 'ISA 500',
    title: 'Audit Evidence',
    objective: 'Design and perform audit procedures to obtain sufficient appropriate audit evidence to draw reasonable conclusions.',
    keyRequirements: [
      'Obtain sufficient appropriate audit evidence',
      'Use information produced by the entity with care',
      'Consider relevance and reliability of evidence',
      'Obtain evidence from primary and corroborating sources',
    ],
    documentationRequirements: [
      'Nature and sources of audit evidence obtained',
      'Conclusions drawn from evidence',
    ],
    kenyaSpecificNotes: [
      'M-Pesa statements are valid audit evidence - request from Safaricom',
      'Bank certificates from Kenyan banks are reliable third-party evidence',
      'KRA iTax portal printouts are acceptable evidence for tax obligations',
    ],
  },

  'ISA-505': {
    isaNumber: 'ISA 505',
    title: 'External Confirmations',
    objective: 'Design and perform external confirmation procedures to obtain relevant and reliable audit evidence.',
    keyRequirements: [
      'Determine whether external confirmations are necessary',
      'Maintain control over the confirmation process',
      'Send confirmations directly to confirming parties',
      'Evaluate results of confirmation procedures',
    ],
    documentationRequirements: [
      'Confirmation letters sent and received',
      'Analysis of non-responses and exceptions',
    ],
    kenyaSpecificNotes: [
      'Bank confirmations: Send to all banks where entity holds accounts',
      'Debtor/creditor confirmations are key for receivables/payables assertions',
      'Advocate\'s letter for legal matters is standard procedure',
    ],
  },

  'ISA-520': {
    isaNumber: 'ISA 520',
    title: 'Analytical Procedures',
    objective: 'Apply analytical procedures as substantive procedures and near the end of the audit to form an overall conclusion on financial statements.',
    keyRequirements: [
      'Perform analytical procedures near end of audit',
      'Investigate significant fluctuations or relationships inconsistent with other information',
      'Develop an expectation of recorded amounts before comparing',
    ],
    documentationRequirements: [
      'Expectation and basis for comparison',
      'Results of comparison',
      'Explanation of significant variances',
    ],
    kenyaSpecificNotes: [
      'Compare to industry averages: consider Kenya-specific industry benchmarks',
      'Ratio analysis: gross margin, operating margin, return on assets',
      'Period-over-period analysis: flag variances > 10% or > materiality',
    ],
  },

  'ISA-530': {
    isaNumber: 'ISA 530',
    title: 'Audit Sampling',
    objective: 'Use audit sampling to provide a reasonable basis for drawing conclusions about the population from which the sample is selected.',
    keyRequirements: [
      'Design appropriate sample size',
      'Select items in a manner that gives all items a chance of selection',
      'Perform audit procedures on selected items',
      'Evaluate sample results and extrapolate to population',
    ],
    documentationRequirements: [
      'Sampling approach and sample size',
      'Items selected',
      'Results of procedures performed',
      'Extrapolation of sample results to population',
    ],
    kenyaSpecificNotes: [],
  },

  'ISA-540': {
    isaNumber: 'ISA 540',
    title: 'Auditing Accounting Estimates and Related Disclosures (Revised)',
    objective: 'Obtain sufficient appropriate audit evidence about whether accounting estimates and related disclosures are reasonable.',
    keyRequirements: [
      'Understand how management makes accounting estimates',
      'Identify and assess risks related to estimates',
      'Review outcome of prior year estimates',
      'Evaluate whether estimates are reasonable',
      'Evaluate adequacy of disclosures',
    ],
    documentationRequirements: [
      'Understanding of management\'s estimation process',
      'Identified estimation uncertainty',
      'Procedures performed and conclusions',
    ],
    kenyaSpecificNotes: [
      'Common estimates in Kenya: loan loss provisions (banks), staff leave accruals, warranty provisions',
      'Property valuations require independent valuer - check if registered with Institution of Surveyors of Kenya (ISK)',
      'Depreciation rates: consider Kenyan tax rates vs. accounting rates (timing differences)',
    ],
  },

  'ISA-550': {
    isaNumber: 'ISA 550',
    title: 'Related Parties',
    objective: 'Perform procedures to identify, assess, and respond to risks of material misstatement arising from related party relationships and transactions.',
    keyRequirements: [
      'Understand entity\'s related party relationships and transactions',
      'Maintain alertness for undisclosed related parties',
      'Respond to identified significant related party transactions outside normal course',
      'Evaluate whether related parties are properly accounted for and disclosed',
    ],
    documentationRequirements: [
      'Names of identified related parties and relationships',
      'Transactions with related parties identified',
      'Assessment of risks from related party transactions',
    ],
    kenyaSpecificNotes: [
      'Related party transactions are extremely common and HIGH risk in Kenyan private companies',
      'Family-owned businesses: directors often transact with company - verify arm\'s length',
      'NSE listed companies: Related party disclosures are regulated by CMA',
      'Director loans are common - verify interest rates and disclosure',
    ],
  },

  'ISA-560': {
    isaNumber: 'ISA 560',
    title: 'Subsequent Events',
    objective: 'Obtain sufficient appropriate audit evidence about whether events occurring between the date of the financial statements and the date of the auditor\'s report are properly reflected.',
    keyRequirements: [
      'Perform procedures to identify subsequent events up to audit report date',
      'Respond to subsequent events that come to attention after audit report date but before financial statements issuance',
      'Consider effect of events after financial statements issuance',
    ],
    documentationRequirements: [
      'Procedures performed to identify subsequent events',
      'Subsequent events identified and their treatment',
    ],
    kenyaSpecificNotes: [
      'Consider KRA assessments received after year-end - common in Kenya',
      'Court judgments are significant subsequent events',
    ],
  },

  'ISA-570': {
    isaNumber: 'ISA 570',
    title: 'Going Concern (Revised)',
    objective: 'Obtain sufficient appropriate audit evidence about the appropriateness of management\'s use of the going concern assumption and conclude on whether material uncertainty about going concern exists.',
    keyRequirements: [
      'Evaluate management\'s assessment of going concern',
      'Identify going concern indicators',
      'Evaluate management\'s plans to address going concern issues',
      'Determine whether adequate disclosure of going concern uncertainty is made',
    ],
    documentationRequirements: [
      'Going concern indicators identified',
      'Management\'s plans reviewed',
      'Conclusion on going concern',
    ],
    kenyaSpecificNotes: [
      'Kenya going concern indicators: foreign exchange losses (shilling depreciation), high interest rates (CBR)',
      'Overdue KRA tax obligations are a significant going concern indicator',
      'Bank overdraft near limit or declined facility is going concern red flag',
      'For NGOs: expired donor agreements, reduction in donor funding',
      'For SACCOs: capital adequacy ratios below SACCO Societies Regulatory Authority (SASRA) minimum',
    ],
  },

  'ISA-580': {
    isaNumber: 'ISA 580',
    title: 'Written Representations',
    objective: 'Obtain written representations from management to confirm certain matters and support other audit evidence.',
    keyRequirements: [
      'Obtain written representations on matters material to financial statements',
      'Obtain representation that management has provided all information agreed',
      'Obtain representation on specific matters if required by other ISAs',
      'Address representations to the auditor, dated same as audit report',
    ],
    documentationRequirements: [
      'Signed management representation letter',
    ],
    kenyaSpecificNotes: [
      'Management rep letter must be signed by CEO and CFO/Finance Director',
      'Include specific representations on KRA compliance where material',
    ],
  },

  'ISA-700': {
    isaNumber: 'ISA 700',
    title: 'Forming an Opinion and Reporting on Financial Statements (Revised)',
    objective: 'Form an opinion on the financial statements based on evaluation of conclusions drawn from audit evidence and express that opinion clearly in a written report.',
    keyRequirements: [
      'Evaluate audit conclusions to form opinion',
      'Form unmodified opinion if financial statements are prepared in all material respects in accordance with applicable framework',
      'Use prescribed report format including: title, addressee, opinion, basis for opinion, responsibilities, signature, date',
      'Include statement on independence and ethical requirements',
    ],
    documentationRequirements: [
      'Final analytical review conclusions',
      'Evaluation of misstatements',
      'Summary of uncorrected misstatements',
    ],
    kenyaSpecificNotes: [
      'Audit reports in Kenya must state compliance with ISAs as adopted by ICPAK',
      'Reports must include ICPAK membership number of signing auditor',
      'For Companies Act compliance: report must address specific matters under Companies Act 2015',
      'Report date cannot precede date of signed financial statements',
    ],
  },

  'ISA-701': {
    isaNumber: 'ISA 701',
    title: 'Communicating Key Audit Matters',
    objective: 'Communicate key audit matters in the auditor\'s report to enhance the communicative value of the report by providing greater transparency.',
    keyRequirements: [
      'Required for listed entities (NSE listed companies)',
      'Determine key audit matters from significant risks, significant judgments, significant events',
      'Describe each key audit matter with: why it is a KAM, how it was addressed in the audit',
    ],
    documentationRequirements: [
      'Key audit matters identified',
      'Audit procedures addressing each KAM',
    ],
    kenyaSpecificNotes: [
      'Mandatory for NSE listed entities per CMA requirements',
      'Common KAMs in Kenya: impairment of goodwill, fair value of investment properties, revenue recognition, going concern',
    ],
  },

  'ISA-705': {
    isaNumber: 'ISA 705',
    title: 'Modifications to the Opinion in the Independent Auditor\'s Report (Revised)',
    objective: 'Address the auditor\'s responsibility to issue an appropriate report when the auditor concludes that modification to the auditor\'s opinion is necessary.',
    keyRequirements: [
      'Issue qualified opinion if: material misstatement OR unable to obtain sufficient evidence (but not pervasive)',
      'Issue adverse opinion if: material AND pervasive misstatement',
      'Issue disclaimer of opinion if: unable to obtain sufficient evidence AND effect could be material and pervasive',
      'Include "Basis for Qualified/Adverse/Disclaimer" paragraph',
    ],
    documentationRequirements: [
      'Basis for modification',
      'Communication with management and TCWG',
    ],
    kenyaSpecificNotes: [
      'Qualified opinions are common in Kenya\'s public sector (county governments)',
      'Basis for qualification must reference specific amounts and ISA requirement',
      'KENAO issues many qualified and adverse opinions on county government accounts',
    ],
  },

  'ISA-706': {
    isaNumber: 'ISA 706',
    title: 'Emphasis of Matter Paragraphs and Other Matter Paragraphs (Revised)',
    objective: 'Draw users\' attention to a matter appropriately presented or disclosed in the financial statements that is of fundamental importance, or to any other matter relevant to users.',
    keyRequirements: [
      'Include emphasis of matter paragraph for fundamental importance matters',
      'Include other matter paragraph for matters relevant to users not presented in financial statements',
      'Emphasis of matter paragraph placed immediately after basis for opinion',
    ],
    documentationRequirements: [],
    kenyaSpecificNotes: [
      'Common EOM in Kenya: going concern uncertainty, comparative figures restatement, change in accounting policy',
    ],
  },
};

// ─── Audit Areas and Assertions Mapping ──────────────────────────────────────

export interface AuditAreaDefinition {
  area: AuditArea;
  label: string;
  description: string;
  primaryISAs: string[];
  keyAssertions: Assertion[];
  typicalProcedures: string[];
  commonRisks: string[];
  kenyaSpecificRisks: string[];
  workingPaperRef: string; // e.g. "WP-REV"
}

export const AUDIT_AREAS: Record<AuditArea, AuditAreaDefinition> = {
  revenue: {
    area: 'revenue',
    label: 'Revenue',
    description: 'Audit of revenue recognition, sales, and other income',
    primaryISAs: ['ISA 240', 'ISA 315', 'ISA 330', 'ISA 520', 'ISA 530'],
    keyAssertions: ['occurrence', 'completeness', 'accuracy', 'cutoff', 'classification'] as Assertion[],
    typicalProcedures: [
      'Analytical procedures on revenue trends and gross margin',
      'Test of details on revenue transactions near year-end (cutoff)',
      'Review revenue recognition policy against IFRS 15',
      'Reconcile revenue to VAT returns filed with KRA',
      'Confirm significant customer balances',
      'Test journal entries to revenue accounts',
    ],
    commonRisks: [
      'Revenue cut-off errors (recording revenue in wrong period)',
      'Fictitious revenue (fraud risk - ISA 240)',
      'Incorrect revenue recognition (IFRS 15 compliance)',
    ],
    kenyaSpecificRisks: [
      'Under-declaration of revenue in tax returns vs financial statements',
      'Mobile money (M-Pesa) revenue not properly captured in books',
      'Cash sales not recorded - high risk in retail sector',
      'Revenue from county governments may be subject to withholding tax (WHT)',
    ],
    workingPaperRef: 'WP-REV',
  },

  expenses: {
    area: 'expenses',
    label: 'Operating Expenses',
    description: 'Audit of operating costs, administrative expenses, and other expenditure',
    primaryISAs: ['ISA 315', 'ISA 330', 'ISA 520', 'ISA 530'],
    keyAssertions: ['completeness', 'occurrence', 'accuracy', 'cutoff', 'classification'] as Assertion[],
    typicalProcedures: [
      'Analytical procedures on expense categories vs prior year and budget',
      'Test of details on significant expense transactions',
      'Verify expense authorization and supporting documentation',
      'Cut-off testing on expenses near year-end',
      'Verify accruals for expenses incurred but not paid',
      'Test journal entries to expense accounts',
    ],
    commonRisks: [
      'Fictitious expenses (fraud)',
      'Personal expenses charged to company',
      'Expenses cut-off errors',
    ],
    kenyaSpecificRisks: [
      'Director-related expenses (entertainment, travel) with no business purpose',
      'Procurement irregularities - goods not received but invoiced',
      'Inflated supplier invoices - related party suppliers',
      'Imprest/petty cash not properly accounted',
      'Withholding tax on payments to service providers - ensure deducted and remitted to KRA',
    ],
    workingPaperRef: 'WP-EXP',
  },

  receivables: {
    area: 'receivables',
    label: 'Trade Receivables & Debtors',
    description: 'Audit of trade debtors, other receivables, and provisions for bad debts',
    primaryISAs: ['ISA 315', 'ISA 330', 'ISA 505', 'ISA 520', 'ISA 540'],
    keyAssertions: ['existence', 'completeness', 'valuation', 'rights_and_obligations', 'presentation'] as Assertion[],
    typicalProcedures: [
      'Debtors circularization (external confirmation)',
      'Aged debtors analysis - assess provision adequacy',
      'Review subsequent receipts from debtors',
      'Review debtor concentration risk',
      'Analytical procedures: debtor days ratio vs prior year',
      'Verify bad debt write-offs authorization',
    ],
    commonRisks: [
      'Inadequate bad debt provision',
      'Fictitious debtors',
      'Overstatement of receivables',
    ],
    kenyaSpecificRisks: [
      'Government debtors (county/national) - high risk of non-payment',
      'Long overdue debts presented as current without adequate provision',
      'Debtors shared with related parties (intercompany not eliminated)',
      'Mobile money float accounts (M-Pesa till money) - verify balances',
    ],
    workingPaperRef: 'WP-REC',
  },

  payables: {
    area: 'payables',
    label: 'Trade Payables & Creditors',
    description: 'Audit of trade creditors, accruals, and other payables',
    primaryISAs: ['ISA 315', 'ISA 330', 'ISA 505', 'ISA 520'],
    keyAssertions: ['completeness', 'existence', 'accuracy', 'cutoff', 'classification'] as Assertion[],
    typicalProcedures: [
      'Creditor circularization (external confirmation)',
      'Supplier statement reconciliations',
      'Analytical procedures: creditor days vs prior year',
      'Cut-off testing - goods received before year-end invoiced after',
      'Verify accruals completeness',
      'Review long-outstanding creditors',
    ],
    commonRisks: [
      'Understated liabilities (completeness)',
      'Fictitious payables (fraud)',
    ],
    kenyaSpecificRisks: [
      'KRA penalties/interest not accrued',
      'NSSF/NHIF payroll deductions not remitted and not accrued',
      'VAT payable understated',
      'Loans from directors not disclosed as related party transactions',
    ],
    workingPaperRef: 'WP-PAY',
  },

  cash_and_bank: {
    area: 'cash_and_bank',
    label: 'Cash & Bank',
    description: 'Audit of cash balances, bank accounts, and cash management',
    primaryISAs: ['ISA 315', 'ISA 330', 'ISA 505', 'ISA 520'],
    keyAssertions: ['existence', 'completeness', 'accuracy', 'rights_and_obligations'] as Assertion[],
    typicalProcedures: [
      'Obtain bank certificates from all banks',
      'Prepare bank reconciliations for all accounts',
      'Verify outstanding cheques and deposits in transit',
      'Petty cash count and reconciliation',
      'Review bank mandates and signatories',
      'Review cash book for unusual transactions',
    ],
    commonRisks: [
      'Unrecorded bank accounts',
      'Kiting (manipulation between bank accounts)',
      'Petty cash misappropriation',
    ],
    kenyaSpecificRisks: [
      'M-Pesa/mobile money accounts not included in cash balance',
      'Multiple bank accounts with different banks - verify all included',
      'Dormant accounts with unrecorded balances',
      'Forex accounts - ensure correct translation at year-end rate',
      'Cheques drawn but not presented - verify with bank',
    ],
    workingPaperRef: 'WP-CASH',
  },

  fixed_assets: {
    area: 'fixed_assets',
    label: 'Fixed Assets (PPE)',
    description: 'Audit of property, plant and equipment, depreciation, and disposals',
    primaryISAs: ['ISA 315', 'ISA 330', 'ISA 500', 'ISA 520', 'ISA 540'],
    keyAssertions: ['existence', 'completeness', 'valuation', 'rights_and_obligations', 'presentation'] as Assertion[],
    typicalProcedures: [
      'Reconcile fixed asset register to general ledger',
      'Physical verification of material assets',
      'Verify depreciation calculations and rates',
      'Review capital vs. revenue expenditure classification',
      'Verify title/ownership documents (especially land and buildings)',
      'Review disposals and gains/losses on disposal',
      'Assess impairment indicators',
    ],
    commonRisks: [
      'Assets not in use still being depreciated',
      'Incorrect depreciation rates',
      'Unrecorded disposals',
    ],
    kenyaSpecificRisks: [
      'Land title issues - verify land title with Land Registry',
      'Assets used for personal benefit of directors/owners',
      'Fully depreciated assets still in use - consider whether useful life needs extension',
      'Revaluation of properties - ensure valuer is registered with ISK',
      'Leasehold improvements - verify lease terms and amortization period',
    ],
    workingPaperRef: 'WP-FA',
  },

  payroll: {
    area: 'payroll',
    label: 'Payroll & Staff Costs',
    description: 'Audit of salaries, wages, statutory deductions, and employee benefits',
    primaryISAs: ['ISA 240', 'ISA 315', 'ISA 330', 'ISA 520', 'ISA 530'],
    keyAssertions: ['occurrence', 'completeness', 'accuracy', 'cutoff'] as Assertion[],
    typicalProcedures: [
      'Verify employee existence (ghost worker check)',
      'Agree payroll to HR records and employment contracts',
      'Recompute PAYE deductions and verify remittance to KRA',
      'Recompute NSSF deductions and verify remittance',
      'Recompute NHIF deductions and verify remittance',
      'Analytical procedures: headcount and payroll cost vs prior year',
      'Review joiners and leavers during the year',
      'Verify leave accruals and gratuity provisions',
    ],
    commonRisks: [
      'Ghost workers on payroll',
      'Incorrect PAYE calculations',
      'Unreported employees',
    ],
    kenyaSpecificRisks: [
      'PAYE under-deduction - common audit finding triggering KRA penalties',
      'NSSF: Tier I and Tier II contributions per NSSF Act 2013 (contested provisions)',
      'NHIF rate changes - verify current rates applied',
      'Housing Levy: 1.5% of gross salary (Finance Act 2023) - verify deduction and remittance',
      'Casual workers not properly classified - should be on payroll if working > 3 months',
      'Director fees - subject to PAYE, verify gross-up',
    ],
    workingPaperRef: 'WP-PAY',
  },

  tax: {
    area: 'tax',
    label: 'Tax Compliance (KRA)',
    description: 'Audit of corporation tax, VAT, withholding tax, and KRA compliance',
    primaryISAs: ['ISA 315', 'ISA 330', 'ISA 500', 'ISA 540'],
    keyAssertions: ['completeness', 'accuracy', 'existence', 'valuation'] as Assertion[],
    typicalProcedures: [
      'Reconcile accounting profit to taxable profit',
      'Verify current tax computation and review for errors',
      'Verify deferred tax computation',
      'Review VAT returns for accuracy - reconcile to revenue',
      'Verify WHT deducted and remitted on applicable payments',
      'Check for outstanding KRA assessments or demands',
      'Verify corporation tax payments (installment tax dates and amounts)',
      'Review KRA iTax compliance status',
    ],
    commonRisks: [
      'Incorrect tax computations',
      'Unrecognized deferred tax liabilities',
      'Undisclosed KRA assessments',
    ],
    kenyaSpecificRisks: [
      'Corporation tax rate: 30% (resident companies), 37.5% (branches of foreign companies)',
      'Minimum tax: 1% of gross turnover (applicable if higher than normal tax) - Finance Act 2020',
      'Digital Service Tax (DST): 3% on gross transaction value for digital marketplace operators',
      'VAT rate: 16% standard, verify exempt and zero-rated transactions correctly classified',
      'Withholding Tax rates: dividends 5%, interest 15%, royalties 20%, professional fees 5% residents',
      'Tax return filing deadlines: income tax within 6 months of year-end, VAT by 20th of following month',
      'Housing Levy: AFHL - 1.5% employer contribution on gross payroll',
      'Capital Gains Tax: 15% on sale of property and shares (Finance Act 2023)',
      'Excise Duty: applicable for specified sectors (alcohol, tobacco, telecom, financial services)',
    ],
    workingPaperRef: 'WP-TAX',
  },

  equity: {
    area: 'equity',
    label: 'Equity & Capital',
    description: 'Audit of share capital, retained earnings, reserves, and dividends',
    primaryISAs: ['ISA 315', 'ISA 330', 'ISA 500'],
    keyAssertions: ['existence', 'completeness', 'accuracy', 'presentation'] as Assertion[],
    typicalProcedures: [
      'Agree opening balances to prior year audited financial statements',
      'Review share capital movements - agree to Companies Registry',
      'Verify dividend declarations and payments - agree to board minutes',
      'Reconcile retained earnings movement',
      'Review statutory reserves movements',
    ],
    commonRisks: [
      'Unauthorized share transfers',
      'Undisclosed dividend payments',
    ],
    kenyaSpecificRisks: [
      'Share transfer restrictions in Articles of Association - verify compliance',
      'Dividend withholding tax (5%) - verify deduction and remittance',
      'For companies with foreign shareholders: forex implications on dividends',
    ],
    workingPaperRef: 'WP-EQ',
  },

  provisions_and_liabilities: {
    area: 'provisions_and_liabilities',
    label: 'Provisions & Contingent Liabilities',
    description: 'Audit of provisions, contingent liabilities, and commitments',
    primaryISAs: ['ISA 315', 'ISA 330', 'ISA 500', 'ISA 501', 'ISA 540'],
    keyAssertions: ['completeness', 'existence', 'accuracy', 'valuation'] as Assertion[],
    typicalProcedures: [
      'Obtain list of legal proceedings from management',
      'Obtain advocate\'s letter confirming legal matters',
      'Assess adequacy of provisions against IAS 37',
      'Review board minutes for commitments and contingencies',
      'Review contracts for onerous provisions',
    ],
    commonRisks: [
      'Undisclosed contingent liabilities',
      'Inadequate provisions',
    ],
    kenyaSpecificRisks: [
      'Employment disputes - Employment Act 2007 creates significant termination provisions',
      'KRA assessments under appeal - disclose as contingent liability',
      'Court cases - very common in Kenya, ensure advocate\'s letter obtained',
      'Environmental liabilities for extractive industries',
    ],
    workingPaperRef: 'WP-PROV',
  },

  inventory: {
    area: 'inventory',
    label: 'Inventory & Stock',
    description: 'Audit of inventories, stock counts, and cost of goods sold',
    primaryISAs: ['ISA 315', 'ISA 330', 'ISA 501', 'ISA 520', 'ISA 540'],
    keyAssertions: ['existence', 'completeness', 'accuracy', 'valuation', 'cutoff'] as Assertion[],
    typicalProcedures: [
      'Attend physical stock count at year-end',
      'Test count results against count sheets',
      'Verify cut-off - goods received and dispatched at year-end',
      'Review inventory valuation - FIFO/weighted average',
      'Assess slow-moving and obsolete inventory provisions',
      'Reconcile stock records to general ledger',
    ],
    commonRisks: [
      'Inventory overstatement',
      'Inadequate obsolescence provision',
    ],
    kenyaSpecificRisks: [
      'Import duties and levies included in inventory cost (IAS 2)',
      'Temperature-sensitive goods (pharmaceuticals, food) - obsolescence risk',
      'Work-in-progress valuation in manufacturing',
    ],
    workingPaperRef: 'WP-INV',
  },

  investments: {
    area: 'investments',
    label: 'Investments & Financial Instruments',
    description: 'Audit of investments, loans receivable, and financial instruments',
    primaryISAs: ['ISA 315', 'ISA 330', 'ISA 500', 'ISA 540'],
    keyAssertions: ['existence', 'valuation', 'rights_and_obligations', 'presentation'] as Assertion[],
    typicalProcedures: [
      'Obtain investment statements from fund managers/brokers',
      'Verify fair value of investments',
      'Review impairment of investments',
      'Verify classification as FVTPL, FVOCI, or amortized cost per IFRS 9',
    ],
    commonRisks: [
      'Investments carried at cost when impaired',
      'Incorrect IFRS 9 classification',
    ],
    kenyaSpecificRisks: [
      'NSE-listed shares: obtain end-of-day prices from NSE website',
      'Government securities (T-bills, T-bonds): CBK is the registrar - obtain confirmation',
      'Unit trusts: obtain NAV from fund manager (CMA regulated)',
    ],
    workingPaperRef: 'WP-INV',
  },

  related_parties: {
    area: 'related_parties',
    label: 'Related Party Transactions',
    description: 'Audit of transactions with related parties and related party disclosures',
    primaryISAs: ['ISA 240', 'ISA 315', 'ISA 550'],
    keyAssertions: ['occurrence', 'completeness', 'accuracy', 'presentation'] as Assertion[],
    typicalProcedures: [
      'Obtain complete list of related parties from management',
      'Search for undisclosed related party transactions',
      'Verify arm\'s length pricing of related party transactions',
      'Assess adequacy of disclosures under IAS 24',
      'Obtain management representations on related parties',
    ],
    commonRisks: [
      'Undisclosed related party transactions',
      'Non-arm\'s length related party transactions',
    ],
    kenyaSpecificRisks: [
      'Director loans - very common, verify interest rates and disclosure',
      'Family members on payroll - verify performance of actual duties',
      'Intercompany balances in group structures - verify elimination in consolidation',
      'Transfer pricing: transactions between Kenyan entity and foreign related parties - KRA scrutiny',
    ],
    workingPaperRef: 'WP-RP',
  },

  going_concern: {
    area: 'going_concern',
    label: 'Going Concern',
    description: 'Assessment of the entity\'s ability to continue as a going concern',
    primaryISAs: ['ISA 315', 'ISA 570'],
    keyAssertions: ['presentation', 'valuation'] as Assertion[],
    typicalProcedures: [
      'Review management\'s going concern assessment',
      'Review cash flow forecasts for next 12 months',
      'Review banking facilities and covenants',
      'Review overdue liabilities and creditor pressure',
      'Assess adequacy of going concern disclosures',
    ],
    commonRisks: [
      'Inadequate going concern assessment by management',
      'Failure to identify going concern issues',
    ],
    kenyaSpecificRisks: [
      'High interest rate environment in Kenya affects viability',
      'Kenya shilling depreciation - forex losses can be significant',
      'Overdue KRA obligations triggering enforcement action',
      'Bank facility cancellation due to covenant breaches',
    ],
    workingPaperRef: 'WP-GC',
  },

  opening_balances: {
    area: 'opening_balances',
    label: 'Opening Balances',
    description: 'Verification of opening balances for new engagements',
    primaryISAs: ['ISA 510'],
    keyAssertions: ['existence', 'completeness', 'accuracy'] as Assertion[],
    typicalProcedures: [
      'Review prior year audited financial statements',
      'Communicate with predecessor auditor',
      'Verify opening balances agree to prior year closing balances',
      'Assess whether accounting policies consistently applied',
    ],
    commonRisks: [
      'Misstatement of opening balances',
      'Change in accounting policies not properly disclosed',
    ],
    kenyaSpecificRisks: [],
    workingPaperRef: 'WP-OB',
  },
};

// ─── Materiality Benchmarks ───────────────────────────────────────────────────

export interface MaterialityBenchmark {
  entityType: string;
  benchmark: string;
  percentage: number;
  notes: string;
}

export const MATERIALITY_BENCHMARKS: MaterialityBenchmark[] = [
  {
    entityType: 'Profit-oriented companies (general)',
    benchmark: 'Profit before tax',
    percentage: 5,
    notes: 'Use 5% of normalised PBT. If PBT is loss or abnormal, use alternative base.',
  },
  {
    entityType: 'Profit-oriented companies (alternative)',
    benchmark: 'Total revenue',
    percentage: 0.5,
    notes: 'Use 0.5-1% of revenue when PBT is not representative.',
  },
  {
    entityType: 'NGOs / Not-for-profit',
    benchmark: 'Total expenditure',
    percentage: 1,
    notes: 'Use 0.5-2% of total expenditure. Consider donor restrictions separately.',
  },
  {
    entityType: 'SACCOs',
    benchmark: 'Total assets',
    percentage: 0.5,
    notes: 'Use 0.25-0.5% of total assets. Consider SASRA regulatory thresholds.',
  },
  {
    entityType: 'County governments',
    benchmark: 'Total budget/expenditure',
    percentage: 1,
    notes: 'Use 0.5-1% of total budget. Consider PFMA 2012 materiality thresholds.',
  },
  {
    entityType: 'Banks / Financial institutions',
    benchmark: 'Total assets',
    percentage: 0.25,
    notes: 'Use 0.1-0.25% of total assets. Consider CBK capital adequacy thresholds.',
  },
];

// ─── Plan Limits ──────────────────────────────────────────────────────────────

export const PLAN_LIMITS = {
  free: {
    maxClients: 5,
    maxEngagementsPerMonth: 3,
    maxMembers: 1,
    maxFileSizeMb: 10,
    aiProvider: 'anthropic' as const,
    aiModel: 'claude-haiku-4-5-20251001', // Haiku for free tier - fast and cheap
    features: ['basic_working_papers', 'risk_assessment', 'materiality_calculator'],
  },
  pro: {
    maxClients: 30,
    maxEngagementsPerMonth: 30,
    maxMembers: 3,
    maxFileSizeMb: 50,
    aiProvider: 'anthropic' as const,
    aiModel: 'claude-sonnet-4-6', // Sonnet for Pro - best quality/cost
    features: [
      'basic_working_papers', 'risk_assessment', 'materiality_calculator',
      'audit_report_drafting', 'management_letter', 'kra_compliance_check',
      'findings_generator', 'document_ocr', 'pdf_export',
    ],
    priceKes: 2500,
    pricePeriodDays: 30,
  },
  firm: {
    maxClients: 200,
    maxEngagementsPerMonth: 200,
    maxMembers: 10,
    maxFileSizeMb: 100,
    aiProvider: 'anthropic' as const,
    aiModel: 'claude-sonnet-4-6',
    features: [
      'basic_working_papers', 'risk_assessment', 'materiality_calculator',
      'audit_report_drafting', 'management_letter', 'kra_compliance_check',
      'findings_generator', 'document_ocr', 'pdf_export',
      'team_collaboration', 'partner_review', 'custom_templates', 'api_access',
    ],
    priceKes: 8000,
    pricePeriodDays: 30,
  },
  enterprise: {
    maxClients: 999999,
    maxEngagementsPerMonth: 999999,
    maxMembers: 999999,
    maxFileSizeMb: 200,
    aiProvider: 'anthropic' as const,
    aiModel: 'claude-opus-4-5',
    features: ['all'],
    priceKes: 0, // Custom pricing
    pricePeriodDays: 365,
  },
};

// ─── Kenyan Tax Rates (current) ───────────────────────────────────────────────

export const KENYA_TAX_RATES = {
  corporateTax: {
    resident: 0.30,
    branch: 0.375,
    newManufacturing: 0.15, // EPZ/SEZ for first 10 years
  },
  minimumTax: {
    rate: 0.01, // 1% of gross turnover (Finance Act 2020)
    note: 'Applies when 1% of gross turnover > normal tax. Exempt: companies with tax loss for 5+ years.',
  },
  vat: {
    standard: 0.16,
    zeroRated: 0,
    exempt: null,
  },
  withholdingTax: {
    dividendsResident: 0.05,
    dividendsNonResident: 0.10,
    interestResident: 0.15,
    interestNonResident: 0.15,
    royaltiesResident: 0.05,
    royaltiesNonResident: 0.20,
    professionalFeesResident: 0.05,
    professionalFeesNonResident: 0.20,
    constructionResident: 0.03,
    managementFeesNonResident: 0.20,
  },
  paye: {
    note: 'Progressive rates: 10%, 25%, 30%, 32.5%, 35% on income bands. Personal relief KES 28,800/year.',
    housingLevy: 0.015, // 1.5% employee, 1.5% employer
  },
  capitalGainsTax: {
    rate: 0.15, // Finance Act 2023
    applicableTo: ['sale of land', 'sale of buildings', 'sale of shares'],
  },
  nssf: {
    tierI: 360, // KES per month (Lower Earnings Limit)
    tierII: 'Contested - refer to NSSF Act 2013 and court rulings',
  },
  nhif: {
    note: 'SHIF replaced NHIF from Oct 2023: 2.75% of gross salary',
    shif: 0.0275,
  },
};
