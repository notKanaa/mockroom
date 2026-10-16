// Part 5, your AI and the call to action, on a dark stage, in the app's dark theme:
//   "Pick your AI." slams in, then rises to a caption → the four providers deal in,
//   each with its logo, as in Settings → a glowing selection lands on OpenAI, a key
//   is typed (masked), tested, connected; the note says it stays on your machine and
//   only goes to its provider → the selection hops to Anthropic and Gemini → it
//   lands on Ollama: no key, a local model, offline → everything implodes into
//   127.0.0.1 → that pill stretches into a terminal, `npx mockroom`, Enter → the
//   terminal is knocked away, the mark docks and the name drops letter by letter,
//   then the tagline, the command and the repository.

import { CameraMotionBlur } from "@remotion/motion-blur";
import { noise2D } from "@remotion/noise";
import { useState, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { ProviderIcon } from "../../../src/ui/ProviderIcons";
import { UiViewport, type Anchors } from "../components/UiViewport";
import { FilmProvider, useFilm, type Film, type FilmProps } from "../lib/film";
import { easeIn, easeInOut, easeOut, mix, progress, typed } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { Bloom, BlurWords, Grain, impulse, Letters, Streak, useSpring, Vignette } from "./fx";
import { p5, PART5_FRAMES } from "./beats";
import { FilePill } from "./Part4";
import { part5Sound } from "./cues";
import { SoundTrack } from "./sound";

const providers = [
  { id: "openai", label: "OpenAI", key: "sk-proj-", tail: "3f9a", model: "gpt-5-mini" },
  { id: "anthropic", label: "Anthropic", key: "sk-ant-", tail: "q7Lw", model: "claude-haiku" },
  { id: "gemini", label: "Gemini", key: "AIza", tail: "c2Xe", model: "gemini-flash" },
  { id: "ollama", label: "Ollama", key: "", tail: "", model: "llama3.2" },
] as const;

export function Part5Composition(props: FilmProps) {
  return (
    <FilmProvider value={props}>
      <Part5 />
      <SoundTrack cues={part5Sound} gain={1.2} />
    </FilmProvider>
  );
}

const within = (frame: number, at: number, length: number) => frame >= at && frame < at + length;

export function Part5() {
  const frame = useCurrentFrame();
  const fast =
    within(frame, p5.title, 8) ||
    within(frame, p5.titleUp, 14) ||
    within(frame, p5.cards, 14) ||
    p5.pick.some((at) => within(frame, at, 8)) ||
    within(frame, p5.implode, p5.implodeFrames + 4) ||
    within(frame, p5.terminal, p5.terminalFrames) ||
    within(frame, p5.enter, 30);
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
  const finale = progress(frame, p5.mark, 30);
  const blobs = [
    { x: 0.5, y: 0.5, size: 1400, color: `rgb(53 196 168 / ${0.1 + finale * 0.12})` },
    { x: 0.15, y: 0.2, size: 1000, color: "rgb(111 183 255 / 0.10)" },
    { x: 0.85, y: 0.9, size: 1100, color: "rgb(53 196 168 / 0.09)" },
  ];
  return (
    <AbsoluteFill>
      {blobs.map((blob, index) => {
        const size = blob.size * u;
        const x = blob.x * width + noise2D(`px${index}`, frame * 0.005, 0) * 160 * u;
        const y = blob.y * height + noise2D(`py${index}`, 0, frame * 0.005) * 110 * u;
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
  const scale = (film.portrait ? 1.2 : film.square ? 1.25 : 1.6) * film.u;
  const W = Math.round(film.width / scale);
  const H = Math.round(film.height / scale);
  return { scale, W, H, cardsTop: H / 2 - 120, panelTop: H / 2 - 20 };
}

function Scene() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height } = film;
  const layout = layoutFor(film);
  const [anchors, setAnchors] = useState<Anchors>({});
  const implode = progress(frame, p5.implode, p5.implodeFrames, Easing.bezier(0.7, 0, 0.3, 1));
  const copy = film.film.privacy;
  return (
    <AbsoluteFill>
      {/* Part 4's file, picked up where it was left, knocked away as the title slams in. */}
      {frame < p5.title + 12 && (
        <FilePill
          y={height / 2 + 90 * u - progress(frame, p5.title, 10, easeIn) * 260 * u}
          scale={1 - progress(frame, p5.title, 10, easeIn) * 0.5}
          night={1}
          opacity={1 - progress(frame, p5.title + 2, 8)}
          blur={progress(frame, p5.title, 10) * 12 * u}
        />
      )}
      <Title />
      {/* The caption under the title changes with each step. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 180 * u,
          textAlign: "center",
          fontFamily: fonts.display,
          fontWeight: 600,
          fontSize: 46 * u,
          letterSpacing: "-0.03em",
          color: stage.text,
        }}
      >
        {frame < p5.ollamaLine + 6 && <BlurWords text={copy.byok} frame={frame} start={p5.byok} exit={p5.ollamaLine - 8} />}
        {frame >= p5.ollamaLine && frame < p5.implode + 10 && (
          <span style={{ color: stage.accent }}>
            <BlurWords text={copy.ollama} frame={frame} start={p5.ollamaLine} exit={p5.implode - 4} />
          </span>
        )}
      </div>

      {frame < p5.implode + p5.implodeFrames + 2 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: `${width / 2}px ${height / 2 + 60 * u}px`,
            transform: `scale(${1 - implode * 0.95}) rotate(${implode * 8}deg)`,
            filter: `blur(${implode * 8}px)`,
            opacity: 1 - progress(frame, p5.implode + 8, 8),
          }}
        >
          <UiViewport width={layout.W} height={layout.H} scale={layout.scale} theme="dark" transparent onAnchors={setAnchors}>
            <Providers layout={layout} anchors={anchors} />
            <Panel layout={layout} />
          </UiViewport>
        </div>
      )}

      <LocalPill />
      <Terminal />
      <Finale />
    </AbsoluteFill>
  );
}

/** "Pick your AI.": slams in big, then rises and shrinks into the title above the cards. */
function Title() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u, height } = film;
  const up = sp(frame, p5.titleUp, { damping: 16, stiffness: 120 });
  const leave = progress(frame, p5.implode - 6, 12, easeIn);
  if (frame >= p5.implode + 8) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: mix(height / 2 - 120 * u, 70 * u, up),
        textAlign: "center",
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: mix(220, 92, up) * u,
        letterSpacing: "-0.05em",
        lineHeight: 1,
        color: stage.text,
        opacity: 1 - leave,
        filter: `blur(${leave * 12}px)`,
        whiteSpace: "nowrap",
      }}
    >
      <Letters
        text={film.film.privacy.title}
        letter={(index) => {
          const slam = sp(frame, p5.title + index * 0.8, { damping: 13, stiffness: 240, mass: 0.6 });
          return { transform: `scale(${mix(2.6, 1, slam)})`, opacity: Math.min(1, slam * 3) };
        }}
      />
    </div>
  );
}

/** Which provider is picked at a frame. */
function picked(frame: number): number {
  let index = -1;
  p5.pick.forEach((at, order) => {
    if (frame >= at) index = order;
  });
  return index;
}

/** The four providers, as in Settings, each with its logo, and a glowing selection that hops between them. */
function Providers({ layout, anchors }: { layout: ReturnType<typeof layoutFor>; anchors: Anchors }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { ui } = film;
  const current = picked(frame);
  // The selection slides from card to card, with a spring.
  const slots = providers.map((_, index) => anchors[`card-${index}`]);
  const settle = current >= 0 ? sp(frame, p5.pick[current]!, { damping: 15, stiffness: 200 }) : 0;
  const from = current > 0 ? slots[current - 1] : slots[0];
  const to = current >= 0 ? slots[current] : undefined;
  const select = to && from ? { x: mix(from.x, to.x, settle), y: to.y, w: mix(from.w, to.w, settle), h: to.h } : undefined;
  const appear = current === 0 ? Math.min(1, settle * 2) : 1;
  return (
    <div style={{ position: "absolute", left: layout.W / 2 - 400, top: layout.cardsTop, width: 800 }}>
      <div className="providers" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {providers.map((provider, index) => {
          const deal = sp(frame, p5.cards + index * 3, { damping: 13, stiffness: 150 });
          const chosen = index === current;
          return (
            <div
              key={provider.id}
              data-anchor={`card-${index}`}
              className={`provider${chosen ? " provider-chosen" : ""}`}
              style={{
                gridTemplateColumns: "auto 1fr",
                gap: "0 14px",
                padding: "16px 18px",
                opacity: Math.min(1, deal * 2),
                transform: `perspective(800px) rotateY(${(1 - deal) * 80}deg) translateY(${(1 - deal) * 30}px)`,
                transformOrigin: "0% 50%",
              }}
            >
              <span className="mr-logo" style={{ gridRow: "span 2", width: 30, height: 30, color: chosen ? "var(--accent)" : "var(--text)" }}>
                <ProviderIcon provider={provider.id} />
              </span>
              <span className="provider-name" style={{ fontSize: 16 }}>
                {provider.label}
              </span>
              <span className="provider-note">{provider.id === "ollama" ? ui.settings.freeLocal : ui.settings.yourKey}</span>
            </div>
          );
        })}
      </div>
      {select && (
        <div
          style={{
            position: "absolute",
            left: select.x - (layout.W / 2 - 400),
            top: select.y - layout.cardsTop,
            width: select.w,
            height: select.h,
            borderRadius: 12,
            border: "2px solid var(--accent)",
            boxShadow: "0 0 30px rgb(53 196 168 / 0.45), inset 0 0 20px rgb(53 196 168 / 0.15)",
            opacity: appear,
            pointerEvents: "none",
          }}
        />
      )}
      {to && (
        <Bloom
          frame={frame}
          at={p5.pick[current]!}
          x={to.x + to.w / 2 - (layout.W / 2 - 400)}
          y={to.y + to.h / 2 - layout.cardsTop}
          size={260}
          color="rgb(53 196 168 / 0.45)"
          duration={16}
        />
      )}
    </div>
  );
}

/** Under the cards: the key field for a keyed provider (typed, tested, connected), or Ollama's local model, offline. */
function Panel({ layout }: { layout: ReturnType<typeof layoutFor> }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { ui } = film;
  const copy = film.film.privacy;
  const current = picked(frame);
  const open = sp(frame, p5.key - 6, { damping: 15, stiffness: 140 });
  if (frame < p5.key - 8) return null;
  const provider = providers[Math.max(0, current)]!;
  const keyed = provider.id !== "ollama";
  const keyStart = current <= 0 ? p5.key : p5.pick[current]! + 2;
  const masked = `${provider.key}${"•".repeat(14)}${provider.tail}`;
  const shown = typed(masked, frame, keyStart, current <= 0 ? 0.9 : 2.2);
  const typing = shown.length < masked.length;
  const press = Math.max(0, 1 - Math.abs(frame - p5.test - 2) / 4);
  const connected = current === 0 && frame >= p5.connected ? sp(frame, p5.connected, { damping: 11, stiffness: 200 }) : 0;
  const swap = progress(frame, p5.ollama - 2, 10, easeInOut);
  const offline = sp(frame, p5.ollama + 14, { damping: 10, stiffness: 200 });
  const field: CSSProperties = {
    display: "flex",
    alignItems: "center",
    height: 40,
    padding: "0 12px",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-sm)",
    background: "var(--bg)",
    fontFamily: fonts.mono,
    fontSize: 15,
    flex: 1,
  };
  return (
    <div
      className="ui-card"
      style={{
        position: "absolute",
        left: layout.W / 2 - 400,
        top: layout.panelTop,
        width: 800,
        height: 164,
        overflow: "hidden",
        opacity: Math.min(1, open * 2),
        transform: `translateY(${(1 - open) * 40}px)`,
        boxShadow: "0 30px 60px -20px rgb(0 0 0 / 0.6)",
      }}
    >
      {/* A keyed provider: the key, masked, tested. */}
      <div style={{ position: "absolute", inset: 20, display: "flex", flexDirection: "column", gap: 12, opacity: 1 - swap, filter: `blur(${swap * 8}px)` }}>
        <p className="field-label">{ui.settings.apiKey(provider.label)}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ ...field, borderColor: typing ? "var(--accent)" : "var(--line)" }}>
            {shown}
            {typing && <span className="mr-caret" />}
          </div>
          <span style={{ display: "inline-flex", transform: `scale(${1 - press * 0.08})` }}>
            <button type="button" className="ui-button ui-button-secondary ui-button-md">
              {ui.settings.test}
            </button>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 34 }}>
          {connected > 0 && (
            <span
              className="test-result status-ok"
              style={{ padding: "6px 12px", transform: `scale(${connected})`, transformOrigin: "0 50%", opacity: Math.min(1, connected * 2) }}
            >
              ✓ {copy.connected} · {provider.model}
            </span>
          )}
          <span className="ui-hint" style={{ opacity: progress(frame, p5.connected + 6, 10), color: "var(--accent-text)", fontSize: 15, fontWeight: 600 }}>
            {copy.keyNote}
          </span>
        </div>
      </div>
      {/* Ollama: no key, a model on this computer, offline. */}
      {!keyed || swap > 0 ? (
        <div style={{ position: "absolute", inset: 20, display: "flex", flexDirection: "column", gap: 12, opacity: swap, filter: `blur(${(1 - swap) * 8}px)` }}>
          <p className="field-label">{ui.settings.model}</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={field}>
              <span className="mr-logo" style={{ width: 18, height: 18, marginRight: 10 }}>
                <ProviderIcon provider="ollama" />
              </span>
              llama3.2
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 40,
                padding: "0 14px",
                borderRadius: 999,
                background: "var(--accent-soft)",
                color: "var(--accent-text)",
                fontWeight: 600,
                fontSize: 14,
                transform: `scale(${offline})`,
                opacity: Math.min(1, offline * 2),
              }}
            >
              <WifiOff />
              {copy.offline}
            </span>
          </div>
          <p className="ui-hint">{ui.settings.freeLocal}</p>
        </div>
      ) : null}
    </div>
  );
}

const WifiOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2.1-1.6M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 4.6M12 20h.01" />
  </svg>
);

const LockIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stage.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="11" width="16" height="10" rx="2.5" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const GitHubIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={stage.text}>
    <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z" />
  </svg>
);

/** The terminal's frame: the 127.0.0.1 pill stretches into it. Shared by LocalPill and Terminal. */
function terminalRect(film: Film, frame: number) {
  const { u, width, height } = film;
  const stretch = progress(frame, p5.terminal, p5.terminalFrames, Easing.bezier(0.75, 0, 0.15, 1));
  const pill = { x: width / 2, y: height / 2 + 40 * u, w: 420 * u, h: 96 * u };
  const box = { x: width / 2, y: height / 2 + 20 * u, w: 760 * u, h: 140 * u };
  return {
    stretch,
    x: mix(pill.x, box.x, stretch),
    y: mix(pill.y, box.y, stretch),
    w: mix(pill.w, box.w, stretch),
    h: mix(pill.h, box.h, stretch),
    radius: mix(pill.h / 2, 30 * u, stretch),
  };
}

/** Everything implodes into the local address: no account, your interviews stay here. */
function LocalPill() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u, width, height } = film;
  if (frame < p5.pill || frame >= p5.knock + 20) return null;
  const pop = sp(frame, p5.pill, { damping: 10, stiffness: 200 });
  const rect = terminalRect(film, frame);
  const knocked = progress(frame, p5.knock, 16, Easing.bezier(0.6, 0, 1, 0.6));
  const squash = impulse(frame, p5.enter, 4);
  const textIn = 1 - rect.stretch;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: rect.x - rect.w / 2,
          top: rect.y - rect.h / 2 + knocked * height * 0.8,
          width: rect.w,
          height: rect.h,
          borderRadius: rect.radius,
          background: "linear-gradient(160deg, rgb(255 255 255 / 0.09), rgb(255 255 255 / 0.03))",
          border: `${1.5 * u}px solid rgb(53 196 168 / ${0.4 + squash * 0.6})`,
          boxShadow: `0 ${30 * u}px ${80 * u}px rgb(0 0 0 / 0.6), 0 0 ${(40 + squash * 140) * u}px rgb(53 196 168 / ${0.25 + squash * 0.4})`,
          transform: `scale(${pop * (1 + squash * 0.05)}, ${pop * (1 - squash * 0.12)}) rotate(${knocked * 14}deg)`,
          filter: `blur(${knocked * 10}px)`,
          opacity: 1 - knocked,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16 * u,
            fontFamily: fonts.mono,
            fontSize: 40 * u,
            color: stage.accent,
            opacity: textIn,
          }}
        >
          <LockIcon size={40 * u} />
          {film.film.privacy.local}
        </div>
      </div>
      <Bloom frame={frame} at={p5.pill} x={width / 2} y={height / 2 + 40 * u} size={700 * u} color="rgb(53 196 168 / 0.45)" duration={22} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: height / 2 - 120 * u,
          textAlign: "center",
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 56 * u,
          letterSpacing: "-0.035em",
          color: stage.text,
        }}
      >
        <BlurWords text={film.film.privacy.noAccount} frame={frame} start={p5.noAccount + 6} exit={p5.terminal - 6} stagger={1.6} />
      </div>
    </>
  );
}

/** The command typed into the terminal, and the hit of Enter. */
function Terminal() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, height } = film;
  if (frame < p5.terminal + 8 || frame >= p5.knock + 20) return null;
  const rect = terminalRect(film, frame);
  const copy = film.film.cta;
  const command = typed(copy.command, frame, p5.typing, 0.55);
  const caret = command.length < copy.command.length || Math.floor(frame / 9) % 2 === 0;
  const knocked = progress(frame, p5.knock, 16, Easing.bezier(0.6, 0, 1, 0.6));
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: rect.x - rect.w / 2,
          top: rect.y - rect.h / 2 + knocked * height * 0.8,
          width: rect.w,
          height: rect.h,
          display: "flex",
          alignItems: "center",
          gap: 24 * u,
          padding: `0 ${48 * u}px`,
          fontFamily: fonts.mono,
          fontSize: 64 * u,
          color: stage.text,
          opacity: progress(frame, p5.terminal + 8, 8) * (1 - knocked),
          transform: `rotate(${knocked * 14}deg)`,
          filter: `blur(${knocked * 10}px)`,
        }}
      >
        <span style={{ color: stage.accent }}>$</span>
        <span style={{ whiteSpace: "pre" }}>
          {command}
          <span style={{ display: "inline-block", width: "0.55ch", height: "1em", marginLeft: 6 * u, verticalAlign: "text-bottom", background: stage.accent, opacity: caret ? 1 : 0 }} />
        </span>
      </div>
      <Streak frame={frame} at={p5.enter} x={rect.x} y={rect.y} length={2000 * u} thickness={6 * u} color="rgb(53 196 168 / 0.9)" duration={18} />
      <Bloom frame={frame} at={p5.enter} x={rect.x} y={rect.y} size={1300 * u} color="rgb(53 196 168 / 0.4)" duration={24} />
    </>
  );
}

/** The end card: the mark docks, the name drops letter by letter, then the tagline, the command and the repository. */
function Finale() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { u, width, height } = film;
  if (frame < p5.mark - 4) return null;
  const copy = film.film.cta;
  const fit = film.portrait ? 0.55 : film.square ? 0.7 : 1;
  const size = 96 * u * fit;
  const offset = size * 0.375;
  const dock = sp(frame, p5.mark, { damping: 11, stiffness: 160 });
  const ringIn = sp(frame, p5.mark - 4, { damping: 10, stiffness: 180 });
  const push = 1 + 0.03 * progress(frame, p5.mark, PART5_FRAMES - p5.mark, easeInOut);
  const footer = sp(frame, p5.footer, { damping: 14, stiffness: 150 });
  const lockupY = height / 2 - 190 * u * fit;
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: lockupY, display: "flex", justifyContent: "center", alignItems: "center", gap: 40 * u * fit }}>
        <div style={{ position: "relative", width: size + offset, height: size, flex: "none" }}>
          <div
            style={{
              position: "absolute",
              left: mix(-width / 2, 0, dock),
              top: 0,
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
              left: offset,
              top: 0,
              width: size,
              height: size,
              borderRadius: "50%",
              border: `${(size * 2) / 16}px solid ${stage.text}`,
              transform: `scale(${ringIn})`,
            }}
          />
        </div>
        <Letters
          text={film.film.answer.name}
          style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 200 * u * fit, letterSpacing: "-0.055em", lineHeight: 1, color: stage.text }}
          letter={(index) => {
            const land = sp(frame, p5.name + index * 1.4, { damping: 12, stiffness: 190 });
            return { transform: `translateY(${(1 - land) * -120}%) rotate(${(1 - land) * -12}deg)`, opacity: Math.min(1, land * 2) };
          }}
        />
      </div>
      <Bloom frame={frame} at={p5.mark + 8} x={width / 2 - 300 * u * fit} y={lockupY + size / 2} size={800 * u} color="rgb(53 196 168 / 0.5)" duration={26} />
      <Streak frame={frame} at={p5.mark + 8} x={width / 2} y={lockupY + size / 2} length={1600 * u} thickness={4 * u} color="rgb(53 196 168 / 0.8)" duration={20} />

      <div
        style={{
          position: "absolute",
          left: 80 * u,
          right: 80 * u,
          top: height / 2 + 50 * u * fit,
          textAlign: "center",
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 64 * u * fit,
          letterSpacing: "-0.04em",
          color: stage.text,
        }}
      >
        <BlurWords text={copy.tagline} frame={frame} start={p5.tagline} stagger={2.2} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: height / 2 + 190 * u * fit,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 28 * u,
          opacity: Math.min(1, footer * 2),
          transform: `translateY(${(1 - footer) * 40 * u}px)`,
        }}
      >
        <Chip u={u} fit={fit}>
          <span style={{ color: stage.accent }}>$</span> {copy.command}
        </Chip>
        <Chip u={u} fit={fit}>
          <GitHubIcon size={30 * u * fit} />
          {copy.url}
        </Chip>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: height / 2 + 300 * u * fit,
          textAlign: "center",
          fontFamily: fonts.mono,
          fontSize: 28 * u * fit,
          letterSpacing: "0.04em",
          color: stage.muted,
          opacity: progress(frame, p5.license, 14, easeOut),
        }}
      >
        {copy.license}
      </div>
    </AbsoluteFill>
  );
}

function Chip({ u, fit, children }: { u: number; fit: number; children: ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14 * u,
        padding: `${16 * u * fit}px ${30 * u * fit}px`,
        borderRadius: 999,
        background: "rgb(255 255 255 / 0.06)",
        border: `${1.5 * u}px solid rgb(255 255 255 / 0.12)`,
        fontFamily: fonts.mono,
        fontSize: 32 * u * fit,
        color: stage.text,
        whiteSpace: "pre",
      }}
    >
      {children}
    </div>
  );
}
