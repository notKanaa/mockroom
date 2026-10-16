// The promo film: seven scenes back to back, and the sound cues over them.

import type { ComponentType } from "react";
import { AbsoluteFill, Series } from "remotion";
import { AudioTrack } from "../audio/AudioTrack";
import { promoCues, resolveCues } from "../audio/cues";
import { FilmProvider, type FilmProps } from "../lib/film";
import { Answer } from "../scenes/Answer";
import { CallToAction } from "../scenes/CallToAction";
import { DemoDebrief } from "../scenes/DemoDebrief";
import { DemoInterview } from "../scenes/DemoInterview";
import { DemoOffer } from "../scenes/DemoOffer";
import { Privacy } from "../scenes/Privacy";
import { Problem } from "../scenes/Problem";
import { stage } from "../theme/tokens";
import { scenes, type SceneId } from "../timeline";

/** Each scene of the film. They also stand alone, as compositions to cut ads from (see Root). */
export const sceneComponents: Record<SceneId, ComponentType> = {
  problem: Problem,
  answer: Answer,
  offer: DemoOffer,
  interview: DemoInterview,
  debrief: DemoDebrief,
  privacy: Privacy,
  cta: CallToAction,
};

export interface PromoProps extends FilmProps {
  /** Plays the voice-over cues, when their files are there. */
  voiceOver: boolean;
}

export function Promo(props: PromoProps) {
  return (
    <FilmProvider value={props}>
      <AbsoluteFill style={{ background: stage.ink }}>
        <Series>
          {scenes.map((scene) => {
            const Scene = sceneComponents[scene.id];
            return (
              <Series.Sequence key={scene.id} durationInFrames={scene.duration} name={scene.id}>
                <Scene />
              </Series.Sequence>
            );
          })}
        </Series>
        <AudioTrack cues={resolveCues(promoCues(props.locale))} voiceOver={props.voiceOver} />
      </AbsoluteFill>
    </FilmProvider>
  );
}

/** One scene on its own, for ads and quick previews. */
export function SceneOnly(props: FilmProps & { scene: SceneId }) {
  const Scene = sceneComponents[props.scene];
  return (
    <FilmProvider value={props}>
      <AbsoluteFill style={{ background: stage.ink }}>
        <Scene />
      </AbsoluteFill>
    </FilmProvider>
  );
}
