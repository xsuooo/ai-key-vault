import type { CcSwitchApp, ProbeResult, TestResult } from "@/types/index";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function cleanOneLineText(input: string, maxLen = 220): string {
  const singleLine = input.replace(/\s+/g, " ").trim();
  if (!singleLine) return "";
  if (singleLine.length <= maxLen) return singleLine;
  return `${singleLine.slice(0, maxLen)}...`;
}

export function cleanMultilineText(input: string, maxLen = 2000): string {
  const normalized = input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!normalized) return "";
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen).trimEnd()}...`;
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

export function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function normalizeBaseUrl(raw: string): string {
  const cleaned = raw.trim().replace(/\/+$/, "");
  if (!cleaned) return "";
  if (!/^https?:\/\//i.test(cleaned)) return `https://${cleaned}`;
  return cleaned;
}

export function toOpenAIBaseUrl(raw: string): string {
  const normalized = normalizeBaseUrl(raw);
  if (!normalized) return "";
  const withoutEndpoint = normalized
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/responses$/i, "")
    .replace(/\/response$/i, "")
    .replace(/\/completions$/i, "");
  if (/\/v\d+$/i.test(withoutEndpoint)) return withoutEndpoint;
  return `${withoutEndpoint}/v1`;
}

export function cleanKey(raw: string): string {
  return raw.replace(/^Bearer\s+/i, "").trim();
}

export function toMaskedKey(key: string): string {
  if (key.length <= 10) return "******";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export function getErrorMessage(error: unknown): string {
  if (!isRecord(error)) return "";
  const directError = error.error;
  if (typeof directError === "string" && directError.trim()) return cleanOneLineText(directError, 260);
  const directMessage = error.message;
  if (typeof directMessage === "string" && directMessage.trim()) return cleanOneLineText(directMessage, 260);
  const nestedPaths = [
    ["error", "message"],
    ["response", "error", "message"],
    ["response", "data", "error", "message"],
    ["response", "body", "error", "message"],
    ["data", "error", "message"],
    ["body", "error", "message"],
    ["cause", "message"],
  ];
  for (const path of nestedPaths) {
    let current: unknown = error;
    for (const key of path) {
      if (!isRecord(current)) { current = ""; break; }
      current = current[key];
    }
    if (typeof current === "string" && current.trim()) return cleanOneLineText(current, 260);
  }
  return "";
}

export function makeErrorDetail(error: unknown): string {
  const baseError = isRecord(error) ? error : {};
  const status = typeof baseError.status === "number" ? baseError.status : undefined;
  const name = typeof baseError.name === "string" ? baseError.name : "";
  const raw = getErrorMessage(error);
  let detail = "测试异常，请检查地址或模型";
  if (status === 401 || status === 403) detail = "Key 无效或权限不足";
  else if (status === 404) detail = "地址可达，但聊天接口不存在";
  else if (typeof status === "number") detail = `请求失败（HTTP ${status}）`;
  else if (name === "AbortError" || /timeout|timed out/i.test(raw)) detail = "请求超时，请检查地址";
  else if (/network|fetch failed|connection|ENOTFOUND|ECONNREFUSED/i.test(raw)) detail = "请求失败，请检查网络或地址";
  if (!raw) return detail;
  if (detail.includes(raw)) return detail;
  return `${detail}；接口返回：${raw}`;
}

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

export async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const response = await fetchWithTimeout(url, init, timeoutMs);
  let payload: unknown = null;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) { throw { status: response.status, message: getErrorMessage(payload) || `HTTP ${response.status}` }; }
  return payload;
}

export async function postJsonWithTimeout<TResponse>(url: string, body: unknown, timeoutMs: number): Promise<TResponse> {
  return (await fetchJsonWithTimeout(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, timeoutMs)) as TResponse;
}

export function safeDateToIso(input: unknown): string {
  if (typeof input !== "string") return "";
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function sanitizeFilename(input: string): string {
  return input.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function averageOf(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, item) => sum + item, 0) / values.length);
}

export function computeStability(values: number[]): number {
  if (values.length <= 1) return 0;
  return Math.max(...values) - Math.min(...values);
}

export function formatDurationLabel(ms?: number): string {
  if (!ms || !Number.isFinite(ms)) return "-";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatSuccessRateLabel(rate?: number): string {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return "-";
  return `${Math.round(rate * 100)}%`;
}

export function inferCcSwitchHomepage(endpoint: string): string {
  try {
    const parsed = new URL(endpoint);
    const host = parsed.hostname;
    if (host.startsWith("api.")) return `${parsed.protocol}//${host.slice(4)}`;
    if (host.startsWith("api-")) return `${parsed.protocol}//${host.replace(/^api-/, "")}`;
    return parsed.origin;
  } catch { return ""; }
}

export function buildCcSwitchDeepLink(item: { name: string; baseUrl: string; apiKey: string; model: string; sourceMeta?: { ccSwitchApp?: CcSwitchApp } }, app: CcSwitchApp): string {
  const params = new URLSearchParams();
  params.set("resource", "provider");
  params.set("app", app);
  params.set("name", item.name || "AI Key Vault");
  if (item.baseUrl) params.set("endpoint", normalizeBaseUrl(item.baseUrl));
  if (item.apiKey) params.set("apiKey", cleanKey(item.apiKey));
  if (item.model) params.set("model", item.model.trim());
  const homepage = inferCcSwitchHomepage(item.baseUrl);
  if (homepage) params.set("homepage", homepage);
  params.set("enabled", "false");
  return `ccswitch://v1/import?${params.toString()}`;
}

export function toDateTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", { hour12: false }).format(date);
}

export function defaultTestResult(): TestResult {
  return { status: "idle", message: "未测试" };
}

export function defaultProbeResult(): ProbeResult {
  return { status: "idle", supportedModels: [] };
}

export const PASS_TEXT = "主人，快鞭策我吧";
export const FAIL_TEXT = "主人，我不行了";
