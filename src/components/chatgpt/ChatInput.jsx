import React from "react";
import { Paperclip } from "lucide-react";




export default function ChatInput() {
  return (
    <div className="bg-[rgba(255,255,255,0.02)] rounded-2xl p-4">
      <div className="flex gap-3 items-center">
        <div className="flex-1">
          <input
            placeholder="Ask me anything..."
            className="w-full bg-transparent outline-none placeholder:text-[color:var(--muted)]"
          />
        </div>
        <button className="px-4 py-2 rounded-full bg-[rgba(255,255,255,0.03)]">↑</button>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-[color:var(--muted)]">
        <div className="flex items-center gap-2">
          <Paperclip size={16} />
          <span>Attach content</span>
        </div>
        <div>Saved prompts</div>
      </div>
    </div>
  );
}
