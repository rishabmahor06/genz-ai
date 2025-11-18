import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
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
} from "lucide-react";
import { IoText } from "react-icons/io5";

const ContentArea = () => {
  const chatRef = useRef(null);
  const historyRef = useRef(null);

  const [chatScrolled, setChatScrolled] = useState(false);
  const [item, setItem] = useState("");
  const [fileImage, setFileImage] = useState("");
  const [showFileInput, setShowFileInput] = useState(false);
  const [messages, setMessages] = useState([]);
  const [audio, setAudio] = useState("");
  const [loading, setLoading] = useState(false);

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
            `${import.meta.env.BACKEND_URL}/audio`,
            { audioText: transcript }
          );

          setAudio(response.data.audio);

          const newMsg = { from: "user", text: transcript };
          setMessages((prev) => [...prev, newMsg]);
        } catch (error) {
          console.error("Audio error:", error);
        }
      };

      sendAudio();
    }
  }, [listening, transcript]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item.trim()) return;

    setLoading(true);
    const userMsg = { from: "user", text: item };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await axios.post(`${import.meta.env.BACKEND_URL}/gemini`, {
        item,
      });

      const aiMsg = { from: "assistant", text: response.data.message };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Text chat error:", error);
    }

    setItem("");
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!fileImage) return;

    const data = new FormData();
    setLoading(true);

    data.append("file", fileImage);
    data.append("upload_preset", "GEMINIRISHAB");
    data.append("cloud_name", "dbfqvsrls");

    try {
      const res = await axios.post(
        "https://api.cloudinary.com/v1_1/dbfqvsrls/image/upload",
        data
      );

      const url = res.data.secure_url;

      const imgMsg = { from: "user", image: url };
      setMessages((prev) => [...prev, imgMsg]);

      setFileImage(url);
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImage = async () => {
    if (!fileImage) return;
    setLoading(true);

    try {
      const res = await axios.post(`${import.meta.env.BACKEND_URL}/gemini-image`, {
        item,
        fileImage,
      });

      const imgResponse = { from: "assistant", text: res.data.message };
      setMessages((prev) => [...prev, imgResponse]);
    } catch (err) {
      console.error("Image model error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full px-2 md:px-6 flex justify-center items-start pb-3.5">
      <div className="w-full max-w-[1600px] flex flex-col lg:flex-row gap-4">

        {/* LEFT ICONS */}
        <div className="flex flex-col justify-center items-center gap-4">
          <div className="group z-50 flex flex-col cursor-pointer">
            {" "}
            <Trash2 className="bg-white  hover:bg-white text-black hover:text-black w-10 h-10 px-2 py-2 ml-1 rounded-4xl " />{" "}
            <span className="absolute -left-2 -z-10 text-transparent group-hover:text-white group-hover:bg-black pl-13 px-5 py-3 rounded-full group-hover:-mt-1 font-medium whitespace-nowrap hidden group-hover:block -translate-x-0 group-hover:translate-x-8 transition-all duration-300 ease-in-out delay-75">
              {" "}
              Clear Chat{" "}
            </span>{" "}
          </div>{" "}
          <div className="group z-50 flex flex-col cursor-pointer">
            {" "}
            <Plus className="bg-white hover:bg-white text-black hover:text-black w-10 h-10 px-2 py-2 ml-1 rounded-4xl hover:rotate-46 hover:transition-all " />{" "}
            <span className="absolute -left-2 -z-10 text-transparent group-hover:text-white group-hover:bg-black pl-13 px-5 py-3 rounded-full group-hover:-mt-1 font-medium whitespace-nowrap hidden group-hover:block -translate-x-0 group-hover:translate-x-8 transition-all duration-300 ease-in-out delay-75">
              {" "}
              New Chat{" "}
            </span>{" "}
          </div>
        </div> 

        {/* CHAT WINDOW */}
        <div className="flex-1 max-w-8xl bg-white/30 backdrop-blur-md rounded-xl overflow-hidden shadow">

          {/* HEADER */}
          <div
            className={`sticky top-0 z-20 px-6 py-3 transition ${
              chatScrolled
                ? "bg-white/80 backdrop-blur-md shadow"
                : "bg-white/20 backdrop-blur-sm"
            }`}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Super Chat</h3>
              <button className="p-2 rounded-full bg-white/70">
                <EllipsisVertical className="w-5 h-5" />
              </button>
            </div>
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
                    ? "bg-blue-100 ml-auto"
                    : "bg-white/70 backdrop-blur-sm"
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
                  <div className="text-sm text-gray-800 break-words">
                    {msg.text && <p>{msg.text}</p>}
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Uploaded"
                        className="mt-2 rounded-lg max-w-[250px]"
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
            <div className="rounded-2xl p-3 bg-white shadow flex flex-col gap-3">
              <textarea
                rows="1"
                placeholder="Ask or search anything..."
                className="w-full h-12 px-3 rounded-lg bg-gray-100 resize-none focus:outline-none"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              <div className="flex flex-wrap justify-between items-center gap-3">

                <div className="flex flex-wrap gap-3">
                  <button className="flex items-center gap-2 bg-gray-200 px-3 py-1 rounded-full text-sm whitespace-nowrap">
                    <IoText className="w-6 h-6 bg-white p-1 rounded-full" />
                    text to voice
                    <AudioLines className="w-6 h-6 bg-white p-1 rounded-full" />
                  </button>

                  <button
                    onClick={
                      !listening
                        ? SpeechRecognition.startListening
                        : SpeechRecognition.stopListening
                    }
                    className="flex items-center gap-2 bg-gray-200 px-3 py-1 rounded-full text-sm whitespace-nowrap"
                  >
                    <AudioLines className="w-6 h-6 bg-white p-1 rounded-full" />
                    {listening ? "Listening..." : "No Brand Voice"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFileInput(!showFileInput)}
                    className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200"
                  >
                    <Paperclip className="w-4 h-4 text-gray-700" />
                  </button>

                  {showFileInput && (
                    <div className="absolute bottom-24 right-6 md:right-28 bg-white p-3 rounded-xl shadow flex gap-3">
                      <input
                        type="file"
                        onChange={(e) => setFileImage(e.target.files[0])}
                      />
                      <button
                        onClick={handleUpload}
                        className="bg-gray-700 text-white px-3 py-1 rounded-lg"
                      >
                        Upload
                      </button>
                    </div>
                  )}

                  <button onClick={handleImage} className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200">
                    <Image className="w-4 h-4 text-gray-700" />
                  </button>

                  <button
                    onClick={handleSubmit}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-black/80"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE PANEL */}
        <div className="w-full lg:w-80 flex flex-col gap-4">

          {/* HISTORY */}
          <div className="bg-white/30 backdrop-blur-md rounded-xl p-4 h-[45vh] flex flex-col">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium">History Chat</h4>
              <button className="bg-white/60 p-2 rounded-full">
                <PanelLeft className="w-5 h-5" />
              </button>
            </div>

            <div
              ref={historyRef}
              className="mt-3 overflow-y-auto space-y-3 no-scrollbar"
            >
              {[
                "Write a persuasive email to convince customers",
                "Write a script for a training video",
                "Generate a 30-sec ad script",
                "Tell me what is AI?",
              ].map((t, i) => (
                <div key={i} className="bg-white p-3 rounded-xl flex gap-3 items-center">
                  <MessagesSquare className="w-6 h-6 text-gray-600" />
                  <p className="text-sm text-gray-700">{t}</p>
                </div>
              ))}
            </div>
          </div>

          {/* PRO PLAN */}
          <div className="bg-gradient-to-b from-green-300 to-green-400 rounded-xl p-5 text-white">
            <div className="flex gap-3 items-center">
              <img
                className="w-14 rounded-full"
                src="https://i.pinimg.com/736x/eb/76/a4/eb76a46ab920d056b02d203ca95e9a22.jpg"
                alt="Logo"
              />
              <h3 className="text-3xl font-semibold">Pro Plan</h3>
            </div>

            <div className="mt-3">
              <h3 className="text-2xl font-bold">
                $126.54 <span className="text-sm font-light">/month</span>
              </h3>
              <p className="text-lg opacity-90 mt-1">
                Get various other interesting features
              </p>
            </div>

            <button className="mt-4 w-full bg-black py-2 rounded-full text-white">
              Get Pro Plan Now
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { scrollbar-width: none; }
        .tooltip {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translate(40px, -50%);
          padding: 6px 12px;
          background: black;
          color: white;
          border-radius: 20px;
          opacity: 0;
          white-space: nowrap;
          transition: 0.2s;
        }
        .group:hover .tooltip {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default ContentArea;
