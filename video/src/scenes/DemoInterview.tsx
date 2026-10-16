// Beat 4, the interview: the recruiter asks a question from the Symfony pack, the
// candidate answers, and the recruiter digs deeper with a follow-up.

import { useState } from "react";
import { useCurrentFrame } from "remotion";
import { DemoStage, demoLayout } from "../components/DemoStage";
import { Caption } from "../components/Kinetic";
import { UiViewport, frameOn, type Anchors, type Camera } from "../components/UiViewport";
import { useFilm } from "../lib/film";
import { breathe, easeOut, framesFor, keyframes, progress, streamed, typed } from "../lib/motion";
import { stage } from "../theme/tokens";
import { STREAM, TYPE, interviewBeats } from "../timeline";
import { RoomScreen, type ChatMessage } from "../ui/Screens";

export function DemoInterview() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { sample, ui } = film;
  const layout = demoLayout(film);
  const { width: W, height: H, scale } = layout.ui;
  const [anchors, setAnchors] = useState<Anchors>({});
  const b = interviewBeats(sample.question, sample.answer, sample.followUp);

  // The conversation, as it stands at this frame.
  const messages: ChatMessage[] = [];
  const asking = frame < b.question;
  messages.push({
    role: "interviewer",
    text: asking ? "" : streamed(sample.question, frame, b.question, STREAM),
    waiting: asking,
    streaming: !asking && frame < b.question + framesFor(sample.question, STREAM),
    appear: progress(frame, b.thinking, 10, easeOut),
    anchor: "question",
  });
  messages.push({ role: "candidate", text: sample.answer, appear: progress(frame, b.send + 2, 10, easeOut), anchor: "answer" });
  const thinkingAgain = frame < b.followUp;
  messages.push({
    role: "interviewer",
    text: thinkingAgain ? "" : streamed(sample.followUp, frame, b.followUp, STREAM),
    followUp: !thinkingAgain,
    waiting: thinkingAgain,
    streaming: !thinkingAgain && frame < b.followUpEnd,
    appear: progress(frame, b.send + 14, 10, easeOut),
    anchor: "follow-up",
  });

  // The conversation follows its last line, like the app's auto-scroll.
  const scrollArea = anchors["scroll-area"];
  const visible = messages.filter((message) => message.appear > 0);
  const last = visible.at(-1)?.anchor;
  const lastRect = last ? anchors[last] : undefined;
  const scrollY =
    scrollArea && lastRect ? Math.max(0, lastRect.y + lastRect.h - (scrollArea.y + scrollArea.h - 32)) : 0;

  const view = { width: W, height: H };
  const onQuestion = frameOn(anchors, "question", view, { max: 1.4, margin: 20, dy: scrollY });
  const onComposer = frameOn(anchors, "composer", view, { max: 1.4, margin: 16 });
  const onProgress = frameOn(anchors, "progress", view, { max: 1.6, margin: 140 });
  const onFollowUp = frameOn(anchors, "follow-up", view, { max: 1.4, margin: 20, dy: scrollY });

  const camera: Camera = keyframes(frame, [
    { f: 14, v: { x: W / 2, y: H / 2, s: 1 } },
    { f: 44, v: onQuestion },
    { f: b.typing - 10, v: onQuestion },
    { f: b.typing + 12, v: onComposer },
    { f: b.send, v: onComposer },
    { f: b.send + 22, v: { x: W / 2, y: H / 2, s: 1 } },
    { f: b.followUp - 6, v: onProgress },
    { f: b.followUp + 18, v: onProgress },
    { f: b.followUp + 40, v: onFollowUp },
    { f: b.duration - 26, v: onFollowUp },
    { f: b.duration, v: { x: W / 2, y: H / 2, s: 1 } },
  ]);

  const progressText =
    frame < b.followUp - 4
      ? ui.room.progress(1, 5)
      : `${ui.room.progress(1, 5)} · ${ui.room.followUpProgress(1)}`;
  const thinking = frame < b.question + framesFor(sample.question, STREAM) || (frame >= b.send + 6 && frame < b.followUpEnd);
  const composing = frame >= b.typing && frame < b.send;

  const caption = (
    <>
      {frame < b.send + 24 && (
        <Caption text={film.film.demo.interviews} frame={frame} start={4} exit={b.send + 10} u={film.u} color={stage.paperText} size={layout.caption.size} />
      )}
      {frame >= b.send + 20 && (
        <Caption text={film.film.demo.digs} frame={frame} start={b.send + 24} u={film.u} color={stage.paperText} size={layout.caption.size} />
      )}
    </>
  );

  return (
    <DemoStage film={film} caption={caption}>
      <UiViewport width={W} height={H} scale={scale} camera={camera} onAnchors={setAnchors}>
        <RoomScreen
          content={film}
          state={{
            enter: [0, 1, 2].map((index) => progress(frame, 2 + index * 4, 16, easeOut)) as [number, number, number],
            messages,
            progressText,
            progressAppear: frame < b.followUp - 4 ? 1 : progress(frame, b.followUp - 4, 12, easeOut),
            draft: composing ? typed(sample.answer, frame, b.typing + 4, TYPE) : "",
            composerFocused: frame >= b.typing - 4 && frame < b.send + 2,
            caret: composing && breathe(frame, 22) < 0.6,
            thinking,
            ring: breathe(frame, 40),
            shimmer: frame / 60,
            streamCaret: breathe(frame, 30),
            scrollY,
            pressSend: Math.max(0, 1 - Math.abs(frame - b.send + 2) / 4),
          }}
        />
      </UiViewport>
    </DemoStage>
  );
}
