import React from "react";
import { Interactive } from "remotion";
import { C, display } from "../theme";
import { Pill, Stage } from "../ui";
import { Mug, useT } from "./kit";

export const Hook: React.FC = () => {
  const { t, ip, sp } = useT();
  const drip = (t % 0.6) / 0.6;
  const mugs = [
    { x: 220, steam: 70, delay: 0.7, q: 1.5 },
    { x: 540, steam: 110, delay: 0.9, q: 1.7 },
    { x: 860, steam: 90, delay: 1.1, q: 1.9 },
  ];
  return (
    <Stage>
      <Interactive.Div name="Kicker" style={{ position: "absolute", left: 0, right: 0, top: 220, display: "flex", justifyContent: "center", opacity: ip(0.1, 0.5, 0, 1), translate: `0px ${ip(0.1, 0.5, -30, 0)}px` }}>
        <Pill bg={C.accentSoft} size={40}>EVERY CUP IS DIFFERENT</Pill>
      </Interactive.Div>
      <Interactive.Div
        name="Headline"
        style={{ position: "absolute", left: 0, width: 1080, top: 400, textAlign: "center", fontSize: 140, lineHeight: "200px", whiteSpace: "nowrap", opacity: ip(0.3, 0.6, 0, 1), scale: `${0.9 + 0.1 * sp(0.3)}` }}
      >
        What worked?
      </Interactive.Div>
      <Interactive.Div name="Dripper" style={{ position: "absolute", left: 390, top: 700, width: 300, height: 380, opacity: ip(0.5, 0.9, 0, 1) }}>
        <svg width={300} height={380} viewBox="0 0 300 380">
          <path d="M20 20 h260 l-90 200 h-80 z" fill={C.accent} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
          <rect x={60} y={8} width={180} height={22} rx={11} fill={C.white} stroke={C.ink} strokeWidth={5} />
          <rect x={138} y={220} width={24} height={60} rx={6} fill={C.ink} />
          <circle cx={150} cy={290 + drip * 70} r={11} fill={C.accent} stroke={C.ink} strokeWidth={3} opacity={1 - drip * 0.4} />
        </svg>
      </Interactive.Div>
      {mugs.map((m, i) => (
        <React.Fragment key={i}>
          <Interactive.Div
            name={`Mug ${i + 1}`}
            style={{ position: "absolute", left: m.x - 125, top: 1180, translate: `${(1 - sp(m.delay, 14)) * 900}px 0px` }}
          >
            <Mug w={250} h={300} steam={m.steam} t={t} phase={i * 0.4} />
          </Interactive.Div>
          <Interactive.Div
            name={`Question ${i + 1}`}
            style={{
              position: "absolute",
              left: m.x - 60,
              width: 120,
              top: 1010,
              textAlign: "center",
              fontFamily: display,
              fontSize: 96,
              color: C.danger,
              WebkitTextStroke: `5px ${C.ink}`,
              paintOrder: "stroke fill",
              scale: `${Math.min(1.15, sp(m.q, 8) * 1)}`,
              rotate: `${t > m.q + 0.4 ? Math.sin((t - m.q) * 6) * 6 : 0}deg`,
            }}
          >
            ?
          </Interactive.Div>
        </React.Fragment>
      ))}
    </Stage>
  );
};
