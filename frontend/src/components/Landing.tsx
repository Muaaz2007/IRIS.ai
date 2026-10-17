import { ArrowRight, Eye, ShieldCheck, Cpu } from 'lucide-react';
import { Logo } from './Logo';
import { useTheme } from '../hooks/useTheme';

const TEAM = [
  'Uthara Manojkumar',
  'Sackaria Joby',
  'Jiya Jaiswal',
  'Muaaz Syed',
  'Somadev',
];

interface LandingProps {
  onEnter: () => void;
}

/**
 * Opening page for IRIS.ai — brand, one-paragraph summary, pipeline overview,
 * and the Team Peak credits. Minimal, matches the chat's warm palette and
 * respects the dark/light theme.
 */
export function Landing({ onEnter }: LandingProps) {
  const { theme, toggle } = useTheme();

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-canvas">
      {/* Theme toggle, top-right */}
      <div className="absolute right-4 top-4 z-10">
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-panel hover:text-ink"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-14">
        <div className="w-full max-w-2xl animate-fade-up text-center">
          {/* Brand */}
          <div className="flex items-center justify-center gap-3">
            <Logo size={54} />
            <h1 className="font-serif text-5xl font-bold text-ink md:text-6xl">
              IRIS<span className="text-accent">.ai</span>
            </h1>
          </div>

          {/* Summary */}
          <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-relaxed text-ink-soft">
            A guarded, local AI assistant. Every message you send is screened by the
            {' '}<strong className="font-semibold text-ink">security layer</strong>, scored by the
            {' '}<strong className="font-semibold text-ink">ML classifier</strong>, and only then answered by
            {' '}<strong className="font-semibold text-ink">Ollama</strong> running entirely on your own machine —
            nothing leaves it.
          </p>

          {/* Pipeline preview */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {[
              { icon: ShieldCheck, label: 'Security layer' },
              { icon: Cpu, label: 'ML classifier' },
              { icon: Eye, label: 'Ollama model' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-2.5">
                {i > 0 && <span className="text-ink-muted">→</span>}
                <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft">
                  <Icon size={13} className="text-accent" />
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Enter */}
          <button
            type="button"
            onClick={onEnter}
            className="group mt-9 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-[14.5px] font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-pop"
          >
            Start chatting
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="mt-2.5 text-[11.5px] text-ink-muted">
            Connect Ollama any time — the chat also works in demo mode without it.
          </p>
        </div>
      </main>

      {/* Credits */}
      <footer className="border-t border-line px-6 py-5 text-center">
        <p className="text-[12px] text-ink-muted">
          Made by <strong className="font-semibold text-ink-soft">TEAM PEAK</strong>
          {' '}·{' '}
          <span className="text-ink-muted">
            Developed by{' '}
            {TEAM.map((name, i) => (
              <span key={name}>
                {i > 0 && (i === TEAM.length - 1 ? ' & ' : ', ')}
                <span className="text-ink-soft">{name}</span>
              </span>
            ))}
          </span>
        </p>
      </footer>
    </div>
  );
}
