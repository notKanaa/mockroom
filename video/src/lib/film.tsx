// The props every composition takes, and the context that hands them to the scenes.

import { createContext, useContext, type ReactNode } from "react";
import { useVideoConfig } from "remotion";
import { locales, type Locale, type LocaleContent } from "../content/locales";

export type Aspect = "16:9" | "9:16" | "1:1";

export const formats: Record<Aspect, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

export interface FilmProps extends Record<string, unknown> {
  /** The language of everything on screen. */
  locale: Locale;
  /** The frame's shape. 16:9 is the finished cut; 9:16 and 1:1 are laid out for ads. */
  aspect: Aspect;
  /** Leaves the film grain out, so a GIF stays small. */
  lite?: boolean;
}

const FilmContext = createContext<FilmProps>({ locale: "en", aspect: "16:9" });

export function FilmProvider({ value, children }: { value: FilmProps; children: ReactNode }) {
  return <FilmContext.Provider value={value}>{children}</FilmContext.Provider>;
}

export interface Film extends LocaleContent {
  locale: Locale;
  aspect: Aspect;
  width: number;
  height: number;
  /** One "point" of the 1080p design grid, so sizes follow the frame's short side. */
  u: number;
  portrait: boolean;
  square: boolean;
  lite: boolean;
}

/** The film's copy, sample interview and layout for the current composition. */
export function useFilm(): Film {
  const { locale, aspect, lite = false } = useContext(FilmContext);
  const { width, height } = useVideoConfig();
  return {
    ...locales[locale],
    locale,
    aspect,
    width,
    height,
    u: Math.min(width, height) / 1080,
    portrait: aspect === "9:16",
    square: aspect === "1:1",
    lite,
  };
}
