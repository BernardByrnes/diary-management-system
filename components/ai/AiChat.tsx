"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, CalendarRange } from "lucide-react";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

function renderContent(text: string) {
  const lines = text.split("\n");
  const output: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect markdown table block
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter((l) => !/^\s*\|[-| :]+\|\s*$/.test(l));
      output.push(
        <div key={key++} className="overflow-x-auto my-2">
          <table className="text-xs border-collapse w-full">
            {rows.map((row, ri) => {
              const cells = row.split("|").filter((_, ci) => ci > 0 && ci < row.split("|").length - 1);
              const Tag = ri === 0 ? "th" : "td";
              return (
                <tr key={ri} className={ri === 0 ? "bg-gray-100 font-semibold" : ri % 2 === 0 ? "bg-gray-50" : ""}>
                  {cells.map((cell, ci) => (
                    <Tag key={ci} className="border border-gray-200 px-2 py-1 text-left whitespace-nowrap">
                      {renderInline(cell.trim())}
                    </Tag>
                  ))}
                </tr>
              );
            })}
          </table>
        </div>
      );
      continue;
    }

    // Empty line → spacing
    if (line.trim() === "") {
      output.push(<div key={key++} className="h-1" />);
    // ### heading
    } else if (line.startsWith("### ")) {
      output.push(<p key={key++} className="text-sm font-bold text-gray-800 mt-3 mb-1">{renderInline(line.slice(4))}</p>);
    // ## heading
    } else if (line.startsWith("## ")) {
      output.push(<p key={key++} className="text-sm font-bold text-gray-900 mt-3 mb-1 border-b border-gray-200 pb-1">{renderInline(line.slice(3))}</p>);
    // # heading
    } else if (line.startsWith("# ")) {
      output.push(<p key={key++} className="text-sm font-bold text-gray-900 mt-3 mb-1">{renderInline(line.slice(2))}</p>);
    // bullet list
    } else if (/^(\s*[-*]|\s*\d+\.) /.test(line)) {
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
      const content = line.replace(/^\s*[-*\d.]+\s/, "");
      output.push(
        <div key={key++} className="flex gap-1.5" style={{ paddingLeft: `${indent * 4 + 8}px` }}>
          <span className="text-gray-400 mt-0.5 shrink-0">•</span>
          <span>{renderInline(content)}</span>
        </div>
      );
    } else {
      output.push(<div key={key++}>{renderInline(line)}</div>);
    }
    i++;
  }

  return output;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      if (messages.length === 0) {
        setMessages([
          {
            role: "assistant",
            content: "Hello! I'm your Bwera Farmers Cooperative assistant. Ask me about milk deliveries, sales, expenses, or any business data.",
          },
        ]);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const history = updated
        .slice(1) // skip the greeting
        .slice(-8) // keep last 8 for context
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, startDate: startDate || undefined, endDate: endDate || undefined }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "Sorry, I couldn't get a response." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="fixed bottom-6 left-6 sm:bottom-8 sm:left-8 z-50">
      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-20 left-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
            style={{ maxHeight: "480px" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Bwera AI Assistant</p>
                <p className="text-xs text-blue-200">Powered by MiniMax</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Date range bar */}
            <div className="border-b border-gray-100 bg-white">
              <button
                onClick={() => setShowDateRange((p) => !p)}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>{startDate && endDate ? `${startDate} → ${endDate}` : "Set date range (optional)"}</span>
                {(startDate || endDate) && (
                  <span
                    className="ml-auto text-red-400 hover:text-red-600"
                    onClick={(e) => { e.stopPropagation(); setStartDate(""); setEndDate(""); setShowDateRange(false); }}
                  >clear</span>
                )}
              </button>
              {showDateRange && (
                <div className="flex items-center gap-2 px-4 pb-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">From</p>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">To</p>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" style={{ minHeight: 0 }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm"
                    }`}
                  >
                    {renderContent(msg.content)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Ask about your dairy..."
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 ${
          isOpen ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
