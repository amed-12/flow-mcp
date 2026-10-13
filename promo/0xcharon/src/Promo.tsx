import React from "react";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Intro } from "./scenes/Intro";
import { Scanner } from "./scenes/Scanner";
import { Gate } from "./scenes/Gate";
import { Console } from "./scenes/Console";
import { Controls } from "./scenes/Controls";
import { EndCard } from "./scenes/EndCard";

// 960 frames of scenes minus five 12-frame transitions = 900 frames (30 s at 30 fps).
export const Promo: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence name="Intro" durationInFrames={132}>
      <Intro />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 12 })} />
    <TransitionSeries.Sequence name="Scanner" durationInFrames={177}>
      <Scanner />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={linearTiming({ durationInFrames: 12 })} />
    <TransitionSeries.Sequence name="Gate" durationInFrames={147}>
      <Gate />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 12 })} />
    <TransitionSeries.Sequence name="Console" durationInFrames={192}>
      <Console />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 12 })} />
    <TransitionSeries.Sequence name="Controls" durationInFrames={162}>
      <Controls />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 12 })} />
    <TransitionSeries.Sequence name="End card" durationInFrames={150}>
      <EndCard />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
