import React from "react";
import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { C, mono } from "../theme";
import { Stage } from "../ui";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = 0.35 + Math.sin(frame / 8) * 0.2;
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Interactive.Div
          name="Logo tile"
          style={{
            width: 200,
            height: 200,
            borderRadius: 40,
            background: C.lime,
            border: `8px solid ${C.ink}`,
            boxShadow: `14px 14px 0 ${C.ink}, 0 0 80px rgba(184,244,0,${glow})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: mono,
            fontWeight: 700,
            fontSize: 96,
            scale: interpolate(frame, [0, 18], [0.4, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 10 }),
              output: "perceptual-scale",
            }),
          }}
        >
          0x
        </Interactive.Div>
        <Interactive.Div
          name="Wordmark"
          style={{
            marginTop: 50,
            fontSize: 170,
            fontWeight: 700,
            letterSpacing: -7,
            lineHeight: 1,
            opacity: interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            translate: interpolate(frame, [8, 24], ["0px 40px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <span style={{ fontFamily: mono, letterSpacing: -4 }}>0x</span>charon
        </Interactive.Div>
        <Interactive.Div
          name="Tagline"
          style={{
            marginTop: 24,
            fontSize: 52,
            fontWeight: 500,
            opacity: interpolate(frame, [18, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          Autonomous degen trading. Executed with precision.
        </Interactive.Div>
        <Interactive.Div
          name="URL button"
          style={{
            marginTop: 50,
            padding: "22px 54px",
            borderRadius: 999,
            background: C.ink,
            color: C.lime,
            fontFamily: mono,
            fontWeight: 700,
            fontSize: 46,
            boxShadow: `0 0 50px rgba(184,244,0,${glow})`,
            opacity: interpolate(frame, [26, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            scale: interpolate(frame, [26, 40], [0.8, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
            }),
          }}
        >
          charon.hermes-amed.my.id
        </Interactive.Div>
      </div>
      <Interactive.Div
        name="Disclaimer"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 90,
          textAlign: "center",
          fontFamily: mono,
          fontSize: 28,
          color: "#6B6B64",
          opacity: interpolate(frame, [34, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Paper trading available · Not financial advice · Crypto trading is risky
      </Interactive.Div>
    </Stage>
  );
};
