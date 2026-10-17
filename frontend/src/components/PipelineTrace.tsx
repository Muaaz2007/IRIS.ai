import { Cpu, ListChecks, ShieldCheck } from 'lucide-react';
import type { ChatMessage } from '../lib/types';

type StageState = 'idle' | 'active' | 'ok' | 'blocked' | 'error';

function StageIcon({ icon: Icon, state }: { icon: typeof ShieldCheck; state: StageState }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
        state === 'ok'
          ? 'bg-success/15 text-success'
          : state === 'blocked'
            ? 'bg-warning/15 text-warning'
            : state === 'error'
              ? 'bg-danger/15 text-danger'
              : state === 'active'
                ? 'bg-accent/15 text-accent'
                : 'bg-panel text-ink-muted'
      }`}
    >
      <Icon size={10} strokeWidth={2.5} />
    </span>
  );
}

function Stage({ icon, label, note, state }: {
  icon: typeof ShieldCheck;
  label: string;
  note?: string;
  state: StageState;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <StageIcon icon={icon} state={state} />
      <span className="text-[11px] font-medium text-ink-muted">{label}</span>
      {note && <span className="text-[10.5px] text-ink-muted opacity-80">· {note}</span>}
    </div>
  );
}

/**
 * Minimal pipeline trace under each assistant reply:
 * Security guard (rules/session) → ML classifier (ml/) → Ollama model.
 * Lets the user SEE the two protective layers working on every turn.
 */
export function PipelineTrace({ message }: { message: ChatMessage }) {
  const stages: { icon: typeof ShieldCheck; label: string; note?: string; state: StageState }[] = [];

  if (message.blocked) {
    stages.push({ icon: ListChecks, label: 'Security layer', note: 'blocked this prompt', state: 'blocked' });
    stages.push({ icon: Cpu, label: 'ML classifier', note: 'not reached', state: 'idle' });
    stages.push({ icon: Cpu, label: 'Ollama', note: 'never called', state: 'idle' });
  } else {
    stages.push({
      icon: ShieldCheck,
      label: 'Security layer',
      note: message.pending && !message.content ? 'screening…' : 'passed',
      state: message.pending && !message.content ? 'active' : 'ok',
    });
    if (message.classify) {
      stages.push({
        icon: Cpu,
        label: 'ML classifier',
        note: `${message.classify.label} · ${Math.round(message.classify.confidence * 100)}%`,
        state: 'ok',
      });
    } else {
      stages.push({ icon: Cpu, label: 'ML classifier', note: 'standby', state: 'idle' });
    }
    stages.push({
      icon: Cpu,
      label: 'Ollama',
      note: message.error ? 'unavailable' : message.pending ? 'generating…' : 'replied',
      state: message.error ? 'error' : message.pending ? 'active' : 'ok',
    });
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 opacity-90">
      {stages.map((s, i) => (
        <div key={s.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="mr-1.5 text-[10px] text-line">→</span>}
          <Stage icon={s.icon} label={s.label} note={s.note} state={s.state} />
        </div>
      ))}
    </div>
  );
}
