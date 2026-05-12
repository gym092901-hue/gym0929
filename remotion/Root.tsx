import { Composition } from "remotion";
import { FoamRollerExerciseAd, type FoamRollerExerciseAdProps } from "./compositions/FoamRollerExerciseAd";
import { ShortsComposition } from "./compositions/ShortsComposition";
import { defaultShortsRenderProps, type ShortsRenderProps } from "../lib/remotion/types";

const defaultFoamRollerExerciseAdProps: FoamRollerExerciseAdProps = {};

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="ShortsVideo"
        component={ShortsComposition}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={defaultShortsRenderProps.durationSec * 30}
        defaultProps={defaultShortsRenderProps}
        calculateMetadata={({ props }: { props: ShortsRenderProps }) => ({
          durationInFrames: Math.max(20, Math.min(35, props.durationSec)) * 30
        })}
      />
      <Composition
        id="FoamRollerExerciseAd"
        component={FoamRollerExerciseAd}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={27 * 30}
        defaultProps={defaultFoamRollerExerciseAdProps}
      />
    </>
  );
}
