// Kinetic type: words rising out of a mask, one after the other, and leaving the same way.

import type { CSSProperties } from "react";
import { easeIn, easeOut, progress } from "../lib/motion";
import { fonts } from "../theme/fonts";

interface WordsProps {
  text: string;
  frame: number;
  /** Frame where the first word starts rising. */
  start: number;
  /** Frames between two words. */
  stagger?: number;
  duration?: number;
  /** Frame where the words start leaving, upwards. */
  exit?: number;
  style?: CSSProperties;
  /** Styles some words differently, by index. */
  wordStyle?: (index: number) => CSSProperties | undefined;
}

export function Words({ text, frame, start, stagger = 3, duration = 16, exit, style, wordStyle }: WordsProps) {
  const words = text.split(" ");
  return (
    <span style={{ display: "inline-block", ...style }}>
      {words.map((word, index) => {
        const enter = progress(frame, start + index * stagger, duration, easeOut);
        const leave = exit === undefined ? 0 : progress(frame, exit + index * Math.max(1, stagger - 1), 12, easeIn);
        const y = (1 - enter) * 105 - leave * 105;
        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "top",
              paddingBottom: "0.12em",
              marginBottom: "-0.12em",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${y}%)`,
                ...wordStyle?.(index),
              }}
            >
              {word}
              {index < words.length - 1 ? " " : ""}
            </span>
          </span>
        );
      })}
    </span>
  );
}

interface CaptionProps {
  text: string;
  frame: number;
  start: number;
  exit?: number;
  u: number;
  color: string;
  size?: number;
  align?: CSSProperties["textAlign"];
}

/** A demo caption: a short sentence in the display face, set tight. */
export function Caption({ text, frame, start, exit, u, color, size = 64, align = "left" }: CaptionProps) {
  return (
    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: 600,
        fontSize: size * u,
        lineHeight: 1.04,
        letterSpacing: "-0.035em",
        color,
        textAlign: align,
        textWrap: "balance",
      }}
    >
      <Words text={text} frame={frame} start={start} exit={exit} stagger={2} />
    </div>
  );
}
