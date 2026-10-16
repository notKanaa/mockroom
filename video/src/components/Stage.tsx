// The dark stage of the film's type-only beats, and the candidate's ring.

import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { stage } from "../theme/tokens";

export function DarkStage({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(110% 85% at 50% 38%, #151a1f 0%, ${stage.ink} 70%)`,
        color: stage.text,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/** A disc centred on a point: the recruiter (filled) or the candidate (a ring). */
export function Disc({
  x,
  y,
  size,
  ring = false,
  color,
  style,
}: {
  x: number;
  y: number;
  size: number;
  ring?: boolean;
  color: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        ...(ring ? { border: `${(size * 2) / 16}px solid ${color}` } : { background: color }),
        ...style,
      }}
    />
  );
}
