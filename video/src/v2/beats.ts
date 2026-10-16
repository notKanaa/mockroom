// The beats of each part of the film, in frames at 30 fps. The pictures move on
// them and the sounds hit on them.

import type { Film } from "../lib/film";
import { framesFor } from "../lib/motion";

export const PART1_FRAMES = 300;

/** Every beat of the opening, in frames at 30 fps. */
export const p1 = {
  ringIn: 4,
  /** On the music's intro pulse (a hit every 0.25 s on its 120 BPM grid): each pulse peaks 2 frames later. */
  beats: [14, 29, 44, 59, 74, 81, 89, 96],
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

export const PART3_FRAMES = 300;


/** Characters a frame: the recruiter's text streaming in, and the candidate typing. */
export const STREAM = 2.6;
export const TYPE = 3;


/** Part 3's beats; the interview's follow the length of its texts, so French fits too. */
export function part3Beats(sample: Pick<Film["sample"], "question" | "answer" | "followUp">) {
  const question = 58;
  const typing = question + framesFor(sample.question, STREAM) + 10;
  const send = typing + framesFor(sample.answer, TYPE) + 4;
  const followUp = send + 32;
  return {
    iris: 0,
    irisFrames: 16,
    letter: 12,
    travel: 18,
    travelFrames: 20,
    header: 24,
    caption1: 30,
    thinking: 40,
    question,
    questionEnd: question + framesFor(sample.question, STREAM),
    typing,
    send,
    thinking2: send + 8,
    progress: followUp - 8,
    caption2: followUp - 4,
    followUp,
    followUpEnd: followUp + framesFor(sample.followUp, STREAM),
    exit: 268,
  };
}

export type Beats = ReturnType<typeof part3Beats>;

export const PART4_FRAMES = 270;


/** Part 4's beats, in frames at 30 fps. */
export const p4 = {
  summary: 6,
  caption: 10,
  cards: [40, 150],
  /** Inside a card, from its start: the columns, each point, the model answer. */
  columns: 16,
  points: 26,
  pointGap: 6,
  model: 56,
  collapse: 212,
  file: 222,
  dark: 238,
  darkFrames: 24,
};

export const PART5_FRAMES = 450;


/** Part 5's beats, in frames at 30 fps (120 BPM: a beat every 15 frames). */
export const p5 = {
  title: 4,
  titleUp: 30,
  cards: 40,
  pick: [86, 150, 162, 180],
  byok: 84,
  key: 100,
  test: 128,
  connected: 136,
  ollamaLine: 190,
  ollama: 188,
  implode: 244,
  implodeFrames: 16,
  pill: 256,
  noAccount: 250,
  terminal: 290,
  terminalFrames: 16,
  typing: 312,
  enter: 338,
  knock: 342,
  mark: 350,
  name: 356,
  tagline: 378,
  footer: 396,
  license: 408,
  out: 436,
};
