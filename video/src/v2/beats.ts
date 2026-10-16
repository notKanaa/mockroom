// The beats of each part of the film, in frames at 30 fps. The pictures move on
// them and the sounds hit on them.

export const PART1_FRAMES = 300;

/** Every beat of the opening, in frames at 30 fps. */
export const p1 = {
  ringIn: 4,
  beats: [18, 34, 58, 70, 80, 88, 95, 101],
  line1: 40,
  are: 64,
  slam: 70,
  burst: 104,
  dive: 102,
  cost: 116,
  kicker: 120,
  reels: 132,
  stops: [146, 151, 158, 163, 168],
  unit: 166,
  slash: 182,
  split: 190,
  flood: 198,
  collapse: 214,
  ringFly: 222,
  dock: 236,
  open: 246,
  through: 252,
  logo: 266,
};

export const PART2_FRAMES = 345;

/** Part 2: the four promises on a 120 BPM grid (a beat every 15 frames), then the job offer, read by the AI. */
export const p2 = {
  logoOut: 4,
  free: 15,
  freeLand: 33,
  open: 45,
  clap: 51,
  mit: 60,
  language: 75,
  toggle: 88,
  /** The toggle's knob morphs into the prompt box. */
  morph: 100,
  morphFrames: 22,
  prompt: 116,
  caption1: 104,
  /** The job offer's words fading in, so many per frame. */
  words: 128,
  wordsPerFrame: 1.6,
  send: 168,
  glow: 170,
  sheen: 174,
  marks: [182, 192, 202],
  lift: [214, 218, 222],
  liftFrames: 20,
  recede: 222,
  caption2: 228,
  card: 238,
  drop: [250, 255, 260],
  dropFrames: 14,
  pack: 280,
  summary: 292,
  start: 318,
  burst: 321,
  burstFrames: 18,
};
