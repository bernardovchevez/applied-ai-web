import type {
  AgentPausedResponse,
  AgentRunResponse,
  AppEnvironment,
  ChatStreamEvent,
  EvalSummary,
  HealthReport,
  SourceCitation,
} from "./types";

function normalizeEnv(raw: string | undefined): AppEnvironment {
  const val = (raw ?? "").trim().toLowerCase();
  if (val === "stage" || val === "staging") return "stage";
  if (val === "prod" || val === "production") return "production";
  return "localhost";
}

export const APP_ENV: AppEnvironment = normalizeEnv(process.env.NEXT_PUBLIC_APP_ENV);

export const BFF_URL =
  process.env.NEXT_PUBLIC_BFF_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

const BFF_API_KEY = process.env.NEXT_PUBLIC_BFF_API_KEY?.trim() ?? "";

function buildClientHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Platform": "web",
    ...extra,
  };
  if (BFF_API_KEY) {
    headers["Authorization"] = `Bearer ${BFF_API_KEY}`;
  }
  return headers;
}

type SseFrame = { event: string; data: string };

/** sse-starlette emits CRLF; normalize before framing. */
function normalizeSseBuffer(buffer: string): string {
  return buffer.replace(/\r\n/g, "\n");
}

function parseSseFrames(buffer: string): { frames: SseFrame[]; rest: string } {
  const normalized = normalizeSseBuffer(buffer);
  const frames: SseFrame[] = [];
  const blocks = normalized.split("\n\n");
  const rest = blocks.pop() ?? "";

  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^\s/, ""));
    }
    if (dataLines.length > 0) frames.push({ event, data: dataLines.join("\n") });
  }
  return { frames, rest };
}

function frameToStreamEvent(frame: SseFrame): ChatStreamEvent | null {
  switch (frame.event) {
    case "sources":
      return {
        type: "sources",
        sources: parseJsonData<SourceCitation[]>(frame.data.trim(), "sources event"),
      };
    case "token":
      // Preserve leading/trailing spaces — Ollama tokens often start with a space.
      return { type: "token", text: frame.data };
    case "done":
      return { type: "done", payload: parseJsonData(frame.data.trim(), "done event") };
    case "error": {
      const parsed = parseJsonData<{ error?: string; message?: string }>(
        frame.data.trim(),
        "error event",
      );
      return {
        type: "error",
        error: parsed.error ?? "error",
        message: parsed.message ?? "Stream failed",
      };
    }
    default:
      return null;
  }
}

function parseJsonData<T>(raw: string, label: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid JSON";
    throw new Error(`${label}: ${msg}`);
  }
}

function chatErrorMessage(err: unknown): string {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    if (msg.includes("fetch") || msg.includes("network")) {
      return `Cannot reach the BFF at ${BFF_URL}. Is uvicorn running?`;
    }
  }
  if (err instanceof Error) return err.message;
  return "Chat failed";
}

export async function fetchHealth(): Promise<HealthReport> {
  const res = await fetch(`${BFF_URL}/health`);
  const text = await res.text();
  let data: HealthReport;
  try {
    data = JSON.parse(text) as HealthReport;
  } catch {
    throw new Error(`Health check failed (${res.status})`);
  }
  // 503 = BFF up but pgvector/LLM degraded — still a valid health payload.
  if (!res.ok && res.status !== 503) {
    throw new Error(`Health check failed (${res.status})`);
  }
  return data;
}

export async function* streamChat(
  question: string,
  sessionId: string,
): AsyncGenerator<ChatStreamEvent> {
  let response: Response;
  try {
    response = await fetch(`${BFF_URL}/v1/chat/stream`, {
      method: "POST",
      headers: buildClientHeaders({ "X-Session-Id": sessionId }),
      body: JSON.stringify({ question }),
    });
  } catch (err) {
    yield { type: "error", error: "network_error", message: chatErrorMessage(err) };
    return;
  }

  if (!response.ok) {
    yield {
      type: "error",
      error: "http_error",
      message: (await response.text()) || `BFF returned ${response.status}`,
    };
    return;
  }
  if (!response.body) {
    yield { type: "error", error: "no_body", message: "Empty response from BFF" };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseFrames(buffer);
      buffer = parsed.rest;
      for (const frame of parsed.frames) {
        const event = frameToStreamEvent(frame);
        if (event) yield event;
      }
    }

    if (buffer.trim()) {
      const parsed = parseSseFrames(`${buffer}\n\n`);
      for (const frame of parsed.frames) {
        const event = frameToStreamEvent(frame);
        if (event) yield event;
      }
    }
  } catch (err) {
    yield { type: "error", error: "stream_error", message: chatErrorMessage(err) };
  }
}

export async function submitFeedback(input: {
  sessionId: string;
  prompt: string;
  response: string;
  rating: "up" | "down";
  sources?: SourceCitation[];
}): Promise<void> {
  const res = await fetch(`${BFF_URL}/v1/feedback`, {
    method: "POST",
    headers: buildClientHeaders(),
    body: JSON.stringify({
      session_id: input.sessionId,
      prompt: input.prompt,
      response: input.response,
      rating: input.rating,
      sources: input.sources ?? [],
    }),
  });
  if (!res.ok) throw new Error((await res.text()) || `Feedback failed (${res.status})`);
}

export async function runAgent(input: {
  prompt: string;
  autoApprove?: boolean;
  sessionId?: string;
}): Promise<AgentRunResponse | AgentPausedResponse> {
  const extra: Record<string, string> = {};
  if (input.sessionId) extra["X-Session-Id"] = input.sessionId;
  const res = await fetch(`${BFF_URL}/v1/agent/run`, {
    method: "POST",
    headers: buildClientHeaders(extra),
    body: JSON.stringify({ prompt: input.prompt, auto_approve: input.autoApprove ?? false }),
  });
  const body = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(extractErrorMessage(body, res.statusText));
  }
  return body as AgentRunResponse | AgentPausedResponse;
}

export async function resumeAgent(input: {
  threadId: string;
  resume: "approve" | "reject";
}): Promise<AgentRunResponse> {
  const res = await fetch(`${BFF_URL}/v1/agent/run`, {
    method: "POST",
    headers: buildClientHeaders({ "X-Session-Id": input.threadId }),
    body: JSON.stringify({ thread_id: input.threadId, resume: input.resume }),
  });
  const body = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(extractErrorMessage(body, res.statusText));
  }
  return body as AgentRunResponse;
}

function extractErrorMessage(body: Record<string, unknown>, fallback: string): string {
  const detail = body.detail;
  if (detail && typeof detail === "object" && detail !== null && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  if (typeof body.message === "string") return body.message;
  return fallback;
}

async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = (await res.text()).trim();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(text.slice(0, 200) || `Invalid JSON response (${res.status})`);
  }
}

export async function fetchEvalSummary(): Promise<EvalSummary> {
  const res = await fetch(`${BFF_URL}/v1/evals/summary`, {
    headers: buildClientHeaders(),
  });
  if (!res.ok) throw new Error((await res.text()) || `Evals failed (${res.status})`);
  return res.json() as Promise<EvalSummary>;
}

export function isAgentPaused(
  result: AgentRunResponse | AgentPausedResponse,
): result is AgentPausedResponse {
  return "thread_id" in result && !("answer" in result);
}
