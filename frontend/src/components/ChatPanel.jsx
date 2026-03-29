import { useEffect, useRef, useState } from "react";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "I've reviewed your brew. Ask me anything \u2014 about your technique, the analysis, or how to improve next time.",
};

export default function ChatPanel({ brew }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const brewId = brew?.brew?.id;

  // Reset chat when brew changes
  useEffect(() => {
    if (!brewId) {
      setMessages([]);
      return;
    }
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setError(null);
  }, [brewId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || !brewId) return;

    setError(null);
    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      // Only send user/assistant messages (skip the initial greeting which is local-only)
      const apiMessages = nextMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map(({ role, content }) => ({ role, content }));

      const res = await fetch(`/api/brews/${brewId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server error (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!brewId) {
    return (
      <div className="flex h-full items-center justify-center text-stone-400 text-sm py-8">
        Select a brew to start chatting
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <h2 className="text-lg font-semibold text-coffee-800 flex items-center gap-2">
        <span>💬</span> Chat
      </h2>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="space-y-2 overflow-y-auto max-h-80 pr-1"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-lg px-3 py-2 max-w-[85%] text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-stone-100 text-stone-800 border border-stone-200"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-stone-100 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-500">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent disabled:opacity-50"
          placeholder="Ask about this brew..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="rounded-lg bg-coffee-700 px-4 py-2 text-xs font-medium text-white hover:bg-coffee-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
