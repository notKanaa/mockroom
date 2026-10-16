// Part 2, from the logo to the product, on a 120 BPM grid:
//   the four promises roll past like the reels of part 1 (the price spins down to
//   $0, braces clap open on "open source", a toggle flips the language) → the
//   toggle's knob morphs into Mockroom's prompt box, floating on its own → the job
//   offer's words fade in from a blur → an AI glow runs around the box while it
//   reads → the technologies are marked, lift off the text towards the camera, and
//   land in their card → the start button swells to fill the frame.

import { CameraMotionBlur } from "@remotion/motion-blur";
import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { FilmProvider, useFilm, type FilmProps } from "../lib/film";
import { easeIn, easeInOut, easeOut, mix, progress } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { Analysis, Mesh } from "./Analysis";
import { p2 } from "./beats";
import { At, Bloom, Grain, impulse, Letters, useSpring, Vignette } from "./fx";
import { part2Sound } from "./cues";
import { SoundTrack } from "./sound";

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
    [p2.free, p2.open, p2.language].some((at) => near(frame, at, 5, 8)) ||
    near(frame, p2.clap, 4, 3) ||
    near(frame, p2.free, 0, 20) ||
    near(frame, p2.morph, 0, p2.morphFrames) ||
    near(frame, p2.lift[0]!, 0, 30) ||
    near(frame, p2.drop[0]!, 0, 26) ||
    near(frame, p2.pack, 0, 10) ||
    near(frame, p2.burst, 0, p2.burstFrames);
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
      <Mesh />
      {frame < p2.morph + 14 && <Claims />}
      {frame >= p2.morph && <Analysis />}
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
      {frame >= p2.language - 2 && (
        <At x={cx} y={cy}>
          <div style={ride(p2.language, null)}>
            <Languages />
          </div>
        </At>
      )}
      <Bloom frame={frame} at={p2.freeLand} x={cx - 160 * u} y={cy} size={760 * u} color="rgb(53 196 168 / 0.45)" duration={24} />
      <Bloom frame={frame} at={p2.clap} x={cx} y={cy} size={680 * u} color="rgb(53 196 168 / 0.4)" duration={18} />
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
  // Everything but the knob dissolves when the knob starts its morph (see Morph).
  const handoff = progress(frame, p2.morph, 10, easeOut);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 56 * u * fit,
        opacity: 1 - handoff,
        filter: `blur(${handoff * 16 * u}px)`,
      }}
    >
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
            visibility: frame >= p2.morph ? "hidden" : "visible",
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

