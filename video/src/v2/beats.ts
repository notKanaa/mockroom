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

/** Part 2: the four promises on a 120 BPM grid (a beat every 15 frames), then the job offer. */
export const p2 = {
  logoOut: 4,
  free: 15,
  freeLand: 33,
  open: 45,
  clap: 51,
  mit: 60,
  language: 75,
  toggle: 88,
  machine: 105,
  expand: 120,
  demo: 150,
  paper: 165,
  paste: 195,
  send: 210,
  scan: 213,
  marks: [228, 240, 252],
  swap: 270,
  fly: [272, 277, 282],
  flyFrames: 16,
  pack: 304,
  start: 330,
  whip: 336,
};
