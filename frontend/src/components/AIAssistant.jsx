import { useState, useRef, useEffect } from "react";
import API from "../services/api";
import {
  FaRobot,
  FaPaperPlane,
  FaTimes,
  FaTrashAlt,
  FaMagic,
  FaArrowRight,
} from "react-icons/fa";

const PROMPT_SUGGESTIONS = [
  "Where did I spend the most this month?",
  "How does this month compare to last month?",
  "How can I save ₹5,000 this month?",
  "What are my largest recent expenses?",
];

export default function AIAssistant({ externalTrigger, onTriggerHandled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "👋 Hello! I am your **NovaPay AI Copilot**. I analyze your real transaction records to give you personalized spending insights, budgeting tips, and savings guidance. Ask me anything!",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Allow external components (like SmartInsights) to open the assistant with a prefilled query
  useEffect(() => {
    if (externalTrigger) {
      setIsOpen(true);
      if (externalTrigger.query) {
        handleSendMessage(externalTrigger.query);
      }
      if (onTriggerHandled) onTriggerHandled();
    }
  }, [externalTrigger]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await API.post("/ai/chat", { question: query });
      const aiReply = res.data?.reply || "I analyzed your accounts, but could not formulate a specific recommendation.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: aiReply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      console.error("AI Chat Error:", err);
      const errorMsg =
        err?.response?.data?.error ||
        "I'm temporarily having trouble connecting to your financial records. Please try again shortly.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: `⚠️ **Notice**: ${errorMsg}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: "ai",
        text: "Conversation cleared. Feel free to ask another question regarding your cash flow or spending!",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Simple formatter to parse **bold** and bullet lines cleanly
  const renderFormattedText = (text) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith("-") || trimmed.startsWith("•") || /^\d+\./.test(trimmed);

      // Parse bold segments
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedContent = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <div
          key={idx}
          className={`${isBullet ? "pl-2 my-1 border-l-2 border-cyan-500/40" : "my-0.5"} leading-relaxed`}
        >
          {formattedContent}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-3.5 text-white shadow-2xl shadow-cyan-500/30 ring-2 ring-cyan-400/40 transition-all duration-300 hover:scale-105 hover:brightness-110 active:scale-95"
        aria-label="Toggle AI Financial Copilot"
      >
        <div className="relative">
          <FaRobot className="text-xl" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
          </span>
        </div>
        <span className="hidden text-xs font-bold tracking-wide sm:inline">
          AI Copilot
        </span>
      </button>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-22 right-4 sm:right-6 z-50 flex h-[560px] max-h-[82vh] w-[92vw] sm:w-[430px] flex-col rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl backdrop-blur-2xl transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
                <FaRobot className="text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">NovaPay AI Copilot</h3>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live Data
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Personal Financial Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                title="Clear Conversation"
                aria-label="Clear Conversation"
              >
                <FaTrashAlt className="text-xs" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                title="Close Copilot"
                aria-label="Close Copilot"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 shadow-md ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs"
                      : msg.isError
                      ? "border border-red-500/30 bg-red-950/40 text-red-200 rounded-bl-xs"
                      : "border border-slate-700/80 bg-slate-800/80 text-slate-200 rounded-bl-xs"
                  }`}
                >
                  {renderFormattedText(msg.text)}
                </div>
                <span className="mt-1 px-1 text-[10px] text-slate-500">{msg.time}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-xs text-slate-300">
                  <FaMagic className="animate-spin text-cyan-400 text-xs" />
                  <span className="text-slate-400">Analyzing transaction records...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preset Prompts Chips */}
          <div className="border-t border-slate-800/80 bg-slate-900/50 p-2.5">
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Suggested Questions
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PROMPT_SUGGESTIONS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  disabled={loading}
                  className="shrink-0 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-cyan-500/50 hover:bg-slate-750 hover:text-white disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="border-t border-slate-800 p-3"
          >
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about spending, vaults, runway..."
                maxLength={400}
                disabled={loading}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/90 py-2.5 pl-4 pr-11 text-xs text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 p-2 text-white shadow-md transition hover:brightness-110 disabled:opacity-40"
                aria-label="Send query"
              >
                <FaPaperPlane className="text-xs" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-500">
              NovaPay AI provides budgeting insights, not certified tax or investment advice.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
