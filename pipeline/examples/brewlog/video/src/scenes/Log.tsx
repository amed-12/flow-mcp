import React from "react";
import { Interactive } from "remotion";
import { C, mono } from "../theme";
import { Card, Stage } from "./../ui";
import { useT } from "./kit";

const ROWS = ["BEANS", "GRIND", "RATIO", "TIME"];
const FILL_AT = [0.9, 1.4, 1.9, 2.4];
const ROW_Y = (i: number) => 680 + i * (150 + 28);

const Icon: React.FC<{ i: number }> = ({ i }) => {
  const s = { stroke: C.ink, strokeWidth: 5 } as const;
  if (i === 0)
    return (
      <svg width={90} height={90} viewBox="0 0 90 90">
        <ellipse cx={45} cy={45} rx={26} ry={36} transform="rotate(30 45 45)" fill={C.accent} {...s} />
        <path d="M30 20 q22 22 0 50" transform="rotate(30 45 45)" fill="none" {...s} />
      </svg>
    );
  if (i === 1)
    return (
      <svg width={120} height={60} viewBox="0 0 120 60">
        {[20, 60, 100].map((x) => (
          <circle key={x} cx={x} cy={30} r={13} fill={C.accent} {...s} />
        ))}
      </svg>
    );
  if (i === 2)
    return (
      <svg width={140} height={60} viewBox="0 0 140 60">
        <rect x={6} y={18} width={34} height={24} rx={6} fill={C.accent} {...s} />
        <rect x={50} y={18} width={84} height={24} rx={6} fill={C.white} {...s} />
      </svg>
    );
  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={34} fill={C.white} {...s} />
      <path d="M45 24 v22 l14 8" fill="none" {...s} strokeLinecap="round" />
    </svg>
  );
};

export const Log: React.FC = () => {
  const { t, ip, } = useT();
  const cardY = ip(0.2, 0.8, 120, 0, (x) => 1 - Math.pow(1 - x, 3));
  const pop = (at: number) => (t >= at && t < at + 0.25 ? 1 + 0.04 * Math.sin(((t - at) / 0.25) * Math.PI) : 1);
  const tapTargets = [0, 1, 2];
  // Tap dot moves to each row 0.2 s before the fill.
  const times = tapTargets.map((i) => FILL_AT[i] - 0.2);
  const dotMove = tapTargets.reduce((y, i) => {
    const from = i === 0 ? ROW_Y(0) + 75 + 90 : ROW_Y(i - 1) + 75;
    const to = ROW_Y(i) + 75;
    return t >= times[i] - 0.25 ? from + (to - from) * Math.min(1, (t - (times[i] - 0.25)) / 0.25) : y;
  }, ROW_Y(0) + 165);
  const dotOp = ip(0.6, 0.8, 0, 1) * ip(2.1, 2.2, 1, 0);
  const ring = (at: number) => {
    const p = (t - at) / 0.4;
    return p >= 0 && p <= 1 ? p : -1;
  };
  const rings = tapTargets.map((i) => ({ i, p: ring(FILL_AT[i]) })).filter((r) => r.p >= 0);
  return (
    <Stage>
      <Interactive.Div name="Headline" style={{ position: "absolute", left: 240, width: 600, top: 180, textAlign: "center", fontSize: 104, lineHeight: "130px", opacity: ip(0.3, 0.7, 0, 1), translate: `0px ${ip(0.3, 0.7, 30, 0)}px` }}>
        Log a brew in 3 taps
      </Interactive.Div>
      <Interactive.Div name="Phone card" style={{ position: "absolute", left: 180, top: 560, translate: `0px ${cardY}px`, opacity: ip(0.2, 0.5, 0, 1) }}>
        <Card style={{ width: 720, height: 1020, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 48, top: 44, fontFamily: mono, fontWeight: 700, fontSize: 34, color: C.muted, letterSpacing: 2, whiteSpace: "nowrap" }}>NEW BREW</div>
          <div style={{ position: "absolute", left: 0, bottom: 0, width: 14, height: 1020, background: "transparent" }}>
            <div style={{ position: "absolute", left: 0, width: 14, height: 160, borderRadius: 7, background: C.accent, top: ip(0.9, 2.4, 880, 0), opacity: ip(0.9, 1.0, 0, 1) * ip(2.3, 2.5, 1, 0) }} />
          </div>
        </Card>
      </Interactive.Div>
      {ROWS.map((r, i) => {
        const filled = t >= FILL_AT[i];
        return (
          <Interactive.Div
            key={r}
            name={`Row ${r}`}
            style={{ position: "absolute", left: 228, top: ROW_Y(i), width: 624, height: 150, translate: `0px ${cardY}px`, opacity: ip(0.4, 0.8, 0, 1), scale: `${pop(FILL_AT[i])}` }}
          >
            <div
              style={{
                width: 624,
                height: 150,
                boxSizing: "border-box",
                borderRadius: 28,
                border: `${filled ? 5 : 4}px solid ${filled ? C.ink : C.line}`,
                background: filled ? C.accentSoft : C.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 32px",
              }}
            >
              <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 44, letterSpacing: 2 }}>{r}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 18, opacity: filled ? 1 : 0.35 }}>
                <Icon i={i} />
                {filled ? <span style={{ width: 26, height: 26, borderRadius: 999, background: C.ink }} /> : null}
              </span>
            </div>
          </Interactive.Div>
        );
      })}
      <Interactive.Div name="Tap dot" style={{ position: "absolute", left: 540 + 150 - 28, top: dotMove - 28, opacity: dotOp }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: C.accent, border: `5px solid ${C.ink}`, boxSizing: "border-box" }} />
      </Interactive.Div>
      {rings.map(({ i, p }) => {
        const d = 80 + 60 * p;
        return <div key={i} style={{ position: "absolute", left: 690 - d / 2, top: ROW_Y(i) + 75 - d / 2, width: d, height: d, borderRadius: 999, border: `5px solid ${C.accent}`, boxSizing: "border-box", opacity: 1 - p }} />;
      })}
    </Stage>
  );
};
