// The final sound design: one music track for the whole film, a few effects on
// the key beats only, and a voice-over. Kept deliberately sparse: every sound
// lands on a beat of the picture, nothing plays for decoration.
//
// The music and the voice come from ElevenLabs and live in public/audio/final/.
// The effects are the ones synthesised in code (scripts/sfx, `npm run sfx`, in
// public/audio/synth/). The film uses this design when the music is there, and
// the full synthesised sketch (cues.ts) otherwise.

import type { Locale } from "../content/locales";
import { p1, p2, p4, p5, PART1_FRAMES, PART2_FRAMES, PART3_FRAMES, PART4_FRAMES, part3Beats } from "./beats";
import type { Film } from "../lib/film";

const FPS = 30;
/** Where each part starts in the film, in frames. */
const at = {
  p1: 0,
  p2: PART1_FRAMES,
  p3: PART1_FRAMES + PART2_FRAMES,
  p4: PART1_FRAMES + PART2_FRAMES + PART3_FRAMES,
  p5: PART1_FRAMES + PART2_FRAMES + PART3_FRAMES + PART4_FRAMES,
};
const seconds = (frame: number) => frame / FPS;

/** The music: one piece, composed to the film's sections. */
export const musicBrief = {
  file: "music",
  lengthSeconds: 55.5,
  bpm: 120,
  style:
    "Modern, minimal electronic for a premium tech product film. Clean and controlled, never busy: warm analog synths, soft plucks, tight kick, light percussion. 120 BPM. No vocals.",
  sections: [
    { from: 0, to: 9, brief: "Intro: dark and tense. A low pulse like a quickening heartbeat, sub bass, filtered noise. No melody. Builds slightly." },
    { from: 9, to: 10.5, brief: "Reveal: a bright, open chord blooms (the logo appears). Tension released." },
    { from: 10.5, to: 38.5, brief: "Main groove: warm, confident, steady. Soft kick on every beat, off-beat hats, a plucked bass and a simple chord pattern. Small lifts at 21.5 s and 31.5 s, nothing busier." },
    { from: 38.5, to: 40.5, brief: "Break: drops to a low pad, almost silence, darker." },
    { from: 40.5, to: 51.5, brief: "Final build: driving and determined, the groove returns fuller, rising toward the end." },
    { from: 51.5, to: 55.5, brief: "Resolve: one clean final chord on the logo, short natural tail, ending in silence." },
  ],
};

/** The effects on the film's timeline (frames of the whole film). */
export function finalEffects(sample: Film["sample"]): { sound: string; frame: number; volume: number }[] {
  const p3 = part3Beats(sample);
  return [
    // Part 1: two heartbeats, the slam, the burst and the dive, the reels, the slash, the flood, the mark.
    { sound: "heartbeat", frame: at.p1 + p1.beats[0]!, volume: 0.8 },
    { sound: "heartbeat", frame: at.p1 + p1.beats[1]!, volume: 0.8 },
    { sound: "slam", frame: at.p1 + p1.slam + 1, volume: 0.8 },
    { sound: "burst", frame: at.p1 + p1.burst, volume: 0.6 },
    { sound: "dive", frame: at.p1 + p1.burst + 1, volume: 0.6 },
    { sound: "reel-spin", frame: at.p1 + p1.reels, volume: 0.45 },
    { sound: "reel-stop", frame: at.p1 + p1.stops[4]!, volume: 0.55 },
    { sound: "slash", frame: at.p1 + p1.slash, volume: 0.7 },
    { sound: "flood", frame: at.p1 + p1.flood, volume: 0.6 },
    { sound: "dock", frame: at.p1 + p1.dock, volume: 0.85 },
    { sound: "through", frame: at.p1 + p1.through - 2, volume: 0.55 },
    // Part 2: the price lands at $0, the toggle, the offer read, the chips, the start.
    { sound: "reel-stop", frame: at.p2 + p2.freeLand, volume: 0.5 },
    { sound: "free-chime", frame: at.p2 + p2.freeLand + 1, volume: 0.4 },
    { sound: "toggle", frame: at.p2 + p2.toggle, volume: 0.6 },
    { sound: "expand", frame: at.p2 + p2.morph - 2, volume: 0.5 },
    { sound: "click", frame: at.p2 + p2.send, volume: 0.6 },
    { sound: "shimmer", frame: at.p2 + p2.glow, volume: 0.35 },
    ...p2.drop.map((frame, index) => ({ sound: "chip-land", frame: at.p2 + frame + p2.dropFrames, volume: 0.5 + index * 0.02 })),
    { sound: "click", frame: at.p2 + p2.start, volume: 0.6 },
    { sound: "flood", frame: at.p2 + p2.burst - 2, volume: 0.45 },
    // Part 3: the answer typed and sent, the follow-up.
    { sound: "typing", frame: at.p3 + p3.typing, volume: 0.35 },
    { sound: "click", frame: at.p3 + p3.send - 2, volume: 0.55 },
    { sound: "mark", frame: at.p3 + p3.followUp, volume: 0.5 },
    // Part 4: the debrief's chime, the next card, the fold into a file.
    { sound: "free-chime", frame: at.p4 + p4.summary, volume: 0.55 },
    { sound: "swap", frame: at.p4 + p4.cards[1]! - 2, volume: 0.45 },
    { sound: "collapse", frame: at.p4 + p4.collapse - 4, volume: 0.5 },
    // Part 5: the title, the key connected, Ollama, the implosion, the terminal, the mark.
    { sound: "slam", frame: at.p5 + p5.title + 2, volume: 0.6 },
    { sound: "typing", frame: at.p5 + p5.key, volume: 0.3 },
    { sound: "free-chime", frame: at.p5 + p5.connected, volume: 0.45 },
    { sound: "toggle", frame: at.p5 + p5.pick[3]!, volume: 0.55 },
    { sound: "collapse", frame: at.p5 + p5.implode - 4, volume: 0.5 },
    { sound: "typing", frame: at.p5 + p5.typing, volume: 0.4 },
    { sound: "click", frame: at.p5 + p5.enter, volume: 0.7 },
    { sound: "dock", frame: at.p5 + p5.mark + 8, volume: 0.85 },
  ];
}

/** The voice-over: one short line per idea, in the film's quieter moments. Times are in seconds of the film. */
export const voiceLines: Record<Locale, { id: string; at: number; text: string }[]> = {
  en: [
    { id: "01", at: 1.0, text: "Technical interviews are stressful." },
    { id: "02", at: 4.0, text: "And practising with a coach can cost up to a hundred and fifty dollars a month." },
    { id: "03", at: 9.1, text: "Meet Mockroom." },
    { id: "04", at: 10.6, text: "Free, open source, in English and French." },
    { id: "05", at: 14.0, text: "Paste a job offer…" },
    { id: "06", at: 16.2, text: "and it picks out the tech the role needs." },
    { id: "07", at: 22.0, text: "An AI recruiter interviews you…" },
    { id: "08", at: 27.2, text: "and digs deeper, like a real one." },
    { id: "09", at: 32.0, text: "Then you get a clear debrief: what went well, and what to review." },
    { id: "10", at: 42.8, text: "Bring your own API key. It stays on your machine." },
    { id: "11", at: 46.7, text: "Or run it free and offline, with Ollama." },
    { id: "12", at: 49.4, text: "No account. Your interviews stay on your computer." },
    { id: "13", at: 52.5, text: "Mockroom. Rehearse the interview, not the panic." },
  ],
  fr: [
    { id: "01", at: 1.0, text: "Les entretiens techniques, c'est stressant." },
    { id: "02", at: 4.0, text: "Et s'entraîner avec un coach peut coûter jusqu'à cent cinquante dollars par mois." },
    { id: "03", at: 9.1, text: "Voici Mockroom." },
    { id: "04", at: 10.6, text: "Gratuit, open source, en français et en anglais." },
    { id: "05", at: 14.15, text: "Colle une offre d'emploi…" },
    { id: "06", at: 16.2, text: "il repère les technos que le poste demande." },
    { id: "07", at: 22.0, text: "Un recruteur IA te fait passer l'entretien…" },
    { id: "08", at: 27.2, text: "et creuse, comme un vrai." },
    { id: "09", at: 32.0, text: "Puis tu reçois un bilan clair : ce qui allait, et quoi réviser." },
    { id: "10", at: 42.3, text: "Utilise ta propre clé d'API. Elle reste sur ta machine." },
    { id: "11", at: 46.4, text: "Ou gratuit et hors ligne, avec Ollama." },
    { id: "12", at: 49.1, text: "Pas de compte. Tes entretiens restent sur ton ordi." },
    { id: "13", at: 52.45, text: "Mockroom. Répète l'entretien, pas la panique." },
  ],
};

/** A voice line's file, in public/audio/final/. */
export const voiceFile = (locale: Locale, id: string) => `vo-${locale}-${id}`;

/** About how long a line takes to say, for ducking the music under it. */
const spoken = (text: string) => 0.4 + text.length * 0.062;

/** How much the voice is speaking at a time of the film (0 → 1, with soft ramps), to duck the music. */
export function voiceActivity(locale: Locale, time: number): number {
  let level = 0;
  for (const line of voiceLines[locale]) {
    const start = line.at - 0.25;
    const end = line.at + spoken(line.text) + 0.25;
    const ramp = 0.25;
    const inside = Math.min(1, Math.max(0, (time - start) / ramp), Math.max(0, (end - time) / ramp));
    level = Math.max(level, inside);
  }
  return level;
}

/** The music's level at a time of the film: ducked under the voice, and dipped for the break into the dark stage. */
export function musicLevel(locale: Locale, time: number): number {
  const breakStart = seconds(at.p4 + p4.dark) + 0.2;
  const breakEnd = seconds(at.p5) + 0.3;
  const dip = Math.min(1, Math.max(0, (time - breakStart) / 0.4), Math.max(0, (breakEnd - time) / 0.3));
  return 0.8 * (1 - 0.55 * voiceActivity(locale, time)) * (1 - 0.75 * dip);
}

export { seconds };
