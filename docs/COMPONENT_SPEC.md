# IRIS.ai — Component Specification

One section per component: **role → inputs → outputs → code → configuration →
failure mode**. This is the document to read when you need to change one layer
without breaking the others.

Shared contract: every component is callable from Python and has no hidden state
except the session store (in memory) and the audit log (append-only file).

---

## 1. Frontend — `frontend/`

| | |
|---|---|
| **Role** | User-facing chat shell: landing screen, conversation list, message states, live pipeline status. |
| **Inputs** | Keystrokes in `ChatInput`; SSE frames from the gateway; `GET /api/health`. |
| **Outputs** | `POST /api/chat` request; rendered markdown replies; blocked/warn/error states; `PipelineTrace`. |
| **Code** | `src/App.tsx` (shell) · `src/components/` (`Landing`, `ChatWindow`, `MessageBubble`, `PipelineTrace`, `Sidebar`, `ChatInput`, `MarkdownContent`, `Logo`, `ui/`) · `src/hooks/useChat.ts` (streaming state machine) · `src/lib/api.ts` (SSE client) · `src/lib/types.ts` (contract types) · `src/lib/mock.ts` (offline demo stub) |
| **Config** | `VITE_API_BASE` (default: same origin, proxied), `VITE_API_TARGET` for the dev proxy (`vite.config.ts`). |
| **State** | Conversations in `localStorage` (`iris.conversations.v1`), capped at 50; health polled every 15 s. |
| **Failure mode** | Backend unreachable → demo stub + demo banner; mid-stream failure → one demo fallback, then an error bubble. Never silently fakes a live model. |

## 2. API Gateway — `api/main.py`

| | |
|---|---|
| **Role** | HTTP surface and SSE streamer; owns CORS, validation, health and reset. |
| **Inputs** | `POST /api/chat` (`conversation_id`, `message` 1–8000 chars, `history`), `GET /api/health`, `GET /api/session`, `POST /api/sentinel/reset`. |
| **Outputs** | SSE frames `meta → guard → classify → token* → done` (+`error`), JSON health/session. |
| **Code** | `api/main.py` (routes, `sse()` encoder, Ollama streaming via `httpx.AsyncClient`), `api/layers.py` (shared screening chain). |
| **Config** | `OLLAMA_HOST`, `IRIS_MODEL`, `OLLAMA_TIMEOUT`; CORS origins hardcoded for `localhost:3000/3001`. |
| **Failure mode** | Emits `error` with a machine code and always terminates the stream with `done`. Rejects over-long or empty prompts as `invalid_prompt`. |

## 3. Normalizer — `security/checks.py`

| | |
|---|---|
| **Role** | Make obfuscation irrelevant: one canonical text for everything downstream. |
| **Inputs** | Raw prompt string. |
| **Outputs** | Normalized string (≤4000 chars), or `ValueError` when too long. |
| **Transformations** | `unicodedata.normalize("NFKC")` (fullwidth/homoglyph fold) → strip zero-width characters → collapse whitespace → base64-looking chunks (≥16 chars) decoded and appended after `[decoded]`. |
| **Code** | `clean_text()`, `_decode_base64_chunks()`, `MAX_PROMPT_LENGTH = 4000`. |
| **Failure mode** | Raises on over-length; the gateway turns that into `invalid_prompt`. Base64 chunks that do not decode to mostly-printable text are ignored. |

## 4. Rules Engine — `security/rules.py`

| | |
|---|---|
| **Role** | Detect jailbreak *intent* deterministically, including lightly obfuscated spelling. |
| **Inputs** | Normalized text. |
| **Outputs** | `list[str]` of matched families, e.g. `["override"]`, `["persona", "authority"]`. |
| **Families** | `persona` (unrestricted-AI roleplay, DAN, developer mode) · `override` (ignore/disregard safety, disable filters, system-prompt extraction) · `authority` (I-am-your-developer, admin/authorized override, OpenAI/Anthropic claims). |
| **Code** | `RULES`, `COMPILED_RULES`, `LEET_MAP`, `check_rules()` — each pattern is matched against both the raw lowercased text and a l33tspeak-decoded copy. |
| **Tuning history** | The `authority` family previously matched `I am a developer, …` (optional `your`), producing a false positive on a legitimate question; the possessive or an org claim is now required. See [EVALUATION.md](EVALUATION.md) §2. |
| **Failure mode** | Regexes cannot understand meaning: novel phrasings and non-English attacks are missed by design and are the classifier's job (see [THREAT_MODEL.md](THREAT_MODEL.md) §4). |

## 5. ML Classifier — `ml/predict.py`, `ml/train_v3.py`

| | |
|---|---|
| **Role** | Score harmful *content* regardless of phrasing. |
| **Inputs** | Cleaned text. |
| **Outputs** | `predict_prompt(text) → (label, {class: probability})`; `api/layers.classify()` turns that into `(label, confidence, risk ∈ [0,1])`. |
| **Model** | `TfidfVectorizer(max_features=50000, ngram_range=(1,2), sublinear_tf, min_df=2, stop_words='english')` + `LogisticRegression(max_iter=1000, class_weight='balanced')`, persisted with `joblib` (2.5 MB). |
| **Code** | `ml/predict.py` (loading + `predict_prompt`), `ml/train_v3.py` (training), `ml/evaluate_errors.py` (metrics), `ml/prepare_data.py` + `ml/add_writing_examples.py` (dataset tooling). |
| **Config** | `IRIS_MODEL_PATH` overrides the artifact location; default is `ml/iris_text_classifier_v3.joblib`. |
| **Failure mode** | Missing artifact or broken scikit-learn → module import raises, `api/layers` records `LOAD_ERROR`, `CLASSIFIER` is `None`, health reports `loaded:false, version:null, reason:<text>`, classification returns `("unscored", 0.0, 0.0)` and the rules layer decides alone. |

## 6. Session Tracker — `security/session.py`

| | |
|---|---|
| **Role** | Remember risky behaviour per pseudonymous client and expire it. |
| **Inputs** | Client identifier (gateway passes `request.client.host`; the CLI proxy passes `cli-user`). |
| **Outputs** | `hash_id(user) → "anon-<16 hex>"`, `get_strikes(uid) → int`, `add_strike(uid) → int`, `reset_strikes()`. |
| **Storage** | `defaultdict(deque)` of timestamps, thread-locked, per process. `STRIKE_WINDOW_SECONDS = 600`. |
| **Config** | `SENTINEL_SECRET` (HMAC key; a dev fallback exists and must be replaced in production). |
| **Failure mode** | State is lost on restart and is per process — run one Uvicorn worker, or move to Redis before scaling out. |

## 7. Policy + Audit — `security/enforcement.py`, `logs/audit.log`

| | |
|---|---|
| **Role** | Combine the score, the rule flags and the strike count into one decision, then record it. |
| **Inputs** | `user_id`, cleaned text, `risk_score` (0–1). |
| **Outputs** | `{"decision": "ALLOW"\|"WARN"\|"BLOCK", "reason": "<user-safe text>"}`; one JSONL audit line. |
| **Thresholds** | `BLOCK_THRESHOLD = 0.8`, `WARN_THRESHOLD = 0.5`, `MAX_STRIKES = 3`. Precedence: invalid score → BLOCK; `>0.8` → BLOCK; strikes ≥3 → BLOCK; `≥0.5` or flags → WARN; else ALLOW. |
| **Audit line** | `{"time", "id", "score", "flags", "strikes", "decision"}` — no prompt text, no raw IP, no user-supplied strings. Written under a lock with `os.makedirs` on first use. |
| **Config** | `SENTINEL_AUDIT_LOG` (default `logs/audit.log`). |
| **Failure mode** | Fails closed: NaN/out-of-range scores return BLOCK. If the audit path is unwritable the request errors rather than proceeding unaudited. |

## 8. Local LLM — Ollama `llama3.2` (external process)

| | |
|---|---|
| **Role** | Generate the answer — only after a non-blocking verdict. |
| **Inputs** | `POST {OLLAMA_HOST}/api/chat` with `{model, messages, stream:true}`; messages = filtered history + cleaned user text. |
| **Outputs** | NDJSON chunks; the gateway forwards `message.content` as `token{text}` frames. |
| **Code** | `api/main.py` (streaming), `api/layers.py:ollama_info()` (health probe), `api/proxy.py` (CLI-facing reverse proxy). |
| **Config** | `OLLAMA_HOST` (default `http://127.0.0.1:11434`), `IRIS_MODEL` (default `llama3.2`), `OLLAMA_TIMEOUT` (120 s). |
| **Failure mode** | `ConnectError` → `ollama_offline`; `ReadTimeout` → `ollama_timeout`; non-200 → `ollama_http` with `detail`. Configured deliberately with no fallback model, so an outage cannot silently remove the guard. |

---

## 9. Compatibility notes

- **Two entry points, one guard chain.** `api/main.py` (browser) and
  `api/proxy.py` (`ollama run` CLI) both call `api/layers.gate()`; the CLI returns
  an Ollama-shaped reply containing `[AI Sentinel] Blocked: <reason>` so existing
  clients keep working.
- **Version reporting.** `api/layers._load_classifier()` derives
  `CLASSIFIER_VERSION` from the artifact filename, so a renamed model changes
  `/api/health` and the sidebar label.
- **Environment variables:** `OLLAMA_HOST`, `IRIS_MODEL`, `OLLAMA_TIMEOUT`,
  `IRIS_MODEL_PATH`, `SENTINEL_SECRET`, `SENTINEL_AUDIT_LOG` (backend);
  `VITE_API_BASE`, `VITE_API_TARGET` (frontend).
- **Dependencies:** see `requirements.txt` (fastapi, uvicorn, httpx, joblib,
  scikit-learn, pandas, numpy) and `frontend/package.json`; licences are listed in
  [../LICENSES.md](../LICENSES.md).
