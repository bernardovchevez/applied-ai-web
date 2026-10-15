export type SourceCitation = {
  file_name: string;
  doc_type?: string | null;
  rights_tier?: string | null;
  sharepoint_path?: string | null;
  chunk_index?: number | null;
  distance?: number | null;
};

export type ChatDonePayload = {
  session_id: string;
  provider: string;
  latency_ms: number;
  prompt_version?: string;
  client_platform?: string | null;
  /** BFF-normalized answer (fixes local-model garbles); prefer over streamed tokens. */
  final_answer?: string;
};

export type ChatStreamEvent =
  | { type: "sources"; sources: SourceCitation[] }
  | { type: "token"; text: string }
  | { type: "done"; payload: ChatDonePayload }
  | { type: "error"; error: string; message: string };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  sessionId?: string;
  latencyMs?: number;
  provider?: string;
  feedbackSent?: "up" | "down";
};

export type AgentRunResponse = {
  answer: string;
  sources: SourceCitation[];
  tool_trace: Record<string, unknown>[];
  status?: "approved" | "completed" | "rejected";
};

export type AgentPausedResponse = {
  thread_id: string;
  message: string;
  proposed_output?: string | null;
  prompt?: string | null;
  sources?: SourceCitation[];
  tool_trace?: Record<string, unknown>[];
};

export type EvalBackendScore = {
  backend: string;
  passed: number;
  total: number;
  note?: string | null;
};

export type EvalSummary = {
  gold_questions: number;
  agent_scenarios?: number;
  keyword_eval: EvalBackendScore[];
  keyword_eval_timestamp?: string | null;
  ragas_eval?: EvalBackendScore[];
  ragas_eval_timestamp?: string | null;
  ragas_judge_model?: string | null;
  agent_eval?: EvalBackendScore | null;
  agent_eval_timestamp?: string | null;
  promptfoo?: {
    passed: number;
    total: number;
    failures?: number | null;
    errors?: number | null;
  } | null;
  sources?: Record<string, string> | null;
};

export type AppEnvironment = "localhost" | "stage" | "production";

export type HealthReport = {
  status: "ok" | "degraded";
  version: string;
  environment?: AppEnvironment;
  state_store?: "sqlite" | "postgres";
  pgvector: { status: string; chunk_count?: number; document_count?: number; error?: string };
  llm: { provider: string; status: string; error?: string };
};

export type BffStatus = "loading" | "online" | "degraded" | "offline";
