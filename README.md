# Mockroom

**Open-source AI technical interview simulator that runs on your machine.**

Pick a technology (or paste a job offer), and an AI interviewer asks you technical questions, digs into your answers like a real recruiter, then gives you a detailed debrief of what to review. Free, private, in English or French.

> 🇫🇷 **Simulateur d'entretiens techniques open source, animé par une IA, qui tourne sur ton ordi.** Choisis une techno ou colle une offre d'emploi : l'IA te fait passer l'entretien, puis te dit précisément quoi réviser.

## Status

🚧 Early development — not published on npm yet, but you can run it from the repo (see below). See the [v1 scope](docs/perimetre-v1.md) (in French).

## Run it locally

You need [Node.js](https://nodejs.org) 22.12 or later.

```bash
git clone https://github.com/notKanaa/mockroom.git
cd mockroom
npm install
npm run build
npm start
```

`npm start` runs the `mockroom` command: it starts a local server on a free port and opens Mockroom in your browser. Add `-- --no-open` to skip opening the browser. The server only listens on `127.0.0.1`, so nothing is reachable from outside your machine.

To get the real `mockroom` command in your shell, run `npm link` after building.

### Choose your AI

The first time you open Mockroom, it takes you to **Settings**: pick OpenAI, Anthropic, Gemini, or [Ollama](https://ollama.com) to run a free model on your computer, choose a model, enter your API key (Ollama needs none), then **Test connection**. You can come back to Settings at any time; changes apply right away, no restart needed.

Your settings and API keys are saved in `settings.json` in Mockroom's data folder (see [Past interviews](#past-interviews)), on your computer only. A key is only ever sent to the provider it belongs to, and Mockroom's screens only show its last 4 characters.

With Ollama, Mockroom lists the models you have installed. To get one, run `ollama pull llama3.2`.

#### Environment variables

You can also choose the AI with environment variables, for example in a `.env` file (copy `.env.example`): `npm start` and `npm run dev` read it. **They override what is saved in Settings**, which then says so.

| Variable              | What it does                                                                 |
| --------------------- | ---------------------------------------------------------------------------- |
| `MOCKROOM_PROVIDER`   | `openai`, `anthropic`, `gemini` or `ollama`                                  |
| `MOCKROOM_MODEL`      | The model to use. Optional, except for Ollama (e.g. `llama3.2`)              |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | Your key for the provider. Ollama needs none |
| `MOCKROOM_OLLAMA_URL` | Where Ollama runs. Defaults to `http://127.0.0.1:11434`                      |
| `MOCKROOM_FOLLOW_UPS` | The most follow-up questions the interviewer asks on one question. Defaults to `2`; `0` turns them off |
| `MOCKROOM_DATA_DIR`   | Where Mockroom keeps your data (settings and past interviews). Defaults to the usual folder for app data (see below) |

Pick an **interview pack** (filter them by technology, level and language): the interviewer asks up to 5 of its questions, one at a time, and ends the interview with a closing message. When an answer is vague or misses key points of the pack, the interviewer asks a follow-up question before moving on, like a real recruiter, but never gives the answer away. For now there is one built-in sample pack (React, junior, in English).

### Past interviews

Every interview you finish or end early is saved on your computer, with its full transcript and debrief. Open **Past interviews** on the home screen to read one again or delete it. There is no account and nothing is sent anywhere: each interview is a JSON file in the `interviews` folder of Mockroom's data folder (`npm start` prints its path when it starts), next to `settings.json`:

| System          | Data folder                                                       |
| --------------- | ----------------------------------------------------------------- |
| Windows         | `%APPDATA%\Mockroom`                                              |
| macOS           | `~/Library/Application Support/Mockroom`                          |
| Linux and others | `$XDG_DATA_HOME/mockroom`, or `~/.local/share/mockroom`          |

### Write an interview pack

Packs are plain YAML files in the [`packs`](packs) folder: anyone can write one, no coding needed. See [CONTRIBUTING.md](CONTRIBUTING.md) for the format and an annotated example.

### Contributing: dev mode

```bash
npm run dev
```

This starts the API (restarts when server code changes) and the Vite dev server with hot reload. Open the URL Vite prints (usually http://localhost:5173); it forwards `/api` calls to the API on port 4317 (change it with the `MOCKROOM_API_PORT` environment variable).

Other scripts:

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm test`          | Runs the tests (HTTP API with a fake AI model)     |
| `npm run typecheck` | Type-checks the server, tests and UI               |
| `npm run validate-packs` | Checks the packs in `packs` against the pack format |
| `npm run build`     | Builds the UI into `dist/ui` and the server into `dist/server` |

## Planned for v1

- Technical-question interviews with follow-up questions
- Bring your own key (OpenAI, Anthropic, Gemini) **or** run free and locally with [Ollama](https://ollama.com)
- English and French
- Community-written **interview packs** (React, Python, Java, Symfony, C#…) — contribute one without writing code
- Paste a job offer to get a tailored interview
- Detailed per-question debrief, saved locally

## License

[MIT](LICENSE)
