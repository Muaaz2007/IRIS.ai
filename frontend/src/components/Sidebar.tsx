import { useState } from 'react';
import { ChevronDown, Plus, RefreshCw, Terminal, Trash2 } from 'lucide-react';
import type { Conversation, HealthStatus } from '../lib/types';
import { Logo } from './Logo';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  health: HealthStatus | null;
  demoMode: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  className?: string;
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean | null }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span className="text-ink-muted">{label}</span>
      <span className="flex items-center gap-1.5 font-medium text-ink-soft">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            ok === null ? 'bg-ink-muted' : ok ? 'bg-success animate-blink-dot' : 'bg-warning'
          }`}
        />
        {value}
      </span>
    </div>
  );
}

/**
 * Collapsible Ollama setup guide — the exact 3-terminal flow from the User Manual.
 */
function SetupGuide() {
  const [open, setOpen] = useState(false);
  const steps = [
    { title: 'Install Ollama', cmd: 'ollama pull llama3.2', hint: 'from ollama.com, then pull a model' },
    { title: 'Start the backend', cmd: 'uvicorn api.main:app --port 8000', hint: 'in ai_sentinel with .venv active — runs security + ML layers' },
    { title: 'Run the frontend', cmd: 'npm run dev', hint: 'in frontend/ — proxies /api to the backend' },
  ];
  return (
    <div className="mx-3 mb-3 rounded-xl border border-line bg-surface/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:bg-panel-strong/40"
      >
        <Terminal size={13} className="shrink-0 text-accent" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Connect Ollama</span>
        <ChevronDown size={13} className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="space-y-2 border-t border-line px-3 py-2.5 text-[11.5px]">
          {steps.map((s, i) => (
            <li key={s.title}>
              <div className="font-medium text-ink-soft">{i + 1}. {s.title}</div>
              <code className="mt-0.5 block select-all rounded-md bg-panel px-2 py-1 font-mono text-[10.5px] text-ink">{s.cmd}</code>
              <div className="mt-0.5 text-[10.5px] text-ink-muted">{s.hint}</div>
            </li>
          ))}
          <li className="text-[10.5px] text-ink-muted">
            Every message passes: security rules → ML classifier → Ollama. See <span className="font-medium">User Manual</span> for troubleshooting.
          </li>
        </ol>
      )}
    </div>
  );
}

/**
 * Left navigation + layer status panel.
 * The status card is the live view of the backend pipeline:
 * backend / Ollama / security layer / ML classifier (from GET /api/health).
 */
export function Sidebar({
  conversations,
  activeId,
  health,
  demoMode,
  onSelect,
  onNew,
  onDelete,
  onRefresh,
  className = '',
}: SidebarProps) {
  return (
    <aside
      className={`flex h-full w-[272px] shrink-0 flex-col border-r border-line bg-panel ${className}`}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <Logo size={30} />
        <div className="min-w-0">
          <div className="font-serif text-[16px] font-bold leading-tight text-ink">IRIS.ai</div>
          <div className="text-[11px] leading-tight text-ink-muted">Guarded local AI</div>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[13.5px] font-medium text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
        >
          <Plus size={15} className="text-accent" />
          New chat
        </button>
      </div>

      {/* Conversations */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-1">
        <div className="px-1 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Recent
        </div>
        {conversations.length === 0 && (
          <p className="px-1 py-2 text-[12.5px] text-ink-muted">No conversations yet.</p>
        )}
        <ul className="space-y-0.5">
          {conversations.map((c) => {
            const isActive = c.id === activeId;
            return (
              <li key={c.id}>
                <div
                  className={`group flex cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-[13.5px] transition-colors ${
                    isActive ? 'bg-panel-strong text-ink' : 'text-ink-soft hover:bg-panel-strong/60'
                  }`}
                  onClick={() => onSelect(c.id)}
                >
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  <button
                    type="button"
                    aria-label="Delete conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    className="ml-1 rounded-md p-1 text-ink-muted opacity-0 transition-opacity hover:bg-surface hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Layer status — live pipeline view */}
      <div className="m-3 rounded-xl border border-line bg-surface/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Pipeline status
          </span>
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh status"
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-panel hover:text-ink-soft"
          >
            <RefreshCw size={12} />
          </button>
        </div>
        <div className="space-y-1.5">
          <StatusRow
            label="Backend"
            value={health ? 'connected' : demoMode ? 'offline · demo' : 'checking…'}
            ok={health ? true : health === null && demoMode ? false : null}
          />
          <StatusRow
            label="Ollama"
            value={health?.ollama?.reachable ? (health.ollama.model || 'connected') : 'not connected'}
            ok={health?.ollama?.reachable ?? null}
          />
          <StatusRow
            label="Security layer"
            value={health?.security_layer?.loaded ? 'active' : 'standby'}
            ok={health?.security_layer?.loaded ?? null}
          />
          <StatusRow
            label="ML classifier"
            value={health?.ml_classifier?.loaded ? `active${health.ml_classifier.version ? ` v${health.ml_classifier.version}` : ''}` : 'standby'}
            ok={health?.ml_classifier?.loaded ?? null}
          />
        </div>
      </div>

      {/* Ollama setup guide */}
      <SetupGuide />
    </aside>
  );
}
