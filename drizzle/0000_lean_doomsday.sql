CREATE TYPE "public"."ai_provider" AS ENUM('groq', 'openai', 'anthropic', 'ollama');--> statement-breakpoint
CREATE TYPE "public"."assertion" AS ENUM('existence', 'completeness', 'accuracy', 'cutoff', 'classification', 'presentation', 'valuation', 'rights_and_obligations');--> statement-breakpoint
CREATE TYPE "public"."audit_area" AS ENUM('revenue', 'expenses', 'receivables', 'payables', 'cash_and_bank', 'fixed_assets', 'payroll', 'tax', 'equity', 'provisions_and_liabilities', 'inventory', 'investments', 'related_parties', 'going_concern', 'opening_balances');--> statement-breakpoint
CREATE TYPE "public"."audit_type" AS ENUM('statutory', 'internal', 'special_purpose', 'review', 'compilation', 'forensic', 'tax', 'compliance', 'performance');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('trial_balance', 'financial_statements', 'bank_statements', 'gl_extract', 'payroll_register', 'fixed_asset_register', 'board_minutes', 'contracts', 'tax_returns', 'management_accounts', 'correspondence', 'other');--> statement-breakpoint
CREATE TYPE "public"."engagement_status" AS ENUM('planning', 'fieldwork', 'completion', 'reporting', 'signed_off', 'archived');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('limited_company', 'public_company', 'ngo', 'sacco', 'county_government', 'national_government', 'parastatals', 'church', 'school', 'bank', 'insurance', 'other');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('pending', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."finding_severity" AS ENUM('material_weakness', 'significant_deficiency', 'other_matter', 'observation');--> statement-breakpoint
CREATE TYPE "public"."finding_status" AS ENUM('open', 'management_responded', 'resolved', 'not_accepted');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('owner', 'partner', 'manager', 'senior', 'junior', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('mpesa', 'intasend', 'stripe');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'firm', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('unmodified', 'qualified', 'adverse', 'disclaimer');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high', 'significant');--> statement-breakpoint
CREATE TABLE "audit_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"finding_ref" text,
	"audit_area" "audit_area",
	"severity" "finding_severity" DEFAULT 'other_matter' NOT NULL,
	"title" text NOT NULL,
	"condition" text NOT NULL,
	"criteria" text NOT NULL,
	"cause" text,
	"effect" text NOT NULL,
	"recommendation" text NOT NULL,
	"management_response" text,
	"agreed_action_date" timestamp,
	"status" "finding_status" DEFAULT 'open' NOT NULL,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"engagement_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"report_type" "report_type" DEFAULT 'unmodified' NOT NULL,
	"addressee" text,
	"opinion_paragraph" text,
	"basis_of_opinion" text,
	"key_audit_matters" jsonb DEFAULT '[]'::jsonb,
	"responsibilities_of_management" text,
	"auditor_responsibilities" text,
	"other_reporting_responsibilities" text,
	"emphasis_of_matter" text,
	"full_report_content" text,
	"is_draft" boolean DEFAULT true NOT NULL,
	"ai_generated" boolean DEFAULT true NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"account_name" text DEFAULT 'Cash & Bank' NOT NULL,
	"bank_closing_balance" numeric(15, 2),
	"tb_cash_balance" numeric(15, 2),
	"difference" numeric(15, 2),
	"transactions" jsonb DEFAULT '[]'::jsonb,
	"matched_items" jsonb DEFAULT '[]'::jsonb,
	"unmatched_bank_items" jsonb DEFAULT '[]'::jsonb,
	"unmatched_tb_items" jsonb DEFAULT '[]'::jsonb,
	"is_reconciled" boolean DEFAULT false NOT NULL,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_portal_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"token" text NOT NULL,
	"client_email" text,
	"client_name" text,
	"permissions" jsonb DEFAULT '{"view_documents":true,"upload_documents":true,"respond_findings":true}'::jsonb,
	"expires_at" timestamp,
	"last_accessed_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"entity_type" "entity_type" DEFAULT 'limited_company' NOT NULL,
	"registration_number" text,
	"kra_pin" text,
	"industry" text,
	"financial_year_end" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"document_type" text,
	"is_required" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" timestamp,
	"client_response" text,
	"fulfilled_file_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"blob_url" text NOT NULL,
	"document_type" "document_type" DEFAULT 'other' NOT NULL,
	"extracted_text" text,
	"page_count" integer,
	"processing_status" "file_status" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"introduction" text,
	"scope" text,
	"management_responsibilities" text,
	"auditor_responsibilities" text,
	"reporting_clause" text,
	"fees_clause" text,
	"independence_statement" text,
	"acceptance_block" text,
	"full_letter_content" text,
	"is_draft" boolean DEFAULT true NOT NULL,
	"ai_generated" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"created_by" uuid,
	"assigned_partner" uuid,
	"assigned_manager" uuid,
	"engagement_ref" text,
	"financial_year_start" timestamp NOT NULL,
	"financial_year_end" timestamp NOT NULL,
	"audit_type" "audit_type" DEFAULT 'statutory' NOT NULL,
	"status" "engagement_status" DEFAULT 'planning' NOT NULL,
	"materiality_amount" numeric(15, 2),
	"materiality_basis" text,
	"performance_materiality" numeric(15, 2),
	"trivial_threshold" numeric(15, 2),
	"ai_risk_summary" text,
	"readiness_score" integer,
	"planned_start_date" timestamp,
	"planned_end_date" timestamp,
	"actual_start_date" timestamp,
	"signed_off_at" timestamp,
	"signed_off_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_financials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"account_code" text,
	"account_name" text NOT NULL,
	"account_type" text NOT NULL,
	"audit_area" "audit_area",
	"current_year_balance" numeric(15, 2) NOT NULL,
	"prior_year_balance" numeric(15, 2),
	"variance_amount" numeric(15, 2),
	"variance_pct" numeric(8, 2),
	"is_material" boolean DEFAULT false NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	"fs_category" text,
	"mapping_confidence" numeric(4, 3),
	"matched_layer" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filing_deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"deadline_type" text NOT NULL,
	"label" text NOT NULL,
	"authority" text NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"filed_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itax_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"tax_year" integer NOT NULL,
	"vat_revenue_base" numeric(15, 2),
	"vat_expected_output" numeric(15, 2),
	"vat_per_tb" numeric(15, 2),
	"vat_difference" numeric(15, 2),
	"vat_observations" jsonb DEFAULT '[]'::jsonb,
	"paye_payroll_base" numeric(15, 2),
	"paye_per_tb" numeric(15, 2),
	"paye_difference" numeric(15, 2),
	"paye_observations" jsonb DEFAULT '[]'::jsonb,
	"corp_tax_pbt" numeric(15, 2),
	"corp_tax_expected" numeric(15, 2),
	"corp_tax_per_tb" numeric(15, 2),
	"corp_tax_difference" numeric(15, 2),
	"corp_tax_observations" jsonb DEFAULT '[]'::jsonb,
	"overall_risk_level" text DEFAULT 'medium',
	"risk_nature" text DEFAULT 'none',
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "management_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"findings" jsonb DEFAULT '[]'::jsonb,
	"introduction" text,
	"conclusion" text,
	"full_letter_content" text,
	"is_draft" boolean DEFAULT true NOT NULL,
	"ai_generated" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_role" DEFAULT 'junior' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icpak_firm_number" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"subscription_start_date" timestamp,
	"subscription_expires_at" timestamp,
	"max_clients" integer DEFAULT 5 NOT NULL,
	"max_engagements_per_month" integer DEFAULT 3 NOT NULL,
	"max_members" integer DEFAULT 1 NOT NULL,
	"max_file_size_mb" integer DEFAULT 10 NOT NULL,
	"ai_provider" "ai_provider" DEFAULT 'anthropic' NOT NULL,
	"ai_model" text DEFAULT 'claude-sonnet-4-6' NOT NULL,
	"ai_api_key_encrypted" text,
	"subscription_reminders_sent" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_kes" integer NOT NULL,
	"plan_purchased" "plan" NOT NULL,
	"period_days" integer DEFAULT 30 NOT NULL,
	"mpesa_phone" text,
	"mpesa_checkout_request_id" text,
	"mpesa_merchant_request_id" text,
	"mpesa_receipt_number" text,
	"intasend_invoice_id" text,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"risk_type" text NOT NULL,
	"audit_area" "audit_area",
	"assertion" "assertion",
	"risk_description" text NOT NULL,
	"risk_factor" text,
	"inherent_risk" "risk_level" DEFAULT 'medium' NOT NULL,
	"control_risk" "risk_level" DEFAULT 'medium' NOT NULL,
	"detection_risk" "risk_level" DEFAULT 'medium' NOT NULL,
	"audit_response" text,
	"isa_reference" text,
	"ai_generated" boolean DEFAULT true NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"engagement_id" uuid,
	"action" text NOT NULL,
	"audit_area" "audit_area",
	"ai_provider" "ai_provider",
	"ai_model" text,
	"tokens_used" integer,
	"processing_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"full_name" text NOT NULL,
	"icpak_number" text,
	"county" text,
	"default_ai_provider" "ai_provider" DEFAULT 'anthropic',
	"default_ai_model" text DEFAULT 'claude-sonnet-4-6',
	"notification_prefs" jsonb DEFAULT '{"engagementReminders":true,"findingAlerts":true,"subscriptionAlerts":true,"aiCompleteAlerts":true}'::jsonb,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "working_papers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"audit_area" "audit_area" NOT NULL,
	"paper_ref" text,
	"title" text NOT NULL,
	"isa_reference" text,
	"content" text,
	"ai_generated" boolean DEFAULT true NOT NULL,
	"ai_provider" "ai_provider",
	"ai_model" text,
	"reviewed" boolean DEFAULT false NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"review_notes" text,
	"approved" boolean DEFAULT false NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"source_citations" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_tokens" ADD CONSTRAINT "client_portal_tokens_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_tokens" ADD CONSTRAINT "client_portal_tokens_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_fulfilled_file_id_engagement_files_id_fk" FOREIGN KEY ("fulfilled_file_id") REFERENCES "public"."engagement_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_files" ADD CONSTRAINT "engagement_files_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_files" ADD CONSTRAINT "engagement_files_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_files" ADD CONSTRAINT "engagement_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_letters" ADD CONSTRAINT "engagement_letters_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_letters" ADD CONSTRAINT "engagement_letters_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_assigned_partner_users_id_fk" FOREIGN KEY ("assigned_partner") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_assigned_manager_users_id_fk" FOREIGN KEY ("assigned_manager") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_signed_off_by_users_id_fk" FOREIGN KEY ("signed_off_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_financials" ADD CONSTRAINT "extracted_financials_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_financials" ADD CONSTRAINT "extracted_financials_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filing_deadlines" ADD CONSTRAINT "filing_deadlines_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filing_deadlines" ADD CONSTRAINT "filing_deadlines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itax_reconciliations" ADD CONSTRAINT "itax_reconciliations_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itax_reconciliations" ADD CONSTRAINT "itax_reconciliations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_letters" ADD CONSTRAINT "management_letters_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_letters" ADD CONSTRAINT "management_letters_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_papers" ADD CONSTRAINT "working_papers_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_papers" ADD CONSTRAINT "working_papers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_papers" ADD CONSTRAINT "working_papers_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_papers" ADD CONSTRAINT "working_papers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "findings_engagement_idx" ON "audit_findings" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "findings_status_idx" ON "audit_findings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_org_idx" ON "audit_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reports_engagement_idx" ON "audit_reports" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "bank_recon_engagement_idx" ON "bank_reconciliations" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "portal_tokens_engagement_idx" ON "client_portal_tokens" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "clients_org_idx" ON "clients" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "doc_requests_engagement_idx" ON "document_requests" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "files_engagement_idx" ON "engagement_files" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "engagement_files" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "eng_letter_engagement_idx" ON "engagement_letters" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "engagements_org_idx" ON "engagements" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "engagements_client_idx" ON "engagements" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "engagements_status_idx" ON "engagements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "financials_engagement_idx" ON "extracted_financials" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "filing_deadlines_engagement_idx" ON "filing_deadlines" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "itax_recon_engagement_idx" ON "itax_reconciliations" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "mgmt_letter_engagement_idx" ON "management_letters" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "org_members_org_idx" ON "organization_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_members_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_plan_idx" ON "organizations" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "org_subscription_idx" ON "organizations" USING btree ("subscription_expires_at");--> statement-breakpoint
CREATE INDEX "payments_org_idx" ON "payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "risks_engagement_idx" ON "risk_assessments" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "usage_org_idx" ON "usage_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "usage_created_idx" ON "usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "wp_engagement_idx" ON "working_papers" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "wp_area_idx" ON "working_papers" USING btree ("audit_area");