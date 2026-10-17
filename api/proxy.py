"""AI Sentinel proxy — put it between the `ollama` CLI and real Ollama.

Matches the workflow in the User Manual:

    # window 1
    uvicorn api.proxy:app --port 11435
    # window 2
    set OLLAMA_HOST=127.0.0.1:11435
    ollama run llama3.2

Prompts are screened by the security layer + ML classifier before they reach
the model. Blocked prompts get a normal Ollama-style reply containing
"[AI Sentinel] Blocked: <reason>" so any client keeps working.

    POST /sentinel/reset   clears strike counters (see User Manual)

The same guards the web backend uses live in api/layers.py, so the CLI and the
web UI can never drift apart.
"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse

from api.layers import OLLAMA_BASE, OLLAMA_MODEL, OLLAMA_TIMEOUT, gate
from security.session import reset_strikes

app = FastAPI(title="AI Sentinel proxy", version="1.0.0")


def _blocked_reply(reason: str, model: str) -> dict[str, Any]:
    return {
        "model": model,
        "created_at": "",
        "message": {"role": "assistant", "content": f"[AI Sentinel] Blocked: {reason}"},
        "done": True,
    }


def _sse_or_ndjson(chunks: list[dict[str, Any]]) -> StreamingResponse:
    body = "".join(json.dumps(c) + "\n" for c in chunks)

    async def gen() -> AsyncIterator[str]:
        yield body

    return StreamingResponse(gen(), media_type="application/x-ndjson")


async def _forward(request: Request, path: str, body: dict[str, Any] | None) -> Response:
    """Pass an already-screened request through to the real Ollama."""
    headers = {k: v for k, v in request.headers.items() if k.lower() in {"content-type", "accept"}}
    client = httpx.AsyncClient(timeout=OLLAMA_TIMEOUT)
    try:
        req = client.build_request(request.method, f"{OLLAMA_BASE}{path}", headers=headers, json=body)
        upstream = await client.send(req, stream=True)
    except httpx.ConnectError:
        await client.aclose()
        return JSONResponse({"error": "Ollama is not running (start it with: ollama serve)"}, status_code=502)

    async def gen() -> AsyncIterator[bytes]:
        try:
            async for chunk in upstream.aiter_raw():
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    return StreamingResponse(gen(), status_code=upstream.status_code,
                             media_type=upstream.headers.get("content-type", "application/x-ndjson"))


def _last_user_message(payload: dict[str, Any]) -> str:
    messages = payload.get("messages") or []
    for turn in reversed(messages):
        if turn.get("role") == "user":
            return str(turn.get("content", ""))
    return str(payload.get("prompt", ""))


@app.post("/api/chat")
async def chat(request: Request) -> Response:
    payload: dict[str, Any] = await request.json()
    prompt = _last_user_message(payload)
    model = payload.get("model") or OLLAMA_MODEL

    try:
        screening = gate("cli-user", prompt)
    except ValueError as exc:
        return _sse_or_ndjson([_blocked_reply(str(exc), model)])

    if screening["decision"] == "BLOCK":
        return _sse_or_ndjson([_blocked_reply(screening["reason"], model)])

    payload.pop("model", None)
    payload["model"] = model
    return await _forward(request, "/api/chat", payload)


@app.post("/api/generate")
async def generate(request: Request) -> Response:
    payload: dict[str, Any] = await request.json()
    prompt = str(payload.get("prompt", ""))
    model = payload.get("model") or OLLAMA_MODEL

    try:
        screening = gate("cli-user", prompt)
    except ValueError as exc:
        return _sse_or_ndjson([_blocked_reply(str(exc), model)])

    if screening["decision"] == "BLOCK":
        return _sse_or_ndjson([_blocked_reply(screening["reason"], model)])

    payload["model"] = model
    return await _forward(request, "/api/generate", payload)


@app.get("/api/tags")
async def tags(request: Request) -> Response:
    return await _forward(request, "/api/tags", None)


@app.post("/sentinel/reset")
async def reset() -> dict[str, str]:
    reset_strikes()
    return {"status": "reset"}


@app.get("/")
async def index() -> dict[str, str]:
    return {
        "service": "AI Sentinel proxy",
        "upstream": OLLAMA_BASE,
        "tip": "set OLLAMA_HOST=127.0.0.1:11435 then use `ollama run <model>`",
    }
