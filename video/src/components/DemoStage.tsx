// The set of the demo beats: a light stage, a caption, and the app in a browser
// window. Laid out for each frame shape, so the same scene works as a 16:9 film,
// a 9:16 story or a 1:1 post.

import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import type { Film } from "../lib/film";
import { stage } from "../theme/tokens";
import { AppWindow, WINDOW_BAR } from "./AppWindow";

export interface DemoLayout {
  caption: { left: number; top: number; width: number; size: number; centred: boolean; align: "left" | "center" };
  window: { left: number; top: number; width: number; height: number };
  /** The UI's own size inside the window, and how much it is scaled up. */
  ui: { width: number; height: number; scale: number };
}

export function demoLayout(film: Film): DemoLayout {
  const { u, width, height } = film;
  const frame = (left: number, top: number, w: number, h: number, scale: number, caption: DemoLayout["caption"]) => ({
    caption,
    window: { left: left * u, top: top * u, width: w * u, height: h * u },
    ui: { width: Math.round(w / scale), height: Math.round((h - WINDOW_BAR) / scale), scale: scale * u },
  });
  if (film.portrait) {
    return frame(60, 600, 960, 1180, 1.3, {
      left: 80 * u, top: 200 * u, width: width - 160 * u, size: 92, centred: false, align: "left",
    });
  }
  if (film.square) {
    return frame(80, 280, 920, 740, 1.15, {
      left: 80 * u, top: 72 * u, width: width - 160 * u, size: 66, centred: false, align: "left",
    });
  }
  return frame(740, 120, 1080, 840, 1.25, {
    left: 110 * u, top: height / 2, width: 560 * u, size: 76, centred: true, align: "left",
  });
}

interface DemoStageProps {
  film: Film;
  /** 0 → 1: the window rising onto the stage. */
  windowIn?: number;
  /** 0 → 1: the window leaving. */
  windowOut?: number;
  caption: ReactNode;
  children: ReactNode;
}

export function DemoStage({ film, windowIn = 1, windowOut = 0, caption, children }: DemoStageProps) {
  const layout = demoLayout(film);
  const { u } = film;
  const lift = (1 - windowIn) * 80 * u - windowOut * 40 * u;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 70% 45%, #ffffff 0%, ${stage.paper} 45%, #e6eaee 100%)` }}>
      {/* A soft glow of the accent under the window. */}
      <div
        style={{
          position: "absolute",
          left: layout.window.left + layout.window.width * 0.1,
          top: layout.window.top + layout.window.height * 0.2,
          width: layout.window.width * 0.8,
          height: layout.window.height * 0.7,
          borderRadius: "50%",
          background: stage.accentDeep,
          opacity: 0.16 * windowIn * (1 - windowOut),
          filter: `blur(${120 * u}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: layout.caption.left,
          top: layout.caption.top,
          width: layout.caption.width,
          transform: layout.caption.centred ? "translateY(-50%)" : undefined,
        }}
      >
        {caption}
      </div>
      <div
        style={{
          position: "absolute",
          left: layout.window.left,
          top: layout.window.top,
          width: layout.window.width,
          opacity: windowIn * (1 - windowOut),
          transform: `translateY(${lift}px) scale(${0.96 + 0.04 * windowIn - 0.03 * windowOut})`,
          transformOrigin: "50% 60%",
        }}
      >
        <AppWindow u={u}>{children}</AppWindow>
      </div>
    </AbsoluteFill>
  );
}
