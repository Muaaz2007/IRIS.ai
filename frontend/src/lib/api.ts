import type { HistoryTurn, HealthStatus, SSEEvent } from './types';

/**
 * Backend HTTP/SSE client.
 *
 * INTEGRATION SEAM — the FastAPI backend (not built yet) must implement
 * frontend/docs/API_CONTRACT.md. This file is the ONLY place the frontend
 * knows about the network:
 *
 *   POST /api/chat  -> backend chain: security guard -> ML classifier -> Ollama
 *   GET  /api/health -> layer status (ollama / security_layer / ml_classifier)
 *
 * The browser never talks to Ollama (:11434) directly — that would bypass
 * the security and ML layers.
 */

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Returns health payload, or null when the backend is unreachable. */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as HealthStatus;
  } catch {
    return null;
  }
}

type SSEFrame = { event: SSEEvent; data: Record<string, unknown> };

/** Incremental SSE parser (handles \n\n and \r\n\r\n frame delimiters). */
export function createSSEParser() {
  let buffer = '';
  return {
    push(chunk: string): SSEFrame[] {
      buffer += chunk.replace(/\r\n/g, '\n');
      const frames: SSEFrame[] = [];
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        let event: SSEEvent = 'token';
        const dataLines: string[] = [];
        for (const line of part.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim() as SSEEvent;
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        }
        if (dataLines.length === 0) continue;
        try {
          frames.push({ event, data: JSON.parse(dataLines.join('\n')) });
        } catch {
          /* skip malformed frame */
        }
      }
      return frames;
    },
  };
}

export interface StreamChatParams {
  message: string;
  history: HistoryTurn[];
  conversationId: string | null;
  signal: AbortSignal;
  onEvent: (event: SSEEvent, data: Record<string, unknown>) => void;
}

/** Streams a chat turn from the backend via POST /api/chat (text/event-stream). */
export async function streamChat(params: StreamChatParams): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      conversation_id: params.conversationId,
      message: params.message,
      history: params.history,
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    let detail = `request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }
  if (!res.body) throw new Error('empty response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSSEParser();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const frame of parser.push(decoder.decode(value, { stream: true }))) {
      params.onEvent(frame.event, frame.data);
    }
  }
  // Flush any trailing frame
  for (const frame of parser.push('\n\n')) {
    params.onEvent(frame.event, frame.data);
  }
}
