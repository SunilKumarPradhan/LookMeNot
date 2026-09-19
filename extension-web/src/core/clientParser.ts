import type { ChatEntry, EntryRole } from "./types";

type JsonObject = Record<string, unknown>;
type EntryWithoutIndex = Omit<ChatEntry, "index">;

const SINGLE_FIELD_KEYS = ["command", "file_path", "path", "query", "pattern", "url"];
const KNOWN_ROLES = new Set(["user", "assistant", "system"]);
const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const CONTROL_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;
const SYSTEM_CONTEXT_PREFIXES = [
  "<system-reminder>",
  "<local-command-stdout>",
  "[system notification",
  "this session is being continued from a previous conversation",
];
const EMPTY_TOOL_RESULT_TEXT = "Tool result block present; result content is empty in this JSON capture.";

export class ClientParseError extends Error {}

export interface ClientParseCaptureResult {
  entries: ChatEntry[];
  sourceKind: "input-only" | "input+output";
  warnings: string[];
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringifyJson(value: unknown): string {
  const json = JSON.stringify(value, null, 2);
  return json === undefined ? String(value) : json;
}

export function normalizeJsonish(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function locateMessages(dataValue: unknown): unknown[] {
  const data = normalizeJsonish(dataValue);

  if (isObject(data)) {
    if (Array.isArray(data.messages)) return data.messages;

    const inputValue = normalizeJsonish(data.input);
    if (isObject(inputValue) && Array.isArray(inputValue.messages)) return inputValue.messages;
    if (Array.isArray(inputValue)) return inputValue;

    const outputValue = normalizeJsonish(data.output);
    if (isObject(outputValue) && Array.isArray(outputValue.messages)) return outputValue.messages;
  }

  if (Array.isArray(data)) return data;

  throw new ClientParseError("Could not locate a messages array");
}

function normalizeRole(role: unknown): { role: EntryRole; rawRole: string } {
  if (typeof role === "string" && KNOWN_ROLES.has(role)) {
    return { role: role as EntryRole, rawRole: role };
  }
  return { role: "user", rawRole: role == null ? "unknown" : String(role) };
}

export function cleanText(text: unknown): string {
  return String(text).replace(ANSI_RE, "").replace(CONTROL_RE, "");
}

function isSystemContextText(text: string): boolean {
  const normalized = text.trimStart().toLowerCase();
  return SYSTEM_CONTEXT_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function cleanupSystemContextText(text: string): string {
  const stripped = cleanText(text).trim();
  const lower = stripped.toLowerCase();
  if (lower.startsWith("<system-reminder>") && lower.endsWith("</system-reminder>")) {
    return stripped.slice("<system-reminder>".length, -"</system-reminder>".length).trim();
  }
  if (lower.startsWith("<local-command-stdout>") && lower.endsWith("</local-command-stdout>")) {
    return stripped.slice("<local-command-stdout>".length, -"</local-command-stdout>".length).trim();
  }
  return stripped;
}

function normalizeContent(content: unknown): unknown[] {
  const normalized = normalizeJsonish(content);
  if (normalized == null) return [];
  if (typeof normalized === "string") return [{ type: "text", text: normalized }];
  if (Array.isArray(normalized)) {
    return normalized.map((item) => {
      if (typeof item === "string") return { type: "text", text: item };
      if (isObject(item)) return item;
      return { type: "unknown", text: String(item) };
    });
  }
  return [{ type: "unknown", text: stringifyJson(normalized) }];
}

function coerceBool(value: unknown, defaultValue = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return !["false", "0", "", "no"].includes(value.trim().toLowerCase());
  if (value == null) return defaultValue;
  return Boolean(value);
}

function stringifyToolInput(inputObject: unknown): string {
  const normalized = normalizeJsonish(inputObject);
  if (typeof normalized === "string") return normalized;
  if (isObject(normalized)) {
    const present = SINGLE_FIELD_KEYS.filter((key) => key in normalized);
    if (present.length === 1) return String(normalized[present[0]]);
  }
  return stringifyJson(normalized);
}

export function stableEntryKey(entry: ChatEntry): string {
  return JSON.stringify({
    role: entry.role,
    type: entry.type,
    text: entry.text ?? "",
    tool: entry.tool,
    toolInput: entry.toolInput,
    toolUseId: entry.toolUseId,
  });
}

export function reindexEntries(entries: ChatEntry[]): ChatEntry[] {
  return entries.map((entry, index) => ({ ...entry, index }));
}

function flattenToolResultContent(content: unknown): string {
  const normalized = normalizeJsonish(content);
  if (normalized == null) return EMPTY_TOOL_RESULT_TEXT;
  if (typeof normalized === "string") return cleanText(normalized) || EMPTY_TOOL_RESULT_TEXT;
  if (Array.isArray(normalized)) {
    const parts = normalized.map((item) => {
      const itemValue = normalizeJsonish(item);
      if (typeof itemValue === "string") return cleanText(itemValue);
      if (isObject(itemValue)) return cleanText(itemValue.text || itemValue.thinking || stringifyJson(itemValue));
      return cleanText(String(itemValue));
    });
    return cleanText(parts.join("\n")) || EMPTY_TOOL_RESULT_TEXT;
  }
  return cleanText(stringifyJson(normalized));
}

function inferBlockType(block: JsonObject): string {
  if (typeof block.type === "string" && block.type) return block.type;
  if ("text" in block) return "text";
  if ("thinking" in block) return "thinking";
  if ("tool_use_id" in block) return "tool_result";
  if ("name" in block && "input" in block) return "tool_use";
  return "unknown";
}

function flattenBlock(
  blockValue: unknown,
  messageRole: EntryRole,
  messageRawRole: string,
  messageIndex: number,
  toolNames: Map<string, string>
): EntryWithoutIndex | null {
  if (blockValue == null) return null;
  const block = typeof blockValue === "string" ? { type: "text", text: blockValue } : normalizeJsonish(blockValue);

  if (!isObject(block)) {
    return {
      role: messageRole,
      type: "unknown",
      text: stringifyJson(block),
      messageIndex,
      rawRole: messageRawRole,
    };
  }

  const blockType = inferBlockType(block);

  if (blockType === "text") {
    const text = cleanText(block.text || "");
    if (text === "") return null;
    const role = isSystemContextText(text) ? "system" : messageRole;
    return {
      role,
      type: "text",
      text: role === "system" ? cleanupSystemContextText(text) : text,
      messageIndex,
      rawRole: messageRawRole,
    };
  }

  if (blockType === "thinking") {
    let text = cleanText(block.thinking || block.text || "");
    if (text === "" && block.signature) text = "Thinking block present; thinking text is empty in this JSON capture.";
    if (text === "") return null;
    return {
      role: "assistant",
      type: "thinking",
      text,
      hasThinkingSignature: Boolean(block.signature),
      messageIndex,
      rawRole: messageRawRole,
    };
  }

  if (blockType === "tool_use") {
    const toolName = typeof block.name === "string" && block.name ? block.name : "unknown";
    const toolId = typeof block.id === "string" ? block.id : undefined;
    if (toolId) toolNames.set(toolId, toolName);
    const inputObject = block.input || {};
    return {
      role: "assistant",
      type: "tool_use",
      text: "",
      tool: toolName,
      toolInput: stringifyToolInput(inputObject),
      toolInputRaw: normalizeJsonish(inputObject),
      toolUseId: toolId,
      messageIndex,
      rawRole: messageRawRole,
    };
  }

  if (blockType === "tool_result") {
    const toolId = typeof block.tool_use_id === "string" ? block.tool_use_id : undefined;
    return {
      role: "tool",
      type: "tool_result",
      text: flattenToolResultContent(block.content),
      tool: toolId ? toolNames.get(toolId) ?? "unknown" : "unknown",
      isError: coerceBool(block.is_error, false),
      toolUseId: toolId,
      messageIndex,
      rawRole: messageRawRole,
    };
  }

  return {
    role: messageRole,
    type: "unknown",
    text: stringifyJson(block),
    messageIndex,
    rawRole: messageRawRole,
  };
}

export function parseTraceClient(data: unknown): ChatEntry[] {
  const messages = locateMessages(data);
  const entries: ChatEntry[] = [];
  const toolNames = new Map<string, string>();

  messages.forEach((message, messageIndex) => {
    const normalized = normalizeJsonish(message);
    if (!isObject(normalized)) {
      entries.push({
        index: entries.length,
        role: "system",
        type: "unknown",
        text: `<parse error: message at position ${messageIndex} is not an object>`,
        messageIndex,
        rawRole: "unknown",
      });
      return;
    }

    try {
      const { role, rawRole } = normalizeRole(normalized.role);
      normalizeContent(normalized.content).forEach((block) => {
        const entry = flattenBlock(block, role, rawRole, messageIndex, toolNames);
        if (entry) entries.push({ index: entries.length, ...entry });
      });
    } catch (exc) {
      entries.push({
        index: entries.length,
        role: "system",
        type: "unknown",
        text: `<parse error: ${exc instanceof Error ? exc.message : String(exc)}>`,
        messageIndex,
        rawRole: "unknown",
      });
    }
  });

  return entries;
}

export function isParsedEntryArray(data: unknown): data is ChatEntry[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as ChatEntry).index === "number" &&
        typeof (item as ChatEntry).type === "string" &&
        typeof (item as ChatEntry).role === "string"
    )
  );
}

function valueToAssistantEntry(value: unknown, messageIndex: number): ChatEntry | null {
  const normalized = normalizeJsonish(value);
  if (normalized == null || normalized === "") return null;

  let text = "";
  if (typeof normalized === "string") {
    text = normalized;
  } else if (isObject(normalized)) {
    const message = normalized.message;
    const choices = normalized.choices;
    const content = normalized.content ?? normalized.text ?? normalized.completion ?? normalized.result;
    if (isObject(message) && typeof message.content === "string") text = message.content;
    else if (typeof content === "string") text = content;
    else if (Array.isArray(choices) && isObject(choices[0])) {
      const first = choices[0];
      const firstMessage = first.message;
      if (isObject(firstMessage) && typeof firstMessage.content === "string") text = firstMessage.content;
      else if (typeof first.text === "string") text = first.text;
    }
    if (!text) text = stringifyJson(normalized);
  } else {
    text = String(normalized);
  }

  text = cleanText(text).trim();
  if (!text) return null;

  return {
    index: 0,
    role: "assistant",
    type: "text",
    text,
    messageIndex,
    rawRole: "assistant",
  };
}

function parseOptionalOutput(outputData: unknown | null): [ChatEntry[], string[]] {
  if (outputData == null || outputData === "") {
    return [[], ["Output JSON was empty or not provided; showing input transcript only."]];
  }

  const normalized = normalizeJsonish(outputData);
  if (isParsedEntryArray(normalized)) return [normalized, []];

  try {
    return [parseTraceClient(normalized), []];
  } catch {
    const fallback = valueToAssistantEntry(normalized, 999999);
    return fallback ? [[fallback], []] : [[], ["Output JSON did not contain a readable response."]];
  }
}

export function parseCaptureClient(inputData: unknown, outputData: unknown | null): ClientParseCaptureResult {
  const inputValue = normalizeJsonish(inputData);
  const entries = isParsedEntryArray(inputValue) ? reindexEntries(inputValue) : parseTraceClient(inputValue);
  const [outputEntries, outputWarnings] = parseOptionalOutput(outputData);
  const warnings = [...outputWarnings];

  if (outputEntries.length > 0) {
    const seen = new Set(entries.map(stableEntryKey));
    outputEntries.forEach((entry) => {
      const key = stableEntryKey(entry);
      if (!seen.has(key)) {
        entries.push(entry);
        seen.add(key);
      }
    });
  }

  return {
    entries: reindexEntries(entries),
    sourceKind: outputEntries.length > 0 ? "input+output" : "input-only",
    warnings,
  };
}
