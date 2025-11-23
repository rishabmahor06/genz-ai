import React from "react";
import { Menu, Bell, Settings } from "lucide-react";

export default function Topbar({ onMenu = () => {} }) {
  return (
    <header className="flex items-center justify-between p-4 lg:px-6 lg:py-2 bg-transparent">
      <div className="flex items-center gap-3">
        <button className="lg:hidden p-2" onClick={onMenu}><Menu /></button>
        <button className="px-3 py-2 rounded-md bg-gradient-to-br from-purple-500 to-indigo-500 text-sm font-semibold">Upgrade</button>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-3 py-2 rounded-md bg-[rgba(255,255,255,0.06)] text-sm">Export Chat</button>
        
        <Bell className="text-[color:var(--muted)]" />
        <Settings className="text-[color:var(--muted)]" />
      </div>
    </header>
  );
}
