import type { ChatEntry } from "./types";
import { ClientParseError, parseCaptureClient, parseTraceClient } from "./clientParser";

const LOCAL_API_BASE = "http://localhost:8000";

function resolveApiBase(): string {
  const configuredApiBase = import.meta.env.VITE_API_URL?.trim();
  if (configuredApiBase) return configuredApiBase.replace(/\/$/, "");

  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" ? LOCAL_API_BASE : "";
}

const API_BASE = resolveApiBase();

export class ApiError extends Error {}

export function hasBackendApi(): boolean {
  return API_BASE !== "";
}

export interface ParseResult {
  entries: ChatEntry[];
  usedBackend: boolean;
  sourceKind: "sample" | "parsed" | "raw" | "input-only" | "input+output";
  warnings: string[];
}

export async function checkHealth(): Promise<boolean> {
  if (!API_BASE) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function parseRaw(rawData: unknown): Promise<ChatEntry[]> {
  if (!API_BASE) throw new ApiError("Parser backend is not configured.");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rawData),
    });
  } catch {
    throw new ApiError("Could not reach the parser backend. Is it running?");
  }

  if (!res.ok) {
    let detail = `Backend returned ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore body parse failure, keep generic detail
    }
    throw new ApiError(detail);
  }

  return res.json();
}

function toApiError(exc: unknown, fallback: string): ApiError {
  if (exc instanceof ApiError) return exc;
  if (exc instanceof ClientParseError) return new ApiError(exc.message);
  return new ApiError(exc instanceof Error ? exc.message : fallback);
}

function parseRawInBrowser(rawData: unknown): ChatEntry[] {
  try {
    return parseTraceClient(rawData);
  } catch (exc) {
    throw toApiError(exc, "Could not parse JSON in the browser.");
  }
}

async function parseRawWithFallback(rawData: unknown, sourceKind: ParseResult["sourceKind"]): Promise<ParseResult> {
  try {
    const entries = await parseRaw(rawData);
    return { entries, usedBackend: true, sourceKind, warnings: [] };
  } catch {
    return { entries: parseRawInBrowser(rawData), usedBackend: false, sourceKind, warnings: [] };
  }
}

async function parseCapture(inputData: unknown, outputData: unknown | null): Promise<ParseResult> {
  if (!API_BASE) {
    const result = parseCaptureClient(inputData, outputData);
    return { ...result, usedBackend: false };
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/parse-capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: inputData, output: outputData }),
    });
  } catch {
    try {
      const result = parseCaptureClient(inputData, outputData);
      return { ...result, usedBackend: false };
    } catch (exc) {
      throw toApiError(exc, "Could not parse JSON in the browser.");
    }
  }

  if (!res.ok) {
    let detail = `Backend returned ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore body parse failure, keep generic detail
    }
    throw new ApiError(detail);
  }

  const body = await res.json();
  return {
    entries: body.entries ?? [],
    usedBackend: true,
    sourceKind: body.sourceKind ?? "input-only",
    warnings: body.warnings ?? [],
  };
}

function isParsedEntryArray(data: unknown): data is ChatEntry[] {
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

function readJsonText(text: string, label: string, allowEmpty = false): unknown | null {
  if (text.trim() === "") {
    if (allowEmpty) return null;
    throw new ApiError(`${label} is empty.`);
  }

  try {
    return JSON.parse(text);
  } catch (exc) {
    throw new ApiError(`${label} isn't valid JSON: ${(exc as Error).message}`);
  }
}

async function readJsonFile(file: File, allowEmpty = false): Promise<unknown | null> {
  return readJsonText(await file.text(), file.name, allowEmpty);
}

export async function parseUploadedFiles(files: File[]): Promise<ParseResult> {
  if (files.length === 0) throw new ApiError("Choose at least one JSON file.");

  if (files.length === 1) {
    const data = await readJsonFile(files[0]);

    if (isParsedEntryArray(data)) {
      return { entries: data, usedBackend: false, sourceKind: "parsed", warnings: [] };
    }

    return parseRawWithFallback(data, "raw");
  }

  const inputFile = files.find((file) => /input/i.test(file.name)) ?? files.find((file) => !/output/i.test(file.name));
  const outputFile = files.find((file) => /output/i.test(file.name));

  if (!inputFile) {
    throw new ApiError("Upload an input JSON file. Output JSON is optional and cannot be used by itself.");
  }

  const inputData = await readJsonFile(inputFile);
  const outputData = outputFile ? await readJsonFile(outputFile, true) : null;

  if (isParsedEntryArray(inputData)) {
    return { entries: inputData, usedBackend: false, sourceKind: "parsed", warnings: [] };
  }

  return parseCapture(inputData, outputData);
}

export async function parseUploadedFile(file: File): Promise<ParseResult> {
  return parseUploadedFiles([file]);
}

export async function parsePastedCapture(inputText: string, outputText: string): Promise<ParseResult> {
  const inputData = readJsonText(inputText, "Input JSON");
  const outputData = readJsonText(outputText, "Output JSON", true);

  if (isParsedEntryArray(inputData)) {
    return { entries: inputData, usedBackend: false, sourceKind: "parsed", warnings: [] };
  }

  return parseCapture(inputData, outputData);
}

