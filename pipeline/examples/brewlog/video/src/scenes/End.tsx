import React from "react";
import { Interactive } from "remotion";
import { C } from "../theme";
import { Card, Pill, Stage } from "../ui";
import { Mug, useT } from "./kit";

export const End: React.FC = () => {
  const { t, ip, sp } = useT();
  return (
    <Stage>
      <Interactive.Div name="Headline card" style={{ position: "absolute", left: 100, top: 480, scale: `${0.9 + 0.1 * sp(0.2)}`, opacity: ip(0.2, 0.5, 0, 1) }}>
        <Card style={{ width: 880, height: 420, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 150, lineHeight: "170px" }}>
          <div style={{ width: 700 }}>Brew it again.</div>
        </Card>
      </Interactive.Div>
      <Interactive.Div name="Link" style={{ position: "absolute", left: 0, width: 1080, top: 1010, display: "flex", justifyContent: "center", opacity: ip(0.7, 1.1, 0, 1), translate: `0px ${ip(0.7, 1.1, 40, 0)}px` }}>
        <Pill bg={C.accent} size={56} style={{ boxShadow: `10px 10px 0 ${C.ink}` }}>brewlog.example</Pill>
      </Interactive.Div>
      <Interactive.Div name="Mug" style={{ position: "absolute", left: 540 - 130, top: 1250, opacity: ip(1.0, 1.5, 0, 1), translate: `0px ${ip(1.0, 1.5, 30, 0)}px` }}>
        <Mug w={260} h={250} steam={120} t={Math.max(0, t - 1.2)} />
      </Interactive.Div>
    </Stage>
  );
};
