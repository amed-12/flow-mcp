import React from "react";
import { AbsoluteFill } from "remotion";
import { C, grotesk, mono } from "./theme";

// Off-white stage with the faint grid the console uses.
export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      backgroundColor: C.paper,
      backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
      backgroundSize: "60px 60px",
      fontFamily: grotesk,
      color: C.ink,
    }}
  >
    {children}
  </AbsoluteFill>
);

// Neo-brutalist card: thick black outline and a hard offset shadow.
export const Card: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  shadow?: number;
}> = ({ children, style, shadow = 10 }) => (
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

export const Pill: React.FC<{
  children: React.ReactNode;
  bg: string;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, bg, color = C.ink, size = 26, style }) => (
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

export const Bar: React.FC<{ progress: number; color: string; width: number }> = ({
  progress,
  color,
  width,
}) => (
  <div style={{ width, height: 16, borderRadius: 8, background: C.line, overflow: "hidden" }}>
    <div style={{ width: `${progress * 100}%`, height: "100%", background: color, borderRadius: 8 }} />
  </div>
);
