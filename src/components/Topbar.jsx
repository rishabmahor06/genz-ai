import { Menu, SquarePen } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Topbar({ onMenu, onNewChat }) {
  return (
    <header className="flex items-center justify-between px-3 py-2 sm:px-4">
      <div className="flex items-center gap-2">
        <button className="lg:hidden p-2 rounded-lg hover:bg-ink/10 cursor-pointer" onClick={onMenu} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <span className="px-2 py-1.5 text-lg font-semibold text-fg">Gen-Z AI</span>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button onClick={onNewChat} className="p-2 rounded-lg hover:bg-ink/10 cursor-pointer" aria-label="New chat" title="New chat">
          <SquarePen size={20} />
        </button>
      </div>
    </header>
  );
}
