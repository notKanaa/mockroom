// Shapes of the AI provider settings, as sent over the HTTP API. Pure types: the UI imports them too.
import type { KeyedProviderName, ProviderName } from "../ai/provider.js";

export type { KeyedProviderName, ProviderName } from "../ai/provider.js";

/** Where a setting comes from. Environment variables override the settings file. */
export type SettingSource = "settings" | "environment";

export interface ProviderChoice {
  provider: ProviderName;
  model: string;
}

/** An API key, masked: only its last characters are ever sent to the UI. */
export interface MaskedKey {
  /** For example "••••••••3xQa". */
  masked: string;
  source: SettingSource;
}

/** What the settings screen needs to know about a provider. */
export interface ProviderInfo {
  id: ProviderName;
  label: string;
  /** False for Ollama, which runs on this machine. */
  needsKey: boolean;
  /** The model used when none is picked. Ollama has none: it depends on what is installed. */
  defaultModel?: string;
  /** Models to offer in the picker. Any other model name works too. */
  suggestedModels: string[];
  /** Where to create an API key. */
  keyPage?: string;
  /** The environment variable that overrides the key. */
  keyEnvVar?: string;
}

/** `GET /api/settings` (and the reply to `PUT /api/settings`). API keys are never sent in full. */
export interface AISettingsView {
  /** True once interviews can use an AI provider, from the settings file or environment variables. */
  configured: boolean;
  /** The provider interviews use right now, and where that choice comes from. Null when none is chosen. */
  active: (ProviderChoice & { source: SettingSource }) | null;
  /** What the settings file holds. Null until the candidate saves settings. */
  saved: ProviderChoice | null;
  /** The Ollama address in use. */
  ollamaUrl: { url: string; source: SettingSource | "default" };
  /** The API key in use for each provider, masked. Null when there is none. */
  apiKeys: Record<KeyedProviderName, MaskedKey | null>;
  providers: ProviderInfo[];
  /** Where the settings file is. */
  settingsFile: string;
}

/**
 * `PUT /api/settings` saves this, and `POST /api/settings/test` tries it out
 * (without a body, the test uses the provider in use).
 */
export interface AISettingsInput {
  provider: ProviderName;
  model: string;
  /** A new API key for the provider. Omitted or empty keeps the saved one. */
  apiKey?: string;
  /** Where Ollama runs. Omitted or empty keeps the saved one. */
  ollamaUrl?: string;
}

/** `POST /api/settings/test`: did the provider answer? */
export type ConnectionTest = { ok: true; message: string } | { ok: false; error: string };

/** `GET /api/settings/ollama-models?url=…`: the models installed in Ollama. */
export interface OllamaModels {
  models: string[];
}
