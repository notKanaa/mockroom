// Mockroom's colour tokens, copied from the app's design system (src/ui/styles.css).
// The app switches them with `data-theme` on <html>; the video needs light and dark
// shots side by side, so it sets them on a wrapper instead (see UiFrame).
// Keep these in sync with styles.css when the app's palette changes.

export type ThemeName = "light" | "dark";

export const themes: Record<ThemeName, Record<string, string>> = {
  light: {
    "--bg": "#f7f8fa",
    "--surface": "#ffffff",
    "--sidebar": "#f0f2f4",
    "--raised": "#e8ebee",
    "--text": "#15202b",
    "--muted": "#59646f",
    "--line": "#dfe3e8",
    "--accent": "#0b7a66",
    "--accent-hover": "#086352",
    "--accent-soft": "#e2f1ed",
    "--accent-text": "#075a4b",
    "--on-accent": "#ffffff",
    "--warn": "#8f4f06",
    "--warn-soft": "#fcefd9",
    "--error": "#b42a20",
    "--error-soft": "#fce6e3",
    "--shadow-sm": "0 1px 2px rgb(16 24 32 / 0.06)",
    "--shadow-md": "0 1px 2px rgb(16 24 32 / 0.06), 0 8px 24px -8px rgb(16 24 32 / 0.16)",
  },
  dark: {
    "--bg": "#121519",
    "--surface": "#1a1e23",
    "--sidebar": "#0e1114",
    "--raised": "#252a31",
    "--text": "#e8ecef",
    "--muted": "#a1abb5",
    "--line": "#2c323a",
    "--accent": "#35c4a8",
    "--accent-hover": "#5dd4bd",
    "--accent-soft": "#16312c",
    "--accent-text": "#7fe0cc",
    "--on-accent": "#04201a",
    "--warn": "#f0b660",
    "--warn-soft": "#362812",
    "--error": "#f58e83",
    "--error-soft": "#3a1b18",
    "--shadow-sm": "0 1px 2px rgb(0 0 0 / 0.3)",
    "--shadow-md": "0 1px 2px rgb(0 0 0 / 0.3), 0 12px 32px -12px rgb(0 0 0 / 0.6)",
  },
};

/** The film's own stage, around the UI shots: the app's dark tokens, a step deeper. */
export const stage = {
  ink: "#0b0d10",
  night: themes.dark["--sidebar"]!,
  surface: themes.dark["--surface"]!,
  line: themes.dark["--line"]!,
  text: themes.dark["--text"]!,
  muted: themes.dark["--muted"]!,
  accent: themes.dark["--accent"]!,
  accentDeep: themes.light["--accent"]!,
  accentSoft: themes.dark["--accent-soft"]!,
  warn: themes.dark["--warn"]!,
  paper: themes.light["--bg"]!,
  paperText: themes.light["--text"]!,
  paperMuted: themes.light["--muted"]!,
  paperLine: themes.light["--line"]!,
};
