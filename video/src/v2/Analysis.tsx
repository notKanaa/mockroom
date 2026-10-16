// The second half of part 2: Mockroom's pieces floating on their own, in depth.
//   the toggle's knob morphs into the prompt box → the job offer's words fade in
//   from a blur → an AI glow runs around the box while it reads → the technologies
//   are marked, lift off the text towards the camera, and drop into their card →
//   the start button swells to fill the frame.

import { noise2D } from "@remotion/noise";
import { useState, type CSSProperties } from "react";
import { AbsoluteFill, Easing, interpolateColors, useCurrentFrame } from "remotion";
import { ArrowUpIcon, PlusIcon } from "../../../src/ui/Icons";
import { Button, Card, IconButton } from "../../../src/ui/kit";
import { UiViewport, centre, type Anchors, type Camera } from "../components/UiViewport";
import { useFilm, type Film } from "../lib/film";
import { easeOut, keyframes, mix, progress } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { LanguageButton, ModelButton, splitTerms } from "../ui/Screens";
import { p2 } from "./beats";
import { Bloom, BlurWords, impulse, useSpring } from "./fx";

type Layout = ReturnType<typeof analysisLayout>;

/** The UI's scale in the film, and its own size in CSS pixels. */
function analysisLayout(film: Film) {
  const scale = (film.portrait ? 1.2 : film.square ? 1.25 : 1.6) * film.u;
  const W = Math.round(film.width / scale);
  const H = Math.round(film.height / scale);
  return { scale, W, H, promptTop: H / 2 - 140, cardTop: H / 2 - 178, summaryTop: H - 96 };
}

/** Where the toggle's knob is on screen once switched, as the Languages claim draws it. */
export function knobRect(film: Film) {
  const { u, width, height } = film;
  const fit = film.portrait ? 0.6 : film.square ? 0.72 : 1;
  const f = u * fit;
  return { x: width / 2 + 72 * f, y: height / 2 + 123 * f, w: 144 * f, h: 84 * f };
}

/** A soft mesh of coloured light drifting behind the product, fading in from a frame on. */
export function Mesh({ from = p2.morph }: { from?: number }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height } = film;
  const show = progress(frame, from, 30, easeOut);
  if (show <= 0) return null;
  const blobs = [
    { x: 0.22, y: 0.3, size: 1100, color: "rgb(53 196 168 / 0.30)" },
    { x: 0.8, y: 0.25, size: 1000, color: "rgb(111 183 255 / 0.20)" },
    { x: 0.7, y: 0.85, size: 1200, color: "rgb(240 182 96 / 0.22)" },
    { x: 0.15, y: 0.9, size: 900, color: "rgb(155 232 214 / 0.35)" },
  ];
  return (
    <AbsoluteFill style={{ opacity: show }}>
      {blobs.map((blob, index) => {
        const x = blob.x * width + noise2D(`mx${index}`, frame * 0.006, 0) * 160 * u;
        const y = blob.y * height + noise2D(`my${index}`, 0, frame * 0.006) * 120 * u;
        const size = blob.size * u;
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
              filter: `blur(${50 * u}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

export function Analysis() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u } = film;
  const layout = analysisLayout(film);
  const { W, H, scale } = layout;
  const [anchors, setAnchors] = useState<Anchors>({});
  const promptCentre = centre(anchors, "prompt", { x: W / 2, y: layout.promptTop + 90 });

  // A slow dolly: in on the box while the AI reads, back out for the cards.
  const camera: Camera = keyframes(frame, [
    { f: p2.morph + p2.morphFrames, v: { x: W / 2, y: H / 2, s: 1 } },
    { f: p2.send, v: { x: W / 2, y: promptCentre.y, s: 1.06 } },
    { f: p2.marks[2]! + 8, v: { x: W / 2, y: promptCentre.y, s: 1.12 } },
    { f: p2.card + 12, v: { x: W / 2, y: H / 2, s: 1 } },
    { f: p2.burst, v: { x: W / 2, y: H / 2 + 20, s: 1.04 } },
  ]);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: (film.portrait ? 220 : 60) * u,
          textAlign: "center",
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: (film.portrait ? 80 : film.square ? 64 : 70) * u,
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          color: stage.paperText,
          padding: `0 ${80 * u}px`,
        }}
      >
        {frame < p2.lift[0]! + 10 && <BlurWords text={film.film.demo.paste} frame={frame} start={p2.caption1} exit={p2.lift[0]! - 4} />}
        {frame >= p2.caption2 && <BlurWords text={film.film.demo.reads} frame={frame} start={p2.caption2} exit={p2.burst + 2} />}
      </div>

      <UiViewport width={W} height={H} scale={scale} camera={camera} onAnchors={setAnchors} transparent>
        <PromptLayer layout={layout} anchors={anchors} />
        <CardLayer layout={layout} />
        <LiftingChips layout={layout} anchors={anchors} />
        <StartBurst layout={layout} anchors={anchors} />
      </UiViewport>

      <Morph scale={scale} anchors={anchors} />
    </AbsoluteFill>
  );
}

/** The toggle's knob stretching into the prompt box: the same object with a new job. */
function Morph({ scale, anchors }: { scale: number; anchors: Anchors }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u } = film;
  if (frame >= p2.prompt + 12) return null;
  const from = knobRect(film);
  const prompt = anchors.prompt;
  const to = prompt
    ? { x: (prompt.x + prompt.w / 2) * scale, y: (prompt.y + prompt.h / 2) * scale, w: prompt.w * scale, h: prompt.h * scale }
    : { x: film.width / 2, y: film.height / 2, w: 1152 * u, h: 300 * u };
  const ease = Easing.bezier(0.75, 0, 0.15, 1);
  const m = progress(frame, p2.morph, p2.morphFrames, ease);
  // It stretches wide first, then tall: a little anticipation in the shape.
  const mw = progress(frame, p2.morph, p2.morphFrames * 0.75, ease);
  const w = mix(from.w, to.w, mw);
  const h = mix(from.h, to.h, m);
  const x = mix(from.x, to.x, m);
  const y = mix(from.y, to.y, m);
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        borderRadius: mix(from.h / 2, 16 * scale, m),
        background: interpolateColors(m, [0, 0.55, 1], [stage.accentDeep, "#8fd8c9", "#ffffff"]),
        boxShadow: `0 ${mix(4, 40, m) * u}px ${mix(12, 90, m) * u}px rgb(16 24 32 / ${mix(0.3, 0.16, m)})`,
        opacity: 1 - progress(frame, p2.prompt + 2, 8),
      }}
    />
  );
}

function PromptLayer({ layout, anchors }: { layout: Layout; anchors: Anchors }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { W, promptTop } = layout;
  if (frame >= p2.card + 20) return null;
  const shown = progress(frame, p2.prompt, 8);
  const tilt = 1 - progress(frame, p2.prompt, 40, easeOut);
  const recede = progress(frame, p2.recede, 26, Easing.bezier(0.5, 0, 0.3, 1));
  const glow = progress(frame, p2.glow, 8) * (1 - progress(frame, p2.lift[0]!, 12));
  const conic = `conic-gradient(from ${(frame - p2.glow) * 9}deg, #35c4a8, #9be8d6, #f0b660, #6fb7ff, #35c4a8)`;
  const press = Math.max(0, 1 - Math.abs(frame - p2.send - 2) / 4);
  const reading = frame >= p2.send + 2 && frame < p2.lift[0]!;
  const sheen = frame >= p2.sheen && frame < p2.lift[0]! ? ((frame - p2.sheen) / 24) % 1 : -1;
  const send = centre(anchors, "send", { x: 0, y: 0 });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: W / 2 - 360,
          top: promptTop,
          width: 720,
          opacity: shown * (1 - recede),
          filter: `blur(${recede * 6}px)`,
          transform: `perspective(1600px) translateY(${recede * 70}px) scale(${1 - recede * 0.12}) rotateX(${tilt * 12}deg)`,
          transformOrigin: "50% 0%",
        }}
      >
        {/* The AI glow: a turning gradient rim, and its soft halo. */}
        <div style={{ position: "absolute", inset: -16, borderRadius: 30, background: conic, filter: "blur(22px)", opacity: glow * 0.75 }} />
        <div style={{ position: "absolute", inset: -3, borderRadius: 19, background: conic, opacity: glow }} />
        <form className={`prompt${frame >= p2.prompt && frame < p2.send ? " is-focused" : ""}`} style={{ marginTop: 0, zIndex: 1 }} data-anchor="prompt">
          <div className="mr-textarea" style={{ position: "relative", minHeight: 132, overflow: "hidden" }}>
            <OfferText />
            {sheen >= 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${-40 + sheen * 180}%`,
                  width: "40%",
                  background: "linear-gradient(100deg, transparent, rgb(53 196 168 / 0.22), transparent)",
                  filter: "blur(6px)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
          <div className="prompt-bar">
            <ModelButton model={film.sample.model} />
            <LanguageButton content={film} />
            {reading && (
              <span className="prompt-status">
                <span className="ui-thinking">
                  <span
                    className="ui-thinking-label"
                    style={{ "--shimmer": `${100 - (((frame - p2.send) / 26) % 1) * 100}%` } as CSSProperties}
                  >
                    {film.ui.setup.detecting}
                  </span>
                </span>
              </span>
            )}
            <span
              data-anchor="send"
              style={{ marginLeft: reading ? 0 : "auto", display: "inline-flex", transform: `scale(${1 - press * 0.14})` }}
            >
              <IconButton
                variant="primary"
                label={film.ui.home.submit}
                icon={<ArrowUpIcon />}
                disabled={frame < p2.words || frame >= p2.send + 2}
              />
            </span>
          </div>
        </form>
      </div>
      <Bloom frame={frame} at={p2.send} x={send.x} y={send.y} size={260} color="rgb(53 196 168 / 0.55)" duration={16} />
    </>
  );
}

/** The job offer, its words fading in from a blur; the technologies marked, then left as ghosts once they lift. */
function OfferText() {
  const frame = useCurrentFrame();
  const film = useFilm();
  if (frame < p2.words) return <span className="mr-placeholder">{film.ui.home.placeholder}</span>;
  const terms = film.sample.technologies.map((technology) => technology.name);
  let word = 0;
  const reveal = (): CSSProperties => {
    const t = Math.min(1, Math.max(0, (frame - p2.words - word / p2.wordsPerFrame) / 8));
    word++;
    const e = 1 - (1 - t) ** 3;
    return { opacity: e, filter: `blur(${(1 - e) * 8}px)`, transform: `translateY(${(1 - e) * 6}px)`, display: "inline-block", whiteSpace: "pre" };
  };
  return (
    <span>
      {splitTerms(film.sample.jobOffer, terms).map((part, index) => {
        if (part.term !== undefined) {
          const style = reveal();
          const mark = progress(frame, p2.marks[part.term]!, 9, Easing.bezier(0.5, 0, 0.2, 1));
          const lifted = progress(frame, p2.lift[part.term]!, 6);
          return (
            <span
              key={index}
              data-anchor={`term-${part.term}`}
              style={{
                ...style,
                opacity: (style.opacity as number) * (1 - lifted * 0.7),
                borderRadius: 5,
                padding: "0 2px",
                margin: "0 -2px",
                backgroundImage: "linear-gradient(var(--accent-soft), var(--accent-soft))",
                backgroundRepeat: "no-repeat",
                backgroundSize: `${mark * 100}% 100%`,
                color: mark > 0.5 ? "var(--accent-text)" : undefined,
                fontWeight: mark > 0.5 ? 600 : undefined,
              }}
            >
              {part.text}
            </span>
          );
        }
        return part.text.split(/(\s+)/).map((piece, inner) =>
          piece.trim() === "" ? (
            piece
          ) : (
            <span key={`${index}-${inner}`} style={reveal()}>
              {piece}
            </span>
          ),
        );
      })}
    </span>
  );
}

/** The marked technologies lift off the text towards the camera, hover, then drop into their card. */
function LiftingChips({ layout, anchors }: { layout: Layout; anchors: Anchors }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  return (
    <>
      {film.sample.technologies.map((technology, index) => {
        const liftAt = p2.lift[index]!;
        const dropAt = p2.drop[index]!;
        const landed = dropAt + p2.dropFrames;
        const slot = centre(anchors, `slot-${index}`, { x: layout.W / 2, y: layout.cardTop + 100 });
        if (frame >= landed) {
          return <Bloom key={index} frame={frame} at={landed} x={slot.x} y={slot.y} size={220} color="rgb(53 196 168 / 0.5)" duration={16} />;
        }
        if (frame < liftAt) return null;
        const term = centre(anchors, `term-${index}`, { x: layout.W / 2, y: layout.promptTop + 40 });
        const hover = { x: layout.W / 2 + (index - 1) * 210, y: Math.min(layout.promptTop - 30, layout.cardTop - 46) + Math.sin(frame * 0.15 + index) * 4 };
        const lift = progress(frame, liftAt, p2.liftFrames, Easing.bezier(0.3, 0, 0.15, 1));
        const drop = progress(frame, dropAt, p2.dropFrames, Easing.bezier(0.55, 0, 0.1, 1));
        const from = drop > 0 ? hover : term;
        const to = drop > 0 ? slot : hover;
        const t = drop > 0 ? drop : lift;
        const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) + (drop > 0 ? -40 : -60) };
        const x = (1 - t) ** 2 * from.x + 2 * (1 - t) * t * control.x + t ** 2 * to.x;
        const y = (1 - t) ** 2 * from.y + 2 * (1 - t) * t * control.y + t ** 2 * to.y;
        // Closer to the camera while it hovers: bigger, with a deeper shadow.
        const depth = lift * (1 - drop);
        return (
          <span
            key={index}
            className="chip technology"
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${1 + depth * 0.45}) rotate(${Math.sin(lift * Math.PI) * (index - 1) * 6}deg)`,
              boxShadow: `0 ${4 + depth * 22}px ${10 + depth * 36}px rgb(16 24 32 / ${0.08 + depth * 0.16})`,
              background: "var(--surface)",
              borderColor: depth > 0.3 ? "var(--accent)" : undefined,
              zIndex: 5,
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

/** The detection card and the packs card, built around the landing chips, then the summary bar. */
function CardLayer({ layout }: { layout: Layout }) {
  const frame = useCurrentFrame();
  const film = useFilm();
  const sp = useSpring();
  const { ui, sample } = film;
  if (frame < p2.card - 2) return null;
  const appear = (at: number): CSSProperties => {
    const t = sp(frame, at, { damping: 15, stiffness: 140 });
    const fade = Math.min(1, Math.max(0, (frame - at) / 10));
    return { opacity: fade, filter: `blur(${(1 - fade) * 14}px)`, transform: `translateY(${(1 - t) * 30}px) scale(${0.95 + 0.05 * t})` };
  };
  const landed = (index: number) => frame >= p2.drop[index]! + p2.dropFrames;
  const allLanded = progress(frame, p2.drop[2]! + p2.dropFrames, 10);
  const pack = sp(frame, p2.pack, { damping: 12, stiffness: 170 });
  const summary = sp(frame, p2.summary, { damping: 14, stiffness: 150 });
  const press = Math.max(0, 1 - Math.abs(frame - p2.start - 2) / 4);
  const uncurated = sample.technologies.filter((technology) => !technology.covered).length;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: layout.W / 2 - 360,
          top: layout.cardTop,
          width: 720,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={appear(p2.card)}>
          <Card title={ui.setup.detectedTitle} id="detection" className="detection">
            <p className="field-label">{ui.setup.technologies}</p>
            <ul className="chips chips-start technologies">
              {sample.technologies.map((technology, index) => (
                <li
                  key={technology.name}
                  className="chip technology"
                  data-anchor={`slot-${index}`}
                  style={{
                    opacity: landed(index) ? 1 : 0,
                    transform: `scale(${1 + impulse(frame, p2.drop[index]! + p2.dropFrames, 3) * 0.08})`,
                  }}
                >
                  <span className={`status-dot ${technology.covered ? "status-dot-covered" : "status-dot-uncurated"}`} />
                  {technology.name}
                  <button type="button" className="chip-remove">
                    ×
                  </button>
                </li>
              ))}
              <li style={{ opacity: allLanded }}>
                <form className="technology-add">
                  <input placeholder={ui.setup.addPlaceholder} readOnly />
                </form>
              </li>
            </ul>
            <ul className="legend" style={{ opacity: allLanded }}>
              <li>
                <span className="status-dot status-dot-covered" />
                {ui.setup.legendCovered}
              </li>
              <li>
                <span className="status-dot status-dot-uncurated" />
                {ui.setup.legendUncurated}
              </li>
            </ul>
            <div className="level-row" style={{ opacity: allLanded }}>
              <span className="field-label">{ui.setup.level}</span>
              <span className="ui-dropdown">
                <button type="button" className="ui-dropdown-button">
                  <span className="ui-dropdown-value">{ui.levels.junior}</span>
                </button>
              </span>
            </div>
          </Card>
        </div>
        <div style={appear(p2.card + 6)}>
          <Card title={ui.review.packsTitle} id="packs">
            <ul className="chips chips-start">
              <li className="chip chip-selected" style={{ transform: `translateX(${(1 - pack) * 120}px)`, opacity: Math.min(1, pack * 2) }}>
                {sample.packTitle}
                <button type="button" className="chip-remove">
                  ×
                </button>
              </li>
            </ul>
            <div>
              <Button variant="ghost" size="sm" icon={<PlusIcon />}>
                {ui.review.addPacks}
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: layout.W / 2 - 360,
          top: layout.summaryTop,
          width: 720,
          transform: `translateY(${(1 - summary) * 80}px)`,
          opacity: Math.min(1, summary * 2),
        }}
      >
        <section className="setup-summary" style={{ position: "relative", bottom: 0 }}>
          <div className="setup-summary-text">
            <h2 className="setup-summary-label">{ui.setup.summaryTitle}</h2>
            <p>{[sample.packTitle, ui.setup.uncuratedCount(uncurated)].join(" + ")}</p>
          </div>
          <LanguageButton content={film} />
          <span data-anchor="start" style={{ display: "inline-flex", transform: `scale(${1 - press * 0.1})` }}>
            <Button variant="primary">{ui.setup.start}</Button>
          </span>
        </section>
      </div>
    </>
  );
}

/** The start button swells to fill the frame, into the interview. */
function StartBurst({ layout, anchors }: { layout: Layout; anchors: Anchors }) {
  const frame = useCurrentFrame();
  if (frame < p2.start) return null;
  const button = anchors.start ?? { x: layout.W / 2 - 60, y: layout.summaryTop + 20, w: 120, h: 40 };
  const t = progress(frame, p2.burst, p2.burstFrames, Easing.bezier(0.8, 0, 0.2, 1));
  const margin = 60;
  const left = mix(button.x, -margin, t);
  const top = mix(button.y, -margin, t);
  const right = mix(button.x + button.w, layout.W + margin, t);
  const bottom = mix(button.y + button.h, layout.H + margin, t);
  return (
    <>
      <Bloom frame={frame} at={p2.start} x={button.x + button.w / 2} y={button.y + button.h / 2} size={320} color="rgb(53 196 168 / 0.6)" duration={18} />
      {frame >= p2.burst && (
        <div
          style={{
            position: "absolute",
            left,
            top,
            width: right - left,
            height: bottom - top,
            borderRadius: mix(8, 0, t),
            background: "var(--accent)",
            zIndex: 10,
          }}
        />
      )}
    </>
  );
}
