import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useI18n } from "./i18n";
import { MonitorIcon, MoonIcon, SunIcon } from "./Icons";
import { Segmented } from "./kit";

/** The theme the candidate picked: the operating system's, or always light or dark. */
export type ThemeChoice = "system" | "light" | "dark";

// Also read by the inline script in index.html, so the page doesn't flash the wrong theme.
const storageKey = "mockroom.theme";

interface Theme {
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<Theme | null>(null);

/** Holds the theme choice, remembered on this computer, and applies it to the page. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(initialChoice);

  useEffect(() => {
    // Without the attribute, the CSS follows the operating system.
    if (choice === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = choice;
    try {
      if (choice === "system") localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, choice);
    } catch {
      // Storage can be off (private window): the choice then lasts until the page closes.
    }
  }, [choice]);

  return <ThemeContext.Provider value={{ choice, setChoice }}>{children}</ThemeContext.Provider>;
}

/** The switch between the system, light and dark themes. */
export function ThemeSwitch() {
  const theme = useContext(ThemeContext);
  const { t } = useI18n();
  if (!theme) throw new Error("ThemeSwitch needs a ThemeProvider.");
  return (
    <Segmented
      label={t.theme.label}
      value={theme.choice}
      onChange={theme.setChoice}
      options={[
        { value: "system", label: t.theme.system, icon: <MonitorIcon /> },
        { value: "light", label: t.theme.light, icon: <SunIcon /> },
        { value: "dark", label: t.theme.dark, icon: <MoonIcon /> },
      ]}
    />
  );
}

function initialChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // No storage: follow the operating system.
  }
  return "system";
}
