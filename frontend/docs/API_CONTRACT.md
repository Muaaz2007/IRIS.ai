# IRIS.ai — Frontend ↔ Backend API Contract

The frontend assumes the Python backend (FastAPI recommended) exposes exactly these
endpoints. Backend team: keep this file updated — the UI is generated from it.

Base URL (dev): `http://localhost:8000`
All routes are prefixed `/api`. The dev server proxies `/api → backend`.

---

## `GET /api/health`

Used by the UI to show connection status (online / offline banner).

```json
{
  "status": "ok",
  "ollama": { "reachable": true, "model": "llama3" },
  "security_layer": { "loaded": true },
  "ml_classifier": { "loaded": true, "version": "1.0" }
}
```

---

## `POST /api/chat`  (SSE streaming)

Send a user message, receive the assistant reply token-by-token.

**Request**

```json
{
  "conversation_id": "uuid | null",
  "message": "user text",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response** — `Content-Type: text/event-stream`, events:

| event    | data payload                                          | UI reaction                    |
|----------|-------------------------------------------------------|--------------------------------|
| `meta`   | `{ "conversation_id": "uuid" }`                       | store conversation id          |
| `guard`  | `{ "passed": true }`                                  | if `false`, show blocked state |
| `classify` | `{ "label": "benign" \| "harmful", "confidence": 0.98 }` | optional inline badge     |
| `token`  | `{ "text": "chunk" }`                                 | append to streaming bubble     |
| `done`   | `{ "finish_reason": "stop" }`                         | finalize message               |
| `error`  | `{ "code": "ollama_offline", "message": "..." }`      | show error state               |

**Blocked (non-streamed) case** — if the security layer rejects the prompt, the server
sends `guard` with `passed:false` followed by `done`. The UI must render a distinct
"message blocked by safety layer" state — do NOT show it as a normal assistant reply.

---

## `GET /api/conversations`  /  `GET /api/conversations/{id}`

Conversation history for the sidebar / reload.

```json
{
  "conversations": [
    { "id": "uuid", "title": "first 40 chars...", "updated_at": "ISO-8601" }
  ]
}
```

---

## Error envelope (non-2xx)

```json
{ "detail": "human-readable message", "code": "MACHINE_CODE" }
```

Common codes: `ollama_offline`, `classifier_missing`, `security_blocked`, `rate_limited`.

---

## Notes for the frontend agent

- Use `fetch` + `ReadableStream` (or `EventSource` fallback) for SSE; no extra SDK needed.
- Send `history` from client state so the backend can stay stateless if desired.
- Retry policy: retry `GET /api/health` every 15s when offline; do not auto-retry `POST /api/chat`.
- Never call Ollama (`:11434`) from the browser — it bypasses security + classifier.
