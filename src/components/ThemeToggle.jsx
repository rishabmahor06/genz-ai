"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "genz-theme";

// Light/dark switch. The initial theme is applied before first paint by the inline script in layout.js.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);

  useEffect(() => setTheme(document.documentElement.dataset.theme || "dark"), []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    const root = document.documentElement;
    root.classList.add("theme-fade");
    root.dataset.theme = next;
    setTimeout(() => root.classList.remove("theme-fade"), 300);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setTheme(next);
  };

  const isLight = theme === "light";
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-ink/10 cursor-pointer"
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
    >
      {theme === null ? <span className="block w-5 h-5" /> : isLight ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
