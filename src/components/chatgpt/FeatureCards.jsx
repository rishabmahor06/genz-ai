import React from "react";
import { Share2, Globe, ImageIcon, Code } from "lucide-react";

const items = [
  { title: "Task Automation", subtitle: "Automates tasks like scheduling and reminders.", icon: Share2 },
  { title: "Multi-language Support", subtitle: "Communicates fluently in various languages.", icon: Globe },
  { title: "Image Generation", subtitle: "Creates custom images based on user prompts.", icon: ImageIcon },
  { title: "Code snippets", subtitle: "Provides quick, functional code examples on demand.", icon: Code }
];

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it, idx) => {
        const Icon = it.icon;
        const gradients = [
          "from-[#0EA5B7] to-[#065F46]",
          "from-[#F97316] to-[#7C2D12]",
          "from-[#7C3AED] to-[#A78BFA]",
          "from-[#06B6D4] to-[#7DD3FC]"
        ];
        return (
          <div key={it.title} className="rounded-xl p-4 shadow-glass-sm bg-[rgba(255,255,255,0.03)]">
            <div className={`p-3 rounded-lg inline-block bg-gradient-to-br ${gradients[idx]} text-black`}>
              <Icon />
            </div>
            <h3 className="mt-3 font-semibold">{it.title}</h3>
            <p className="mt-1 text-sm text-[color:var(--muted)]">{it.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
