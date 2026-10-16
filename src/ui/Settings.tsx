import { useEffect, useState, type FormEvent } from "react";
import type { AISettingsInput, AISettingsView, ConnectionTest, ProviderName } from "../server/api-types";
import { fetchSettings, listOllamaModels, saveSettings, testConnection } from "./api";

interface SettingsProps {
  /** True when no AI provider is set up yet: the candidate is welcomed here before anything else. */
  firstLaunch: boolean;
  onBack: () => void;
}

interface Form {
  provider: ProviderName | null;
  model: string;
  apiKey: string;
  ollamaUrl: string;
}

/** The installed Ollama models, once asked for. The last list stays while a new one loads. */
interface OllamaState {
  loading: boolean;
  models: string[] | null;
  error: string | null;
}

/** Where the candidate picks an AI provider, a model and an API key (or the Ollama address), and tests them. */
export function Settings({ firstLaunch, onBack }: SettingsProps) {
  const [view, setView] = useState<AISettingsView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({ provider: null, model: "", apiKey: "", ollamaUrl: "" });
  const [ollama, setOllama] = useState<OllamaState>({ loading: false, models: null, error: null });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTest | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings()
      .then((settings) => {
        setView(settings);
        const choice = settings.saved ?? settings.active;
        setForm({
          provider: choice?.provider ?? null,
          model: choice?.model ?? "",
          apiKey: "",
          ollamaUrl: settings.ollamaUrl.url,
        });
      })
      .catch((failure: Error) => setLoadError(failure.message));
  }, []);

  const isOllama = form.provider === "ollama";
  const loaded = view !== null;
  useEffect(() => {
    if (isOllama && loaded) void refreshOllamaModels(form.ollamaUrl);
    // Only when Ollama gets picked; the candidate refreshes the list after changing the address.
  }, [isOllama, loaded]);

  async function refreshOllamaModels(url: string) {
    setOllama((current) => ({ ...current, loading: true }));
    try {
      const models = await listOllamaModels(url);
      setOllama({ loading: false, models, error: null });
      // Pick an installed model when none is chosen yet.
      setForm((current) =>
        current.provider === "ollama" && !current.model && models[0] ? { ...current, model: models[0] } : current,
      );
    } catch (failure) {
      setOllama({ loading: false, models: null, error: messageOf(failure) });
    }
  }

  if (loadError) {
    return (
      <main className="settings">
        <p className="status status-unreachable" role="alert">
          {loadError}
        </p>
      </main>
    );
  }
  if (!view) {
    return (
      <main className="settings">
        <p className="status">Loading your settings…</p>
      </main>
    );
  }

  const info = view.providers.find((provider) => provider.id === form.provider);
  const savedKey = form.provider && form.provider !== "ollama" ? view.apiKeys[form.provider] : null;
  const fromEnvironment = view.active?.source === "environment";

  function update(changes: Partial<Form>) {
    setForm((current) => ({ ...current, ...changes }));
    // What Ollama said no longer applies to a new address.
    if (changes.ollamaUrl !== undefined) setOllama((current) => ({ ...current, error: null }));
    setTestResult(null);
    setSaveError(null);
    setSavedMessage(null);
  }

  function pickProvider(provider: ProviderName) {
    if (provider === form.provider) return;
    const known = [view!.saved, view!.active].find((choice) => choice?.provider === provider);
    const defaultModel = view!.providers.find((candidate) => candidate.id === provider)?.defaultModel;
    update({ provider, model: known?.model ?? defaultModel ?? "", apiKey: "" });
  }

  function input(): AISettingsInput | null {
    if (!form.provider) return null;
    return {
      provider: form.provider,
      model: form.model,
      ...(form.apiKey.trim() && { apiKey: form.apiKey }),
      ...(form.provider === "ollama" && { ollamaUrl: form.ollamaUrl }),
    };
  }

  async function test() {
    const settings = input();
    if (!settings) return;
    setTesting(true);
    setTestResult(null);
    try {
      setTestResult(await testConnection(settings));
    } catch (failure) {
      setTestResult({ ok: false, error: messageOf(failure) });
    } finally {
      setTesting(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const settings = input();
    if (!settings) return;
    setSaving(true);
    setSaveError(null);
    setSavedMessage(null);
    try {
      const saved = await saveSettings(settings);
      setView(saved);
      setForm((current) => ({ ...current, apiKey: "" }));
      if (settings.provider === "ollama") void refreshOllamaModels(form.ollamaUrl);
      setSavedMessage(
        saved.active?.source === "environment"
          ? "Saved. Environment variables still override these settings, though."
          : `Saved. Interviews now use ${info?.label} (${settings.model}).`,
      );
    } catch (failure) {
      setSaveError(messageOf(failure));
    } finally {
      setSaving(false);
    }
  }

  const ollamaModels = ollama.models ?? [];
  // A list to pick from once Ollama has said what is installed; otherwise the name is typed in.
  const modelChoices = isOllama && ollamaModels.length > 0
    ? ollamaModels.includes(form.model) || !form.model
      ? ollamaModels
      : [form.model, ...ollamaModels]
    : [];

  return (
    <main className="settings">
      <header className="history-header">
        <button type="button" className="link-button" onClick={onBack}>
          {firstLaunch && !view.configured ? "Skip for now" : "← Back"}
        </button>
        <h1>{firstLaunch ? "Welcome to Mockroom" : "Settings"}</h1>
        <p className="history-note">
          {firstLaunch
            ? "First, choose the AI that will interview you. Use your own API key, or Ollama to run a free model on your computer."
            : "The AI that interviews you."}
        </p>
      </header>

      {fromEnvironment && (
        <p className="notice" role="note">
          Mockroom is using {view.providers.find((provider) => provider.id === view.active?.provider)?.label} (
          {view.active?.model}) from the <code>MOCKROOM_PROVIDER</code> environment variable, which overrides these
          settings. What you save here applies once you remove it.
        </p>
      )}

      <form className="settings-form" onSubmit={save}>
        <fieldset className="providers">
          <legend>AI provider</legend>
          {view.providers.map((provider) => (
            <label key={provider.id} className={`provider${form.provider === provider.id ? " provider-chosen" : ""}`}>
              <input
                type="radio"
                name="provider"
                value={provider.id}
                checked={form.provider === provider.id}
                onChange={() => pickProvider(provider.id)}
              />
              <span className="provider-name">{provider.label}</span>
              <span className="provider-note">{provider.needsKey ? "Your API key" : "Free, runs locally"}</span>
            </label>
          ))}
        </fieldset>

        {info && (
          <>
            {isOllama && (
              <div className="field">
                <label htmlFor="ollama-url">Ollama address</label>
                <div className="field-row">
                  <input
                    id="ollama-url"
                    type="url"
                    value={form.ollamaUrl}
                    onChange={(event) => update({ ollamaUrl: event.target.value })}
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void refreshOllamaModels(form.ollamaUrl)}
                    disabled={ollama.loading}
                  >
                    {ollama.loading ? "Looking…" : "Refresh models"}
                  </button>
                </div>
                {view.ollamaUrl.source === "environment" && (
                  <p className="field-hint">
                    <code>MOCKROOM_OLLAMA_URL</code> is set, so Mockroom uses {view.ollamaUrl.url} for interviews.
                  </p>
                )}
                {ollama.error && !ollama.loading && (
                  <p className="field-error" role="alert">
                    {ollama.error} Don't have it yet? Get it from{" "}
                    <a href="https://ollama.com/download" target="_blank" rel="noreferrer">
                      ollama.com
                    </a>
                    .
                  </p>
                )}
                {ollama.models?.length === 0 && !ollama.loading && (
                  <p className="field-error" role="alert">
                    Ollama has no model yet. Download one by running <code>ollama pull llama3.2</code> in a terminal,
                    then refresh.
                  </p>
                )}
              </div>
            )}

            <div className="field">
              <label htmlFor="model">Model</label>
              {isOllama && modelChoices.length > 0 ? (
                <select id="model" value={form.model} onChange={(event) => update({ model: event.target.value })}>
                  {modelChoices.map((model) => (
                    <option key={model} value={model}>
                      {ollamaModels.includes(model) ? model : `${model} (not installed)`}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    id="model"
                    list="model-suggestions"
                    value={form.model}
                    onChange={(event) => update({ model: event.target.value })}
                    placeholder={info.defaultModel ?? "llama3.2"}
                    spellCheck={false}
                  />
                  <datalist id="model-suggestions">
                    {info.suggestedModels.map((model) => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>
                </>
              )}
              <p className="field-hint">
                {isOllama
                  ? "Small models are free but less sharp interviewers. Bigger ones need a stronger computer."
                  : `Any ${info.label} model works. ${info.defaultModel ? `${info.defaultModel} is fast and cheap.` : ""}`}
              </p>
            </div>

            {info.needsKey && (
              <div className="field">
                <label htmlFor="api-key">{info.label} API key</label>
                <input
                  id="api-key"
                  type="password"
                  value={form.apiKey}
                  onChange={(event) => update({ apiKey: event.target.value })}
                  placeholder={savedKey ? `${savedKey.masked} (leave empty to keep it)` : "Paste your key"}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="field-hint">
                  {savedKey?.source === "environment" ? (
                    <>
                      <code>{info.keyEnvVar}</code> is set, so Mockroom uses that key, which overrides any key saved
                      here.{" "}
                    </>
                  ) : (
                    <>
                      Saved in a file on this computer only (<code>{view.settingsFile}</code>), and only ever sent to{" "}
                      {info.label}.{" "}
                    </>
                  )}
                  <a href={info.keyPage} target="_blank" rel="noreferrer">
                    Create a key
                  </a>
                </p>
              </div>
            )}

            {testResult && (
              <p className={`test-result ${testResult.ok ? "status-ok" : "status-unreachable"}`} role="status">
                {testResult.ok ? `✓ ${testResult.message}` : testResult.error}
              </p>
            )}
            {saveError && (
              <p className="test-result status-unreachable" role="alert">
                {saveError}
              </p>
            )}
            {savedMessage && (
              <p className="test-result status-ok" role="status">
                {savedMessage}
              </p>
            )}

            <div className="settings-actions">
              <button type="button" className="secondary-button" onClick={() => void test()} disabled={testing || !form.model.trim()}>
                {testing ? "Testing…" : "Test connection"}
              </button>
              <button type="submit" disabled={saving || !form.model.trim()}>
                {saving ? "Saving…" : "Save"}
              </button>
              {savedMessage && firstLaunch && (
                <button type="button" onClick={onBack}>
                  Choose an interview →
                </button>
              )}
            </div>
          </>
        )}
      </form>
    </main>
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
