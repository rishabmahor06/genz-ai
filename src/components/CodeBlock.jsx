"use client";
import { useMemo, useState } from "react";
import { Check, Copy, Play } from "lucide-react";
import { isRunnable } from "@/lib/runner";
import { highlightCode } from "@/lib/highlight";

export default function CodeBlock({ lang, code, onRun }) {
  const [copied, setCopied] = useState(false);
  const runnable = isRunnable(lang, code);
  const html = useMemo(() => highlightCode(code, lang), [code, lang]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-ink/10 bg-code text-left">
      <div className="flex items-center justify-between px-3 py-1.5 bg-ink/5 text-xs text-muted">
        <span className="uppercase tracking-wide">{lang || "code"}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-ink/10 cursor-pointer"
            aria-label="Copy code"
          >
            {copied ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          {runnable && (
            <button
              onClick={() => onRun(lang, code)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 cursor-pointer"
              aria-label="Run code"
              title="Run in preview"
            >
              <Play size={14} fill="currentColor" />
              <span>Run</span>
            </button>
          )}
        </div>
      </div>
      <pre className="p-3 text-xs sm:text-[13px] leading-relaxed overflow-x-auto">
        <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
