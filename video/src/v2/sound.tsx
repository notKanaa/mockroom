// Plays the sound cues (cues.ts). Each sound is a sketch made in code
// (public/audio/synth/, `npm run sfx`), unless a final version with the same name
// is in public/audio/final/ (for instance, from ElevenLabs): then that one plays.

import { Audio, getStaticFiles, Sequence, staticFile } from "remotion";
import type { SoundCue } from "./cues";

/** Headroom for the whole mix, so stacked hits never clip. */
const MASTER = 0.72;

/** The file a cue plays: its final version if there is one, else its sketch, else none. */
function fileFor(sound: string, available: Set<string>): string | null {
  for (const extension of ["wav", "mp3"]) {
    const final = `audio/final/${sound}.${extension}`;
    if (available.has(final)) return final;
  }
  const sketch = `audio/synth/${sound}.wav`;
  return available.has(sketch) ? sketch : null;
}

/** Plays sound cues whose files exist (run `npm run sfx` to make the sketches). */
export function SoundTrack({ cues, gain = 1 }: { cues: SoundCue[]; gain?: number }) {
  const available = new Set(getStaticFiles().map((file) => file.name));
  return (
    <>
      {cues
        .map((cue) => ({ cue, file: fileFor(cue.sound, available) }))
        .filter((entry): entry is { cue: SoundCue; file: string } => entry.file !== null)
        .map(({ cue, file }, index) => (
          <Sequence key={`${cue.sound}-${index}`} from={cue.frame} layout="none" name={`♪ ${cue.sound}`}>
            <Audio
              src={staticFile(file)}
              volume={(local) => {
                const level = Math.min(1, cue.volume * MASTER * gain);
                if (cue.until === undefined) return level;
                return level * Math.min(1, Math.max(0, (cue.until - cue.frame - local) / 14));
              }}
              playbackRate={cue.rate ?? 1}
            />
          </Sequence>
        ))}
    </>
  );
}
