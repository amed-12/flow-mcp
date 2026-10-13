import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";

/** Clamped interpolation over seconds. */
export const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ip = (a: number, b: number, from: number, to: number, ease = Easing.bezier(0.33, 1, 0.68, 1)) =>
    interpolate(t, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const sp = (at: number, damping = 12) => spring({ frame: frame - at * fps, fps, config: { damping, stiffness: 140 } });
  return { t, frame, fps, ip, sp };
};

/** Two wavy steam strokes rising and looping. */
export const Steam: React.FC<{ t: number; height: number; phase?: number; period?: number; x?: number }> = ({ t, height, phase = 0, period = 1.2, x = 0 }) => {
  const strokes = [-22, 22].map((dx, i) => {
    const p = (((t - phase) / period + i * 0.5) % 1 + 1) % 1;
    const y = -p * height;
    const op = Math.sin(p * Math.PI);
    const sway = Math.sin(p * Math.PI * 2 + i) * 8;
    return (
      <path
        key={i}
        d={`M ${dx + sway} 0 q 14 -${height * 0.12} 0 -${height * 0.24} t 0 -${height * 0.24}`}
        transform={`translate(0 ${y + height})`}
        fill="none"
        stroke={C.ink}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={op}
      />
    );
  });
  return (
    <svg width={120} height={height + 20} viewBox={`-60 0 120 ${height + 20}`} style={{ position: "absolute", left: x - 60, top: -height - 10, overflow: "visible" }}>
      {strokes}
    </svg>
  );
};

/** Flat mug: body, handle ring, coffee line. Size w x h. */
export const Mug: React.FC<{ w: number; h: number; steam: number; t: number; phase?: number; shadow?: number }> = ({ w, h, steam, t, phase = 0, shadow = 10 }) => {
  const bodyW = w * 0.8;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div style={{ position: "absolute", left: bodyW * 0.5, top: h * 0.2 }}>
        <Steam t={t} height={steam} phase={phase} />
      </div>
      <div
        style={{
          position: "absolute",
          left: bodyW - 14,
          top: h * 0.22,
          width: w * 0.3,
          height: h * 0.5,
          borderRadius: 999,
          border: `12px solid ${C.accent}`,
          boxSizing: "border-box",
          outline: `0px solid ${C.ink}`,
          boxShadow: `0 0 0 5px ${C.ink} inset, 0 0 0 5px ${C.ink}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: h * 0.2,
          width: bodyW,
          height: h * 0.8,
          background: C.white,
          border: `5px solid ${C.ink}`,
          borderRadius: "14px 14px 56px 56px",
          boxShadow: `${shadow}px ${shadow}px 0 ${C.ink}`,
          boxSizing: "border-box",
        }}
      >
        <div style={{ position: "absolute", left: 20, right: 20, top: 24, height: 14, borderRadius: 7, background: C.accent, border: `4px solid ${C.ink}`, boxSizing: "content-box", marginLeft: -4, marginTop: -4 }} />
      </div>
    </div>
  );
};

/** Small cup icon (ink outline). */
export const CupIcon: React.FC<{ size: number; fill?: string }> = ({ size, fill = C.white }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <path d="M12 26 h44 v20 a18 18 0 0 1 -18 18 h-8 a18 18 0 0 1 -18 -18 z" fill={fill} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
    <path d="M56 32 h6 a8 8 0 0 1 0 16 h-8" fill="none" stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
    <path d="M20 34 h28" stroke={C.accent} strokeWidth={6} strokeLinecap="round" />
  </svg>
);
