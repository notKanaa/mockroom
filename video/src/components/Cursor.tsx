// A mouse pointer gliding between points of the UI, with a press and a soft ripple on each click.
// It lives inside the UI viewport, so the camera carries it along.

import { easeInOut, easeOut, keyframes, progress } from "../lib/motion";

export interface CursorStop {
  /** The frame where the pointer arrives. */
  f: number;
  x: number;
  y: number;
  /** Clicks on arrival. */
  click?: boolean;
}

interface CursorProps {
  frame: number;
  stops: CursorStop[];
  /** Frames where the pointer fades in and out. */
  show: [number, number];
  /** The camera's zoom, so the pointer keeps a steady size on screen. */
  zoom?: number;
}

export function Cursor({ frame, stops, show, zoom = 1 }: CursorProps) {
  if (stops.length === 0) return null;
  const at = keyframes(
    frame,
    stops.map((stop) => ({ f: stop.f, v: { x: stop.x, y: stop.y } })),
    easeInOut,
  );
  const opacity = Math.min(progress(frame, show[0], 8), 1 - progress(frame, show[1] - 8, 8));
  const clicks = stops.filter((stop) => stop.click);
  let press = 0;
  for (const stop of clicks) {
    const into = frame - stop.f;
    if (into >= 0 && into < 8) press = Math.max(press, into < 3 ? into / 3 : 1 - (into - 3) / 5);
  }
  const size = 1 / Math.sqrt(zoom);

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", opacity }}>
      {clicks.map((stop) => {
        const ripple = progress(frame, stop.f, 18, easeOut);
        if (frame < stop.f || ripple >= 1) return null;
        return (
          <span
            key={stop.f}
            style={{
              position: "absolute",
              left: stop.x,
              top: stop.y,
              width: 44 * size,
              height: 44 * size,
              marginLeft: -22 * size,
              marginTop: -22 * size,
              borderRadius: 999,
              border: `${2 * size}px solid var(--accent)`,
              opacity: 1 - ripple,
              transform: `scale(${0.3 + ripple})`,
            }}
          />
        );
      })}
      <svg
        width={22 * size}
        height={22 * size}
        viewBox="0 0 22 22"
        style={{
          position: "absolute",
          left: at.x,
          top: at.y,
          marginLeft: -3 * size,
          marginTop: -2 * size,
          transformOrigin: "3px 2px",
          transform: `scale(${1 - press * 0.16})`,
          filter: "drop-shadow(0 2px 3px rgb(0 0 0 / 0.25))",
        }}
      >
        <path
          d="M3 2 L3 17.5 L7.2 13.6 L10 20 L12.8 18.8 L10.1 12.6 L15.8 12.4 Z"
          fill="#15202b"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
