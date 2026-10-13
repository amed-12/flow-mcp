import { Composition, Folder } from "remotion";
import { SCENES, TOTAL_FRAMES } from "./scenes";
import { W, H } from "./theme";
import { Video } from "./Video";

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Scenes">
      {SCENES.map((s) => (
        <Composition key={s.id} id={s.id} component={s.Component} width={W} height={H} fps={30} durationInFrames={s.sequenceFrames} />
      ))}
    </Folder>
    <Composition id="Video" component={Video} width={W} height={H} fps={30} durationInFrames={TOTAL_FRAMES} />
  </>
);
