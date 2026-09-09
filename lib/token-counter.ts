import { countTokens } from 'gpt-tokenizer';

/**
 * Accurately calculates token count using gpt-tokenizer (cl100k_base encoding),
 * with a resilient character-heuristic fallback in case of abnormal input.
 */
export function calculateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  try {
    return countTokens(text);
  } catch (err) {
    // Fallback approximation (~4 chars per token for English text)
    console.warn('gpt-tokenizer count failed, falling back to approximation:', err);
    return Math.ceil(text.length / 4);
  }
}

export function calculateWordCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function calculateCharCount(text: string): number {
  return text ? text.length : 0;
}
