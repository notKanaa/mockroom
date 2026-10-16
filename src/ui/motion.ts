// Mockroom's motion helpers. Most of the motion is plain CSS (see the "Motion"
// tokens in styles.css); these are the few moments that need a script. All of
// them step aside when the candidate's system asks for reduced motion.

import { useEffect, useRef, useState } from "react";

/** True when the operating system asks for as little motion as possible. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Runs a change to the page as a crossfade between its old and new look, where
 * the browser can (the View Transitions API), or at once otherwise. The change
 * must apply synchronously.
 */
export function crossfade(change: () => void) {
  if (typeof document.startViewTransition !== "function" || prefersReducedMotion()) {
    change();
    return;
  }
  document.startViewTransition(change);
}

/**
 * Reveals streamed text a little every frame instead of in the chunks the model
 * sends, like an AI chat app. The reveal speeds up with the backlog, so it never
 * trails the model by more than a few frames, and catches up once streaming stops.
 */
export function useSmoothText(text: string, streaming: boolean): string {
  const [shown, setShown] = useState(streaming ? 0 : text.length);
  const shownRef = useRef(shown);
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    if (prefersReducedMotion()) {
      shownRef.current = textRef.current.length;
      setShown(shownRef.current);
      return;
    }
    let frame = 0;
    const step = () => {
      const target = textRef.current.length;
      // A new message (shorter text) starts over.
      if (shownRef.current > target) shownRef.current = 0;
      const backlog = target - shownRef.current;
      if (backlog > 0) {
        // About six frames to clear any backlog, and never slower than two characters a frame.
        shownRef.current += Math.max(2, Math.ceil(backlog / 6));
        shownRef.current = Math.min(shownRef.current, target);
        setShown(shownRef.current);
      }
      if (streaming || shownRef.current < target) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [streaming, text]);

  return text.slice(0, Math.min(shown, text.length));
}
