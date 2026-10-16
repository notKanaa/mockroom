// The README loop: three moments of the film, cut together with soft blurred
// crossfades, ending where it starts so a GIF or a looping video never jumps.
//   the job offer read by the AI (part 2) → the follow-up (part 3) → the debrief (part 4)
// Silent, and without grain (the `lite` prop) so the GIF stays small.

import type { ComponentType, ReactNode } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { FilmProvider, type FilmProps } from "../lib/film";
import { progress } from "../lib/motion";
import { Part2 } from "./Part2";
import { Part3 } from "./Part3";
import { Part4 } from "./Part4";

/** The clips: which part, from which of its frames, for how long. */
const clips: { Part: ComponentType; from: number; length: number }[] = [
  { Part: Part2, from: 124, length: 172 },
  { Part: Part3, from: 150, length: 104 },
  { Part: Part4, from: 6, length: 86 },
];

/** Frames each clip overlaps the next, crossfading. */
const FADE = 10;

export const LOOP_FRAMES = clips.reduce((total, clip) => total + clip.length, 0) - FADE * (clips.length - 1);
export const LOOP_SIZE = { width: 1280, height: 720 };

export function LoopComposition(props: FilmProps) {
  return (
    <FilmProvider value={{ ...props, lite: props.lite ?? true }}>
      <AbsoluteFill>
        <Clips />
      </AbsoluteFill>
    </FilmProvider>
  );
}

function Clips() {
  const frame = useCurrentFrame();
  let start = 0;
  const placed = clips.map((clip) => {
    const at = start;
    start += clip.length - FADE;
    return { ...clip, at };
  });
  // The loop's last frames fade back into its first, so it repeats seamlessly.
  const wrap = progress(frame, LOOP_FRAMES - FADE, FADE);
  const First = clips[0]!.Part;
  return (
    <>
      {placed.map(({ Part, from, length, at }, index) => (
        <Sequence key={index} from={at} durationInFrames={length}>
          <Fade enter={index === 0 ? 0 : FADE}>
            <Sequence from={-from}>
              <Part />
            </Sequence>
          </Fade>
        </Sequence>
      ))}
      {wrap > 0 && (
        <AbsoluteFill style={{ opacity: wrap, filter: `blur(${(1 - wrap) * 8}px)` }}>
          <Sequence from={LOOP_FRAMES - clips[0]!.from}>
            <First />
          </Sequence>
        </AbsoluteFill>
      )}
    </>
  );
}

/** A clip coming in over the previous one: from transparent and blurred to sharp. */
function Fade({ enter, children }: { enter: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const t = enter === 0 ? 1 : progress(frame, 0, enter);
  return <AbsoluteFill style={{ opacity: t, filter: t < 1 ? `blur(${(1 - t) * 8}px)` : undefined }}>{children}</AbsoluteFill>;
}
