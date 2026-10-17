import { Sparkles } from "lucide-react";

// Assistant "working" state.
//  kind="text"  -> spinning orb + shimmering label + skeleton lines
//  kind="image" -> same header + a square skeleton card with a floating sparkle
export default function Loader({ kind = "text", label = "Thinking..." }) {
  return (
    <div className="w-full" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="orb shrink-0" aria-hidden />
        <span className="thinking-text text-sm font-medium">{label || "Thinking..."}</span>
      </div>

      {kind === "image" ? (
        <div className="skeleton mt-3 w-64 sm:w-80 aspect-square rounded-2xl border border-ink/10 flex items-center justify-center">
          <Sparkles className="float-y w-9 h-9 text-ink/50" />
        </div>
      ) : (
        <div className="mt-3 space-y-2.5 max-w-xl" aria-hidden>
          <div className="skeleton h-3 rounded-full w-[92%]" />
          <div className="skeleton h-3 rounded-full w-[78%]" />
          <div className="skeleton h-3 rounded-full w-[55%]" />
        </div>
      )}
    </div>
  );
}
