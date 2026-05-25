/**
 * MANAGEMENT LETTER AI GENERATOR (ISA 265)
 *
 * Drafts the letter from auditor to management communicating internal
 * control deficiencies and recommendations identified during the audit.
 */

import { generateText } from 'ai';
import { z } from 'zod';
import { getLanguageModel, getTokenBudget, truncateToTokenBudget, type AIConfig } from './provider';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const LetterFindingSchema = z.object({
  area: z.string(),                         // e.g. "Revenue", "Payroll"
  wpReference: z.string(),                  // e.g. "WP-REV-001"
  deficiency: z.string(),                   // What the control gap is
  risk: z.string(),                         // Impact if not addressed
  rootCause: z.string(),                    // Likely underlying cause
  recommendation: z.string(),              // Specific actionable fix
  priority: z.enum(['high', 'medium', 'low']),
  managementResponse: z.string().default(''), // Blank placeholder for client to fill
});

export const ManagementLetterOutputSchema = z.object({
  introduction: z.string(),
  findings: z.array(LetterFindingSchema),
  conclusion: z.string(),
  fullLetterContent: z.string(),            // Complete formatted Markdown letter
});

export type ManagementLetterOutput = z.infer<typeof ManagementLetterOutputSchema>;
export type LetterFinding = z.infer<typeof LetterFindingSchema>;

// ─── Context ──────────────────────────────────────────────────────────────────

export interface LetterEngagementContext {
  clientName: string;
  entityType: string;
  financialYearEnd: string;
  auditType: string;
  auditorFirmName: string;
  materialityAmount: number;
}

export interface WPFindingSummary {
  auditArea: string;
  areaLabel: string;
  paperRef: string;
  keyObservations: Array<{
    observation: string;
    risk: string;
    assertionAffected: string;
    recommendation?: string;
  }>;
  areasForFurtherTesting: string[];
}

// ─── Generator ───────────────────────────────────────────────────────────────

export async function generateManagementLetter(
  context: LetterEngagementContext,
  wpSummaries: WPFindingSummary[],
  config: AIConfig,
): Promise<ManagementLetterOutput> {

  const budget = getTokenBudget(config.provider);
  const model = getLanguageModel(config);

  // Only pass findings that have something worth communicating
  const relevant = wpSummaries.filter(wp =>
    wp.keyObservations.some(o => o.risk === 'high' || o.risk === 'medium')
  );

  const totalFindings = relevant.reduce(
    (n, wp) => n + wp.keyObservations.filter(o => o.risk === 'high' || o.risk === 'medium').length, 0
  );

  const findingsBlock = relevant.map(wp => {
    const obs = wp.keyObservations
      .filter(o => o.risk === 'high' || o.risk === 'medium')
      .map(o => `  [${o.risk.toUpperCase()}] ${o.observation} | Assertion: ${o.assertionAffected}${o.recommendation ? ` | Suggested action: ${o.recommendation}` : ''}`)
      .join('\n');
    return `### ${wp.areaLabel} (${wp.paperRef})\n${obs}`;
  }).join('\n\n');

  const block = truncateToTokenBudget(findingsBlock, Math.floor(budget.maxInputChars * 0.5));

  const systemPrompt = `You are a senior audit manager drafting a management letter (ISA 265) for an ICPAK-registered audit.

═══ PURPOSE ═══
The management letter communicates internal control deficiencies and control recommendations to management/the board. It is NOT the audit report. It is a separate, confidential communication.

═══ STRUCTURE ═══
1. INTRODUCTION: 2-3 sentences - purpose of letter, audit period, ISA 265 reference, limitation (findings are from audit procedures, not a comprehensive internal control review).
2. FINDINGS: One structured entry per deficiency. Group by business area. Each finding:
   - Deficiency: What is missing or weak in the control environment
   - Risk/Impact: What could go wrong if not addressed
   - Root Cause: Most likely underlying reason (process gap, segregation of duties, system limitation, etc.)
   - Recommendation: Specific, actionable - what management should do, not generic advice
   - Priority: HIGH (significant deficiency per ISA 265.6) | MEDIUM (other deficiency) | LOW (best-practice improvement)
   - Management Response: Leave as empty string - client fills this in
3. CONCLUSION: 2-3 sentences - note that management is expected to respond, auditor will follow up, findings are confidential.

═══ RULES ═══
- Source ONLY from working paper observations provided. Do not invent findings.
- If a medium or low risk observation has no clear control implication, omit it - only include findings where there is an identifiable control gap.
- Priority HIGH = significant deficiency (ISA 265.6): a deficiency important enough to merit prompt management attention. Not every high-risk WP observation is a significant deficiency.
- Priority MEDIUM = other deficiency (ISA 265.5): auditor's judgment that it is less severe than significant.
- Priority LOW = best-practice recommendation only.
- Recommendations must be specific: "Implement a three-way matching control for purchases above KES 50,000" not "Improve controls."
- Root cause must be specific: "Absence of segregation of duties between invoice approval and payment processing" not "Weak controls."
- Tone: Professional, constructive, non-accusatory. Audit findings, not accusations.
- No ISA citation repetition - cite ISA 265 once in the introduction only.

RISK FIELD LANGUAGE: Always frame risk as potential, not confirmed. Write "Risk of [outcome] if not corrected" - never assert "Misstatement of X" or "Unrecorded Y" as if confirmed. Example: "Risk of misclassification and potential misstatement if not corrected" not "Misstatement of net receivables."

CONTROL FREQUENCY: Classify the deficiency frequency pattern and include it at the start of the deficiency field in square brackets:
- [STRUCTURAL] - policy or process entirely absent; gap will recur every period until addressed.
- [RECURRING] - control exists but repeatedly fails (evidenced by multiple instances in the same period).
- [ISOLATED] - one-off transaction error; control exists but did not prevent this instance.
When the root cause is "absence of a policy/process/account/register", always use [STRUCTURAL].

GOVERNANCE LINKAGE: When two or more findings share the same root governance gap (e.g., no chart of accounts maintenance policy, no period-end close checklist, no segregation of duties framework), cross-reference them in each finding deficiency field: "See also: [area of related finding]." Add a single cross-cutting governance finding under area "ERP / Chart of Accounts Governance" or "Period-End Close Governance" only if three or more findings trace to the same control failure - do not create a governance finding for fewer.

- fullLetterContent: Complete Markdown letter, print-ready. Include letterhead (${context.auditorFirmName}), date line (${context.financialYearEnd}), addressee (Board of Directors / Management, ${context.clientName}), all sections with ## headings, signature block.

OUTPUT: Valid JSON only, no markdown fences.`;

  const userPrompt = `Draft the management letter.

CLIENT: ${context.clientName}
ENTITY TYPE: ${context.entityType}
FINANCIAL YEAR END: ${context.financialYearEnd}
AUDIT FIRM: ${context.auditorFirmName}
OVERALL MATERIALITY: KES ${context.materialityAmount.toLocaleString()}
WORKING PAPERS WITH FINDINGS: ${relevant.length} areas
TOTAL MEDIUM/HIGH OBSERVATIONS: ${totalFindings}

OBSERVATIONS FROM WORKING PAPERS:
${block}

Return JSON:
{
  "introduction": "2-3 sentence intro paragraph",
  "findings": [
    {
      "area": "Revenue",
      "wpReference": "WP-REV-001",
      "deficiency": "specific control gap",
      "risk": "specific impact",
      "rootCause": "specific root cause",
      "recommendation": "specific actionable recommendation",
      "priority": "high|medium|low",
      "managementResponse": ""
    }
  ],
  "conclusion": "2-3 sentence closing paragraph",
  "fullLetterContent": "complete Markdown letter"
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

  let jsonStr = text.trim();
  const fenced = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fenced) jsonStr = fenced[1].trim();
  else { const obj = jsonStr.match(/(\{[\s\S]*\})/); if (obj) jsonStr = obj[1].trim(); }

  const parsed = JSON.parse(jsonStr);
  const result = ManagementLetterOutputSchema.safeParse(parsed);
  if (result.success) return result.data;

  return {
    introduction: parsed.introduction ?? '',
    findings: Array.isArray(parsed.findings)
      ? parsed.findings.map((f: any) => ({
          area: f.area ?? '',
          wpReference: f.wpReference ?? '',
          deficiency: f.deficiency ?? '',
          risk: f.risk ?? '',
          rootCause: f.rootCause ?? '',
          recommendation: f.recommendation ?? '',
          priority: ['high', 'medium', 'low'].includes(f.priority) ? f.priority : 'medium',
          managementResponse: f.managementResponse ?? '',
        }))
      : [],
    conclusion: parsed.conclusion ?? '',
    fullLetterContent: parsed.fullLetterContent ?? text.slice(0, 3000),
  };
}
