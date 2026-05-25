/**
 * WORKING PAPER AI GENERATOR
 *
 * The #1 killer feature: upload a trial balance → AI drafts working papers
 * for every audit area in ISA-compliant format.
 *
 * Anti-hallucination rules:
 * - temperature = 0 (deterministic)
 * - Every procedure references specific numbers from provided data
 * - ISA references from hardcoded isa-standards.ts; never AI-invented
 * - Every finding must cite source (account name, amount, document)
 * - Data limitations consolidated into ONE section - no repetitive caveats
 */

import { generateText } from 'ai';
import { z } from 'zod';
import { getLanguageModel, getTokenBudget, truncateToTokenBudget, type AIConfig } from './provider';
import { AUDIT_AREAS, ISA_STANDARDS, type AuditArea } from '../audit/isa-standards';
import type { SystemicIssue } from '../audit/systemic-issues';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const WorkingPaperCitationSchema = z.object({
  claim: z.string(),
  sourceDocument: z.string(),
  accountOrItem: z.string(),
  amount: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const WorkingPaperOutputSchema = z.object({
  title: z.string(),
  paperRef: z.string(),
  isaReference: z.string(),
  objective: z.string(),
  scope: z.string(),
  /** Data limitations: ONE consolidated section. Do not repeat these inside procedures. */
  dataLimitations: z.array(z.string()).default([]),
  analyticalProcedures: z.array(z.object({
    procedure: z.string(),
    assertion: z.string().default(''),
    expectation: z.string().default(''),
    finding: z.string(),
    conclusion: z.string(),
    citation: WorkingPaperCitationSchema.optional(),
  })).default([]),
  keyObservations: z.array(z.object({
    observation: z.string(),
    risk: z.enum(['low', 'medium', 'high']).default('low'),
    assertionAffected: z.string().default(''),
    recommendation: z.string().optional(),
    citation: WorkingPaperCitationSchema.optional(),
  })).default([]),
  /** Specific actionable next steps: not generic "obtain evidence", but WHO gets WHAT by WHEN. */
  areasForFurtherTesting: z.array(z.string()).default([]),
  /** Specific documents/information to request from the client. */
  auditRequestList: z.array(z.string()).default([]),
  preliminaryConclusion: z.string(),
  evidenceSufficiency: z.number().min(0).max(100).default(50),
  materialityApplied: z.string(),
  unsupportedClaims: z.array(z.string()).default([]),
  disclaimer: z.string(),
});

export type WorkingPaperOutput = z.infer<typeof WorkingPaperOutputSchema>;

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TrialBalanceLine {
  accountCode?: string;
  accountName: string;
  accountType: string;
  currentYearBalance: number;
  priorYearBalance?: number;
  variancePct?: number;
  isMaterial?: boolean;
  isFlagged?: boolean;
  flagReason?: string;
  /** FSCategory assigned by the system account mapper: NOT from the raw TB */
  fsCategory?: string;
  /** Confidence of the system mapping (0-1) */
  mappingConfidence?: number;
}

export type VerbosityMode = 'concise' | 'standard' | 'detailed';

export interface EngagementContext {
  clientName: string;
  entityType: string;
  financialYearEnd: string;
  auditType: string;
  materialityAmount: number;
  performanceMateriality: number;
  trivialThreshold: number;
  /** Free-text description of how materiality was determined, e.g. "5% of profit before tax" */
  materialityBasis?: string;
  /** Trial balance imbalance in KES (|debit total − credit total|). If > 0, the TB does not balance. */
  tbImbalance?: number;
}

// ─── Working Paper Generator ──────────────────────────────────────────────────

export async function generateWorkingPaper(
  auditArea: AuditArea,
  trialBalanceLines: TrialBalanceLine[],
  engagementContext: EngagementContext,
  config: AIConfig,
  additionalDocumentText?: string,
  systemicIssues?: SystemicIssue[],
  verbosity: VerbosityMode = 'concise',
  analyticsContext?: string,
): Promise<WorkingPaperOutput> {
  const areaDefinition = AUDIT_AREAS[auditArea];
  if (!areaDefinition) throw new Error(`Unknown audit area: ${auditArea}`);

  const budget = getTokenBudget(config.provider);
  const model = getLanguageModel(config);

  // Filter trial balance to relevant accounts for this area
  const relevantLines = trialBalanceLines.filter(line =>
    isLineRelevantToArea(line, auditArea)
  );
  const allLines = trialBalanceLines;

  const hasRelevantData = relevantLines.length > 0;
  const hasPriorYear = relevantLines.some(l => l.priorYearBalance != null) ||
    allLines.some(l => l.priorYearBalance != null);

  const tbData = formatTrialBalanceForPrompt(relevantLines, allLines);
  const analyticsCtx = analyticsContext
    ? truncateToTokenBudget(analyticsContext, Math.floor(budget.maxInputChars * 0.25))
    : '';
  const docContext = additionalDocumentText
    ? truncateToTokenBudget(additionalDocumentText, Math.floor(budget.maxInputChars * 0.2))
    : '';

  const isaStandards = areaDefinition.primaryISAs
    .map(isa => ISA_STANDARDS[isa.replace(' ', '-')])
    .filter(Boolean)
    .map(isa => `${isa?.isaNumber}: ${isa?.objective}`)
    .join('\n');

  // Verbosity controls: tighten limits for concise mode, loosen for detailed
  const formatLimits = verbosity === 'concise'
    ? { procedures: '2-3', observations: '1-2', requests: '3-4', testing: '2-3', conclusion: '2' }
    : verbosity === 'detailed'
    ? { procedures: '4-6', observations: '3-4', requests: '5-6', testing: '4-5', conclusion: '3-4' }
    : { procedures: '3-5', observations: '2-3', requests: '4-5', testing: '3-4', conclusion: '2-3' };

  // Equity-specific rules are injected only when relevant - avoids bloating non-equity papers
  const equityRules = auditArea === 'equity' ? `
═══ EQUITY-SPECIFIC RULES ═══
EQ1. SOCE: If no Statement of Changes in Equity is available, state: "No SOCE provided; share capital movements, dividends, and prior period adjustments cannot be tested from TB alone." This is mandatory - do not skip.
EQ2. RETAINED EARNINGS: Do NOT decompose retained earnings into opening balance, profit, and distributions without SOCE and prior-year data. State: "Retained earnings cannot be decomposed due to absence of SOCE and prior-year financials."
EQ3. SHARE CAPITAL ASSERTIONS: Primary assertions are Authorization and Completeness, not Existence alone. Use: "Authorization and completeness cannot be confirmed without CR12 or board resolution."
EQ4. MOVEMENT vs BALANCE: State when movement testing cannot be performed: "No movement testing performed; only closing balance per TB noted."
EQ5. CONCLUSION: When equity evidence is insufficient (no SOCE, no PY data, unresolved tax), conclusion MUST include: "No conclusion can be expressed on equity balances pending receipt of SOCE, prior-year comparatives, and resolution of any tax inconsistency."
EQ6. ASSERTION MAPPING: Existence → share capital; Completeness → retained earnings movements; Accuracy/Valuation → tax and profit linkage; Rights/Obligations → board authorization; Presentation → IAS 1 classification.
EQ7. TAX MISMATCH: Do NOT compute opening retained earnings when a tax inconsistency exists. Cross-reference WP-TAX-001 and state the limitation.
EQ8. CLASSIFICATION ERROR: A misclassification is a presentation risk; it does NOT affect equity total unless the account was misposted to an equity account. State these separately.` : '';

  const systemPrompt = `You are a senior audit manager at an ICPAK-registered firm in Kenya.
Write a ${verbosity === 'concise' ? 'concise' : verbosity === 'detailed' ? 'comprehensive' : 'standard'}, manager-readable working paper for the ${areaDefinition.label} audit area.
Target: readable in under ${verbosity === 'concise' ? '3' : verbosity === 'detailed' ? '10' : '5'} minutes. Brevity is professionalism.

═══ FORMAT RULES ═══
- analyticalProcedures: ${formatLimits.procedures} MAX. Each: 1 sentence procedure, 1 sentence finding, 1 sentence conclusion.
- keyObservations: ${formatLimits.observations} MAX. One sentence each.
- auditRequestList: ${formatLimits.requests} items MAX. Specific, not exhaustive.
- areasForFurtherTesting: ${formatLimits.testing} items MAX.
- preliminaryConclusion: ${formatLimits.conclusion} sentences MAX with key KES figure and risk rating.
- scope: 1-2 sentences. objective: 1 sentence.
- Do NOT repeat the same assertion, ISA number, or regulatory act more than once.
- Mention Companies Act / Income Tax Act / VAT Act in scope only.
- Do NOT explain ISA standards - cite the number only.

═══ DATA INTEGRITY ═══
1. ONLY use figures from the trial balance. Never invent numbers.
2. Every observation must cite a specific account name + KES amount.
3. All data gaps go in "dataLimitations" once - never repeat inside procedures.
4. Do NOT state benchmark ranges without prior-year data. If no benchmark: "No prior-year comparative available."
5. Computed ratios (DSO, DIO, DPO, margins) are TB-derived approximations - label as such every time.
6. VAT payable is a net balance (output minus input minus prepayments) - never use it to infer turnover.
7. Fraud risk: use "inherent risk elevated, no specific fraud indicators identifiable from TB-level analytics alone" unless data shows >50% revenue growth, margin anomaly, or unsupported journals.
8. Tax conclusions must be qualified: acknowledge PBT/PAT differences and draft vs adjusted basis.
9. COGS: Gross margin uses ONLY accounts explicitly labelled Cost of Sales / COGS. Never add payroll, admin, or depreciation unless annotated as direct cost.
10. CAT[system] labels come from the system classifier, NOT the raw TB. Say "system-classified as X" - never "categorised as X in the TB." Labels below 70% confidence are tentative; never use as audit evidence.

═══ REVENUE CLASSIFICATION (apply to every revenue paper) ═══
11. SINGLE TREATMENT: Choose ONE consistent classification for each revenue account and apply it throughout. Do not present different totals in different procedures.
12. TB ACCOUNT TYPE IS AUTHORITATIVE: If account_type in the TB is "revenue", include it in the revenue total. If account_type is "liability" (e.g., Deferred Revenue), it is a balance sheet item - never deduct it from revenue or add it to revenue; it belongs in payables/liabilities testing.
13. OTHER INCOME: If an account labelled "Other Income", "Other Operating Income", or similar is present and account_type = "revenue" in the TB, treat it as revenue (Option A). State this explicitly in scope: "Revenue includes [account name] (KES X) as it is classified as revenue in the trial balance." Do not silently mix or ignore it.
14. DEFERRED REVENUE MOVEMENT: Deferred revenue testing relates to Cutoff (recognition timing), not DSO/Valuation. The movement reconciliation (opening + billings recognised = closing) is a Cutoff procedure. Keep it separate from receivables DSO analysis.

═══ PRECISION LANGUAGE ═══
15. TB-DERIVED RATES: Every computed rate/ratio must include "TB-derived approximation" and the formula. Example: "implied yield (TB-derived: Finance Costs ÷ LT Borrowings = KES X ÷ KES Y = Z%)."
16. LIQUIDITY RATIOS: After stating ratio, add: "indicative only, not validated through bank confirmations; restricted cash not considered."
17. TAX DISCREPANCY: Say "creates uncertainty over presentation and classification of tax expense" - never "enforcement risk" or "KRA liability" without evidence of non-payment.
18. FX: Only mention FX exposure if a FX balance or loss/gain account exists in the TB. Say "may indicate foreign currency exposure - management confirmation required." Never assume a loan is foreign-currency denominated.
19. WORKING CAPITAL: Use "potential working capital pressure indicators" not "working capital stress." Use "may suggest" not "indicates."
20. TONE: TB-only data supports "indicators noted" and "procedures planned" - not "confirmed," "established," or "risk is high." Match language to evidence strength.
21. RATIO-AS-BENCHMARK: Never treat a single ratio as an audit conclusion without prior-year or industry context. Say: "planning-level ratio; no prior-year comparison available."
22. SIZE ≠ RISK: Account size alone does not create audit risk. Say "focus area for substantive testing" - not "highest risk."
23. ASSET TURNOVER: Never state "Revenue represents X% of total assets" without labelling it as "asset turnover ratio (TB-derived: Revenue ÷ Total Assets)." Otherwise omit it.
24. PROVISION LANGUAGE: For elevated DIO: "elevated DIO may indicate NRV risk - obtain aged stock listing and NRV calculation." For elevated DSO: "elevated DSO may indicate recoverability risk - obtain aged debtors listing and assess adequacy of provision for credit losses."
25. DSO ASSERTION: DSO primary assertion = Valuation (collectability). Secondary: Existence, Cutoff. Never map DSO to Completeness as primary. Deferred Revenue testing = Cutoff (recognition timing). Keep these as separate procedures - do not merge receivable collection timing with revenue recognition timing.
26. VAT PLAUSIBILITY (KENYA): When VAT Payable and Revenue both present, note: "VAT balance cannot be assessed for reasonableness without reconciliation to VAT account movements and KRA iTax returns - factors affecting comparability include zero-rated/exempt supplies, input VAT recovery, and timing differences. Obtain VAT movement schedule and iTax reconciliation." Do not assert non-compliance.
27. CONCLUSION CONSISTENCY: If any procedure reaches "insufficient evidence" or "cannot conclude", the preliminaryConclusion must reflect this. Use: "Analytical conclusions remain preliminary; risk assessment deferred pending [what is needed]." Do not state a confident risk level if the body says evidence is insufficient.
28. TB IMBALANCE: If tbImbalance > 0, include in dataLimitations: "Trial balance does not balance; debit/credit difference of KES [amount]. All ratios and procedures are provisional." The preliminaryConclusion must state: "Analytical conclusions remain provisional pending resolution of the TB imbalance of KES [amount]; planning activities and risk identification may continue." Note in scope: "Materiality may require reassessment once the imbalance is resolved."
29. REVIEW vs AUDIT LANGUAGE: "Limited assurance" is ISRE 2400 terminology. Never use it in an audit WP. Use ISA language: "No substantive conclusion can yet be expressed on [area] pending [what is needed]."
30. CROSS-REFERENCES: For systemic issues in the register, cite by wpRef (e.g., "Refer WP-TAX-001"). Do not re-derive or re-analyse.
31. CROSS-AREA CONNECTIONS: Where accounts connect across areas (Loan → Finance Costs, Lease → ROU Asset, Deferred Revenue → Revenue), flag with: "material linkage to [account] - refer [WP-XXX-001]." Do not re-analyse.
32. IFRS 16: If both ROU Asset and Lease Liability appear, cross-reference both papers: "Under IFRS 16, ROU Asset and Lease Liability are linked - refer [WP-FIXED-001 / WP-LIAB-001]."
33. EVIDENCE SUFFICIENCY: Max evidenceSufficiency = 25 when the only source is the TB (no confirmations, invoices, or agreements) for substantive areas.
34. OCCURRENCE ASSERTION: "Occurrence" means transactions recorded occurred and relate to genuine business activity. Never paraphrase as "only genuine transactions are included" - use the assertion language directly.
35. MATERIALITY BASIS: When materialityBasis is provided, include in scope: "Overall materiality of KES X,XXX,XXX determined as [basis]."
36. ANALYTICS NAMING: The SYSTEM-COMPUTED ANALYTICS block is generated by the audit software. Never call it "analytics report," "anomaly register," or any named document. Say "TB-level analytics indicate…" or "system-computed analytics flag…"
${equityRules}

RELEVANT ISA STANDARDS (cite numbers only - do not explain):
${isaStandards}

KEY ASSERTIONS: ${areaDefinition.keyAssertions.join(', ')}
KENYA-SPECIFIC RISKS: ${areaDefinition.kenyaSpecificRisks.slice(0, 3).map(r => `${r}`).join(' | ')}
MATERIALITY: KES ${engagementContext.materialityAmount.toLocaleString()} | PERFORMANCE MATERIALITY: KES ${engagementContext.performanceMateriality.toLocaleString()}
TB ACCOUNTS FOR THIS AREA: ${relevantLines.length} | PRIOR YEAR: ${hasPriorYear ? 'YES' : 'NO'}

OUTPUT: Return ONLY a valid JSON object - NO markdown fences, NO preamble, NO trailing text.
{
  "title": "string",
  "paperRef": "string",
  "isaReference": "string: ISA numbers only, comma-separated",
  "objective": "1 sentence",
  "scope": "1-2 sentences: FY end, materiality, entity type",
  "dataLimitations": ["string: list ALL data gaps here ONCE, max 3 items"],
  "analyticalProcedures": [
    {
      "procedure": "1 sentence - what was done, which account",
      "assertion": "Occurrence|Completeness|Accuracy|Cutoff|Classification|Existence|Valuation|Rights & Obligations|Presentation",
      "expectation": "1 sentence or 'No prior-year comparative'",
      "finding": "1 sentence - account name + KES amount",
      "conclusion": "1 sentence - conclusion or limitation reference"
    }
  ],
  "keyObservations": [
    {
      "observation": "1 sentence - account name + KES amount",
      "risk": "low|medium|high",
      "assertionAffected": "single assertion",
      "recommendation": "1 sentence - specific next action",
      "citation": { "claim": "string", "sourceDocument": "Trial Balance", "accountOrItem": "string", "amount": "string", "confidence": 0.7-1.0 }
    }
  ],
  "areasForFurtherTesting": ["1 sentence each: specific procedure + account + assertion, max 4"],
  "auditRequestList": ["specific document or schedule, max 5"],
  "preliminaryConclusion": "2-3 sentences: risk level, key figure, what remains outstanding",
  "evidenceSufficiency": 0–100,
  "materialityApplied": "KES X,XXX,XXX",
  "unsupportedClaims": [],
  "disclaimer": "DRAFT - AI-ASSISTED - REVIEW REQUIRED BEFORE FILING"
}`;

  const systemicIssuesBlock = systemicIssues && systemicIssues.length > 0
    ? `SYSTEMIC ISSUES REGISTER (cross-engagement flags - reference by wpRef, do NOT re-derive):
${systemicIssues.map(i => `[${i.severity.toUpperCase()}] ${i.code}: ${i.crossRefText}`).join('\n')}`
    : '';

  const tbImbalanceWarning = engagementContext.tbImbalance && engagementContext.tbImbalance > 0
    ? `\n⚠ TB DOES NOT BALANCE; debit/credit difference: KES ${engagementContext.tbImbalance.toLocaleString()}\nInclude in dataLimitations: "Trial balance does not balance; debit/credit difference of KES ${engagementContext.tbImbalance.toLocaleString()}. All ratios and procedures are provisional."\nPreliminaryConclusion must state: "Analytical conclusions remain provisional pending resolution of the TB imbalance of KES ${engagementContext.tbImbalance.toLocaleString()}; planning activities and risk identification may continue."\nNote: planning, risk identification, and audit request preparation proceed normally - the imbalance prevents final substantive conclusions only.\n`
    : '';

  const userPrompt = `Draft the ${areaDefinition.label} working paper.

CLIENT: ${engagementContext.clientName}
ENTITY TYPE: ${engagementContext.entityType}
FINANCIAL YEAR END: ${engagementContext.financialYearEnd}
AUDIT TYPE: ${engagementContext.auditType}
MATERIALITY: KES ${engagementContext.materialityAmount.toLocaleString()}${engagementContext.materialityBasis ? ` (basis: ${engagementContext.materialityBasis})` : ' (basis: not specified)'}
PERFORMANCE MATERIALITY: KES ${engagementContext.performanceMateriality.toLocaleString()}
TRIVIAL THRESHOLD: KES ${engagementContext.trivialThreshold.toLocaleString()}
${tbImbalanceWarning}
TRIAL BALANCE - ${areaDefinition.label.toUpperCase()} ACCOUNTS:
${tbData}

${systemicIssuesBlock ? `${systemicIssuesBlock}\n` : ''}${analyticsCtx ? `SYSTEM-COMPUTED ANALYTICS (pre-computed from trial balance by audit software - NOT an external document or named register; cite as "TB-level analytics" or "system-computed analytics"):\n${analyticsCtx}\n\n` : ''}${docContext ? `ADDITIONAL DOCUMENTS (client-provided or uploaded files):\n${docContext}\n\n` : ''}STANDARD PROCEDURES FOR THIS AREA:
${areaDefinition.typicalProcedures.map((p, i) => `${i + 1}. ${p}`).join('\n')}

IMPORTANT: If there are no accounts in the trial balance for this area, set evidenceSufficiency to 10 and list what evidence would be required in auditRequestList. Still include planned procedures that the auditor should perform once evidence is obtained.`;

  const { text } = await generateText({
    model: model as any,
    temperature: 0,
    ...(budget.maxTokens ? { maxTokens: budget.maxTokens } : {}),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  // Extract JSON - strip markdown fences if present (handles unclosed fences too)
  let jsonStr = text.trim();
  const fencedMatch = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fencedMatch) {
    jsonStr = fencedMatch[1].trim();
  } else {
    // Fence without closing, or inline - find the outermost { ... }
    const objMatch = jsonStr.match(/(\{[\s\S]*\})/);
    if (objMatch) jsonStr = objMatch[1].trim();
  }

  try {
    let parsed = JSON.parse(jsonStr);

    // Normalise common AI wrapping patterns
    if (parsed && typeof parsed === 'object' && !parsed.title) {
      const inner = parsed.workingPaper ?? parsed.data ?? parsed.result ?? parsed.output;
      if (inner && typeof inner === 'object') parsed = inner;
    }

    // Map legacy header structure
    if (parsed.header && !parsed.title) {
      parsed = {
        title: parsed.header.auditArea
          ? `${parsed.header.auditArea} Working Paper - ${parsed.header.client || engagementContext.clientName}`
          : `${areaDefinition.label} Working Paper - ${engagementContext.clientName}`,
        paperRef: parsed.header.workingPaperReference || `WP-${areaDefinition.workingPaperRef}-01`,
        isaReference: parsed.header.isaReference || areaDefinition.primaryISAs.join(', '),
        objective: parsed.objective || areaDefinition.description,
        scope: parsed.scope || `FY ended ${engagementContext.financialYearEnd}. Materiality: KES ${engagementContext.materialityAmount.toLocaleString()}.`,
        dataLimitations: parsed.dataLimitations || [],
        analyticalProcedures: parsed.analyticalProcedures || parsed.procedures || [],
        keyObservations: parsed.keyObservations || parsed.observations || parsed.findings || [],
        areasForFurtherTesting: parsed.areasForFurtherTesting || parsed.furtherTesting || [],
        auditRequestList: parsed.auditRequestList || [],
        preliminaryConclusion: parsed.preliminaryConclusion || parsed.conclusion || '',
        evidenceSufficiency: parsed.evidenceSufficiency ?? 50,
        materialityApplied: parsed.header.materiality || `KES ${engagementContext.materialityAmount.toLocaleString()}`,
        unsupportedClaims: parsed.unsupportedClaims || [],
        disclaimer: parsed.disclaimer || 'DRAFT WORKING PAPER - AI-ASSISTED - MUST BE REVIEWED AND APPROVED BY AUDIT MANAGER/PARTNER BEFORE INCLUSION IN AUDIT FILE',
      };
    }

    // Sanitize before Zod - fix common AI quirks that cause validation failures
    parsed = sanitizeWorkingPaperOutput(parsed, engagementContext, areaDefinition);

    const result = WorkingPaperOutputSchema.safeParse(parsed);
    if (result.success) return result.data;

    // Zod still unhappy - return what we can, skip invalid nested objects
    return {
      title: parsed.title || `${areaDefinition.label} Working Paper - ${engagementContext.clientName}`,
      paperRef: parsed.paperRef || `WP-${areaDefinition.workingPaperRef}-01`,
      isaReference: parsed.isaReference || areaDefinition.primaryISAs.join(', '),
      objective: parsed.objective || areaDefinition.description,
      scope: parsed.scope || `FY ended ${engagementContext.financialYearEnd}. Materiality: KES ${engagementContext.materialityAmount.toLocaleString()}.`,
      dataLimitations: Array.isArray(parsed.dataLimitations) ? parsed.dataLimitations.filter((x: any) => typeof x === 'string') : [],
      analyticalProcedures: Array.isArray(parsed.analyticalProcedures)
        ? parsed.analyticalProcedures.filter((p: any) => typeof p?.procedure === 'string' && typeof p?.finding === 'string')
          .map((p: any) => ({ procedure: p.procedure, assertion: p.assertion || '', expectation: p.expectation || '', finding: p.finding, conclusion: p.conclusion || '' }))
        : [],
      keyObservations: Array.isArray(parsed.keyObservations)
        ? parsed.keyObservations.filter((o: any) => typeof o?.observation === 'string')
          .map((o: any) => ({ observation: o.observation, risk: ['low','medium','high'].includes(o.risk) ? o.risk : 'low', assertionAffected: o.assertionAffected || '', recommendation: o.recommendation }))
        : [],
      areasForFurtherTesting: Array.isArray(parsed.areasForFurtherTesting) ? parsed.areasForFurtherTesting.filter((x: any) => typeof x === 'string') : [],
      auditRequestList: Array.isArray(parsed.auditRequestList) ? parsed.auditRequestList.filter((x: any) => typeof x === 'string') : [],
      preliminaryConclusion: typeof parsed.preliminaryConclusion === 'string' ? parsed.preliminaryConclusion : '',
      evidenceSufficiency: typeof parsed.evidenceSufficiency === 'number' ? Math.min(100, Math.max(0, parsed.evidenceSufficiency)) : 50,
      materialityApplied: parsed.materialityApplied || `KES ${engagementContext.materialityAmount.toLocaleString()}`,
      unsupportedClaims: [],
      disclaimer: parsed.disclaimer || 'DRAFT WORKING PAPER - AI-ASSISTED - MUST BE REVIEWED AND APPROVED BY AUDIT MANAGER/PARTNER BEFORE INCLUSION IN AUDIT FILE',
    };
  } catch {
    return buildFallbackWorkingPaper(auditArea, areaDefinition.label, text, engagementContext);
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function isLineRelevantToArea(line: TrialBalanceLine, area: AuditArea): boolean {
  const name = line.accountName.toLowerCase();
  const areaKeywords: Record<AuditArea, string[]> = {
    revenue: ['revenue', 'sales', 'income', 'turnover', 'fees earned', 'grant', 'donation received'],
    expenses: ['expense', 'cost', 'wages', 'salary', 'rent', 'utilities', 'admin', 'operating'],
    receivables: ['receivable', 'debtor', 'trade debtor', 'other debtor', 'prepayment', 'deposit paid'],
    payables: ['payable', 'creditor', 'trade creditor', 'accrual', 'other payable'],
    cash_and_bank: ['cash', 'bank', 'mpesa', 'petty cash', 'float'],
    fixed_assets: ['property', 'plant', 'equipment', 'furniture', 'vehicle', 'machinery', 'land', 'building', 'depreciation'],
    payroll: ['payroll', 'salary', 'wages', 'paye', 'nssf', 'nhif', 'shif', 'leave', 'gratuity', 'staff'],
    tax: ['tax', 'vat', 'paye', 'withholding', 'deferred tax', 'current tax', 'kra'],
    equity: ['equity', 'share capital', 'retained', 'reserve', 'dividend'],
    provisions_and_liabilities: ['provision', 'contingent', 'liability', 'legal'],
    inventory: ['inventory', 'stock', 'raw material', 'work in progress', 'finished goods', 'goods'],
    investments: ['investment', 'securities', 'shares held', 'bonds', 'treasury'],
    related_parties: ['related', 'director', 'shareholder', 'associated', 'intercompany'],
    going_concern: ['overdraft', 'borrowing', 'loan', 'facility'],
    opening_balances: [],
  };

  // Also use the auditArea field if it was parsed
  if ((line as any).auditArea === area) return true;

  const keywords = areaKeywords[area] || [];
  return keywords.some(kw => name.includes(kw));
}

function formatTrialBalanceForPrompt(relevantLines: TrialBalanceLine[], allLines: TrialBalanceLine[]): string {
  if (relevantLines.length === 0) {
    return `[No accounts explicitly mapped to this area in the trial balance.]\n\nFull trial balance (top ${Math.min(30, allLines.length)} accounts for context):\n` +
      allLines.slice(0, 30).map(l =>
        `${l.accountCode ? l.accountCode + ' | ' : ''}${l.accountName} | CY: ${formatKes(l.currentYearBalance)} | PY: ${formatKes(l.priorYearBalance)} | Var: ${l.variancePct != null ? l.variancePct.toFixed(1) + '%' : 'N/A'}`
      ).join('\n');
  }

  return relevantLines.map(l => {
    const flags = [];
    if (l.isMaterial) flags.push('MATERIAL');
    if (l.isFlagged) flags.push(`FLAG: ${l.flagReason}`);
    // System-assigned category - labelled clearly so AI can cite provenance correctly
    if (l.fsCategory && l.fsCategory !== 'UNKNOWN') {
      const pct = l.mappingConfidence != null ? `${Math.round(l.mappingConfidence * 100)}%` : '?%';
      flags.push(`CAT[system]: ${l.fsCategory}(${pct})`);
    }
    return `${l.accountCode ? l.accountCode + ' | ' : ''}${l.accountName} | CY: ${formatKes(l.currentYearBalance)} | PY: ${formatKes(l.priorYearBalance)} | Var: ${l.variancePct != null ? l.variancePct.toFixed(1) + '%' : 'N/A'}${flags.length ? ' | ' + flags.join(', ') : ''}`;
  }).join('\n');
}

function formatKes(amount?: number): string {
  if (amount == null) return 'N/A';
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Sanitize raw AI output so Zod doesn't choke on common quirks. */
function sanitizeWorkingPaperOutput(parsed: any, ctx: EngagementContext, areaDef: any): any {
  // Ensure top-level arrays exist
  parsed.dataLimitations = Array.isArray(parsed.dataLimitations) ? parsed.dataLimitations : [];
  parsed.auditRequestList = Array.isArray(parsed.auditRequestList) ? parsed.auditRequestList : [];
  parsed.unsupportedClaims = Array.isArray(parsed.unsupportedClaims) ? parsed.unsupportedClaims : [];
  parsed.areasForFurtherTesting = Array.isArray(parsed.areasForFurtherTesting) ? parsed.areasForFurtherTesting : [];
  parsed.analyticalProcedures = Array.isArray(parsed.analyticalProcedures) ? parsed.analyticalProcedures : [];
  parsed.keyObservations = Array.isArray(parsed.keyObservations) ? parsed.keyObservations : [];

  if (parsed.evidenceSufficiency == null || typeof parsed.evidenceSufficiency !== 'number') {
    parsed.evidenceSufficiency = 50;
  }

  // Sanitize citation objects - strip if incomplete/malformed
  function sanitizeCitation(c: any): any {
    if (!c || typeof c !== 'object') return undefined;
    const claim = typeof c.claim === 'string' ? c.claim : '';
    const sourceDocument = typeof c.sourceDocument === 'string' ? c.sourceDocument : 'Trial Balance';
    const accountOrItem = typeof c.accountOrItem === 'string' ? c.accountOrItem : '';
    const confidence = typeof c.confidence === 'number' ? Math.min(1, Math.max(0, c.confidence))
      : typeof c.confidence === 'string' ? Math.min(1, Math.max(0, parseFloat(c.confidence) || 0.8))
      : 0.8;
    if (!accountOrItem) return undefined; // not useful without a source item
    return { claim, sourceDocument, accountOrItem, amount: c.amount ?? undefined, confidence };
  }

  parsed.analyticalProcedures = parsed.analyticalProcedures.map((p: any) => ({
    procedure: String(p.procedure ?? ''),
    assertion: String(p.assertion ?? ''),
    expectation: String(p.expectation ?? ''),
    finding: String(p.finding ?? ''),
    conclusion: String(p.conclusion ?? ''),
    citation: sanitizeCitation(p.citation),
  }));

  parsed.keyObservations = parsed.keyObservations.map((o: any) => ({
    observation: String(o.observation ?? ''),
    risk: ['low', 'medium', 'high'].includes(o.risk) ? o.risk : 'low',
    assertionAffected: String(o.assertionAffected ?? ''),
    recommendation: o.recommendation ? String(o.recommendation) : undefined,
    citation: sanitizeCitation(o.citation),
  }));

  return parsed;
}

function buildFallbackWorkingPaper(
  area: AuditArea,
  areaLabel: string,
  rawText: string,
  ctx: EngagementContext,
): WorkingPaperOutput {
  return {
    title: `${areaLabel} Working Paper - ${ctx.clientName}`,
    paperRef: `WP-${area.toUpperCase().slice(0, 4)}-01`,
    isaReference: AUDIT_AREAS[area]?.primaryISAs.join(', ') || '',
    objective: AUDIT_AREAS[area]?.description || '',
    scope: `Financial year ended ${ctx.financialYearEnd}. Materiality: KES ${ctx.materialityAmount.toLocaleString()}.`,
    dataLimitations: ['AI output could not be parsed into structured format - manual review required.'],
    analyticalProcedures: [],
    keyObservations: [],
    areasForFurtherTesting: ['Manual review required - structured AI output failed. See raw text below.'],
    auditRequestList: [],
    preliminaryConclusion: rawText.slice(0, 500),
    evidenceSufficiency: 0,
    materialityApplied: `KES ${ctx.materialityAmount.toLocaleString()}`,
    unsupportedClaims: [],
    disclaimer: 'DRAFT WORKING PAPER - AI-ASSISTED - MUST BE REVIEWED AND APPROVED BY AUDIT MANAGER/PARTNER BEFORE INCLUSION IN AUDIT FILE',
  };
}
