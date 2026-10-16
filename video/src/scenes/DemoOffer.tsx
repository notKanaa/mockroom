// Beat 3, the demo starts: a job offer pasted on the home screen, read by the AI,
// and the technologies it found on the review screen.

import { useState } from "react";
import { useCurrentFrame } from "remotion";
import { Cursor } from "../components/Cursor";
import { DemoStage, demoLayout } from "../components/DemoStage";
import { Caption } from "../components/Kinetic";
import { UiViewport, centre, frameOn, type Anchors, type Camera } from "../components/UiViewport";
import { useFilm } from "../lib/film";
import { breathe, easeOut, keyframes, progress } from "../lib/motion";
import { stage } from "../theme/tokens";
import { HomeScreen, SetupScreen } from "../ui/Screens";
import { offerBeats } from "../timeline";

const b = offerBeats;

export function DemoOffer() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const layout = demoLayout(film);
  const { width: W, height: H, scale } = layout.ui;
  const [home, setHome] = useState<Anchors>({});
  const [setup, setSetup] = useState<Anchors>({});
  const onSetup = frame >= b.setup;
  const mid = { x: W / 2, y: H / 2 };

  const view = { width: W, height: H };
  const prompt = centre(home, "prompt", mid);
  const send = centre(home, "send", mid);
  const start = centre(setup, "start", { x: W / 2, y: H - 40 });
  const onPrompt = frameOn(home, "prompt", view, { max: 1.5, margin: 16 });
  const onDetection = frameOn(setup, "detection-card", view, { max: 1.5, margin: 16 });
  const onPacks = frameOn(setup, "packs-card", view, { max: 1.5, margin: 16 });
  const onSummary = frameOn(setup, "summary", view, { max: 1.5, margin: 16 });

  const camera: Camera = keyframes(frame, [
    { f: 26, v: { x: W / 2, y: H / 2, s: 1 } },
    { f: 58, v: onPrompt },
    { f: 98, v: onPrompt },
    { f: 126, v: { x: W / 2, y: H / 2, s: 1.04 } },
    { f: b.setup, v: { x: W / 2, y: H / 2, s: 1 } },
    { f: 154, v: { x: W / 2, y: H / 2, s: 1 } },
    { f: 178, v: onDetection },
    { f: 196, v: onDetection },
    { f: 214, v: onPacks },
    { f: 232, v: onSummary },
    { f: b.duration, v: { ...onSummary, s: onSummary.s * 0.96 } },
  ]);

  const enter = (at: number, step: number, count: number) =>
    Array.from({ length: count }, (_, index) => progress(frame, at + index * step, 14, easeOut));

  const pressAt = (at: number) => Math.max(0, 1 - Math.abs(frame - at - 2) / 4);

  const caption = (
    <>
      {frame < b.setup + 4 && (
        <Caption text={film.film.demo.paste} frame={frame} start={8} exit={b.setup - 8} u={film.u} color={stage.paperText} size={layout.caption.size} />
      )}
      {frame >= b.setup && (
        <Caption text={film.film.demo.reads} frame={frame} start={b.setup + 6} u={film.u} color={stage.paperText} size={layout.caption.size} />
      )}
    </>
  );

  const pasted = frame >= b.paste;
  return (
    <DemoStage film={film} windowIn={progress(frame, b.windowIn, 26, easeOut)} caption={caption}>
      <UiViewport
        width={W}
        height={H}
        scale={scale}
        camera={camera}
        onAnchors={onSetup ? setSetup : setHome}
      >
        {!onSetup ? (
          <HomeScreen
            content={film}
            state={{
              enter: [0, 1, 2, 3].map((index) => progress(frame, 6 + index * 3, 16, easeOut)) as [number, number, number, number],
              text: pasted ? film.sample.jobOffer : "",
              focused: frame >= b.click && frame < b.send + 4,
              caret: frame >= b.click && frame < b.send && breathe(frame, 22) < 0.6,
              pasteFlash: pasted ? 1 - progress(frame, b.paste + 6, 22) : 0,
              detecting: frame >= b.send + 4,
              shimmer: (frame - b.send) / 50,
              pressSend: pressAt(b.send),
            }}
          />
        ) : (
          <SetupScreen
            content={film}
            state={{
              enter: enter(b.setup, 4, 4) as [number, number, number, number],
              technologies: b.technologies.map((at) => progress(frame, at, 10, easeOut)),
              pack: progress(frame, b.pack, 10, easeOut),
              pressStart: pressAt(b.start),
              scrollY: 0,
            }}
          />
        )}
        <Cursor
          frame={frame}
          zoom={camera.s}
          show={onSetup ? [208, b.duration + 10] : [24, b.setup - 6]}
          stops={
            onSetup
              ? [
                  { f: 208, x: start.x + 160, y: start.y - 120 },
                  { f: b.start, x: start.x, y: start.y, click: true },
                ]
              : [
                  { f: 24, x: W * 0.72, y: H * 0.86 },
                  { f: b.click, x: prompt.x + 60, y: prompt.y - 10, click: true },
                  { f: 70, x: prompt.x + 80, y: prompt.y + 10 },
                  { f: b.send, x: send.x, y: send.y, click: true },
                ]
          }
        />
      </UiViewport>
    </DemoStage>
  );
}
