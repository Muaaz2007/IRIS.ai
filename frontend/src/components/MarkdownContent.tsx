import { useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[#35332F] bg-[#23221F]">
      <div className="flex items-center justify-between border-b border-[#35332F] px-3 py-1.5">
        <span className="text-[11px] uppercase tracking-wide text-white/45">{lang || 'code'}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-white/55 transition-colors hover:bg-white/10 hover:text-white/90"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="scroll-thin overflow-x-auto px-3.5 py-3 text-[13px] leading-relaxed text-[#E9E5DB]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Markdown renderer tuned to look like Claude's reply formatting. */
export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="prose-iris">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
          code({ className, children }) {
            const text = String(children ?? '');
            const isBlock = /language-[\w-]+/.test(className ?? '') || text.includes('\n');
            if (isBlock) {
              const lang = /language-([\w-]+)/.exec(className ?? '')?.[1] ?? '';
              return <CodeBlock lang={lang} code={text.replace(/\n$/, '')} />;
            }
            return (
              <code className="rounded bg-panel px-1.5 py-0.5 text-[0.86em] text-ink-soft">{children}</code>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
              >
                {children}
              </a>
            );
          },
          p({ children }) {
            return <p className="my-2.5 first:mt-0 last:mb-0">{children}</p>;
          },
          ul({ children }) {
            return <ul className="my-2.5 list-disc space-y-1 pl-5 marker:text-accent">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2.5 list-decimal space-y-1 pl-5 marker:text-accent marker:font-medium">{children}</ol>;
          },
          h1({ children }) {
            return <h3 className="mt-4 mb-2 font-serif text-lg first:mt-0">{children}</h3>;
          },
          h2({ children }) {
            return <h3 className="mt-4 mb-2 font-serif text-base first:mt-0">{children}</h3>;
          },
          h3({ children }) {
            return <h4 className="mt-3 mb-1.5 text-[15px] font-semibold first:mt-0">{children}</h4>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-2.5 border-l-2 border-accent/50 pl-3 text-ink-soft">{children}</blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="scroll-thin my-3 overflow-x-auto rounded-xl border border-line">
                <table className="w-full border-collapse text-[13.5px]">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th className="border-b border-line bg-panel px-3 py-2 text-left font-semibold">{children}</th>;
          },
          td({ children }) {
            return <td className="border-b border-line/60 px-3 py-2 last:border-b-0">{children}</td>;
          },
          hr() {
            return <hr className="my-4 border-line" />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
