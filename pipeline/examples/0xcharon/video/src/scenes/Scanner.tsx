import React from "react";
import { Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { Bar, Card, Pill, Stage } from "../ui";

const ROWS = [
  { stage: "READY FOR REVIEW", color: C.accent, score: 0.65, avatar: "#7BD3EA" },
  { stage: "WATCH", color: C.warn, score: 0.45, avatar: "#C9A7FF" },
  { stage: "EARLY INFO", color: C.grey, score: 0.3, avatar: "#FFB4A2" },
];

const Radar: React.FC = () => {
  const frame = useCurrentFrame();
  const angle = frame * 4;
  const blips = [
    { r: 150, a: 40 },
    { r: 230, a: 130 },
    { r: 90, a: 210 },
    { r: 200, a: 300 },
    { r: 260, a: 250 },
  ];
  return (
    <svg width={640} height={640} viewBox="-320 -320 640 640">
      <circle r={300} fill={C.white} stroke={C.ink} strokeWidth={8} />
      {[220, 140, 60].map((r) => (
        <circle key={r} r={r} fill="none" stroke={C.line} strokeWidth={4} />
      ))}
      <line x1={-300} y1={0} x2={300} y2={0} stroke={C.line} strokeWidth={4} />
      <line x1={0} y1={-300} x2={0} y2={300} stroke={C.line} strokeWidth={4} />
      <g transform={`rotate(${angle})`}>
        <path d="M0 0 L296 0 A296 296 0 0 0 256 -148 Z" fill={C.accent} opacity={0.55} />
        <line x1={0} y1={0} x2={296} y2={0} stroke={C.ink} strokeWidth={6} />
      </g>
      {blips.map((b, i) => {
        // A blip lights up when the beam passes it, then fades.
        const since = (((angle - b.a) % 360) + 360) % 360;
        const lit = interpolate(since, [0, 120], [1, 0.15], { extrapolateRight: "clamp" });
        const x = Math.cos((b.a * Math.PI) / 180) * b.r;
        const y = Math.sin((b.a * Math.PI) / 180) * b.r;
        return (
          <circle key={i} cx={x} cy={y} r={16} fill={i === 0 ? C.accent : C.warn} stroke={C.ink} strokeWidth={5} opacity={lit} />
        );
      })}
      <circle r={14} fill={C.ink} />
    </svg>
  );
};

export const Scanner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Stage>
      <Interactive.Div
        name="Headline"
        style={{
          position: "absolute",
          left: 140,
          width: 1640,
          top: 120,
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: -3,
          lineHeight: 1.02,
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [0, 18], ["0px 40px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Scans new Solana tokens, nonstop.
      </Interactive.Div>
      <div style={{ position: "absolute", left: 140, top: 450, display: "flex", flexDirection: "column", gap: 28 }}>
        {ROWS.map((row, i) => {
          const start = 0.8 * fps + i * 12;
          const appear = interpolate(frame, [start, start + 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          const fill = interpolate(frame, [start + 10, start + 50], [0, row.score], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.33, 1, 0.68, 1),
          });
          return (
            <Card
              key={row.stage}
              shadow={8}
              style={{
                width: 960,
                height: 150,
                padding: "0 40px",
                display: "flex",
                alignItems: "center",
                gap: 32,
                opacity: appear,
                translate: `${(1 - appear) * -80}px 0px`,
                background: i === 0 ? C.accentSoft : C.white,
              }}
            >
              <div style={{ flexShrink: 0, width: 76, height: 76, borderRadius: 999, background: row.avatar, border: `5px solid ${C.ink}` }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ width: 180, height: 22, borderRadius: 11, background: C.ink }} />
                <div style={{ width: 120, height: 16, borderRadius: 8, background: C.line }} />
              </div>
              <Pill bg={i === 0 ? C.accent : C.white} size={24}>
                <span style={{ width: 14, height: 14, borderRadius: 999, background: row.color, border: `3px solid ${C.ink}` }} />
                {row.stage}
              </Pill>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
                <Bar progress={fill} color={row.color} width={160} />
              </div>
            </Card>
          );
        })}
      </div>
      <Interactive.Div
        name="Radar"
        style={{
          position: "absolute",
          left: 1180,
          top: 300,
          scale: interpolate(frame, [4, 26], [0.6, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 14 }),
            output: "perceptual-scale",
          }),
          opacity: interpolate(frame, [4, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <Radar />
      </Interactive.Div>
      <Interactive.Div
        name="Live tag"
        style={{
          position: "absolute",
          left: 140,
          top: 320,
          opacity: interpolate(frame, [20, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <Pill bg={C.white} size={26}>
          <span style={{ width: 16, height: 16, borderRadius: 999, background: Math.floor(frame / 12) % 2 ? C.accent : C.ink }} />
          SCANNER LIVE 24/7
        </Pill>
      </Interactive.Div>
    </Stage>
  );
};
