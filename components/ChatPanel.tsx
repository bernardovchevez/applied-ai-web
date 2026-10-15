"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { streamChat, submitFeedback } from "@/lib/bff";
import type { ChatMessage, SourceCitation } from "@/lib/types";
import { FeedbackBar } from "./FeedbackBar";
import { FormattedText } from "./FormattedText";

const STARTERS = [
  "Is Harbor Line S01E04 cleared for EMEA streaming?",
  "What locations are locked for episode 4?",
  "What territories are excluded in the distribution agreement?",
];

function uid() {
  return crypto.randomUUID();
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const send = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || streaming) return;
    setError(null);
    setStreaming(true);
    setInput("");

    const assistantId = uid();
    const sessionId = uid();
    setMessages((m) => [...m, { id: uid(), role: "user", content: q }, { id: assistantId, role: "assistant", content: "" }]);

    let text = "";
    let sources: SourceCitation[] = [];

    try {
      for await (const ev of streamChat(q, sessionId)) {
        if (ev.type === "sources") {
          sources = ev.sources;
          setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, sources: ev.sources } : x)));
        } else if (ev.type === "token") {
          text += ev.text;
          setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: text } : x)));
        } else if (ev.type === "done") {
          const content = ev.payload.final_answer ?? text;
          setMessages((m) =>
            m.map((x) =>
              x.id === assistantId
                ? {
                    ...x,
                    content,
                    sessionId: ev.payload.session_id,
                    latencyMs: ev.payload.latency_ms,
                    provider: ev.payload.provider,
                    sources,
                  }
                : x,
            ),
          );
        } else if (ev.type === "error") {
          setError(ev.message);
          setMessages((m) => m.filter((x) => x.id !== assistantId));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
      setMessages((m) => m.filter((x) => x.id !== assistantId));
    } finally {
      setStreaming(false);
    }
  }, [streaming]);

  const onFeedback = async (msg: ChatMessage, rating: "up" | "down") => {
    if (!msg.sessionId || msg.feedbackSent) return;
    const idx = messages.findIndex((m) => m.id === msg.id);
    const prompt = idx > 0 && messages[idx - 1]?.role === "user" ? messages[idx - 1].content : "";
    await submitFeedback({ sessionId: msg.sessionId, prompt, response: msg.content, rating, sources: msg.sources });
    setMessages((m) => m.map((x) => (x.id === msg.id ? { ...x, feedbackSent: rating } : x)));
  };

  return (
    <div className="panel chat-panel">
      <h1>RAG Chat</h1>
      <p className="lede">Streaming answers with pgvector citations · feedback to BFF state store</p>
      {error ? <div className="alert err">{error}</div> : null}

      <div className="messages">
        {messages.length === 0 ? (
          <div className="starters">
            {STARTERS.map((s) => (
              <button key={s} type="button" disabled={streaming} onClick={() => void send(s)}>{s}</button>
            ))}
          </div>
        ) : null}
        {messages.map((m) => (
          <article key={m.id} className={`msg ${m.role}`}>
            <div className="role">{m.role === "user" ? "You" : "Assistant"}</div>
            <div className="body">
              {m.content ? <FormattedText text={m.content} sources={m.sources} /> : streaming ? "…" : ""}
            </div>
            {m.role === "assistant" && m.sessionId && m.content ? (
              <div className="meta">
                {m.provider && <span>{m.provider}</span>}
                {m.latencyMs != null && <span>{m.latencyMs} ms</span>}
                <FeedbackBar selected={m.feedbackSent} onRate={(r) => void onFeedback(m, r).catch((e) => setError(String(e)))} />
              </div>
            ) : null}
          </article>
        ))}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={(e: FormEvent) => { e.preventDefault(); void send(input); }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about clearance, production, distribution…" rows={2} disabled={streaming}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} />
        <button type="submit" disabled={streaming || !input.trim()}>{streaming ? "Streaming…" : "Send"}</button>
      </form>
    </div>
  );
}
