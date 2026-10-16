// Beat 5, the debrief: the recruiter's notes, then the feedback on each question, card by card.

import { useState } from "react";
import { useCurrentFrame } from "remotion";
import { DemoStage, demoLayout } from "../components/DemoStage";
import { Caption } from "../components/Kinetic";
import { UiViewport, frameOn, type Anchors, type Camera } from "../components/UiViewport";
import { useFilm } from "../lib/film";
import { easeIn, easeInOut, easeOut, keyframes, progress } from "../lib/motion";
import { stage } from "../theme/tokens";
import { DebriefScreen } from "../ui/Screens";
import { debriefBeats } from "../timeline";

const b = debriefBeats;

export function DemoDebrief() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const layout = demoLayout(film);
  const { width: W, height: H, scale } = layout.ui;
  const [anchors, setAnchors] = useState<Anchors>({});

  // The page scrolls to each card's two columns, which the camera then frames.
  const top = (name: string) => Math.max(0, (anchors[name]?.y ?? 0) - 24);
  const { scrollY } = keyframes(
    frame,
    [
      { f: b.toFirstCard, v: { scrollY: 0 } },
      { f: b.toFirstCard + 30, v: { scrollY: top("card-0") } },
      { f: b.toSecondCard, v: { scrollY: top("card-0") } },
      { f: b.toSecondCard + 30, v: { scrollY: top("card-1") } },
    ],
    easeInOut,
  );
  const view = { width: W, height: H };
  const onSummary = frameOn(anchors, "summary", view, { max: 1.4, margin: 20 });
  const onFirst = frameOn(anchors, "columns-0", view, { max: 1.4, margin: 20, dy: scrollY });
  const onSecond = frameOn(anchors, "columns-1", view, { max: 1.4, margin: 20, dy: scrollY });

  const camera: Camera = keyframes(frame, [
    { f: 20, v: { x: W / 2, y: H / 2, s: 1 } },
    { f: 46, v: onSummary },
    { f: b.toFirstCard, v: onSummary },
    { f: b.toFirstCard + 34, v: onFirst },
    { f: b.toSecondCard, v: onFirst },
    { f: b.toSecondCard + 34, v: onSecond },
    { f: b.out, v: { ...onSecond, s: onSecond.s * 0.95 } },
  ]);

  return (
    <DemoStage
      film={film}
      windowOut={progress(frame, b.out, 18, easeIn)}
      caption={
        <Caption text={film.film.demo.debrief} frame={frame} start={6} exit={b.out - 4} u={film.u} color={stage.paperText} size={layout.caption.size} />
      }
    >
      <UiViewport width={W} height={H} scale={scale} camera={camera} onAnchors={setAnchors}>
        <DebriefScreen
          content={film}
          state={{
            enter: [b.header, b.summary, ...b.cards].map((at) => progress(frame, at, 18, easeOut)),
            scrollY,
          }}
        />
      </UiViewport>
    </DemoStage>
  );
}
