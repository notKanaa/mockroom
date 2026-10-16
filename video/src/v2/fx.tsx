// The motion kit of the film: springs, impulses, camera shake, grain, chromatic
// split, shockwaves and per-letter animation. Every effect is a pure function of
// the frame, so renders are reproducible.

import { noise2D } from "@remotion/noise";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useFilm } from "../lib/film";

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
  const film = useFilm();
  if (film.lite) return null;
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

/** A soft burst of light: a blurred glow that swells from a point and fades. */
export function Bloom({
  frame,
  at,
  x,
  y,
  size,
  color,
  duration = 20,
  intensity = 1,
}: {
  frame: number;
  at: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration?: number;
  intensity?: number;
}) {
  const t = (frame - at) / duration;
  if (t < 0 || t > 1) return null;
  const grow = 1 - (1 - t) ** 3;
  const scale = 0.35 + 0.85 * grow;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 62%)`,
        filter: `blur(${size * 0.05}px)`,
        transform: `scale(${scale})`,
        opacity: Math.min(1, t * 8) * (1 - t) ** 1.6 * intensity,
        pointerEvents: "none",
      }}
    />
  );
}

/** An anamorphic light streak: a thin horizontal flare that stretches out and fades, like a lens catching a flash. */
export function Streak({
  frame,
  at,
  x,
  y,
  length,
  thickness,
  color,
  duration = 16,
}: {
  frame: number;
  at: number;
  x: number;
  y: number;
  length: number;
  thickness: number;
  color: string;
  duration?: number;
}) {
  const t = (frame - at) / duration;
  if (t < 0 || t > 1) return null;
  const grow = 1 - (1 - t) ** 4;
  // Kept subtle: a hint of a lens flare, not a line across the frame.
  const width = length * 0.6 * (0.25 + 0.75 * grow);
  return (
    <div
      style={{
        position: "absolute",
        left: x - width / 2,
        top: y - thickness / 2,
        width,
        height: thickness,
        borderRadius: thickness,
        background: `linear-gradient(90deg, transparent, ${color} 35%, #ffffff 50%, ${color} 65%, transparent)`,
        filter: `blur(${thickness * 1.2}px)`,
        boxShadow: `0 0 ${thickness * 4}px ${color}`,
        opacity: 0.35 * (1 - t) ** 2,
        pointerEvents: "none",
      }}
    />
  );
}

/** Words fading in from a blur, one after the other, as modern titles do. */
export function BlurWords({
  text,
  frame,
  start,
  stagger = 2.5,
  duration = 14,
  exit,
  style,
}: {
  text: string;
  frame: number;
  start: number;
  stagger?: number;
  duration?: number;
  exit?: number;
  style?: CSSProperties;
}) {
  const words = text.split(" ");
  return (
    <span style={{ display: "inline", ...style }}>
      {words.map((word, index) => {
        const t = Math.min(1, Math.max(0, (frame - start - index * stagger) / duration));
        const eased = 1 - (1 - t) ** 3;
        const leave = exit === undefined ? 0 : Math.min(1, Math.max(0, (frame - exit - index * 1.2) / 10));
        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: eased * (1 - leave),
              filter: `blur(${(1 - eased) * 14 + leave * 10}px)`,
              transform: `translateY(${(1 - eased) * 0.25 - leave * 0.2}em) scale(${1 + (1 - eased) * 0.08})`,
            }}
          >
            {word}
            {index < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </span>
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
