// Types mirroring frontend/docs/API_CONTRACT.md — keep in sync with the backend.

export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  /** Security layer rejected the prompt before it reached the model. */
  blocked?: boolean;
  /** ML classifier output (ml/ layer), surfaced as a subtle badge. */
  classify?: { label: 'benign' | 'harmful'; confidence: number };
  /** Non-fatal transport/model error attached to this message. */
  error?: string;
  /** Assistant message still streaming. */
  pending?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  messages: ChatMessage[];
  /** conversation_id assigned by backend `meta` SSE event (null until then). */
  backendId?: string | null;
}

/** GET /api/health payload — presence of each layer drives the status UI. */
export interface HealthStatus {
  status: string;
  ollama: { reachable: boolean; model?: string };
  security_layer: { loaded: boolean };
  /** `reason` explains why loaded=false (missing model file, sklearn mismatch…). */
  ml_classifier: { loaded: boolean; version?: string; reason?: string | null };
}

/** SSE event names emitted by POST /api/chat. */
export type SSEEvent = 'meta' | 'guard' | 'classify' | 'token' | 'done' | 'error';

export interface HistoryTurn {
  role: Role;
  content: string;
}
