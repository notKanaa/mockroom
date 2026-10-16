// Beat 7, the call to action: the mark forms one last time, then the one command
// to type, where the code lives, and its licence.

import { useCurrentFrame } from "remotion";
import { Words } from "../components/Kinetic";
import { DarkStage, Disc } from "../components/Stage";
import { useFilm } from "../lib/film";
import { breathe, easeBack, easeIn, easeInOut, easeOut, mix, progress, typed } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { ctaBeats } from "../timeline";

const b = ctaBeats;
const TYPE = 0.55;

export function CallToAction() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height, portrait, square } = film;
  const copy = film.film.cta;
  const fit = portrait ? 0.7 : square ? 0.72 : 1;

  const size = 84 * u * fit;
  const half = size * 0.1875;
  const cx = width / 2;
  const markY = height / 2 - (portrait ? 420 : 300) * u * fit;
  const dock = progress(frame, b.mark, b.dock, easeBack);
  const ringIn = progress(frame, b.mark, 12, easeOut);

  const command = typed(copy.command, frame, b.typing, TYPE);
  const typing = frame >= b.typing && command.length < copy.command.length;
  const caretOn = typing || breathe(frame, 30) < 0.55;
  const boxIn = progress(frame, b.command, 16, easeOut);
  const entered = progress(frame, b.enter, 10, easeOut);
  const out = progress(frame, b.out, 16, easeIn);

  return (
    <DarkStage style={{ opacity: 1 - out }}>
      {/* As in the app's mark, the candidate's ring is drawn over the recruiter's disc. */}
      <Disc x={mix(-size, cx - half, dock)} y={markY} size={size} color={stage.accent} />
      <Disc x={cx + half} y={markY} size={size * ringIn} ring color={stage.text} />

      <div
        style={{
          position: "absolute",
          left: 60 * u,
          right: 60 * u,
          top: markY + size + 50 * u * fit,
          textAlign: "center",
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 92 * u * fit,
          letterSpacing: "-0.045em",
          lineHeight: 1.02,
          textWrap: "balance",
        }}
      >
        <Words text={copy.tagline} frame={frame} start={b.tagline} stagger={3} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: height / 2 + (portrait ? 40 : 60) * u * fit,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 34 * u * fit,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22 * u * fit,
            padding: `${24 * u * fit}px ${40 * u * fit}px`,
            borderRadius: 22 * u * fit,
            background: stage.surface,
            border: `${1.5 * u}px solid ${entered > 0 ? `color-mix(in srgb, ${stage.accent} ${entered * 100}%, ${stage.line})` : stage.line}`,
            boxShadow: `0 0 0 ${entered * 8 * u}px color-mix(in srgb, ${stage.accentSoft} ${(1 - progress(frame, b.enter + 8, 30)) * 100}%, transparent)`,
            fontFamily: fonts.mono,
            fontSize: 64 * u * fit,
            opacity: boxIn,
            transform: `translateY(${(1 - boxIn) * 30 * u}px) scale(${1 - 0.03 * Math.max(0, 1 - Math.abs(frame - b.enter) / 4)})`,
          }}
        >
          <span style={{ color: stage.accent }}>$</span>
          <span style={{ color: stage.text, minWidth: `${copy.command.length}ch` }}>
            {command}
            <span
              style={{
                display: "inline-block",
                width: "0.55ch",
                height: "1em",
                marginLeft: 4 * u,
                verticalAlign: "text-bottom",
                background: stage.accent,
                opacity: caretOn ? 1 : 0,
              }}
            />
          </span>
        </div>

        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: 54 * u * fit,
            letterSpacing: "-0.03em",
            color: stage.text,
          }}
        >
          <Words text={copy.url} frame={frame} start={b.url} />
        </div>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 30 * u * fit,
            color: stage.muted,
            letterSpacing: "0.04em",
            opacity: progress(frame, b.license, 16, easeInOut),
          }}
        >
          {copy.license}
        </div>
      </div>
    </DarkStage>
  );
}
