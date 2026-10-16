// Mockroom's mark, as in the app (.brand-mark): two discs face to face, the recruiter
// (filled, accent) and the candidate (a ring). The film is built around it: the ring
// alone is the candidate, the disc arriving is Mockroom, the ring grown big is your machine.

import { stage } from "../theme/tokens";

interface BrandMarkProps {
  /** Diameter of one disc. */
  size: number;
  dark?: boolean;
  /** 0 = docked as in the app; 1 = the discs a full diameter apart. */
  spread?: number;
  accent?: string;
}

export function BrandMark({ size, dark = false, spread = 0, accent }: BrandMarkProps) {
  // In the app the mark is 22×16 for 16px discs: they overlap by 10/16 of a disc.
  const offset = size * (6 / 16 + spread);
  return (
    <span style={{ position: "relative", display: "inline-block", width: size + offset, height: size, flex: "none" }}>
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: size,
          height: size,
          borderRadius: 999,
          background: accent ?? (dark ? stage.accent : stage.accentDeep),
        }}
      />
      <span
        style={{
          position: "absolute",
          left: offset,
          top: 0,
          width: size,
          height: size,
          borderRadius: 999,
          border: `${(size * 2) / 16}px solid ${dark ? stage.text : stage.paperText}`,
        }}
      />
    </span>
  );
}
