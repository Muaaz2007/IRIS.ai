import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchHealth, streamChat } from '../lib/api';
import { mockStreamChat } from '../lib/mock';
import type { ChatMessage, Conversation, HealthStatus, HistoryTurn, SSEEvent } from '../lib/types';

const STORAGE_KEY = 'iris.conversations.v1';

const uid = () => Math.random().toString(36).slice(2, 10);

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Conversation[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* corrupted storage — start fresh */
  }
  return [];
}

function newConversation(): Conversation {
  return { id: uid(), title: 'New chat', updated_at: new Date().toISOString(), messages: [], backendId: null };
}

/**
 * Chat state machine.
 *
 * Transport selection (INTEGRATION SEAM):
 *  - Backend healthy  -> POST /api/chat SSE stream (security -> ML -> Ollama)
 *  - Backend offline  -> built-in demo stub (src/lib/mock.ts) so the UI stays usable
 *  - First real send failing on network -> falls back to demo once, flagging demoMode
 */
export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const stored = loadConversations();
    return stored.length > 0 ? stored : [newConversation()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const stored = loadConversations();
    return (stored[0] ?? { id: '' }).id || '';
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const healthRef = useRef<HealthStatus | null>(null);
  const streamingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  healthRef.current = health;

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId],
  );

  // Persist conversations
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 50)));
    } catch {
      /* storage full — non-fatal */
    }
  }, [conversations]);

  // Poll backend health (drives sidebar status + demo-mode banner)
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const poll = async () => {
      const h = await fetchHealth(ac.signal);
      if (cancelled) return;
      setHealth(h);
      setDemoMode(h === null || !h.ollama?.reachable);
    };
    poll();
    const timer = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      ac.abort();
      clearInterval(timer);
    };
  }, []);

  const patchMessage = useCallback((convId: string, msgId: string, patch: Partial<ChatMessage>) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id !== convId
          ? c
          : { ...c, updated_at: new Date().toISOString(), messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) },
      ),
    );
  }, []);

  const appendToken = useCallback((convId: string, msgId: string, token: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id !== convId
          ? c
          : {
              ...c,
              updated_at: new Date().toISOString(),
              messages: c.messages.map((m) => (m.id === msgId ? { ...m, content: m.content + token, pending: true } : m)),
            },
      ),
    );
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streamingRef.current) return;

      // Ensure an active conversation exists
      let convId = active?.id;
      if (!convId) {
        const conv = newConversation();
        setConversations((prev) => [conv, ...prev]);
        setActiveId(conv.id);
        convId = conv.id;
      }

      const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed };
      const assistantMsg: ChatMessage = { id: uid(), role: 'assistant', content: '', pending: true };

      const history: HistoryTurn[] = [
        ...(active?.messages ?? [])
          .filter((m) => !m.blocked && !m.error)
          .map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: trimmed },
      ];

      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                title: c.messages.length === 0 ? trimmed.slice(0, 42) : c.title,
                updated_at: new Date().toISOString(),
                messages: [...c.messages, userMsg, assistantMsg],
              },
        ),
      );

      streamingRef.current = true;
      setIsStreaming(true);
      const ac = new AbortController();
      abortRef.current = ac;

      const handleEvent = (event: SSEEvent, data: Record<string, unknown>) => {
        switch (event) {
          case 'meta':
            setConversations((prev) =>
              prev.map((c) => (c.id === convId ? { ...c, backendId: (data.conversation_id as string) ?? null } : c)),
            );
            break;
          case 'guard':
            if (data.passed === false) {
              // Security layer rejected the prompt: distinct blocked state, no model text.
              patchMessage(convId!, assistantMsg.id, { blocked: true, pending: false, content: '' });
            }
            break;
          case 'classify':
            patchMessage(convId!, assistantMsg.id, {
              classify: { label: data.label as 'benign' | 'harmful', confidence: Number(data.confidence ?? 0) },
            });
            break;
          case 'token':
            appendToken(convId!, assistantMsg.id, String(data.text ?? ''));
            break;
          case 'done':
            patchMessage(convId!, assistantMsg.id, { pending: false });
            break;
          case 'error':
            patchMessage(convId!, assistantMsg.id, { pending: false, error: String(data.message ?? 'Model error') });
            break;
        }
      };

      const runStream = async () => {
        if (healthRef.current?.ollama?.reachable) {
          // Real backend: security -> ML -> Ollama chain
          await streamChat({ message: trimmed, history, conversationId: active?.backendId ?? null, signal: ac.signal, onEvent: handleEvent });
          setDemoMode(false);
        } else {
          // Backend offline: demo stub keeps the UI explorable
          setDemoMode(true);
          await mockStreamChat({ message: trimmed, _history: history, signal: ac.signal, onEvent: handleEvent });
        }
      };

      try {
        await runStream();
      } catch (err) {
        if (ac.signal.aborted) {
          patchMessage(convId!, assistantMsg.id, { pending: false });
        } else if (healthRef.current?.ollama?.reachable) {
          // Real backend failed mid-flight — retry once via demo so UX never dead-ends
          try {
            setDemoMode(true);
            await mockStreamChat({ message: trimmed, _history: history, signal: ac.signal, onEvent: handleEvent });
          } catch {
            patchMessage(convId!, assistantMsg.id, { pending: false, error: (err as Error).message });
          }
        } else {
          patchMessage(convId!, assistantMsg.id, { pending: false, error: (err as Error).message });
        }
      } finally {
        streamingRef.current = false;
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [active, appendToken, patchMessage],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const createConversation = useCallback(() => {
    if (streamingRef.current) abortRef.current?.abort();
    const conv = newConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      if (id === activeId && streamingRef.current) abortRef.current?.abort();
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        const safe = next.length > 0 ? next : [newConversation()];
        if (id === activeId) setActiveId(safe[0].id);
        return safe;
      });
    },
    [activeId],
  );

  const refreshHealth = useCallback(async () => {
    const h = await fetchHealth();
    setHealth(h);
    setDemoMode(h === null || !h.ollama?.reachable);
    return h;
  }, []);

  return {
    conversations,
    active,
    activeId: active?.id ?? '',
    setActiveId,
    isStreaming,
    health,
    demoMode,
    sendMessage,
    stop,
    newConversation: createConversation,
    deleteConversation,
    refreshHealth,
  };
}
