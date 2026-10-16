// Where every sound hits: one list per part of the film, then the whole film's.
// The sounds are sketched in code (scripts/sfx, `npm run sfx`); each can be
// replaced by a final one (from ElevenLabs) dropped in public/audio/final/ under
// the same name (see SoundTrack). `npm run cues` writes the film's list, with
// times in seconds, to audio-cues.json.

import type { Film } from "../lib/film";
import {
  p1,
  p2,
  p4,
  p5,
  PART1_FRAMES,
  PART2_FRAMES,
  PART3_FRAMES,
  PART4_FRAMES,
  PART5_FRAMES,
  part3Beats,
  type Beats,
} from "./beats";

export interface SoundCue {
  /** File name in public/audio/synth/, without .wav. */
  sound: string;
  frame: number;
  volume: number;
  /** Plays faster and higher (1 = as made), to vary a repeated sound. */
  rate?: number;
  /** Fades the sound out over a few frames ending here (a frame of the part), to end a bed early. */
  until?: number;
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

export const part2Sound: SoundCue[] = [
  { sound: "groove", frame: p2.free - 2, volume: 0.85 },
  { sound: "whoosh-in", frame: p2.logoOut, volume: 0.45 },
  { sound: "reel-spin", frame: p2.free, volume: 0.45, rate: 1.15 },
  { sound: "reel-stop", frame: p2.freeLand, volume: 0.6 },
  { sound: "free-chime", frame: p2.freeLand + 1, volume: 0.7 },
  { sound: "swipe-small", frame: p2.open - 4, volume: 0.4 },
  { sound: "clap", frame: p2.clap, volume: 0.8 },
  { sound: "pops", frame: p2.mit, volume: 0.45 },
  { sound: "swipe-small", frame: p2.language - 4, volume: 0.4 },
  { sound: "toggle", frame: p2.toggle, volume: 0.7 },
  { sound: "flip", frame: p2.toggle + 1, volume: 0.6 },
  { sound: "expand", frame: p2.morph - 2, volume: 0.75 },
  { sound: "typing", frame: p2.words, volume: 0.35, rate: 1.4 },
  { sound: "typing", frame: p2.words + 18, volume: 0.3, rate: 1.55 },
  { sound: "click", frame: p2.send, volume: 0.7 },
  { sound: "shimmer", frame: p2.glow, volume: 0.45 },
  { sound: "scan", frame: p2.sheen, volume: 0.5 },
  ...p2.marks.map((frame, index) => ({ sound: "mark", frame, volume: 0.6, rate: 1 + index * 0.12 })),
  ...p2.lift.map((frame, index) => ({ sound: "chip-fly", frame, volume: 0.45, rate: 1 + index * 0.08 })),
  { sound: "swap", frame: p2.card - 2, volume: 0.5 },
  ...p2.drop.map((frame, index) => ({ sound: "chip-land", frame: frame + p2.dropFrames, volume: 0.6, rate: 1 + index * 0.1 })),
  { sound: "swipe-small", frame: p2.pack - 2, volume: 0.4 },
  { sound: "chip-land", frame: p2.pack + 4, volume: 0.55, rate: 0.85 },
  { sound: "swipe-small", frame: p2.summary, volume: 0.35, rate: 0.8 },
  { sound: "click", frame: p2.start, volume: 0.7 },
  { sound: "flood", frame: p2.burst - 2, volume: 0.7 },
];

export function part3Sound(beats: Beats): SoundCue[] {
  const b = beats;
  return [
    { sound: "groove", frame: 0, volume: 0.85 },
    { sound: "collapse", frame: b.iris, volume: 0.6 },
    { sound: "ring-pop", frame: b.letter, volume: 0.55 },
    { sound: "whoosh-in", frame: b.travel, volume: 0.5 },
    { sound: "shimmer", frame: b.thinking, volume: 0.3 },
    { sound: "typing", frame: b.question, volume: 0.22, rate: 1.8 },
    { sound: "typing", frame: b.typing, volume: 0.4, rate: 1.3 },
    { sound: "typing", frame: b.typing + 20, volume: 0.35, rate: 1.45 },
    { sound: "click", frame: b.send - 2, volume: 0.6 },
    { sound: "chip-fly", frame: b.send, volume: 0.5, rate: 0.85 },
    { sound: "chip-land", frame: b.send + 10, volume: 0.5, rate: 0.9 },
    { sound: "shimmer", frame: b.thinking2, volume: 0.25 },
    { sound: "toggle", frame: b.progress, volume: 0.6 },
    { sound: "mark", frame: b.followUp, volume: 0.65, rate: 0.9 },
    { sound: "free-chime", frame: b.followUp + 2, volume: 0.35 },
    { sound: "typing", frame: b.followUp + 4, volume: 0.22, rate: 1.8 },
    { sound: "swap", frame: b.exit, volume: 0.55 },
  ];
}

export const part4Sound: SoundCue[] = [
  { sound: "groove", frame: 0, volume: 0.85, until: p4.dark },
  { sound: "free-chime", frame: p4.summary, volume: 0.8 },
  { sound: "shimmer", frame: p4.summary, volume: 0.35 },
  ...p4.cards.flatMap((at, index) => [
    { sound: "whoosh-in", frame: at - 4, volume: 0.5, rate: 1 + index * 0.1 },
    { sound: "flip", frame: at + p4.columns, volume: 0.5 },
    { sound: "flip", frame: at + p4.columns + 3, volume: 0.45, rate: 1.15 },
    ...[0, 1, 2, 3].map((point) => ({ sound: "pops", frame: at + p4.points + point * p4.pointGap, volume: 0.3, rate: 1 + point * 0.07 })),
    { sound: "mark", frame: at + p4.model, volume: 0.45 },
  ]),
  { sound: "collapse", frame: p4.collapse - 4, volume: 0.6 },
  { sound: "chip-land", frame: p4.file + 6, volume: 0.65, rate: 0.8 },
  { sound: "dive", frame: p4.dark - 4, volume: 0.6 },
  { sound: "drone-dark", frame: p4.dark, volume: 0.3, until: PART4_FRAMES + 30 },
];

export const part5Sound: SoundCue[] = [
  { sound: "groove", frame: p5.cards - 6, volume: 0.8, until: p5.implode + 8 },
  { sound: "slam", frame: p5.title + 2, volume: 0.8 },
  { sound: "whoosh-in", frame: p5.titleUp - 2, volume: 0.45 },
  ...[0, 1, 2, 3].map((index) => ({ sound: "flip", frame: p5.cards + index * 3, volume: 0.45, rate: 1 + index * 0.06 })),
  ...p5.pick.map((frame, index) => ({ sound: "toggle", frame, volume: 0.6, rate: 1 + index * 0.05 })),
  { sound: "swipe-small", frame: p5.key - 4, volume: 0.4 },
  { sound: "typing", frame: p5.key, volume: 0.45, rate: 1.4 },
  { sound: "click", frame: p5.test, volume: 0.7 },
  { sound: "free-chime", frame: p5.connected, volume: 0.6 },
  { sound: "typing", frame: p5.pick[1]! + 2, volume: 0.3, rate: 1.7 },
  { sound: "typing", frame: p5.pick[2]! + 2, volume: 0.3, rate: 1.8 },
  { sound: "dock", frame: p5.ollama, volume: 0.6 },
  { sound: "pops", frame: p5.ollama + 14, volume: 0.45 },
  { sound: "collapse", frame: p5.implode - 4, volume: 0.65 },
  { sound: "ring-pop", frame: p5.pill, volume: 0.6 },
  { sound: "drone-dark", frame: p5.implode, volume: 0.22, until: p5.enter },
  { sound: "expand", frame: p5.terminal - 2, volume: 0.5 },
  { sound: "typing", frame: p5.typing, volume: 0.5, rate: 0.9 },
  { sound: "click", frame: p5.enter, volume: 0.8 },
  { sound: "slam", frame: p5.enter + 1, volume: 0.55 },
  { sound: "whip", frame: p5.knock - 2, volume: 0.6 },
  { sound: "dock", frame: p5.mark + 8, volume: 0.75 },
  { sound: "letters", frame: p5.name, volume: 0.4 },
  { sound: "sting", frame: p5.name + 4, volume: 0.85 },
  { sound: "pad-light", frame: p5.mark, volume: 0.7 },
  { sound: "shimmer", frame: p5.tagline, volume: 0.35 },
  { sound: "pops", frame: p5.footer, volume: 0.4, rate: 0.9 },
  { sound: "toggle", frame: p5.license, volume: 0.3 },
];

/** Each part's length, its cues, and how loud its mix sits. */
export function parts(sample: Film["sample"]) {
  return [
    { id: "opening", frames: PART1_FRAMES, cues: part1Sound, gain: 1 },
    { id: "product", frames: PART2_FRAMES, cues: part2Sound, gain: 1.45 },
    { id: "interview", frames: PART3_FRAMES, cues: part3Sound(part3Beats(sample)), gain: 1.3 },
    { id: "debrief", frames: PART4_FRAMES, cues: part4Sound, gain: 1.3 },
    { id: "your-ai", frames: PART5_FRAMES, cues: part5Sound, gain: 1.2 },
  ];
}

export const FILM_FRAMES = PART1_FRAMES + PART2_FRAMES + PART3_FRAMES + PART4_FRAMES + PART5_FRAMES;

/**
 * The whole film's cues, on its own timeline. Parts 2 to 4 share one long groove
 * instead of each restarting their own, so the beat runs on across the cuts.
 */
export function filmCues(sample: Film["sample"]): SoundCue[] {
  const list = parts(sample);
  const start = (index: number) => list.slice(0, index).reduce((total, part) => total + part.frames, 0);
  const cues: SoundCue[] = [];
  list.forEach((part, index) => {
    const offset = start(index);
    for (const cue of part.cues) {
      if (cue.sound === "groove" && index >= 1 && index <= 3) continue;
      cues.push({
        ...cue,
        frame: cue.frame + offset,
        volume: cue.volume * part.gain,
        ...(cue.until !== undefined && { until: cue.until + offset }),
      });
    }
  });
  cues.push({ sound: "groove-long", frame: start(1) + p2.free - 2, volume: 0.85 * 1.35, until: start(3) + p4.dark });
  return cues.sort((left, right) => left.frame - right.frame);
}


/**
 * What each sound should feel like: the brief for its final version (an
 * ElevenLabs sound effect or music prompt). The sketch in scripts/sfx follows it.
 */
export const soundBriefs: Record<string, string> = {
  "drone-dark": "Dark ambient bed, 8 s: a low sub drone and dusty air, slowly opening up. No melody.",
  "ring-pop": "A round, soft UI bloop with a sub underneath, like a bubble appearing. 1 s with a short tail.",
  heartbeat: "A single heartbeat, lub-dub, deep and close. Under 1 s.",
  "heartbeat-fast": "One quick, higher heartbeat thump, anxious. Under 0.5 s.",
  "whoosh-in": "A short, clean whoosh of a line of text sweeping in from the right. 0.5 s.",
  pops: "Three tiny, soft UI blips in quick succession. 0.3 s.",
  slam: "A heavy, dry impact with a crack on top, a word slamming onto the screen. Short reverb tail.",
  riser: "Tension riser, 1.2 s: noise and a tone climbing, fluttering faster, ending abruptly.",
  burst: "Glassy shatter: a short bright blast with many tiny glass ticks scattering. 1 s.",
  dive: "A deep whoosh diving forward and down, camera flying through. 0.9 s.",
  typing: "A few quick laptop keystrokes, soft and close. 0.7 s.",
  "reel-spin": "Slot-machine reels spinning: fast ticking that slows down. 1.2 s.",
  "reel-stop": "A slot reel locking into place: a solid mechanical clunk. Short.",
  "swipe-small": "A small, light swipe, a word sliding into place. 0.3 s.",
  slash: "A bright metallic slash, like a blade cutting the air: a 'shing'. 0.8 s with a short tail.",
  split: "A low, crunchy cut, something split in two. Short.",
  flood: "A big, wide swell of air filling the frame. 0.9 s.",
  collapse: "A reversed whoosh sucked into a point, cut sharp at the end. 0.6 s.",
  "fly-by": "A quick pass-by whoosh from right to centre. 0.5 s.",
  dock: "A warm, round impact of two soft discs meeting, with a few high sparkles. Short reverb.",
  shimmer: "A bright, shimmering swell of light, airy chimes. 1.4 s.",
  through: "A rising whoosh flying through into the light. 0.7 s.",
  "pad-light": "Warm, airy pad, a major chord swelling in and out. 3 s.",
  sting: "A soft logo sting: a mallet arpeggio up a major chord over a gentle sub. 2 s with tail.",
  letters: "Soft ticks, one per letter landing, quick succession. 0.5 s.",
  groove: "Light, modern 120 BPM groove: soft kick, off-beat hats, plucked bass, a chord stab per bar. Seamless, 11 s.",
  "groove-long": "The same 120 BPM groove, 32 s, so it runs under parts 2 to 4 without restarting.",
  "free-chime": "A little win: two bright notes going up, mallet. 1 s.",
  clap: "Two braces clapping together: a tight, wooden clap. Short.",
  toggle: "A UI toggle switching: a crisp double click. Short.",
  flip: "A card flipping over: a short papery swish. 0.2 s.",
  expand: "A rising swell as a shape grows to fill the screen. 0.8 s.",
  click: "A mouse or trackpad click, clean and close. Short.",
  scan: "An AI reading a text: a soft digital sweep moving back and forth. 1.9 s, subtle.",
  mark: "A highlighter swipe ending on a bright blip. 0.4 s.",
  "chip-fly": "A small whoosh of a tag lifting off and flying. 0.45 s.",
  "chip-land": "A soft pop of a tag landing in place. Short.",
  swap: "A short whoosh of a screen changing. 0.35 s.",
  whip: "A fast, wide whip-pan whoosh. 0.4 s.",
};
