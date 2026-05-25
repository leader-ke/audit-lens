import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

export type AIProviderName = 'groq' | 'openai' | 'anthropic';

export interface AIConfig {
  provider: AIProviderName;
  model: string;
  apiKey?: string;
  baseUrl?: string; // for ollama
}

export interface TokenBudget {
  maxInputChars: number;
  maxTokens: number;
  extractionMaxTokens: number;
}

const TOKEN_BUDGETS: Record<AIProviderName, TokenBudget> = {
  anthropic: { maxInputChars: 80000, maxTokens: 8000, extractionMaxTokens: 3000 },
  openai:    { maxInputChars: 80000, maxTokens: 8000, extractionMaxTokens: 3000 },
  groq:      { maxInputChars: 30000, maxTokens: 4000, extractionMaxTokens: 2000 },
};

export function getLanguageModel(config: AIConfig) {
  switch (config.provider) {
    case 'groq': {
      const groq = createGroq({ apiKey: config.apiKey || process.env.GROQ_API_KEY });
      return groq(config.model || 'llama-3.3-70b-versatile');
    }
    case 'openai': {
      const openai = createOpenAI({ apiKey: config.apiKey || process.env.OPENAI_API_KEY });
      return openai(config.model || 'gpt-4o');
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY });
      return anthropic(config.model || 'claude-sonnet-4-6');
    }
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

export function getTokenBudget(provider: AIProviderName): TokenBudget {
  return TOKEN_BUDGETS[provider] ?? TOKEN_BUDGETS.groq;
}

export function truncateToTokenBudget(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[CONTENT TRUNCATED - work with available data only]';
}

// Default: Anthropic claude-sonnet-4-6 for this version.
// Fully model-agnostic - swap provider/model per org or per request.
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
};
