// The final sound design: one music track for the whole film, a few effects on
// the key beats only, and a voice-over. Kept deliberately sparse: every sound
// lands on a beat of the picture, nothing plays for decoration.
//
// The music and the voice come from ElevenLabs and live in public/audio/final/.
// The effects are synthesised in code (scripts/sfx). scripts/mix.ts mixes all of
// it into one track per language (`npm run mix`), which the film plays.

import { locales, type Locale, type LocaleContent } from "../content/locales";
import { p1, p2, p4, p5, PART1_FRAMES, PART2_FRAMES, PART3_FRAMES, PART4_FRAMES, part3Beats } from "./beats";

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

/**
 * An effect on the film's timeline. `frame` is the frame where the picture peaks
 * (an impact lands, a move is at its fastest). With `align: "hit"` (the default)
 * the mix places the sound so that its loudest moment falls on that frame; with
 * "start", the sound starts there (typing, a shimmer, reels spinning).
 * `gain` is in dB, relative to the sound normalised to a common level.
 */
export interface Effect {
  sound: string;
  frame: number;
  gain: number;
  align?: "hit" | "start";
}

/** Levels per family, in dB: impacts lead, whooshes support, the interface stays discreet. */
const level = { impact: -4, whoosh: -9, ui: -15, chime: -12, texture: -19 };

/**
 * A key press for each character as it appears on screen (`typed` reveals char i at
 * start + i / charsPerFrame), at most one every two frames, in four alternating voices.
 */
function keystrokes(start: number, count: number, charsPerFrame: number, gain = level.ui - 2): Effect[] {
  const out: Effect[] = [];
  let last = -Infinity;
  for (let index = 1; index <= count; index++) {
    const frame = start + index / charsPerFrame;
    if (frame - last < 2) continue;
    last = frame;
    out.push({ sound: `key-${((index * 7) % 4) + 1}`, frame: Math.round(frame), gain: gain + (((index * 5) % 3) - 1) * 1.5 });
  }
  return out;
}

/** The effects, each on the frame where its picture peaks (frames of the whole film). */
export function finalEffects(content: Pick<LocaleContent, "film" | "sample">): Effect[] {
  const { film, sample } = content;
  const p3 = part3Beats(sample);
  const one = (sound: string, frame: number, gain: number, align: "hit" | "start" = "hit"): Effect => ({ sound, frame, gain, align });
  const masked = (prefix: string) => prefix.length + 14 + 4;
  return [
    // Part 1. One soft thump per heartbeat (on the pulse's peak), the words, their dissolve and the dive,
    // the coach question typed, the reels, the soft cut, the flood, the mark, the fly-through.
    // The ring's birth is the first pulse; each later pulse peaks 2 frames after its beat, on the music's own pulse.
    one("heartbeat-fast", at.p1 + p1.ringIn + 4, level.impact - 2),
    ...p1.beats.map((beat, index) => one("heartbeat-fast", at.p1 + beat + 2, index < 2 ? level.impact - 2 : level.whoosh + 1)),
    one("slam", at.p1 + p1.slam + 3, level.impact - 3),
    one("dissolve", at.p1 + p1.burst + 3, level.whoosh - 1),
    one("dive", at.p1 + 122, level.whoosh - 2),
    ...keystrokes(at.p1 + p1.kicker, film.problem.costKicker.length, 1.6),
    one("reel-spin", at.p1 + p1.reels, level.texture, "start"),
    ...p1.stops.map((stop) => one("reel-stop", at.p1 + stop, level.ui)),
    // The price cut like a katana: the slice on the slash's fastest frame, then the halves parting.
    one("katana", at.p1 + p1.slash + 4, level.whoosh + 2),
    one("split", at.p1 + p1.split + 2, level.whoosh - 4),
    one("flood", at.p1 + p1.flood + 9, level.whoosh),
    one("collapse", at.p1 + p1.collapse + 17, level.whoosh - 2),
    one("dock", at.p1 + p1.dock, level.impact),
    one("through", at.p1 + p1.through + 13, level.whoosh),
    // Part 2. $0 lands, the braces clap, the toggle, the knob morphs, the offer is read, the chips land, start.
    one("reel-stop", at.p2 + p2.freeLand, level.ui + 2),
    one("free-chime", at.p2 + p2.freeLand + 1, level.chime, "start"),
    one("clap", at.p2 + p2.clap, level.ui + 4),
    one("toggle", at.p2 + p2.toggle + 1, level.ui + 2),
    one("expand", at.p2 + p2.morph + 14, level.whoosh - 2),
    one("click", at.p2 + p2.send + 1, level.ui + 2),
    one("shimmer", at.p2 + p2.glow, level.texture, "start"),
    ...p2.marks.map((mark) => one("mark", at.p2 + mark + 4, level.ui)),
    ...p2.drop.map((drop) => one("chip-land", at.p2 + drop + p2.dropFrames, level.ui)),
    one("chip-land", at.p2 + p2.pack + 6, level.ui - 2),
    one("click", at.p2 + p2.start + 2, level.ui + 2),
    one("flood", at.p2 + p2.burst + 12, level.whoosh - 2),
    // Part 3. The iris closes, the avatar flies to the header, the answer is typed key by key and sent, the follow-up.
    one("collapse", at.p3 + 14, level.whoosh - 4),
    one("whoosh-in", at.p3 + 30, level.whoosh - 4),
    ...keystrokes(at.p3 + p3.typing, sample.answer.length, 3),
    one("click", at.p3 + p3.send - 1, level.ui + 2),
    one("chip-fly", at.p3 + p3.send + 6, level.ui),
    one("mark", at.p3 + p3.followUp + 2, level.ui + 2),
    // Part 4. Camille's notes, the next card, the fold into a file, the file landing.
    one("free-chime", at.p4 + p4.summary + 2, level.chime, "start"),
    one("swap", at.p4 + p4.cards[1]! + 6, level.whoosh - 4),
    one("collapse", at.p4 + p4.collapse + 10, level.whoosh - 2),
    one("chip-land", at.p4 + p4.file + 6, level.ui),
    // Part 5. The title, each pick, each key typed, connected, the implosion, the command typed, Enter, the mark.
    one("slam", at.p5 + p5.title + 3, level.impact - 6),
    ...p5.pick.map((pick) => one("toggle", at.p5 + pick + 1, level.ui)),
    ...keystrokes(at.p5 + p5.key, masked("sk-proj-"), 0.9),
    ...keystrokes(at.p5 + p5.pick[1]! + 2, masked("sk-ant-"), 2.2, level.ui - 5),
    ...keystrokes(at.p5 + p5.pick[2]! + 2, masked("AIza"), 2.2, level.ui - 5),
    one("click", at.p5 + p5.test + 2, level.ui + 2),
    one("free-chime", at.p5 + p5.connected, level.chime, "start"),
    one("collapse", at.p5 + p5.implode + 14, level.whoosh - 2),
    one("ring-pop", at.p5 + p5.pill + 2, level.ui + 2),
    one("expand", at.p5 + p5.terminal + 8, level.whoosh - 4),
    ...keystrokes(at.p5 + p5.typing, film.cta.command.length, 0.55, level.ui),
    one("click", at.p5 + p5.enter, level.ui + 4),
    one("whip", at.p5 + p5.knock + 8, level.whoosh - 2),
    one("dock", at.p5 + p5.mark + 8, level.impact),
  ];
}

type Part = keyof typeof at;

/**
 * The voice-over: one short line per idea. Each line starts on the picture it talks
 * about (never before it), `at` seconds from the start of its part.
 */
const voiceScript: Record<Locale, { id: string; part: Part; at: number; text: string }[]> = {
  en: [
    { id: "01", part: "p1", at: p1.line1 / FPS, text: "Technical interviews are stressful." },
    { id: "02", part: "p1", at: p1.kicker / FPS - 0.1, text: "And practising with a coach can cost up to a hundred and fifty dollars a month." },
    { id: "03", part: "p1", at: (p1.logo + 6) / FPS, text: "Meet Mockroom." },
    { id: "04", part: "p2", at: (p2.freeLand - 2) / FPS, text: "Free, open source, in English and French." },
    { id: "05", part: "p2", at: p2.prompt / FPS, text: "Paste a job offer…" },
    { id: "06", part: "p2", at: p2.marks[0]! / FPS, text: "and it picks out the tech the role needs." },
    { id: "07", part: "p3", at: 24 / FPS, text: "An AI recruiter interviews you…" },
    { id: "08", part: "p3", at: 0, text: "and digs deeper, like a real one." },
    { id: "09", part: "p4", at: 0.5, text: "Then you get a clear debrief: what went well, and what to review." },
    { id: "10", part: "p5", at: p5.byok / FPS, text: "Bring your own API key. It stays on your machine." },
    { id: "11", part: "p5", at: p5.ollamaLine / FPS, text: "Or run it free and offline, with Ollama." },
    { id: "12", part: "p5", at: (p5.pill + 11) / FPS, text: "No account. Your interviews stay on your computer." },
    { id: "13", part: "p5", at: (p5.name + 2) / FPS, text: "Mockroom. Rehearse the interview, not the panic." },
  ],
  fr: [
    { id: "01", part: "p1", at: p1.line1 / FPS, text: "Les entretiens techniques, c'est stressant." },
    { id: "02", part: "p1", at: p1.kicker / FPS - 0.1, text: "Et s'entraîner avec un coach peut coûter jusqu'à cent cinquante dollars par mois." },
    { id: "03", part: "p1", at: (p1.logo + 6) / FPS, text: "Voici Mockroom." },
    { id: "04", part: "p2", at: 0.6, text: "Gratuit, open source, en français et en anglais." },
    { id: "05", part: "p2", at: p2.prompt / FPS + 0.15, text: "Colle une offre d'emploi…" },
    { id: "06", part: "p2", at: p2.marks[0]! / FPS, text: "il repère les technos que le poste demande." },
    { id: "07", part: "p3", at: 24 / FPS, text: "Un recruteur IA te fait passer l'entretien…" },
    { id: "08", part: "p3", at: 0, text: "et creuse, comme un vrai." },
    { id: "09", part: "p4", at: 0.5, text: "Puis tu reçois un bilan clair : ce qui allait, et quoi réviser." },
    { id: "10", part: "p5", at: p5.byok / FPS, text: "Utilise ta clé d'API. Elle reste sur ta machine." },
    { id: "11", part: "p5", at: p5.ollamaLine / FPS, text: "Ou gratuit et hors ligne, avec Ollama." },
    { id: "12", part: "p5", at: (p5.pill + 12) / FPS, text: "Pas de compte. Tes entretiens restent sur ton ordi." },
    { id: "13", part: "p5", at: (p5.name + 10) / FPS, text: "Mockroom. Répète l'entretien, pas la panique." },
  ],
};

/** The follow-up line starts as the follow-up appears, which depends on the language's texts. */
const followUpAt = (locale: Locale) => part3Beats(locales[locale].sample).followUp / FPS + 0.1;

/** The voice-over lines with their time in the whole film, in seconds. */
export const voiceLines: Record<Locale, { id: string; at: number; text: string }[]> = {
  en: voiceScript.en.map((line) => ({ ...line, at: seconds(at[line.part]) + (line.id === "08" ? followUpAt("en") : line.at) })),
  fr: voiceScript.fr.map((line) => ({ ...line, at: seconds(at[line.part]) + (line.id === "08" ? followUpAt("fr") : line.at) })),
};


/** A voice line's file, in public/audio/final/. */
export const voiceFile = (locale: Locale, id: string) => `vo-${locale}-${id}`;

/** 0 → 1 while the film breaks into the dark stage (end of part 4), when the music drops away. */
export function breakDip(time: number): number {
  const breakStart = seconds(at.p4 + p4.dark) + 0.2;
  const breakEnd = seconds(at.p5) + 0.3;
  return Math.min(1, Math.max(0, (time - breakStart) / 0.4), Math.max(0, (breakEnd - time) / 0.3));
}

export { seconds };
