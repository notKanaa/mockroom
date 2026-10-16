// The motion kit of the film: springs, impulses, camera shake, grain, chromatic
// split, shockwaves and per-letter animation. Every effect is a pure function of
// the frame, so renders are reproducible.

import { noise2D } from "@remotion/noise";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type SpringConfig = { damping?: number; stiffness?: number; mass?: number; overshootClamping?: boolean };

/** A physical 0 → 1 from a frame on (with overshoot, unless clamped). */
export function useSpring() {
  const { fps } = useVideoConfig();
  return (frame: number, start: number, config: SpringConfig = {}) =>
    spring({ frame: frame - start, fps, config: { damping: 12, stiffness: 140, mass: 0.7, ...config } });
}

/** 1 at a frame, decaying to 0: the kick of an impact. */
export function impulse(frame: number, at: number, decay = 6): number {
  return frame < at ? 0 : Math.exp(-(frame - at) / decay);
}

/** A quick bump 0 → 1 → 0 over a few frames, for heartbeats and presses. */
export function bump(frame: number, at: number, attack = 2, release = 8): number {
  const t = frame - at;
  if (t < 0 || t > attack + release) return 0;
  return t < attack ? t / attack : 1 - (t - attack) / release;
}

/** Organic handheld shake, scaled by an amplitude. */
export function shake(frame: number, amplitude: number, seed = "shake"): { x: number; y: number; r: number } {
  return {
    x: noise2D(`${seed}x`, frame * 0.45, 0) * amplitude,
    y: noise2D(`${seed}y`, 0, frame * 0.45) * amplitude,
    r: noise2D(`${seed}r`, frame * 0.3, 7) * amplitude * 0.04,
  };
}

/** A red/cyan split on text, as a lens would fringe on a hit. */
export function rgbSplit(amount: number): CSSProperties {
  if (amount < 0.05) return {};
  return {
    textShadow: `${amount}px 0 rgb(255 60 110 / 0.75), ${-amount}px 0 rgb(40 220 255 / 0.75)`,
  };
}

/** Film grain over everything: moving noise, very light. */
export function Grain({ opacity = 0.07 }: { opacity?: number }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity }}>
      <svg width="100%" height="100%">
        <filter id={`grain-${frame % 8}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 8} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${frame % 8})`} />
      </svg>
    </AbsoluteFill>
  );
}

export function Vignette({ strength = 0.55 }: { strength?: number }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(120% 100% at 50% 50%, transparent 55%, rgb(0 0 0 / ${strength}) 100%)`,
      }}
    />
  );
}

/** A ring of light expanding from a point and fading. */
export function Shockwave({
  frame,
  at,
  x,
  y,
  from,
  to,
  color,
  width,
  duration = 18,
}: {
  frame: number;
  at: number;
  x: number;
  y: number;
  from: number;
  to: number;
  color: string;
  width: number;
  duration?: number;
}) {
  const t = (frame - at) / duration;
  if (t < 0 || t > 1) return null;
  const eased = 1 - (1 - t) ** 3;
  const size = from + (to - from) * eased;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${width * (1 - t) + 0.5}px solid ${color}`,
        opacity: (1 - t) * 0.9,
      }}
    />
  );
}

/** Text split into letters, each styled by its index. */
export function Letters({
  text,
  style,
  letter,
}: {
  text: string;
  style?: CSSProperties;
  letter: (index: number, count: number) => CSSProperties;
}) {
  const characters = [...text];
  return (
    <span style={{ display: "inline-block", whiteSpace: "pre", ...style }}>
      {characters.map((character, index) => (
        <span key={index} style={{ display: "inline-block", ...letter(index, characters.length) }}>
          {character === " " ? " " : character}
        </span>
      ))}
    </span>
  );
}

/** A stable pseudo-random number in [-1, 1] for an index, to scatter things deterministically. */
export function scatter(index: number, salt = 1): number {
  const value = Math.sin(index * 127.1 * salt + salt * 311.7) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

/** A centred, absolutely positioned box, for laying things out around the frame's centre. */
export function At({ x, y, children, style }: { x: number; y: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", ...style }}>{children}</div>
  );
}
