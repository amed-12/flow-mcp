import React from "react";
import { AbsoluteFill } from "remotion";
import { C, display, mono } from "./theme";

// Building blocks in the neo-brutalist console style. Scenes compose these instead of re-inventing them.

/** Full-frame background with a faint grid. */
export const Stage: React.FC<{ children: React.ReactNode; grid?: boolean }> = ({ children, grid = true }) => (
  <AbsoluteFill
    style={{
      backgroundColor: C.bg,
      backgroundImage: grid ? `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)` : undefined,
      backgroundSize: "60px 60px",
      fontFamily: display,
      color: C.ink,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** Card with a thick outline and a hard offset shadow. */
export const Card: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties; shadow?: number }> = ({ children, style, shadow = 10 }) => (
  <div
    style={{
      background: C.white,
      border: `5px solid ${C.ink}`,
      borderRadius: 28,
      boxShadow: `${shadow}px ${shadow}px 0 ${C.ink}`,
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Rounded label in the mono face. Never wraps. */
export const Pill: React.FC<{ children: React.ReactNode; bg: string; color?: string; size?: number; style?: React.CSSProperties }> = ({
  children,
  bg,
  color = C.ink,
  size = 26,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      background: bg,
      color,
      border: `4px solid ${C.ink}`,
      borderRadius: 999,
      padding: `${size * 0.35}px ${size * 0.9}px`,
      fontFamily: mono,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: 2,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Horizontal meter, progress 0..1. */
export const Bar: React.FC<{ progress: number; color: string; width: number }> = ({ progress, color, width }) => (
  <div style={{ width, height: 16, borderRadius: 8, background: C.line, overflow: "hidden", flexShrink: 0 }}>
    <div style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%`, height: "100%", background: color, borderRadius: 8 }} />
  </div>
);

/** Small coloured status dot. */
export const Dot: React.FC<{ color: string; size?: number }> = ({ color, size = 16 }) => (
  <span style={{ display: "inline-block", flexShrink: 0, width: size, height: size, borderRadius: 999, background: color, border: `3px solid ${C.ink}` }} />
);
