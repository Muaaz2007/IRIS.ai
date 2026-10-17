import { useEffect, useRef } from 'react';
import { Code2, Lightbulb, Menu, Moon, ShieldCheck, Sparkles, Sun, Terminal } from 'lucide-react';
import type { Conversation, HealthStatus } from '../lib/types';
import { useTheme } from '../hooks/useTheme';
import { HoneyEmberBackground } from '@/components/ui/honey-ember-background';
import { PromptInput } from '@/components/ui/ai-chat-input';
import { MessageBubble } from './MessageBubble';

export type SendMeta = { model: string; effort: string };

interface ChatWindowProps {
  conversation: Conversation | undefined;
  isStreaming: boolean;
  health: HealthStatus | null;
  demoMode: boolean;
  onSend: (text: string, meta?: SendMeta) => void;
  onStop: () => void;
  onMenu: () => void;
}

// Ollama models exposed in the composer's model picker.
// Keep in sync with what the backend pulls (default: llama3.2, see User Manual).
const MODELS = ['Llama 3.2', 'Llama 3.2 1B', 'Iris Sentinel'];

const SUGGESTIONS = [
  { icon: ShieldCheck, label: 'Explain the safety pipeline', text: 'Explain how the security layer, ML classifier and Ollama work together in IRIS.' },
  { icon: Code2, label: 'Write some Python', text: 'Write a Python quicksort with type hints and a short docstring.' },
  { icon: Terminal, label: 'Set up Ollama locally', text: 'Give me the exact commands to install Ollama and pull a model for IRIS.' },
  { icon: Lightbulb, label: 'Brainstorm features', text: 'Suggest 5 features that would make IRIS.ai stand out from other chatbots.' },
];

/** Empty state — HoneyEmber backdrop, centered greeting + suggestions + composer. */
function EmptyState({ onPick, isStreaming, onSend, onStop, greeting }: {
  onPick: (text: string) => void;
  isStreaming: boolean;
  onSend: (text: string, meta?: SendMeta) => void;
  onStop: () => void;
  greeting: string;
}) {
  return (
    <HoneyEmberBackground className="flex min-h-full flex-1 flex-col items-center justify-center px-4 pb-6">
      <div className="w-full max-w-2xl animate-fade-up text-center">
        <h1 className="font-serif text-3xl font-bold text-ink dark:text-ink md:text-4xl">{greeting}</h1>
        <p className="mt-2 text-[15px] text-ink-muted">
          Your guarded, local AI assistant — powered by Ollama, screened by the IRIS security &amp; ML layers.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {SUGGESTIONS.map(({ icon: Icon, label, text }) => (
            <button
              key={label}
              type="button"
              onClick={() => onPick(text)}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3 text-left backdrop-blur-sm transition-all hover:border-accent/40 hover:shadow-composer dark:bg-surface/70"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon size={15} />
              </span>
              <span className="text-[13.5px] font-medium text-ink-soft group-hover:text-ink">{label}</span>
            </button>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <PromptInput
            placeholder={greeting.toLowerCase().includes('welcome') ? 'Ask anything...' : 'Reply to IRIS...'}
            models={MODELS}
            onSubmit={(value, meta) => {
              if (isStreaming) onStop();
              onSend(value, { model: meta.model, effort: meta.effort });
            }}
          />
        </div>
      </div>
    </HoneyEmberBackground>
  );
}

/** Main conversation pane: header, demo banner, message list, composer. */
export function ChatWindow({
  conversation,
  isStreaming,
  health,
  demoMode,
  onSend,
  onStop,
  onMenu,
}: ChatWindowProps) {
  const { theme, toggle } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const messages = conversation?.messages ?? [];

  // Greeting by time of day — small Claude-style touch.
  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? 'Working late?' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Auto-scroll while streaming if the user is already near the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  };

  const modelLabel = demoMode ? 'demo mode' : (health?.ollama?.model ?? 'ollama');

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-canvas">
      {/* Header */}
      <header className="flex h-13 items-center gap-3 border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open sidebar"
          className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-panel md:hidden"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-ink">
          {conversation?.title || 'New chat'}
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-soft">
          <Sparkles size={11} className="text-accent" />
          IRIS · {modelLabel}
        </span>
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-panel hover:text-ink"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Demo-mode banner — disappears automatically once the backend is up */}
      {demoMode && (
        <div className="flex items-center justify-center gap-2 border-b border-warning/15 bg-accent-soft/40 px-4 py-2 text-center text-[12px] text-ink-soft">
          <Sparkles size={13} className="shrink-0 text-accent" />
          <span>
            Backend offline — running in <strong>demo mode</strong> with mocked replies. Start the FastAPI +
            Ollama backend to activate live security &amp; ML layers.
          </span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState
            onPick={onSend}
            isStreaming={isStreaming}
            onSend={onSend}
            onStop={onStop}
            greeting={greeting}
          />
        ) : (
          <>
            <div className="mx-auto w-full max-w-3xl py-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              <div className="h-4" />
            </div>
            <div className="mx-auto w-full max-w-3xl px-4 pb-6 md:px-0">
              <div className="flex justify-center">
                <PromptInput
                  placeholder="Message IRIS..."
                  models={MODELS}
                  onSubmit={(value, meta) => {
                    if (isStreaming) onStop();
                    onSend(value, { model: meta.model, effort: meta.effort });
                  }}
                />
              </div>
              <p className="pt-2 text-center text-[11px] text-ink-muted">
                IRIS.ai can make mistakes. Verify important information.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
