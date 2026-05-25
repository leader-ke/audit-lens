/**
 * MULTI-LAYER ACCOUNT MAPPER
 *
 * Classifies any account name into a canonical FSCategory using 5 layers:
 *
 *   Layer 1 - Exact match against industry-specific dictionary
 *   Layer 2 - Alias match against expanded alias dictionary
 *   Layer 3 - Regex / pattern match (most flexible, covers variants)
 *   Layer 4 - Character trigram similarity (fuzzy - catches typos & abbreviations)
 *   Layer 5 - Flagged for AI / human confirmation (confidence too low)
 *
 * Layer 6 (human confirmation UI) is handled at the API/UI layer - this module
 * just sets needsReview=true and provides top candidates.
 */

import type { FSCategory } from './fs-categories';
import { FS_CATEGORY_META } from './fs-categories';
import { getTemplate, type IndustryType } from './industry-templates';

// ─── Result type ──────────────────────────────────────────────────────────────

export interface MappingResult {
  category: FSCategory;
  confidence: number;          // 0–1
  matchedLayer: 1 | 2 | 3 | 4 | 5;
  needsReview: boolean;        // true if confidence < REVIEW_THRESHOLD
  candidates?: Array<{ category: FSCategory; confidence: number; reason: string }>;
}

// Confidence below this → flag for human review
const REVIEW_THRESHOLD = 0.55;

// ─── Normalisation ────────────────────────────────────────────────────────────

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove trailing parenthetical suffixes common in Kenyan SME books:
 * "Trade Receivables (Net)" → "Trade Receivables"
 * "Salaries (Manufacturing)" → "Salaries Manufacturing"
 */
function cleanAccountName(name: string): string {
  return name
    .replace(/\s*\(.*?\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Layer 4: Trigram similarity ──────────────────────────────────────────────

function trigrams(s: string): Set<string> {
  const padded = `  ${s}  `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

function trigramSimilarity(a: string, b: string): number {
  const ga = trigrams(a);
  const gb = trigrams(b);
  let intersection = 0;
  for (const g of ga) if (gb.has(g)) intersection++;
  return (2 * intersection) / (ga.size + gb.size);
}

/**
 * Build a vocabulary of all canonical phrases from an industry template's
 * exact + alias dictionaries, keyed by normalised phrase → FSCategory.
 *
 * Single-word aliases (e.g. "losses", "capital", "loan") are excluded from
 * the trigram vocabulary - they are too promiscuous for fuzzy matching and
 * cause false-positive equity/liability classifications for longer account
 * names that happen to contain those words (e.g. "Foreign Exchange Loss"
 * matching "losses" → RETAINED_EARNINGS). Single-word entries still work
 * correctly at Layer 2 (exact alias match).
 */
function buildVocabulary(industry: IndustryType): Map<string, FSCategory> {
  const tmpl = getTemplate(industry);
  const vocab = new Map<string, FSCategory>();
  for (const [phrase, cat] of Object.entries(tmpl.exactMatch)) vocab.set(phrase, cat);
  for (const [phrase, cat] of Object.entries(tmpl.aliasMatch)) {
    // Only include multi-word phrases in the trigram vocabulary
    if (phrase.split(' ').length >= 2) vocab.set(phrase, cat);
  }
  return vocab;
}

// Cache vocab per industry (built once per process; cleared on hot-reload in dev)
const vocabCache = new Map<IndustryType, Map<string, FSCategory>>();

function getVocab(industry: IndustryType): Map<string, FSCategory> {
  if (!vocabCache.has(industry)) {
    vocabCache.set(industry, buildVocabulary(industry));
  }
  return vocabCache.get(industry)!;
}

/** Clear the vocabulary cache - call after template changes in tests or dev. */
export function clearVocabCache(): void {
  vocabCache.clear();
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

export function mapAccount(
  rawName: string,
  accountCode?: string,
  industry: IndustryType = 'general',
): MappingResult {
  const template = getTemplate(industry);
  const cleaned = cleanAccountName(rawName);
  const norm = normalise(cleaned);

  // ── Layer 1: Exact match ──────────────────────────────────────────────────
  if (template.exactMatch[norm]) {
    return {
      category: template.exactMatch[norm],
      confidence: 0.99,
      matchedLayer: 1,
      needsReview: false,
    };
  }

  // ── Layer 2: Alias match ──────────────────────────────────────────────────
  if (template.aliasMatch[norm]) {
    return {
      category: template.aliasMatch[norm],
      confidence: 0.92,
      matchedLayer: 2,
      needsReview: false,
    };
  }

  // ── Layer 3: Regex patterns ───────────────────────────────────────────────
  const regexMatches: Array<{ category: FSCategory; confidence: number }> = [];
  for (const rule of template.regexPatterns) {
    if (rule.pattern.test(cleaned)) {
      regexMatches.push({ category: rule.category, confidence: rule.confidence });
    }
  }
  if (regexMatches.length > 0) {
    // Take highest-confidence match; if tie, first one wins (more specific patterns are listed first)
    const best = regexMatches.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    return {
      category: best.category,
      confidence: best.confidence,
      matchedLayer: 3,
      needsReview: best.confidence < REVIEW_THRESHOLD,
      candidates: regexMatches.length > 1 ? regexMatches.map(m => ({ ...m, reason: `regex pattern match` })) : undefined,
    };
  }

  // ── Layer 4: Trigram similarity ───────────────────────────────────────────
  const vocab = getVocab(industry);
  let bestSim = 0;
  let bestCat: FSCategory = 'UNKNOWN';
  const simCandidates: Array<{ category: FSCategory; confidence: number; reason: string }> = [];

  for (const [phrase, cat] of vocab) {
    const sim = trigramSimilarity(norm, phrase);
    if (sim > 0.35) {
      simCandidates.push({ category: cat, confidence: sim * 0.85, reason: `trigram match to "${phrase}"` });
      if (sim > bestSim) { bestSim = sim; bestCat = cat; }
    }
  }

  if (bestSim > 0.45) {
    const confidence = bestSim * 0.85;
    return {
      category: bestCat,
      confidence,
      matchedLayer: 4,
      needsReview: confidence < REVIEW_THRESHOLD,
      candidates: simCandidates.sort((a, b) => b.confidence - a.confidence).slice(0, 3),
    };
  }

  // ── Layer 5: Fall back to account code ranges (Kenya standard COA) ────────
  if (accountCode) {
    const codeNum = parseInt(accountCode.replace(/\D/g, '')) || 0;
    const codeCategory = codeRangeClassify(codeNum);
    if (codeCategory !== 'UNKNOWN') {
      return {
        category: codeCategory,
        confidence: 0.55,
        matchedLayer: 5,
        needsReview: true,
        candidates: [{ category: codeCategory, confidence: 0.55, reason: `account code range ${accountCode}` }],
      };
    }
  }

  // Unresolvable - flag for human review
  return {
    category: 'UNKNOWN',
    confidence: 0,
    matchedLayer: 5,
    needsReview: true,
    candidates: simCandidates.slice(0, 3),
  };
}

/**
 * Kenya SME chart of accounts code ranges.
 * Matches the standard COA used by Kenya SMEs (as reflected in the user's TB):
 *   1xxx  Assets      (1000–1099 cash/bank, 1100–1199 AR, 1200–1299 inventory,
 *                      1300–1499 other CA, 1500–1999 NCA / PPE / ROU / intangibles)
 *   2xxx  Liabilities (2000–2399 AP/accruals/VAT/PAYE, 2400–2599 LT borrowings,
 *                      2600–2999 other CL)
 *   3xxx  Equity      (3000–3499 share capital, 3500–3999 retained earnings)
 *   4xxx  Revenue     (4000–4499 sales revenue, 4500–4999 other revenue)
 *   5xxx  COGS        (5000–5999 cost of goods sold / direct costs)
 *   6xxx  Opex        (6000–6499 other opex / admin, 6500–6999 payroll & staff costs)
 *   7xxx  Other inc.  (7000–7499 other income, 7500–7999 finance costs)
 *   8xxx  Finance     (8000–8999 finance costs / interest)
 *   9xxx  Tax         (9000–9999 income tax expense)
 */
function codeRangeClassify(code: number): FSCategory {
  if (code >= 1000 && code < 1100) return 'CASH_BANK';
  if (code >= 1100 && code < 1200) return 'AR_TRADE';
  if (code >= 1200 && code < 1300) return 'INVENTORY';
  if (code >= 1300 && code < 1500) return 'OTHER_CA';
  if (code >= 1500 && code < 2000) return 'PPE_GROSS';
  if (code >= 2000 && code < 2400) return 'AP_TRADE';
  if (code >= 2400 && code < 2600) return 'LT_BORROWINGS';
  if (code >= 2600 && code < 3000) return 'OTHER_CL';
  if (code >= 3000 && code < 3500) return 'SHARE_CAPITAL';
  if (code >= 3500 && code < 4000) return 'RETAINED_EARNINGS';
  if (code >= 4000 && code < 4500) return 'REVENUE_SALES';
  if (code >= 4500 && code < 5000) return 'REVENUE_OTHER';
  if (code >= 5000 && code < 6000) return 'COGS';
  if (code >= 6000 && code < 6500) return 'OTHER_OPEX';
  if (code >= 6500 && code < 7000) return 'PAYROLL_EXPENSE';
  if (code >= 7000 && code < 7500) return 'REVENUE_OTHER';
  if (code >= 7500 && code < 8000) return 'FINANCE_COSTS';
  if (code >= 8000 && code < 9000) return 'FINANCE_COSTS';
  if (code >= 9000 && code < 10000) return 'TAX_EXPENSE';
  return 'UNKNOWN';
}

// ─── Batch mapper ─────────────────────────────────────────────────────────────

export interface AccountWithMapping {
  accountCode?: string;
  accountName: string;
  currentYearBalance: number;
  priorYearBalance?: number;
  fsCategory: FSCategory;
  auditArea: import('./isa-standards').AuditArea;
  mappingConfidence: number;
  matchedLayer: number;
  needsReview: boolean;
}

// Categories that are balance-sheet equity - should never be assigned to P&L expense accounts
const EQUITY_CATEGORIES = new Set<FSCategory>([
  'SHARE_CAPITAL', 'SHARE_PREMIUM', 'RETAINED_EARNINGS', 'REVALUATION_RESERVE',
  'OTHER_RESERVES', 'DRAWINGS', 'MEMBER_SHARES', 'RESTRICTED_FUNDS',
]);

// Kenya COA code ranges that are definitively P&L expense lines (5xxx–9xxx)
function isExpenseCodeRange(code?: string): boolean {
  if (!code) return false;
  const n = parseInt(code.replace(/\D/g, '')) || 0;
  return n >= 5000 && n <= 9999;
}

export function mapAccounts(
  accounts: Array<{ accountCode?: string; accountName: string; currentYearBalance: number; priorYearBalance?: number }>,
  industry: IndustryType = 'general',
): AccountWithMapping[] {
  return accounts.map(acc => {
    let result = mapAccount(acc.accountName, acc.accountCode, industry);

    // Type-consistency guard: if the mapper returns an equity category for an
    // account whose code is in the expense range (5000–9999), the match is a
    // false positive (e.g. "Foreign Exchange Loss" trigram-matching "losses"
    // → RETAINED_EARNINGS). Demote to OTHER_OPEX with low confidence.
    if (EQUITY_CATEGORIES.has(result.category) && isExpenseCodeRange(acc.accountCode)) {
      result = {
        category: 'OTHER_OPEX',
        confidence: 0.45,
        matchedLayer: 5,
        needsReview: true,
        candidates: result.candidates,
      };
    }

    const meta = FS_CATEGORY_META[result.category];
    return {
      ...acc,
      fsCategory: result.category,
      auditArea: meta?.auditArea ?? 'expenses',
      mappingConfidence: result.confidence,
      matchedLayer: result.matchedLayer,
      needsReview: result.needsReview,
    };
  });
}
