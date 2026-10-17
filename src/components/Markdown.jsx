"use client";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";

// ChatGPT-style rendering of assistant replies: headings, bold, lists, tables, inline code,
// colourful code cards (copy + run) and links that open in the side browser.
export default function Markdown({ text, onRun, onOpenLink }) {
  const components = useMemo(
    () => ({
      // fenced code -> CodeBlock card
      pre({ children }) {
        const child = Array.isArray(children) ? children[0] : children;
        const props = child?.props || {};
        const lang = /language-([\w+#-]+)/.exec(props.className || "")?.[1] || "";
        const code = String(props.children ?? "").replace(/\n$/, "");
        return <CodeBlock lang={lang} code={code} onRun={onRun} />;
      },
      // inline `code`
      code({ className, children }) {
        return (
          <code className={`px-1.5 py-0.5 rounded-md bg-ink/10 text-[0.9em] text-amber-700 dark:text-amber-200 font-mono ${className || ""}`}>
            {children}
          </code>
        );
      },
      a({ href, children }) {
        return (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault();
              onOpenLink(href);
            }}
            className="text-sky-600 dark:text-sky-400 underline underline-offset-2 hover:text-sky-500 dark:hover:text-sky-300 cursor-pointer break-words"
          >
            {children}
          </a>
        );
      },
      h1: ({ children }) => <h1 className="text-xl font-bold mt-5 mb-2">{children}</h1>,
      h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2">{children}</h2>,
      h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-1.5">{children}</h3>,
      p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
      ul: ({ children }) => <ul className="list-disc pl-6 my-2 space-y-1 marker:text-ink/50">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal pl-6 my-2 space-y-1 marker:text-ink/50">{children}</ol>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-ink/20 pl-4 my-2 text-ink/70 italic">{children}</blockquote>
      ),
      hr: () => <hr className="my-4 border-ink/10" />,
      table: ({ children }) => (
        <div className="my-3 overflow-x-auto rounded-lg border border-ink/10">
          <table className="w-full text-sm">{children}</table>
        </div>
      ),
      th: ({ children }) => <th className="px-3 py-2 text-left font-semibold bg-ink/5 border-b border-ink/10">{children}</th>,
      td: ({ children }) => <td className="px-3 py-2 border-b border-ink/5">{children}</td>,
    }),
    [onRun, onOpenLink]
  );

  return (
    <div className="text-[15px] break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text || ""}
      </ReactMarkdown>
    </div>
  );
}
