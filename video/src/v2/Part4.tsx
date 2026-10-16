// Part 4, the debrief, floating on the mesh:
//   Camille's notes arrive with a success chime → the first question's card rises,
//   its two columns swing in like doors and their points light up one by one → the
//   model answer is marked → the second card deals in over the first → everything
//   folds into the interview's file, which drops as the frame goes dark (where
//   part 5, privacy, picks it up).

import { CameraMotionBlur } from "@remotion/motion-blur";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolateColors, useCurrentFrame } from "remotion";
import { Avatar } from "../../../src/ui/Recruiter";
import { UiViewport, type Camera } from "../components/UiViewport";
import type { DebriefCardContent } from "../content/locales";
import { FilmProvider, useFilm, type Film, type FilmProps } from "../lib/film";
import { easeIn, easeOut, keyframes, mix, progress } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { Mesh } from "./Analysis";
import { Bloom, BlurWords, Grain, useSpring, Vignette } from "./fx";
import { p4 } from "./beats";
import { part4Sound } from "./cues";
import { SoundTrack } from "./sound";

export function Part4Composition(props: FilmProps) {
  return (
    <FilmProvider value={props}>
      <Part4 />
      <SoundTrack cues={part4Sound} gain={1.3} />
    </FilmProvider>
  );
}

export function Part4() {
  const frame = useCurrentFrame();
  const fast =
    p4.cards.some((at) => frame >= at - 2 && frame < at + 18) || (frame >= p4.collapse && frame < p4.dark + p4.darkFrames);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(110% 90% at 50% 40%, #ffffff 0%, ${stage.paper} 50%, #e3e8ec 100%)` }}>
      <Mesh from={-40} />
      {fast ? (
        <CameraMotionBlur shutterAngle={200} samples={6}>
          <Scene />
        </CameraMotionBlur>
      ) : (
        <Scene />
      )}
      <Vignette strength={0.1} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
}

function layoutFor(film: Film) {
  const scale = (film.portrait ? 1.2 : film.square ? 1.25 : 1.6) * film.u;
  return { scale, W: Math.round(film.width / scale), H: Math.round(film.height / scale) };
}

function Scene() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, height } = film;
  const { scale, W, H } = layoutFor(film);
  const camera: Camera = keyframes(frame, [
    { f: p4.cards[0]!, v: { x: W / 2, y: H / 2, s: 1 } },
    { f: p4.cards[0]! + 40, v: { x: W / 2, y: H / 2 + 18, s: 1.04 } },
    { f: p4.cards[1]!, v: { x: W / 2, y: H / 2 + 18, s: 1.04 } },
    { f: p4.cards[1]! + 40, v: { x: W / 2, y: H / 2 + 10, s: 1.06 } },
    { f: p4.collapse, v: { x: W / 2, y: H / 2, s: 1 } },
  ]);
  const dark = progress(frame, p4.dark, p4.darkFrames, Easing.bezier(0.7, 0, 0.2, 1));
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: (film.portrait ? 220 : 52) * u,
          textAlign: "center",
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: (film.portrait ? 80 : film.square ? 60 : 64) * u,
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          color: stage.paperText,
          padding: `0 ${80 * u}px`,
        }}
      >
        <BlurWords text={film.film.demo.debrief} frame={frame} start={p4.caption} exit={p4.collapse - 8} />
      </div>

      <UiViewport width={W} height={H} scale={scale} camera={camera} transparent>
        <Fold W={W} H={H}>
          <Summary W={W} />
          {film.sample.cards.map((card, index) => (
            <FeedbackCard key={card.number} card={card} index={index} W={W} />
          ))}
        </Fold>
      </UiViewport>

      {/* The dark rises from the bottom, a soft edge leading. */}
      {dark > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: height * 1.4 * dark,
            background: `linear-gradient(to bottom, transparent, ${stage.ink} ${200 * u}px)`,
          }}
        />
      )}
      <FileChip />
    </AbsoluteFill>
  );
}

/** Folds everything into the centre when the debrief is filed away. */
function Fold({ W, H, children }: { W: number; H: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const fold = progress(frame, p4.collapse, 14, Easing.bezier(0.7, 0, 0.3, 1));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `${W / 2}px ${H / 2 + 40}px`,
        transform: `scale(${1 - fold * 0.9}) rotate(${fold * -6}deg)`,
        opacity: 1 - progress(frame, p4.collapse + 6, 8),
        filter: `blur(${fold * 6}px)`,
      }}
    >
      {children}
    </div>
  );
}

const blurIn = (frame: number, at: number, duration = 10, distance = 14): CSSProperties => {
  const t = progress(frame, at, duration, easeOut);
  return { opacity: t, filter: `blur(${(1 - t) * 12}px)`, transform: `translateY(${(1 - t) * distance}px)` };
};

/** Camille's notes: the overall summary, first. */
function Summary({ W }: { W: number }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { ui, sample } = film;
  const card = sp(frame, p4.summary, { damping: 13, stiffness: 150 });
  const leave = progress(frame, p4.cards[1]! - 6, 12, easeIn);
  return (
    <>
      <figure
        className="debrief-summary"
        style={{
          position: "absolute",
          left: W / 2 - 380,
          top: 118,
          width: 760,
          boxShadow: "0 18px 40px -18px rgb(11 122 102 / 0.35)",
          opacity: Math.min(1, card * 1.5) * (1 - leave),
          filter: `blur(${leave * 10}px)`,
          transform: `translateY(${(1 - card) * 30 - leave * 50}px) scale(${0.94 + 0.06 * card})`,
        }}
      >
        <Avatar recruiter={sample.recruiter} />
        <div>
          <figcaption className="debrief-summary-label">{ui.recruiter.debriefFrom(sample.recruiter.name)}</figcaption>
          <blockquote>
            <p>
              <BlurWords text={sample.summary} frame={frame} start={p4.summary + 8} stagger={0.8} duration={10} />
            </p>
          </blockquote>
        </div>
      </figure>
      <Bloom frame={frame} at={p4.summary + 2} x={W / 2 - 340} y={160} size={420} color="rgb(53 196 168 / 0.45)" duration={24} />
    </>
  );
}

/** One question's feedback, dealt in like a card: its columns swing in, its points light up, its model answer is marked. */
function FeedbackCard({ card, index, W }: { card: DebriefCardContent; index: number; W: number }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { ui } = film;
  const start = p4.cards[index]!;
  if (frame < start - 2) return null;
  // The first card rises from below; the next ones deal in from the right, over it.
  const deal = sp(frame, start, { damping: 15, stiffness: 120, mass: 0.9 });
  const first = index === 0;
  const next = p4.cards[index + 1];
  const behind = next === undefined ? 0 : progress(frame, next - 4, 18, easeOut);
  const columns = (side: -1 | 1) => {
    const swing = sp(frame, start + p4.columns + (side === 1 ? 3 : 0), { damping: 12, stiffness: 120 });
    return {
      transform: `perspective(900px) rotateY(${(1 - swing) * side * 70}deg)`,
      transformOrigin: side === -1 ? "0% 50%" : "100% 50%",
      opacity: Math.min(1, swing * 2),
    } satisfies CSSProperties;
  };
  const point = (order: number): CSSProperties => {
    const at = start + p4.points + order * p4.pointGap;
    const t = progress(frame, at, 8, easeOut);
    return { opacity: t, filter: `blur(${(1 - t) * 8}px)`, transform: `translateX(${(1 - t) * 10}px)` };
  };
  const mark = progress(frame, start + p4.model + 4, 16, Easing.bezier(0.5, 0, 0.2, 1));
  return (
    <li
      className="ui-card feedback"
      style={{
        position: "absolute",
        left: W / 2 - 380,
        top: first ? 250 : 230,
        width: 760,
        listStyle: "none",
        boxShadow: "0 1px 2px rgb(16 24 32 / 0.06), 0 30px 60px -24px rgb(16 24 32 / 0.3)",
        opacity: Math.min(1, deal * 2) * (1 - behind * 0.55),
        filter: `blur(${behind * 4}px)`,
        transform: first
          ? `perspective(1400px) translateY(${(1 - deal) * 160 - behind * 120}px) rotateX(${(1 - deal) * 18}deg) scale(${1 - behind * 0.08})`
          : `perspective(1400px) translateX(${(1 - deal) * 560}px) rotateY(${(1 - deal) * -30}deg) rotate(${(1 - deal) * 6}deg)`,
        zIndex: index + 1,
      }}
    >
      <p className="feedback-theme" style={blurIn(frame, start + 4)}>
        {ui.common.question(card.number)} · {card.theme}
      </p>
      <h2 className="feedback-question" style={blurIn(frame, start + 7)}>
        {card.question}
      </h2>
      <div className="feedback-columns">
        <section className="feedback-section feedback-strengths" style={columns(-1)}>
          <h3>{ui.debrief.strengths}</h3>
          <ul>
            {card.strengths.map((strength, order) => (
              <li key={strength} style={point(order)}>
                {strength}
              </li>
            ))}
          </ul>
        </section>
        <section className="feedback-section feedback-gaps" style={columns(1)}>
          <h3>{ui.debrief.gaps}</h3>
          <ul>
            {card.gaps.map((gap, order) => (
              <li key={gap} style={point(order + 2)}>
                {gap}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="feedback-section" style={blurIn(frame, start + p4.model)}>
        <h3>{ui.debrief.modelAnswer}</h3>
        <p
          className="feedback-answer"
          style={{
            backgroundImage: "linear-gradient(var(--accent-soft), var(--accent-soft))",
            backgroundRepeat: "no-repeat",
            backgroundSize: `${mark * 100}% 100%`,
            borderRadius: 4,
          }}
        >
          {card.modelAnswer}
        </p>
      </section>
    </li>
  );
}

/** The interview's file: what the debrief folds into, dropping as the dark comes up. */
function FileChip() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u, height } = film;
  if (frame < p4.file) return null;
  const pop = sp(frame, p4.file, { damping: 11, stiffness: 180 });
  const drop = progress(frame, p4.dark, p4.darkFrames, Easing.bezier(0.5, 0, 0.3, 1));
  const night = progress(frame, p4.dark + 12, 10);
  return <FilePill y={height / 2 + mix(0, 90, drop) * u} scale={pop} night={night} opacity={Math.min(1, pop * 2)} />;
}

/** The file as a pill: light on the mesh, dark (`night` 1) once the frame has gone dark. Part 5 picks it up there. */
export function FilePill({ y, scale, night, opacity, blur = 0 }: { y: number; scale: number; night: number; opacity: number; blur?: number }) {
  const film = useFilm();
  const { u, width } = film;
  return (
    <div
      style={{
        position: "absolute",
        left: width / 2,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        display: "flex",
        alignItems: "center",
        gap: 16 * u,
        padding: `${18 * u}px ${30 * u}px`,
        borderRadius: 999,
        background: interpolateColors(night, [0, 1], ["#ffffff", stage.surface]),
        color: interpolateColors(night, [0, 1], [stage.paperText, stage.text]),
        fontFamily: fonts.mono,
        fontSize: 30 * u,
        boxShadow: `0 ${20 * u}px ${50 * u}px rgb(0 0 0 / ${0.15 + night * 0.35}), 0 0 ${40 * u * night}px rgb(53 196 168 / ${0.3 * night})`,
        opacity,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        whiteSpace: "nowrap",
      }}
    >
      <svg width={34 * u} height={34 * u} viewBox="0 0 24 24" fill="none" stroke={stage.accent} strokeWidth="1.8" strokeLinejoin="round">
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v4h4M9 13h6M9 17h4" />
      </svg>
      <span>
        <span style={{ opacity: 0.6 }}>interviews/</span>2026-10-16.json
      </span>
    </div>
  );
}
