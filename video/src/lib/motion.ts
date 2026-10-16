// The film's motion vocabulary. Every move goes through these helpers, so the
// whole edit shares the same few curves.

import type { CSSProperties } from "react";
import { Easing, interpolate } from "remotion";

/** The app's own curve (--ease-out in styles.css): things arrive with a gentle deceleration. */
export const easeOut = Easing.bezier(0.2, 0, 0, 1);
/** For camera moves and things that travel: a crisp start and a soft landing. */
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
/** For things leaving. */
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);
/** A short overshoot, for things that snap into place. */
export const easeBack = Easing.bezier(0.34, 1.45, 0.64, 1);

/** 0 → 1 between two frames, eased and clamped. */
export function progress(frame: number, start: number, duration: number, easing = easeOut): number {
  if (duration <= 0) return frame >= start ? 1 : 0;
  return interpolate(frame, [start, start + duration], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Linear mix of two numbers. */
export function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

/** An element rising into place, as the app's `rise` keyframes, driven by a 0 → 1 progress. */
export function rise(amount: number, distance = 8, scaleFrom = 1): CSSProperties {
  return {
    opacity: amount,
    transform: `translateY(${(1 - amount) * distance}px) scale(${mix(scaleFrom, 1, amount)})`,
  };
}

/** The first characters of a text, typed at a steady pace from a frame on. */
export function typed(text: string, frame: number, start: number, charsPerFrame: number): string {
  const count = Math.max(0, Math.floor((frame - start) * charsPerFrame));
  return text.slice(0, count);
}

/**
 * Streams a text like the app's useSmoothText: words come out in small bursts,
 * not one letter at a time, ending on a whole word.
 */
export function streamed(text: string, frame: number, start: number, charsPerFrame: number): string {
  const target = Math.max(0, Math.floor((frame - start) * charsPerFrame));
  if (target >= text.length) return text;
  const nextSpace = text.indexOf(" ", target);
  return text.slice(0, nextSpace === -1 ? text.length : nextSpace);
}

/** How long a text takes to stream or type, in frames. */
export function framesFor(text: string, charsPerFrame: number): number {
  return Math.ceil(text.length / charsPerFrame);
}

/** A slow sine between 0 and 1, for things that breathe (carets, the thinking ring). */
export function breathe(frame: number, periodFrames: number, phase = 0): number {
  return 0.5 - 0.5 * Math.cos(((frame + phase) / periodFrames) * Math.PI * 2);
}

export interface Key<T extends Record<string, number>> {
  /** The frame where the values are reached. */
  f: number;
  v: T;
}

/** Interpolates several values through keyframes, easing each leg. Holds before the first and after the last. */
export function keyframes<T extends Record<string, number>>(frame: number, keys: Key<T>[], easing = easeInOut): T {
  const first = keys[0];
  if (!first) throw new Error("keyframes needs at least one key");
  if (frame <= first.f) return first.v;
  for (let index = 1; index < keys.length; index++) {
    const from = keys[index - 1]!;
    const to = keys[index]!;
    if (frame <= to.f) {
      const amount = progress(frame, from.f, to.f - from.f, easing);
      const values = {} as Record<string, number>;
      for (const name of Object.keys(to.v)) values[name] = mix(from.v[name]!, to.v[name]!, amount);
      return values as T;
    }
  }
  return keys[keys.length - 1]!.v;
}
