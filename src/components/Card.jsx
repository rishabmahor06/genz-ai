import { Code, ImageIcon, Lightbulb, Video } from "lucide-react";

const SUGGESTIONS = [
  { icon: Code, color: "text-sky-400", text: "Write a JavaScript function to reverse a string" },
  { icon: Lightbulb, color: "text-yellow-300", text: "Tell me a fun fact!" },
  { icon: ImageIcon, color: "text-emerald-400", text: "/image a neon city at night, cyberpunk style", command: true },
  { icon: Video, color: "text-purple-400", text: "/video a paper plane flying over mountains", command: true },
];

// Empty-state: heading, then the composer (children), then suggestion chips.
export default function Card({ onPrompt, onCommand, children }) {
  return (
    <div className="w-full max-w-3xl mx-auto text-center">
      <h1 className="text-2xl sm:text-3xl font-semibold text-fg mb-6 sm:mb-8">What can I help with?</h1>
      {children}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map(({ icon: Icon, color, text, command }) => (
          <button
            key={text}
            onClick={() => (command ? onCommand(text) : onPrompt(text))}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-ink/10 text-sm text-soft hover:bg-ink/5 cursor-pointer text-left"
          >
            <Icon size={16} className={`shrink-0 ${color}`} />
            <span>{text.replace(/^\/(image|video)\s/, "")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
