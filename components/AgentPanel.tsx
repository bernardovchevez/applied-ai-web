"use client";

import { FormEvent, useState } from "react";

import { isAgentPaused, resumeAgent, runAgent } from "@/lib/bff";
import type { AgentPausedResponse, AgentRunResponse } from "@/lib/types";
import { CitationList } from "./CitationList";

const STARTERS = [
  "Prepare clearance summary for Harbor Line S01E04 EMEA launch",
  "What is the clearance status for Harbor Line in APAC?",
];

function ToolTrace({ trace }: { trace: Record<string, unknown>[] }) {
  if (!trace.length) return null;
  return (
    <details className="trace">
      <summary>Tool trace ({trace.length})</summary>
      <pre>{JSON.stringify(trace, null, 2)}</pre>
    </details>
  );
}

export function AgentPanel() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState<AgentPausedResponse | null>(null);
  const [result, setResult] = useState<AgentRunResponse | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const p = prompt.trim();
    if (!p || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPaused(null);
    try {
      const res = await runAgent({ prompt: p, autoApprove: false });
      if (isAgentPaused(res)) setPaused(res);
      else setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent failed");
    } finally {
      setLoading(false);
    }
  };

  const decide = async (resume: "approve" | "reject") => {
    if (!paused?.thread_id || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await resumeAgent({ threadId: paused.thread_id, resume });
      setResult(res);
      setPaused(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume failed");
    } finally {
      setLoading(false);
    }
  };

  const resultTitle =
    result?.status === "approved"
      ? "Published"
      : result?.status === "rejected"
        ? "Rejected"
        : "Result";

  return (
    <div className="panel">
      <h1>Clearance Agent</h1>
      <p className="lede">
        Multi-agent workflow via BFF · human approval gate (202 → approve publishes the draft)
      </p>
      {error ? <div className="alert err">{error}</div> : null}

      <form className="agent-form" onSubmit={(e) => void submit(e)}>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Agent prompt…" rows={3} disabled={loading || !!paused} />
        <div className="row">
          <button type="submit" disabled={loading || !prompt.trim() || !!paused}>{loading ? "Running…" : "Run agent"}</button>
        </div>
      </form>

      <div className="starters">
        {STARTERS.map((s) => (
          <button key={s} type="button" disabled={loading || !!paused} onClick={() => setPrompt(s)}>{s}</button>
        ))}
      </div>

      {paused ? (
        <section className="card pending">
          <h2>Awaiting approval</h2>
          <p className="muted">{paused.message}</p>
          {paused.prompt ? <p><strong>Prompt:</strong> {paused.prompt}</p> : null}
          <p className="muted">Draft output (unchanged if you approve; approval records publish consent):</p>
          <pre className="draft">{paused.proposed_output}</pre>
          {paused.sources?.length ? <CitationList sources={paused.sources} /> : null}
          <ToolTrace trace={paused.tool_trace ?? []} />
          <div className="row">
            <button type="button" className="primary" disabled={loading} onClick={() => void decide("approve")}>Approve & publish</button>
            <button type="button" className="danger" disabled={loading} onClick={() => void decide("reject")}>Reject</button>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className={`card ${result.status === "approved" ? "approved" : result.status === "rejected" ? "rejected" : ""}`}>
          <h2>{resultTitle}</h2>
          {result.status === "approved" ? (
            <p className="alert ok">Human approval recorded: draft published to workflow.</p>
          ) : null}
          {result.status === "rejected" ? (
            <p className="alert err">Draft discarded (not published).</p>
          ) : null}
          {result.answer ? <pre className="draft">{result.answer}</pre> : null}
          {result.sources?.length ? <CitationList sources={result.sources} /> : null}
          <ToolTrace trace={result.tool_trace ?? []} />
        </section>
      ) : null}
    </div>
  );
}
