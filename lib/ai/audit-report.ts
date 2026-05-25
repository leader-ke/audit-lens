/**
 * AUDIT REPORT AI GENERATOR
 *
 * Generates ISA 700-compliant audit reports from completed working papers.
 * The opinion type (unmodified/qualified/adverse/disclaimer) is determined
 * automatically from the working paper findings.
 */

import { generateText } from 'ai';
import { z } from 'zod';
import { getLanguageModel, getTokenBudget, truncateToTokenBudget, type AIConfig } from './provider';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const KeyAuditMatterSchema = z.object({
  title: z.string(),
  description: z.string(),       // Why it is significant
  auditResponse: z.string(),     // How the auditor addressed it
  wpReference: z.string(),       // e.g. WP-REV-001
});

export const AuditReportOutputSchema = z.object({
  reportType: z.enum(['unmodified', 'qualified', 'adverse', 'disclaimer']),
  opinionBasis: z.string(),      // One sentence explaining why this opinion type
  addressee: z.string(),         // e.g. "The Members of ABC Limited"
  opinionParagraph: z.string(),  // Core opinion - ISA 700 para 24-26
  basisOfOpinion: z.string(),    // ISA 700 para 28-29
  keyAuditMatters: z.array(KeyAuditMatterSchema).default([]),
  responsibilitiesOfManagement: z.string(),
  auditorResponsibilities: z.string(),
  emphasisOfMatter: z.string().optional(),        // ISA 706 - only if needed
  otherReportingResponsibilities: z.string().optional(),
  goingConcernParagraph: z.string().optional(),   // ISA 570 - only if flagged
  fullReportContent: z.string(),  // Complete formatted Markdown report
});

export type AuditReportOutput = z.infer<typeof AuditReportOutputSchema>;

// ─── Context Types ────────────────────────────────────────────────────────────

export interface WorkingPaperSummary {
  auditArea: string;
  areaLabel: string;
  paperRef: string;
  preliminaryConclusion: string;
  evidenceSufficiency: number;   // 0-100
  highRiskCount: number;
  mediumRiskCount: number;
  keyObservations: Array<{ observation: string; risk: string; assertionAffected: string }>;
  dataLimitations: string[];
}

export interface ReportEngagementContext {
  clientName: string;
  entityType: string;
  financialYearEnd: string;      // e.g. "31 December 2024"
  auditType: string;
  materialityAmount: number;
  materialityBasis?: string;
  performanceMateriality: number;
  auditorFirmName: string;
  hasTBImbalance: boolean;
  tbImbalance?: number;
}

// ─── Report Generator ─────────────────────────────────────────────────────────

export async function generateAuditReport(
  context: ReportEngagementContext,
  workingPapers: WorkingPaperSummary[],
  config: AIConfig,
): Promise<AuditReportOutput> {

  const budget = getTokenBudget(config.provider);
  const model = getLanguageModel(config);

  // Determine opinion type from working papers
  const totalHighRisk = workingPapers.reduce((n, wp) => n + wp.highRiskCount, 0);
  const hasGoingConcern = workingPapers.some(wp => wp.auditArea === 'going_concern' && wp.highRiskCount > 0);
  const hasUnresolvedTBImbalance = context.hasTBImbalance;
  const hasInsufficientEvidence = workingPapers.some(wp => wp.evidenceSufficiency < 20);
  const papersWithHighRisk = workingPapers.filter(wp => wp.highRiskCount > 0).map(wp => wp.areaLabel);
  const coveredAreas = workingPapers.length;
  const avgEvidenceSufficiency = coveredAreas > 0
    ? Math.round(workingPapers.reduce((s, wp) => s + wp.evidenceSufficiency, 0) / coveredAreas)
    : 0;

  // Opinion guidance for the AI (not a forced override - AI makes final call)
  let opinionGuidance = 'unmodified';
  if (hasInsufficientEvidence || hasUnresolvedTBImbalance) opinionGuidance = 'disclaimer or qualified';
  else if (totalHighRisk >= 3) opinionGuidance = 'qualified (material misstatement)';
  else if (totalHighRisk > 0) opinionGuidance = 'unmodified with emphasis of matter or qualified';

  // Summarise working papers for the prompt (truncate if needed)
  const wpSummary = workingPapers.map(wp => {
    const obs = wp.keyObservations.slice(0, 3)
      .map(o => `  - [${o.risk.toUpperCase()}] ${o.observation} (${o.assertionAffected})`).join('\n');
    return [
      `### ${wp.areaLabel} (${wp.paperRef})`,
      `Conclusion: ${wp.preliminaryConclusion}`,
      `Evidence sufficiency: ${wp.evidenceSufficiency}%`,
      `High-risk findings: ${wp.highRiskCount} | Medium: ${wp.mediumRiskCount}`,
      obs ? `Key observations:\n${obs}` : '',
      wp.dataLimitations.length ? `Limitations: ${wp.dataLimitations.slice(0, 2).join('; ')}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  const wpBlock = truncateToTokenBudget(wpSummary, Math.floor(budget.maxInputChars * 0.55));

  // Detect which audit cycles have working papers and which are absent
  const coveredCycles = new Set(workingPapers.map(wp => wp.auditArea));
  const keyCycles = ['fixed_assets', 'cash_and_bank', 'equity', 'tax', 'payroll'];
  const missingCycles = keyCycles.filter(c => !coveredCycles.has(c));

  const systemPrompt = `You are a senior audit partner at an ICPAK-registered firm in Kenya.
Draft a concise, ISA 700-compliant independent auditor's report. Target length: 600-800 words of body text - Big 4 partner standard, not verbose AI prose.

═══ ISA COMPLIANCE ═══
1. PARAGRAPH ORDER (ISA 700.22): Opinion → Basis for Opinion → Key Audit Matters → Going Concern (only if flagged) → Management Responsibilities → Auditor Responsibilities → Other Reporting Responsibilities.
2. OPINION TYPE: Suggested: ${opinionGuidance}. Apply professional judgment. State concise reasoning in opinionBasis (1 sentence).
3. OPINION PARAGRAPH: Name the financial statements, entity, period, IFRS framework. For disclaimer, state: "We do not express an opinion on the financial statements. Because of the significance of the matters described in the Basis for Disclaimer of Opinion section, we have not been able to obtain sufficient appropriate audit evidence."
4. DISCLAIMER - PERVASIVE LIMITATION: If opinion is disclaimer or qualified due to scope limitation, include this sentence in basisOfOpinion: "Material uncertainty exists over our ability to form any opinion due to pervasive limitations in the evidence available."
5. BASIS FOR OPINION: Reference ISAs, independence, and evidence sufficiency. One paragraph, 3-4 sentences.
6. KEY AUDIT MATTERS (ISA 701): For disclaimer opinions: include KAMs headed "Key Audit Matters - Included for Transparency" with a note: "These matters are identified for transparency only and do not constitute separate assurance conclusions." Do NOT include evidenceSufficiency percentages in KAMs - that is an internal working paper metric. Each KAM: title, 1 sentence why significant, 1 sentence auditor response.
7. COVERAGE LIMITATION: If audit cycles are missing (no working papers), include in basisOfOpinion: "Our audit did not encompass [list areas] - these cycles were outside the scope of procedures performed."
8. GOING CONCERN (ISA 570): Only include goingConcernParagraph if explicitly flagged in the working papers.
9. MANAGEMENT RESPONSIBILITIES: Standard ISA 700.33 paragraph. 3-4 sentences. Do not repeat entity name more than once.
10. AUDITOR RESPONSIBILITIES: Standard ISA 700.38-40. Reference materiality of KES ${context.materialityAmount.toLocaleString()}. 4-5 sentences.
11. OTHER REPORTING: Kenya Companies Act 2015 s.724 - one sentence on accounting records.

═══ COVERAGE & COMPLETENESS ═══
12. MISSING CYCLES: The following audit cycles have no working papers: ${missingCycles.length > 0 ? missingCycles.join(', ') : 'none identified'}. The report must NOT imply full financial statement coverage if key cycles are absent. Scope the opinion accordingly.
13. PPE CYCLE: If fixed_assets working paper exists, address existence, valuation, and depreciation policy in the relevant KAM or basis paragraph. If absent, note the scope limitation.
14. TAX COMPLETENESS: If a tax working paper exists, address both the income tax expense AND the tax liability recognition risk (reconciliation of tax payable to tax expense). Do not discuss one without the other.
15. DO NOT invent findings not present in the working paper summaries. Do not add cycles or balances not provided.

═══ LANGUAGE & FORMAT ═══
16. Use "we" not "I". Addressee: "The Members of ${context.clientName}".
17. Never say "limited assurance" (ISRE 2400 term). Never reference localhost, URLs, system names, or internal metrics.
18. Amounts in KES only. No generic currency symbols.
19. fullReportContent: Complete print-ready Markdown. Letterhead: "${context.auditorFirmName}". Title: "INDEPENDENT AUDITOR'S REPORT". All sections with ## headings. Signature block at end. No pagination markers, no system artifacts.
20. Compress repeated limitation statements - state once in dataLimitations section, cross-reference elsewhere rather than repeating.

OUTPUT: Valid JSON only, no markdown fences.`;

  const userPrompt = `Generate the independent auditor's report.

CLIENT: ${context.clientName}
ENTITY TYPE: ${context.entityType}
FINANCIAL YEAR END: ${context.financialYearEnd}
AUDIT TYPE: ${context.auditType}
AUDIT FIRM: ${context.auditorFirmName}
OVERALL MATERIALITY: KES ${context.materialityAmount.toLocaleString()} (${context.materialityBasis || 'basis not specified'})
PERFORMANCE MATERIALITY: KES ${context.performanceMateriality.toLocaleString()}
WORKING PAPERS REVIEWED: ${coveredAreas} areas
AVERAGE EVIDENCE SUFFICIENCY: ${avgEvidenceSufficiency}%
HIGH-RISK AREAS: ${papersWithHighRisk.length > 0 ? papersWithHighRisk.join(', ') : 'None identified'}
${context.hasTBImbalance ? `TB IMBALANCE: KES ${context.tbImbalance?.toLocaleString()} - scope limitation applies` : ''}
GOING CONCERN RISK: ${hasGoingConcern ? 'YES - flagged in working papers' : 'No specific indicators'}

WORKING PAPER SUMMARIES:
${wpBlock}

Return JSON matching this exact structure:
{
  "reportType": "unmodified|qualified|adverse|disclaimer",
  "opinionBasis": "1 sentence explaining why this opinion type was selected",
  "addressee": "The Members of ${context.clientName}",
  "opinionParagraph": "Full opinion paragraph per ISA 700",
  "basisOfOpinion": "Full basis paragraph per ISA 700.28",
  "keyAuditMatters": [{ "title": "", "description": "", "auditResponse": "", "wpReference": "" }],
  "responsibilitiesOfManagement": "Full paragraph",
  "auditorResponsibilities": "Full paragraph",
  "emphasisOfMatter": "Optional - include only if needed per ISA 706",
  "otherReportingResponsibilities": "Companies Act 2015 s.724 paragraph",
  "goingConcernParagraph": "Optional - include only if going concern risk exists",
  "fullReportContent": "Complete formatted Markdown report"
}`;

  const { text } = await generateText({
    model: model as any,
    temperature: 0,
    ...(budget.maxTokens ? { maxTokens: budget.maxTokens } : {}),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  // Strip markdown fences
  let jsonStr = text.trim();
  const fenced = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fenced) jsonStr = fenced[1].trim();
  else {
    const obj = jsonStr.match(/(\{[\s\S]*\})/);
    if (obj) jsonStr = obj[1].trim();
  }

  const parsed = JSON.parse(jsonStr);
  const result = AuditReportOutputSchema.safeParse(parsed);
  if (result.success) return result.data;

  // Fallback: return what we can
  return {
    reportType: parsed.reportType ?? 'unmodified',
    opinionBasis: parsed.opinionBasis ?? '',
    addressee: parsed.addressee ?? `The Members of ${context.clientName}`,
    opinionParagraph: parsed.opinionParagraph ?? '',
    basisOfOpinion: parsed.basisOfOpinion ?? '',
    keyAuditMatters: Array.isArray(parsed.keyAuditMatters) ? parsed.keyAuditMatters : [],
    responsibilitiesOfManagement: parsed.responsibilitiesOfManagement ?? '',
    auditorResponsibilities: parsed.auditorResponsibilities ?? '',
    emphasisOfMatter: parsed.emphasisOfMatter ?? undefined,
    otherReportingResponsibilities: parsed.otherReportingResponsibilities ?? undefined,
    goingConcernParagraph: parsed.goingConcernParagraph ?? undefined,
    fullReportContent: parsed.fullReportContent ?? text.slice(0, 3000),
  };
}
