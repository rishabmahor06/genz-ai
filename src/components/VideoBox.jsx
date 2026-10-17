import { Clapperboard, Download } from "lucide-react";

const sizeFor = (ratio) => (ratio === "9:16" ? "w-44 sm:w-52" : "w-full max-w-md");
const aspectFor = (ratio) => (ratio === "9:16" ? "9 / 16" : "16 / 9");

// Animated placeholder while the video renders, the finished player afterwards.
export default function VideoBox({ video }) {
  const { status, ratio = "16:9", progress = 0, url, error } = video;

  if (status === "error") {
    return <p className="text-red-400 text-sm mt-1">Video failed: {error || "unknown error"}</p>;
  }

  if (status === "done") {
    return (
      <div className={`${sizeFor(ratio)} mt-2`}>
        <video src={url} controls playsInline className="w-full rounded-xl bg-black" style={{ aspectRatio: aspectFor(ratio) }} />
        <a href={url} download="genz-video.mp4" className="inline-flex items-center gap-1 mt-2 text-xs text-muted hover:text-fg">
          <Download size={14} /> Download
        </a>
      </div>
    );
  }

  return (
    <div className={`${sizeFor(ratio)} mt-2`}>
      <div
        className="video-shimmer relative rounded-xl overflow-hidden border border-ink/10 flex flex-col items-center justify-center gap-3"
        style={{ aspectRatio: aspectFor(ratio) }}
      >
        <Clapperboard className="w-9 h-9 text-ink/80 animate-pulse" />
        <div className="text-xs text-ink/70">
          {status === "queued" ? "Waiting in queue..." : "Generating video..."} {progress > 0 ? `${Math.round(progress)}%` : ""}
        </div>
        <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-600 transition-all duration-700 ${progress > 0 ? "" : "animate-pulse"}`} style={{ width: progress > 0 ? `${progress}%` : "100%" }} />
      </div>
      <p className="text-[11px] text-muted mt-1">{ratio} · this can take a few minutes</p>
    </div>
  );
}
