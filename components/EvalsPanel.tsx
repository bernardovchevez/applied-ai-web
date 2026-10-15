"use client";

import { useEffect, useState } from "react";

import { fetchEvalSummary } from "@/lib/bff";
import type { EvalBackendScore, EvalSummary } from "@/lib/types";

function ScoreTable({
  title,
  rows,
  passedLabel = "Passed",
  totalLabel = "Total",
}: {
  title: string;
  rows: EvalBackendScore[];
  passedLabel?: string;
  totalLabel?: string;
}) {
  if (!rows.length) {
    return (
      <section className="card">
        <h2>{title}</h2>
        <p className="muted">No results file yet — run the eval script below to populate.</p>
      </section>
    );
  }
  return (
    <section className="card">
      <h2>{title}</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Backend</th>
            <th>{passedLabel}</th>
            <th>{totalLabel}</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.backend}>
              <td><code>{row.backend}</code></td>
              <td>{row.passed}</td>
              <td>{row.total}</td>
              <td className="muted">{row.note ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function EvalsPanel() {
  const [data, setData] = useState<EvalSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvalSummary()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load evals"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="panel"><p className="muted">Loading eval summary…</p></div>;
  if (error) {
    return (
      <div className="panel">
        <div className="alert err">{error}</div>
        <p className="muted">
          Ensure the BFF is running on port 8000 and eval artifacts exist under{" "}
          <code>applied-ai-platform/rag/evals/</code>.
        </p>
      </div>
    );
  }
  if (!data) return null;

  const agentRows = data.agent_eval ? [data.agent_eval] : [];

  return (
    <div className="panel">
      <h1>Eval Dashboard</h1>
      <p className="lede">Read-only scores from applied-ai-platform eval harnesses (RAG, RAGAS, agent, promptfoo)</p>

      <div className="stats">
        <div className="stat"><span className="num">{data.gold_questions}</span><span>Gold RAG Q</span></div>
        {data.agent_scenarios ? (
          <div className="stat"><span className="num">{data.agent_scenarios}</span><span>Agent scenarios</span></div>
        ) : null}
        {data.agent_eval ? (
          <div className="stat">
            <span className="num">{data.agent_eval.passed}/{data.agent_eval.total}</span>
            <span>Agent eval</span>
          </div>
        ) : null}
        {data.promptfoo ? (
          <div className="stat">
            <span className="num">{data.promptfoo.passed}/{data.promptfoo.total}</span>
            <span>Promptfoo</span>
          </div>
        ) : null}
      </div>

      <ScoreTable title="RAG keyword eval" rows={data.keyword_eval} />
      {data.keyword_eval_timestamp ? (
        <p className="muted foot">Keyword eval: {data.keyword_eval_timestamp}</p>
      ) : null}

      <ScoreTable
        title="RAGAS (semantic)"
        rows={data.ragas_eval ?? []}
        passedLabel="Questions"
        totalLabel="Questions"
      />
      {data.ragas_eval_timestamp ? (
        <p className="muted foot">
          RAGAS: {data.ragas_eval_timestamp}
          {data.ragas_judge_model ? ` · judge ${data.ragas_judge_model}` : ""}
        </p>
      ) : null}

      <ScoreTable title="Agent workflow scenarios" rows={agentRows} />
      {data.agent_eval_timestamp ? (
        <p className="muted foot">Agent eval: {data.agent_eval_timestamp}</p>
      ) : null}

      <section className="card">
        <h2>Refresh data</h2>
        <p className="muted">The dashboard reads JSON artifacts from disk — it does not run evals itself.</p>
        <pre className="draft">{`./platform/ops/run_rag_keyword_baseline.sh
# optional cloud judge (needs OPENAI_API_KEY):
# ./platform/ops/run_rag_ragas_mlflow.sh
python agents/evals/run_agent_eval.py --mlflow`}</pre>
      </section>
    </div>
  );
}
