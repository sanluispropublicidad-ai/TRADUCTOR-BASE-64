export interface Preset {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  temperature: number;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  modelsList?: string[];
}

export type ThemeMode = 'dark' | 'light' | 'system';
