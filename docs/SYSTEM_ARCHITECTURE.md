# IRIS.ai — System Architecture

**IRIS.ai** is a guarded local-AI chat gateway. Every prompt is screened by a
deterministic rules layer and a trained harmful-prompt classifier **before** any
model sees it, and every decision is written to an audit trail that never
contains the prompt itself.

- **Runtime:** Python 3.12 + FastAPI (backend), React 18 + Vite (frontend), Ollama (local LLM)
- **Deployment target:** IBM LinuxONE / IBM Z (s390x), Ubuntu 22.04/24.04
- **Guarantee:** nothing leaves the machine. No cloud API, no telemetry, no outbound call.

![System architecture](diagrams/system_architecture.png)

> Regenerate the diagram: `python docs/diagrams/build_diagrams.py`

---

## 1. Components (8)

| # | Component | Code | Role |
|---|-----------|------|------|
| 1 | **Frontend** | `frontend/src/` | Landing screen, chat shell, sidebar status card, per-turn pipeline trace. Talks only to `/api/*`. |
| 2 | **API Gateway** | `api/main.py` | FastAPI app. `POST /api/chat` (SSE), `GET /api/health`, `GET /api/session`, `POST /api/sentinel/reset`. |
| 3 | **Normalizer** | `security/checks.py` | Undoes hiding tricks: NFKC fold, zero-width strip, base64 decode, whitespace collapse, length cap. |
| 4 | **Rules engine** | `security/rules.py` | Three regex families — `persona`, `override`, `authority` — also matched on a l33tspeak-decoded copy. |
| 5 | **ML classifier** | `ml/predict.py`, `ml/train_v3.py` | TF-IDF + logistic regression pipeline → `p(harmful) ∈ [0,1]`. |
| 6 | **Session tracker** | `security/session.py` | HMAC-pseudonymised client id + a 10-minute sliding window of strikes. |
| 7 | **Policy + audit** | `security/enforcement.py`, `logs/audit.log` | `decide()` thresholds, strike escalation, append-only JSONL audit line per decision. |
| 8 | **Local LLM** | Ollama `llama3.2` on `127.0.0.1:11434` | Generates the answer, streamed token by token. Only reached after the verdict. |

`api/layers.py` is the shared screening chain used by **both** entry points
(the web gateway and the CLI proxy `api/proxy.py`), so the web UI and the
`ollama run` CLI can never drift apart.

---

## 2. Request path (one turn)

```
browser ─ POST /api/chat ─► api/main.py
                              └─ api/layers.gate()
                                   ├─ checks.clean_text()      normalize
                                   ├─ ml.predict.predict_prompt()  p(harmful)
                                   └─ enforcement.evaluate()
                                        ├─ rules.check_rules()   flags
                                        ├─ session.get_strikes() strikes
                                        ├─ decide()              BLOCK / WARN / ALLOW
                                        └─ log_audit()           logs/audit.log
                              ─ BLOCK ─► SSE guard(passed:false) + done(blocked)   [model never called]
                              ─ WARN  ─► SSE guard(passed:true, WARN) + classify + stream
                              ─ ALLOW ─► SSE guard(passed:true, ALLOW) + classify + httpx stream to Ollama
```

SSE frame order is fixed: `meta → guard → classify → token* → done` (or `error`).
See [API_CONTRACT.md](API_CONTRACT.md) for the exact payloads and
[USER_FLOW.md](USER_FLOW.md) for the UI behaviour at each step.

---

## 3. Connections

| From | To | Protocol | Notes |
|------|----|----------|-------|
| Frontend | Gateway | HTTP + SSE (`fetch`) | Vite dev proxy `/api → :8000`; CORS allows `localhost:3000/3001` |
| Gateway | Classifier | in-process call | joblib model loaded once at startup (~1.2 ms per prompt) |
| Gateway | Ollama | HTTP `POST /api/chat` (stream) | `OLLAMA_HOST`, 120 s timeout, localhost by default |
| Gateway | Audit log | file append (JSONL) | lock-protected, one line per decision |
| Sidebar | Gateway | `GET /api/health` every 15 s | drives the four status rows |

---

## 4. Trust boundaries

1. **Browser ↔ gateway.** The browser is untrusted: prompts and history are
   attacker-controlled input. The frontend holds no secrets and never reaches
   Ollama directly (`:11434` is not exposed to the page).
2. **Gateway ↔ model.** The model is treated as untrusted output as well as a
   consumer of untrusted input; it is only ever called with text that passed
   normalization and scoring.
3. **Process ↔ disk.** Prompts and answers are never written to disk. The audit
   line contains a pseudonymous id, the score, the rule flags, the strike count
   and the decision — see [UAE_PDPL_COMPLIANCE.md](UAE_PDPL_COMPLIANCE.md).

## 5. Failure modes (fail-safe, not fail-open)

| Failure | Behaviour |
|---------|-----------|
| Model file missing / sklearn broken | Backend still starts; rules layer stays active; `/api/health` returns `loaded:false` + `reason`; sidebar shows **standby**; risky prompts reach WARN instead of BLOCK. |
| Ollama offline | Guard verdict is still streamed, then `error: ollama_offline` and `done: error`. No fallback to an unguarded model. |
| Ollama returns non-200 | `error: ollama_http` with the upstream body truncated to 300 chars. |
| Broken classifier output (NaN / out of range) | `decide()` **fails closed** and returns BLOCK. |
| Prompt over 4000 chars | `clean_text()` raises; gateway emits `error: invalid_prompt` and `done: rejected`. |
| Backend unreachable | Frontend switches to its built-in demo stub and shows the demo banner (UI stays explorable, clearly marked). |

## 6. Why this shape

- **Two independent detectors.** Regex rules catch *intent phrasings*; the ML
  model catches *harmful content* that has no jailbreak phrasing. They fail in
  different ways, so a single-layer bypass is not enough.
- **Deterministic before statistical.** Normalization and rules run first, so a
  base64-encoded or zero-width-obfuscated attack is judged on its decoded form.
- **Model-last.** The LLM is the most expensive and least predictable component;
  everything cheap and decisive happens before it.
- **Observable.** The sidebar and the per-turn `PipelineTrace` expose which layer
  did what, so the system can be demonstrated and debugged without reading logs.

## 7. Technology choices

| Layer | Choice | Why |
|-------|--------|-----|
| Gateway | FastAPI + Uvicorn | async SSE streaming, tiny footprint, one file to read |
| Classifier | scikit-learn `Pipeline` (TfidfVectorizer + LogisticRegression) | trains in ~2 min on CPU, 2.5 MB artifact, ~1 ms inference — no GPU |
| LLM | Ollama `llama3.2` (3B) | one-command local model, streams over plain HTTP |
| Frontend | Vite + React + TypeScript + Tailwind | single dev-server command, typed contract in `frontend/src/lib/types.ts` |
| Audit | JSONL file | greppable, append-only, no database to operate |

Next: [COMPONENT_SPEC.md](COMPONENT_SPEC.md) · [ML_FLOW.md](ML_FLOW.md) ·
[THREAT_MODEL.md](THREAT_MODEL.md) · [EVALUATION.md](EVALUATION.md) ·
[DEPLOYMENT.md](DEPLOYMENT.md)
