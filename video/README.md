# Mockroom's promo video

The launch film and the README loop, made in code with [Remotion](https://www.remotion.dev), sound included. This folder is a separate project with its own `package.json`: it isn't part of the `mockroom` npm package, and the app's CI doesn't build it.

| Composition                 | What it is                                                     | Size, length              |
| --------------------------- | -------------------------------------------------------------- | ------------------------- |
| `Film`                      | The film, in English, with its sound                           | 1920×1080, 30 fps, 55.5 s |
| `Film-FR`                   | The same film in French                                        | 1920×1080, 55.5 s         |
| `ReadmeLoop`                | A silent 11 s loop for the README, ending where it starts      | 1280×720                  |
| `Parts/Part1-Opening` … `Part5-YourAI` | Each part alone, with its sound: to review, and to cut ads from | 1920×1080 |
| `Drafts/Film-Vertical`, `Drafts/Film-Square` | 9:16 and 1:1 layouts, not polished yet: check them before using them in an ad | 1080×1920, 1080×1080 |

The film, part by part:

1. **Opening** (10 s): a lone ring (the candidate) beats like a heart under "Technical interviews are stressful", the words burst, the camera dives through the ring, the price of a coach rolls in on slot reels and is cut by a teal slash, which floods the frame, collapses into the recruiter's disc, docks with the ring (Mockroom's mark), and the camera flies through into the logo.
2. **Product** (11.5 s): the promises roll past on a 120 BPM beat ($0, open source, English · Français), the language toggle's knob morphs into the prompt box, the job offer's words fade in, an AI glow runs around the box while it reads, and the technologies lift off the text and land in their card.
3. **Interview** (10 s): the teal frame closes into Camille's avatar, the question streams in, the answer rises as a bubble, the progress rolls to "Follow-up 1", and the follow-up streams in focus.
4. **Debrief** (9 s): Camille's notes, then each question's card with its columns swinging open, folded into the interview's file as the frame goes dark.
5. **Your AI** (15 s): the providers with their logos as in Settings, your own API key typed, tested and connected (it stays on your machine and only goes to its provider), then Ollama, offline; everything implodes into 127.0.0.1, which becomes a terminal: `npx mockroom`, Enter, and the end card.

## Preview

You need Node.js 22 or later. From this folder:

```bash
npm install
npm run studio
```

This makes the sound effects, then opens Remotion Studio in your browser: pick a composition on the left, play it, scrub the timeline. Edits to the code show up right away. The first preview or render downloads a headless Chrome (about 120 MB), once.

## Render

Everything goes to `out/`, which git ignores.

| Command                  | Output                                                          |
| ------------------------ | --------------------------------------------------------------- |
| `npm run render`         | All of the below                                                |
| `npm run render:film`    | `out/mockroom-promo.mp4`                                        |
| `npm run render:film-fr` | `out/mockroom-promo-fr.mp4`                                     |
| `npm run render:loop`    | `out/mockroom-loop.mp4`                                         |
| `npm run render:gif`     | `out/mockroom-loop.gif` (640×360, 10 fps, about 9 MB: prefer the MP4 in a README, GitHub plays it) |
| `npm run stills -- Film 450 900` | PNG stills of frames 450 and 900 in `out/stills/`, to check a look quickly |

Run `npm run sfx` once before rendering a single composition (`npm run render` and `npm run studio` do it for you).

## How it's built

- **The UI is the real app, not screenshots.** The shots use the app's own stylesheet (`../src/ui/styles.css`), components (`kit.tsx`, `Recruiter.tsx`, `Icons.tsx`, `ProviderIcons.tsx`) and interface strings (`messages.ts`), in its light and dark themes, so they match the app and stay sharp at any zoom. The app's own CSS animations are switched off in the shots; the video drives every move frame by frame, so renders are reproducible.
- **`src/v2/`** holds the film: one file per part (`Part1.tsx` … `Part5.tsx`, with `Analysis.tsx` for the second half of part 2), `Film.tsx` to put them together, `Loop.tsx` for the README loop, and `fx.tsx`, the motion kit (springs, glows, light streaks, blurred word reveals, camera shake, grain).
- **`src/v2/beats.ts`** holds every part's beats, in frames at 30 fps; the pictures move on them and the sounds hit on them.
- **`src/content/locales.ts`** holds the film's copy and the sample interview, in English and French. Every name and company in it is fictional. The `locale` prop picks the language.

## Sound

The sound is sketched in code, so the film has its full sound design before the final effects exist:

- `scripts/sfx/` is a tiny synthesiser (noise, filters, envelopes, reverb). `npm run sfx` makes 39 effects and a 120 BPM groove into `public/audio/synth/` (gitignored; same result every time).
- `src/v2/cues.ts` places them on the beats, part by part, and for the whole film (where parts 2 to 4 share one groove so the beat never restarts).
- **To use final sounds** (for instance from ElevenLabs): `npm run cues` writes `audio-cues.json`, with a brief per sound (what it should feel like) and every cue's time in seconds. Put a final sound in `public/audio/final/` under the same name (`slam.wav` or `slam.mp3`): it replaces its sketch everywhere, at the next preview or render.

## Remotion's license

Remotion is not MIT: it has its own [license](https://www.remotion.dev/license). It is free for individuals, for-profit organizations with up to 3 employees, and non-profits, including for commercial use such as ads. Bigger companies need a paid Company License. Mockroom, made by an individual, uses the free license. If Mockroom is ever made by a company of 4 or more people, check the license again. (The terms quoted here are from Remotion 4.0.536, in `node_modules/remotion/LICENSE.md`; Remotion says they will change slightly in version 5.)

The fonts, Bricolage Grotesque and JetBrains Mono, are under the SIL Open Font License, and are loaded from Google Fonts at render time. The provider logos come from the app (Lobe Icons, MIT).
