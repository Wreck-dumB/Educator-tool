/**
 * Backend switch for every Claude call in the app. AI_BACKEND=proxy routes through the
 * local claude-proxy daemon (Max subscription, $0 marginal cost) - personal/dev use only,
 * for solo testing before other people touch the app. AI_BACKEND=api uses the real
 * Anthropic API (ANTHROPIC_API_KEY) and is the only mode allowed once other people are
 * testing or using the app. Defaults to "proxy" outside production and "api" in
 * production, so a missing env var can't silently leave a deployed instance on the
 * personal daemon.
 *
 * The proxy speaks freeform prompt/response only - it has no equivalent of the Messages
 * API's `tools` param (the Max-subscription path it rides has no concept of a developer-
 * defined tool schema). So runToolCall() below asks for the same JSON shape via the
 * system prompt instead of `tool_choice` when running in proxy mode, then parses the
 * response text as JSON instead of reading a tool_use block.
 */
import Anthropic from "@anthropic-ai/sdk";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const PROXY_URL = process.env.CLAUDE_PROXY_URL ?? "http://127.0.0.1:8799";

export function aiBackendMode(): "proxy" | "api" {
  const mode = process.env.AI_BACKEND;
  if (mode === "proxy" || mode === "api") return mode;
  return process.env.NODE_ENV === "production" ? "api" : "proxy";
}

function assertBackendAllowed(): "proxy" | "api" {
  const mode = aiBackendMode();
  if (mode === "proxy" && process.env.NODE_ENV === "production") {
    throw new Error(
      "AI_BACKEND=proxy is not allowed in production - the claude-proxy daemon is personal/PC-only, not for real users.",
    );
  }
  return mode;
}

function getClient(): Anthropic {
  const mode = assertBackendAllowed();
  if (mode === "proxy") {
    return new Anthropic({ apiKey: "claude-proxy-local", baseURL: PROXY_URL });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey });
}

function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const jsonSlice = start !== -1 && end !== -1 ? candidate.slice(start, end + 1) : candidate;
  return JSON.parse(jsonSlice) as T;
}

// True when every key is exactly "0", "1", ... "n-1" - the shape the model
// occasionally emits for what should have been a JSON array.
function isArrayLikeObject(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj);
  return keys.length > 0 && keys.every((k, i) => k === String(i));
}

// Large/deeply-nested tool schemas (e.g. an array of several multi-field
// objects) can make the model emit the payload wrong in three ways: a
// nested field JSON-encoded as a string instead of native structure (at any
// depth, sometimes the whole payload); an array field emitted as an object
// keyed "0"/"1"/"2"... instead of a real array; or - for schemas with a
// single top-level property (activities/recipes/days/entries/items) - the
// whole payload double-wrapped in that same key, e.g.
// {"activities": {"activities": [...]}}. None of these are schema
// violations caught by max_tokens. Recursively parse any string that looks
// like JSON, coerce array-like objects into real arrays, and unwrap a
// self-duplicated single top-level key, so any of these still come out as
// the expected structure. Plain-text fields (titles, summaries) never start
// with { or [, so this is safe to apply everywhere.
function deepParseJsonStrings(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const looksLikeJson = (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
    if (!looksLikeJson) return value;
    try {
      return deepParseJsonStrings(JSON.parse(trimmed));
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(deepParseJsonStrings);
  if (value && typeof value === "object") {
    let parsed = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepParseJsonStrings(v)])) as Record<string, unknown>;
    // Unwrap {"k": {"k": ...}} - the model duplicating the single top-level
    // key instead of putting the real payload directly under it.
    while (true) {
      const keys = Object.keys(parsed);
      if (keys.length !== 1) break;
      const inner = parsed[keys[0]];
      if (!inner || typeof inner !== "object" || Array.isArray(inner) || Object.keys(inner).length !== 1 || Object.keys(inner)[0] !== keys[0]) break;
      parsed = inner as Record<string, unknown>;
    }
    return isArrayLikeObject(parsed) ? Object.values(parsed) : parsed;
  }
  return value;
}

export interface ToolCallArgs {
  model: string;
  system?: string;
  messages: ChatMessage[];
  tool: Anthropic.Tool;
  maxTokens: number;
}

/** Runs one forced-tool-call generation. In "api" mode this is an ordinary tool_choice
 * call. In "proxy" mode it asks for the same JSON shape via the prompt and parses the
 * response text, since the local daemon doesn't support `tools`. */
export async function runToolCall<T>({ model, system, messages, tool, maxTokens }: ToolCallArgs): Promise<T> {
  const mode = assertBackendAllowed();
  const client = getClient();

  if (mode === "api") {
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      // Claude Sonnet 5 runs adaptive thinking by default when this is omitted,
      // and thinking tokens count against max_tokens — several routes here use
      // tight budgets (as low as 1024) sized for a non-thinking response, so
      // leaving thinking on risks silent truncation. These are forced
      // structured-output tool calls, not open-ended reasoning tasks, so
      // disabling it keeps the existing token budgets meaningful.
      //
      // A forced tool_choice also measurably suppresses the model from
      // populating a nuanced *optional* field buried among many required
      // ones in a big schema (confirmed by direct testing: 0/10 populated
      // across a varied batch, thinking on or off) - but it's fine for a
      // schema where that judgment call is the tool's only real job, which
      // is why classifyWorksheetTemplates (anthropic.ts) is a small
      // dedicated call rather than trying to fix that here.
      thinking: { type: "disabled" },
    });
    if (message.stop_reason === "max_tokens") {
      throw new Error("AI_RESPONSE_TRUNCATED: the response was cut off before it finished — try a shorter document/description or fewer amendment notes");
    }
    const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) throw new Error("Model did not return a tool call");
    return deepParseJsonStrings(toolUse.input) as T;
  }

  const proxySystem = `${system ?? ""}\n\nRespond with ONLY one valid JSON object (no markdown code fences, no commentary before or after) that matches exactly this JSON Schema:\n${JSON.stringify(tool.input_schema)}`;
  const message = await client.messages.create({ model, max_tokens: maxTokens, system: proxySystem, messages });
  if (message.stop_reason === "max_tokens") {
    throw new Error("AI_RESPONSE_TRUNCATED: the response was cut off before it finished — try a shorter document/description or fewer amendment notes");
  }
  const text = message.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
  return extractJson<T>(text);
}

export interface TextCallArgs {
  model: string;
  system?: string;
  messages: ChatMessage[];
  maxTokens: number;
}

/** Runs one plain text generation (no tool schema) - works unchanged against either
 * backend since the proxy's /v1/messages is already Anthropic-shaped for this case. */
export async function runTextCall({ model, system, messages, maxTokens }: TextCallArgs): Promise<string> {
  const client = getClient();
  const message = await client.messages.create({ model, max_tokens: maxTokens, system, messages });
  return message.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
}
