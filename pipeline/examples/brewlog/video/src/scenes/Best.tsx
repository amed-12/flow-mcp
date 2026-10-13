import React from "react";
import { Interactive } from "remotion";
import { C } from "../theme";
import { Card, Pill, Stage } from "../ui";
import { CupIcon, useT } from "./kit";

const Y = [600, 900, 1200];

export const Best: React.FC = () => {
  const { t, ip, sp } = useT();
  const k = sp(1.3, 14);
  const pos = [
    // card 0 (top) -> moves to 900, dimmed; card 1 -> 1200, dimmed; card 2 -> 600, winner
    Y[0] + (900 - Y[0]) * k,
    Y[1] + (1200 - Y[1]) * k,
    Y[2] + (600 - Y[2]) * k,
  ];
  return (
    <Stage>
      <Interactive.Div name="Headline" style={{ position: "absolute", left: 270, width: 540, top: 180, textAlign: "center", fontSize: 120, lineHeight: "150px", opacity: ip(0.2, 0.6, 0, 1) }}>
        Your best recipe
      </Interactive.Div>
      {[0, 1, 2].map((i) => {
        const inAt = 0.3 + i * 0.15;
        const enter = ip(inAt, inAt + 0.5, -200, 0, (x) => 1 - Math.pow(1 - x, 3));
        const win = i === 2;
        const dim = win ? 1 : 1 - 0.6 * k;
        const nudge = win ? 0 : 40 * Math.sin(Math.min(1, k) * Math.PI) * 0.5;
        return (
          <Interactive.Div
            key={i}
            name={`Recipe ${i + 1}`}
            style={{ position: "absolute", left: 110, top: pos[i] + nudge, opacity: ip(inAt, inAt + 0.4, 0, 1) * dim, translate: `0px ${enter}px`, scale: `${win ? 1 + 0.1 * Math.min(1, k) : 1}`, zIndex: win ? 2 : 1 }}
          >
            <Card style={{ width: 860, height: 260, display: "flex", alignItems: "center", gap: 40, paddingLeft: 40, background: win && k > 0.5 ? C.accentSoft : C.white }}>
              <CupIcon size={win && t > 1.3 ? 112 : 100} fill={win && t > 1.3 ? C.accent : C.white} />
              <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
                <div style={{ width: 380, height: 24, borderRadius: 12, background: C.line }} />
                <div style={{ width: 260, height: 24, borderRadius: 12, background: C.line }} />
              </div>
            </Card>
          </Interactive.Div>
        );
      })}
      <Interactive.Div
        name="Best badge"
        style={{ position: "absolute", left: 700, top: 560, scale: `${t < 2.1 ? 0 : Math.min(1.2, sp(2.1, 9))}`, rotate: "6deg", zIndex: 3 }}
      >
        <Pill bg={C.accent} size={48} style={{ border: `5px solid ${C.ink}`, boxShadow: `8px 8px 0 ${C.ink}` }}>BEST</Pill>
      </Interactive.Div>
    </Stage>
  );
};
