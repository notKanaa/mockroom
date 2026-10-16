// Part 3, the interview, its pieces floating on the mesh as in part 2:
//   the teal frame closes into a disc, which becomes Camille's avatar and flies
//   into the recruiter header → Camille asks a question from the Symfony pack →
//   the answer is typed in the box and rises as a bubble → the progress line rolls
//   to "Follow-up 1" → the follow-up streams in, in focus, the rest of the
//   conversation going soft behind it → everything lifts away.

import { CameraMotionBlur } from "@remotion/motion-blur";
import { useState, type CSSProperties } from "react";
import { AbsoluteFill, Easing, interpolateColors, useCurrentFrame } from "remotion";
import { ArrowUpIcon } from "../../../src/ui/Icons";
import { IconButton } from "../../../src/ui/kit";
import { Avatar } from "../../../src/ui/Recruiter";
import { UiViewport, centre, type Anchors, type Camera } from "../components/UiViewport";
import { FilmProvider, useFilm, type Film, type FilmProps } from "../lib/film";
import { easeIn, easeOut, framesFor, keyframes, mix, progress, streamed, typed } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { interviewLanguageName, ModelButton } from "../ui/Screens";
import { Mesh } from "./Analysis";
import { Bloom, BlurWords, Grain, impulse, useSpring, Vignette } from "./fx";
import { SoundTrack, type SoundCue } from "./sound";

export const PART3_FRAMES = 300;

const STREAM = 2.6;
const TYPE = 3;

/** Part 3's beats; the interview's follow the length of its texts, so French fits too. */
export function part3Beats(sample: Film["sample"]) {
  const question = 58;
  const typing = question + framesFor(sample.question, STREAM) + 10;
  const send = typing + framesFor(sample.answer, TYPE) + 4;
  const followUp = send + 32;
  return {
    iris: 0,
    irisFrames: 16,
    letter: 12,
    travel: 18,
    travelFrames: 20,
    header: 24,
    caption1: 30,
    thinking: 40,
    question,
    questionEnd: question + framesFor(sample.question, STREAM),
    typing,
    send,
    thinking2: send + 8,
    progress: followUp - 8,
    caption2: followUp - 4,
    followUp,
    followUpEnd: followUp + framesFor(sample.followUp, STREAM),
    exit: 268,
  };
}

type Beats = ReturnType<typeof part3Beats>;

export function part3Sound(beats: Beats): SoundCue[] {
  const b = beats;
  return [
    { sound: "groove", frame: 0, volume: 0.85 },
    { sound: "collapse", frame: b.iris, volume: 0.6 },
    { sound: "ring-pop", frame: b.letter, volume: 0.55 },
    { sound: "whoosh-in", frame: b.travel, volume: 0.5 },
    { sound: "shimmer", frame: b.thinking, volume: 0.3 },
    { sound: "typing", frame: b.question, volume: 0.22, rate: 1.8 },
    { sound: "typing", frame: b.typing, volume: 0.4, rate: 1.3 },
    { sound: "typing", frame: b.typing + 20, volume: 0.35, rate: 1.45 },
    { sound: "click", frame: b.send - 2, volume: 0.6 },
    { sound: "chip-fly", frame: b.send, volume: 0.5, rate: 0.85 },
    { sound: "chip-land", frame: b.send + 10, volume: 0.5, rate: 0.9 },
    { sound: "shimmer", frame: b.thinking2, volume: 0.25 },
    { sound: "toggle", frame: b.progress, volume: 0.6 },
    { sound: "mark", frame: b.followUp, volume: 0.65, rate: 0.9 },
    { sound: "free-chime", frame: b.followUp + 2, volume: 0.35 },
    { sound: "typing", frame: b.followUp + 4, volume: 0.22, rate: 1.8 },
    { sound: "swap", frame: b.exit, volume: 0.55 },
  ];
}

export function Part3Composition(props: FilmProps) {
  return (
    <FilmProvider value={props}>
      <Part3 />
      <Part3Sound />
    </FilmProvider>
  );
}

function Part3Sound() {
  const film = useFilm();
  return <SoundTrack cues={part3Sound(part3Beats(film.sample))} gain={1.3} />;
}

export function Part3() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const b = part3Beats(film.sample);
  const fast = frame < b.travel + b.travelFrames || (frame >= b.send && frame < b.send + 12) || frame >= b.exit;
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
  const W = Math.round(film.width / scale);
  const H = Math.round(film.height / scale);
  return { scale, W, H, headerTop: 122, chatTop: 210, chatBottom: H - 150, composerTop: H - 132 };
}

function Scene() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u } = film;
  const b = part3Beats(film.sample);
  const layout = layoutFor(film);
  const { W, H, scale } = layout;
  const [anchors, setAnchors] = useState<Anchors>({});

  const scrollY = useScroll(anchors, layout, b);
  // A gentle push in and out: the caption stays clear above the header.
  const camera: Camera = keyframes(frame, [
    { f: b.header, v: { x: W / 2, y: H / 2, s: 1 } },
    { f: b.question + 10, v: { x: W / 2, y: H / 2 + 10, s: 1.04 } },
    { f: b.typing, v: { x: W / 2, y: H / 2 + 10, s: 1.04 } },
    { f: b.typing + 14, v: { x: W / 2, y: H / 2 + 30, s: 1.05 } },
    { f: b.send + 6, v: { x: W / 2, y: H / 2, s: 1 } },
    { f: b.followUp + 20, v: { x: W / 2, y: H / 2 + 20, s: 1.06 } },
    { f: b.exit, v: { x: W / 2, y: H / 2 + 20, s: 1.08 } },
  ]);

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
          zIndex: 2,
        }}
      >
        {frame < b.caption2 + 6 && <BlurWords text={film.film.demo.interviews} frame={frame} start={b.caption1} exit={b.caption2 - 8} />}
        {frame >= b.caption2 && <BlurWords text={film.film.demo.digs} frame={frame} start={b.caption2} exit={b.exit} />}
      </div>

      <UiViewport width={W} height={H} scale={scale} camera={camera} onAnchors={setAnchors} transparent>
        <Header layout={layout} beats={b} />
        <Chat layout={layout} beats={b} scrollY={scrollY} anchors={anchors} />
        <Composer layout={layout} beats={b} />
      </UiViewport>

      <Iris beats={b} anchors={anchors} camera={camera} scale={scale} />
    </AbsoluteFill>
  );
}

/** The conversation follows its last line, like the app's auto-scroll, smoothly. */
function useScroll(anchors: Anchors, layout: ReturnType<typeof layoutFor>, b: Beats) {
  const frame = useCurrentFrame();
  const bottom = (name: string) => {
    const rect = anchors[name];
    return rect ? Math.max(0, rect.y + rect.h - layout.chatBottom) : 0;
  };
  return keyframes(frame, [
    { f: b.send, v: { y: 0 } },
    { f: b.send + 14, v: { y: bottom("answer") } },
    { f: b.followUp - 2, v: { y: bottom("answer") } },
    { f: b.followUp + 24, v: { y: bottom("follow-up") } },
  ], Easing.bezier(0.3, 0, 0.2, 1)).y;
}

/** Whatever floats out of view at the end lifts away, softly blurred. */
function exitStyle(frame: number, b: Beats, order: number): CSSProperties {
  const t = progress(frame, b.exit + order * 3, 14, easeIn);
  return t > 0 ? { opacity: 1 - t, filter: `blur(${t * 12}px)`, translate: `0 ${-t * 50}px` } : {};
}

/** Appearing from a blur, rising a little. */
function blurIn(frame: number, at: number, duration = 10, distance = 14): CSSProperties {
  const t = progress(frame, at, duration, easeOut);
  return { opacity: t, filter: `blur(${(1 - t) * 12}px)`, transform: `translateY(${(1 - t) * distance}px)` };
}

/** The recruiter header, floating: avatar, name and role, the pack, and the progress line. */
function Header({ layout, beats: b }: { layout: ReturnType<typeof layoutFor>; beats: Beats }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { ui, sample } = film;
  const card = sp(frame, b.header, { damping: 15, stiffness: 150 });
  const thinking = (frame >= b.thinking && frame < b.questionEnd) || (frame >= b.thinking2 && frame < b.followUpEnd);
  const glow = thinking ? 0.5 + 0.5 * Math.sin(frame * 0.25) : 0;
  const rolled = progress(frame, b.progress, 10, Easing.bezier(0.6, 0, 0.2, 1));
  const before = ui.room.progress(1, 5);
  const after = ui.room.followUpProgress(1);
  return (
    <div
      style={{
        position: "absolute",
        left: layout.W / 2 - 380,
        top: layout.headerTop,
        width: 760,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 20px",
        borderRadius: 18,
        background: "rgb(255 255 255 / 0.82)",
        boxShadow: "0 1px 2px rgb(16 24 32 / 0.06), 0 18px 40px -16px rgb(16 24 32 / 0.25)",
        opacity: Math.min(1, card * 1.6),
        transform: `translateY(${(1 - card) * -20}px) scale(${0.96 + 0.04 * card})`,
        ...exitStyle(frame, b, 0),
      }}
    >
      <span
        data-anchor="avatar"
        style={{
          borderRadius: 999,
          visibility: frame >= b.travel + b.travelFrames ? "visible" : "hidden",
          boxShadow: `0 0 ${10 + glow * 18}px ${glow * 4}px rgb(53 196 168 / ${glow * 0.55})`,
          transform: `scale(${1 + impulse(frame, b.travel + b.travelFrames, 4) * 0.15})`,
        }}
      >
        <Avatar recruiter={sample.recruiter} size="md" />
      </span>
      <div className="recruiter-text" style={{ flex: 1, ...blurIn(frame, b.header + 6) }}>
        <p className="recruiter-name">
          {sample.recruiter.name}
          <span className="recruiter-role"> · {sample.recruiter.role}</span>
        </p>
        <p className="recruiter-detail">
          {sample.packTitle} · {interviewLanguageName(film)}
        </p>
      </div>
      {/* The progress line rolls like a reel to the follow-up. */}
      <div className="room-progress" style={{ ...blurIn(frame, b.header + 10), height: 24, overflow: "hidden", display: "flex", alignItems: "center", gap: 6 }}>
        <span>{before}</span>
        <span style={{ display: "inline-block", height: 24, overflow: "hidden", width: `${rolled * (after.length * 0.62 + 1.2)}em`, transition: "none" }}>
          <span style={{ display: "inline-block", transform: `translateY(${(1 - rolled) * 100}%)`, color: "var(--accent-text)", fontWeight: 600, whiteSpace: "nowrap" }}>
            · {after}
          </span>
        </span>
      </div>
    </div>
  );
}

/** Camille's question, the candidate's bubble, and the follow-up. */
function Chat({ layout, beats: b, scrollY, anchors }: { layout: ReturnType<typeof layoutFor>; beats: Beats; scrollY: number; anchors: Anchors }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { sample, ui } = film;
  const recruiter = sample.recruiter;
  const asking = frame < b.question;
  const asked = frame >= b.questionEnd;
  const bubble = sp(frame, b.send + 1, { damping: 13, stiffness: 160 });
  const following = frame >= b.followUp;
  const focusOnFollowUp = progress(frame, b.followUp, 14);
  const tag = sp(frame, b.followUp, { damping: 9, stiffness: 220 });
  const tagRect = anchors["follow-up-tag"];
  const behind: CSSProperties = { filter: `blur(${focusOnFollowUp * 2.5}px)`, opacity: 1 - focusOnFollowUp * 0.45 };
  return (
    <div style={{ position: "absolute", left: layout.W / 2 - 360, top: layout.chatTop, width: 720, height: layout.chatBottom - layout.chatTop + 400 }}>
      <ol className="chat" style={{ transform: `translateY(${-scrollY}px)` }}>
        {frame >= b.thinking && (
          <li className="message message-interviewer" data-anchor="question" style={{ ...blurIn(frame, b.thinking), ...behind, ...exitStyle(frame, b, 1) }}>
            <Avatar recruiter={recruiter} />
            <div className="message-body">
              <p className="message-author">{recruiter.name}</p>
              {asking ? (
                <Thinking label={ui.recruiter.thinking(recruiter.name)} frame={frame} />
              ) : (
                <p className={asked ? "message-text" : "message-text streaming"}>
                  <StreamedWords text={streamed(sample.question, frame, b.question, STREAM)} frame={frame} done={asked} />
                </p>
              )}
            </div>
          </li>
        )}
        {frame >= b.send && (
          <li
            className="message message-candidate"
            data-anchor="answer"
            style={{
              opacity: Math.min(1, bubble * 2),
              transform: `translateY(${(1 - bubble) * 160}px) scale(${0.9 + 0.1 * bubble})`,
              transformOrigin: "bottom right",
              ...behind,
              ...exitStyle(frame, b, 2),
            }}
          >
            <div className="message-body">
              <p className="message-text">{sample.answer}</p>
            </div>
          </li>
        )}
        {frame >= b.thinking2 && (
          <li className="message message-interviewer" data-anchor="follow-up" style={{ ...blurIn(frame, b.thinking2), ...exitStyle(frame, b, 3) }}>
            <Avatar recruiter={recruiter} />
            <div className="message-body">
              <p className="message-author">
                {recruiter.name}
                {following && (
                  <span
                    className="message-tag"
                    data-anchor="follow-up-tag"
                    style={{
                      transform: `scale(${tag})`,
                      opacity: Math.min(1, tag * 2),
                      borderColor: "var(--accent)",
                      color: "var(--accent-text)",
                      background: "var(--accent-soft)",
                    }}
                  >
                    {ui.common.followUp}
                  </span>
                )}
              </p>
              {following ? (
                <p className={frame >= b.followUpEnd ? "message-text" : "message-text streaming"} style={{ fontSize: "1.06em" }}>
                  <StreamedWords text={streamed(sample.followUp, frame, b.followUp, STREAM)} frame={frame} done={frame >= b.followUpEnd} />
                </p>
              ) : (
                <Thinking label={ui.recruiter.thinking(recruiter.name)} frame={frame} />
              )}
            </div>
          </li>
        )}
      </ol>
      {tagRect && (
        <Bloom frame={frame} at={b.followUp} x={tagRect.x + tagRect.w / 2 - (layout.W / 2 - 360)} y={tagRect.y + tagRect.h / 2 - layout.chatTop - scrollY} size={240} color="rgb(53 196 168 / 0.55)" duration={20} />
      )}
    </div>
  );
}

/** Streamed text whose newest words fade in from a blur, as the app's smooth streaming does. */
function StreamedWords({ text, frame, done }: { text: string; frame: number; done: boolean }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, index) => {
        // The last two words are still arriving.
        const age = words.length - 1 - index;
        const t = done || age >= 2 ? 1 : age === 1 ? 0.7 : 0.35 + 0.1 * (frame % 2);
        return (
          <span key={index} style={{ opacity: t, filter: `blur(${(1 - t) * 3}px)` }}>
            {word}
            {index < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
}

function Thinking({ label, frame }: { label: string; frame: number }) {
  return (
    <p className="message-waiting">
      <span className="ui-thinking">
        <span className="ui-thinking-label" style={{ "--shimmer": `${100 - ((frame / 26) % 1) * 100}%` } as CSSProperties}>
          {label}
        </span>
      </span>
    </p>
  );
}

/** The answer box, floating at the bottom: the answer is typed, then sent. */
function Composer({ layout, beats: b }: { layout: ReturnType<typeof layoutFor>; beats: Beats }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { ui, sample } = film;
  const appear = sp(frame, b.header + 8, { damping: 15, stiffness: 140 });
  const composing = frame >= b.typing && frame < b.send;
  const draft = composing ? typed(sample.answer, frame, b.typing, TYPE) : "";
  const thinking = (frame >= b.thinking && frame < b.questionEnd) || (frame >= b.thinking2 && frame < b.followUpEnd);
  const press = Math.max(0, 1 - Math.abs(frame - b.send + 1) / 4);
  const caret = composing && Math.floor(frame / 8) % 2 === 0;
  return (
    <div
      style={{
        position: "absolute",
        left: layout.W / 2 - 360,
        top: layout.composerTop,
        width: 720,
        opacity: Math.min(1, appear * 1.5),
        transform: `translateY(${(1 - appear) * 40}px)`,
        ...exitStyle(frame, b, 4),
      }}
    >
      <div className={`composer${composing ? " is-focused" : ""}`}>
        <div className="mr-textarea" style={{ minHeight: 52 }}>
          {draft === "" ? (
            <span className="mr-placeholder">{thinking ? ui.recruiter.thinking(sample.recruiter.name) : ui.room.typeAnswer}</span>
          ) : (
            <>
              {draft}
              {caret && <span className="mr-caret" />}
            </>
          )}
        </div>
        <div className="composer-bar">
          <ModelButton model={sample.model} />
          <span style={{ display: "inline-flex", transform: `scale(${1 - press * 0.14})` }}>
            <IconButton variant="primary" label={ui.room.send} icon={<ArrowUpIcon />} disabled={draft.trim() === ""} />
          </span>
        </div>
      </div>
    </div>
  );
}

/** The teal frame left by part 2 closes into a disc, which becomes Camille's avatar and flies into the header. */
function Iris({
  beats: b,
  anchors,
  camera,
  scale,
}: {
  beats: Beats;
  anchors: Anchors;
  camera: Camera;
  scale: number;
}) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u, width, height } = film;
  if (frame >= b.travel + b.travelFrames + 1) return null;
  const close = progress(frame, b.iris, b.irisFrames, Easing.bezier(0.7, 0, 0.2, 1));
  const big = Math.hypot(width, height) * 1.2;
  const centreSize = 240 * u;
  // Where the header's avatar sits on screen (the camera is still wide here).
  const avatar = anchors.avatar;
  const zoom = scale * camera.s;
  const target = avatar
    ? {
        x: (avatar.x + avatar.w / 2 - camera.x) * zoom + width / 2,
        y: (avatar.y + avatar.h / 2 - camera.y) * zoom + height / 2,
        size: avatar.w * zoom,
      }
    : { x: width / 2 - 300 * u, y: 200 * u, size: 64 * u };
  const travel = progress(frame, b.travel, b.travelFrames, Easing.bezier(0.65, 0, 0.25, 1));
  const size = travel > 0 ? mix(centreSize, target.size, travel) : mix(big, centreSize, close);
  const x = mix(width / 2, target.x, travel);
  // An arc: up first, then across.
  const y = mix(height / 2, target.y, travel) - Math.sin(travel * Math.PI) * 60 * u;
  const letter = sp(frame, b.letter, { damping: 10, stiffness: 200 });
  const color = interpolateColors(progress(frame, b.letter, 14), [0, 1], [stage.accentDeep, "#e2f1ed"]);
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "grid",
        placeItems: "center",
        boxShadow: `0 ${20 * u}px ${50 * u}px rgb(11 122 102 / ${0.25 * close})`,
        zIndex: 5,
      }}
    >
      <span
        style={{
          fontFamily: "system-ui, 'Segoe UI', sans-serif",
          fontWeight: 600,
          fontSize: size * 0.42,
          color: "#075a4b",
          transform: `scale(${letter})`,
          opacity: Math.min(1, letter * 2),
        }}
      >
        {film.sample.recruiter.name.charAt(0)}
      </span>
    </div>
  );
}

