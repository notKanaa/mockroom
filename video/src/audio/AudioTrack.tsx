// The film's sound: one <Audio> slot per cue, on its frame. A cue plays only once
// its file is in public/ (the film renders silent until then).

import { Audio, getStaticFiles, Sequence, staticFile } from "remotion";
import type { ResolvedCue } from "./cues";

interface AudioTrackProps {
  cues: ResolvedCue[];
  /** Turns the voice-over off, for a music-and-effects cut. */
  voiceOver?: boolean;
}

export function AudioTrack({ cues, voiceOver = true }: AudioTrackProps) {
  const available = new Set(getStaticFiles().map((file) => file.name));
  return (
    <>
      {cues
        .filter((cue) => available.has(cue.file) && (voiceOver || cue.kind !== "voiceover"))
        .map((cue) => (
          <Sequence key={cue.id} from={cue.frame} durationInFrames={cue.length} name={`♪ ${cue.id}`} layout="none">
            <Audio src={staticFile(cue.file)} volume={cue.volume} />
          </Sequence>
        ))}
    </>
  );
}
