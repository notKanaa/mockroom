// A live piece of Mockroom's interface: real DOM with the app's classes and tokens,
// laid out at the app's size, then scaled up and framed by a camera. Nothing is a
// screenshot, so text stays sharp at any zoom.

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import "../theme/ui.css";
import { themes, type ThemeName } from "../theme/tokens";

export interface Camera {
  /** The point of the UI, in its own pixels, at the centre of the frame. */
  x: number;
  y: number;
  /** Zoom on top of the viewport's scale. 1 shows the whole UI. */
  s: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Anchors = Record<string, Rect>;

interface UiViewportProps {
  /** The UI's own size, in CSS pixels, as in a browser window. */
  width: number;
  height: number;
  /** How much bigger the UI is drawn in the film. */
  scale: number;
  camera?: Camera;
  theme?: ThemeName;
  /** Receives where each `data-anchor` element sits, for the camera and the cursor. */
  onAnchors?: (anchors: Anchors) => void;
  /** Lets what is behind show through, for UI pieces floating on the film's own stage. */
  transparent?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}

export function UiViewport({ width, height, scale, camera, theme = "light", onAnchors, transparent = false, children, style }: UiViewportProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const anchors = useAnchors(rootRef);
  const reported = useRef("");
  useLayoutEffect(() => {
    const key = JSON.stringify(anchors);
    if (onAnchors && key !== reported.current) {
      reported.current = key;
      onAnchors(anchors);
    }
  });

  const view = clampCamera(camera ?? { x: width / 2, y: height / 2, s: 1 }, width, height);
  const zoom = scale * view.s;
  return (
    <div style={{ position: "relative", width: width * scale, height: height * scale, overflow: "hidden", ...style }}>
      <div
        ref={rootRef}
        className="mr-ui"
        style={{
          ...(themes[theme] as CSSProperties),
          ...(transparent && { background: "transparent" }),
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          overflow: "hidden",
          transformOrigin: "0 0",
          transform: `translate(${(width * scale) / 2}px, ${(height * scale) / 2}px) scale(${zoom}) translate(${-view.x}px, ${-view.y}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Keeps the camera inside the UI, so the frame never shows past its edges. */
export function clampCamera(camera: Camera, width: number, height: number): Camera {
  const s = Math.max(1, camera.s);
  const halfW = width / (2 * s);
  const halfH = height / (2 * s);
  return {
    s,
    x: Math.min(Math.max(camera.x, halfW), width - halfW),
    y: Math.min(Math.max(camera.y, halfH), height - halfH),
  };
}

/** Where each `[data-anchor]` element sits inside the root, in the UI's own pixels, ignoring transforms. */
function useAnchors(rootRef: RefObject<HTMLDivElement | null>): Anchors {
  const [anchors, setAnchors] = useState<Anchors>({});
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const next: Anchors = {};
    root.querySelectorAll<HTMLElement>("[data-anchor]").forEach((element) => {
      next[element.dataset.anchor!] = offsetWithin(element, root);
    });
    if (JSON.stringify(next) !== JSON.stringify(anchors)) setAnchors(next);
  });
  return anchors;
}

function offsetWithin(element: HTMLElement, root: HTMLElement): Rect {
  let x = 0;
  let y = 0;
  let current: HTMLElement | null = element;
  while (current && current !== root) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return { x, y, w: element.offsetWidth, h: element.offsetHeight };
}

/** The centre of an anchor, or a fallback while it hasn't been measured yet. */
export function centre(anchors: Anchors, name: string, fallback: { x: number; y: number }): { x: number; y: number } {
  const rect = anchors[name];
  return rect ? { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 } : fallback;
}

/**
 * A camera framing an anchor whole, with a margin: as close as it fits, up to `max`.
 * Falls back to the whole UI while the anchor hasn't been measured yet.
 */
export function frameOn(
  anchors: Anchors,
  name: string,
  view: { width: number; height: number },
  { max = 1.6, margin = 24, dy = 0 }: { max?: number; margin?: number; dy?: number } = {},
): Camera {
  const rect = anchors[name];
  if (!rect) return { x: view.width / 2, y: view.height / 2, s: 1 };
  const s = Math.max(1, Math.min(max, view.width / (rect.w + margin * 2), view.height / (rect.h + margin * 2)));
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 - dy, s };
}
