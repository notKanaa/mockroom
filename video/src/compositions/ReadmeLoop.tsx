// A 10-second loop for the README: the whole flow in the app window, with no
// captions, ending exactly where it starts so a GIF or a looping video never jumps.

import { useState } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AppWindow, WINDOW_BAR } from "../components/AppWindow";
import { Cursor } from "../components/Cursor";
import { UiViewport, centre, frameOn, type Anchors, type Camera } from "../components/UiViewport";
import { locales, type Locale } from "../content/locales";
import { breathe, easeInOut, easeOut, framesFor, keyframes, progress, streamed } from "../lib/motion";
import { stage } from "../theme/tokens";
import { DebriefScreen, HomeScreen, RoomScreen, SetupScreen, type ChatMessage } from "../ui/Screens";

export const LOOP_SIZE = { width: 1280, height: 800 };
export const LOOP_FRAMES = 300;

const WINDOW = { left: 40, top: 32, width: 1200, height: 736 };
const SCALE = 1.3;
const W = Math.round(WINDOW.width / SCALE);
const H = Math.round((WINDOW.height - WINDOW_BAR) / SCALE);

const beats = {
  click: 8,
  paste: 16,
  send: 36,
  setup: 66,
  technologies: [76, 82, 88],
  pack: 100,
  room: 126,
  question: 132,
  answer: 168,
  followUp: 182,
  debrief: 232,
  fade: 284,
};

export interface LoopProps extends Record<string, unknown> {
  locale: Locale;
}

export function ReadmeLoop({ locale }: LoopProps) {
  const frame = useCurrentFrame();
  const content = locales[locale];
  const fade = progress(frame, beats.fade, LOOP_FRAMES - beats.fade, easeInOut);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, #ffffff 0%, ${stage.paper} 50%, #e6eaee 100%)` }}>
      <div style={{ position: "absolute", ...WINDOW }}>
        <AppWindow u={1}>
          <div style={{ position: "relative", width: W * SCALE, height: H * SCALE }}>
            <LoopScreens frame={frame} content={content} />
            {/* The loop's last frames fade back to its first. */}
            {fade > 0 && (
              <div style={{ position: "absolute", inset: 0, opacity: fade }}>
                <LoopScreens frame={0} content={content} />
              </div>
            )}
          </div>
        </AppWindow>
      </div>
    </AbsoluteFill>
  );
}

function LoopScreens({ frame, content }: { frame: number; content: (typeof locales)[Locale] }) {
  const [anchors, setAnchors] = useState<Anchors>({});
  const { sample } = content;
  const mid = { x: W / 2, y: H / 2 };
  const b = beats;
  const screen = frame < b.setup ? "home" : frame < b.room ? "setup" : frame < b.debrief ? "room" : "debrief";
  const pressAt = (at: number) => Math.max(0, 1 - Math.abs(frame - at - 2) / 4);
  const enter = (at: number, count: number) =>
    Array.from({ length: count }, (_, index) => progress(frame, at + index * 3, 12, easeOut));

  const prompt = centre(anchors, "prompt", mid);
  const send = centre(anchors, "send", mid);
  const view = { width: W, height: H };
  const onPrompt = frameOn(anchors, "prompt", view, { max: 1.4, margin: 16 });
  const onDetection = frameOn(anchors, "detection-card", view, { max: 1.4, margin: 16 });
  const onSummary = frameOn(anchors, "summary", view, { max: 1.4, margin: 20 });

  let camera: Camera = { x: W / 2, y: H / 2, s: 1 };
  let body = null;
  if (screen === "home") {
    camera = keyframes(frame, [
      { f: 2, v: { ...mid, s: 1 } },
      { f: 18, v: onPrompt },
      { f: 44, v: onPrompt },
      { f: b.setup, v: { ...mid, s: 1 } },
    ]);
    const pasted = frame >= b.paste;
    body = (
      <HomeScreen
        content={content}
        state={{
          enter: [1, 1, 1, 1],
          text: pasted ? sample.jobOffer : "",
          focused: frame >= b.click,
          caret: frame >= b.click && frame < b.send && breathe(frame, 22) < 0.6,
          pasteFlash: pasted ? 1 - progress(frame, b.paste + 4, 16) : 0,
          detecting: frame >= b.send + 3,
          shimmer: frame / 40,
          pressSend: pressAt(b.send),
        }}
      />
    );
  } else if (screen === "setup") {
    camera = keyframes(frame, [
      { f: b.setup + 6, v: { ...mid, s: 1 } },
      { f: b.setup + 22, v: onDetection },
      { f: b.room - 4, v: { ...onDetection, s: onDetection.s * 1.03 } },
    ]);
    body = (
      <SetupScreen
        content={content}
        state={{
          enter: enter(b.setup, 4) as [number, number, number, number],
          technologies: b.technologies.map((at) => progress(frame, at, 8, easeOut)),
          pack: progress(frame, b.pack, 8, easeOut),
          pressStart: 0,
          scrollY: 0,
        }}
      />
    );
  } else if (screen === "room") {
    const asking = frame < b.question;
    const questionEnd = b.question + framesFor(sample.question, 3);
    const messages: ChatMessage[] = [
      {
        role: "interviewer",
        text: asking ? "" : streamed(sample.question, frame, b.question, 3),
        waiting: asking,
        streaming: !asking && frame < questionEnd,
        appear: progress(frame, b.room + 2, 8, easeOut),
        anchor: "question",
      },
      { role: "candidate", text: sample.answer, appear: progress(frame, b.answer, 10, easeOut), anchor: "answer" },
      {
        role: "interviewer",
        text: frame < b.followUp ? "" : streamed(sample.followUp, frame, b.followUp, 3),
        followUp: frame >= b.followUp,
        waiting: frame < b.followUp,
        streaming: frame >= b.followUp && frame < b.followUp + framesFor(sample.followUp, 3),
        appear: progress(frame, b.answer + 8, 8, easeOut),
        anchor: "follow-up",
      },
    ];
    const scrollArea = anchors["scroll-area"];
    const last = messages.filter((message) => message.appear > 0).at(-1)?.anchor;
    const lastRect = last ? anchors[last] : undefined;
    const scrollY = scrollArea && lastRect ? Math.max(0, lastRect.y + lastRect.h - (scrollArea.y + scrollArea.h - 24)) : 0;
    const onQuestion = frameOn(anchors, "question", view, { max: 1.35, margin: 20, dy: scrollY });
    const onFollowUp = frameOn(anchors, "follow-up", view, { max: 1.35, margin: 20, dy: scrollY });
    camera = keyframes(frame, [
      { f: b.room + 4, v: { ...mid, s: 1 } },
      { f: b.question + 8, v: onQuestion },
      { f: b.answer, v: { ...mid, s: 1 } },
      { f: b.followUp + 10, v: onFollowUp },
      { f: b.debrief, v: onFollowUp },
    ]);
    body = (
      <RoomScreen
        content={content}
        state={{
          enter: enter(b.room, 3) as [number, number, number],
          messages,
          progressText:
            frame < b.followUp
              ? content.ui.room.progress(1, 5)
              : `${content.ui.room.progress(1, 5)} · ${content.ui.room.followUpProgress(1)}`,
          progressAppear: frame < b.followUp ? 1 : progress(frame, b.followUp, 10, easeOut),
          draft: "",
          composerFocused: false,
          caret: false,
          thinking: frame < questionEnd || (frame >= b.answer + 4 && frame < b.followUp + framesFor(sample.followUp, 3)),
          ring: breathe(frame, 40),
          shimmer: frame / 60,
          streamCaret: breathe(frame, 30),
          scrollY,
          pressSend: 0,
        }}
      />
    );
  } else {
    camera = keyframes(frame, [
      { f: b.debrief + 8, v: { ...mid, s: 1 } },
      { f: b.debrief + 30, v: onSummary },
      { f: b.fade, v: { ...onSummary, s: onSummary.s * 1.03 } },
    ]);
    body = (
      <DebriefScreen
        content={content}
        state={{ enter: [0, 1, 2, 3].map((index) => progress(frame, b.debrief + index * 5, 14, easeOut)), scrollY: 0 }}
      />
    );
  }

  return (
    <UiViewport width={W} height={H} scale={SCALE} camera={camera} onAnchors={setAnchors}>
      {body}
      {screen === "home" && (
        <Cursor
          frame={frame}
          zoom={camera.s}
          show={[frame === 0 ? -10 : 0, b.setup - 4]}
          stops={[
            { f: 0, x: prompt.x + 140, y: prompt.y + 80 },
            { f: b.click, x: prompt.x + 60, y: prompt.y - 10, click: true },
            { f: b.send, x: send.x, y: send.y, click: true },
          ]}
        />
      )}
    </UiViewport>
  );
}
