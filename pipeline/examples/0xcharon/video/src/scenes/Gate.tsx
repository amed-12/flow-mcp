import React from "react";
import { Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, mono } from "../theme";
import { Card, Stage } from "../ui";

const GATE_X = 960;
const BELT_Y = 560;
// Cards ride the belt; only one is accepted at the gate.
const CARDS = [
  { delay: 0, ok: false },
  { delay: 22, ok: false },
  { delay: 44, ok: true },
  { delay: 66, ok: false },
];

const TokenCard: React.FC<{ delay: number; ok: boolean }> = ({ delay, ok }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame - delay, [0, 70], [-260, 1500], { extrapolateLeft: "clamp" });
  const past = x > GATE_X - 70;
  // Rejected cards tip off the belt once they reach the gate.
  const t = Math.max(0, (x - (GATE_X - 70)) / 300);
  const fall = !ok && past ? t * t * 600 : 0;
  const tilt = !ok && past ? Math.min(40, t * 80) : 0;
  const color = past ? (ok ? C.accent : C.danger) : C.white;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 70,
        top: BELT_Y - 150 + fall,
        rotate: `${tilt}deg`,
        opacity: ok ? 1 : interpolate(fall, [120, 260], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}
    >
      <Card shadow={8} style={{ width: 140, height: 140, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {past ? (
          <div style={{ fontSize: 86, fontWeight: 700, lineHeight: 1, color: ok ? C.ink : C.white }}>{ok ? "✓" : "✕"}</div>
        ) : (
          <div style={{ width: 66, height: 66, borderRadius: 999, background: "#C9A7FF", border: `5px solid ${C.ink}` }} />
        )}
      </Card>
    </div>
  );
};

export const Gate: React.FC = () => {
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
          top: 110,
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: -3,
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [0, 18], ["0px 40px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Scores every token. Tells you why.
      </Interactive.Div>
      {/* Belt */}
      <div style={{ position: "absolute", left: 0, right: 0, top: BELT_Y, height: 40, background: C.ink }}>
        {new Array(40).fill(0).map((_, i) => (
          <div
            key={i}
            style={{ position: "absolute", top: 14, left: ((i * 60 + frame * 12) % 2400) - 240, width: 30, height: 12, borderRadius: 6, background: C.grey }}
          />
        ))}
      </div>
      {CARDS.map((c) => (
        <TokenCard key={c.delay} delay={c.delay} ok={c.ok} />
      ))}
      {/* Gate frame, drawn over the cards */}
      <div
        style={{
          position: "absolute",
          left: GATE_X - 110,
          top: BELT_Y - 260,
          width: 220,
          height: 300,
          border: `12px solid ${C.ink}`,
          borderBottom: "none",
          borderRadius: "30px 30px 0 0",
          boxShadow: `inset 0 0 0 10px ${C.accent}`,
        }}
      />
      <Interactive.Div
        name="Why it entered"
        style={{
          position: "absolute",
          left: 1120,
          top: 690,
          opacity: interpolate(frame, [3 * fps, 3 * fps + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [3 * fps, 3 * fps + 16], ["0px 40px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Card style={{ width: 660, padding: "28px 36px", background: C.accentSoft }}>
          <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 26, letterSpacing: 2 }}>WHY IT ENTERED</div>
          <div style={{ fontSize: 46, fontWeight: 700, marginTop: 8 }}>Market cap in range</div>
          <div style={{ fontSize: 38, fontWeight: 500 }}>Liquidity looks safe</div>
        </Card>
      </Interactive.Div>
      <Interactive.Div
        name="Why it passed"
        style={{
          position: "absolute",
          left: 140,
          top: 690,
          opacity: interpolate(frame, [1.6 * fps, 1.6 * fps + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [1.6 * fps, 1.6 * fps + 16], ["0px 40px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Card style={{ width: 660, padding: "28px 36px", background: C.dangerSoft }}>
          <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 26, letterSpacing: 2, color: C.danger }}>WHY IT PASSED</div>
          <div style={{ fontSize: 46, fontWeight: 700, marginTop: 8 }}>Filtered out</div>
          <div style={{ fontSize: 38, fontWeight: 500 }}>Route not supported</div>
        </Card>
      </Interactive.Div>
    </Stage>
  );
};
