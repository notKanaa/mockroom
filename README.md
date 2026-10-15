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
