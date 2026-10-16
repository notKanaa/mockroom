// Part 5, privacy then the call to action, on a dark stage:
//   a pane of dark glass forms: your machine. The interview's file from part 4
//   glides inside, your key appears next to it → a beam carries the key to its own
//   provider, and only there → Ollama flies in and settles inside, and the glass
//   lights up: nothing leaves → the glass morphs into a terminal, `npx mockroom` is
//   typed, Enter → the mark docks, the tagline, the repository and the licence.

import { CameraMotionBlur } from "@remotion/motion-blur";
import { noise2D } from "@remotion/noise";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolateColors, useCurrentFrame } from "remotion";
import { FilmProvider, useFilm, type Film, type FilmProps } from "../lib/film";
import { easeIn, easeInOut, easeOut, mix, progress, typed } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { Bloom, BlurWords, Grain, impulse, Letters, Streak, useSpring, Vignette } from "./fx";
import { SoundTrack, type SoundCue } from "./sound";

export const PART5_FRAMES = 390;

/** Part 5's beats, in frames at 30 fps. */
export const p5 = {
  glass: 0,
  fileIn: 6,
  lines: [12, 28, 50],
  key: 40,
  providers: 70,
  beam: 88,
  beamFrames: 16,
  ollamaLine: 122,
  ollama: 128,
  ollamaLand: 146,
  lit: 150,
  morph: 184,
  morphFrames: 20,
  typing: 210,
  enter: 242,
  mark: 250,
  tagline: 262,
  url: 286,
  license: 298,
  out: 374,
};

export const part5Sound: SoundCue[] = [
  { sound: "drone-dark", frame: 0, volume: 0.28, until: p5.morph + 10 },
  { sound: "expand", frame: p5.glass, volume: 0.45 },
  { sound: "whoosh-in", frame: p5.fileIn, volume: 0.4, rate: 0.9 },
  { sound: "pops", frame: p5.key, volume: 0.45 },
  ...[0, 1, 2].map((index) => ({ sound: "chip-land", frame: p5.providers + index * 4, volume: 0.35, rate: 1.1 + index * 0.08 })),
  { sound: "chip-fly", frame: p5.beam, volume: 0.5, rate: 0.8 },
  { sound: "mark", frame: p5.beam + p5.beamFrames, volume: 0.5 },
  { sound: "fly-by", frame: p5.ollama, volume: 0.55 },
  { sound: "dock", frame: p5.ollamaLand, volume: 0.7 },
  { sound: "shimmer", frame: p5.lit, volume: 0.5 },
  { sound: "swap", frame: p5.morph, volume: 0.5 },
  { sound: "expand", frame: p5.morph - 2, volume: 0.45, rate: 1.2 },
  { sound: "typing", frame: p5.typing, volume: 0.5, rate: 0.9 },
  { sound: "click", frame: p5.enter, volume: 0.8 },
  { sound: "flood", frame: p5.enter, volume: 0.35, rate: 1.3 },
  { sound: "pad-light", frame: p5.enter, volume: 0.7 },
  { sound: "sting", frame: p5.mark, volume: 0.85 },
  { sound: "letters", frame: p5.tagline, volume: 0.3 },
  { sound: "pops", frame: p5.url, volume: 0.35, rate: 0.9 },
  { sound: "toggle", frame: p5.license, volume: 0.3 },
];

export function Part5Composition(props: FilmProps) {
  return (
    <FilmProvider value={props}>
      <Part5 />
      <SoundTrack cues={part5Sound} gain={1.3} />
    </FilmProvider>
  );
}

export function Part5() {
  const frame = useCurrentFrame();
  const fast =
    frame < p5.fileIn + 16 ||
    (frame >= p5.ollama && frame < p5.ollamaLand + 2) ||
    (frame >= p5.morph && frame < p5.morph + p5.morphFrames) ||
    (frame >= p5.mark && frame < p5.mark + 12);
  const out = progress(frame, p5.out, PART5_FRAMES - p5.out, easeIn);
  return (
    <AbsoluteFill style={{ background: stage.ink }}>
      <DarkMesh />
      {fast ? (
        <CameraMotionBlur shutterAngle={200} samples={6}>
          <Scene />
        </CameraMotionBlur>
      ) : (
        <Scene />
      )}
      <Vignette strength={0.5} />
      <Grain opacity={0.07} />
      <AbsoluteFill style={{ background: stage.ink, opacity: out }} />
    </AbsoluteFill>
  );
}

/** Teal and blue light drifting in the dark. */
function DarkMesh() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height } = film;
  const lit = progress(frame, p5.lit, 30);
  const blobs = [
    { x: 0.75, y: 0.45, size: 1300, color: `rgb(53 196 168 / ${0.14 + lit * 0.12})` },
    { x: 0.15, y: 0.2, size: 1000, color: "rgb(111 183 255 / 0.10)" },
    { x: 0.4, y: 0.95, size: 1100, color: "rgb(53 196 168 / 0.08)" },
  ];
  return (
    <AbsoluteFill>
      {blobs.map((blob, index) => {
        const size = blob.size * u;
        const x = blob.x * width + noise2D(`dx${index}`, frame * 0.005, 0) * 140 * u;
        const y = blob.y * height + noise2D(`dy${index}`, 0, frame * 0.005) * 100 * u;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(closest-side, ${blob.color}, transparent)`,
              filter: `blur(${60 * u}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

function layoutFor(film: Film) {
  const { u, width, height } = film;
  const stacked = film.portrait || film.square;
  const glass = stacked
    ? { x: width / 2, y: height * 0.62, w: width - 140 * u, h: 520 * u }
    : { x: width - 740 * u, y: height / 2 + 20 * u, w: 720 * u, h: 500 * u };
  const providerX = stacked ? null : width - 190 * u;
  return {
    glass,
    text: stacked ? { x: 80 * u, y: 160 * u } : { x: 130 * u, y: height / 2 - 230 * u },
    key: { x: glass.x - 150 * u, y: glass.y - 40 * u },
    file: { x: glass.x, y: glass.y + 120 * u },
    ollama: { x: glass.x + 170 * u, y: glass.y - 40 * u },
    providers: [-160, 0, 160].map((dy, index) =>
      providerX === null
        ? { x: glass.x + (index - 1) * 260 * u, y: glass.y - glass.h / 2 - 90 * u }
        : { x: providerX, y: glass.y + dy * u },
    ),
    terminal: { x: width / 2, y: height / 2 + 70 * u, w: 720 * u, h: 132 * u },
  };
}

function Scene() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u } = film;
  const layout = layoutFor(film);
  const copy = film.film.privacy;
  const textOut = progress(frame, p5.morph - 6, 14, easeIn);
  const fit = film.portrait || film.square ? 0.72 : 1;
  return (
    <AbsoluteFill>
      {/* The words, on the left. */}
      {frame < p5.morph + 12 && (
        <div
          style={{
            position: "absolute",
            left: layout.text.x,
            top: layout.text.y,
            width: 640 * u,
            fontFamily: fonts.display,
            letterSpacing: "-0.04em",
            color: stage.text,
            opacity: 1 - textOut,
            filter: `blur(${textOut * 14}px)`,
          }}
        >
          <div style={{ fontSize: 120 * u * fit, fontWeight: 800, lineHeight: 0.98 }}>
            <BlurWords text={copy.lines[0]!} frame={frame} start={p5.lines[0]!} />
            <br />
            <BlurWords text={copy.lines[1]!} frame={frame} start={p5.lines[1]!} />
          </div>
          <div style={{ marginTop: 34 * u, fontSize: 40 * u * fit, fontWeight: 600, lineHeight: 1.2, color: stage.muted, letterSpacing: "-0.02em" }}>
            <BlurWords text={copy.lines[2]!} frame={frame} start={p5.lines[2]!} stagger={1.5} />
          </div>
          <div style={{ marginTop: 14 * u, fontSize: 40 * u * fit, fontWeight: 600, lineHeight: 1.2, color: stage.accent, letterSpacing: "-0.02em" }}>
            <BlurWords text={copy.ollama} frame={frame} start={p5.ollamaLine} stagger={1.5} />
          </div>
        </div>
      )}

      <Glass layout={layout} />
      {frame < p5.morph + 6 && <Inside layout={layout} />}
      {frame >= p5.typing - 30 && <Finale layout={layout} />}
    </AbsoluteFill>
  );
}

const pillStyle = (u: number, lit = 0): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 14 * u,
  padding: `${14 * u}px ${24 * u}px`,
  borderRadius: 999,
  background: interpolateColors(lit, [0, 1], [stage.surface, stage.accentSoft]),
  border: `${1.5 * u}px solid ${interpolateColors(lit, [0, 1], [stage.line, stage.accent])}`,
  color: interpolateColors(lit, [0, 1], [stage.text, stage.accent]),
  fontFamily: fonts.mono,
  fontSize: 26 * u,
  whiteSpace: "nowrap",
  boxShadow: `0 ${14 * u}px ${30 * u}px rgb(0 0 0 / 0.35)${lit > 0 ? `, 0 0 ${30 * u * lit}px rgb(53 196 168 / ${0.35 * lit})` : ""}`,
});

function At({ x, y, children, style }: { x: number; y: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, display: "grid", placeItems: "center", ...style }}>
      <div style={{ position: "absolute" }}>{children}</div>
    </div>
  );
}

/** Your machine, as a pane of dark glass; it later morphs into the terminal. */
function Glass({ layout }: { layout: ReturnType<typeof layoutFor> }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u } = film;
  const born = sp(frame, p5.glass, { damping: 16, stiffness: 120 });
  const lit = progress(frame, p5.lit, 20, easeOut);
  const morph = progress(frame, p5.morph, p5.morphFrames, Easing.bezier(0.75, 0, 0.15, 1));
  const enter = impulse(frame, p5.enter, 4);
  const from = layout.glass;
  const to = layout.terminal;
  const x = mix(from.x, to.x, morph);
  const y = mix(from.y, to.y, morph);
  const w = mix(from.w, to.w, morph) * (1 - enter * 0.02);
  const h = mix(from.h, to.h, morph) * (1 - enter * 0.04);
  const ring = Math.max(lit * (1 - morph), progress(frame, p5.enter, 6) * (1 - progress(frame, p5.enter + 10, 40)));
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - w / 2,
          top: y - h / 2,
          width: w,
          height: h,
          borderRadius: mix(36, 30, morph) * u,
          background: "linear-gradient(160deg, rgb(255 255 255 / 0.09), rgb(255 255 255 / 0.025) 60%)",
          border: `${1.5 * u}px solid ${interpolateColors(ring, [0, 1], ["rgba(255, 255, 255, 0.12)", stage.accent])}`,
          boxShadow: `0 ${40 * u}px ${120 * u}px ${-20 * u}px rgb(0 0 0 / 0.7), inset 0 1px 0 rgb(255 255 255 / 0.14), 0 0 ${140 * u * ring}px rgb(53 196 168 / ${0.35 * ring})`,
          backdropFilter: `blur(${20 * u}px)`,
          opacity: Math.min(1, born * 1.6),
          transform: `scale(${0.9 + 0.1 * born})`,
        }}
      >
        {/* The address: everything inside is on this computer. */}
        <div
          style={{
            position: "absolute",
            left: 34 * u,
            top: 28 * u,
            display: "flex",
            alignItems: "center",
            gap: 12 * u,
            fontFamily: fonts.mono,
            fontSize: 24 * u,
            color: stage.accent,
            opacity: progress(frame, p5.glass + 10, 10) * (1 - morph),
          }}
        >
          <span
            style={{
              width: 12 * u,
              height: 12 * u,
              borderRadius: 99,
              background: stage.accent,
              boxShadow: `0 0 ${10 + 8 * Math.sin(frame * 0.2)}px ${stage.accent}`,
            }}
          />
          {film.film.privacy.local}
        </div>
      </div>
      <Bloom frame={frame} at={p5.ollamaLand} x={layout.ollama.x} y={layout.ollama.y} size={700 * u} color="rgb(53 196 168 / 0.5)" duration={24} />
    </>
  );
}

/** What is inside the glass, the providers outside it, and the key's beam. */
function Inside({ layout }: { layout: ReturnType<typeof layoutFor> }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u, width, height } = film;
  const copy = film.film.privacy;
  const fade = 1 - progress(frame, p5.morph - 4, 10);

  // The file from part 4 glides in from the centre of the frame.
  const glide = progress(frame, p5.fileIn, 22, Easing.bezier(0.5, 0, 0.2, 1));
  const file = { x: mix(width / 2, layout.file.x, glide), y: mix(height / 2 + 90 * u, layout.file.y, glide) };
  const key = sp(frame, p5.key, { damping: 11, stiffness: 190 });

  // The beam from the key to its provider (the middle one), and only there.
  const target = layout.providers[1]!;
  const start = { x: layout.key.x + 150 * u, y: layout.key.y };
  const end = { x: target.x - 120 * u, y: target.y };
  const beam = progress(frame, p5.beam, p5.beamFrames, Easing.bezier(0.6, 0, 0.2, 1));
  const beamFade = 1 - progress(frame, p5.ollama - 4, 10);
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const arrived = progress(frame, p5.beam + p5.beamFrames, 8);

  // Ollama drops in from above and settles inside.
  const fly = sp(frame, p5.ollama, { damping: 14, stiffness: 110 });
  const ollamaOn = frame >= p5.ollama;
  const ollamaLit = progress(frame, p5.ollamaLand, 10);
  const dim = progress(frame, p5.lit, 14) * 0.6;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      <At x={file.x} y={file.y}>
        <div style={{ ...pillStyle(u), fontSize: 26 * u }}>
          <svg width={30 * u} height={30 * u} viewBox="0 0 24 24" fill="none" stroke={stage.accent} strokeWidth="1.8" strokeLinejoin="round">
            <path d="M6 3h8l4 4v14H6z" />
            <path d="M14 3v4h4M9 13h6M9 17h4" />
          </svg>
          <span>
            <span style={{ opacity: 0.6 }}>{copy.inside[1]}</span>2026-10-16.json
          </span>
        </div>
      </At>
      <At x={layout.key.x} y={layout.key.y} style={{ opacity: Math.min(1, key * 2), transform: `scale(${key})` }}>
        <div style={pillStyle(u)}>
          <svg width={30 * u} height={30 * u} viewBox="0 0 24 24" fill="none" stroke={stage.warn} strokeWidth="1.8" strokeLinecap="round">
            <circle cx="8" cy="15" r="4" />
            <path d="M10.8 12.2 20 3M16 7l3 3M14 9l2 2" />
          </svg>
          {copy.inside[0]}
        </div>
      </At>

      {copy.providers.map((name, index) => {
        const show = sp(frame, p5.providers + index * 4, { damping: 13, stiffness: 170 });
        const point = layout.providers[index]!;
        const lit = index === 1 ? arrived * (1 - dim * 1.4) : 0;
        return (
          <At key={name} x={point.x} y={point.y} style={{ opacity: Math.min(1, show * 2) * (1 - dim), transform: `translateX(${(1 - show) * 60 * u}px)` }}>
            <div style={pillStyle(u, Math.max(0, lit))}>{name}</div>
          </At>
        );
      })}

      {beam > 0 && (
        <div
          style={{
            position: "absolute",
            left: start.x,
            top: start.y - 2 * u,
            width: length * beam,
            height: 4 * u,
            transformOrigin: "0 50%",
            transform: `rotate(${angle}rad)`,
            borderRadius: 4 * u,
            background: `linear-gradient(90deg, transparent, ${stage.accent})`,
            boxShadow: `0 0 ${16 * u}px rgb(53 196 168 / 0.6)`,
            opacity: beamFade,
          }}
        />
      )}
      {beam > 0 && beam < 1 && (
        <div
          style={{
            position: "absolute",
            left: start.x + Math.cos(angle) * length * beam - 22 * u,
            top: start.y + Math.sin(angle) * length * beam - 22 * u,
            width: 44 * u,
            height: 44 * u,
            borderRadius: "50%",
            background: `radial-gradient(circle, #ffffff 0%, ${stage.accent} 35%, transparent 70%)`,
            filter: `blur(${2 * u}px)`,
          }}
        />
      )}

      {ollamaOn && (
        <At
          x={mix(layout.ollama.x + 80 * u, layout.ollama.x, fly)}
          y={mix(-120 * u, layout.ollama.y, fly)}
          style={{ transform: `scale(${1 + impulse(frame, p5.ollamaLand, 4) * 0.12})` }}
        >
          <div style={pillStyle(u, ollamaLit)}>Ollama</div>
        </At>
      )}
    </div>
  );
}

/** The terminal: the command typed, Enter, then the mark, the tagline, the repository and the licence. */
function Finale({ layout }: { layout: ReturnType<typeof layoutFor> }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u, width } = film;
  const copy = film.film.cta;
  const fit = film.portrait || film.square ? 0.72 : 1;
  const term = layout.terminal;
  const shown = progress(frame, p5.morph + p5.morphFrames - 4, 8);
  const command = typed(copy.command, frame, p5.typing, 0.55);
  const typing = frame >= p5.typing && command.length < copy.command.length;
  const caret = typing || Math.floor(frame / 9) % 2 === 0;

  // The mark docks above the terminal.
  const size = 86 * u * fit;
  const half = size * 0.1875;
  const markY = term.y - 330 * u * fit;
  const dock = sp(frame, p5.mark, { damping: 11, stiffness: 160 });
  const ringIn = sp(frame, p5.mark - 4, { damping: 10, stiffness: 180 });
  const url = sp(frame, p5.url, { damping: 14, stiffness: 150 });
  return (
    <>
      <At x={term.x} y={term.y} style={{ opacity: shown }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 * u, fontFamily: fonts.mono, fontSize: 64 * u * fit, color: stage.text }}>
          <span style={{ color: stage.accent }}>$</span>
          <span style={{ minWidth: `${copy.command.length}ch`, whiteSpace: "pre" }}>
            {command}
            <span
              style={{
                display: "inline-block",
                width: "0.55ch",
                height: "1em",
                marginLeft: 6 * u,
                verticalAlign: "text-bottom",
                background: stage.accent,
                opacity: caret ? 1 : 0,
              }}
            />
          </span>
        </div>
      </At>
      <Streak frame={frame} at={p5.enter} x={term.x} y={term.y} length={1800 * u} thickness={5 * u} color="rgb(53 196 168 / 0.9)" duration={20} />
      <Bloom frame={frame} at={p5.enter} x={term.x} y={term.y} size={1100 * u} color="rgb(53 196 168 / 0.35)" duration={26} />

      {frame >= p5.mark - 4 && (
        <>
          <div
            style={{
              position: "absolute",
              left: mix(-size, width / 2 - half, dock) - size / 2,
              top: markY - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: stage.accent,
              transform: `scale(${1 + impulse(frame, p5.mark + 8, 4) * 0.1}, ${1 - impulse(frame, p5.mark + 8, 4) * 0.12})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: width / 2 + half - size / 2,
              top: markY - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              border: `${(size * 2) / 16}px solid ${stage.text}`,
              transform: `scale(${ringIn})`,
            }}
          />
          <Bloom frame={frame} at={p5.mark + 8} x={width / 2} y={markY} size={600 * u} color="rgb(53 196 168 / 0.5)" duration={24} />
        </>
      )}

      <div
        style={{
          position: "absolute",
          left: 80 * u,
          right: 80 * u,
          top: markY + size / 2 + 40 * u * fit,
          textAlign: "center",
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 92 * u * fit,
          letterSpacing: "-0.045em",
          lineHeight: 1.02,
          color: stage.text,
        }}
      >
        <BlurWords text={copy.tagline} frame={frame} start={p5.tagline} stagger={2.5} />
      </div>

      <At x={width / 2} y={term.y + 150 * u * fit} style={{ opacity: Math.min(1, url * 2), transform: `translateY(${(1 - url) * 30 * u}px)` }}>
        <Letters
          text={copy.url}
          style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 52 * u * fit, letterSpacing: "-0.03em", color: stage.text, whiteSpace: "nowrap" }}
          letter={(index) => {
            const t = progress(frame, p5.url + index * 0.35, 8, easeOut);
            return { opacity: t, filter: `blur(${(1 - t) * 6}px)` };
          }}
        />
      </At>
      <At x={width / 2} y={term.y + 230 * u * fit} style={{ opacity: progress(frame, p5.license, 14, easeInOut) }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 30 * u * fit, color: stage.muted, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{copy.license}</div>
      </At>
    </>
  );
}
