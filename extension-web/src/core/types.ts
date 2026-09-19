export type EntryRole = "user" | "assistant" | "tool" | "system";
export type EntryType = "text" | "thinking" | "tool_use" | "tool_result" | "unknown";

export interface ChatEntry {
  index: number;
  role: EntryRole;
  type: EntryType;
  text: string;
  tool?: string;
  toolInput?: string;
  toolInputRaw?: unknown;
  toolUseId?: string;
  isError?: boolean;
  hasThinkingSignature?: boolean;
  messageIndex: number;
  rawRole: string;
}

export interface TraceCandidate {
  id: string;
  title: string;
  subtitle: string;
  source: string;
  sourceUrl?: string;
  sourceKind: "page" | "network" | "manual";
  capturedAt: number;
  entries: ChatEntry[];
  warnings: string[];
  score: number;
  signature: string;
}

export interface RawTraceCapture {
  data: unknown;
  source: string;
  sourceUrl?: string;
  sourceKind: "page" | "network" | "manual";
  capturedAt?: number;
}
