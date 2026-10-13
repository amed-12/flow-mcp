import React from "react";
import { Easing, Interactive, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { C, mono } from "../theme";
import { Pill, Stage } from "../ui";

// A river of candlesticks bobbing like waves.
const River: React.FC = () => {
  const frame = useCurrentFrame();
  const count = 34;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 380, overflow: "hidden" }}>
      {new Array(count).fill(0).map((_, i) => {
        const up = random(`up-${i}`) > 0.42;
        const body = 60 + random(`h-${i}`) * 140;
        const wave = Math.sin(frame / 14 + i * 0.7) * 26;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * 58 - 20,
              bottom: 40 + random(`y-${i}`) * 90 + wave,
              width: 34,
              height: body,
            }}
          >
            <div style={{ position: "absolute", left: 14, top: -30, width: 6, height: body + 60, background: C.ink }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: up ? C.lime : C.coral,
                border: `4px solid ${C.ink}`,
                borderRadius: 6,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

const Boat: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = 0.55 + Math.sin(frame / 5) * 0.15;
  return (
    <svg width={360} height={260} viewBox="0 0 360 260">
      <circle cx={268} cy={70} r={70} fill={C.lime} opacity={glow * 0.45} />
      <line x1={190} y1={190} x2={250} y2={40} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
      <line x1={250} y1={40} x2={268} y2={52} stroke={C.ink} strokeWidth={8} />
      <rect x={252} y={52} width={34} height={42} rx={8} fill={C.lime} stroke={C.ink} strokeWidth={6} />
      <circle cx={130} cy={128} r={26} fill={C.ink} />
      <path d="M100 210 L120 150 L150 150 L165 210 Z" fill={C.ink} />
      <path d="M30 200 L330 200 L290 248 L70 248 Z" fill={C.white} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
    </svg>
  );
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Stage>
      <River />
      <Interactive.Div
        name="Boat"
        style={{
          position: "absolute",
          left: 780,
          top: 520,
          translate: interpolate(frame, [0, 3 * fps], ["-900px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          rotate: `${Math.sin(frame / 10) * 3}deg`,
        }}
      >
        <Boat />
      </Interactive.Div>
      <Interactive.Div
        name="Kicker"
        style={{
          position: "absolute",
          left: 160,
          top: 130,
          opacity: interpolate(frame, [8, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [8, 22], ["0px 30px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Pill bg={C.lime}>AUTONOMOUS SOLANA TRADING AGENT</Pill>
      </Interactive.Div>
      <Interactive.Div
        name="Title"
        style={{
          position: "absolute",
          left: 154,
          top: 200,
          fontSize: 190,
          fontWeight: 700,
          letterSpacing: -8,
          lineHeight: 1,
          opacity: interpolate(frame, [16, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          scale: interpolate(frame, [16, 34], [0.85, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 12 }),
            output: "perceptual-scale",
          }),
          transformOrigin: "left center",
        }}
      >
        Meet <span style={{ fontFamily: mono }}>0x</span>charon
      </Interactive.Div>
      <Interactive.Div
        name="Subtitle"
        style={{
          position: "absolute",
          left: 160,
          top: 410,
          fontFamily: mono,
          fontSize: 54,
          fontWeight: 700,
          opacity: interpolate(frame, [34, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        The Charon Trenches Agent
      </Interactive.Div>
    </Stage>
  );
};
