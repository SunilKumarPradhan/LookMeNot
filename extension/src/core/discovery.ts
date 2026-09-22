import {
  ClientParseError,
  cleanText,
  isParsedEntryArray,
  normalizeJsonish,
  parseCaptureClient,
  parseTraceClient,
  reindexEntries,
  stableEntryKey,
  stringifyJson,
} from "./clientParser";
import type { ChatEntry, RawTraceCapture, TraceCandidate } from "./types";

type JsonObject = Record<string, unknown>;

const MAX_WALK_DEPTH = 8;
const MAX_CANDIDATES = 24;
const MAX_TEXT_PREVIEW = 16000;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function valueText(value: unknown): string {
  const normalized = normalizeJsonish(value);
  if (normalized == null) return "";
  if (typeof normalized === "string") return cleanText(normalized);
  if (typeof normalized === "number" || typeof normalized === "boolean") return String(normalized);

  if (Array.isArray(normalized)) {
    const parts = normalized
      .map((item) => {
        const itemValue = normalizeJsonish(item);
        if (typeof itemValue === "string") return itemValue;
        if (isObject(itemValue)) return itemValue.text || itemValue.content || itemValue.message || stringifyJson(itemValue);
        return String(itemValue ?? "");
      })
      .filter(Boolean);
    return cleanText(parts.join("\n"));
  }

  if (isObject(normalized)) {
    const message = normalized.message;
    const choice = Array.isArray(normalized.choices) ? normalized.choices[0] : null;
    const candidates = [
      normalized.text,
      normalized.content,
      normalized.result,
      normalized.output,
      normalized.completion,
      isObject(message) ? message.content : undefined,
      isObject(choice) && isObject(choice.message) ? choice.message.content : undefined,
      isObject(choice) ? choice.text : undefined,
    ];
    const found = candidates.find((candidate) => typeof candidate === "string" && candidate.trim());
    if (typeof found === "string") return cleanText(found);
    return cleanText(stringifyJson(normalized));
  }

  return cleanText(String(normalized));
}

function isMeaningfulEntry(entry: ChatEntry): boolean {
  if (entry.type === "tool_use" || entry.type === "tool_result" || entry.type === "thinking") return true;
  if (entry.type === "text" && entry.text.trim()) return true;
  return false;
}

function isMeaningfulEntries(entries: ChatEntry[]): boolean {
  if (!entries.length) return false;
  const meaningful = entries.filter(isMeaningfulEntry).length;
  const parseErrors = entries.filter((entry) => entry.text.startsWith("<parse error")).length;
  return meaningful > 0 && parseErrors < entries.length;
}

function scoreEntries(entries: ChatEntry[]): number {
  return entries.reduce((score, entry) => {
    if (entry.type === "tool_use" || entry.type === "tool_result") return score + 6;
    if (entry.type === "thinking") return score + 4;
    if (entry.type === "text") return score + 2;
    return score + 1;
  }, 0);
}

function sourceLabelFromUrl(url?: string): string {
  if (!url) return "page data";
  try {
    const parsed = new URL(url, window.location.href);
    const pieces = parsed.pathname.split("/").filter(Boolean);
    return pieces.slice(-3).join(" / ") || parsed.hostname;
  } catch {
    return url.slice(0, 80);
  }
}

function candidateTitle(value: unknown, fallback: string): string {
  const normalized = normalizeJsonish(value);
  if (isObject(normalized)) {
    const direct = normalized.name || normalized.title || normalized.traceName || normalized.sessionId || normalized.traceId || normalized.id;
    if (typeof direct === "string" && direct.trim()) return direct.trim().slice(0, 80);
  }
  return fallback;
}

function makeCandidate(
  entries: ChatEntry[],
  capture: RawTraceCapture,
  title: string,
  subtitle: string,
  warnings: string[] = []
): TraceCandidate | null {
  const cleanEntries = reindexEntries(entries).filter(isMeaningfulEntry);
  if (!isMeaningfulEntries(cleanEntries)) return null;

  const signature = cleanEntries.map(stableEntryKey).join("|");
  const id = hashString(`${capture.source}|${title}|${signature}`);

  return {
    id,
    title,
    subtitle,
    source: capture.source,
    sourceUrl: capture.sourceUrl,
    sourceKind: capture.sourceKind,
    capturedAt: capture.capturedAt ?? Date.now(),
    entries: cleanEntries,
    warnings,
    score: scoreEntries(cleanEntries),
    signature,
  };
}

function tryTraceCandidate(value: unknown, capture: RawTraceCapture, path: string): TraceCandidate | null {
  const normalized = normalizeJsonish(value);

  if (isParsedEntryArray(normalized)) {
    return makeCandidate(
      normalized,
      capture,
      candidateTitle(normalized, "Parsed trace"),
      `${capture.source} - ${path || "entries"}`
    );
  }

  try {
    const entries = parseTraceClient(normalized);
    return makeCandidate(
      entries,
      capture,
      candidateTitle(normalized, "Trace conversation"),
      `${capture.source} - ${path || sourceLabelFromUrl(capture.sourceUrl)}`
    );
  } catch (exc) {
    if (exc instanceof ClientParseError) return null;
    return null;
  }
}

function tryCaptureCandidate(value: unknown, capture: RawTraceCapture, path: string): TraceCandidate | null {
  const normalized = normalizeJsonish(value);
  if (!isObject(normalized) || !("input" in normalized)) return null;

  try {
    const output = "output" in normalized ? normalized.output : null;
    const result = parseCaptureClient(normalized.input, output);
    return makeCandidate(
      result.entries,
      capture,
      candidateTitle(normalized, "Input / output trace"),
      `${capture.source} - ${path || "input/output"}`,
      result.warnings
    );
  } catch {
    return null;
  }
}

function observationTime(value: JsonObject): number {
  const raw = value.startTime || value.createdAt || value.updatedAt || value.endTime || value.timestamp;
  if (typeof raw !== "string") return 0;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function observationName(value: JsonObject, index: number): string {
  const rawName = value.name || value.displayName || value.type || value.observationType;
  return typeof rawName === "string" && rawName.trim() ? rawName.trim() : `Observation ${index + 1}`;
}

function isObservationLike(value: unknown): value is JsonObject {
  if (!isObject(value)) return false;
  return "input" in value || "output" in value || "metadata" in value || "level" in value || "observationType" in value;
}

function appendUnique(target: ChatEntry[], entries: ChatEntry[]) {
  const seen = new Set(target.map(stableEntryKey));
  entries.forEach((entry) => {
    const key = stableEntryKey(entry);
    if (!seen.has(key)) {
      target.push(entry);
      seen.add(key);
    }
  });
}

function tryParseEntries(value: unknown): ChatEntry[] {
  const normalized = normalizeJsonish(value);
  if (isParsedEntryArray(normalized)) return reindexEntries(normalized);
  try {
    const entries = parseTraceClient(normalized);
    return isMeaningfulEntries(entries) ? entries : [];
  } catch {
    return [];
  }
}

function entriesFromObservation(value: JsonObject, index: number): ChatEntry[] {
  const name = observationName(value, index);
  const typeLabel = typeof value.type === "string" ? value.type : typeof value.observationType === "string" ? value.observationType : "observation";
  const isError =
    String(value.level || value.status || value.statusCode || "")
      .toLowerCase()
      .includes("error") || Boolean(value.error);
  const toolUseId = typeof value.id === "string" && value.id ? value.id : `lookmenot-obs-${index}`;
  const entries: ChatEntry[] = [];

  const parsedInput = "input" in value ? tryParseEntries(value.input) : [];
  if (parsedInput.length) {
    appendUnique(entries, parsedInput);
  } else if ("input" in value) {
    const inputText = valueText(value.input).trim();
    if (inputText) {
      entries.push({
        index: entries.length,
        role: "assistant",
        type: "tool_use",
        text: "",
        tool: name,
        toolInput: inputText.length > MAX_TEXT_PREVIEW ? `${inputText.slice(0, MAX_TEXT_PREVIEW)}...` : inputText,
        toolInputRaw: normalizeJsonish(value.input),
        toolUseId,
        messageIndex: index,
        rawRole: typeLabel,
      });
    }
  }

  const parsedOutput = "output" in value ? tryParseEntries(value.output) : [];
  if (parsedOutput.length) {
    appendUnique(entries, parsedOutput);
  } else if ("output" in value) {
    const outputText = valueText(value.output).trim();
    if (outputText) {
      entries.push({
        index: entries.length,
        role: "tool",
        type: "tool_result",
        text: outputText.length > MAX_TEXT_PREVIEW ? `${outputText.slice(0, MAX_TEXT_PREVIEW)}...` : outputText,
        tool: name,
        isError,
        toolUseId,
        messageIndex: index,
        rawRole: typeLabel,
      });
    }
  }

  if (!entries.length && typeof value.statusMessage === "string" && value.statusMessage.trim()) {
    entries.push({
      index: 0,
      role: isError ? "tool" : "system",
      type: isError ? "tool_result" : "text",
      text: cleanText(value.statusMessage),
      tool: name,
      isError,
      toolUseId,
      messageIndex: index,
      rawRole: typeLabel,
    });
  }

  return reindexEntries(entries);
}

function findObservationArrays(value: unknown): JsonObject[][] {
  const normalized = normalizeJsonish(value);
  const arrays: JsonObject[][] = [];

  function visit(node: unknown, depth: number) {
    if (depth > MAX_WALK_DEPTH) return;
    const current = normalizeJsonish(node);

    if (Array.isArray(current)) {
      const observations = current.filter(isObservationLike);
      if (observations.length >= 2) arrays.push(observations);
      current.slice(0, 80).forEach((item) => visit(item, depth + 1));
      return;
    }

    if (!isObject(current)) return;
    const keys = ["observations", "generations", "spans", "events", "items", "rows", "data"];
    keys.forEach((key) => {
      if (Array.isArray(current[key])) visit(current[key], depth + 1);
    });
  }

  visit(normalized, 0);
  return arrays;
}

function tryObservationCandidate(values: JsonObject[], capture: RawTraceCapture, path: string): TraceCandidate | null {
  const sorted = [...values].sort((a, b) => observationTime(a) - observationTime(b));
  const entries: ChatEntry[] = [];
  sorted.slice(0, 120).forEach((item, index) => appendUnique(entries, entriesFromObservation(item, index)));

  return makeCandidate(
    entries,
    capture,
    "Langfuse observations",
    `${capture.source} - ${path || "observations"}`,
    sorted.length > 120 ? [`Showing first 120 of ${sorted.length} captured observations.`] : []
  );
}

function collectPageJson(): RawTraceCapture[] {
  const captures: RawTraceCapture[] = [];
  const scripts = Array.from(document.scripts);

  scripts.forEach((script, index) => {
    const text = script.textContent?.trim();
    if (!text || text.length > 6000000) return;
    if (script.id !== "__NEXT_DATA__" && script.type && !/json|ld\+json/i.test(script.type)) return;
    const normalized = normalizeJsonish(text);
    if (normalized === text) return;
    captures.push({
      data: normalized,
      source: script.id ? `script#${script.id}` : `script[${index}]`,
      sourceUrl: window.location.href,
      sourceKind: "page",
      capturedAt: Date.now(),
    });
  });

  const codeBlocks = Array.from(document.querySelectorAll("pre, code, textarea")).slice(0, 40);
  codeBlocks.forEach((node, index) => {
    const text = node.textContent?.trim();
    if (!text || text.length > 2000000) return;
    if (!/(messages|tool_use|tool_result|input|output|observations)/i.test(text)) return;
    const normalized = normalizeJsonish(text);
    if (normalized === text) return;
    captures.push({
      data: normalized,
      source: `${node.nodeName.toLowerCase()}[${index}]`,
      sourceUrl: window.location.href,
      sourceKind: "page",
      capturedAt: Date.now(),
    });
  });

  return captures;
}

export function discoverCandidates(capture: RawTraceCapture): TraceCandidate[] {
  const normalized = normalizeJsonish(capture.data);
  const candidates: TraceCandidate[] = [];
  const seenValues = new WeakSet<object>();

  function add(candidate: TraceCandidate | null) {
    if (!candidate) return;
    if (candidates.some((existing) => existing.signature === candidate.signature)) return;
    candidates.push(candidate);
  }

  function visit(value: unknown, path: string, depth: number) {
    if (candidates.length >= MAX_CANDIDATES || depth > MAX_WALK_DEPTH) return;
    const node = normalizeJsonish(value);

    if (isObject(node) || Array.isArray(node)) {
      if (seenValues.has(node)) return;
      seenValues.add(node);
    }

    add(tryCaptureCandidate(node, capture, path));
    add(tryTraceCandidate(node, capture, path));

    findObservationArrays(node).forEach((items, index) => add(tryObservationCandidate(items, capture, `${path || "root"} observations ${index + 1}`)));

    if (Array.isArray(node)) {
      node.slice(0, 80).forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1));
      return;
    }

    if (!isObject(node)) return;

    const priorityKeys = [
      "trace",
      "traces",
      "data",
      "json",
      "result",
      "input",
      "output",
      "messages",
      "observations",
      "generations",
      "spans",
      "items",
      "rows",
      "props",
      "pageProps",
    ];

    priorityKeys.forEach((key) => {
      if (key in node) visit(node[key], path ? `${path}.${key}` : key, depth + 1);
    });

    Object.keys(node)
      .filter((key) => !priorityKeys.includes(key))
      .slice(0, 60)
      .forEach((key) => visit(node[key], path ? `${path}.${key}` : key, depth + 1));
  }

  visit(normalized, "", 0);
  return candidates.sort((a, b) => b.score - a.score || b.capturedAt - a.capturedAt);
}

export function discoverPageCandidates(): TraceCandidate[] {
  return collectPageJson().flatMap(discoverCandidates);
}

export function mergeCandidates(existing: TraceCandidate[], incoming: TraceCandidate[]): TraceCandidate[] {
  const bySignature = new Map<string, TraceCandidate>();
  [...existing, ...incoming].forEach((candidate) => {
    const current = bySignature.get(candidate.signature);
    if (!current || candidate.score > current.score || candidate.capturedAt > current.capturedAt) {
      bySignature.set(candidate.signature, candidate);
    }
  });

  return Array.from(bySignature.values())
    .sort((a, b) => b.score - a.score || b.capturedAt - a.capturedAt)
    .slice(0, MAX_CANDIDATES);
}

export function detectLangfusePage(): boolean {
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  if (host.includes("langfuse")) return true;
  return /\/(project|projects|trace|traces|sessions|observations)\b/.test(path) && /langfuse/i.test(document.title);
}

export function parseManualJson(inputText: string, outputText = ""): TraceCandidate {
  if (!inputText.trim()) throw new Error("Input JSON is empty.");
  let inputData: unknown;
  let outputData: unknown | null = null;

  try {
    inputData = JSON.parse(inputText);
  } catch (exc) {
    throw new Error(`Input JSON is invalid: ${exc instanceof Error ? exc.message : String(exc)}`);
  }

  if (outputText.trim()) {
    try {
      outputData = JSON.parse(outputText);
    } catch (exc) {
      throw new Error(`Output JSON is invalid: ${exc instanceof Error ? exc.message : String(exc)}`);
    }
  }

  const candidates = discoverCandidates({
    data: outputData == null ? inputData : { input: inputData, output: outputData },
    source: "manual import",
    sourceKind: "manual",
    sourceUrl: window.location.href,
    capturedAt: Date.now(),
  });

  if (!candidates.length) throw new Error("No conversation-like trace data was found in that JSON.");
  return candidates[0];
}
