// A quiet browser window around the UI shots. Its address bar says 127.0.0.1:
// Mockroom is a local app, and the frame keeps saying so through the whole demo.

import type { CSSProperties, ReactNode } from "react";
import { fonts } from "../theme/fonts";
import { BrandMark } from "./BrandMark";

interface AppWindowProps {
  /** Size of one design point, in film pixels. */
  u: number;
  dark?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}

export const WINDOW_BAR = 52;

export function AppWindow({ u, dark = false, children, style }: AppWindowProps) {
  const bar = dark ? "#16191d" : "#eceff2";
  const line = dark ? "#2c323a" : "#dfe3e8";
  const text = dark ? "#a1abb5" : "#59646f";
  return (
    <div
      style={{
        borderRadius: 18 * u,
        overflow: "hidden",
        background: bar,
        boxShadow: `0 ${2 * u}px ${4 * u}px rgb(16 24 32 / 0.08), 0 ${40 * u}px ${90 * u}px ${-20 * u}px rgb(16 24 32 / 0.35), 0 0 0 ${1 * u}px ${line}`,
        ...style,
      }}
    >
      <div
        style={{
          height: WINDOW_BAR * u,
          display: "flex",
          alignItems: "center",
          gap: 14 * u,
          padding: `0 ${18 * u}px`,
          borderBottom: `${1 * u}px solid ${line}`,
        }}
      >
        <div style={{ display: "flex", gap: 8 * u }}>
          {[0, 1, 2].map((dot) => (
            <span key={dot} style={{ width: 12 * u, height: 12 * u, borderRadius: 99, background: line }} />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10 * u,
              height: 30 * u,
              padding: `0 ${16 * u}px`,
              borderRadius: 999,
              background: dark ? "#0e1114" : "#ffffff",
              color: text,
              fontFamily: fonts.mono,
              fontSize: 14 * u,
            }}
          >
            <BrandMark size={12 * u} dark={dark} />
            127.0.0.1
          </div>
        </div>
        <div style={{ width: 52 * u }} />
      </div>
      {children}
    </div>
  );
}
