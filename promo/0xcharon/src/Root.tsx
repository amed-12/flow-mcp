import { Composition, Folder } from "remotion";
import { Promo } from "./Promo";
import { Intro } from "./scenes/Intro";
import { Scanner } from "./scenes/Scanner";
import { Gate } from "./scenes/Gate";
import { Console } from "./scenes/Console";
import { Controls } from "./scenes/Controls";
import { EndCard } from "./scenes/EndCard";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Promo-Scenes">
        <Composition id="Intro" component={Intro} width={1920} height={1080} fps={30} durationInFrames={132} />
        <Composition id="Scanner" component={Scanner} width={1920} height={1080} fps={30} durationInFrames={177} />
        <Composition id="Gate" component={Gate} width={1920} height={1080} fps={30} durationInFrames={147} />
        <Composition id="Console" component={Console} width={1920} height={1080} fps={30} durationInFrames={192} />
        <Composition id="Controls" component={Controls} width={1920} height={1080} fps={30} durationInFrames={162} />
        <Composition id="EndCard" component={EndCard} width={1920} height={1080} fps={30} durationInFrames={150} />
      </Folder>
      <Composition id="Promo" component={Promo} width={1920} height={1080} fps={30} durationInFrames={900} />
    </>
  );
};
