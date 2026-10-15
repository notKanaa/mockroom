# Mockroom

Open-source AI technical interview simulator that runs locally (`npx mockroom`). The v1 scope (in French) is in `docs/perimetre-v1.md`.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `notKanaa/mockroom`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.
