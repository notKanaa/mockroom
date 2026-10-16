// Beat 1, the problem: a lone candidate (the ring) shaking under the words, then the price of practising.

import { useCurrentFrame } from "remotion";
import { Words } from "../components/Kinetic";
import { DarkStage, Disc } from "../components/Stage";
import { useFilm } from "../lib/film";
import { easeIn, easeInOut, easeOut, mix, progress } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { problemBeats } from "../timeline";

const b = problemBeats;

export function Problem() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height, portrait } = film;
  const copy = film.film.problem;
  const fit = portrait ? 0.62 : film.square ? 0.72 : 1;

  // The ring: it appears, trembles more and more, and settles at the centre for the next beat.
  const appear = progress(frame, b.ringIn, 14, easeOut);
  const stress = progress(frame, 10, 150, easeIn);
  const settle = progress(frame, b.out, 20, easeInOut);
  const tremor = (1 - settle) * stress * 7 * u;
  const jitterX = (Math.sin(frame * 1.9) + 0.5 * Math.sin(frame * 3.7)) * tremor;
  const jitterY = (Math.cos(frame * 2.3) + 0.5 * Math.sin(frame * 4.1)) * tremor * 0.6;
  const beat = Math.max(0, Math.sin(frame * 0.42)) ** 8 * stress * (1 - settle);
  const ringY = mix(height / 2 - (portrait ? 420 : 270) * u, height / 2, settle);
  const ringSize = 64 * u * appear * (1 + 0.08 * beat);

  // Words leave before the price arrives.
  const count = Math.round(mix(copy.costFrom, copy.costTo, progress(frame, b.count, b.countFrames, easeInOut)));
  const costIn = progress(frame, b.costIn, 16, easeOut);
  const costOut = progress(frame, b.out - 8, 14, easeIn);
  const strike = progress(frame, b.strike, 14, easeOut);

  return (
    <DarkStage>
      <Disc x={width / 2 + jitterX} y={ringY + jitterY} size={ringSize} ring color={stage.text} />

      {frame < b.costIn + 4 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height / 2 - 120 * u * fit,
            textAlign: "center",
            fontFamily: fonts.display,
            letterSpacing: "-0.045em",
            lineHeight: 1,
            padding: `0 ${60 * u}px`,
          }}
        >
          <div style={{ fontSize: 120 * u * fit, fontWeight: 600, color: stage.muted }}>
            <Words text={copy.lines[0]} frame={frame} start={b.line1} exit={b.linesOut} stagger={4} />
          </div>
          <div style={{ fontSize: 150 * u * fit, fontWeight: 800, color: stage.text, marginTop: 18 * u }}>
            <Words
              text={copy.lines[1]}
              frame={frame}
              start={b.line2}
              exit={b.linesOut + 4}
              stagger={5}
              wordStyle={(index) =>
                index === copy.lines[1].split(" ").length - 1
                  ? { translate: `${Math.sin(frame * 2.9) * stress * 3 * u}px 0`, color: stage.warn }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {frame >= b.costIn && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height / 2 - 150 * u * fit,
            textAlign: "center",
            opacity: costIn * (1 - costOut),
            transform: `translateY(${(1 - costIn) * 30 * u - costOut * 30 * u}px)`,
          }}
        >
          <div style={{ fontFamily: fonts.mono, fontSize: 34 * u * fit, color: stage.muted, letterSpacing: "0.02em" }}>
            {copy.costKicker}
          </div>
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "baseline",
              gap: 24 * u * fit,
              marginTop: 18 * u,
            }}
          >
            <span
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 230 * u * fit,
                letterSpacing: "-0.05em",
                color: stage.warn,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {copy.currency}
              {copy.costFrom}–{count}
            </span>
            <span style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 64 * u * fit, color: stage.muted }}>
              {copy.costUnit}
            </span>
            {/* Struck through in the accent: the next beat makes it free. */}
            <span
              style={{
                position: "absolute",
                left: -20 * u,
                top: "52%",
                height: 12 * u * fit,
                width: `calc(${strike * 100}% + ${40 * u * strike}px)`,
                background: stage.accent,
                borderRadius: 99,
                transform: "rotate(-4deg)",
                transformOrigin: "left center",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 28 * u,
              fontFamily: fonts.display,
              fontWeight: 600,
              fontSize: 52 * u * fit,
              color: stage.text,
              letterSpacing: "-0.03em",
            }}
          >
            <Words text={copy.costNote} frame={frame} start={b.note} stagger={3} />
          </div>
        </div>
      )}
    </DarkStage>
  );
}
