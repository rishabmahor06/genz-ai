import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

const ToggleTheme = () => {
  const [theme, setTheme] = useState("light");

  // Load stored theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  // Switch theme
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    localStorage.setItem("theme", newTheme);

    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative w-18 h-7 flex items-center bg-gray-300 dark:bg-gray-700 rounded-full p-1 transition-all"
    >
      {/* Switch circle */}
      <span
        className={`w-6 h-6 bg-white dark:bg-black rounded-full shadow transform transition-all ${
          theme === "light" ? "translate-x-0" : "translate-x-10"
        }`}
      ></span>

      {/* Sun icon */}
      <Sun
        className={`absolute left-2 w-4 h-4 text-yellow-500 transition-opacity ${
          theme === "light" ? "opacity-100" : "opacity-40"
        }`}
      />

      {/* Moon icon */}
      <Moon
        className={`absolute right-2 w-4 h-4 text-blue-300 transition-opacity ${
          theme === "dark" ? "opacity-100" : "opacity-40"
        }`}
      />
    </button>
  );
};

export default ToggleTheme;
