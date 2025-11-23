import React from "react";
import { ChevronDown, Search, Plus } from "lucide-react";

export default function Sidebar({
  open = false,
  onClose = () => {},
  historyMessages = [],
  expandedIndex,
  setExpandedIndex,
  limitWords,
  onHomeClick = () => {},
}) {
  return (
    <aside
      className={`w-72 max-h-screen hidden lg:flex flex-col bg-[color:var(--panel)] p-5 gap-4 shadow-glass-sm`}
      aria-hidden={!open}
    >
      {/* TOP BRAND AREA */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 flex items-center justify-center text-black font-bold">
          AI
        </div>
        <div>
          <div className="text-sm font-medium">Gen-Z</div>
          <div className="text-xs text-[color:var(--muted)]">
            Fast and reliable
          </div>
        </div>
        <div className="ml-auto">
          <ChevronDown size={18} className="text-[color:var(--muted)]" />
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <input
          className="w-full bg-[rgba(255,255,255,0.02)] rounded-md px-3 py-2 text-sm placeholder:text-[color:var(--muted)]"
          placeholder="Search"
        />
        <Search
          size={16}
          className="absolute right-3 top-2.5 text-[color:var(--muted)]"
        />
      </div>

      {/* NAVIGATION */}
      <nav className="flex flex-col gap-2 text-sm">
        <button
          className="text-left px-3 py-2 rounded-md bg-[rgba(255,255,255,0.02)] cursor-pointer"
          onClick={onHomeClick}
        >
          Home
        </button>
        <button className="text-left px-3 py-2 rounded-md bg-gradient-to-r from-[rgba(255,255,255,0.02)] to-[rgba(255,255,255,0.01)]">
          Chat
        </button>
        <button className="text-left px-3 py-2 rounded-md">
          Prompt Library
        </button>
        <button className="text-left px-3 py-2 rounded-md">Integrations</button>
      </nav>

      {/* PINNED / HISTORY LIST */}
      <div className="mt-2">
        <div className="text-xs text-[color:var(--muted)]">Pinned</div>

        <div
          className="flex flex-col gap-2 mt-2 overflow-y-auto scrollbar-hide"
          style={{ maxHeight: "160px" }}
        >
          {historyMessages.length === 0 && (
            <p className="text-xs text-[color:var(--muted)]">
              No history found.
            </p>
          )}

          {historyMessages.map((t, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <div
                key={i}
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                className="bg-[rgba(255,255,255,0.03)] p-3 rounded-lg cursor-pointer transition-all duration-200"
              >
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">
                    {isExpanded ? t : limitWords(t, 5)}
                  </p>

                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {isExpanded && (
                  <p className="text-xs mt-2 border-t border-white/10 pt-2 text-[color:var(--muted)]">
                    {t}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER RECENTS */}
      <div className="mt-auto text-sm text-[color:var(--muted)]">
        <div className="mb-2">Today</div>
        <div className="flex flex-col gap-2">
          <div className="px-3 py-2 rounded-md bg-[rgba(255,255,255,0.01)]">
            Your Custom Poem
          </div>
          <div className="px-3 py-2 rounded-md bg-[rgba(255,255,255,0.01)]">
            Investment Tips
          </div>
        </div>
      </div>
    </aside>
  );
}
