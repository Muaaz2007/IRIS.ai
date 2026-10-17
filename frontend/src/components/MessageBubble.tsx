import { useState } from 'react';
import { Check, Copy, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { ChatMessage } from '../lib/types';
import { AssistantAvatar } from './Logo';
import { MarkdownContent } from './MarkdownContent';
import { PipelineTrace } from './PipelineTrace';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 pt-1" aria-label="IRIS is responding">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent animate-blink-dot"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-ink-muted opacity-0 transition-all hover:bg-panel hover:text-ink-soft focus-visible:opacity-100 group-hover:opacity-100"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ClassifyBadge({ classify }: { classify: NonNullable<ChatMessage['classify']> }) {
  const harmful = classify.label === 'harmful';
  const pct = Math.round(classify.confidence * 100);
  return (
    <span
      title={`ML classifier (${harmful ? 'harmful' : 'benign'} · ${pct}% confidence)`}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium ${
        harmful ? 'border-danger/30 bg-danger-soft text-danger' : 'border-line bg-panel text-ink-muted'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${harmful ? 'bg-danger' : 'bg-success'}`} />
      {harmful ? 'flagged' : 'safe'} · {pct}%
    </span>
  );
}

/**
 * One chat turn.
 * - user      → right-aligned warm bubble (Claude-style)
 * - assistant → full-width reply with avatar, markdown, classify badge
 * - blocked   → distinct security-layer notice (never looks like a model reply)
 * - error     → transport/model error notice
 */
export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="group flex animate-fade-up justify-end px-4 py-3 md:px-0">
        <div className="max-w-[80%] rounded-3xl rounded-br-lg bg-panel px-4 py-2.5 text-[15px] leading-relaxed text-ink md:max-w-[75%]">
          <span className="whitespace-pre-wrap">{message.content}</span>
        </div>
      </div>
    );
  }

  // Assistant side
  return (
    <div className="group flex animate-fade-up gap-3 px-4 py-3 md:px-0">
      <AssistantAvatar />

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">IRIS</span>
          {message.classify && <ClassifyBadge classify={message.classify} />}
        </div>

        {message.blocked ? (
          <div className="max-w-xl rounded-2xl border border-warning/30 bg-accent-soft/70 px-4 py-3">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-warning">
              <ShieldAlert size={15} />
              Message blocked by security layer
            </div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
              The IRIS security screening rejected this prompt before it reached the model. Nothing was sent to
              Ollama — rephrase your message to continue.
            </p>
          </div>
        ) : message.error ? (
          <div className="max-w-xl rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-danger">
              <TriangleAlert size={15} />
              Something went wrong
            </div>
            <p className="mt-1 text-[13.5px] text-ink-soft">{message.error}</p>
          </div>            ) : message.pending && message.content === '' ? (
          <TypingIndicator />
        ) : (
          <>
            <div className="text-[15px] leading-[1.7] text-ink">
              <MarkdownContent>{message.content}</MarkdownContent>
            </div>
            {!message.pending && message.content !== '' && (
              <div className="mt-1 flex items-center gap-1">
                <CopyButton text={message.content} />
              </div>
            )}
          </>
        )}
        <PipelineTrace message={message} />
      </div>
    </div>
  );
}
