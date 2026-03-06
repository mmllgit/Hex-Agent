"use client";

import { useState, useRef, useEffect, memo } from "react";
import ReactMarkdown from "react-markdown";
import { streamChat } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  champion: string;
  mode: string;
}

const MarkdownMessage = memo(function MarkdownMessage({
  content,
}: {
  content: string;
}) {
  return (
    <div className="markdown-content prose prose-invert max-w-none">
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold text-brand-200 mb-3 mt-4">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold text-brand-300 mb-2 mt-3">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold text-brand-300 mb-2 mt-3">
            {children}
          </h3>
        ),
        strong: ({ children }) => (
          <strong className="text-brand-200 font-semibold">{children}</strong>
        ),
        code: ({ children }) => (
          <code className="bg-lol-light px-1.5 py-0.5 rounded text-lol-accent text-sm">
            {children}
          </code>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-gray-200">{children}</li>
        ),
        p: ({ children }) => (
          <p className="mb-2 leading-relaxed">{children}</p>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
});

export default function ChatPanel({ champion, mode }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = async (customMsg?: string) => {
    const text = customMsg || input.trim();
    if (!text && !champion) return;

    const userMessage = text || `请分析「${champion}」在${mode}中的攻略`;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      for await (const chunk of streamChat({
        champion,
        mode,
        message: text,
      })) {
        assistantContent += chunk;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: assistantContent,
          };
          return next;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "请求失败，请检查后端服务是否启动。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = () => {
    if (!champion) return;
    handleSend(`请给我${champion}在${mode}中的完整攻略建议，包括玩法分析、海克斯搭配推荐和技巧建议。`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-4">
            <div className="text-4xl md:text-6xl">⚔️</div>
            <h2 className="text-xl md:text-2xl font-bold text-brand-200">
              海克斯大乱斗AI助手
            </h2>
            <p className="text-lol-muted max-w-md text-sm md:text-base">
              选择英雄和模式后，点击下方按钮或输入问题，AI 将为你提供专业的攻略建议。
            </p>
            {champion && (
              <button
                onClick={handleQuickStart}
                className="bg-gradient-to-r from-brand-500 to-brand-400 text-white px-5 py-3 rounded-lg font-semibold hover:opacity-90 active:opacity-80 transition-opacity shadow-lg shadow-brand-500/25 text-sm md:text-base md:px-6"
              >
                为「{champion}」生成攻略
              </button>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-3 py-2.5 md:px-4 md:py-3 ${
                msg.role === "user"
                  ? "bg-brand-500/20 border border-brand-400/20 text-white rounded-br-md"
                  : "bg-lol-darker border border-lol-light/50 text-gray-100 rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <MarkdownMessage content={msg.content} />
              ) : (
                <p>{msg.content}</p>
              )}
              {msg.role === "assistant" && msg.content === "" && loading && (
                <div className="flex space-x-1.5 py-2">
                  <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-lol-light/40 p-3 md:p-4 bg-lol-darker/60 backdrop-blur-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 md:gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              champion
                ? `关于${champion}的问题...`
                : "请先选择英雄..."
            }
            disabled={loading}
            className="flex-1 min-w-0 bg-lol-light/60 border border-lol-surface/50 rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base text-white placeholder-lol-muted focus:outline-none focus:border-brand-400/60 focus:ring-1 focus:ring-brand-400/20 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !champion)}
            className="bg-gradient-to-r from-brand-500 to-brand-400 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl font-semibold text-sm md:text-base hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40 shadow-md shadow-brand-500/20 shrink-0"
          >
            {loading ? "..." : "发送"}
          </button>
        </form>
      </div>
    </div>
  );
}
