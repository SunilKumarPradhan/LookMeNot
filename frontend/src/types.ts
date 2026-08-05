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
  messageIndex: number;
  rawRole: string;
}
