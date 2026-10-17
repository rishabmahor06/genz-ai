"use client";
import { ExternalLink, RotateCw, X } from "lucide-react";

// Slide-in "browser" on the right side. `run` stays set while closing so the content doesn't vanish mid-animation.
// run = { id, lang, srcDoc }  -> sandboxed code output
// run = { id, url }           -> a web page opened from a link in the chat
export default function RunPanel({ open, run, onClose, onReload }) {
  const address = run?.url || `genz-preview://${run?.lang ? run.lang.toLowerCase() : "preview"}`;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-[55] w-full md:static md:z-auto md:shrink-0 overflow-hidden
        transition-all duration-500 ease-in-out
        ${open ? "translate-x-0 opacity-100 md:w-[45vw]" : "translate-x-full opacity-0 md:translate-x-0 md:w-0 pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div className="h-full w-screen md:w-[45vw] flex flex-col bg-panel border-l border-ink/10">
        {/* browser chrome */}
        <div className="flex items-center gap-2 px-3 py-2 bg-surface border-b border-ink/10">
          <div className="hidden sm:flex gap-1.5 mr-1">
            <span className="w-3 h-3 rounded-full bg-red-400/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <span className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <button onClick={onReload} className="p-1.5 rounded-md hover:bg-ink/10 cursor-pointer" aria-label="Reload" title="Reload">
            <RotateCw size={16} />
          </button>
          <div className="flex-1 min-w-0 truncate px-3 py-1 rounded-full bg-ink/10 text-xs text-muted">{address}</div>
          {run?.url && (
            <a
              href={run.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-ink/10"
              aria-label="Open in new tab"
              title="Open in new tab"
            >
              <ExternalLink size={16} />
            </a>
          )}
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-ink/10 cursor-pointer" aria-label="Close preview">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-white relative">
          {run?.url ? (
            <>
              <iframe
                key={run.id}
                title="Web page"
                src={run.url}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                referrerPolicy="no-referrer"
                className="w-full h-full border-0"
              />
              {/* Many sites refuse to be embedded; keep an escape hatch visible. */}
              <a
                href={run.url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/80 text-white text-xs shadow-lg"
              >
                Page blank? Open in new tab ↗
              </a>
            </>
          ) : run?.srcDoc ? (
            // scripts allowed, but no access to this site's origin
            <iframe
              key={run.id}
              title="Code preview"
              sandbox="allow-scripts allow-modals allow-forms allow-popups"
              srcDoc={run.srcDoc}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-app text-sm text-muted p-6 text-center">
              {run?.unsupported || "Press Run on a code block to see the result here."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
