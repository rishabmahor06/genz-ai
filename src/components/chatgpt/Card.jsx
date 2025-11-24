import React from "react";
import FeatureCards from "./FeatureCards";

const Card = () => {
  return (
    <div className="w-full">
      <h1 className="text-2xl md:text-3xl font-semibold hidden sm:block ">
        Welcome to GenZ AI.
      </h1>
      <p className="text-sm text-[color:var(--muted)] max-w-2xl hidden sm:block">
        Uses multiple sources and tools to answer questions with situations
      </p>

      {/* feature cards */}
      <div className="w-full mt-6">
        <FeatureCards />
      </div>

      {/* quick prompts */}
      <div className="w-full mt-4   grid grid-cols-2 sm:grid-cols-4 gap-2 justify-center">
        {[
          "Tell me a fun fact!",
          "Recommend a movie to watch.",
          "How do I make pancakes?",
          "What's the latest news?",
        ].map((t) => (
          <button
            key={t}
            className="px-4 py-2 rounded-full bg-[rgba(255,255,255,0.03)] sm:border-none border text-sm text-[color:var(--muted)] hover:bg-[rgba(255,255,255,0.05)]"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Card;
