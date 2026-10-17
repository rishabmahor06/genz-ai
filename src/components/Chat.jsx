"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { FaPlay, FaPause } from "react-icons/fa";
import { ArrowDownToLine, ArrowUp, AudioLines, Check, CircleX, Copy, Globe, ImageIcon, Lock, Plus, Reply, TrainFront, Video, X } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Card from "./Card";
import Markdown from "./Markdown";
import RunPanel from "./RunPanel";
import VideoBox from "./VideoBox";
import Loader from "./Loader";
import AuthModal from "./AuthModal";
import TrainAssistant from "./TrainAssistant";
import { buildSrcDoc } from "@/lib/runner";

const STORAGE_KEY = "genz-chats-v3";

const COMMANDS = [
  { cmd: "/image", mode: "image", icon: ImageIcon, desc: "Generate an image from a prompt" },
  { cmd: "/video", mode: "video", icon: Video, desc: "Generate a video (choose aspect ratio)" },
  { cmd: "/train", mode: "train", icon: TrainFront, desc: "Tatkal ticket assistant (plan your booking)" },
];
const RATIOS = [
  { value: "16:9", label: "16:9", hint: "Landscape", box: "w-6 h-3.5" },
  { value: "9:16", label: "9:16", hint: "Portrait", box: "w-3.5 h-6" },
];
const DURATIONS = ["4", "6", "8"];

let idCounter = 0;
const newId = () => `${Date.now().toString(36)}-${idCounter++}`;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

async function api(url, body) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Request failed (${res.status})`);
    err.auth = res.status === 401;
    throw err;
  }
  return data;
}

// base64 media is too big for localStorage, so it is only kept in memory
const slimMessages = (messages) =>
  messages.map((m) => ({
    ...m,
    image: m.image?.startsWith("data:") ? undefined : m.image,
    audio: m.audio?.startsWith("data:") ? undefined : m.audio,
    streaming: undefined,
  }));

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-ink/10 cursor-pointer"
      aria-label="Copy message"
      title="Copy"
    >
      {done ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
    </button>
  );
}

export default function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState([]); // [{ id, title, ts, messages }]
  const [activeId, setActiveId] = useState(() => newId());
  const [messages, setMessages] = useState([]);
  const [item, setItem] = useState("");
  const [mode, setMode] = useState("chat"); // chat | image | video
  const [ratio, setRatio] = useState("16:9");
  const [seconds, setSeconds] = useState("4");
  const [attached, setAttached] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { from, text } quoted in the composer
  const [loadingLabel, setLoadingLabel] = useState("");
  const [loadingKind, setLoadingKind] = useState("text"); // text | image
  const [playingIndex, setPlayingIndex] = useState(null);
  const [modalImage, setModalImage] = useState("");
  const [micSupported, setMicSupported] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState("");
  const [trainOpen, setTrainOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const pendingRef = useRef(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [run, setRun] = useState(null); // { id, lang, code, srcDoc, unsupported } | { id, url }

  const audioRef = useRef(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  // ---- message helpers ----
  const push = (msg) => {
    const full = { id: newId(), ...msg };
    setMessages((prev) => [...prev, full]);
    return full.id;
  };
  const patch = useCallback(
    (id, fn) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...fn(m) } : m))),
    []
  );

  // ---- video polling (also resumes after a refresh / chat switch) ----
  const trackVideo = useCallback(
    async (msgId, videoId) => {
      const setVideo = (v) => patch(msgId, (m) => ({ video: { ...m.video, ...v } }));
      try {
        for (;;) {
          await new Promise((r) => setTimeout(r, 4000));
          const s = await api(`/api/video/${videoId}`);
          if (s.status === "completed") {
            return setVideo({ status: "done", progress: 100, url: `/api/video/${videoId}/content` });
          }
          if (s.status === "failed") return setVideo({ status: "error", error: s.error || "generation failed" });
          setVideo({ status: s.status === "queued" ? "queued" : "generating", progress: s.progress });
        }
      } catch (err) {
        setVideo({ status: "error", error: err.message });
      }
    },
    [patch]
  );
  const resumeVideos = useCallback(
    (list) =>
      list
        .filter((m) => m.video?.id && ["generating", "queued"].includes(m.video.status))
        .forEach((m) => trackVideo(m.id, m.video.id)),
    [trackVideo]
  );

  // ---- load / persist ----
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.chats) {
        setChats(saved.chats);
        const last = saved.chats.find((c) => c.id === saved.activeId);
        if (last) {
          setActiveId(last.id);
          setMessages(last.messages);
          resumeVideos(last.messages);
        }
      }
    } catch {}
    audioRef.current = new Audio();
    audioRef.current.onended = () => setPlayingIndex(null);
    setHydrated(true);
    return () => audioRef.current?.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the active conversation in the chats list (title = first user message)
  useEffect(() => {
    if (!hydrated || messages.length === 0) return;
    const title = (messages.find((m) => m.from === "user" && m.text)?.text || "New chat").slice(0, 60);
    setChats((prev) =>
      prev.some((c) => c.id === activeId)
        ? prev.map((c) => (c.id === activeId ? { ...c, title, messages } : c))
        : [{ id: activeId, title, ts: Date.now(), messages }, ...prev]
    );
  }, [messages, activeId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const slim = chats.map((c) => ({ ...c, messages: slimMessages(c.messages) }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats: slim, activeId }));
    } catch {}
  }, [chats, activeId, hydrated]);

  useEffect(() => setMicSupported(browserSupportsSpeechRecognition), [browserSupportsSpeechRecognition]);

  // ---- account ----
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user || null);
        setAuthRequired(!!d.authRequired);
      })
      .catch(() => {});
  }, []);

  // Opens the login dialog unless signed in. `action` runs after a successful login.
  const requireLogin = (reason, action) => {
    if (user || !authRequired) return true;
    pendingRef.current = action || null;
    setAuthReason(reason);
    setAuthOpen(true);
    return false;
  };
  const onAuthSuccess = (u) => {
    setUser(u);
    setAuthOpen(false);
    const action = pendingRef.current;
    pendingRef.current = null;
    action?.();
  };
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setMode("chat");
    setAttached(null);
  };
  const onSessionExpired = () => {
    setUser(null);
    setMode("chat");
    requireLogin("Please log in to continue.");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: streaming ? "auto" : "smooth", block: "end" });
  }, [messages, loading, streaming]);

  // composer grows with its content (up to ~8 lines)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [item, messages.length === 0]);

  // ---- audio playback ----
  const playAudio = useCallback(async (url, idx) => {
    const a = audioRef.current;
    if (!a || !url) return;
    try {
      if (a.src === url && !a.paused) {
        a.pause();
        setPlayingIndex(null);
        return;
      }
      if (a.src !== url) a.src = url;
      await a.play();
      setPlayingIndex(idx);
    } catch (err) {
      console.warn("Audio play blocked:", err);
    }
  }, []);

  // ---- side browser: run code / open links ----
  const runCode = (lang, code) => {
    const srcDoc = buildSrcDoc(lang, code);
    setRun({
      id: newId(),
      lang,
      code,
      srcDoc,
      unsupported: srcDoc ? null : `Running "${lang || "this"}" code isn't supported here. Supported: HTML, JavaScript, Python.`,
    });
    setPanelOpen(true);
  };
  const openUrl = (url) => {
    setRun({ id: newId(), lang: "web", url });
    setPanelOpen(true);
  };
  const reloadRun = () => {
    if (!run) return;
    if (run.url) openUrl(run.url);
    else runCode(run.lang, run.code);
  };

  // ---- slash commands ----
  const showMenu = item.startsWith("/") && !item.includes(" ") && mode === "chat";
  const matches = COMMANDS.filter((c) => c.cmd.startsWith(item.toLowerCase()));

  const LOCKED = {
    image: "Log in to generate images.",
    video: "Log in to generate videos.",
    train: "Log in to use the train ticket assistant.",
  };
  const applyMode = (next) => {
    setItem("");
    if (next === "train") return setTrainOpen(true);
    setMode(next);
    inputRef.current?.focus();
  };
  // image / video / train need an account
  const chooseMode = (next) => {
    setPlusOpen(false);
    if (next !== "chat" && !requireLogin(LOCKED[next], () => applyMode(next))) return;
    applyMode(next);
  };
  const pickPhoto = () => {
    setPlusOpen(false);
    if (!requireLogin("Log in to attach photos.")) return;
    fileRef.current?.click();
  };

  const onInputChange = (value) => {
    // "/video a cat on the moon" typed in one go -> switch mode and keep the prompt
    const m = value.match(/^\/(image|video)\s([\s\S]*)$/i);
    if (m && mode === "chat") {
      const next = m[1].toLowerCase();
      const go = () => {
        setMode(next);
        setItem(m[2]);
      };
      if (!requireLogin(LOCKED[next], go)) return setItem(value);
      go();
    } else {
      setItem(value);
    }
  };

  const resetMode = () => {
    setMode("chat");
    setAttached(null);
  };

  const startReply = (m) => {
    setReplyTo({ from: m.from, text: m.text.length > 300 ? m.text.slice(0, 300) + "…" : m.text });
    inputRef.current?.focus();
  };

  // ---- streamed chat reply: text is revealed as it is generated, at a steady typing pace ----
  const streamChat = async (text, context) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: text, history: context }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err = new Error(data.error || data.message || `Request failed (${res.status})`);
      err.auth = res.status === 401;
      throw err;
    }

    let target = ""; // everything received so far
    let shown = 0; // how much of it is on screen
    let msgId = null;
    let done = false;
    let sources = null;
    let failure = null;
    let finishTyping;
    const typed = new Promise((r) => (finishTyping = r));

    // reveal faster when we are far behind, never slower than 2 chars per frame
    const tick = () => {
      if (shown < target.length) {
        shown = Math.min(target.length, shown + Math.max(2, Math.ceil((target.length - shown) / 15)));
        const visible = target.slice(0, shown);
        if (msgId === null) {
          msgId = push({ from: "assistant", text: visible, streaming: true });
          setLoading(false); // first words are here: swap the loader for the live text
        } else {
          patch(msgId, () => ({ text: visible }));
        }
      }
      if (done && shown >= target.length) return finishTyping();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    try {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done: finished } = await reader.read();
        if (finished) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.text) target += ev.text;
          if (ev.sources) sources = ev.sources;
          if (ev.error) failure = ev.error;
        }
      }
    } catch (err) {
      failure = err.message;
    }
    done = true;
    await typed;

    if (msgId === null) {
      push({ from: "assistant", text: failure ? `Error: ${failure}` : "I couldn't generate a reply. Please try again.", error: true });
      return;
    }
    patch(msgId, (m) => ({
      streaming: false,
      sources: sources || undefined,
      text: failure ? `${m.text}\n\n_Error: ${failure}_` : m.text,
    }));
  };

  // ---- send ----
  const send = async (textOverride) => {
    const text = (typeof textOverride === "string" ? textOverride : item).trim();
    if (loading || streaming || showMenu) return;
    const image = attached;
    const quote = replyTo;
    if ((mode !== "chat" || image) && !requireLogin("Please log in to continue.")) return;

    if (mode === "video") {
      if (!text) return;
      push({ from: "user", text, tag: "/video" });
      setItem("");
      const msgId = push({ from: "assistant", video: { ratio, seconds, status: "queued", progress: 0 } });
      try {
        const job = await api("/api/video", { prompt: text, ratio, seconds });
        patch(msgId, (m) => ({ video: { ...m.video, id: job.id, status: "generating" } }));
        trackVideo(msgId, job.id);
      } catch (err) {
        patch(msgId, (m) => ({ video: { ...m.video, status: "error", error: err.message } }));
        if (err.auth) onSessionExpired();
      }
      return;
    }

    if (!text && !image) return;
    push({ from: "user", text, image, replyTo: quote || undefined, tag: mode === "image" ? "/image" : undefined });
    setReplyTo(null);
    setItem("");
    setAttached(null);
    setLoading(true);

    try {
      if (mode === "image" || image) {
        setLoadingKind(image && mode !== "image" ? "text" : "image");
        setLoadingLabel(image && mode !== "image" ? "Looking at your image..." : "Generating image...");
        const data = await api("/api/image", { item: text, fileImage: image, mode });
        push({ from: "assistant", text: data.message, image: data.image });
      } else {
        setLoadingKind("text");
        setLoadingLabel("Thinking...");
        const context = messages.filter((m) => m.text && !m.error && !m.tag).map(({ from, text }) => ({ from, text }));
        setStreaming(true);
        const apiText = quote
          ? `[Replying to ${quote.from === "user" ? "my" : "your"} earlier message: "${quote.text}"]\n\n${text}`
          : text;
        await streamChat(apiText, context);
      }
    } catch (err) {
      push({ from: "assistant", text: `Error: ${err.message}`, error: true });
      if (err.auth) onSessionExpired();
    } finally {
      setLoading(false);
      setStreaming(false);
      if (mode === "image") setMode("chat");
    }
  };

  // ---- voice ----
  useEffect(() => {
    if (listening || !transcript.trim()) return;
    const spoken = transcript.trim();
    resetTranscript();

    (async () => {
      push({ from: "user", text: spoken });
      setLoading(true);
      setLoadingKind("text");
      setLoadingLabel("Processing voice...");
      try {
        const data = await api("/api/audio", { audioText: spoken });
        const idx = messages.length + 1;
        push({ from: "assistant", text: data.message, audio: data.audio });
        if (data.audio) playAudio(data.audio, idx);
      } catch (err) {
        push({ from: "assistant", text: `Error: ${err.message}`, error: true });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  const toggleMic = () =>
    listening ? SpeechRecognition.stopListening() : SpeechRecognition.startListening({ continuous: false, language: "en-IN" });

  const onPickFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return alert("Please pick an image under 8 MB.");
    setAttached(await fileToDataUrl(f));
  };

  // ---- chats ----
  const resetComposer = () => {
    setReplyTo(null);
    setItem("");
    setMode("chat");
    setAttached(null);
    setPanelOpen(false);
    audioRef.current?.pause();
    setPlayingIndex(null);
  };
  const newChat = () => {
    resetComposer();
    if (messages.length === 0) return;
    setActiveId(newId());
    setMessages([]);
  };
  const selectChat = (id) => {
    const chat = chats.find((c) => c.id === id);
    if (!chat || id === activeId) return;
    resetComposer();
    setActiveId(id);
    setMessages(chat.messages);
    resumeVideos(chat.messages);
  };
  const deleteChat = (id) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {
      resetComposer();
      setActiveId(newId());
      setMessages([]);
    }
  };

  const download = (url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `genz-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const placeholder = listening
    ? "Listening..."
    : mode === "video"
    ? "Describe the video you want..."
    : mode === "image"
    ? "Describe the image you want..."
    : "Message Gen-Z AI  (type / for image or video)";

  const canSend = mode === "video" ? !!item.trim() : !!item.trim() || !!attached;

  // ---- composer (shown centered on the empty screen, at the bottom once chatting) ----
  const composer = (
    <div className="relative w-full max-w-3xl mx-auto text-left">
      {showMenu && matches.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-popup border border-ink/10 rounded-2xl overflow-hidden shadow-xl z-10">
          {matches.map((c) => (
            <button
              key={c.cmd}
              onClick={() => chooseMode(c.mode)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-ink/5 cursor-pointer"
            >
              <c.icon size={18} />
              <span className="font-medium">{c.cmd}</span>
              <span className="text-xs text-muted">{c.desc}</span>
            </button>
          ))}
        </div>
      )}

      <div className="bg-surface rounded-3xl px-4 pt-3 pb-2.5 shadow-lg border border-ink/5">
        {mode !== "chat" && (
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <span className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs bg-sky-500/20 text-sky-700 dark:text-sky-300">
              {mode === "video" ? <Video size={14} /> : <ImageIcon size={14} />}/{mode}
              <button onClick={resetMode} className="p-0.5 rounded-full hover:bg-ink/20 cursor-pointer" aria-label="Exit mode">
                <X size={12} />
              </button>
            </span>
            {mode === "video" && (
              <>
                {RATIOS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRatio(r.value)}
                    title={r.hint}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border cursor-pointer ${
                      ratio === r.value ? "border-sky-400 bg-sky-400/10 text-sky-700 dark:text-sky-200" : "border-ink/10 text-soft"
                    }`}
                  >
                    <span className={`${r.box} border border-current rounded-[3px]`} />
                    {r.label}
                  </button>
                ))}
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSeconds(d)}
                    className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer ${
                      seconds === d ? "border-sky-400 bg-sky-400/10 text-sky-700 dark:text-sky-200" : "border-ink/10 text-soft"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {replyTo && (
          <div className="flex items-start gap-2 mb-2 pl-3 pr-1 py-1.5 rounded-xl bg-ink/5 border-l-2 border-sky-500 text-sm">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                Replying to {replyTo.from === "user" ? "yourself" : "Gen-Z AI"}
              </div>
              <div className="line-clamp-2 text-soft break-words">{replyTo.text}</div>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 rounded-md hover:bg-ink/10 cursor-pointer" aria-label="Cancel reply">
              <X size={14} />
            </button>
          </div>
        )}
        {attached && (
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/30 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attached} alt="preview" className="object-cover w-full h-full" />
            <button
              onClick={() => setAttached(null)}
              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 cursor-pointer"
              aria-label="Remove image"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <textarea
          ref={inputRef}
          rows={1}
          value={item}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (showMenu && matches.length > 0) return chooseMode(matches[0].mode);
              send();
            }
            if (e.key === "Backspace" && !item && mode !== "chat") resetMode();
            if (e.key === "Escape") setReplyTo(null);
          }}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent outline-none py-1 text-[15px] placeholder:text-muted max-h-[200px]"
        />

        <div className="flex items-center justify-between mt-1">
          <div className="relative flex items-center gap-1.5">
            <button
              onClick={() => setPlusOpen((o) => !o)}
              className={`p-2 rounded-full hover:bg-ink/10 cursor-pointer transition-transform ${plusOpen ? "rotate-45 bg-ink/10" : ""}`}
              title="Add"
              aria-label="Open features menu"
              aria-expanded={plusOpen}
            >
              <Plus size={20} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />

            {plusOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setPlusOpen(false)} />
                <div className="absolute bottom-full left-0 mb-2 z-30 w-72 max-w-[85vw] p-1.5 rounded-2xl bg-popup border border-ink/10 shadow-2xl">
                  {[
                    { icon: ImageIcon, color: "text-sky-500", title: "Add photo", desc: "Ask about or edit a picture", run: pickPhoto },
                    { icon: ImageIcon, color: "text-emerald-500", title: "Create image", desc: "/image  generate from a prompt", run: () => chooseMode("image") },
                    { icon: Video, color: "text-purple-500", title: "Create video", desc: "/video  pick ratio and length", run: () => chooseMode("video") },
                    { icon: TrainFront, color: "text-orange-500", title: "Train ticket assistant", desc: "/train  plan your Tatkal booking", run: () => chooseMode("train") },
                  ].map((f) => (
                    <button
                      key={f.title}
                      onClick={f.run}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-ink/5 cursor-pointer"
                    >
                      <f.icon size={20} className={f.color} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium">{f.title}</span>
                        <span className="block text-xs text-muted truncate">{f.desc}</span>
                      </span>
                      {!user && authRequired && <Lock size={14} className="shrink-0 text-muted" />}
                    </button>
                  ))}
                  {!user && authRequired && (
                    <button
                      onClick={() => {
                        setPlusOpen(false);
                        requireLogin("Log in to unlock all features.");
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-center bg-ink text-app font-medium cursor-pointer"
                    >
                      Log in to unlock
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {micSupported && (
              <button
                onClick={toggleMic}
                className={`p-2 rounded-full cursor-pointer ${listening ? "bg-red-500 text-white animate-pulse" : "hover:bg-ink/10"}`}
                aria-label="Voice input"
                title="Voice"
              >
                <AudioLines size={20} />
              </button>
            )}
            <button
              onClick={() => send()}
              disabled={loading || streaming || !canSend}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-ink text-app disabled:bg-ink/15 disabled:text-muted cursor-pointer disabled:cursor-not-allowed"
              title="Send"
              aria-label="Send"
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const empty = messages.length === 0;

  return (
    <div className="flex h-screen bg-app text-fg overflow-hidden">
      <Sidebar
        user={user}
        onLogin={() => requireLogin("Log in to unlock image, video and the train assistant.")}
        onLogout={logout}
        collapsed={panelOpen}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chats}
        activeId={activeId}
        onSelect={selectChat}
        onDelete={deleteChat}
        onNewChat={newChat}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenu={() => setSidebarOpen(true)} onNewChat={newChat} />

        <main className="flex-1 min-h-0 flex flex-col">
          {empty ? (
            <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 pb-16">
              <Card onPrompt={send} onCommand={onInputChange}>
                {composer}
              </Card>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-3 sm:px-4">
                <section className="max-w-3xl mx-auto py-4 space-y-5">
                  {messages.map((m, i) => (
                    <div key={m.id || i} className={`group flex flex-col ${m.from === "user" ? "items-end" : "items-start"}`}>
                      <div
                        className={
                          m.from === "user"
                            ? "w-fit max-w-[92%] sm:max-w-[80%] px-4 py-2.5 rounded-3xl bg-bubble text-bubble-fg whitespace-pre-wrap break-words"
                            : `w-full break-words ${m.error ? "text-red-400" : ""}`
                        }
                      >
                        {m.replyTo && (
                          <div className="mb-2 pl-3 border-l-2 border-ink/40 text-xs opacity-80">
                            <div className="font-medium">{m.replyTo.from === "user" ? "You" : "Gen-Z AI"}</div>
                            <div className="line-clamp-2 break-words">{m.replyTo.text}</div>
                          </div>
                        )}
                        {m.tag && (
                          <span className="inline-block mb-1 mr-2 px-2 py-0.5 rounded-full text-[11px] bg-ink/10 text-soft">
                            {m.tag}
                          </span>
                        )}
                        {m.text &&
                          (m.from === "user" ? (
                            <span>{m.text}</span>
                          ) : (
                            <Markdown text={m.text} onRun={runCode} onOpenLink={openUrl} />
                          ))}
                        {m.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.image}
                            alt="chat"
                            className="max-w-full w-64 sm:w-80 rounded-2xl mt-2 cursor-pointer"
                            onClick={() => setModalImage(m.image)}
                          />
                        )}
                        {m.video && <VideoBox video={m.video} />}
                        {m.audio && (
                          <button
                            className="mt-2 px-3 py-2 rounded-full bg-ink text-app cursor-pointer"
                            onClick={() => playAudio(m.audio, i)}
                            aria-label="Play audio"
                          >
                            {playingIndex === i ? <FaPause /> : <FaPlay />}
                          </button>
                        )}
                        {m.sources?.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                              <Globe size={13} /> Sources
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {m.sources.map((s, k) => (
                                <a
                                  key={k}
                                  href={s.url}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openUrl(s.url);
                                  }}
                                  className="max-w-[14rem] truncate px-3 py-1 rounded-full border border-ink/10 text-xs text-soft hover:bg-ink/5"
                                  title={s.title}
                                >
                                  {s.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {m.streaming && <span className="stream-caret" aria-hidden />}
                      </div>
                      {m.text && !m.error && !m.streaming && (
                        <div className="mt-1 flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <CopyButton text={m.text} />
                          <button
                            onClick={() => startReply(m)}
                            className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-ink/10 cursor-pointer"
                            aria-label="Reply to this message"
                            title="Reply"
                          >
                            <Reply size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && <Loader kind={loadingKind} label={loadingLabel} />}
                  <div ref={bottomRef} />
                </section>
              </div>

              <div className="px-3 sm:px-4 pb-2">
                {composer}
                <p className="text-center text-xs text-muted mt-2">Gen-Z AI can make mistakes. Check important info.</p>
              </div>
            </>
          )}
        </main>
      </div>

      <AuthModal
        open={authOpen}
        reason={authReason}
        onClose={() => {
          setAuthOpen(false);
          pendingRef.current = null;
        }}
        onSuccess={onAuthSuccess}
      />
      <TrainAssistant open={trainOpen} onClose={() => setTrainOpen(false)} onOpenLink={(u) => window.open(u, "_blank", "noopener,noreferrer")} />

      <RunPanel open={panelOpen} run={run} onClose={() => setPanelOpen(false)} onReload={reloadRun} />

      {modalImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setModalImage("")}>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={modalImage} alt="preview" className="w-full max-h-[85vh] object-contain rounded-md" />
            <div className="absolute top-3 right-3 flex gap-2">
              <button onClick={() => download(modalImage)} className="bg-black/70 px-3 py-2 rounded-md cursor-pointer" aria-label="Download">
                <ArrowDownToLine />
              </button>
              <button onClick={() => setModalImage("")} className="bg-red-500 px-3 py-2 rounded-md cursor-pointer" aria-label="Close">
                <CircleX />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
