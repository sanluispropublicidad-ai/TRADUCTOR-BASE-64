import { Preset, ApiConfig, ThemeMode } from '@/types';

const STORAGE_KEYS = {
  API_CONFIG: 'prompt_translator_api_config_v1',
  PRESETS: 'prompt_translator_presets_v1',
  ACTIVE_PRESET_ID: 'prompt_translator_active_preset_id_v1',
  THEME: 'prompt_translator_theme_v1',
} as const;

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: 'https://api.xkiro.com/v1',
  apiKey: 'sk-xt-dc318070f4e15386be803c26704a0678a24aadd5dc40407f',
  model: 'deepseek/deepseek-v4-flash',
  temperature: 0.7,
  maxTokens: 3000,
  modelsList: [
    'deepseek/deepseek-v4-flash',
    'openai/gpt-5.6-sol',
    'anthropic/claude-3-5-sonnet',
    'deepseek/deepseek-chat',
    'deepseek/deepseek-reasoner',
    'qwen/qwen3.7-plus',
    'gpt-4o',
    'gpt-4o-mini',
  ],
};

// Recommended optional starter pack, only loaded if the user explicitly triggers it
export const OPTIONAL_STARTER_PRESETS: Preset[] = [
  {
    id: 'starter-frontier-architect',
    name: 'Frontier Prompt Architect',
    description: 'Structures messy thoughts into rigorous, modular instructions with XML tags, constraints, and testable outputs.',
    system_prompt: `You are an elite Frontier Prompt Engineer. Your objective is to translate the user's raw, unstructured concept into a world-class prompt optimized for state-of-the-art LLMs (Claude 3.5 Sonnet, GPT-4o, DeepSeek-R1).

Format the enhanced prompt cleanly using markdown and structural conventions:
1. <role_and_objective>: Precision persona definition and high-leverage goal.
2. <context_and_background>: Framing assumptions and requirements.
3. <core_instructions>: Step-by-step directives written with clarity and imperative verbs.
4. <constraints_and_guardrails>: Strict negative boundaries (what NOT to do) and edge-case handling.
5. <output_format>: Clear schema, layout, or syntax specification.
6. <few_shot_or_examples>: Placeholder or concrete demonstration if relevant.

Return ONLY the final optimized prompt ready for immediate use. Do not include introductory pleasantries or meta-commentary outside the prompt.`,
    temperature: 0.7,
  },
  {
    id: 'starter-system-developer',
    name: 'Systems & Code Architect',
    description: 'Transforms software concepts into production-grade engineering specifications with strict typing and edge cases.',
    system_prompt: `You are a Principal Software Architect and Lead Code Prompt Specialist. Transform the user's rough programming idea into an exhaustive engineering implementation prompt.

Ensure the generated prompt demands:
- Architecture patterns, idiomatic conventions, and strict type safety.
- Explicit failure mode handling, concurrency safeguards, and performance boundaries.
- Step-by-step implementation order with zero placeholders or omissions.
- Verification and self-testing criteria.

Output ONLY the distilled, production-grade prompt. Avoid extraneous chatter.`,
    temperature: 0.5,
  },
  {
    id: 'starter-chain-of-thought',
    name: 'Deep Reasoning & CoT',
    description: 'Constructs prompts requiring deep first-principles analysis, hypothesis falsification, and verifiable deductions.',
    system_prompt: `You are a Specialist in Cognitive Architecture and Deliberative Prompting. Convert the user's question or problem statement into a deep reasoning prompt.

The transformed prompt must instruct the target LLM to:
1. Deconstruct the problem into foundational axioms and explicit variables.
2. State implicit assumptions and formulate competing hypotheses.
3. Run rigorous internal chain-of-thought analysis before reaching any conclusion.
4. Stress-test edge cases, potential failure modes, and counter-arguments.
5. Provide a decisive, falsifiable final verdict with action steps.

Return ONLY the finalized prompt ready to feed into a reasoning model.`,
    temperature: 0.7,
  },
  {
    id: 'starter-minimalist-distiller',
    name: 'Minimalist Direct Distiller',
    description: 'Strips all fluff, producing laser-focused, concise prompts with maximum signal-to-noise ratio.',
    system_prompt: `You are a Minimalist Prompt Distiller. Take the user's rambling or vague request and condense it into a razor-sharp, zero-fluff, highly direct instruction.

Rules for output prompt:
- Direct imperative verbs.
- Zero boilerplate, zero generic qualifiers.
- High density of meaning per token.
- Clear expected output format.

Output only the distilled prompt without commentary.`,
    temperature: 0.4,
  },
];

export function loadApiConfig(): ApiConfig {
  if (typeof window === 'undefined') return DEFAULT_API_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.API_CONFIG);
    if (!raw) return DEFAULT_API_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_API_CONFIG,
      ...parsed,
      // If previous config had empty apiKey or was old default openai without key, apply user xKiro key
      baseUrl: parsed.baseUrl && parsed.baseUrl !== 'https://api.openai.com/v1' ? parsed.baseUrl : DEFAULT_API_CONFIG.baseUrl,
      apiKey: parsed.apiKey && parsed.apiKey.trim().length > 0 ? parsed.apiKey : DEFAULT_API_CONFIG.apiKey,
      model: parsed.model && parsed.model !== 'gpt-4o' ? parsed.model : DEFAULT_API_CONFIG.model,
      modelsList: Array.isArray(parsed.modelsList) && parsed.modelsList.length > 0
        ? Array.from(new Set([...(DEFAULT_API_CONFIG.modelsList || []), ...parsed.modelsList]))
        : DEFAULT_API_CONFIG.modelsList,
    };
  } catch {
    return DEFAULT_API_CONFIG;
  }
}

export function saveApiConfig(config: ApiConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save API config to localStorage:', err);
  }
}

/**
 * Loads presets from localStorage. Returns empty array by default (clean state).
 */
export function loadPresets(): Preset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (!raw) return []; // Clean slate: do not hardcode presets
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function savePresets(presets: Preset[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
  } catch (err) {
    console.error('Failed to save presets to localStorage:', err);
  }
}

export function loadActivePresetId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PRESET_ID);
  } catch {
    return null;
  }
}

export function saveActivePresetId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PRESET_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_PRESET_ID);
    }
  } catch (err) {
    console.error('Failed to save active preset id:', err);
  }
}

let themeListeners: Array<() => void> = [];

export function subscribeTheme(callback: () => void) {
  themeListeners.push(callback);
  return () => {
    themeListeners = themeListeners.filter((l) => l !== callback);
  };
}

export function getThemeSnapshot(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode;
    return saved || 'dark';
  } catch {
    return 'dark';
  }
}

export function getThemeServerSnapshot(): ThemeMode {
  return 'dark';
}

export function loadTheme(): ThemeMode {
  return getThemeSnapshot();
}

export function saveTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    themeListeners.forEach((l) => l());
  } catch (err) {
    console.error('Failed to save theme:', err);
  }
}
