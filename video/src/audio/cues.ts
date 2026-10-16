// Where the sound goes. The film is rendered silent for now: each cue names the
// file it expects in public/audio/ and describes the sound, as a prompt for
// ElevenLabs (sound effects, music, voice-over). Drop a file at that path and the
// next preview or render plays it at the cue (see AudioTrack). `npm run cues`
// writes this list, with times in seconds, to audio-cues.json.

import { locales, type Locale } from "../content/locales";
import {
  answerBeats,
  ctaBeats,
  debriefBeats,
  FPS,
  interviewBeats,
  offerBeats,
  privacyBeats,
  problemBeats,
  scenes,
  sceneStart,
  type SceneId,
} from "../timeline";

export type CueKind = "sfx" | "music" | "voiceover";

export interface Cue {
  id: string;
  kind: CueKind;
  scene: SceneId;
  /** Frame inside the scene. */
  at: number;
  /** How long the sound should last, in frames; for music and voice-over, the section's length. */
  length?: number;
  /** Where to put the file, in public/. */
  file: string;
  volume: number;
  /** What it should sound like: the prompt to give ElevenLabs. For voice-over, the line to say. */
  description: string;
}

export interface ResolvedCue extends Cue {
  /** Frame in the whole film. */
  frame: number;
  seconds: number;
  lengthSeconds?: number;
}

const sfx = (id: string, scene: SceneId, at: number, description: string, volume = 0.8, length = 30): Cue => ({
  id,
  kind: "sfx",
  scene,
  at,
  length,
  file: `audio/sfx/${id}.mp3`,
  volume,
  description,
});

/** The cues of the full film, in the given language (the interview's beats follow its texts). */
export function promoCues(locale: Locale): Cue[] {
  const { sample, film } = locales[locale];
  const interview = interviewBeats(sample.question, sample.answer, sample.followUp);
  const p = problemBeats;
  const a = answerBeats;
  const o = offerBeats;
  const d = debriefBeats;
  const v = privacyBeats;
  const c = ctaBeats;
  const sceneLength = (id: SceneId) => scenes.find((scene) => scene.id === id)!.duration;

  return [
    // Music: three sections, one track or three stems.
    {
      id: "music-tension",
      kind: "music",
      scene: "problem",
      at: 0,
      length: sceneLength("problem"),
      file: "audio/music/tension.mp3",
      volume: 0.5,
      description:
        "7 s, sparse and tense: a low pulsing synth, a heartbeat-like kick quickening, no melody. Ends on a held breath (cut to silence).",
    },
    {
      id: "music-main",
      kind: "music",
      scene: "answer",
      at: 0,
      length: sceneLength("answer") + sceneLength("offer") + sceneLength("interview") + sceneLength("debrief"),
      file: "audio/music/main.mp3",
      volume: 0.45,
      description:
        "About 32 s, warm and confident minimal electronic, 110 BPM: soft plucks, light percussion, a clear lift on the first beat. Leaves room for interface sounds.",
    },
    {
      id: "music-outro",
      kind: "music",
      scene: "privacy",
      at: 0,
      length: sceneLength("privacy") + sceneLength("cta"),
      file: "audio/music/outro.mp3",
      volume: 0.45,
      description:
        "14 s, calm and resolved: the main theme stripped back to pads and a few plucks, ending on a clean final chord with a short tail.",
    },

    // Beat 1: the problem.
    sfx("problem-ring", "problem", p.ringIn, "a soft low sub-bass thump, like a single nervous heartbeat", 0.6),
    sfx("problem-words", "problem", p.line2, "a short tight whoosh, words sliding up", 0.5, 15),
    sfx("problem-price", "problem", p.costIn, "a quick mechanical counter ticking up, slot-machine digits, 1 second", 0.5, 32),
    sfx("problem-strike", "problem", p.strike, "a fast marker stroke across paper, crisp", 0.7, 15),

    // Beat 2: Mockroom's answer.
    sfx("answer-dock", "answer", a.dock, "two soft rubber discs meeting: a warm, round click with a tiny bounce", 0.8, 12),
    sfx("answer-flood", "answer", a.flood, "a big airy whoosh rising into a bright opening swell, 1 second", 0.8),
    sfx("answer-name", "answer", a.name, "a clean, light logo sting: a single bright pluck with a short shimmer", 0.6, 40),
    ...film.answer.claims.map((_, index) =>
      sfx(`answer-claim-${index + 1}`, "answer", a.claims + index * a.claimFrames, "a tiny tick, like a well-made UI toggle", 0.4, 8),
    ),

    // Beat 3: the job offer.
    sfx("offer-window", "offer", o.windowIn, "a soft, low whoosh of a window sliding up into place", 0.5, 24),
    sfx("offer-click-box", "offer", o.click, "a quiet trackpad click", 0.6, 6),
    sfx("offer-paste", "offer", o.paste, "a short paper swipe, a pasted block of text landing", 0.5, 12),
    sfx("offer-click-send", "offer", o.send, "a quiet trackpad click", 0.6, 6),
    sfx("offer-reading", "offer", o.send + 4, "a soft digital shimmer, a scanner reading, 1.5 seconds, very subtle", 0.3, 45),
    sfx("offer-whoosh", "offer", o.setup, "a short clean whoosh, screen transition", 0.5, 12),
    ...o.technologies.map((at, index) =>
      sfx(`offer-chip-${index + 1}`, "offer", at, "a tiny glassy pop, a chip appearing", 0.45, 8),
    ),
    sfx("offer-pack", "offer", o.pack, "a soft confirming pop, slightly lower", 0.5, 10),
    sfx("offer-click-start", "offer", o.start, "a quiet trackpad click", 0.6, 6),

    // Beat 4: the interview.
    sfx("interview-whoosh", "interview", 0, "a short clean whoosh, screen transition", 0.5, 12),
    sfx("interview-typing", "interview", interview.typing + 4, "soft laptop keyboard typing, fast and steady", 0.45, interview.send - interview.typing - 4),
    sfx("interview-send", "interview", interview.send, "a soft message-sent swoosh, short", 0.6, 12),
    sfx("interview-follow-up", "interview", interview.followUp, "a gentle two-note notification, curious, rising", 0.5, 20),

    // Beat 5: the debrief.
    sfx("debrief-chime", "debrief", d.summary, "a warm success chime: three bright ascending notes, soft mallet, short reverb", 0.7, 45),
    ...d.cards.map((at, index) => sfx(`debrief-card-${index + 1}`, "debrief", at, "a soft paper card sliding into place", 0.4, 12)),
    sfx("debrief-scroll", "debrief", d.toFirstCard, "a smooth short scroll whoosh", 0.3, 20),
    sfx("debrief-out", "debrief", d.out, "a medium whoosh falling into darkness", 0.6, 20),

    // Beat 6: privacy.
    sfx("privacy-ring", "privacy", v.ring, "a soft circular swoosh drawing a circle, 1 second", 0.5),
    sfx("privacy-key", "privacy", v.keyLine, "a light digital trace, a signal sent along a wire", 0.4, 18),
    sfx("privacy-ollama", "privacy", v.ollamaIn, "a soft magnetic snap, something settling into place", 0.6, 12),

    // Beat 7: the call to action.
    sfx("cta-dock", "cta", c.dock, "two soft rubber discs meeting: a warm, round click with a tiny bounce", 0.7, 12),
    sfx("cta-typing", "cta", c.typing, "a few crisp mechanical keyboard keystrokes", 0.5, c.enter - c.typing),
    sfx("cta-enter", "cta", c.enter, "a satisfying return key press", 0.6, 8),

    // Voice-over: optional, one line per beat. Leave the files out for a music-only cut.
    ...voiceOver(locale).map(
      ([scene, at, line], index): Cue => ({
        id: `voiceover-${index + 1}`,
        kind: "voiceover",
        scene,
        at,
        file: `audio/voiceover/${locale}/${index + 1}.mp3`,
        volume: 1,
        description: line,
      }),
    ),
  ];
}

/** The optional voice-over: calm, close, a peer rather than an announcer. */
function voiceOver(locale: Locale): [SceneId, number, string][] {
  const fr = locale === "fr";
  return [
    ["problem", 10, fr ? "Les entretiens techniques, c'est stressant. Et s'entraîner avec un coach coûte cher." : "Technical interviews are stressful. And practising with a coach isn't cheap."],
    ["answer", 54, fr ? "Mockroom, c'est un simulateur d'entretien gratuit et open source, qui tourne sur ta machine." : "Mockroom is a free, open-source interview simulator that runs on your machine."],
    ["offer", 20, fr ? "Colle une offre d'emploi : il repère les technos demandées." : "Paste a job offer, and it picks out the tech the role needs."],
    ["interview", 20, fr ? "Un recruteur IA te pose les questions, et creuse quand ta réponse est floue." : "An AI recruiter asks the questions, and digs deeper when your answer is vague."],
    ["debrief", 14, fr ? "À la fin, un bilan précis : ce qui allait, et quoi réviser." : "Then you get a clear debrief: what went well, and what to review."],
    ["privacy", 10, fr ? "Ta clé, ta machine. Ou gratuit et hors ligne avec Ollama." : "Your key, your machine. Or free and offline, with Ollama."],
    ["cta", 50, fr ? "npx mockroom. C'est open source." : "npx mockroom. It's open source."],
  ];
}

/** Places cues on the film's own timeline. */
export function resolveCues(cues: Cue[]): ResolvedCue[] {
  return cues
    .map((cue) => {
      const frame = sceneStart(cue.scene) + cue.at;
      return {
        ...cue,
        frame,
        seconds: Math.round((frame / FPS) * 1000) / 1000,
        ...(cue.length !== undefined && { lengthSeconds: Math.round((cue.length / FPS) * 1000) / 1000 }),
      };
    })
    .sort((left, right) => left.frame - right.frame);
}
