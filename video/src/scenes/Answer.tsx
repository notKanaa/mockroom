// Beat 2, Mockroom's answer: the recruiter's disc meets the candidate's ring and
// forms the mark, then floods the frame into the light, where the name and the
// four promises arrive.

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BrandMark } from "../components/BrandMark";
import { DarkStage, Disc } from "../components/Stage";
import { useFilm } from "../lib/film";
import { easeBack, easeIn, easeInOut, easeOut, mix, progress } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { answerBeats } from "../timeline";

const b = answerBeats;

export function Answer() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height } = film;
  const copy = film.film.answer;
  const fit = film.portrait ? 0.62 : film.square ? 0.72 : 1;
  const cx = width / 2;
  const cy = height / 2;

  // The mark forming: discs grow, the recruiter's disc comes in and docks against the ring.
  const grow = progress(frame, 0, 18, easeInOut);
  const size = mix(64, 150, grow) * u;
  const dock = progress(frame, 2, b.dock - 2, easeBack);
  const half = size * 0.1875;
  const discX = mix(-size, cx - half, dock);
  const ringX = mix(cx, cx + half, progress(frame, 2, b.dock - 2, easeInOut));
  const squash = Math.max(0, 1 - Math.abs(frame - b.dock) / 4);

  // The flood: the disc fills the frame with the accent, then the light comes in over it.
  const diagonal = Math.hypot(width, height) * 2.2;
  const flood = progress(frame, b.flood, 16, easeIn);
  const paper = progress(frame, b.paper, 16, easeInOut);

  const nameIn = (index: number) => progress(frame, b.name + index * 2, 18, easeOut);
  const out = progress(frame, b.out, 14, easeIn);

  return (
    <AbsoluteFill>
      <DarkStage>
        <Disc x={ringX} y={cy} size={size} ring color={stage.text} />
        <Disc
          x={discX}
          y={cy}
          size={mix(size, diagonal, flood)}
          color={stage.accentDeep}
          style={{ transform: `scaleX(${1 - squash * 0.08}) scaleY(${1 + squash * 0.06})` }}
        />
        <Disc x={cx} y={cy} size={diagonal * paper} color={stage.paper} />
      </DarkStage>

      {frame >= b.paper && (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            color: stage.paperText,
            opacity: 1 - out,
            transform: `scale(${1 - out * 0.04})`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 40 * u * fit }}>
            <div style={{ transform: `scale(${progress(frame, b.name - 6, 18, easeBack)})` }}>
              <BrandMark size={110 * u * fit} />
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 230 * u * fit,
                letterSpacing: "-0.055em",
                lineHeight: 1,
                display: "flex",
              }}
            >
              {copy.name.split("").map((letter, index) => (
                <span key={index} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.1em" }}>
                  <span style={{ display: "inline-block", transform: `translateY(${(1 - nameIn(index)) * 105}%)` }}>
                    {letter}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* The promises, one after the other in a single slot. */}
          <div
            style={{
              position: "relative",
              height: 96 * u * fit,
              width: "100%",
              marginTop: 36 * u * fit,
              overflow: "hidden",
              fontFamily: fonts.display,
              fontWeight: 600,
              fontSize: 76 * u * fit,
              letterSpacing: "-0.035em",
              textAlign: "center",
            }}
          >
            {copy.claims.map((claim, index) => {
              const start = b.claims + index * b.claimFrames;
              const last = index === copy.claims.length - 1;
              const enter = progress(frame, start, 12, easeOut);
              const leave = last ? 0 : progress(frame, start + b.claimFrames - 4, 10, easeIn);
              if (enter <= 0 || leave >= 1) return null;
              return (
                <div
                  key={claim}
                  style={{
                    position: "absolute",
                    inset: 0,
                    transform: `translateY(${(1 - enter) * 100 - leave * 100}%)`,
                    color: index === 0 ? stage.accentDeep : stage.paperText,
                  }}
                >
                  {claim}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
