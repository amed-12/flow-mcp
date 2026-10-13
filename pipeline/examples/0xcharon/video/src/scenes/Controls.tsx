import React from "react";
import { Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, mono } from "../theme";
import { Card, Pill, Stage } from "../ui";

export const Controls: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Toggle flips from ON to PAUSED, then Panic Close is pressed.
  const flip = interpolate(frame, [1.3 * fps, 1.3 * fps + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const pressAt = 2.6 * fps;
  const press = interpolate(frame, [pressAt, pressAt + 4, pressAt + 10], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring = interpolate(frame, [pressAt, pressAt + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const paused = flip > 0.5;
  return (
    <Stage>
      <Interactive.Div
        name="Headline"
        style={{
          position: "absolute",
          left: 140,
          width: 1640,
          top: 110,
          fontSize: 92,
          fontWeight: 700,
          letterSpacing: -3,
          lineHeight: 1.05,
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        One tap to pause. One to Panic Close.
      </Interactive.Div>
      <Interactive.Div
        name="Entries toggle"
        style={{
          position: "absolute",
          left: 140,
          top: 330,
          opacity: interpolate(frame, [6, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [6, 24], ["-80px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Card style={{ width: 780, height: 400, padding: 48, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 28, letterSpacing: 2 }}>ENTRY SEARCH CONTROL</div>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <div
              style={{
                width: 300,
                height: 150,
                borderRadius: 999,
                border: `6px solid ${C.ink}`,
                background: paused ? C.line : C.accent,
                position: "relative",
                boxShadow: `8px 8px 0 ${C.ink}`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12 + (1 - flip) * 150,
                  width: 114,
                  height: 114,
                  borderRadius: 999,
                  background: C.white,
                  border: `6px solid ${C.ink}`,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap" }}>{paused ? "Entries paused" : "Entries on"}</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 500, color: C.muted }}>Open positions keep being watched.</div>
        </Card>
      </Interactive.Div>
      <Interactive.Div
        name="Panic Close"
        style={{
          position: "absolute",
          left: 1040,
          top: 330,
          opacity: interpolate(frame, [12, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [12, 30], ["80px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Card style={{ width: 740, height: 400, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              width: 300 + ring * 700,
              height: 300 + ring * 700,
              borderRadius: 999,
              border: `10px solid ${C.danger}`,
              opacity: 1 - ring,
            }}
          />
          <div
            style={{
              padding: "40px 70px",
              borderRadius: 999,
              background: C.danger,
              color: C.white,
              border: `6px solid ${C.ink}`,
              fontSize: 64,
              fontWeight: 700,
              boxShadow: `${12 - press * 10}px ${12 - press * 10}px 0 ${C.ink}`,
              translate: `${press * 10}px ${press * 10}px`,
            }}
          >
            Panic Close
          </div>
        </Card>
      </Interactive.Div>
      <Interactive.Div
        name="Paper mode"
        style={{
          position: "absolute",
          left: 140,
          top: 800,
          opacity: interpolate(frame, [2.8 * fps, 2.8 * fps + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [2.8 * fps, 2.8 * fps + 16], ["0px 40px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Pill bg={C.warnSoft} color={C.ink} size={40}>PAPER</Pill>
          <div style={{ fontSize: 56, fontWeight: 700 }}>Start in paper mode. No SOL at risk.</div>
        </div>
      </Interactive.Div>
    </Stage>
  );
};
