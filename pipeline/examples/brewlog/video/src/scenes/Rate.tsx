import React from "react";
import { Interactive } from "remotion";
import { C, mono } from "../theme";
import { Card, Pill, Stage } from "../ui";
import { useT } from "./kit";

const STAR = "M64 8 L80 46 L121 49 L89 76 L99 116 L64 94 L29 116 L39 76 L7 49 L48 46 Z";
const STAR_AT = [0.7, 0.95, 1.2, 1.45, 1.7];

export const Rate: React.FC = () => {
  const { t, ip, sp } = useT();
  const stampP = ip(1.9, 2.1, 0, 1);
  const shake = t >= 1.9 && t < 2.1 ? Math.sin((t - 1.9) * 120) * 6 * (1 - (t - 1.9) / 0.2) : 0;
  return (
    <Stage>
      <Interactive.Div name="Headline" style={{ position: "absolute", left: 0, width: 1080, top: 260, textAlign: "center", fontSize: 176, lineHeight: "230px", whiteSpace: "nowrap", opacity: ip(0.2, 0.5, 0, 1), scale: `${0.9 + 0.1 * sp(0.2)}` }}>
        Rate it
      </Interactive.Div>
      <Interactive.Div name="Stars card" style={{ position: "absolute", left: 100, top: 640, opacity: ip(0.3, 0.6, 0, 1), scale: `${ip(0.3, 0.7, 0.95, 1)}`, translate: `${shake}px 0px` }}>
        <Card style={{ width: 880, height: 520, display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <div style={{ display: "flex", gap: 20 }}>
            {STAR_AT.map((at, i) => {
              const on = t >= at;
              const k = t >= at && t < at + 0.25 ? 1 + 0.25 * Math.sin(((t - at) / 0.25) * Math.PI) : 1;
              const sparkP = (t - at) / 0.4;
              return (
                <div key={i} style={{ position: "relative", width: 128, height: 128, scale: `${k}` }}>
                  <svg width={128} height={128} viewBox="0 0 128 128" style={{ overflow: "visible" }}>
                    <path d={STAR} fill={on ? C.warn : C.bg} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
                    {sparkP >= 0 && sparkP <= 1
                      ? [0, 1, 2, 3].map((a) => {
                          const ang = (a * 90 + 45) * (Math.PI / 180);
                          const r1 = 74 + sparkP * 20;
                          const r2 = r1 + 14;
                          return <line key={a} x1={64 + Math.cos(ang) * r1} y1={64 + Math.sin(ang) * r1} x2={64 + Math.cos(ang) * r2} y2={64 + Math.sin(ang) * r2} stroke={C.ink} strokeWidth={6} strokeLinecap="round" opacity={1 - sparkP} />;
                        })
                      : null}
                  </svg>
                </div>
              );
            })}
          </div>
        </Card>
      </Interactive.Div>
      <Interactive.Div
        name="Saved stamp"
        style={{ position: "absolute", left: 0, width: 1080, top: 1250, display: "flex", justifyContent: "center", opacity: stampP, scale: `${2.2 - 1.2 * stampP}`, rotate: "-8deg" }}
      >
        <Pill bg={C.accent} size={64} style={{ border: `5px solid ${C.ink}`, boxShadow: `10px 10px 0 ${C.ink}`, fontFamily: mono }}>SAVED</Pill>
      </Interactive.Div>
    </Stage>
  );
};
