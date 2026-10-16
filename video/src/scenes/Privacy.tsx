// Beat 6, privacy: the candidate's ring grows into "your machine". Your key and
// your history stay inside; the key only ever goes to the provider it belongs to;
// and Ollama can move in, so nothing leaves at all.

import { useCurrentFrame } from "remotion";
import { Words } from "../components/Kinetic";
import { DarkStage } from "../components/Stage";
import { useFilm } from "../lib/film";
import { easeBack, easeIn, easeInOut, easeOut, mix, progress } from "../lib/motion";
import { fonts } from "../theme/fonts";
import { stage } from "../theme/tokens";
import { privacyBeats } from "../timeline";

const b = privacyBeats;

const KeyIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <circle cx="8" cy="15" r="4" />
    <path d="M10.8 12.2 20 3M16 7l3 3M14 9l2 2" />
  </svg>
);

const FolderIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round">
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
  </svg>
);

export function Privacy() {
  const frame = useCurrentFrame();
  const film = useFilm();
  const { u, width, height, portrait, square } = film;
  const copy = film.film.privacy;
  const fit = portrait ? 0.8 : square ? 0.7 : 1;

  // Where the ring sits: right of the words in 16:9, under them otherwise.
  const radius = (portrait ? 360 : square ? 200 : 330) * u;
  const cx = portrait || square ? width / 2 : width - 640 * u;
  const cy = portrait ? 1240 * u : square ? 690 * u : height / 2;
  const draw = progress(frame, b.ring, 30, easeInOut);
  const out = progress(frame, b.out, 16, easeIn);
  const glow = progress(frame, b.ollamaIn + 10, 20, easeOut);

  const pill = (label: string, x: number, y: number, amount: number, highlight = false) => (
    <div
      key={label}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * amount})`,
        opacity: amount,
        padding: `${10 * u}px ${22 * u}px`,
        borderRadius: 999,
        border: `${1.5 * u}px solid ${highlight ? stage.accent : stage.line}`,
        background: highlight ? stage.accentSoft : stage.surface,
        color: highlight ? stage.accent : stage.muted,
        fontFamily: fonts.mono,
        fontSize: 24 * u * fit,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );

  // Providers wait outside the ring: on its far side in 16:9, in a row under it otherwise.
  const stacked = portrait || square;
  const outside = radius + 150 * u * fit;
  const providers = copy.providers.map((name, index) => {
    if (stacked) return { name, x: cx + (index - 1) * 270 * u * fit, y: cy + radius + 100 * u * fit };
    const angle = ([-38, 0, 38][index]! * Math.PI) / 180;
    return { name, x: cx + Math.cos(angle) * outside, y: cy + Math.sin(angle) * outside };
  });
  const keyAt = { x: cx - radius * 0.32, y: cy - radius * 0.1 };
  const folderAt = { x: cx - radius * 0.32, y: cy + radius * 0.28 };
  const target = providers[1]!;
  const keyLine = progress(frame, b.keyLine, 18, easeInOut);

  // Ollama comes in from below the ring and settles inside.
  const ollamaAppear = progress(frame, b.ollama, 12, easeOut);
  const ollamaMove = progress(frame, b.ollamaIn, 22, easeBack);
  const ollamaFrom = stacked ? { x: width - 120 * u, y: cy } : { x: cx + radius * 0.2, y: cy + radius + 110 * u };
  const ollamaX = mix(ollamaFrom.x, cx + radius * 0.05, ollamaMove);
  const ollamaY = mix(ollamaFrom.y, cy + radius * 0.6, ollamaMove);

  const textLeft = portrait || square ? 80 * u : 140 * u;
  const textTop = portrait ? 220 * u : square ? 70 * u : height / 2 - 200 * u;

  return (
    <DarkStage style={{ opacity: 1 - out }}>
      <div
        style={{
          position: "absolute",
          left: textLeft,
          top: textTop,
          width: portrait || square ? width - 160 * u : 760 * u,
          fontFamily: fonts.display,
          letterSpacing: "-0.04em",
          lineHeight: 1.02,
        }}
      >
        <div style={{ fontSize: 110 * u * fit, fontWeight: 800 }}>
          <Words text={copy.lines[0]!} frame={frame} start={b.lines[0]!} />
        </div>
        <div style={{ fontSize: 110 * u * fit, fontWeight: 800 }}>
          <Words text={copy.lines[1]!} frame={frame} start={b.lines[1]!} />
        </div>
        <div style={{ fontSize: 40 * u * fit, fontWeight: 600, color: stage.muted, marginTop: 26 * u, letterSpacing: "-0.02em", lineHeight: 1.2, textWrap: "balance" }}>
          <Words text={copy.lines[2]!} frame={frame} start={b.lines[2]!} stagger={2} />
        </div>
        <div style={{ fontSize: 40 * u * fit, fontWeight: 600, color: stage.accent, marginTop: 14 * u, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          <Words text={copy.ollama} frame={frame} start={b.ollama} stagger={2} />
        </div>
      </div>

      {/* The ring: your machine. */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius + 18 * u}
          fill="none"
          stroke={stage.accent}
          strokeWidth={30 * u}
          opacity={glow * 0.12}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={stage.night}
          fillOpacity={0.6 * draw}
          stroke={glow > 0 ? `color-mix(in srgb, ${stage.accent} ${glow * 100}%, ${stage.text})` : stage.text}
          strokeWidth={12 * u}
          strokeDasharray={Math.PI * 2 * radius}
          strokeDashoffset={Math.PI * 2 * radius * (1 - draw)}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="round"
        />
        {/* The key goes out to its own provider, and only there. */}
        <line
          x1={keyAt.x + 30 * u}
          y1={keyAt.y}
          x2={mix(keyAt.x + 30 * u, stacked ? target.x : target.x - 90 * u * fit, keyLine)}
          y2={mix(keyAt.y, stacked ? target.y - 30 * u * fit : target.y, keyLine)}
          stroke={stage.accent}
          strokeWidth={2.5 * u}
          strokeDasharray={`${8 * u} ${8 * u}`}
          strokeDashoffset={-frame * 1.2 * u}
          opacity={keyLine > 0 ? 0.9 * (1 - progress(frame, b.ollamaIn, 12)) : 0}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy - radius * 0.62,
          transform: "translateX(-50%)",
          fontFamily: fonts.mono,
          fontSize: 28 * u * fit,
          color: stage.accent,
          opacity: progress(frame, 20, 14),
        }}
      >
        {copy.local}
      </div>

      {[
        { at: keyAt, icon: <KeyIcon size={44 * u * fit} color={stage.text} />, label: copy.inside[0]!, start: b.inside[0]! },
        { at: folderAt, icon: <FolderIcon size={44 * u * fit} color={stage.text} />, label: copy.inside[1]!, start: b.inside[1]! },
      ].map((item) => {
        const amount = progress(frame, item.start, 14, easeOut);
        return (
          <div
            key={item.label}
            style={{
              position: "absolute",
              left: item.at.x - 30 * u,
              top: item.at.y,
              display: "flex",
              alignItems: "center",
              gap: 14 * u,
              transform: `translateY(-50%) translateY(${(1 - amount) * 16 * u}px)`,
              opacity: amount,
              fontFamily: fonts.mono,
              fontSize: 26 * u * fit,
              color: stage.text,
            }}
          >
            {item.icon}
            {item.label}
          </div>
        );
      })}

      {providers.map((provider, index) => pill(provider.name, provider.x, provider.y, progress(frame, b.providers + index * 4, 12, easeOut)))}
      {pill("Ollama", ollamaX, ollamaY, ollamaAppear, ollamaMove > 0.5)}
    </DarkStage>
  );
}
