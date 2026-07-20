# nyth — a local-first companion agent prototype

<!-- OMYTEA_ORG_SYNC_README_START -->
> **Organization source of truth:** [`Omytea-Almighty/nyth`](https://github.com/Omytea-Almighty/nyth). Humans and agents must read [`ORG-SYNC.md`](ORG-SYNC.md) before working. Reviewed commits are queued for fail-closed organization sync; automation never stages or commits dirty work and never changes visibility.
> This repository is public: every intentional commit is a publication decision. Secret scanning is not a privacy, PII, licensing, research, or commercial-sensitivity review.
<!-- OMYTEA_ORG_SYNC_README_END -->

**nyth** explores a simple design goal: an assistant whose durable memory and operating state remain under
the user's control, while model backends and devices can be changed through explicit, testable interfaces.

This repository is an early working increment: a zero-build web app with local memory, mode controls,
accountable suggestion receipts, optional local-network synchronization, and pluggable model connectors.
These mechanisms are prototypes—not proof of complete sovereignty, portability, product value, or security.

## What it does today

- **Touch-operated modes:** **accompany / alone / do-not-disturb**. In this web build, leaving `accompany`
  disables chat input as well as proactive output. The build has no always-listening wake path and no physical
  Privacy Lock, so these software modes make no sensor-disconnection or hardware privacy guarantee.
- **Local memory by default:** durable facts are stored in browser `localStorage`, injected into later
  conversations, and can be exported, imported, inspected, or cleared without an account.
- **Optional own-hub LAN sync:** devices can exchange memory operations through `hub/serve.py`; the client
  uses an operation log, last-write-wins merge, and periodic polling. The hub stores a **plaintext** local
  op-log, accepts cross-origin browser requests, and currently has no authentication or E2EE. Any origin or
  process that can reach it may attempt to read or mutate the log. Use it only for isolated testing with
  disposable data—never expose this v0 hub to the public internet or an untrusted network.
- **Pluggable model connectors:** the implementation exposes demo mode and an OpenAI-shaped connector used
  for local Ollama or a user-configured endpoint. This repository publishes no cross-provider conformance
  evidence. Compatibility must be tested for each exact provider, adapter, model, and version; it must not be
  inferred for an entire connector category.

- **Accountable suggestions + a local witness ledger**: every time nyth speaks up proactively, that
  suggestion is **frozen** as a prediction on a local append-only hash chain; your response (useful /
  not useful / silence) **resolves** it, and the scored history is yours to review. Tampering with any
  past row relative to a trusted chain head breaks verification. Because a local store and its head can be
  rebuilt together, this is a local tamper-evidence instrument—not an external timestamp, an unforgeable
  audit system, or a product-performance claim.

## Run it

Zero build, zero dependencies — pure ES modules, served over http (module scripts can't run from `file://`):

```bash
python3 -m http.server 4173 --bind 127.0.0.1
# open http://localhost:4173
```

**Connect a model (optional):**

- *Local inference:* install Ollama, run `ollama serve` + `ollama pull qwen2.5:3b-instruct`, then in Settings
  pick **Local Ollama**, endpoint `http://localhost:11434/v1`, model `qwen2.5:3b-instruct`. After the software
  and model are present, this inference path can run without sending prompts to a cloud model provider.
- *Cloud, your key:* Settings → OpenAI-compatible endpoint, then paste your key. The key remains in browser
  `localStorage`, but prompts and conversation data are sent to the endpoint you configure and are governed
  by that provider's security, retention, and usage terms.
- Or don't connect anything — it runs in a demo mode that still shows the memory behavior.

**Optional LAN sync:**

```bash
python3 hub/serve.py 4175
# in the app, enable sync and use http://<trusted-lan-host>:4175
```

The hub binds all interfaces, allows every browser origin, and has no production security controls. Run it
only on an isolated network with disposable test data. Do not port-forward it, place it on a public host,
use it on an untrusted/shared network, or use it for sensitive data.

## Honest scope

This is an early engineering prototype, not a finished product. Export/import, connector shape, a local hash
chain, and one LAN sync implementation do not by themselves prove provider portability, complete exit,
production security, long-term usefulness, or freedom from lock-in. The current project-level evidence is
software/simulation and version-bound; there is no ambient hardware, physical Privacy Lock, human cohort,
retention, willingness-to-pay, or unit-economics result here.

## Structure

```
index.html       shell — modes, conversation, memory, ledger, sync and settings
styles.css       visual system
src/store.js     local persistence and JSON import/export
src/llm.js       demo / Ollama / OpenAI-compatible connector surface
src/memory.js    memory extraction, persistence and prompt injection
src/receipts.js  suggestion freeze / resolve / score lifecycle
src/ledger.js    local hash-chain construction and verification
src/sync.js      LAN operation-log synchronization and merge
src/app.js       application wiring
hub/serve.py     dependency-free LAN sync hub (plaintext v0)
```

## License

MIT — see [LICENSE](./LICENSE). Published openly, in part, as a defensive-publication record; see
[PROVENANCE.md](./PROVENANCE.md).
