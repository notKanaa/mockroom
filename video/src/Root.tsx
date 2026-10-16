// Every composition Remotion Studio lists and `remotion render` can render.

import { Composition, Folder } from "remotion";
import { formats, type FilmProps } from "./lib/film";
import { PART1_FRAMES, PART2_FRAMES, PART3_FRAMES, PART4_FRAMES, PART5_FRAMES } from "./v2/beats";
import { FILM_FRAMES, FilmComposition } from "./v2/Film";
import { LOOP_FRAMES, LOOP_SIZE, LoopComposition } from "./v2/Loop";
import { Part1Composition } from "./v2/Part1";
import { Part2Composition } from "./v2/Part2";
import { Part3Composition } from "./v2/Part3";
import { Part4Composition } from "./v2/Part4";
import { Part5Composition } from "./v2/Part5";

const FPS = 30;

/** The frame's size follows the `aspect` prop, so one composition renders every shape. */
const sizeFromAspect = ({ props }: { props: FilmProps }) => formats[props.aspect];

const film = (locale: FilmProps["locale"], aspect: FilmProps["aspect"]): FilmProps => ({ locale, aspect });

const parts = [
  { id: "Part1-Opening", component: Part1Composition, frames: PART1_FRAMES },
  { id: "Part2-Product", component: Part2Composition, frames: PART2_FRAMES },
  { id: "Part3-Interview", component: Part3Composition, frames: PART3_FRAMES },
  { id: "Part4-Debrief", component: Part4Composition, frames: PART4_FRAMES },
  { id: "Part5-YourAI", component: Part5Composition, frames: PART5_FRAMES },
];

export function Root() {
  return (
    <>
      <Composition
        id="Film"
        component={FilmComposition}
        durationInFrames={FILM_FRAMES}
        fps={FPS}
        {...formats["16:9"]}
        defaultProps={film("en", "16:9")}
        calculateMetadata={sizeFromAspect}
      />
      <Composition
        id="Film-FR"
        component={FilmComposition}
        durationInFrames={FILM_FRAMES}
        fps={FPS}
        {...formats["16:9"]}
        defaultProps={film("fr", "16:9")}
        calculateMetadata={sizeFromAspect}
      />
      <Composition
        id="ReadmeLoop"
        component={LoopComposition}
        durationInFrames={LOOP_FRAMES}
        fps={FPS}
        {...LOOP_SIZE}
        defaultProps={film("en", "16:9")}
      />

      {/* Each part alone, with its own sound: to review, and to cut ads from. */}
      <Folder name="Parts">
        {parts.map((part) => (
          <Composition
            key={part.id}
            id={part.id}
            component={part.component}
            durationInFrames={part.frames}
            fps={FPS}
            {...formats["16:9"]}
            defaultProps={film("en", "16:9")}
            calculateMetadata={sizeFromAspect}
          />
        ))}
      </Folder>

      {/* Other shapes, laid out but not polished yet: check them before using them in an ad. */}
      <Folder name="Drafts">
        <Composition
          id="Film-Vertical"
          component={FilmComposition}
          durationInFrames={FILM_FRAMES}
          fps={FPS}
          {...formats["9:16"]}
          defaultProps={film("en", "9:16")}
          calculateMetadata={sizeFromAspect}
        />
        <Composition
          id="Film-Square"
          component={FilmComposition}
          durationInFrames={FILM_FRAMES}
          fps={FPS}
          {...formats["1:1"]}
          defaultProps={film("en", "1:1")}
          calculateMetadata={sizeFromAspect}
        />
      </Folder>
    </>
  );
}
