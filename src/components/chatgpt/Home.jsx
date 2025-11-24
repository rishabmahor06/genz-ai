// App.jsx
import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Card from "./Card";
import axios from "axios";
import { IoMdCloseCircle } from "react-icons/io";
import { FaPlay, FaPause } from "react-icons/fa";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { BeatLoader } from "react-spinners";
import { AudioLines, Paperclip, ArrowDownToLine, CircleX,Share2 } from "lucide-react";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [waitingAudioResponse, setWaitingAudioResponse] = useState(false);
  const [uploadPreviewLoading, setUploadPreviewLoading] = useState(false);

  const [expandedIndex, setExpandedIndex] = useState(null);

  // --- states reused from previous ContentArea logic ---
  const [item, setItem] = useState("");
  const [fileImage, setFileImage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [showFileInput, setShowFileInput] = useState(false);
  const [messages, setMessages] = useState(
    JSON.parse(localStorage.getItem("chatMessages")) || []
  );
  const [historyMessages, setHistoryMessages] = useState(
    JSON.parse(localStorage.getItem("historyMessages")) || []
  );
  const [loading, setLoading] = useState(false);
  const [audio, setAudio] = useState("");
  const [showPlayAudio, setShowPlayAudio] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [playingIndex, setPlayingIndex] = useState(null);

  const audioRef = useRef(new Audio());
  const chatRef = useRef(null);

  // speech recognition
  const { transcript, listening, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  // detect when speech stopped and transcript available -> send to /audio
  useEffect(() => {
    if (!listening && transcript) {
      (async () => {
        setWaitingAudioResponse(true);

        try {
          pushMessage({ from: "user", text: transcript });

          const res = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/audio`,
            { audioText: transcript }
          );

          if (res.data?.audio) {
            setAudio(res.data.audio);
            pushMessage({
              from: "assistant",
              audio: res.data.audio,
              text: res.data.message || null,
            });
          } else if (res.data?.message) {
            const parsed = parseAIResponse(res.data.message);
            pushMessage({
              from: "assistant",
              text: parsed.text,
              code: parsed.code || null,
            });
          }
        } catch (err) {
          console.error("Speech -> backend error:", err);
        } finally {
          setWaitingAudioResponse(false);
        }
      })();
    }
  }, [listening, transcript]);

  // autoplay handling when `audio` url changes
  useEffect(() => {
    if (!audio) return;
    const player = document.getElementById("ai-audio-player");
    if (player) {
      player.load();
      player
        .play()
        .then(() => setShowPlayAudio(false))
        .catch((e) => {
          console.warn("Autoplay prevented:", e);
          setShowPlayAudio(true);
        });
    }
  }, [audio]);

  // audio ended cleanup
  useEffect(() => {
    const a = audioRef.current;
    const onEnded = () => setPlayingIndex(null);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("ended", onEnded);
      a.pause();
      a.src = "";
    };
  }, []);

  // helper to push message and persist
  const pushMessage = (msg) => {
    setMessages((prev) => {
      const updated = [...prev, msg];
      try {
        localStorage.setItem("chatMessages", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // parse AI response (extract fenced code, strip leading asterisks)
  const parseAIResponse = (rawText) => {
    if (!rawText) return { text: "", code: null };
    let s = rawText.replace(/^\s*\*+\s*/, "");
    const fence = s.match(/```(?:[a-zA-Z]*)\n?([\s\S]*?)```/);
    if (fence) {
      const code = fence[1].trim();
      const text = s.replace(fence[0], "").trim();
      return { text: text || null, code };
    }
    return { text: s.trim(), code: null };
  };

  // upload file to Cloudinary (used both for explicit Upload button and inside submit if file is a File)
  const uploadToCloudinary = async (file) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "GEMINIRISHAB");
    data.append("cloud_name", "dbfqvsrls");
    const result = await axios.post(
      "https://api.cloudinary.com/v1_1/dbfqvsrls/image/upload",
      data
    );
    return result.data.secure_url;
  };

  // main submit handler (text-only, text+file (File or URL))
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!item.trim() && !fileImage) return;
    setLoading(true);

    // add user text message (if any)
    if (item.trim()) pushMessage({ from: "user", text: item });

    try {
      // CASE A: fileImage is a File (not uploaded yet)
      if (fileImage && fileImage instanceof File) {
        try {
          const uploadedUrl = await uploadToCloudinary(fileImage);
          setPreviewUrl(uploadedUrl);
          setFileImage(uploadedUrl); // convert to URL for next steps

          const res = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/gemini-image`,
            { item, fileImage: uploadedUrl }
          );

          if (res.data?.message) {
            const parsed = parseAIResponse(res.data.message);
            const aiMsg = parsed.code
              ? { from: "assistant", text: parsed.text, code: parsed.code }
              : { from: "assistant", text: parsed.text };
            if (res.data?.audio) aiMsg.audio = res.data.audio;
            pushMessage(aiMsg);
          }

          if (res.data?.audio) setAudio(res.data.audio);
          if (res.data?.image)
            pushMessage({ from: "assistant", image: res.data.image });

          // history
          setHistoryMessages((prev) => {
            const updated = [...prev, res.data?.message || "(image)"];
            try {
              localStorage.setItem("historyMessages", JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        } catch (err) {
          console.error("Image submit error:", err);
        } finally {
          setLoading(false);
          // setFileImage("");
        }
      }
      // CASE B: fileImage is already a URL (previously uploaded)
      else if (fileImage && typeof fileImage === "string") {
        if (fileImage) {
          pushMessage({ from: "user", image: fileImage });
        }
        try {
          const res = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/gemini-image`,
            { item, fileImage }
          );

          if (res.data?.message) {
            const parsed = parseAIResponse(res.data.message);
            const aiMsg = parsed.code
              ? { from: "assistant", text: parsed.text, code: parsed.code }
              : { from: "assistant", text: parsed.text };
            if (res.data?.audio) aiMsg.audio = res.data.audio;
            pushMessage(aiMsg);
          }

          if (res.data?.audio) setAudio(res.data.audio);
          if (res.data?.image)
            pushMessage({ from: "assistant", image: res.data.image });

          setHistoryMessages((prev) => {
            const updated = [...prev, res.data?.message || "(image)"];
            try {
              localStorage.setItem("historyMessages", JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        } catch (err) {
          console.error("Text+image chat error:", err);
        } finally {
          setLoading(false);
        }
      }
      // CASE C: text-only
      else {
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/gemini`,
            { item }
          );
          if (response.data?.audio) setAudio(response.data.audio);
          const parsed = parseAIResponse(response.data?.message);
          const aiMsg = parsed.code
            ? {
                from: "assistant",
                text: parsed.text,
                code: parsed.code,
                audio: response.data?.audio,
              }
            : {
                from: "assistant",
                text: parsed.text,
                audio: response.data?.audio,
              };
          pushMessage(aiMsg);

          setHistoryMessages((prev) => {
            const updated = [...prev, parsed.text || response.data?.message];
            try {
              localStorage.setItem("historyMessages", JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        } catch (err) {
          console.error("Text chat error:", err);
        } finally {
          setLoading(false);
        }
      }
    } catch (outerErr) {
      console.error("Submit outer error:", outerErr);
      setLoading(false);
    }

    setItem("");
    setPreviewUrl("");
    setLoading(false);
  };

  // upload button immediate handler
  const handleUploadClick = async () => {
    if (!fileImage || !(fileImage instanceof File))
      return alert("Select an image first");

    setUploadingImage(true); // START LOADER

    try {
      const url = await uploadToCloudinary(fileImage);

      // show image on user side instantly
      pushMessage({ from: "user", image: url });

      setFileImage(url);
      setPreviewUrl(url);
    } catch (err) {
      console.error("Image upload error:", err);
      alert("Image upload failed. See console.");
    } finally {
      setUploadingImage(false); // STOP LOADER
    }
  };

  // play specific message audio
  const handlePlayMessageAudio = async (url, idx) => {
    try {
      const a = audioRef.current;
      if (!url) return;
      if (a.src !== url) {
        a.pause();
        a.src = url;
        a.load();
        await a.play();
        setPlayingIndex(idx);
      } else {
        if (a.paused) {
          await a.play();
          setPlayingIndex(idx);
        } else {
          a.pause();
          setPlayingIndex(null);
        }
      }
    } catch (err) {
      console.error("Play audio error:", err);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem("chatMessages");
    } catch (e) {}
  };

  const handleNewChat = () => {
    setMessages([]);
    setItem("");
    // setFileImage("");
    // setPreviewUrl("");
    try {
      localStorage.removeItem("chatMessages");
      localStorage.removeItem("fileImage");
    } catch (e) {}
  };

  // helper limit words
  const limitWords = (text, count = 5) => {
    if (!text) return "";
    const words = text.split(" ");
    if (words.length <= count) return text;
    return words.slice(0, count).join(" ") + " ...";
  };

  // handle Enter key in input
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // manual play button fallback
  const playAiAudioManual = async () => {
    try {
      const player = document.getElementById("ai-audio-player");
      if (player) {
        await player.play();
        setShowPlayAudio(false);
      }
    } catch (err) {
      console.error("Manual play failed:", err);
    }
  };

  const handleGoHome = () => {
    setMessages([]);
    setItem("");
    setFileImage("");
    setPreviewUrl("");
    setExpandedIndex(null);
    setModalOpen(false);

    localStorage.removeItem("chatMessages");
    localStorage.removeItem("fileImage");
  };

  // UI: keep second-file structure, but wire up handlers & preview/modal
  return (
    <div className="max-h-screen flex bg-[rgba(22,22,23,1)] min-h-screen ">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        historyMessages={historyMessages}
        expandedIndex={expandedIndex}
        setExpandedIndex={setExpandedIndex}
        limitWords={limitWords}
        onHomeClick={handleGoHome}
      />
      <div className="flex-1 flex flex-col">
        <Topbar onMenu={() => setSidebarOpen((s) => !s)} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Chat Content */}
          <div className="flex-1 overflow-y-auto px-4 py-0">
            <section className="max-w-5xl mx-auto ">
              <div className="rounded-2xl sm:px-6 shadow-glass-lg sm: ">
                <div className="flex flex-col items-center text-center gap-6">
                  {/* Minimal display of messages */}
                  <div className="w-full rounded-lg max-h-[110vh]">
                    <div ref={chatRef} className="space-y-3">
                      {messages.length === 0 && <Card />}
                      {messages.map((m, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg ${
                            m.from === "user"
                              ? " ml-auto text-right"
                              : "bg-[rgba(255,255,255,0.01)] text-left"
                          }`}
                        >
                          {m.text && <div className="mb-1">{m.text}</div>}
                          {m.code && (
                            <pre className="text-xs bg-black/30 p-2 rounded overflow-auto">
                              {m.code}
                            </pre>
                          )}
                          {m.image && (
                            <img
                              src={m.image}
                              alt="msg"
                              className={`max-w-xs rounded mt-2 cursor-pointer 
                                  ${m.from === "user" ? "ml-auto" : "mr-auto"}`}
                              onClick={() => {
                                setModalImage(m.image);
                                setModalOpen(true);
                              }}
                            />
                          )}
                          {m.audio && (
                            <button
                              className="px-3 py-2 rounded bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600"
                              onClick={() => handlePlayMessageAudio(m.audio, i)}
                            >
                              {playingIndex === i ? (
                                <FaPause className="bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600" />
                              ) : (
                                <FaPlay className="text-white" />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                      {waitingAudioResponse && (
                        <div className="flex justify-center py-4 items-center">
                          <BeatLoader size={10} />
                          <span className="ml-3 text-sm text-gray-400">
                            Processing voice...
                          </span>
                        </div>
                      )}
                      {loading && (
                        <div className="flex justify-center py-4 ">
                          <BeatLoader size={8} />
                        </div>
                      )}
                      {uploadingImage && (
                        <div className="flex justify-center py-4">
                          <BeatLoader size={10} />
                          <span className="text-sm ml-2 text-gray-400">
                            Uploading image...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Fixed input bar (kept from second file) */}
          <div className="backdrop-blur-xl px-4 pb-2">
            <div className="max-w-5xl mx-auto">
              <div className="bg-[rgba(255,255,255,0.02)] rounded-2xl px-3">
                <div className="flex flex-col gap-3 ">
                  <div className="flex-1">
                    {/* sample start */}

                    {previewUrl && (
                      <div className="relative w-20 h-20 rounded-md overflow-hidden bg-black/30 flex items-center justify-center mb-2 mt-2">
                        {/* image preview */}
                        <img
                          src={previewUrl}
                          className="object-cover w-full h-full opacity-90"
                          alt="preview"
                        />

                        {/* loader on top */}
                        {uploadPreviewLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span class="loader"></span>
                          </div>
                        )}

                        {/* remove image button */}
                        <button
                          onClick={() => {
                            setPreviewUrl("");
                            setFileImage("");
                          }}
                          className="absolute -top-1 text-xl -right-1    rounded-full p-1"
                        >
                          <IoMdCloseCircle />
                        </button>
                      </div>
                    )}

                    {/* sample end  */}
                    <input
                      value={item}
                      onChange={(e) => setItem(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me anything..."
                      className="w-full bg-transparent py-4 outline-none placeholder:text-[color:var(--muted)]"
                    />
                  </div>

                  <div className="flex justify-between">
                    <div className="flex ">
                      <button
                        onClick={
                          !listening
                            ? SpeechRecognition.startListening
                            : SpeechRecognition.stopListening
                        }
                        className="flex items-center gap-2   px-2 py-1 rounded-full text-sm whitespace-nowrap text-gray-900 dark:text-white"
                      >
                        {listening ? (
                          <AudioLines className="w-6 h-6 bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 text-gray-900 p-1 rounded-full" />
                        ) : (
                          <AudioLines className="w-6 h-6 bg-white text-gray-900 p-1 rounded-full" />
                        )}
                      </button>
                      <button
                        onClick={() => setShowFileInput((s) => !s)}
                        className="px-3 py-1 rounded-full bg-[rgba(255,255,255,0.03)] mr-2"
                        title="Attach image"
                      >
                        <Paperclip size={16} />
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded-full font-extrabold bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600"
                        title="Send"
                      >
                        ↑
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-[color:var(--muted)]">
                  <div className="flex items-center gap-2 relative">
                    {/* File input popover */}
                    {showFileInput && (
                      <div className="absolute bottom-14 left-0 mb-2 bg-[#121213]  border border-white/10 p-3 rounded-lg z-50">
                        <input
                          type="file"
                          accept="image/*"
                          className="cursor-pointer"
                          onChange={async (e) => {
                            const f = e.target.files[0];
                            if (!f) return;

                            setPreviewUrl(URL.createObjectURL(f));
                            setUploadPreviewLoading(true);

                            setTimeout(async () => {
                              try {
                                const url = await uploadToCloudinary(f);
                                setFileImage(url);
                              } catch (err) {
                                console.error(err);
                                setPreviewUrl("");
                              } finally {
                                setUploadPreviewLoading(false);
                              }
                            }, 150);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* hidden audio element for autoplay/manual play */}
      {audio && (
        <audio id="ai-audio-player" className="hidden" controls>
          <source src={audio} />
          Your browser does not support the audio element.
        </audio>
      )}

      {showPlayAudio && audio && (
        <button
          onClick={playAiAudioManual}
          className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg"
        >
          Play audio
        </button>
      )}

      {/* image modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="relative max-w-4xl w-full mx-4">
            <img
              src={modalImage}
              alt="preview"
              className="w-full h-auto rounded-md shadow-lg"
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(modalImage);
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `image-${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error("Download failed:", err);
                  }
                }}
                className="bg-black/70 px-3 py-2 rounded-md shadow text-sm"
              >
                <ArrowDownToLine />
              </button>

              <button
                onClick={async () => {
                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: "AI Image",
                        url: modalImage,
                      });
                    } else if (navigator.clipboard) {
                      await navigator.clipboard.writeText(modalImage);
                      alert("Image URL copied to clipboard");
                    } else {
                      prompt("Copy image URL:", modalImage);
                    }
                  } catch (err) {
                    console.error("Share failed:", err);
                  }
                }}
                className="bg-black/70 px-3 py-2 rounded-md shadow text-sm"
              >
                <Share2 />
              </button>

              <button
                onClick={() => setModalOpen(false)}
                className="bg-red-500 text-white px-3 py-2 rounded-md shadow text-sm"
              >
                <CircleX />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
