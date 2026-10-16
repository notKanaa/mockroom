// Part 2, from the logo to the product, on a 120 BPM grid:
//   the four promises roll past like the reels of part 1 (the price spins down to
//   $0, braces clap open on "open source", a toggle flips the language, a tiny
//   window says it runs on your machine) → that window grows into the app →
//   a job offer flies in like a sheet of paper → the AI scans it and marks the
//   technologies → the marked words lift off and land as chips on the next screen.

import { CameraMotionBlur } from "@remotion/motion-blur";
import { noise2D } from "@remotion/noise";
import { useState, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { AppWindow, WINDOW_BAR } from "../components/AppWindow";
import { Cursor } from "../components/Cursor";
import { UiViewport, centre, clampCamera, frameOn, type Anchors, type Camera } from "../components/UiViewport";
import { FilmProvider, useFilm, type Film, type FilmProps } from "../lib/film";
import { breathe, easeIn, easeInOut, easeOut, keyframes, mix, progress } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { HomeScreen, SetupScreen } from "../ui/Screens";
import { p2 } from "./beats";
import { At, Grain, impulse, Letters, Shockwave, useSpring, Vignette } from "./fx";
import { part2Sound, SoundTrack } from "./sound";

export function Part2Composition(props: FilmProps) {
  return (
    <FilmProvider value={props}>
      <Part2 />
      <SoundTrack cues={part2Sound} gain={1.45} />
    </FilmProvider>
  );
}

const near = (frame: number, at: number, before: number, after: number) => frame >= at - before && frame < at + after;

export function Part2() {
  const frame = useCurrentFrame();
  const fast =
    near(frame, p2.logoOut, 0, 12) ||
    [p2.free, p2.open, p2.language, p2.machine].some((at) => near(frame, at, 5, 8)) ||
    near(frame, p2.clap, 4, 3) ||
    near(frame, p2.free, 0, 20) ||
    near(frame, p2.expand, 0, 16) ||
    near(frame, p2.paper, 0, 32) ||
    near(frame, p2.swap, 0, 30) ||
    near(frame, p2.whip, 2, 10);
  return (
    <AbsoluteFill style={{ background: stage.paper }}>
      {fast ? (
        <CameraMotionBlur shutterAngle={200} samples={6}>
          <Scene />
        </CameraMotionBlur>
      ) : (
        <Scene />
      )}
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
}

function Scene() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(110% 90% at 50% 40%, #ffffff 0%, ${stage.paper} 50%, #e3e8ec 100%)` }}
    >
      {frame < p2.machine + 4 && <Claims />}
      {frame >= p2.machine - 2 && <Demo />}
      <Vignette strength={0.1} />
    </AbsoluteFill>
  );
}

// The promises.

/** A claim's ride on the conveyor: rises in with a spring on its beat, leaves upward fast before the next. */
function useConveyor() {
  const sp = useSpring();
  const frame = useCurrentFrame();
  const film = useFilm();
  return (enter: number | null, leave: number | null): CSSProperties => {
    const arrive = enter === null ? 1 : sp(frame, enter, { damping: 13, stiffness: 170 });
    const go = leave === null ? 0 : progress(frame, leave, 9, easeIn);
    return {
      transform: `translateY(${(1 - arrive) * 220 * film.u - go * 320 * film.u}px)`,
      opacity: Math.min(1, arrive * 2) * (1 - go),
    };
  };
}

function Claims() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height } = film;
  const ride = useConveyor();
  const cx = width / 2;
  const cy = height / 2;
  return (
    <AbsoluteFill>
      {frame < p2.free + 2 && (
        <At x={cx} y={cy}>
          <div style={ride(null, p2.logoOut)}>
            <Lockup />
          </div>
        </At>
      )}
      {frame >= p2.free - 2 && frame < p2.open + 2 && (
        <At x={cx} y={cy}>
          <div style={ride(p2.free, p2.open - 3)}>
            <Free />
          </div>
        </At>
      )}
      {frame >= p2.open - 2 && frame < p2.language + 2 && (
        <At x={cx} y={cy}>
          <div style={ride(p2.open, p2.language - 3)}>
            <OpenSource />
          </div>
        </At>
      )}
      {frame >= p2.language - 2 && frame < p2.machine + 2 && (
        <At x={cx} y={cy}>
          <div style={ride(p2.language, p2.machine - 3)}>
            <Languages />
          </div>
        </At>
      )}
      <Shockwave frame={frame} at={p2.freeLand} x={cx - 160 * u} y={cy} from={80 * u} to={520 * u} color={stage.accentDeep} width={3 * u} />
      <Shockwave frame={frame} at={p2.clap} x={cx} y={cy} from={60 * u} to={460 * u} color={stage.accentDeep} width={3 * u} duration={14} />
    </AbsoluteFill>
  );
}

/** The logo as part 1 leaves it. */
function Lockup() {
  const film = useFilm();
  const { u } = film;
  const fit = film.portrait ? 0.55 : film.square ? 0.7 : 1;
  const size = 104 * u * fit;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 44 * u * fit, transform: "scale(1.015)" }}>
      <div style={{ position: "relative", width: size * 1.375, height: size }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: size, height: size, borderRadius: "50%", background: stage.accentDeep }} />
        <div
          style={{
            position: "absolute",
            left: size * 0.375,
            top: 0,
            width: size,
            height: size,
            borderRadius: "50%",
            border: `${(size * 2) / 16}px solid ${stage.paperText}`,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 236 * u * fit,
          letterSpacing: "-0.055em",
          lineHeight: 1,
          color: stage.paperText,
        }}
      >
        {film.film.answer.name}
      </div>
    </div>
  );
}

const display = (u: number, size: number): CSSProperties => ({
  fontFamily: fonts.display,
  fontWeight: 800,
  fontSize: size * u,
  letterSpacing: "-0.05em",
  lineHeight: 1,
  whiteSpace: "nowrap",
});

/** "$150" spins down to "$0", the price of Mockroom. */
function Free() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u } = film;
  const fit = film.portrait ? 0.62 : film.square ? 0.75 : 1;
  const copy = film.film;
  const roll = (from: number, spins: number, index: number) => {
    const travel = interpolate(frame, [p2.free + index, p2.freeLand - (2 - index) * 2], [from, from + spins * 10 + ((10 - from) % 10)], {
      easing: Easing.bezier(0.2, 0.6, 0.2, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const strip = Array.from({ length: spins * 10 + 22 }, (_, value) => value % 10);
    return (
      <span style={{ display: "inline-block", height: "1em", overflow: "hidden", verticalAlign: "top" }}>
        <span style={{ display: "flex", flexDirection: "column", transform: `translateY(${-travel}em)` }}>
          {strip.map((value, row) => (
            <span key={row} style={{ height: "1em" }}>
              {value}
            </span>
          ))}
        </span>
      </span>
    );
  };
  // The leading reels fold away as they reach 0, leaving "$0".
  const fold = progress(frame, p2.freeLand - 8, 8, easeInOut);
  const color = interpolateColors(progress(frame, p2.free + 4, p2.freeLand - p2.free - 4), [0, 1], [stage.warn, stage.accentDeep]);
  const land = sp(frame, p2.freeLand, { damping: 9, stiffness: 220 });
  const word = sp(frame, p2.freeLand + 2, { damping: 12, stiffness: 190 });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 46 * u * fit }}>
      <span
        style={{
          ...display(u, 300 * fit),
          color,
          display: "inline-flex",
          fontVariantNumeric: "tabular-nums",
          transform: `scale(${1 + (1 - land) * 0.12})`,
        }}
      >
        <span>{copy.problem.currency}</span>
        <span style={{ display: "inline-block", width: `${0.62 * (1 - fold)}em`, overflow: "hidden", opacity: 1 - fold }}>{roll(1, 2, 0)}</span>
        <span style={{ display: "inline-block", width: `${0.62 * (1 - fold)}em`, overflow: "hidden", opacity: 1 - fold }}>{roll(5, 2, 1)}</span>
        {roll(0, 3, 2)}
      </span>
      <Letters
        text={copy.answer.claims[0]!}
        style={{ ...display(u, 170 * fit), color: stage.paperText }}
        letter={(index) => {
          const pop = sp(frame, p2.freeLand + 2 + index * 1.2, { damping: 11, stiffness: 200 });
          return { transform: `translateY(${(1 - pop) * 60}%) scale(${mix(0.4, 1, pop)})`, opacity: Math.min(1, pop * 2) };
        }}
      />
    </div>
  );
}

/** Braces clap together, then spring open on "open source". */
function OpenSource() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u } = film;
  const fit = film.portrait ? 0.5 : film.square ? 0.62 : 1;
  const text = film.film.answer.claims[1]!.replace(/\.$/, "");
  const clap = progress(frame, p2.open, p2.clap - p2.open, Easing.bezier(0.6, 0, 1, 0.6));
  const open = sp(frame, p2.clap + 1, { damping: 12, stiffness: 150 });
  const gap = mix(700, 0, clap) * u * fit;
  const width = text.length * 0.52 * open;
  const tag = sp(frame, p2.mit, { damping: 9, stiffness: 220 });
  const brace = (side: -1 | 1): CSSProperties => ({
    ...display(u, 240 * fit),
    fontWeight: 400,
    color: stage.accentDeep,
    display: "inline-block",
    transform: `translateX(${side * gap}px) scaleY(${1 + impulse(frame, p2.clap, 4) * 0.15})`,
  });
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <span style={brace(-1)}>{"{"}</span>
      <span
        style={{
          ...display(u, 150 * fit),
          color: stage.paperText,
          display: "inline-flex",
          justifyContent: "center",
          width: `${width}em`,
          overflow: "hidden",
          padding: "0.1em 0",
        }}
      >
        <span style={{ flex: "none" }}>{text}</span>
      </span>
      <span style={brace(1)}>{"}"}</span>
      <span
        style={{
          position: "absolute",
          right: -40 * u * fit,
          top: -50 * u * fit,
          padding: `${8 * u * fit}px ${22 * u * fit}px`,
          borderRadius: 999,
          background: stage.accentDeep,
          color: "#ffffff",
          fontFamily: fonts.mono,
          fontWeight: 600,
          fontSize: 40 * u * fit,
          transform: `scale(${tag}) rotate(${(1 - tag) * 30 + 8}deg)`,
          opacity: Math.min(1, tag * 2),
        }}
      >
        MIT
      </span>
    </div>
  );
}

/** A language toggle: the knob slides, and the word flips like a card. */
function Languages() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u } = film;
  const fit = film.portrait ? 0.6 : film.square ? 0.72 : 1;
  // Each language by its own name: the toggle shows what you'd see in either.
  const english = film.ui.languageNames.en === "English";
  const words = english ? ["English", "Français"] : ["Français", "English"];
  const codes = english ? ["EN", "FR"] : ["FR", "EN"];
  const knob = sp(frame, p2.toggle, { damping: 14, stiffness: 220 });
  const out = progress(frame, p2.toggle, 5, easeIn);
  const back = sp(frame, p2.toggle + 4, { damping: 11, stiffness: 200 });
  const pill = { w: 300 * u * fit, h: 96 * u * fit };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 56 * u * fit }}>
      <div style={{ perspective: 900 * u, height: 190 * u * fit, display: "grid", placeItems: "center" }}>
        <div style={{ gridArea: "1 / 1", ...display(u, 190 * fit), color: stage.paperText, transform: `rotateX(${out * 90}deg)`, opacity: out < 1 ? 1 : 0 }}>
          {words[0]}
        </div>
        <div
          style={{
            gridArea: "1 / 1",
            ...display(u, 190 * fit),
            color: stage.accentDeep,
            transform: `rotateX(${(1 - back) * -90}deg)`,
            opacity: frame >= p2.toggle + 4 ? 1 : 0,
          }}
        >
          {words[1]}
        </div>
      </div>
      <div
        style={{
          position: "relative",
          width: pill.w,
          height: pill.h,
          borderRadius: 999,
          background: "#e8ebee",
          boxShadow: "inset 0 2px 6px rgb(16 24 32 / 0.12)",
          fontFamily: fonts.mono,
          fontWeight: 600,
          fontSize: 34 * u * fit,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 6 * u * fit,
            left: mix(6 * u * fit, pill.w / 2, knob),
            width: pill.w / 2 - 6 * u * fit,
            height: pill.h - 12 * u * fit,
            borderRadius: 999,
            background: stage.accentDeep,
            boxShadow: "0 4px 12px rgb(11 122 102 / 0.35)",
          }}
        />
        {codes.map((code, index) => {
          const active = index === 0 ? knob < 0.5 : knob >= 0.5;
          return (
            <div
              key={code}
              style={{
                position: "absolute",
                top: 0,
                left: index * (pill.w / 2),
                width: pill.w / 2,
                height: pill.h,
                display: "grid",
                placeItems: "center",
                color: active ? "#ffffff" : stage.paperMuted,
              }}
            >
              {code}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The product.

interface WindowLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  /** How much bigger the UI is drawn than its own pixels. */
  scale: number;
}

function windowLayout(film: Film): WindowLayout {
  const { u, width, height } = film;
  if (film.portrait) return { left: 50 * u, top: 330 * u, width: width - 100 * u, height: 1420 * u, scale: 1.3 * u };
  if (film.square) return { left: 60 * u, top: 170 * u, width: width - 120 * u, height: 850 * u, scale: 1.1 * u };
  return { left: (width - 1480 * u) / 2, top: 150 * u, width: 1480 * u, height: 860 * u, scale: 1.4 * u };
}

function Demo() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u, width, height } = film;
  const win = windowLayout(film);
  const W = Math.round(win.width / win.scale);
  const H = Math.round((win.height - WINDOW_BAR * u) / win.scale);
  const view = { width: W, height: H };
  const [anchors, setAnchors] = useState<Anchors>({});

  // The small "runs on your machine" window springs in, then grows into the app.
  const born = sp(frame, p2.machine, { damping: 12, stiffness: 170 });
  const grow = sp(frame, p2.expand, { damping: 16, stiffness: 90, mass: 0.9 });
  const small = 0.42;
  const scale = mix(small * born, 1, grow);
  const settle = progress(frame, p2.expand, 40, easeOut);
  const wobble = { x: noise2D("tiltx", frame * 0.012, 0) * 2.2, y: noise2D("tilty", 0, frame * 0.012) * 2.6 };
  const whip = progress(frame, p2.whip, 9, Easing.bezier(0.7, 0, 1, 0.5));

  const onPrompt = frameOn(anchors, "prompt", view, { max: 1.35, margin: 16 });
  const onText = frameOn(anchors, "prompt-text", view, { max: 1.55, margin: 14 });
  const onDetection = frameOn(anchors, "detection-card", view, { max: 1.4, margin: 16 });
  const onPacks = frameOn(anchors, "packs-card", view, { max: 1.45, margin: 16 });
  const onSummary = frameOn(anchors, "summary", view, { max: 1.45, margin: 16 });
  const wide = { x: W / 2, y: H / 2, s: 1 };
  const camera: Camera = keyframes(frame, [
    { f: p2.demo, v: wide },
    { f: p2.paper + 12, v: onPrompt },
    { f: p2.scan + 6, v: onPrompt },
    { f: p2.marks[0]! - 2, v: onText },
    { f: p2.swap - 2, v: onText },
    { f: p2.swap + 8, v: wide },
    { f: p2.fly[2]! + 16, v: onDetection },
    { f: p2.pack - 2, v: onDetection },
    { f: p2.pack + 10, v: onPacks },
    { f: p2.start - 8, v: onSummary },
    { f: p2.whip + 9, v: { ...onSummary, s: onSummary.s * 1.05 } },
  ]);

  const swap = progress(frame, p2.swap, 12, easeInOut);
  const pasted = frame >= p2.paste;
  const marks = p2.marks.map((at) => progress(frame, at, 9, Easing.bezier(0.5, 0, 0.2, 1)));
  const scan = frame >= p2.scan && frame < p2.swap ? ((frame - p2.scan) / 22) % 1 : undefined;
  const technologies = p2.fly.map((at) => (frame >= at + p2.flyFrames ? 1 : 0));
  const pressAt = (at: number) => Math.max(0, 1 - Math.abs(frame - at - 2) / 4);
  const enter = (at: number, count: number) => Array.from({ length: count }, (_, index) => progress(frame, at + index * 3, 14, easeOut));

  // The claim written in the small window, before it grows.
  const claimOut = progress(frame, p2.expand - 2, 10);
  const uiIn = progress(frame, p2.expand + 4, 14);

  return (
    <AbsoluteFill style={{ perspective: 2600 * u }}>
      <Label index={1} text={film.film.demo.paste} start={p2.demo + 4} end={p2.swap - 4} win={win} />
      <Label index={2} text={film.film.demo.reads} start={p2.swap + 8} end={p2.whip} win={win} />
      <div
        style={{
          position: "absolute",
          left: win.left,
          top: win.top,
          width: win.width,
          transformOrigin: "50% 50%",
          transform: `translateX(${-whip * width * 1.3}px) scale(${scale}) rotateX(${mix(18, 0, settle) + wobble.x}deg) rotateY(${mix(-14, 0, settle) + wobble.y}deg)`,
        }}
      >
        <AppWindow u={u}>
          <div style={{ position: "relative" }}>
            <div style={{ opacity: uiIn }}>
              <UiViewport width={W} height={H} scale={win.scale} camera={camera} onAnchors={setAnchors}>
                <div style={{ position: "absolute", inset: 0, opacity: 1 - swap }}>
                  <HomeScreen
                    content={film}
                    state={{
                      enter: [1, 1, 1, 1],
                      text: pasted ? film.sample.jobOffer : "",
                      focused: frame >= p2.paper + 10,
                      caret: frame >= p2.paper + 10 && frame < p2.send && breathe(frame, 22) < 0.6,
                      pasteFlash: pasted ? 1 - progress(frame, p2.paste + 4, 18) : 0,
                      detecting: frame >= p2.send + 3,
                      shimmer: frame / 40,
                      pressSend: pressAt(p2.send),
                      terms: film.sample.technologies.map((technology) => technology.name),
                      marks,
                      scan,
                    }}
                  />
                </div>
                <div style={{ position: "absolute", inset: 0, opacity: swap }}>
                  <SetupScreen
                    content={film}
                    state={{
                      enter: enter(p2.swap, 4) as [number, number, number, number],
                      technologies,
                      pack: sp(frame, p2.pack, { damping: 10, stiffness: 200 }),
                      pressStart: pressAt(p2.start),
                      scrollY: 0,
                    }}
                  />
                </div>
                <FlyingChips anchors={anchors} />
                <Cursor
                  frame={frame}
                  zoom={camera.s}
                  show={[p2.send - 14, p2.swap - 4]}
                  stops={[
                    { f: p2.send - 14, ...offset(centre(anchors, "send", wide), 90, 70) },
                    { f: p2.send, ...centre(anchors, "send", wide), click: true },
                  ]}
                />
                <Cursor
                  frame={frame}
                  zoom={camera.s}
                  show={[p2.start - 16, p2.whip + 10]}
                  stops={[
                    { f: p2.start - 16, ...offset(centre(anchors, "start", wide), 140, -60) },
                    { f: p2.start, ...centre(anchors, "start", wide), click: true },
                  ]}
                />
              </UiViewport>
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                opacity: 1 - claimOut,
                ...display(u, 112),
                color: stage.paperText,
                background: "#ffffff",
                pointerEvents: "none",
              }}
            >
              <Letters
                text={film.film.answer.claims[2]!}
                letter={(index) => {
                  const pop = sp(frame, p2.machine + 4 + index * 0.6, { damping: 12, stiffness: 200 });
                  return { transform: `translateY(${(1 - pop) * 50}%)`, opacity: Math.min(1, pop * 2) };
                }}
              />
            </div>
          </div>
        </AppWindow>
      </div>
      <PaperOffer anchors={anchors} camera={camera} win={win} view={view} />
    </AbsoluteFill>
  );
}

const offset = (point: { x: number; y: number }, dx: number, dy: number) => ({ x: point.x + dx, y: point.y + dy });

/** A step label above the window: a number and a short sentence, wiped in from the left. */
function Label({ index, text, start, end, win }: { index: number; text: string; start: number; end: number; win: WindowLayout }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u } = film;
  if (frame < start || frame > end + 10) return null;
  const wipe = progress(frame, start, 12, Easing.bezier(0.7, 0, 0.2, 1));
  const leave = progress(frame, end, 9, easeIn);
  return (
    <div
      style={{
        position: "absolute",
        left: win.left + 6 * u,
        top: win.top - 92 * u,
        display: "flex",
        alignItems: "baseline",
        gap: 20 * u,
        clipPath: `inset(-20% ${(1 - wipe) * 100}% -20% 0)`,
        transform: `translateY(${-leave * 40 * u}px)`,
        opacity: 1 - leave,
      }}
    >
      <span style={{ fontFamily: fonts.mono, fontWeight: 600, fontSize: 26 * u, color: stage.accentDeep }}>
        {String(index).padStart(2, "0")}
      </span>
      <span style={{ ...display(u, 56), fontWeight: 700, letterSpacing: "-0.035em", color: stage.paperText }}>{text}</span>
    </div>
  );
}

/** The job offer as a sheet of paper, flying into the prompt box. */
function PaperOffer({ anchors, camera, win, view }: { anchors: Anchors; camera: Camera; win: WindowLayout; view: { width: number; height: number } }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height } = film;
  if (frame < p2.paper || frame > p2.paste + 6) return null;
  // Where the prompt box is on screen, through the camera.
  const rect = anchors.prompt ?? { x: view.width / 2 - 340, y: view.height / 2 - 70, w: 680, h: 140 };
  const cam = clampCamera(camera, view.width, view.height);
  const zoom = win.scale * cam.s;
  const viewportTop = win.top + WINDOW_BAR * u;
  const target = {
    x: win.left + (rect.x + rect.w / 2 - cam.x) * zoom + (view.width * win.scale) / 2,
    y: viewportTop + (rect.y + rect.h / 2 - cam.y) * zoom + (view.height * win.scale) / 2,
  };
  const t = progress(frame, p2.paper, p2.paste - p2.paper, Easing.bezier(0.3, 0.1, 0.25, 1));
  const start = { x: width + 380 * u, y: height * 0.95 };
  const control = { x: width * 0.92, y: height * 0.12 };
  const x = (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * target.x;
  const y = (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * target.y;
  const sheet = { w: 560 * u, h: 380 * u };
  const fit = (rect.w * zoom) / sheet.w;
  const scale = mix(1.1, fit, t);
  const squash = 1 - impulse(frame, p2.paste, 3) * 0.15;
  const fade = 1 - progress(frame, p2.paste, 5);
  const lines = film.sample.jobOffer.split("\n");
  return (
    <div
      style={{
        position: "absolute",
        left: x - sheet.w / 2,
        top: y - sheet.h / 2,
        width: sheet.w,
        height: sheet.h,
        padding: 34 * u,
        borderRadius: 14 * u,
        background: "#ffffff",
        boxShadow: `0 ${30 * u * (1 - t)}px ${60 * u}px rgb(16 24 32 / ${0.25 * (1 - t) + 0.05})`,
        transform: `scale(${scale}, ${scale * squash}) rotate(${mix(24, 0, t)}deg) rotateY(${mix(-25, 0, t)}deg)`,
        opacity: fade,
        fontFamily: "system-ui, 'Segoe UI', sans-serif",
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 24 * u, fontWeight: 700, color: stage.paperText, lineHeight: 1.25 }}>{lines[0]}</div>
      <div style={{ marginTop: 18 * u, fontSize: 18 * u, color: stage.paperMuted, lineHeight: 1.5 }}>{lines[1]}</div>
      <div style={{ marginTop: 18 * u, display: "flex", flexDirection: "column", gap: 10 * u }}>
        {[0.9, 0.75, 0.82].map((w, index) => (
          <div key={index} style={{ height: 10 * u, width: `${w * 100}%`, borderRadius: 99, background: "#e8ebee" }} />
        ))}
      </div>
    </div>
  );
}

/** The marked words lift off the job offer and land as the review screen's chips. */
function FlyingChips({ anchors }: { anchors: Anchors }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  return (
    <>
      {film.sample.technologies.map((technology, index) => {
        const at = p2.fly[index]!;
        const t = progress(frame, at, p2.flyFrames, Easing.bezier(0.5, 0, 0.15, 1));
        if (frame < at || t >= 1) {
          if (frame >= at + p2.flyFrames && frame < at + p2.flyFrames + 16) {
            const landed = centre(anchors, `chip-${index}`, { x: 0, y: 0 });
            return (
              <Shockwave
                key={index}
                frame={frame}
                at={at + p2.flyFrames}
                x={landed.x}
                y={landed.y}
                from={30}
                to={130}
                color="var(--accent)"
                width={2}
                duration={14}
              />
            );
          }
          return null;
        }
        const from = centre(anchors, `term-${index}`, { x: 0, y: 0 });
        const to = centre(anchors, `chip-${index}`, { x: 0, y: 0 });
        const lift = { x: (from.x + to.x) / 2 + 60, y: Math.min(from.y, to.y) - 120 };
        const x = (1 - t) ** 2 * from.x + 2 * (1 - t) * t * lift.x + t ** 2 * to.x;
        const y = (1 - t) ** 2 * from.y + 2 * (1 - t) * t * lift.y + t ** 2 * to.y;
        return (
          <span
            key={index}
            className="chip technology"
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) rotate(${Math.sin(t * Math.PI) * (index % 2 ? 10 : -10)}deg) scale(${1 + Math.sin(t * Math.PI) * 0.18})`,
              boxShadow: `0 ${12 * Math.sin(t * Math.PI)}px 24px rgb(16 24 32 / ${0.18 * Math.sin(t * Math.PI)})`,
              background: "var(--surface)",
            }}
          >
            <span className={`status-dot ${technology.covered ? "status-dot-covered" : "status-dot-uncurated"}`} />
            {technology.name}
            <span className="chip-remove">×</span>
          </span>
        );
      })}
    </>
  );
}
