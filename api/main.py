"""IRIS.ai FastAPI backend.

Implements frontend/docs/API_CONTRACT.md:

    GET  /api/health   -> layer status for the sidebar
    POST /api/chat     -> SSE stream: meta -> guard -> classify -> token* -> done

Run it (Windows cmd, venv active, from the ai_sentinel folder):

    uvicorn api.main:app --port 8000

Every prompt passes, in order:
    1. security layer   (clean_text + rules + session strikes + policy)
    2. ML classifier    (ml/predict.py, joblib model)
    3. Ollama           (local model via http://127.0.0.1:11434)
"""

from __future__ import annotations

import json
import os
import uuid
from typing import Any, AsyncIterator

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from api.layers import CLASSIFIER, OLLAMA_BASE, OLLAMA_MODEL, OLLAMA_TIMEOUT, gate, ollama_info
from security.session import get_strikes, hash_id, reset_strikes

app = FastAPI(title="IRIS.ai", version="1.0.0")

# Dev origins: Vite picks 3000, and 3001 when 3000 is taken.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000",
                   "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryTurn(BaseModel):
    role: str
    content: str


class ChatPayload(BaseModel):
    conversation_id: str | None = None
    message: str = Field(min_length=1, max_length=8000)
    history: list[HistoryTurn] = Field(default_factory=list)


def sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ---------------------------------------------------------------------------
# Health — drives the sidebar pipeline card and the demo-mode banner
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health() -> dict[str, Any]:
    reachable, model = await ollama_info()
    return {
        "status": "ok",
        "ollama": {"reachable": reachable, "model": model or OLLAMA_MODEL},
        "security_layer": {"loaded": True},
        "ml_classifier": {"loaded": CLASSIFIER is not None, "version": "v4"},
    }


@app.post("/api/sentinel/reset")
async def reset() -> dict[str, str]:
    reset_strikes()
    return {"status": "reset"}


@app.get("/api/session")
async def session(request: Request) -> dict[str, Any]:
    """Pseudonymous id + strikes for this client, so the UI can explain lockouts."""
    uid = hash_id(_client_id(request))
    return {"id": uid, "strikes": get_strikes(uid), "max_strikes": 3}


def _client_id(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# Chat — the guarded pipeline, streamed over SSE
# ---------------------------------------------------------------------------
@app.post("/api/chat")
async def chat(payload: ChatPayload, request: Request) -> StreamingResponse:
    async def stream() -> AsyncIterator[str]:
        conversation_id = payload.conversation_id or str(uuid.uuid4())
        yield sse("meta", {"conversation_id": conversation_id})

        try:
            screening = gate(_client_id(request), payload.message)
        except ValueError as exc:
            yield sse("error", {"code": "invalid_prompt", "message": str(exc)})
            yield sse("done", {"finish_reason": "rejected"})
            return

        # --- Layer 1 + 2 verdict ---
        if screening["decision"] == "BLOCK":
            yield sse("guard", {"passed": False, "reason": screening["reason"]})
            yield sse("classify", {"label": screening["label"], "confidence": screening["confidence"]})
            yield sse("done", {"finish_reason": "blocked"})
            return

        yield sse("guard", {"passed": True, "decision": screening["decision"], "reason": screening["reason"]})
        yield sse("classify", {"label": screening["label"], "confidence": screening["confidence"]})

        # --- Layer 3: Ollama ---
        messages = [
            *({"role": t.role, "content": t.content} for t in payload.history if t.role in {"user", "assistant"}),
            {"role": "user", "content": screening["text"]},
        ]

        try:
            async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE}/api/chat",
                    json={"model": OLLAMA_MODEL, "messages": messages, "stream": True},
                ) as res:
                    if res.status_code != 200:
                        body = await res.aread()
                        yield sse("error", {"code": "ollama_http", "message": f"Ollama returned {res.status_code}", "detail": body[:300].decode(errors="replace")})
                        yield sse("done", {"finish_reason": "error"})
                        return

                    async for line in res.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        text = chunk.get("message", {}).get("content", "")
                        if text:
                            yield sse("token", {"text": text})
                        if chunk.get("done"):
                            break
        except httpx.ConnectError:
            yield sse("error", {"code": "ollama_offline", "message": "Ollama is not running (start it with: ollama serve)"})
            yield sse("done", {"finish_reason": "error"})
            return
        except httpx.ReadTimeout:
            yield sse("error", {"code": "ollama_timeout", "message": "Ollama took too long to answer"})
            yield sse("done", {"finish_reason": "error"})
            return

        yield sse("done", {"finish_reason": "stop"})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
