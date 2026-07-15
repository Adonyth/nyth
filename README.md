# nyth — a local-first, sovereign companion agent

**nyth** is an always-present AI companion built on a different premise: your assistant should run on
hardware **you own**, remember you in a way that **stays yours**, and never lock you into one vendor's
cloud, model, or account.

This repository is the first working increment — a zero-build, local-first web app you can run in seconds.

> **Why local-first + sovereign.** Today's assistants live on someone else's servers; you're a guest who
> can be evicted, whose data is mined, whose model can't be swapped, and who can't leave with what the
> assistant learned about you. nyth is designed the other way: local by default, memory you can export
> and take with you, and a provider-neutral model layer so no single vendor holds a veto over you.

## What it does today

- **Mode system** (the whole-device operating logic): **accompany / alone / do-not-disturb**. Switching is
  by touch — *alone mode's promise of silence can't depend on speaking to enter or leave it*; a silent,
  physical switch is the privacy guarantee.
- **Persistent, portable memory** (the core bet): nyth extracts durable facts from conversation, keeps them
  **on your device**, and feeds them back so it grows more useful over time — "gets better the more you use
  it." Cross-device continuity is done the honest local-first way: **export** on one device, **import** on
  another. No server, no account.
- **Model sovereignty**: provider-neutral. Run fully offline on a **local model (Ollama)**, or bring your own
  key for any OpenAI-compatible endpoint. Your key stays on your machine. Swap the backend anytime — no lock-in.
- **Data sovereignty**: everything lives in your browser's local storage. One-click **export** your memory
  (your exit right), clear it anytime, no account required.

## Run it

Zero build, zero dependencies — pure ES modules, served over http (module scripts can't run from `file://`):

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

**Connect a real model (optional):**
- *Fully offline (most sovereign):* run `ollama serve` + `ollama pull qwen2.5:3b-instruct`, then in Settings
  pick **Local Ollama**, endpoint `http://localhost:11434/v1`, model `qwen2.5:3b-instruct`.
- *Cloud, your key:* Settings → OpenAI-compatible endpoint, paste your key (stored locally only).
- Or don't connect anything — it runs in a demo mode that still shows the memory behavior.

## Honest scope

This is an early, working first increment, not a finished product. It is deliberately narrow: an on-device
companion with portable memory and no vendor lock-in. It does **not** claim always-on ambient sensing or any
hardware — those are different problems for a different stage.

## Structure

```
index.html      shell — mode bar, conversation, memory & settings drawers
styles.css      calm, dark-by-default, theme-aware
src/store.js    local-first persistence (localStorage; fully exportable as JSON)
src/llm.js      provider-neutral inference (demo / ollama / openai-compatible)
src/memory.js   memory engine (extract → persist → inject into the system prompt)
src/app.js      wiring (modes / conversation / memory surface / settings)
```

## License

MIT — see [LICENSE](./LICENSE). Published openly, in part, as prior art; see [PROVENANCE.md](./PROVENANCE.md).
