// The whole film: the five parts back to back (each ends where the next begins),
// and the sound of all of them on one timeline (see filmCues).

import type { ComponentType } from "react";
import { AbsoluteFill, Audio, getStaticFiles, Sequence, Series, staticFile } from "remotion";
import { FilmProvider, useFilm, type FilmProps } from "../lib/film";
import { stage } from "../theme/tokens";
import { PART1_FRAMES, PART2_FRAMES, PART3_FRAMES, PART4_FRAMES, PART5_FRAMES } from "./beats";
import { filmCues } from "./cues";
import { Part1 } from "./Part1";
import { Part2 } from "./Part2";
import { Part3 } from "./Part3";
import { Part4 } from "./Part4";
import { Part5 } from "./Part5";
import { SoundTrack } from "./sound";

export { FILM_FRAMES } from "./cues";

const parts: { name: string; frames: number; Part: ComponentType }[] = [
  { name: "1 · opening", frames: PART1_FRAMES, Part: Part1 },
  { name: "2 · product", frames: PART2_FRAMES, Part: Part2 },
  { name: "3 · interview", frames: PART3_FRAMES, Part: Part3 },
  { name: "4 · debrief", frames: PART4_FRAMES, Part: Part4 },
  { name: "5 · your AI", frames: PART5_FRAMES, Part: Part5 },
];

export function FilmComposition(props: FilmProps) {
  return (
    <FilmProvider value={props}>
      <AbsoluteFill style={{ background: stage.ink }}>
        <Series>
          {parts.map(({ name, frames, Part }) => (
            <Series.Sequence key={name} durationInFrames={frames} name={name}>
              <Part />
            </Series.Sequence>
          ))}
        </Series>
        <Sequence name="♪ sound" layout="none">
          <FilmSound />
        </Sequence>
      </AbsoluteFill>
    </FilmProvider>
  );
}

/**
 * The film's sound: the mixed soundtrack (scripts/mix.ts, `npm run mix`) when it
 * is there, else the synthesised sketch on its own.
 */
function FilmSound() {
  const film = useFilm();
  const available = new Set(getStaticFiles().map((file) => file.name));
  const mixed = `audio/mix/mix-${film.locale}.wav`;
  if (!available.has(mixed)) return <SoundTrack cues={filmCues(film.sample)} />;
  return <Audio src={staticFile(mixed)} />;
}
