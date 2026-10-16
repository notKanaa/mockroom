// The sketch sound design: synthesised effects (scripts/sfx, `npm run sfx`) placed on
// the film's beats. Whooshes start a little before their move, so their peak lands on it.
// The final effects come from ElevenLabs later, cue by cue.

import { Audio, getStaticFiles, Sequence, staticFile } from "remotion";
import { p1 } from "./beats";

export interface SoundCue {
  /** File name in public/audio/synth/, without .wav. */
  sound: string;
  frame: number;
  volume: number;
}

export const part1Sound: SoundCue[] = [
  { sound: "drone-dark", frame: 0, volume: 0.3 },
  { sound: "ring-pop", frame: p1.ringIn, volume: 0.7 },
  ...p1.beats.map((frame, index) => ({
    sound: index < 2 ? "heartbeat" : "heartbeat-fast",
    frame,
    volume: index < 2 ? 0.85 : 0.45 + index * 0.05,
  })),
  { sound: "whoosh-in", frame: p1.line1, volume: 0.6 },
  { sound: "pops", frame: p1.are, volume: 0.5 },
  { sound: "slam", frame: p1.slam + 1, volume: 1 },
  { sound: "riser", frame: p1.slam, volume: 0.55 },
  { sound: "burst", frame: p1.burst, volume: 0.75 },
  { sound: "dive", frame: p1.burst + 1, volume: 0.8 },
  { sound: "typing", frame: p1.kicker, volume: 0.45 },
  { sound: "reel-spin", frame: p1.reels, volume: 0.55 },
  ...p1.stops.map((frame) => ({ sound: "reel-stop", frame, volume: 0.6 })),
  { sound: "swipe-small", frame: p1.unit, volume: 0.45 },
  { sound: "slash", frame: p1.slash, volume: 0.8 },
  { sound: "split", frame: p1.split, volume: 0.75 },
  { sound: "flood", frame: p1.flood, volume: 0.85 },
  { sound: "collapse", frame: p1.collapse, volume: 0.7 },
  { sound: "fly-by", frame: p1.ringFly + 2, volume: 0.6 },
  { sound: "dock", frame: p1.dock, volume: 0.95 },
  { sound: "shimmer", frame: p1.open - 2, volume: 0.6 },
  { sound: "through", frame: p1.through - 2, volume: 0.75 },
  { sound: "pad-light", frame: p1.logo - 4, volume: 0.6 },
  { sound: "sting", frame: p1.logo, volume: 0.8 },
  { sound: "letters", frame: p1.logo + 1, volume: 0.4 },
];

/** Headroom for the whole mix, so stacked hits never clip. */
const MASTER = 0.72;

/** Plays sound cues whose files exist (run `npm run sfx` to make them). */
export function SoundTrack({ cues }: { cues: SoundCue[] }) {
  const available = new Set(getStaticFiles().map((file) => file.name));
  return (
    <>
      {cues
        .filter((cue) => available.has(`audio/synth/${cue.sound}.wav`))
        .map((cue, index) => (
          <Sequence key={`${cue.sound}-${index}`} from={cue.frame} layout="none" name={`♪ ${cue.sound}`}>
            <Audio src={staticFile(`audio/synth/${cue.sound}.wav`)} volume={cue.volume * MASTER} />
          </Sequence>
        ))}
    </>
  );
}
