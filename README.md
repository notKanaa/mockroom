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

Until the settings screen arrives, Mockroom picks its AI from environment variables. The easiest way is to copy `.env.example` to `.env` and fill it in: `npm start` and `npm run dev` read it.

| Variable              | What it does                                                                 |
| --------------------- | ---------------------------------------------------------------------------- |
| `MOCKROOM_PROVIDER`   | `openai`, `anthropic`, `gemini` or `ollama`                                  |
| `MOCKROOM_MODEL`      | The model to use. Optional, except for Ollama (e.g. `llama3.2`)              |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | Your key for the chosen provider. Ollama needs none |
| `MOCKROOM_OLLAMA_URL` | Where Ollama runs. Defaults to `http://127.0.0.1:11434`                      |

Your key is only sent to the provider you chose.

Pick an **interview pack** (filter them by technology, level and language): the interviewer asks up to 5 of its questions, one at a time, and ends the interview with a closing message. For now there is one built-in sample pack (React, junior, in English).

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
