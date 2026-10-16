import { useEffect, useState, type FormEvent } from "react";
import type { AISettingsInput, AISettingsView, ConnectionTest, ProviderName } from "../server/api-types";
import { fetchSettings, listOllamaModels, saveSettings, testConnection } from "./api";
import { RichText, useI18n } from "./i18n";

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
  const { t } = useI18n();

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
      <main className="page settings">
        <p className="banner banner-error" role="alert">
          {loadError}
        </p>
      </main>
    );
  }
  if (!view) {
    return (
      <main className="page settings">
        <p className="page-status">{t.settings.loading}</p>
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
          ? t.settings.savedWithEnv
          : t.settings.saved(info?.label ?? settings.provider, settings.model),
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
    <main className="page settings">
      <header className="page-header">
        <button type="button" className="link-button back-link" onClick={onBack}>
          {firstLaunch && !view.configured ? t.settings.skip : t.settings.back}
        </button>
        <h1>{firstLaunch ? t.settings.welcome : t.settings.title}</h1>
        <p className="page-intro">{firstLaunch ? t.settings.welcomeIntro : t.settings.intro}</p>
      </header>

      {fromEnvironment && (
        <p className="banner" role="note">
          <RichText
            text={t.settings.envProvider(
              view.providers.find((provider) => provider.id === view.active?.provider)?.label ?? "",
              view.active?.model ?? "",
            )}
          />
        </p>
      )}

      <form className="settings-form" onSubmit={save}>
        <fieldset className="providers">
          <legend>{t.settings.provider}</legend>
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
              <span className="provider-note">{provider.needsKey ? t.settings.yourKey : t.settings.freeLocal}</span>
            </label>
          ))}
        </fieldset>

        {info && (
          <>
            {isOllama && (
              <div className="field">
                <label htmlFor="ollama-url">{t.settings.ollamaAddress}</label>
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
                    {ollama.loading ? t.settings.looking : t.settings.refreshModels}
                  </button>
                </div>
                {view.ollamaUrl.source === "environment" && (
                  <p className="field-hint">
                    <RichText text={t.settings.envOllamaUrl(view.ollamaUrl.url)} />
                  </p>
                )}
                {ollama.error && !ollama.loading && (
                  <p className="field-error" role="alert">
                    {ollama.error} {t.settings.getOllama}{" "}
                    <a href="https://ollama.com/download" target="_blank" rel="noreferrer">
                      ollama.com
                    </a>
                    .
                  </p>
                )}
                {ollama.models?.length === 0 && !ollama.loading && (
                  <p className="field-error" role="alert">
                    <RichText text={t.settings.noOllamaModel} />
                  </p>
                )}
              </div>
            )}

            <div className="field">
              <label htmlFor="model">{t.settings.model}</label>
              {isOllama && modelChoices.length > 0 ? (
                <select id="model" value={form.model} onChange={(event) => update({ model: event.target.value })}>
                  {modelChoices.map((model) => (
                    <option key={model} value={model}>
                      {ollamaModels.includes(model) ? model : t.settings.notInstalled(model)}
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
                  ? t.settings.ollamaHint
                  : `${t.settings.modelHint(info.label)}${info.defaultModel ? ` ${t.settings.defaultModelHint(info.defaultModel)}` : ""}`}
              </p>
            </div>

            {info.needsKey && (
              <div className="field">
                <label htmlFor="api-key">{t.settings.apiKey(info.label)}</label>
                <input
                  id="api-key"
                  type="password"
                  value={form.apiKey}
                  onChange={(event) => update({ apiKey: event.target.value })}
                  placeholder={savedKey ? t.settings.keepKey(savedKey.masked) : t.settings.pasteKey}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="field-hint">
                  <RichText
                    text={
                      savedKey?.source === "environment"
                        ? t.settings.envKey(info.keyEnvVar ?? "")
                        : t.settings.keyStorage(view.settingsFile, info.label)
                    }
                  />{" "}
                  <a href={info.keyPage} target="_blank" rel="noreferrer">
                    {t.settings.createKey}
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
                {testing ? t.settings.testing : t.settings.test}
              </button>
              <button type="submit" className="primary-button" disabled={saving || !form.model.trim()}>
                {saving ? t.settings.saving : t.settings.save}
              </button>
              {savedMessage && firstLaunch && (
                <button type="button" className="primary-button" onClick={onBack}>
                  {t.settings.chooseInterview}
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
