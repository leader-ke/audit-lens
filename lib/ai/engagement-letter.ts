/**
 * ENGAGEMENT LETTER AI GENERATOR (ISA 210)
 *
 * Drafts the letter of engagement from the audit firm to the client,
 * confirming the terms of the audit engagement per ISA 210.
 * The output is a complete, contractually binding document - not a scope summary.
 */

import { generateText } from 'ai';
import { z } from 'zod';
import { getLanguageModel, type AIConfig } from './provider';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const EngagementLetterOutputSchema = z.object({
  // Core letter sections
  introduction: z.string(),
  financialStatementsComponents: z.string(),
  scope: z.string(),
  managementResponsibilities: z.string(),
  auditorResponsibilities: z.string(),
  limitationOfAuditRisk: z.string(),
  reportingClause: z.string(),
  feesClause: z.string(),
  independenceStatement: z.string(),
  confidentialityClause: z.string(),
  liabilityClause: z.string(),
  governingLawClause: z.string(),
  otherMatters: z.string(),
  acceptanceBlock: z.string(),
  // Complete print-ready letter
  fullLetterContent: z.string(),
});

export type EngagementLetterOutput = z.infer<typeof EngagementLetterOutputSchema>;

// ─── Context ──────────────────────────────────────────────────────────────────

export interface EngagementLetterContext {
  clientName: string;
  entityType: string;
  financialYearEnd: string;
  auditType: string;
  auditorFirmName: string;
  materialityAmount: number;
  auditorPartnerName?: string;
}

// ─── Generator ───────────────────────────────────────────────────────────────

export async function generateEngagementLetter(
  context: EngagementLetterContext,
  config: AIConfig,
): Promise<EngagementLetterOutput> {

  const model = getLanguageModel(config);

  const systemPrompt = `You are a senior audit partner at an ICPAK-registered audit firm in Kenya drafting a legally binding engagement letter under ISA 210 (Agreeing the Terms of Audit Engagements).

CRITICAL TONE REQUIREMENT:
This is a CONTRACT, not a scope memo. Every section must be written with contractual language:
- Use "we agree", "you undertake", "the parties acknowledge", "this letter constitutes the terms of our engagement"
- Management obligations are UNDERTAKINGS, not descriptions
- The auditor obligations are COMMITMENTS the firm makes to the client
- The letter must be self-contained: a reader who has never met either party must understand the full terms

LEGAL AND STANDARDS CONTEXT:
- The audit firm is registered with ICPAK (Institute of Certified Public Accountants of Kenya).
- Governed by: Companies Act 2015 (Kenya), Income Tax Act (Kenya), IFRS as adopted by the IASB and adopted in Kenya, ISAs as adopted by ICPAK, IESBA Code of Ethics.
- Jurisdiction: Republic of Kenya. Any dispute shall be referred to arbitration under the Arbitration Act (Kenya).

SECTION-BY-SECTION REQUIREMENTS:

introduction:
- State that the firm has been appointed (or is confirming appointment) as external auditor.
- Clarify that this letter replaces any prior engagement letter or verbal understanding.
- State: "This letter, once signed by both parties, constitutes the agreed terms of our engagement."
- Reference ISA 210 as the standard governing the terms.
- Reference the financial year end being audited.
- 3-4 sentences.

financialStatementsComponents:
- List explicitly the financial statements that will be audited:
  (a) Statement of Financial Position as at [year end];
  (b) Statement of Profit or Loss and Other Comprehensive Income for the year ended [year end];
  (c) Statement of Changes in Equity for the year ended [year end];
  (d) Statement of Cash Flows for the year ended [year end];
  (e) Notes to the financial statements, comprising a summary of significant accounting policies and other explanatory information.
- Confirm the applicable financial reporting framework: International Financial Reporting Standards (IFRS) as adopted in Kenya.
- 1 short paragraph plus the lettered list.

scope:
- Describe the scope: audit of the financial statements listed above.
- State that the audit will be conducted in accordance with International Standards on Auditing (ISAs) as adopted by ICPAK.
- Confirm the objective: to express an opinion on whether the financial statements give a true and fair view in accordance with IFRS.
- Note that a statutory audit under the Companies Act 2015 (where applicable) fulfils the shareholder reporting obligation.
- 3-4 sentences.

managementResponsibilities:
- Use contractual language: "Management undertakes to..."
- List ALL of the following explicitly:
  1. Prepare and present financial statements that give a true and fair view in accordance with IFRS, including appropriate selection and consistent application of accounting policies.
  2. Design, implement, and maintain internal controls sufficient to enable the preparation of financial statements that are free from material misstatement, whether due to fraud or error - management acknowledges this does NOT mean fraud will be eliminated, only that reasonable controls are in place.
  3. Assess the entity's ability to continue as a going concern and disclose any material uncertainties, per IAS 1.
  4. Provide the auditor with unrestricted access to all books of account, records (including electronic records and IT systems), supporting documentation, personnel, and any other information relevant to the audit.
  5. Provide a signed management representation letter at the conclusion of the audit confirming all representations made to the auditor.
  6. Inform the auditor promptly of any events or changes in circumstances after the financial year end that may affect the financial statements.
  7. Not restrict the scope of the audit in any way.
- At least 5-6 sentences. Write as a numbered list with lead-in sentence.

auditorResponsibilities:
- Use contractual language: "We will..."
- Cover:
  1. Conduct the audit in accordance with ISAs as adopted by ICPAK, which require us to comply with ethical requirements and plan and perform the audit to obtain reasonable assurance.
  2. Apply professional scepticism throughout the audit, maintaining a questioning mind and critically assessing audit evidence.
  3. Use a risk-based audit approach: identify and assess the risks of material misstatement, whether due to fraud or error; design and perform audit procedures responsive to those risks; obtain sufficient appropriate audit evidence to provide a basis for our opinion.
  4. Examine evidence supporting amounts and disclosures in the financial statements on a test basis (audit sampling) - not every transaction will be examined.
  5. Evaluate the appropriateness of accounting policies used and the reasonableness of accounting estimates made by management.
  6. Evaluate the overall presentation, structure, and content of the financial statements.
  7. Communicate significant audit findings, including any significant deficiencies in internal control, to management and those charged with governance in a management letter.
- At least 6-7 sentences.

limitationOfAuditRisk:
- This section is MANDATORY under ISA 210.
- Explain clearly that: An audit conducted in accordance with ISAs is designed to obtain REASONABLE - not absolute - assurance. Reasonable assurance is a high level of assurance but is not a guarantee that an audit conducted in accordance with ISAs will always detect a material misstatement.
- State explicitly: "The audit is NOT designed to detect all instances of fraud, irregularity, or error, particularly where fraud involves collusion or deliberate concealment."
- Explain why: Misstatements can arise from fraud or error. The risk of not detecting material misstatement is higher for fraud than for error, because fraud may involve sophisticated schemes, forgery, collusion, override of controls, or deliberate misrepresentation.
- Confirm: "Our opinion on the financial statements does not constitute a guarantee of the future viability of the entity or the effectiveness of the controls put in place by management."
- 4-5 sentences. Plain language but technically accurate.

reportingClause:
- State that the primary output is an audit report per ISA 700.
- Describe the possible forms of opinion: unmodified (clean), qualified, adverse, or disclaimer of opinion - depending on audit findings.
- Confirm that the report is addressed to the shareholders/members (or Board, depending on entity type).
- Note that the final signed report will be provided upon completion of the audit and resolution of any outstanding matters, including receipt of the signed management representation letter.
- 3-4 sentences.

feesClause:
- State: "Our fees will be agreed in a separate fee proposal and communicated to you prior to commencement of fieldwork."
- Note that fees are based on: the time spent by partners and staff, the skill and responsibility involved, and the complexity of the engagement.
- Include billing terms: "Invoices will be issued [at agreed milestones / monthly / upon completion - to be specified in the fee proposal]. Payment is due within 30 days of the invoice date. We reserve the right to suspend the engagement if invoices remain unpaid beyond 60 days."
- Note that the firm's VAT registration number will appear on each invoice and that the applicable rate of VAT will be charged on fees.
- 4-5 sentences.

independenceStatement:
- Confirm that the firm and all members of the engagement team are independent of the client in accordance with the IESBA Code of Ethics and ICPAK ethical guidelines.
- State: "We will notify you promptly if we become aware of any actual or potential threat to our independence and the safeguards we intend to apply."
- Note that the client undertakes to disclose to the firm any relationships or interests that may create a conflict of interest or impair our independence.
- 3-4 sentences.

confidentialityClause:
- State that information obtained in the course of the engagement is confidential and will not be disclosed to third parties without the client's prior written consent, EXCEPT where: (a) disclosure is required by law or regulation; (b) disclosure is required by a professional or regulatory body with authority over the firm; (c) disclosure is necessary to defend the firm in legal or disciplinary proceedings.
- Confirm that the firm will comply with applicable data protection laws in Kenya (including the Data Protection Act 2019).
- Note that this obligation survives termination of the engagement.
- 3-4 sentences.

liabilityClause:
- State the firm's liability is limited to direct losses caused by the firm's gross negligence or wilful misconduct - not for consequential, indirect, or speculative losses.
- Note that the firm's liability to the client shall not exceed the total fees paid under this engagement for the relevant year.
- Include: "To the fullest extent permitted by law, we shall not be liable for any loss arising from the client's failure to provide complete, accurate, and timely information as required under this letter."
- Note that any claim must be brought within 2 years of the date of the audit report.
- 4 sentences.

governingLawClause:
- State: "This engagement letter is governed by and construed in accordance with the laws of the Republic of Kenya."
- State: "Any dispute arising out of or in connection with this letter shall first be subject to good-faith negotiation between the parties. If unresolved within 30 days, the dispute shall be referred to binding arbitration under the Arbitration Act (Cap. 49) of Kenya."
- Note that the courts of Kenya have non-exclusive jurisdiction.
- 2-3 sentences.

otherMatters:
- Confirm that this letter applies to the current financial year and will remain in effect for subsequent years unless terminated or superseded by a new engagement letter.
- State conditions for termination: either party may terminate on [30 days] written notice, subject to the client paying all fees for work completed to the termination date.
- Note that any changes to these terms must be agreed in writing by both parties.
- 2-3 sentences.

acceptanceBlock:
- This section MUST contain three parts: (1) a legal acknowledgment paragraph, (2) entity-appropriate authority confirmation, and (3) signature blocks. Do NOT produce only signature lines.
- PART 1 - Legal acknowledgment. Use this text verbatim, substituting bracketed fields:
  "Please confirm your agreement with the terms of this letter by signing and returning the duplicate copy to us. This letter, when countersigned, constitutes the entire agreement between [client name] and [firm name] for the audit engagement described herein and supersedes any prior verbal or written understanding.

  By signing below, I/we, on behalf of [client name], hereby confirm that:
  (a) We have read and fully understood this engagement letter in its entirety.
  (b) We are duly authorised to enter into this agreement on behalf of [client name] and to bind the organisation to its terms.
  (c) We accept and agree to all terms and conditions set out in this letter, including without limitation: the responsibilities of management, the scope of the audit, the inherent limitations of an audit, the fees and billing terms, the confidentiality obligations, the limitation of liability, and the governing law.
  (d) The financial statements for the year ended [financial year end] will be prepared under the responsibility of management as described herein.
  (e) This engagement shall be effective from the date last signed below."
- PART 2 - Authority confirmation. Tailor based on entity type:
  - university / school / public institution: Add: "(f) This acceptance has been duly authorised by the [University Council / Board of Governors] at its meeting held on _________________ as required by the [Universities Act / Education Act / relevant governing legislation]. The undersigned confirms they hold the authority of the governing council to bind the institution."
  - ngo / charity: Add: "(f) This acceptance has been authorised by the Board of Trustees at its meeting held on _________________."
  - sacco: Add: "(f) This acceptance has been authorised by the Board of Directors at its meeting held on _________________."
  - limited company / public company: Add: "(f) This acceptance is given by a duly authorised Director/Officer of the company in accordance with the Companies Act 2015."
  - county government / national government / parastatals: Add: "(f) This acceptance is given by the Accounting Officer as authorised under the Public Finance Management Act 2012."
- PART 3 - Signature blocks. Include both:
  "Signed for and on behalf of [client name]:
  Name: _______________________________
  Designation: _______________________________
  [For universities/public bodies: Confirmed authorised by: _______________________________ (Chair, Governing Council / Board)]
  Signature: _______________________________
  Date: _______________________________
  Official Stamp/Seal: _______________________________

  Accepted and signed for and on behalf of [firm name], Certified Public Accountants:
  Name: _______________________________
  Designation: Engagement Partner
  Signature: _______________________________
  Date: _______________________________"
- Use underscores for blank fields throughout.

fullLetterContent:
- CRITICAL: This field MUST be the COMPLETE assembled engagement letter from letterhead to final signature. It must NOT be only the acceptance block. It must NOT omit any section. Do not write "see above" or summarise - write out each section in full.
- Letterhead: firm name centred at top, "Certified Public Accountants" subtitle, horizontal divider.
- Date: [Date]
- Addressee block: The Board of Directors / Governing Council / Management (match entity type), client name.
- Subject: "Re: Engagement Letter - Audit of Financial Statements for the Year Ended [year end]"
- Opening: "Dear Sir/Madam,"
- Include ALL 13 numbered sections with ## headings in this order:
  ## 1. Appointment and Purpose
  ## 2. Financial Statements to be Audited
  ## 3. Scope of the Audit
  ## 4. Responsibilities of Management
  ## 5. Responsibilities of the Auditor
  ## 6. Inherent Limitations of an Audit
  ## 7. Form of Report
  ## 8. Fees and Billing
  ## 9. Independence
  ## 10. Confidentiality
  ## 11. Limitation of Liability
  ## 12. Governing Law and Dispute Resolution
  ## 13. Other Matters
- Closing before acceptance: "Yours faithfully," then firm name, "Certified Public Accountants", then "_________________________ [Engagement Partner Name/TBD]", "Engagement Partner", "Date: ___________"
- Separator line, then ## 14. Acceptance
- The complete acceptance block (all three parts from acceptanceBlock above).
- Minimum 1,500 words. Every section must be substantive - this is a legally binding contract.

TONE AND STYLE RULES:
- CONTRACTUAL not descriptive. Every obligation is an undertaking or commitment.
- Use "we" for the firm, "you" or "management" for the client.
- Professional and precise. No filler phrases. No passive voice where active is clearer.
- No em dashes anywhere - use hyphens, colons, or semicolons.
- Do not repeat ISA citations excessively - cite each standard once, on first use.
- Do not invent fee amounts, specific materiality numbers, or dates not provided.
- The letter should be comprehensive enough that a new client reading it for the first time understands exactly what they are signing.

OUTPUT: Valid JSON only, no markdown fences.`;

  const userPrompt = `Draft the complete ISA 210 engagement letter.

CLIENT: ${context.clientName}
ENTITY TYPE: ${context.entityType}
FINANCIAL YEAR END: ${context.financialYearEnd}
AUDIT TYPE: ${context.auditType}
AUDIT FIRM: ${context.auditorFirmName}${context.auditorPartnerName ? `\nENGAGEMENT PARTNER: ${context.auditorPartnerName}` : ''}${context.materialityAmount > 0 ? `\nOVERALL MATERIALITY (internal reference only - do NOT include in the letter): KES ${context.materialityAmount.toLocaleString()}` : ''}

Return JSON with exactly these keys:
{
  "introduction": "...",
  "financialStatementsComponents": "...",
  "scope": "...",
  "managementResponsibilities": "...",
  "auditorResponsibilities": "...",
  "limitationOfAuditRisk": "...",
  "reportingClause": "...",
  "feesClause": "...",
  "independenceStatement": "...",
  "confidentialityClause": "...",
  "liabilityClause": "...",
  "governingLawClause": "...",
  "otherMatters": "...",
  "acceptanceBlock": "...",
  "fullLetterContent": "..."
}`;

  const { text } = await generateText({
    model: model as any,
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  let jsonStr = text.trim();
  const fenced = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fenced) jsonStr = fenced[1].trim();
  else { const obj = jsonStr.match(/(\{[\s\S]*\})/); if (obj) jsonStr = obj[1].trim(); }

  const parsed = JSON.parse(jsonStr);
  const result = EngagementLetterOutputSchema.safeParse(parsed);
  if (result.success) return result.data;

  // Graceful fallback - return what we can
  return {
    introduction:                    parsed.introduction                    ?? '',
    financialStatementsComponents:   parsed.financialStatementsComponents   ?? '',
    scope:                           parsed.scope                           ?? '',
    managementResponsibilities:      parsed.managementResponsibilities      ?? '',
    auditorResponsibilities:         parsed.auditorResponsibilities         ?? '',
    limitationOfAuditRisk:           parsed.limitationOfAuditRisk           ?? '',
    reportingClause:                 parsed.reportingClause                 ?? '',
    feesClause:                      parsed.feesClause                      ?? '',
    independenceStatement:           parsed.independenceStatement           ?? '',
    confidentialityClause:           parsed.confidentialityClause           ?? '',
    liabilityClause:                 parsed.liabilityClause                 ?? '',
    governingLawClause:              parsed.governingLawClause              ?? '',
    otherMatters:                    parsed.otherMatters                    ?? '',
    acceptanceBlock:                 parsed.acceptanceBlock                 ?? '',
    fullLetterContent:               parsed.fullLetterContent               ?? text.slice(0, 6000),
  };
}
