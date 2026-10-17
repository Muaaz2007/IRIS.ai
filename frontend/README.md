# IRIS.ai — Frontend (Chat UI)

The user-facing chat interface for **IRIS.ai**. This folder holds the web UI layer only —
it talks to the Python backend over HTTP/SSE and **never** talks to Ollama, the ML model,
or the security layer directly.

## Where this sits in the architecture

```
┌────────────┐   HTTP / SSE   ┌──────────────────────────────┐
│  frontend  │ ─────────────► │  backend (FastAPI, future)   │
│  (this)    │ ◄───────────── │   1. security layer (guard)  │
└────────────┘                │   2. ml classifier (harmful?)│
                              │   3. ollama (chat context)   │
                              └──────────────────────────────┘
```

Pipeline per message: **security guard → ML harmful/benign classifier → Ollama → streamed reply.**

## Status

- [x] Folder structure created
- [x] Stack: Vite + React 18 + TypeScript + Tailwind (Claude.ai-inspired warm theme)
- [x] UI built: sidebar (conversations + live pipeline status), chat pane, composer,
      markdown replies with copyable code blocks, suggestion chips, empty state
- [x] All message states: streaming (typewriter + stop button), security-blocked bubble,
      ML classify badge, model/transport error, backend-offline demo mode
- [x] Backend integration seam ready: `src/lib/api.ts` (SSE client) + `src/hooks/useChat.ts`
- [ ] Connect real FastAPI backend implementing `docs/API_CONTRACT.md` (then delete `src/lib/mock.ts`)
- [ ] Optional: reskin from UI/UX mockups (design tokens live in `tailwind.config.js`)

## Folder layout

```
frontend/
├── README.md              ← you are here
├── .gitignore
├── index.html
├── vite.config.ts         ← dev server + /api proxy → FastAPI backend
├── tailwind.config.js     ← design tokens (Claude-style warm palette)
├── docs/
│   └── API_CONTRACT.md    ← backend endpoints the UI depends on
├── public/                ← static assets (favicon, logos)
└── src/
    ├── main.tsx / App.tsx ← app shell (sidebar + chat pane)
    ├── index.css          ← global styles, thin scrollbars
    ├── components/        ← Sidebar, ChatWindow, ChatInput, MessageBubble, MarkdownContent, Logo
    ├── hooks/
    │   └── useChat.ts     ← streaming state machine (THE integration point)
    └── lib/
        ├── types.ts       ← contract types (sync with docs/API_CONTRACT.md)
        ├── api.ts         ← SSE client: fetchHealth + streamChat
        └── mock.ts        ← demo backend (delete once FastAPI is live)
```

## Ground rules

1. **Claude-style UI** — warm cream canvas (`#FAF9F5`), terracotta accent (`#C96442`),
   serif wordmark, right-aligned user bubbles, full-width assistant replies.
   All colors/spacing live in `tailwind.config.js` for easy reskinning from mockups.
2. **No secrets in the frontend** — no API keys, no Ollama URLs baked in. All config comes
   from the backend or `VITE_API_BASE` env var at most.
3. **Backend is the single source of truth** — the UI only calls the endpoints in
   `docs/API_CONTRACT.md`; the browser never hits Ollama `:11434` directly.
4. **Every message state has a visual** — pending, streaming, blocked-by-security,
   classifier-flagged, model-offline, and network error are all implemented.

## Running

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000  (proxies /api → localhost:8000)
npm run build    # typecheck + production bundle
```

## Connecting the backend layers

The UI ships in **demo mode** until the Python backend is up:

1. Implement `GET /api/health` and `POST /api/chat` (SSE) per `docs/API_CONTRACT.md` —
   e.g. FastAPI chaining security guard → ML classifier → Ollama.
2. `npm run dev` proxies `/api/*` to `http://localhost:8000` (override: `VITE_API_TARGET`).
3. When `/api/health` reports `ollama.reachable: true`, the demo banner disappears and
   messages stream from the real model automatically — no frontend code changes needed.
4. Then delete `src/lib/mock.ts` (only `useChat.ts` imports it).
