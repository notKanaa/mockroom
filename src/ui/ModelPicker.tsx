import { useEffect, useState } from "react";
import type { AISettingsView, KeyedProviderName, ProviderName } from "../server/api-types";
import { fetchSettings, listOllamaModels, saveSettings } from "./api";
import { useI18n } from "./i18n";
import { Dropdown, type DropdownOption } from "./kit";
import { ProviderIcon } from "./ProviderIcons";

interface ModelPickerProps {
  /** Opens the settings, where API keys are added. */
  onOpenSettings: () => void;
  placement?: "down" | "up";
}

/** A model, as a drop-down value: "provider:model". */
type ModelValue = `${ProviderName}:${string}`;

/**
 * The AI that runs the interview, picked right from the chat box. Lists the
 * Ollama models installed on this computer and the online providers with an API
 * key; providers without one are shown greyed out as "Not connected", with a
 * way to the settings to connect them. Picking a model saves it as the setting.
 */
export function ModelPicker({ onOpenSettings, placement = "down" }: ModelPickerProps) {
  const { t } = useI18n();
  const [view, setView] = useState<AISettingsView | null>(null);
  // The installed Ollama models, or null when Ollama can't be reached.
  const [ollamaModels, setOllamaModels] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    fetchSettings()
      .then(async (settings) => {
        if (!current) return;
        setView(settings);
        const models = await listOllamaModels(settings.ollamaUrl.url).catch(() => null);
        if (current) setOllamaModels(models);
      })
      .catch((failure: Error) => current && setError(failure.message));
    return () => {
      current = false;
    };
  }, []);

  if (!view)
    return error ? (
      <span className="model-error" role="alert">
        {error}
      </span>
    ) : null;

  const active = view.active;
  const fromEnvironment = active?.source === "environment";
  const options: DropdownOption<ModelValue>[] = [];

  const localModels = [...(ollamaModels ?? [])];
  if (active?.provider === "ollama" && !localModels.includes(active.model)) localModels.unshift(active.model);
  if (localModels.length === 0) {
    options.push({
      value: "ollama:",
      label: "Ollama",
      icon: <ProviderIcon provider="ollama" />,
      description: t.model.ollamaOff,
      disabled: true,
      group: t.model.local,
    });
  }
  for (const model of localModels) {
    options.push({
      value: `ollama:${model}`,
      label: model,
      icon: <ProviderIcon provider="ollama" />,
      group: t.model.local,
    });
  }

  for (const provider of view.providers) {
    if (provider.id === "ollama") continue;
    const connected = view.apiKeys[provider.id as KeyedProviderName] !== null;
    const known = [active, view.saved].find((choice) => choice?.provider === provider.id);
    const model = known?.model ?? provider.defaultModel ?? "";
    const icon = <ProviderIcon provider={provider.id} />;
    options.push(
      connected
        ? { value: `${provider.id}:${model}`, label: `${provider.label} · ${model}`, icon, group: t.model.online }
        : {
            value: `${provider.id}:`,
            label: provider.label,
            icon,
            description: t.model.notConnected,
            disabled: true,
            group: t.model.online,
          },
    );
  }

  async function choose(value: ModelValue) {
    const separator = value.indexOf(":");
    const provider = value.slice(0, separator) as ProviderName;
    const model = value.slice(separator + 1);
    setError(null);
    try {
      setView(await saveSettings({ provider, model }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }

  return (
    <span className="model-picker">
      <Dropdown
        label={t.model.label}
        options={options}
        value={active ? (`${active.provider}:${active.model}` as ModelValue) : null}
        placeholder={t.model.none}
        onChange={(value) => void choose(value)}
        footer={{ label: t.model.connect, onClick: onOpenSettings }}
        placement={placement}
        disabled={fromEnvironment}
        title={fromEnvironment ? t.model.fromEnvironment : undefined}
      />
      {error && (
        <span className="model-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
