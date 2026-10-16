// Every composition Remotion Studio lists and `remotion render` can render.

import { Composition, Folder } from "remotion";
import { Promo, SceneOnly, type PromoProps } from "./compositions/Promo";
import { LOOP_FRAMES, LOOP_SIZE, ReadmeLoop, type LoopProps } from "./compositions/ReadmeLoop";
import { formats, type FilmProps } from "./lib/film";
import { PART1_FRAMES, PART2_FRAMES } from "./v2/beats";
import { Part1Composition } from "./v2/Part1";
import { Part2Composition } from "./v2/Part2";
import { PART3_FRAMES, Part3Composition } from "./v2/Part3";
import { PART4_FRAMES, Part4Composition } from "./v2/Part4";
import { FPS, PROMO_FRAMES, scenes, type SceneId } from "./timeline";

/** The frame's size follows the `aspect` prop, so one composition renders every shape. */
const sizeFromAspect = ({ props }: { props: FilmProps }) => formats[props.aspect];

export function Root() {
  return (
    <>
      <Folder name="Promo">
        <Composition
          id="Promo"
          component={Promo}
          durationInFrames={PROMO_FRAMES}
          fps={FPS}
          {...formats["16:9"]}
          defaultProps={{ locale: "en", aspect: "16:9", voiceOver: false } satisfies PromoProps}
          calculateMetadata={sizeFromAspect}
        />
        <Composition
          id="Promo-FR"
          component={Promo}
          durationInFrames={PROMO_FRAMES}
          fps={FPS}
          {...formats["16:9"]}
          defaultProps={{ locale: "fr", aspect: "16:9", voiceOver: false } satisfies PromoProps}
          calculateMetadata={sizeFromAspect}
        />
        <Composition
          id="Promo-Vertical"
          component={Promo}
          durationInFrames={PROMO_FRAMES}
          fps={FPS}
          {...formats["9:16"]}
          defaultProps={{ locale: "en", aspect: "9:16", voiceOver: false } satisfies PromoProps}
          calculateMetadata={sizeFromAspect}
        />
        <Composition
          id="Promo-Square"
          component={Promo}
          durationInFrames={PROMO_FRAMES}
          fps={FPS}
          {...formats["1:1"]}
          defaultProps={{ locale: "en", aspect: "1:1", voiceOver: false } satisfies PromoProps}
          calculateMetadata={sizeFromAspect}
        />
      </Folder>

      <Folder name="V2">
        <Composition
          id="V2-Part1"
          component={Part1Composition}
          durationInFrames={PART1_FRAMES}
          fps={FPS}
          {...formats["16:9"]}
          defaultProps={{ locale: "en", aspect: "16:9" } satisfies FilmProps}
          calculateMetadata={sizeFromAspect}
        />
        <Composition
          id="V2-Part2"
          component={Part2Composition}
          durationInFrames={PART2_FRAMES}
          fps={FPS}
          {...formats["16:9"]}
          defaultProps={{ locale: "en", aspect: "16:9" } satisfies FilmProps}
          calculateMetadata={sizeFromAspect}
        />
        <Composition
          id="V2-Part3"
          component={Part3Composition}
          durationInFrames={PART3_FRAMES}
          fps={FPS}
          {...formats["16:9"]}
          defaultProps={{ locale: "en", aspect: "16:9" } satisfies FilmProps}
          calculateMetadata={sizeFromAspect}
        />
        <Composition
          id="V2-Part4"
          component={Part4Composition}
          durationInFrames={PART4_FRAMES}
          fps={FPS}
          {...formats["16:9"]}
          defaultProps={{ locale: "en", aspect: "16:9" } satisfies FilmProps}
          calculateMetadata={sizeFromAspect}
        />
      </Folder>

      <Composition
        id="ReadmeLoop"
        component={ReadmeLoop}
        durationInFrames={LOOP_FRAMES}
        fps={FPS}
        {...LOOP_SIZE}
        defaultProps={{ locale: "en" } satisfies LoopProps}
      />

      {/* Each scene alone: the building blocks for ads. */}
      <Folder name="Scenes">
        {scenes.map((scene) => (
          <Composition
            key={scene.id}
            id={`Scene-${scene.id}`}
            component={SceneOnly}
            durationInFrames={scene.duration}
            fps={FPS}
            {...formats["16:9"]}
            defaultProps={{ locale: "en", aspect: "16:9", scene: scene.id as SceneId }}
            calculateMetadata={sizeFromAspect}
          />
        ))}
      </Folder>
    </>
  );
}
