import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { BeatLoader } from "react-spinners";
import {
  EllipsisVertical,
  PanelLeft,
  MessagesSquare,
  Send,
  AudioLines,
  Paperclip,
  Trash2,
  Plus,
  Image,
  ChevronDown,
} from "lucide-react";

import { IoText } from "react-icons/io5";

const ContentArea = () => {
  const chatRef = useRef(null);
  const historyRef = useRef(null);

  const [chatScrolled, setChatScrolled] = useState(false);
  const [item, setItem] = useState("");
  const [fileImage, setFileImage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [showFileInput, setShowFileInput] = useState(false);
  const [showfeatures, setShowfeatures] = useState(false);
  const [messages, setMessages] = useState([]);
  const [audio, setAudio] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPlayAudio, setShowPlayAudio] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [playingIndex, setPlayingIndex] = useState(null);
  const audioRef = useRef(new Audio());

  const [showMenu, setShowMenu] = useState(false);
  const [historyMessages, setHistoryMessages] = useState(
    JSON.parse(localStorage.getItem("historyMessages")) || []
  );

  const [expandedIndex, setExpandedIndex] = useState(null);

  // derive darkMode from document element so ToggleTheme (which toggles
  // document.documentElement.classList) will affect this component.
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return (
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")
      );
    } catch (e) {
      return false;
    }
  });

  // Observe changes to <html> class attribute so theme toggles reflect immediately
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const target = document.documentElement;
    const obs = new MutationObserver(() => {
      setDarkMode(target.classList.contains("dark"));
    });
    obs.observe(target, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const { transcript, listening, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;

    const onScroll = () => setChatScrolled(el.scrollTop > 8);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!listening && transcript) {
      const sendAudio = async () => {
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/audio`,
            { audioText: transcript }
          );

          // add user message
          const newMsg = { from: "user", text: transcript };
          setMessages((prev) => [...prev, newMsg]);

          // if backend returned an audio url, attach assistant message with audio so user can play it
          if (response.data.audio) {
            setAudio(response.data.audio);
            const aiAudioMsg = {
              from: "assistant",
              audio: response.data.audio,
            };
            setMessages((prev) => [...prev, aiAudioMsg]);
          }
        } catch (error) {
          console.error("Audio error:", error);
        }
      };

      sendAudio();
    }
  }, [listening, transcript]);

  // autoplay audio when `audio` URL changes
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

  // attach ended listener and cleanup for audioRef
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
      console.error("Play message audio failed:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item.trim() && !fileImage) return;

    setLoading(true);
    const userMsg = { from: "user", text: item };
    setMessages((prev) => [...prev, userMsg]);
    console.log("item", item);

    try {
      // If there's a staged file (File object), upload it to Cloudinary first
      if (fileImage && fileImage instanceof File) {
        // upload to cloudinary first
        setLoading(true);
        try {
          const data = new FormData();
          data.append("file", fileImage);
          data.append("upload_preset", "GEMINIRISHAB");
          data.append("cloud_name", "dbfqvsrls");

          const uploadRes = await axios.post(
            "https://api.cloudinary.com/v1_1/dbfqvsrls/image/upload",
            data
          );

          const uploadedUrl = uploadRes.data.secure_url;
          // set fileImage to URL so next branch can send it to backend as string
          setFileImage(uploadedUrl);
          setPreviewUrl(uploadedUrl);

          // send prompt + uploaded image URL to backend
          const res = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/gemini-image`,
            {
              item,
              fileImage: uploadedUrl,
            }
          );

          if (res.data.message) {
            const parsed = parseAIResponse(res.data.message);
            const aiMsg = parsed.code
              ? {
                  from: "assistant",
                  text: parsed.text,
                  code: parsed.code,
                  audio: res.data.audio,
                }
              : { from: "assistant", text: parsed.text, audio: res.data.audio };
            setMessages((prev) => [...prev, aiMsg]);
          }

          // if backend returned audio url, play it
          if (res.data.audio) {
            setAudio(res.data.audio);
          }

          if (res.data.image) {
            const aiImgMsg = { from: "assistant", image: res.data.image };
            setMessages((prev) => [...prev, aiImgMsg]);
          }

          setHistoryMessages((prev) => {
            const updated = [...prev, res.data.message || "(image)"];
            localStorage.setItem("historyMessages", JSON.stringify(updated));
            return updated;
          });
        } catch (err) {
          console.error("Image submit error:", err);
        } finally {
          setLoading(false);
          // clear staged file (we keep preview until user clears)
          setFileImage("");
        }
      } else if (fileImage && typeof fileImage === "string") {
        // If fileImage is already a Cloudinary URL (uploaded previously), send it directly
        try {
          const res = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/gemini-image`,
            {
              item,
              fileImage,
            }
          );

          if (res.data.message) {
            const parsed = parseAIResponse(res.data.message);
            const aiMsg = parsed.code
              ? {
                  from: "assistant",
                  text: parsed.text,
                  code: parsed.code,
                  audio: res.data.audio,
                }
              : { from: "assistant", text: parsed.text, audio: res.data.audio };
            setMessages((prev) => [...prev, aiMsg]);
          }

          if (res.data.audio) {
            setAudio(res.data.audio);
          }

          if (res.data.image) {
            const aiImgMsg = { from: "assistant", image: res.data.image };
            setMessages((prev) => [...prev, aiImgMsg]);
          }

          setHistoryMessages((prev) => {
            const updated = [...prev, res.data.message || "(image)"];
            localStorage.setItem("historyMessages", JSON.stringify(updated));
            return updated;
          });
        } catch (err) {
          console.error("Text+image chat error:", err);
        }
      } else {
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/gemini`,
          { item }
        );

        if (response.data.audio) setAudio(response.data.audio);

        const parsed = parseAIResponse(response.data.message);
        const aiMsg = parsed.code
          ? {
              from: "assistant",
              text: parsed.text,
              code: parsed.code,
              audio: response.data.audio,
            }
          : {
              from: "assistant",
              text: parsed.text,
              audio: response.data.audio,
            };

        setMessages((prev) => [...prev, aiMsg]);

        setHistoryMessages((prev) => {
          const updated = [
            ...prev,
            parseAIResponse(response.data.message).text ||
              response.data.message,
          ];
          localStorage.setItem("historyMessages", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error) {
      console.error("Text chat error:", error);
    }

    setItem("");
    setLoading(false);
  };

  const handleUpload = async () => {
    // Upload selected File to Cloudinary immediately and store the URL in `fileImage`.
    if (!fileImage || !(fileImage instanceof File)) return;
    setLoading(true);

    const data = new FormData();
    data.append("file", fileImage);
    data.append("upload_preset", "GEMINIRISHAB");
    data.append("cloud_name", "dbfqvsrls");

    try {
      const res = await axios.post(
        "https://api.cloudinary.com/v1_1/dbfqvsrls/image/upload",
        data
      );

      const url = res.data.secure_url;

      // set fileImage to the uploaded URL so submit will send the URL to backend
      setFileImage(url);
      setPreviewUrl(url);

      // show a small chat preview entry for the uploaded image (optional)
      const imgMsg = { from: "user", image: url };
      setMessages((prev) => [...prev, imgMsg]);
    } catch (err) {
      console.error("Image upload error:", err);
      alert("Image upload failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleImage = async () => {
    // Use main submit flow to send prompt + staged image together.
    return;
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Helper: sanitize AI response text and extract code fences
  const parseAIResponse = (rawText) => {
    if (!rawText) return { text: "", code: null };

    // Remove leading stars/asterisks and surrounding whitespace at start
    let s = rawText.replace(/^\s*\*+\s*/, "");

    // If there's a fenced code block, extract it
    const fence = s.match(/```(?:[a-zA-Z]*)\n?([\s\S]*?)```/);
    if (fence) {
      const code = fence[1].trim();
      const text = s.replace(fence[0], "").trim();
      return { text: text || null, code };
    }

    // No fenced block — return cleaned text
    return { text: s.trim(), code: null };
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem("chatMessages");
  };

  const handleNewChat = () => {
    setMessages([]);
    setItem("");
    localStorage.removeItem("chatMessages");
    localStorage.removeItem("fileImage");
  };

  const limitWords = (text, count = 5) => {
    const words = text.split(" ");
    if (words.length <= count) return text;
    return words.slice(0, count).join(" ") + " ...";
  };

  return (
    <div
      className={`${
        darkMode ? "dark" : ""
      } w-full px-2 md:px-6 flex justify-center items-start pb-3.5`}
    >
      <div className="w-full max-w-[1600px] flex flex-col lg:flex-row gap-4">
        {/* LEFT ICONS */}
        <div className="hidden md:hidden  lg:flex flex-col justify-center items-center gap-4">
          <div className="group z-50 flex flex-col cursor-pointer">
            <Trash2
              className="bg-white dark:bg-gray-700 hover:bg-white text-black dark:text-white w-10 h-10 px-2 py-2 ml-1 rounded-4xl"
              onClick={handleClearChat}
            />
          </div>

          <div className="group z-50 flex flex-col cursor-pointer">
            <Plus
              className="bg-white dark:bg-gray-700 hover:bg-white text-black dark:text-white w-10 h-10 px-2 py-2 ml-1 rounded-4xl"
              onClick={handleNewChat}
            />
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className="flex-1 max-w-8xl bg-white dark:bg-gray-900 backdrop-blur-md rounded-xl overflow-hidden shadow h-full   ">
          {/* HEADER */}
          <div
            className={`sticky top-0 z-20 px-6 py-3 flex justify-between items-center
              ${
                chatScrolled
                  ? "bg-white/80 dark:bg-gray-800/80 shadow"
                  : "bg-white/20 dark:bg-gray-800/40"
              }
            `}
          >
            <h3 className="text-lg font-semibold dark:text-white">
              Super Chat
            </h3>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full bg-white dark:bg-gray-700 shadow relative"
            >
              <EllipsisVertical className="w-5 h-5 dark:text-white" />

              {showMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 shadow-lg rounded-xl py-2 z-50">
                  <button
                    onClick={handleNewChat}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    New Chat
                  </button>

                  <button
                    onClick={handleClearChat}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Clear Chat
                  </button>

                  {/* dark toggle */}
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {darkMode ? "Light Mode" : "Dark Mode"}
                  </button>
                </div>
              )}
            </button>
          </div>

          {/* MESSAGES */}
          <div
            ref={chatRef}
            className="h-[65vh] md:h-[54vh] px-6 py-4 overflow-y-auto space-y-4 no-scrollbar"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-4 rounded-2xl shadow-sm max-w-[85%] ${
                  msg.from === "user"
                    ? "bg-blue-100 dark:bg-blue-900 text-gray-900 dark:text-white ml-auto"
                    : "bg-white dark:bg-gray-800 backdrop-blur-sm text-gray-900 dark:text-gray-100"
                }`}
              >
                <div className="flex gap-3">
                  <img
                    alt="avatar"
                    src={
                      msg.from === "user"
                        ? "https://i.pinimg.com/1200x/63/f3/a0/63f3a0fe0c318b623d9a431e2817b515.jpg"
                        : "https://i.pinimg.com/736x/bd/d3/bc/bdd3bc41294ea5a7d04f70c36893d3eb.jpg"
                    }
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="text-sm break-words">
                    <div className="flex items-center gap-2">
                      {msg.text && <p>{msg.text}</p>}
                      {msg.audio && (
                        <button
                          onClick={() => handlePlayMessageAudio(msg.audio, i)}
                          className="ml-2 p-1 rounded-full bg-gray-200 dark:bg-gray-700"
                          title={
                            playingIndex === i ? "Pause audio" : "Play audio"
                          }
                        >
                          <AudioLines
                            className={`w-4 h-4 ${
                              playingIndex === i
                                ? "text-green-500"
                                : "text-gray-700"
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {msg.code && (
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto text-xs">
                        <code>{msg.code}</code>
                      </pre>
                    )}

                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Uploaded"
                        className="mt-2 rounded-lg max-w-[250px] cursor-pointer"
                        onClick={() => {
                          setModalImage(msg.image);
                          setModalOpen(true);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-center py-4">
                <BeatLoader size={10} />
              </div>
            )}
          </div>

          {/* INPUT BOX */}
          <div className="px-6 py-2">
            <div className="rounded-2xl p-3 bg-white dark:bg-gray-800 shadow flex flex-col gap-3">
              <textarea
                rows="1"
                placeholder="Ask or search anything..."
                className="w-full h-16 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowfeatures(!showfeatures)}
                    className="block md:hidden lg:hidden p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                  >
                    <EllipsisVertical className="w-5 h-5 dark:text-white" />
                  </button>

                  {showfeatures && (
                    <div className="block md:hidden lg:hidden">
                      <button className="flex items-center gap-2 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full text-sm whitespace-nowrap text-gray-900 dark:text-white">
                        <IoText className="w-6 h-6 bg-white dark:bg-gray-700 p-1 rounded-full" />
                        text to voice
                        <AudioLines className="w-6 h-6 bg-white dark:bg-gray-700 p-1 rounded-full" />
                      </button>

                      <button
                        onClick={
                          !listening
                            ? SpeechRecognition.startListening
                            : SpeechRecognition.stopListening
                        }
                        className="flex items-center gap-2 bg-gray-200 dark:bg-gray-600 px-2 py-1 mt-2 rounded-full text-sm whitespace-nowrap text-gray-900 dark:text-white"
                      >
                        {listening ? (
                          <AudioLines className="w-6 h-6 bg-green-400 p-1 rounded-full" />
                        ) : (
                          <AudioLines className="w-6 h-6 bg-white dark:bg-gray-700 p-1 rounded-full" />
                        )}
                        {listening ? "Listening..." : "Brand Voice"}
                      </button>
                    </div>
                  )}

                  {/* desktop features */}
                  <div className="sm:hidden md:flex lg:flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full text-sm whitespace-nowrap text-gray-900 dark:text-white">
                      <IoText className="w-6 h-6 bg-white dark:bg-gray-700 p-1 rounded-full" />
                      text to voice
                      <AudioLines className="w-6 h-6 bg-white dark:bg-gray-700 p-1 rounded-full" />
                    </button>

                    <button
                      onClick={
                        !listening
                          ? SpeechRecognition.startListening
                          : SpeechRecognition.stopListening
                      }
                      className="flex items-center gap-2 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full text-sm whitespace-nowrap text-gray-900 dark:text-white"
                    >
                      {listening ? (
                        <AudioLines className="w-6 h-6 bg-green-400 p-1 rounded-full" />
                      ) : (
                        <AudioLines className="w-6 h-6 bg-white dark:bg-gray-700 p-1 rounded-full" />
                      )}
                      {listening ? "Listening..." : "No Brand Voice"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFileInput(!showFileInput)}
                    className="bg-gray-100 dark:bg-gray-600 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
                  >
                    <Paperclip className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  </button>

                  {showFileInput && (
                    <div className="absolute bottom-24 right-6 md:right-28 bg-white dark:bg-gray-700 p-3 rounded-xl shadow flex gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files[0];
                          setFileImage(f);
                          if (f) setPreviewUrl(URL.createObjectURL(f));
                        }}
                        className="text-black dark:text-white"
                      />
                      {fileImage && fileImage instanceof File ? (
                        <>
                          <button
                            onClick={handleUpload}
                            className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-800"
                          >
                            Upload
                          </button>
                          <button
                            onClick={() => {
                              setFileImage("");
                              setPreviewUrl("");
                            }}
                            className="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-800"
                          >
                            Clear
                          </button>
                        </>
                      ) : fileImage && typeof fileImage === "string" ? (
                        <>
                          <span className="inline-block px-3 py-1 bg-blue-600 text-white rounded">
                            Uploaded
                          </span>
                          <button
                            onClick={() => {
                              setFileImage("");
                              setPreviewUrl("");
                            }}
                            className="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-800"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setFileImage("");
                            setPreviewUrl("");
                          }}
                          className="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-800"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}

                  {previewUrl && (
                    <div className="absolute bottom-40 right-6 md:right-28 bg-white dark:bg-gray-700 p-2 rounded-lg shadow">
                      <img
                        src={previewUrl}
                        alt="preview"
                        className="w-28 h-20 object-cover rounded"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleImage}
                    className="bg-gray-100 dark:bg-gray-600 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
                  >
                    <Image className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  </button>

                  <button
                    onClick={handleSubmit}
                    className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE HISTORY PANEL */}
        <div className="w-full lg:w-80 bg-white dark:bg-gray-800 p-3 rounded-xl flex flex-col gap-2 cursor-pointer">
          <div className="w-full lg:w-80 flex-col gap-4 hidden lg:flex">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium dark:text-white">
                History Chat
              </h4>
              <button className="bg-white/60 dark:bg-gray-700 p-2 rounded-full">
                <PanelLeft className="w-5 h-5 dark:text-white" />
              </button>
            </div>

            <div
              ref={historyRef}
              className="mt-3 overflow-y-auto space-y-3 no-scrollbar"
            >
              {historyMessages.map((t, i) => {
                const isExpanded = expandedIndex === i;
                return (
                  <div
                    key={i}
                    onClick={() => setExpandedIndex(isExpanded ? null : i)}
                    className="bg-white dark:bg-gray-700 p-3 rounded-xl flex justify-between gap-2 cursor-pointer transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <MessagesSquare className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                      <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                        {isExpanded ? t : limitWords(t, 5)}
                      </p>
                    </div>
                      <ChevronDown  className="text-white"/>

                    {isExpanded && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 border-t pt-2">
                        {t}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {audio && (
        <audio id="ai-audio-player" className="hidden" controls>
          <source src={audio} />
          Your browser does not support the audio element.
        </audio>
      )}

      {showPlayAudio && audio && (
        <button
          onClick={async () => {
            try {
              const player = document.getElementById("ai-audio-player");
              if (player) {
                await player.play();
                setShowPlayAudio(false);
              }
            } catch (err) {
              console.error("Manual play failed:", err);
            }
          }}
          className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg"
        >
          Play audio
        </button>
      )}

      {/* Image modal lightbox */}
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
                  // Download image
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
                className="bg-white px-3 py-2 rounded-md shadow text-sm"
              >
                Download
              </button>

              <button
                onClick={async () => {
                  // Try Web Share API, fallback to copying URL
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
                className="bg-white px-3 py-2 rounded-md shadow text-sm"
              >
                Share
              </button>

              <button
                onClick={() => setModalOpen(false)}
                className="bg-red-500 text-white px-3 py-2 rounded-md shadow text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ContentArea;
