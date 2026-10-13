import React from "react";
import { Easing, Interactive, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { C, mono } from "../theme";
import { Bar, Card, Pill, Stage } from "../ui";

// Deterministic jagged line, like the console's PnL chart. Shape only, no real data.
const POINTS = new Array(60).fill(0).map((_, i) => {
  const base = 150 + Math.sin(i / 7) * 70 - Math.sin(i / 3.3) * 25;
  return [i * 15.5, base + (random(`p-${i}`) - 0.5) * 50] as const;
});
const PATH = POINTS.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
const AREA = `${PATH} L${POINTS[POINTS.length - 1][0]} 300 L0 300 Z`;

const STATS = [
  { label: "TOTAL PNL", icon: "▣", color: C.coral, fill: 0.55 },
  { label: "OPEN TRADES", icon: "∿", color: C.lime, fill: 0.35 },
  { label: "WIN RATE", icon: "◎", color: C.ink, fill: 0.6 },
  { label: "CAPITAL USED", icon: "⛉", color: C.amber, fill: 0.25 },
];

export const Console: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = interpolate(frame, [12, 2.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 1, 0.68, 1),
  });
  const ring = interpolate(frame, [20, 3 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 1, 0.68, 1),
  });
  const circ = 2 * Math.PI * 110;
  return (
    <Stage>
      <Interactive.Div
        name="Headline"
        style={{
          position: "absolute",
          left: 140,
          width: 1640,
          top: 100,
          fontSize: 92,
          fontWeight: 700,
          letterSpacing: -3,
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Everything on one console.
      </Interactive.Div>
      <Interactive.Div
        name="Status pills"
        style={{
          position: "absolute",
          left: 140,
          top: 230,
          display: "flex",
          gap: 20,
          opacity: interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <Pill bg="#E3F6E3" size={24}>● RPC HEALTHY</Pill>
        <Pill bg={C.limeSoft} size={24}>SOLANA MAINNET</Pill>
        <Pill bg="#FFF1D6" size={24} color="#B8730A">PAPER</Pill>
      </Interactive.Div>
      <Interactive.Div
        name="Console"
        style={{
          position: "absolute",
          left: 140,
          top: 330,
          translate: interpolate(frame, [0, 22], ["0px 120px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          rotate: interpolate(frame, [0, 192], ["-1deg", "1deg"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ display: "flex", gap: 36 }}>
          <Card style={{ width: 1000, height: 390, padding: "28px 36px" }}>
            <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 28, letterSpacing: 2 }}>PNL / PORTFOLIO PERFORMANCE</div>
            <svg width={918} height={300} viewBox="0 0 918 300" style={{ marginTop: 12 }}>
              <defs>
                <clipPath id="reveal">
                  <rect x={0} y={0} width={918 * draw} height={300} />
                </clipPath>
              </defs>
              <g clipPath="url(#reveal)">
                <path d={AREA} fill={C.limeSoft} />
                <path d={PATH} fill="none" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
              </g>
            </svg>
          </Card>
          <Card style={{ width: 600, height: 390, display: "flex", alignItems: "center", justifyContent: "center", gap: 40 }}>
            <svg width={260} height={260} viewBox="-130 -130 260 260">
              <circle r={110} fill="none" stroke={C.line} strokeWidth={30} />
              <circle r={110} fill="none" stroke={C.amber} strokeWidth={30} strokeDasharray={`${circ * 0.65 * ring} ${circ}`} transform="rotate(-90)" />
              <circle r={110} fill="none" stroke={C.lime} strokeWidth={30} strokeDasharray={`${circ * 0.06 * ring} ${circ}`} transform={`rotate(${-90 + 234 * ring})`} />
              <circle r={80} fill={C.grey} stroke={C.ink} strokeWidth={6} />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {[C.lime, C.amber, C.grey].map((c, i) => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 999, background: c, border: `3px solid ${C.ink}` }} />
                  <Bar progress={ring * [0.4, 0.8, 0.3][i]} color={c} width={150} />
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div style={{ display: "flex", gap: 36, marginTop: 36 }}>
          {STATS.map((s, i) => {
            const pop = interpolate(frame, [40 + i * 8, 56 + i * 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
            });
            return (
              <Card key={s.label} shadow={8} style={{ width: 382, height: 150, padding: "0 28px", display: "flex", alignItems: "center", gap: 22, scale: `${0.6 + pop * 0.4}`, opacity: Math.min(1, pop * 2) }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, border: `4px solid ${C.ink}`, background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>
                  {s.icon}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 26 }}>{s.label}</div>
                  <Bar progress={pop * s.fill} color={s.color} width={200} />
                </div>
              </Card>
            );
          })}
        </div>
      </Interactive.Div>
    </Stage>
  );
};
