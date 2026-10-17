import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

/** Claude-style composer: rounded card, auto-growing textarea, Enter to send. */
export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow with content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(value);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="px-4 pb-3 md:px-0">
      <div className="rounded-3xl border border-line bg-surface shadow-composer transition-shadow focus-within:border-accent/40">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message IRIS.ai..."
          className="scroll-hide max-h-[220px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-muted disabled:opacity-60"
        />
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          <span className="px-1 text-[11.5px] text-ink-muted">
            Local Ollama · guarded by IRIS security &amp; ML layers
          </span>
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-canvas transition-colors hover:bg-ink-soft"
            >
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-panel-strong disabled:text-ink-muted"
            >
              <ArrowUp size={16} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
      <p className="pt-2 text-center text-[11px] text-ink-muted">
        IRIS.ai can make mistakes. Verify important information.
      </p>
    </div>
  );
}
