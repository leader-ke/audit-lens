import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  decimal,
  pgEnum,
  uuid,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const planEnum = pgEnum('plan', ['free', 'pro', 'firm', 'enterprise']);
export const orgRoleEnum = pgEnum('org_role', ['owner', 'partner', 'manager', 'senior', 'junior', 'viewer']);
export const entityTypeEnum = pgEnum('entity_type', [
  'limited_company', 'public_company', 'ngo', 'sacco', 'county_government',
  'national_government', 'parastatals', 'church', 'school', 'bank', 'insurance', 'other'
]);
export const auditTypeEnum = pgEnum('audit_type', [
  'statutory', 'internal', 'special_purpose', 'review', 'compilation',
  'forensic', 'tax', 'compliance', 'performance'
]);
export const engagementStatusEnum = pgEnum('engagement_status', [
  'planning', 'fieldwork', 'completion', 'reporting', 'signed_off', 'archived'
]);
export const documentTypeEnum = pgEnum('document_type', [
  'trial_balance', 'financial_statements', 'bank_statements', 'gl_extract',
  'payroll_register', 'fixed_asset_register', 'board_minutes', 'contracts',
  'tax_returns', 'management_accounts', 'correspondence', 'other'
]);
export const fileStatusEnum = pgEnum('file_status', ['pending', 'processing', 'done', 'failed']);
export const auditAreaEnum = pgEnum('audit_area', [
  'revenue', 'expenses', 'receivables', 'payables', 'cash_and_bank',
  'fixed_assets', 'payroll', 'tax', 'equity', 'provisions_and_liabilities',
  'inventory', 'investments', 'related_parties', 'going_concern', 'opening_balances'
]);
export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high', 'significant']);
export const assertionEnum = pgEnum('assertion', [
  'existence', 'completeness', 'accuracy', 'cutoff',
  'classification', 'presentation', 'valuation', 'rights_and_obligations'
]);
export const findingSeverityEnum = pgEnum('finding_severity', [
  'material_weakness', 'significant_deficiency', 'other_matter', 'observation'
]);
export const findingStatusEnum = pgEnum('finding_status', [
  'open', 'management_responded', 'resolved', 'not_accepted'
]);
export const reportTypeEnum = pgEnum('report_type', [
  'unmodified', 'qualified', 'adverse', 'disclaimer'
]);
export const paymentProviderEnum = pgEnum('payment_provider', ['mpesa', 'intasend', 'stripe']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'success', 'failed', 'cancelled']);
export const aiProviderEnum = pgEnum('ai_provider', ['groq', 'openai', 'anthropic', 'ollama']);

// ─── Organizations (Audit Firms) ─────────────────────────────────────────────

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  icpakFirmNumber: text('icpak_firm_number'),
  plan: planEnum('plan').notNull().default('free'),
  subscriptionStartDate: timestamp('subscription_start_date'),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  maxClients: integer('max_clients').notNull().default(5),
  maxEngagementsPerMonth: integer('max_engagements_per_month').notNull().default(3),
  maxMembers: integer('max_members').notNull().default(1),
  maxFileSizeMb: integer('max_file_size_mb').notNull().default(10),
  aiProvider: aiProviderEnum('ai_provider').notNull().default('anthropic'),
  aiModel: text('ai_model').notNull().default('claude-sonnet-4-6'),
  aiApiKeyEncrypted: text('ai_api_key_encrypted'),
  subscriptionRemindersSent: jsonb('subscription_reminders_sent').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('org_plan_idx').on(t.plan),
  index('org_subscription_idx').on(t.subscriptionExpiresAt),
]);

// ─── Users (Auditors) ─────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  fullName: text('full_name').notNull(),
  icpakNumber: text('icpak_number'),
  county: text('county'),
  defaultAiProvider: aiProviderEnum('default_ai_provider').default('anthropic'),
  defaultAiModel: text('default_ai_model').default('claude-sonnet-4-6'),
  notificationPrefs: jsonb('notification_prefs').default({
    engagementReminders: true,
    findingAlerts: true,
    subscriptionAlerts: true,
    aiCompleteAlerts: true,
  }),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('users_email_idx').on(t.email),
]);

// ─── Organization Members ─────────────────────────────────────────────────────

export const organizationMembers = pgTable('organization_members', {
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: orgRoleEnum('role').notNull().default('junior'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('org_members_org_idx').on(t.orgId),
  index('org_members_user_idx').on(t.userId),
]);

// ─── Clients (Entities Being Audited) ────────────────────────────────────────

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  entityType: entityTypeEnum('entity_type').notNull().default('limited_company'),
  registrationNumber: text('registration_number'),
  kraPin: text('kra_pin'),
  industry: text('industry'),
  financialYearEnd: text('financial_year_end'), // e.g. "31 December" or "30 June"
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  address: text('address'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('clients_org_idx').on(t.orgId),
]);

// ─── Engagements ─────────────────────────────────────────────────────────────

export const engagements = pgTable('engagements', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id),
  assignedPartner: uuid('assigned_partner').references(() => users.id),
  assignedManager: uuid('assigned_manager').references(() => users.id),
  engagementRef: text('engagement_ref'), // e.g. "2024/ABC/001"
  financialYearStart: timestamp('financial_year_start').notNull(),
  financialYearEnd: timestamp('financial_year_end').notNull(),
  auditType: auditTypeEnum('audit_type').notNull().default('statutory'),
  status: engagementStatusEnum('status').notNull().default('planning'),
  // Materiality
  materialityAmount: decimal('materiality_amount', { precision: 15, scale: 2 }),
  materialityBasis: text('materiality_basis'), // e.g. "5% of revenue"
  performanceMateriality: decimal('performance_materiality', { precision: 15, scale: 2 }),
  trivialThreshold: decimal('trivial_threshold', { precision: 15, scale: 2 }),
  // AI
  aiRiskSummary: text('ai_risk_summary'),
  readinessScore: integer('readiness_score'), // 0-100
  // Dates
  plannedStartDate: timestamp('planned_start_date'),
  plannedEndDate: timestamp('planned_end_date'),
  actualStartDate: timestamp('actual_start_date'),
  signedOffAt: timestamp('signed_off_at'),
  signedOffBy: uuid('signed_off_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('engagements_org_idx').on(t.orgId),
  index('engagements_client_idx').on(t.clientId),
  index('engagements_status_idx').on(t.status),
]);

// ─── Engagement Files ─────────────────────────────────────────────────────────

export const engagementFiles = pgTable('engagement_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  blobUrl: text('blob_url').notNull(),
  documentType: documentTypeEnum('document_type').notNull().default('other'),
  extractedText: text('extracted_text'), // AES-256-GCM encrypted
  pageCount: integer('page_count'),
  processingStatus: fileStatusEnum('processing_status').notNull().default('pending'),
  processingError: text('processing_error'),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('files_engagement_idx').on(t.engagementId),
  index('files_status_idx').on(t.processingStatus),
]);

// ─── Extracted Financials (Trial Balance Data) ────────────────────────────────

export const extractedFinancials = pgTable('extracted_financials', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  accountCode: text('account_code'),
  accountName: text('account_name').notNull(),
  accountType: text('account_type').notNull(), // asset/liability/equity/revenue/expense
  auditArea: auditAreaEnum('audit_area'),
  currentYearBalance: decimal('current_year_balance', { precision: 15, scale: 2 }).notNull(),
  priorYearBalance: decimal('prior_year_balance', { precision: 15, scale: 2 }),
  varianceAmount: decimal('variance_amount', { precision: 15, scale: 2 }),
  variancePct: decimal('variance_pct', { precision: 8, scale: 2 }),
  isMaterial: boolean('is_material').notNull().default(false),
  isFlagged: boolean('is_flagged').notNull().default(false),
  flagReason: text('flag_reason'),
  // Mapper provenance - stored so downstream consumers can cite the source of any category claim
  fsCategory: text('fs_category'),                                                 // e.g. 'SHARE_CAPITAL', 'LT_BORROWINGS'
  mappingConfidence: decimal('mapping_confidence', { precision: 4, scale: 3 }),   // 0.000–1.000
  matchedLayer: integer('matched_layer'),                                          // 1–5
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('financials_engagement_idx').on(t.engagementId),
]);

// ─── Working Papers ───────────────────────────────────────────────────────────

export const workingPapers = pgTable('working_papers', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  auditArea: auditAreaEnum('audit_area').notNull(),
  paperRef: text('paper_ref'), // e.g. "WP-REV-01"
  title: text('title').notNull(),
  isaReference: text('isa_reference'), // e.g. "ISA 520, ISA 330"
  content: text('content'), // Full working paper content (markdown)
  aiGenerated: boolean('ai_generated').notNull().default(true),
  aiProvider: aiProviderEnum('ai_provider'),
  aiModel: text('ai_model'),
  reviewed: boolean('reviewed').notNull().default(false),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  approved: boolean('approved').notNull().default(false),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  version: integer('version').notNull().default(1),
  sourceCitations: jsonb('source_citations').default([]),
  generationStatus: text('generation_status').notNull().default('idle'), // idle | generating | done | error
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('wp_engagement_idx').on(t.engagementId),
  index('wp_area_idx').on(t.auditArea),
]);

// ─── Risk Assessments (ISA 315) ───────────────────────────────────────────────

export const riskAssessments = pgTable('risk_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  riskType: text('risk_type').notNull(), // 'entity_level' | 'assertion_level' | 'fraud'
  auditArea: auditAreaEnum('audit_area'),
  assertion: assertionEnum('assertion'),
  riskDescription: text('risk_description').notNull(),
  riskFactor: text('risk_factor'), // what drives this risk
  inherentRisk: riskLevelEnum('inherent_risk').notNull().default('medium'),
  controlRisk: riskLevelEnum('control_risk').notNull().default('medium'),
  detectionRisk: riskLevelEnum('detection_risk').notNull().default('medium'),
  auditResponse: text('audit_response'), // how to address this risk
  isaReference: text('isa_reference'),
  aiGenerated: boolean('ai_generated').notNull().default(true),
  verified: boolean('verified').notNull().default(false),
  verifiedBy: uuid('verified_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('risks_engagement_idx').on(t.engagementId),
]);

// ─── Audit Findings ───────────────────────────────────────────────────────────

export const auditFindings = pgTable('audit_findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  findingRef: text('finding_ref'), // e.g. "F-2024-001"
  auditArea: auditAreaEnum('audit_area'),
  severity: findingSeverityEnum('severity').notNull().default('other_matter'),
  title: text('title').notNull(),
  condition: text('condition').notNull(), // What we found
  criteria: text('criteria').notNull(),   // What the standard requires
  cause: text('cause'),                   // Why it happened
  effect: text('effect').notNull(),        // What's the impact/risk
  recommendation: text('recommendation').notNull(),
  managementResponse: text('management_response'),
  agreedActionDate: timestamp('agreed_action_date'),
  status: findingStatusEnum('status').notNull().default('open'),
  aiGenerated: boolean('ai_generated').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('findings_engagement_idx').on(t.engagementId),
  index('findings_status_idx').on(t.status),
]);

// ─── Management Letters ───────────────────────────────────────────────────────

export const managementLetters = pgTable('management_letters', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  // Structured findings array: { area, deficiency, risk, rootCause, recommendation, priority, managementResponse }
  findings: jsonb('findings').default([]),
  introduction: text('introduction'),
  conclusion: text('conclusion'),
  fullLetterContent: text('full_letter_content'),
  isDraft: boolean('is_draft').notNull().default(true),
  aiGenerated: boolean('ai_generated').notNull().default(true),
  version: integer('version').notNull().default(1),
  generationStatus: text('generation_status').notNull().default('idle'), // idle | generating | done | error
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('mgmt_letter_engagement_idx').on(t.engagementId),
]);

// ─── Audit Reports ────────────────────────────────────────────────────────────

export const auditReports = pgTable('audit_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  reportType: reportTypeEnum('report_type').notNull().default('unmodified'),
  // Sections
  addressee: text('addressee'),
  opinionParagraph: text('opinion_paragraph'),
  basisOfOpinion: text('basis_of_opinion'),
  keyAuditMatters: jsonb('key_audit_matters').default([]),
  responsibilitiesOfManagement: text('responsibilities_of_management'),
  auditorResponsibilities: text('auditor_responsibilities'),
  otherReportingResponsibilities: text('other_reporting_responsibilities'),
  emphasisOfMatter: text('emphasis_of_matter'),
  fullReportContent: text('full_report_content'), // complete formatted report
  // Metadata
  isDraft: boolean('is_draft').notNull().default(true),
  aiGenerated: boolean('ai_generated').notNull().default(true),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  version: integer('version').notNull().default(1),
  generationStatus: text('generation_status').notNull().default('idle'), // idle | generating | done | error
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('reports_engagement_idx').on(t.engagementId),
]);

// ─── Engagement Letters (ISA 210) ────────────────────────────────────────────

export const engagementLetters = pgTable('engagement_letters', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  introduction: text('introduction'),
  financialStatementsComponents: text('financial_statements_components'),
  scope: text('scope'),
  managementResponsibilities: text('management_responsibilities'),
  auditorResponsibilities: text('auditor_responsibilities'),
  limitationOfAuditRisk: text('limitation_of_audit_risk'),
  reportingClause: text('reporting_clause'),
  feesClause: text('fees_clause'),
  independenceStatement: text('independence_statement'),
  confidentialityClause: text('confidentiality_clause'),
  liabilityClause: text('liability_clause'),
  governingLawClause: text('governing_law_clause'),
  otherMatters: text('other_matters'),
  acceptanceBlock: text('acceptance_block'),
  fullLetterContent: text('full_letter_content'),
  isDraft: boolean('is_draft').notNull().default(true),
  aiGenerated: boolean('ai_generated').notNull().default(true),
  version: integer('version').notNull().default(1),
  generationStatus: text('generation_status').notNull().default('idle'), // idle | generating | done | error
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('eng_letter_engagement_idx').on(t.engagementId),
]);

// ─── Filing Deadlines ─────────────────────────────────────────────────────────

export const filingDeadlines = pgTable('filing_deadlines', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  deadlineType: text('deadline_type').notNull(),
  label: text('label').notNull(),
  authority: text('authority').notNull(),
  dueDate: timestamp('due_date').notNull(),
  status: text('status').notNull().default('pending'), // pending | filed | overdue | not_applicable
  notes: text('notes'),
  filedDate: timestamp('filed_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('filing_deadlines_engagement_idx').on(t.engagementId),
]);

// ─── Bank Reconciliations ─────────────────────────────────────────────────────

export const bankReconciliations = pgTable('bank_reconciliations', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  accountName: text('account_name').notNull().default('Cash & Bank'),
  bankClosingBalance: decimal('bank_closing_balance', { precision: 15, scale: 2 }),
  tbCashBalance: decimal('tb_cash_balance', { precision: 15, scale: 2 }),
  difference: decimal('difference', { precision: 15, scale: 2 }),
  transactions: jsonb('transactions').default([]),
  matchedItems: jsonb('matched_items').default([]),
  unmatchedBankItems: jsonb('unmatched_bank_items').default([]),
  unmatchedTbItems: jsonb('unmatched_tb_items').default([]),
  isReconciled: boolean('is_reconciled').notNull().default(false),
  notes: text('notes'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('bank_recon_engagement_idx').on(t.engagementId),
]);

// ─── KRA iTax Reconciliations ─────────────────────────────────────────────────

export const itaxReconciliations = pgTable('itax_reconciliations', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  taxYear: integer('tax_year').notNull(),
  vatRevenueBase: decimal('vat_revenue_base', { precision: 15, scale: 2 }),
  vatExpectedOutput: decimal('vat_expected_output', { precision: 15, scale: 2 }),
  vatPerTb: decimal('vat_per_tb', { precision: 15, scale: 2 }),
  vatDifference: decimal('vat_difference', { precision: 15, scale: 2 }),
  vatObservations: jsonb('vat_observations').default([]),
  payePayrollBase: decimal('paye_payroll_base', { precision: 15, scale: 2 }),
  payePerTb: decimal('paye_per_tb', { precision: 15, scale: 2 }),
  payeDifference: decimal('paye_difference', { precision: 15, scale: 2 }),
  payeObservations: jsonb('paye_observations').default([]),
  corpTaxPbt: decimal('corp_tax_pbt', { precision: 15, scale: 2 }),
  corpTaxExpected: decimal('corp_tax_expected', { precision: 15, scale: 2 }),
  corpTaxPerTb: decimal('corp_tax_per_tb', { precision: 15, scale: 2 }),
  corpTaxDifference: decimal('corp_tax_difference', { precision: 15, scale: 2 }),
  corpTaxObservations: jsonb('corp_tax_observations').default([]),
  overallRiskLevel: text('overall_risk_level').default('medium'),
  riskNature: text('risk_nature').default('none'),
  summary: text('summary'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('itax_recon_engagement_idx').on(t.engagementId),
]);

// ─── Client Portal ────────────────────────────────────────────────────────────

export const clientPortalTokens = pgTable('client_portal_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  clientEmail: text('client_email'),
  clientName: text('client_name'),
  permissions: jsonb('permissions').default({ view_documents: true, upload_documents: true, respond_findings: true }),
  expiresAt: timestamp('expires_at'),
  lastAccessedAt: timestamp('last_accessed_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('portal_tokens_engagement_idx').on(t.engagementId),
]);

export const documentRequests = pgTable('document_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  documentType: text('document_type'),
  isRequired: boolean('is_required').notNull().default(true),
  status: text('status').notNull().default('pending'), // pending | received | not_available
  dueDate: timestamp('due_date'),
  clientResponse: text('client_response'),
  fulfilledFileId: uuid('fulfilled_file_id').references(() => engagementFiles.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('doc_requests_engagement_idx').on(t.engagementId),
]);

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  provider: paymentProviderEnum('provider').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  amountKes: integer('amount_kes').notNull(),
  planPurchased: planEnum('plan_purchased').notNull(),
  periodDays: integer('period_days').notNull().default(30),
  // M-Pesa
  mpesaPhone: text('mpesa_phone'),
  mpesaCheckoutRequestId: text('mpesa_checkout_request_id'),
  mpesaMerchantRequestId: text('mpesa_merchant_request_id'),
  mpesaReceiptNumber: text('mpesa_receipt_number'),
  // IntaSend
  intasendInvoiceId: text('intasend_invoice_id'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('payments_org_idx').on(t.orgId),
  index('payments_status_idx').on(t.status),
]);

// ─── Usage Logs ───────────────────────────────────────────────────────────────

export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  engagementId: uuid('engagement_id').references(() => engagements.id),
  action: text('action').notNull(), // 'working_paper_generate' | 'risk_assess' | 'report_draft' | 'document_process'
  auditArea: auditAreaEnum('audit_area'),
  aiProvider: aiProviderEnum('ai_provider'),
  aiModel: text('ai_model'),
  tokensUsed: integer('tokens_used'),
  processingTimeMs: integer('processing_time_ms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('usage_org_idx').on(t.orgId),
  index('usage_created_idx').on(t.createdAt),
]);

// ─── Audit Logs (Immutable) ───────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  userId: uuid('user_id'),
  engagementId: uuid('engagement_id'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  details: jsonb('details').default({}),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('audit_logs_org_idx').on(t.orgId),
  index('audit_logs_created_idx').on(t.createdAt),
]);

// ─── Relations ────────────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  clients: many(clients),
  engagements: many(engagements),
  payments: many(payments),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  org: one(organizations, { fields: [organizationMembers.orgId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  org: one(organizations, { fields: [clients.orgId], references: [organizations.id] }),
  engagements: many(engagements),
}));

export const engagementsRelations = relations(engagements, ({ one, many }) => ({
  org: one(organizations, { fields: [engagements.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [engagements.clientId], references: [clients.id] }),
  files: many(engagementFiles),
  financials: many(extractedFinancials),
  workingPapers: many(workingPapers),
  riskAssessments: many(riskAssessments),
  findings: many(auditFindings),
  reports: many(auditReports),
  managementLetters: many(managementLetters),
  engagementLetters: many(engagementLetters),
  filingDeadlines: many(filingDeadlines),
  bankReconciliations: many(bankReconciliations),
  itaxReconciliations: many(itaxReconciliations),
  portalTokens: many(clientPortalTokens),
  documentRequests: many(documentRequests),
}));

export const engagementFilesRelations = relations(engagementFiles, ({ one }) => ({
  engagement: one(engagements, { fields: [engagementFiles.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [engagementFiles.orgId], references: [organizations.id] }),
}));

export const extractedFinancialsRelations = relations(extractedFinancials, ({ one }) => ({
  engagement: one(engagements, { fields: [extractedFinancials.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [extractedFinancials.orgId], references: [organizations.id] }),
}));

export const workingPapersRelations = relations(workingPapers, ({ one }) => ({
  engagement: one(engagements, { fields: [workingPapers.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [workingPapers.orgId], references: [organizations.id] }),
}));

export const riskAssessmentsRelations = relations(riskAssessments, ({ one }) => ({
  engagement: one(engagements, { fields: [riskAssessments.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [riskAssessments.orgId], references: [organizations.id] }),
}));

export const auditFindingsRelations = relations(auditFindings, ({ one }) => ({
  engagement: one(engagements, { fields: [auditFindings.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [auditFindings.orgId], references: [organizations.id] }),
}));

export const auditReportsRelations = relations(auditReports, ({ one }) => ({
  engagement: one(engagements, { fields: [auditReports.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [auditReports.orgId], references: [organizations.id] }),
}));

export const managementLettersRelations = relations(managementLetters, ({ one }) => ({
  engagement: one(engagements, { fields: [managementLetters.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [managementLetters.orgId], references: [organizations.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  org: one(organizations, { fields: [payments.orgId], references: [organizations.id] }),
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));

export const engagementLettersRelations = relations(engagementLetters, ({ one }) => ({
  engagement: one(engagements, { fields: [engagementLetters.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [engagementLetters.orgId], references: [organizations.id] }),
}));

export const filingDeadlinesRelations = relations(filingDeadlines, ({ one }) => ({
  engagement: one(engagements, { fields: [filingDeadlines.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [filingDeadlines.orgId], references: [organizations.id] }),
}));

export const bankReconciliationsRelations = relations(bankReconciliations, ({ one }) => ({
  engagement: one(engagements, { fields: [bankReconciliations.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [bankReconciliations.orgId], references: [organizations.id] }),
}));

export const itaxReconciliationsRelations = relations(itaxReconciliations, ({ one }) => ({
  engagement: one(engagements, { fields: [itaxReconciliations.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [itaxReconciliations.orgId], references: [organizations.id] }),
}));

export const clientPortalTokensRelations = relations(clientPortalTokens, ({ one }) => ({
  engagement: one(engagements, { fields: [clientPortalTokens.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [clientPortalTokens.orgId], references: [organizations.id] }),
}));

export const documentRequestsRelations = relations(documentRequests, ({ one }) => ({
  engagement: one(engagements, { fields: [documentRequests.engagementId], references: [engagements.id] }),
  org: one(organizations, { fields: [documentRequests.orgId], references: [organizations.id] }),
}));
