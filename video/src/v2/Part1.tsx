// Part 1, the opening, in one continuous move (no cuts):
//   a lone ring (the candidate) beats like a heart → the words slam in → they burst
//   and the camera dives through the ring → the price of coaching rolls in on slot
//   reels → a teal slash cuts it in two → the slash floods the frame → the flood
//   collapses into the recruiter's disc → the ring docks against it (the mark) →
//   light opens inside the ring and the camera flies through, into Mockroom's world.

import { CameraMotionBlur } from "@remotion/motion-blur";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { FilmProvider, useFilm, type FilmProps } from "../lib/film";
import { easeIn, easeInOut, easeOut, mix, progress } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { p1 } from "./beats";
import { part1Sound, SoundTrack } from "./sound";
import { At, bump, Grain, impulse, Letters, rgbSplit, scatter, shake, Shockwave, useSpring, Vignette } from "./fx";


/** Fast moves get a camera shutter: a few sub-frames blended, as on film. */
function Blur({ on, children }: { on: boolean; children: ReactNode }) {
  return on ? (
    <CameraMotionBlur shutterAngle={200} samples={7}>
      {children}
    </CameraMotionBlur>
  ) : (
    <>{children}</>
  );
}

/** Part 1 as its own composition, for review. */
export function Part1Composition(props: FilmProps) {
  return (
    <FilmProvider value={props}>
      <Part1 />
      <SoundTrack cues={part1Sound} />
    </FilmProvider>
  );
}

export function Part1() {
  const frame = useCurrentFrame();
  const fast =
    (frame >= p1.line1 && frame < p1.line1 + 14) ||
    (frame >= p1.slam && frame < p1.slam + 6) ||
    (frame >= p1.burst - 2 && frame < p1.cost + 10) ||
    (frame >= p1.reels && frame < p1.stops[4]! + 2) ||
    (frame >= p1.split && frame < p1.collapse + 18) ||
    (frame >= p1.ringFly && frame < p1.dock + 2) ||
    (frame >= p1.through && frame < p1.logo + 10);
  return (
    <AbsoluteFill style={{ background: stage.ink }}>
      <Blur on={fast}>
        <Scene />
      </Blur>
      <Grain opacity={frame < p1.through + 10 ? 0.09 : 0.05} />
    </AbsoluteFill>
  );
}

function Scene() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height } = film;
  const cx = width / 2;
  const cy = height / 2;

  // The global camera: a slow push, shakes on impacts.
  const kick = impulse(frame, p1.slam + 2, 5) * 26 + impulse(frame, p1.dock, 5) * 16 + impulse(frame, p1.split, 4) * 10;
  const drift = shake(frame, 2.5 * u, "hand");
  const hit = shake(frame, kick * u, "hit");
  const push = 1 + 0.04 * progress(frame, 0, p1.burst, easeInOut);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(90% 75% at 50% 45%, #171c22 0%, ${stage.ink} 72%)`,
        transform: `translate(${drift.x + hit.x}px, ${drift.y + hit.y}px) rotate(${hit.r}deg) scale(${push})`,
      }}
    >
      {frame < p1.cost + 14 && <Opening cx={cx} cy={cy} />}
      {frame >= p1.cost - 4 && frame < p1.collapse + 4 && <Price cx={cx} cy={cy} />}
      {frame >= p1.slash && frame < p1.collapse + 22 && <Slash cx={cx} cy={cy} />}
      {frame >= p1.collapse && frame < p1.logo + 8 && <Mark cx={cx} cy={cy} />}
      {frame >= p1.through + 8 && <Logo />}
      <Vignette strength={frame >= p1.through + 8 ? 0.12 : 0.55} />
    </AbsoluteFill>
  );
}

// The ring and the words, until the camera dives through the ring.

function Opening({ cx, cy }: { cx: number; cy: number }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u } = film;
  const fit = film.portrait ? 0.55 : film.square ? 0.68 : 1;
  const copy = film.film.problem;

  // The ring pops in, beats faster and faster, and grows into a frame around the words.
  const born = sp(frame, p1.ringIn, { damping: 8, stiffness: 160 });
  const beat = p1.beats.reduce((sum, at, index) => sum + bump(frame, at, 2, index < 2 ? 9 : 5) * (index < 2 ? 0.16 : 0.1), 0);
  const grow = sp(frame, p1.line1 - 4, { damping: 16, stiffness: 60 });
  const ringSize = mix(110, 820 * fit, grow) * u * born * (1 + beat);
  const ringStroke = mix(14, 5, grow) * u;

  // The dive: the camera rushes into the ring's centre.
  const dive = progress(frame, p1.dive, p1.cost + 12 - p1.dive, easeIn);
  const zoom = Math.pow(26, dive);

  // Line 1 slides in from the right, its letters landing one by one; line 2 slams.
  const line1Slide = sp(frame, p1.line1, { damping: 15, stiffness: 120 });
  const burst = Math.max(0, frame - p1.burst);
  const tremor = progress(frame, p1.slam + 6, p1.burst - p1.slam - 6, easeIn) * 5 * u;
  const split = impulse(frame, p1.slam + 1, 5) * 16 * u + tremor * 0.6;

  const scatterStyle = (index: number, count: number, line: number): CSSProperties => {
    if (burst <= 0) return {};
    const dx = (index - count / 2) / count + scatter(index, line + 1) * 0.6;
    const dy = (line === 0 ? -0.6 : 0.6) + scatter(index, line + 7) * 0.5;
    const travel = Math.pow(burst, 1.7) * 9 * u;
    return {
      translate: `${dx * travel}px ${dy * travel}px`,
      rotate: `${scatter(index, line + 3) * burst * 9}deg`,
      opacity: Math.max(0, 1 - burst / 12),
    };
  };

  const line2Words = copy.lines[1].split(" ");
  const lastWord = line2Words.at(-1)!;
  const firstWords = line2Words.slice(0, -1).join(" ");

  return (
    <AbsoluteFill style={{ transformOrigin: `${cx}px ${cy}px`, transform: `scale(${zoom})` }}>
      {/* Heartbeat ripples from the ring. */}
      {[p1.ringIn, ...p1.beats].map((at, index) => (
        <Shockwave
          key={at}
          frame={frame}
          at={at}
          x={cx}
          y={cy}
          from={ringSize}
          to={ringSize + (index < 3 ? 380 : 220) * u}
          color={index < 3 ? stage.text : stage.warn}
          width={3 * u}
          duration={index < 3 ? 24 : 14}
        />
      ))}
      <At x={cx} y={cy}>
        <div
          style={{
            width: ringSize,
            height: ringSize,
            borderRadius: "50%",
            border: `${ringStroke}px solid ${stage.text}`,
            opacity: mix(1, 0.32, grow),
            boxShadow: `0 0 ${40 * u * beat * 4}px rgb(240 182 96 / ${beat * 2})`,
          }}
        />
      </At>

      <At x={cx} y={cy}>
        <div
          style={{
            textAlign: "center",
            fontFamily: fonts.display,
            lineHeight: 0.95,
            letterSpacing: "-0.05em",
            whiteSpace: "nowrap",
          }}
        >
          <div
            style={{
              fontSize: 150 * u * fit,
              fontWeight: 700,
              color: stage.muted,
              transform: `translateX(${(1 - line1Slide) * 900 * u}px)`,
            }}
          >
            <Letters
              text={copy.lines[0]}
              letter={(index, count) => {
                const land = sp(frame, p1.line1 + index * 0.9, { damping: 13, stiffness: 170 });
                return {
                  transform: `translateY(${(1 - land) * 70}%) rotate(${(1 - land) * 14}deg)`,
                  opacity: Math.min(1, land * 1.4),
                  ...scatterStyle(index, count, 0),
                };
              }}
            />
          </div>
          <div style={{ fontSize: 214 * u * fit, fontWeight: 800, marginTop: 6 * u }}>
            <Letters
              text={`${firstWords} `}
              style={{ color: stage.text }}
              letter={(index, count) => {
                const pop = sp(frame, p1.are + index, { damping: 10, stiffness: 200 });
                return { transform: `scale(${pop})`, opacity: Math.min(1, pop * 2), ...scatterStyle(index, count, 1) };
              }}
            />
            <Letters
              text={lastWord}
              style={{ color: stage.warn, ...rgbSplit(split) }}
              letter={(index, count) => {
                const slam = sp(frame, p1.slam + index * 0.7, { damping: 14, stiffness: 260, mass: 0.6 });
                const jitterX = Math.sin(frame * 2.7 + index * 1.9) * tremor;
                const jitterY = Math.cos(frame * 3.1 + index * 2.3) * tremor * 0.6;
                return {
                  transform: `translate(${jitterX}px, ${jitterY}px) scale(${mix(3.2, 1, slam)})`,
                  opacity: Math.min(1, slam * 3),
                  ...scatterStyle(index, count, 2),
                };
              }}
            />
          </div>
        </div>
      </At>
    </AbsoluteFill>
  );
}

// The price of coaching, on slot reels, then cut in two.

const ANGLE = -9;

function Price({ cx, cy }: { cx: number; cy: number }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height } = film;
  const fit = film.portrait ? 0.5 : film.square ? 0.62 : 1;
  const copy = film.film.problem;

  // It arrives from deep inside the ring, as the camera comes out of the dive.
  const arrive = progress(frame, p1.cost - 4, 22, easeOut);
  const scale = mix(0.35, 1, arrive);
  const tilt = 1 - progress(frame, p1.cost, 70, easeInOut);

  // After the slash, the two halves slide apart along the cut.
  const apart = progress(frame, p1.split, 22, Easing.bezier(0.3, 0, 0.2, 1));
  const radians = (ANGLE * Math.PI) / 180;
  const along = { x: Math.cos(radians), y: Math.sin(radians) };
  const normal = { x: -Math.sin(radians), y: Math.cos(radians) };
  const half = (side: 1 | -1): CSSProperties => {
    const slide = apart * 160 * u * side;
    const open = apart * 70 * u * side;
    return {
      transform: `translate(${along.x * slide + normal.x * open}px, ${along.y * slide + normal.y * open}px) rotate(${apart * 2.5 * side}deg)`,
      opacity: 1 - progress(frame, p1.flood + 4, 10),
    };
  };
  // The line through the frame's centre, at the slash's angle.
  const yAt = (x: number) => cy + Math.tan(radians) * (x - cx);
  const top = `polygon(0 0, ${width}px 0, ${width}px ${yAt(width)}px, 0 ${yAt(0)}px)`;
  const bottom = `polygon(0 ${yAt(0)}px, ${width}px ${yAt(width)}px, ${width}px ${height}px, 0 ${height}px)`;

  const content = (
    <AbsoluteFill
      style={{
        transformOrigin: `${cx}px ${cy}px`,
        transform: `perspective(${1800 * u}px) scale(${scale}) rotateX(${tilt * 14}deg) rotateY(${tilt * -18}deg)`,
        opacity: progress(frame, p1.cost - 4, 8),
      }}
    >
      <At x={cx} y={cy - 150 * u * fit}>
        <Kicker text={copy.costKicker} size={34 * u * fit} />
      </At>
      <At x={cx} y={cy + 10 * u * fit}>
        <Reels fit={fit} />
      </At>
      <At x={cx} y={cy + 190 * u * fit}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: 54 * u * fit,
            letterSpacing: "-0.03em",
            color: stage.text,
            opacity: progress(frame, p1.unit + 6, 10),
            transform: `translateY(${(1 - progress(frame, p1.unit + 6, 14, easeOut)) * 30 * u}px)`,
          }}
        >
          {copy.costNote}
        </div>
      </At>
    </AbsoluteFill>
  );

  if (frame < p1.split) return content;
  return (
    <>
      <AbsoluteFill style={{ clipPath: top, ...half(-1) }}>{content}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: bottom, ...half(1) }}>{content}</AbsoluteFill>
    </>
  );
}

function Kicker({ text, size }: { text: string; size: number }) {
  const frame = useCurrentFrame();
  const shown = Math.max(0, Math.floor((frame - p1.kicker) * 1.6));
  const typing = shown < text.length;
  return (
    <div style={{ fontFamily: fonts.mono, fontSize: size, color: stage.muted, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
      {text.slice(0, shown)}
      <span
        style={{
          display: "inline-block",
          width: "0.6em",
          height: "1.05em",
          marginLeft: "0.1em",
          verticalAlign: "text-bottom",
          background: stage.accent,
          opacity: typing || Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
        }}
      />
    </div>
  );
}

/** "$20–150 / month", its digits rolling on reels that stop one after the other. */
function Reels({ fit }: { fit: number }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u } = film;
  const copy = film.film.problem;
  const size = 250 * u * fit;
  const digits = `${copy.costFrom}${copy.costTo}`.split("").map(Number);
  const split = String(copy.costFrom).length;

  const reel = (target: number, index: number) => {
    const stop = p1.stops[index] ?? p1.stops.at(-1)!;
    const spins = 3 + index;
    // Spins fast, then decelerates and lands with a little overshoot.
    const travel = interpolate(frame, [p1.reels + index * 2, stop], [0, spins * 10 + target], {
      easing: Easing.bezier(0.15, 0.6, 0.25, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const settle = frame >= stop ? (1 - sp(frame, stop, { damping: 9, stiffness: 300 })) * -0.12 : 0;
    const position = travel + settle;
    const strip = Array.from({ length: (spins + 2) * 10 }, (_, value) => value % 10);
    return (
      <span
        key={index}
        style={{
          display: "inline-block",
          height: "1em",
          overflow: "hidden",
          verticalAlign: "top",
          opacity: progress(frame, p1.reels + index * 2 - 3, 4),
        }}
      >
        <span style={{ display: "flex", flexDirection: "column", transform: `translateY(${-position}em)` }}>
          {strip.map((value, row) => (
            <span key={row} style={{ height: "1em", lineHeight: 1 }}>
              {value}
            </span>
          ))}
        </span>
      </span>
    );
  };

  const dash = sp(frame, p1.reels + 6, { damping: 12 });
  const currency = sp(frame, p1.reels - 2, { damping: 10, stiffness: 180 });
  const unit = sp(frame, p1.unit, { damping: 13, stiffness: 160 });
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 26 * u * fit, whiteSpace: "nowrap" }}>
      <span
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          color: stage.warn,
          fontVariantNumeric: "tabular-nums",
          display: "inline-flex",
        }}
      >
        <span style={{ display: "inline-block", transform: `scale(${currency}) rotate(${(1 - currency) * -40}deg)` }}>
          {copy.currency}
        </span>
        {digits.slice(0, split).map((digit, index) => reel(digit, index))}
        <span style={{ display: "inline-block", transform: `scaleX(${dash})`, margin: "0 0.04em" }}>–</span>
        {digits.slice(split).map((digit, index) => reel(digit, index + split))}
      </span>
      <span
        style={{
          fontFamily: fonts.display,
          fontWeight: 600,
          fontSize: 70 * u * fit,
          color: stage.muted,
          display: "inline-block",
          transform: `translateX(${(1 - unit) * 120 * u}px)`,
          opacity: Math.min(1, unit * 2),
        }}
      >
        {copy.costUnit}
      </span>
    </div>
  );
}

// The slash: drawn across the price, then thickened into a flood of teal.

function Slash({ cx, cy }: { cx: number; cy: number }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height } = film;
  const draw = progress(frame, p1.slash, 8, Easing.bezier(0.7, 0, 0.2, 1));
  const flood = progress(frame, p1.flood, 16, Easing.bezier(0.6, 0, 0.3, 1));
  const diagonal = Math.hypot(width, height);
  const thickness = mix(9 * u, diagonal * 1.2, flood);
  const length = diagonal * 1.4 * draw;
  const glow = 1 - flood;
  // As it floods, the teal deepens toward the recruiter's disc colour.
  const fade = 1 - progress(frame, p1.collapse + 2, 6);
  return (
    <div
      style={{
        position: "absolute",
        left: cx - diagonal * 0.7,
        top: cy - thickness / 2,
        width: length,
        height: thickness,
        background: stage.accent,
        transformOrigin: `${diagonal * 0.7}px ${thickness / 2}px`,
        transform: `rotate(${ANGLE}deg)`,
        borderRadius: thickness / 2,
        boxShadow: `0 0 ${30 * u * glow}px ${6 * u * glow}px rgb(53 196 168 / ${0.6 * glow})`,
        opacity: fade,
      }}
    />
  );
}

// The mark: the flood collapses into the recruiter's disc, the candidate's ring docks,
// and light opens inside the ring for the camera to fly through.

function Mark({ cx, cy }: { cx: number; cy: number }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u, width, height } = film;
  const size = 170 * u;
  const offset = size * 0.375;
  const discX = cx - offset / 2;
  const ringX = cx + offset / 2;

  // The flood collapses into a disc, like an iris closing.
  const collapse = progress(frame, p1.collapse, 18, Easing.bezier(0.7, 0, 0.15, 1));
  const discSize = mix(Math.hypot(width, height) * 1.25, size, collapse);

  // The ring flies in from the right and docks with a squash.
  const fly = sp(frame, p1.ringFly, { damping: 14, stiffness: 120, mass: 0.8 });
  const ringOn = frame >= p1.ringFly;
  const ringXNow = mix(width + size, ringX, fly);
  const squash = impulse(frame, p1.dock, 4);
  const flash = impulse(frame, p1.dock, 5);

  // Light opens inside the ring, then the camera flies through it.
  const open = progress(frame, p1.open, 10, easeOut);
  const through = progress(frame, p1.through, 16, Easing.bezier(0.75, 0, 0.9, 0.5));
  const zoom = Math.pow(60, through);
  const hole = size * (1 - 4 / 16);

  return (
    <AbsoluteFill style={{ transformOrigin: `${ringX}px ${cy}px`, transform: `scale(${zoom})` }}>
      <At x={discX} y={cy}>
        <div
          style={{
            width: discSize,
            height: discSize,
            borderRadius: "50%",
            background: stage.accent,
            transform: `scale(${1 + squash * 0.1}, ${1 - squash * 0.12})`,
          }}
        />
      </At>
      {ringOn && (
        <At x={ringXNow} y={cy}>
          <div
            style={{
              position: "relative",
              width: size,
              height: size,
              transform: `scale(${1 - squash * 0.14}, ${1 + squash * 0.1})`,
            }}
          >
            {/* The light inside: Mockroom's world, waiting. */}
            <div
              style={{
                position: "absolute",
                left: (size - hole * open) / 2,
                top: (size - hole * open) / 2,
                width: hole * open,
                height: hole * open,
                borderRadius: "50%",
                background: stage.paper,
                boxShadow: `0 0 ${50 * u * open}px ${10 * u * open}px rgb(247 248 250 / ${0.35 * open})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: `${(size * 2) / 16}px solid ${stage.text}`,
              }}
            />
          </div>
        </At>
      )}
      <At x={cx} y={cy}>
        <div
          style={{
            width: size * 3,
            height: size * 3,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgb(255 255 255 / ${flash * 0.55}) 0%, transparent 60%)`,
          }}
        />
      </At>
      <Shockwave frame={frame} at={p1.dock} x={cx} y={cy} from={size} to={size + 520 * u} color={stage.accent} width={4 * u} duration={22} />
      <Shockwave frame={frame} at={p1.dock + 3} x={cx} y={cy} from={size} to={size + 320 * u} color={stage.text} width={2 * u} duration={18} />
      <Sparks frame={frame} x={cx} y={cy} at={p1.dock} u={u} />
    </AbsoluteFill>
  );
}

function Sparks({ frame, x, y, at, u }: { frame: number; x: number; y: number; at: number; u: number }) {
  const t = frame - at;
  if (t < 0 || t > 20) return null;
  return (
    <>
      {Array.from({ length: 14 }, (_, index) => {
        const angle = (index / 14) * Math.PI * 2 + scatter(index, 5) * 0.3;
        const speed = (14 + scatter(index, 9) * 6) * u;
        const distance = speed * t * (1 - t / 40) + 95 * u;
        const dot = (6 + scatter(index, 2) * 3) * u * (1 - t / 20);
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x + Math.cos(angle) * distance - dot / 2,
              top: y + Math.sin(angle) * distance - dot / 2,
              width: dot,
              height: dot,
              borderRadius: "50%",
              background: index % 3 === 0 ? stage.text : stage.accent,
            }}
          />
        );
      })}
    </>
  );
}

// Mockroom's world: the light, and the name landing letter by letter.

function Logo() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u } = film;
  const fit = film.portrait ? 0.55 : film.square ? 0.7 : 1;
  const size = 104 * u * fit;
  const offset = size * 0.375;
  const dock = sp(frame, p1.logo - 4, { damping: 11, stiffness: 150 });
  const breathe = 1 + 0.025 * progress(frame, p1.logo, 60, easeInOut);
  return (
    <AbsoluteFill style={{ background: stage.paper, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 44 * u * fit, transform: `scale(${breathe})` }}>
        <div style={{ position: "relative", width: size + offset, height: size }}>
          <div
            style={{
              position: "absolute",
              left: mix(-260 * u, 0, dock),
              top: 0,
              width: size,
              height: size,
              borderRadius: "50%",
              background: stage.accentDeep,
              opacity: Math.min(1, dock * 2),
            }}
          />
          <div
            style={{
              position: "absolute",
              left: offset,
              top: 0,
              width: size,
              height: size,
              borderRadius: "50%",
              border: `${(size * 2) / 16}px solid ${stage.paperText}`,
              transform: `scale(${sp(frame, p1.through + 8, { damping: 9, stiffness: 120 })})`,
            }}
          />
        </div>
        <Letters
          text={film.film.answer.name}
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 236 * u * fit,
            letterSpacing: "-0.055em",
            lineHeight: 1,
            color: stage.paperText,
          }}
          letter={(index) => {
            const land = sp(frame, p1.logo + index * 1.6, { damping: 12, stiffness: 190 });
            return {
              transform: `translateY(${(1 - land) * -110}%) rotate(${(1 - land) * -12}deg)`,
              opacity: Math.min(1, land * 2),
            };
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
