"use client";
import { LogIn, LogOut, MessageSquare, Search, SquarePen, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

export default function Sidebar({ open, collapsed, onClose, chats, activeId, onSelect, onDelete, onNewChat, user, onLogin, onLogout }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => chats.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase())),
    [chats, query]
  );

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />}
      <aside
        className={`w-72 max-w-[85vw] h-screen flex flex-col bg-panel p-3 gap-1 fixed top-0 left-0 z-50 transform transition-transform duration-300 lg:static lg:translate-x-0 lg:shrink-0 lg:transition-all lg:duration-500 ${
          collapsed ? "lg:w-0 lg:p-0 lg:opacity-0 lg:overflow-hidden lg:pointer-events-none" : ""
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* brand */}
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-ink text-app flex items-center justify-center text-sm font-bold">G</div>
          <span className="font-semibold">Gen-Z AI</span>
          <button className="ml-auto lg:hidden p-1 cursor-pointer" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <button
          onClick={() => {
            onNewChat();
            onClose();
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-ink/10 cursor-pointer"
        >
          <SquarePen size={18} /> New chat
        </button>

        <div className="relative mt-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent rounded-lg pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted focus:bg-ink/5"
          />
        </div>

        <div className="px-3 pt-4 pb-1 text-xs font-medium text-muted">Chats</div>
        <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col gap-0.5">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted">{chats.length ? "No matching chats." : "Your chats will show up here."}</p>
          )}
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                onSelect(c.id);
                onClose();
              }}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer ${
                c.id === activeId ? "bg-ink/10" : "hover:bg-ink/5"
              }`}
            >
              <MessageSquare size={15} className="shrink-0 text-muted" />
              <span className="flex-1 truncate">{c.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                className="shrink-0 p-1 rounded-md text-muted hover:text-red-400 hover:bg-ink/10 md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
                aria-label="Delete chat"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 px-3 py-3 border-t border-ink/10">
          {user ? (
            <>
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-black">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="leading-tight min-w-0 flex-1">
                <div className="text-sm truncate">{user.name}</div>
                <div className="text-xs text-muted truncate">{user.email}</div>
              </div>
              <button onClick={onLogout} className="p-2 rounded-lg text-muted hover:text-fg hover:bg-ink/10 cursor-pointer" aria-label="Log out" title="Log out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onLogin();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-ink text-app text-sm font-medium cursor-pointer"
            >
              <LogIn size={16} /> Log in / Sign up
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
