// The film's timing, in frames at 30 fps: every scene's length and the beats
// inside it. The scenes animate on these beats, and the audio cues (audio/cues.ts)
// hit on them, so moving a beat here moves its sound too.

import { framesFor } from "./lib/motion";

export const FPS = 30;

export const problemBeats = {
  ringIn: 0,
  line1: 8,
  line2: 22,
  linesOut: 76,
  costIn: 88,
  count: 100,
  countFrames: 30,
  note: 132,
  strike: 158,
  out: 188,
  duration: 210,
};

export const answerBeats = {
  dock: 22,
  flood: 32,
  paper: 42,
  name: 52,
  claims: 86,
  claimFrames: 20,
  out: 166,
  duration: 180,
};

export const offerBeats = {
  windowIn: 0,
  click: 44,
  paste: 62,
  send: 92,
  setup: 140,
  technologies: [164, 172, 180],
  pack: 198,
  start: 242,
  duration: 270,
};

export const debriefBeats = {
  header: 0,
  summary: 10,
  cards: [22, 30],
  toFirstCard: 64,
  toSecondCard: 128,
  out: 192,
  duration: 210,
};

export const privacyBeats = {
  ring: 0,
  lines: [10, 32, 56],
  inside: [40, 50],
  providers: 84,
  keyLine: 96,
  ollama: 128,
  ollamaIn: 142,
  out: 194,
  duration: 210,
};

export const ctaBeats = {
  mark: 0,
  dock: 18,
  tagline: 16,
  command: 48,
  typing: 56,
  enter: 84,
  url: 98,
  license: 110,
  out: 194,
  duration: 210,
};

/** Characters a frame: the recruiter's text streaming in, and the candidate typing. */
export const STREAM = 2.4;
export const TYPE = 2.6;

/** Long enough for the French texts, the longest. */
export const INTERVIEW_FRAMES = 285;

/** The interview's beats follow the length of its texts. */
export function interviewBeats(question: string, answer: string, followUp: string) {
  const question0 = 34;
  const typing = framesFor(question, STREAM) + question0 + 18;
  const send = typing + framesFor(answer, TYPE) + 8;
  const followUp0 = send + 34;
  return {
    enter: 0,
    thinking: 12,
    question: question0,
    typing,
    send,
    followUp: followUp0,
    followUpEnd: followUp0 + framesFor(followUp, STREAM),
    duration: INTERVIEW_FRAMES,
  };
}

/** The film, scene by scene. */
export const scenes = [
  { id: "problem", duration: problemBeats.duration },
  { id: "answer", duration: answerBeats.duration },
  { id: "offer", duration: offerBeats.duration },
  { id: "interview", duration: INTERVIEW_FRAMES },
  { id: "debrief", duration: debriefBeats.duration },
  { id: "privacy", duration: privacyBeats.duration },
  { id: "cta", duration: ctaBeats.duration },
] as const;

export type SceneId = (typeof scenes)[number]["id"];

/** The frame where each scene starts in the full film. */
export function sceneStart(id: SceneId): number {
  let start = 0;
  for (const scene of scenes) {
    if (scene.id === id) return start;
    start += scene.duration;
  }
  throw new Error(`Unknown scene ${id}`);
}

export const PROMO_FRAMES = scenes.reduce((total, scene) => total + scene.duration, 0);
