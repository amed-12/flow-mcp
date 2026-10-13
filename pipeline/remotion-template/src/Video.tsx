import React from "react";
import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries, type TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { AbsoluteFill, staticFile } from "remotion";
import { AUDIO, SCENES, TRANSITION_FRAMES } from "./scenes";

// Each preset has its own props type; the series only needs "some presentation".
const presentation = (kind: string): TransitionPresentation<Record<string, unknown>> => {
  const p = pick(kind);
  return p as unknown as TransitionPresentation<Record<string, unknown>>;
};

const pick = (kind: string) => {
  switch (kind) {
    case "slide-left":
      return slide({ direction: "from-right" });
    case "slide-up":
      return slide({ direction: "from-bottom" });
    case "wipe-left":
      return wipe({ direction: "from-left" });
    case "wipe-right":
      return wipe({ direction: "from-right" });
    default:
      return fade();
  }
};

// Scenes and their timing come from scenes/index.ts, which write-manifest generates from scenario.json.
export const Video: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      {SCENES.map((s, i) => (
        <React.Fragment key={s.id}>
          {i > 0 && s.transition !== "none" ? (
            <TransitionSeries.Transition presentation={presentation(s.transition)} timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })} />
          ) : null}
          <TransitionSeries.Sequence name={s.id} durationInFrames={s.sequenceFrames}>
            <s.Component />
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
    {AUDIO.voiceover ? <Audio name="Voiceover" src={staticFile("audio/voiceover.mp3")} /> : null}
    {AUDIO.music ? <Audio name="Music" src={staticFile("audio/music.mp3")} /> : null}
    {AUDIO.sfx ? <Audio name="Sound effects" src={staticFile("audio/sfx.mp3")} /> : null}
  </AbsoluteFill>
);
