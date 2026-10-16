# Mockroom's promo video

The launch film and the README loop, made in code with [Remotion](https://www.remotion.dev). This folder is a separate project with its own `package.json`: it isn't part of the `mockroom` npm package, and the app's CI doesn't build it.

| Composition      | What it is                                     | Size, length          |
| ---------------- | ---------------------------------------------- | --------------------- |
| `Promo`          | The film, in English                           | 1920×1080, 30 fps, 52.5 s |
| `Promo-FR`       | The same film in French                        | 1920×1080, 52.5 s     |
| `Promo-Vertical` | 9:16 layout, for stories and short-form ads    | 1080×1920             |
| `Promo-Square`   | 1:1 layout, for feed posts                     | 1080×1080             |
| `ReadmeLoop`     | A 10 s loop of the app, for the README         | 1280×800, 10 s        |
| `Scene-*`        | Each of the seven scenes alone, to cut ads from | 1920×1080            |

The vertical and square versions are laid out but not polished yet: check them before using them in an ad.

## Preview

You need Node.js 22 or later. From this folder:

```bash
npm install
npm run studio
```

Remotion Studio opens in your browser: pick a composition on the left, play it, scrub the timeline. Edits to the code show up right away. The first preview or render downloads a headless Chrome (about 120 MB), once.

## Render

Everything goes to `out/`, which git ignores.

| Command                    | Output                                                 |
| -------------------------- | ------------------------------------------------------ |
| `npm run render`           | The film, the loop as MP4 and the loop as GIF          |
| `npm run render:promo`     | `out/mockroom-promo.mp4`                               |
| `npm run render:promo-fr`  | `out/mockroom-promo-fr.mp4`                            |
| `npm run render:vertical`  | `out/mockroom-promo-vertical.mp4`                      |
| `npm run render:square`    | `out/mockroom-promo-square.mp4`                        |
| `npm run render:loop`      | `out/mockroom-loop.mp4` (960×600)                      |
| `npm run render:gif`       | `out/mockroom-loop.gif` (800×500, 15 fps)              |
| `npm run stills -- Promo 450 900` | PNG stills of frames 450 and 900 in `out/stills/`, to check a look quickly |

Any composition takes props on the command line, for example a French loop:

```bash
npx remotion render ReadmeLoop out/mockroom-loop-fr.mp4 --props='{"locale":"fr"}'
```

## How it's built

- **The UI is the real app, not screenshots.** The shots import the app's own stylesheet (`../src/ui/styles.css`), components (`kit.tsx`, `Recruiter.tsx`, `Icons.tsx`) and interface strings (`messages.ts`), so they always match the app and stay sharp at any zoom. The app's own CSS animations are switched off in the shots; the video drives every move frame by frame, so renders are reproducible.
- **`src/content/locales.ts`** holds all the film's copy and the sample interview, in English and French. Every name and company in it is fictional. The `locale` prop picks the language.
- **`src/timeline.ts`** holds every scene's length and the beats inside it. Scenes animate on these beats, and the audio cues hit on them.
- **`src/scenes/`** has one component per scene. `aspect` (`"16:9"`, `"9:16"`, `"1:1"`) changes their layout, so the same scenes make ads in other shapes.
- **The mark is the motif.** Mockroom's logo is two discs face to face: the recruiter (filled) and the candidate (a ring). The film opens on the ring alone, under pressure; the disc arrives and becomes Mockroom; the ring grows into "your machine" in the privacy beat.

## Sound

The film renders silent for now, with a slot ready for every sound:

- `src/audio/cues.ts` lists each cue: sound effects (whooshes on transitions, clicks, typing, a success chime on the debrief), three music sections, and an optional voice-over line per scene. Each cue says which file it expects and what it should sound like, as a prompt for ElevenLabs.
- `npm run cues` writes the list, with times in seconds for both languages, to `audio-cues.json`.
- Drop a file at the path a cue names, under `public/` (for example `public/audio/sfx/answer-dock.mp3`): the next preview or render plays it at its cue. Missing files are skipped.
- The voice-over plays only with the prop `"voiceOver": true`, so you can render a music-and-effects cut too.

## Remotion's license

Remotion is not MIT: it has its own [license](https://www.remotion.dev/license). It is free for individuals, for-profit organizations with up to 3 employees, and non-profits, including for commercial use such as ads. Bigger companies need a paid Company License. Mockroom, made by an individual, uses the free license. If Mockroom is ever made by a company of 4 or more people, check the license again. (The terms quoted here are from Remotion 4.0.536, in `node_modules/remotion/LICENSE.md`; Remotion says they will change slightly in version 5.)

The fonts, Bricolage Grotesque and JetBrains Mono, are under the SIL Open Font License, and are loaded from Google Fonts at render time.
