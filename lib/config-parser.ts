import type { ParsedConfig, FormState, CcSwitchApp, KeyConfig, ExportType } from "@/types/index";
import { normalizeBaseUrl, cleanKey, isRecord, toMaskedKey } from "@/lib/utils";
import { parseCcSwitchSqlProviders } from "@/lib/cc-switch-sql";
// Exported helpers

export function makeDefaultName(index: number): string {
  return `配置${index}`;
}

export function isCcSwitchApp(value: string): value is CcSwitchApp {
  return ["claude", "codex", "gemini", "opencode", "openclaw"].includes(value);
}

export function collectGlobalMatches(text: string, regex: RegExp, group = 0): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(regex)) {
    const value = (match[group] || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }

  return out;
}

export function normalizeParsedFieldValue(input: string): string {
  return input
    .trim()
    .replace(/^[`'"]+/, "")
    .replace(/[`'"]+$/, "")
    .replace(/[;,]+$/, "")
    .trim();
}

export function normalizeParsedModelValue(input: string): string {
  return normalizeParsedFieldValue(input).replace(/\s+/g, "");
}
// Module-private structured-field definitions

type StructuredFieldRule = {
  field: keyof FormState;
  labelPattern: string;
  normalize: (value: string) => string;
};

const STRUCTURED_FIELD_RULES: StructuredFieldRule[] = [
  {
    field: "name",
    labelPattern: "(?:name|名称|配置名|别名|标签|title)",
    normalize: normalizeParsedFieldValue
  },
  {
    field: "baseUrl",
    labelPattern:
      "(?:base\\s*url|base_url|base-url|api\\s*base|api_base|api-base|api\\s*url|api_url|api-url|endpoint|url|地址|接口地址|请求地址|服务地址|域名|host)",
    normalize: (value) => normalizeBaseUrl(normalizeParsedFieldValue(value))
  },
  {
    field: "apiKey",
    labelPattern: "(?:api\\s*key|api_key|api-key|access[_-]?token|access\\s*token|token|key|密钥|令牌|凭证)",
    normalize: (value) => cleanKey(normalizeParsedFieldValue(value))
  },
  {
    field: "model",
    labelPattern: "(?:default\\s*model|default_model|default-model|model\\s*name|model_name|model-name|model|模型|默认模型)",
    normalize: normalizeParsedModelValue
  }
];

const STRUCTURED_FIELD_SEPARATOR_PATTERN = "(?::|：|=|＝|=>|->)";
const ANY_STRUCTURED_LABEL_PATTERN = STRUCTURED_FIELD_RULES.map((rule) => rule.labelPattern).join("|");
const DECORATIVE_LINE_RE = /^\s*(?:=+|-{3,}|_{3,}|~{3,})\s*$/;
const INDEX_ONLY_LINE_RE = /^\s*(?:\[\s*\d+\s*\]|\(\s*\d+\s*\)|（\s*\d+\s*）|#\s*\d+|(?:item|配置)\s*\d+|\d+[.)、])\s*$/i;
const INLINE_FIELD_BREAK_RE = new RegExp(
  `([^\\n])\\s+(?=(?:${ANY_STRUCTURED_LABEL_PATTERN})\\s*(?:${STRUCTURED_FIELD_SEPARATOR_PATTERN}))`,
  "gi"
);
// Module-private predicates & merge helpers

function hasAnyParsedField(item: Partial<ParsedConfig>): boolean {
  return Boolean(item.name || item.baseUrl || item.apiKey || item.model);
}

function hasCoreParsedField(item: Partial<ParsedConfig>): boolean {
  return Boolean(item.baseUrl || item.apiKey || item.model);
}

function mergeParsedConfig(base: Partial<ParsedConfig>, incoming: Partial<ParsedConfig>): Partial<ParsedConfig> {
  return {
    name: base.name || incoming.name,
    baseUrl: base.baseUrl || incoming.baseUrl,
    apiKey: base.apiKey || incoming.apiKey,
    model: base.model || incoming.model,
    sourceMeta: incoming.sourceMeta || base.sourceMeta
  };
}

function shouldStartNewParsedConfig(current: Partial<ParsedConfig>, incoming: Partial<ParsedConfig>): boolean {
  if (!hasAnyParsedField(current) || !hasAnyParsedField(incoming)) return false;
  if (incoming.name && current.name) return true;
  if (incoming.name && hasCoreParsedField(current)) return true;
  if (incoming.baseUrl && current.baseUrl) return true;
  if (incoming.apiKey && current.apiKey) return true;
  if (incoming.model && current.model && (current.baseUrl || current.apiKey)) return true;
  return false;
}
// Module-private structured-text pre-processing & parsing

function preprocessStructuredText(input: string): string {
  return input.replace(/\r\n?/g, "\n").replace(INLINE_FIELD_BREAK_RE, "$1\n");
}

function parseStructuredFieldLine(line: string): Partial<ParsedConfig> {
  const normalized = line
    .trim()
    .replace(/^[>|]+/, "")
    .replace(/^[\s\-*•]+/, "")
    .trim();

  if (!normalized || DECORATIVE_LINE_RE.test(normalized) || INDEX_ONLY_LINE_RE.test(normalized)) return {};

  for (const rule of STRUCTURED_FIELD_RULES) {
    const match = normalized.match(
      new RegExp(
        `^\\s*(?:\\[\\s*\\d+\\s*\\]|\\(\\s*\\d+\\s*\\)|（\\s*\\d+\\s*）|#\\s*\\d+\\s*|\\d+[.)、]\\s*)?${rule.labelPattern}\\s*(?:${STRUCTURED_FIELD_SEPARATOR_PATTERN})\\s*(.+?)\\s*$`,
        "i"
      )
    );
    if (!match?.[1]) continue;

    return {
      [rule.field]: rule.normalize(match[1])
    } as Partial<ParsedConfig>;
  }

  return {};
}

function parseStructuredSegment(input: string): Partial<ParsedConfig> {
  const text = preprocessStructuredText(input).trim();
  if (!text) return {};

  let out: Partial<ParsedConfig> = {};
  for (const line of text.split("\n")) {
    const parsedLine = parseStructuredFieldLine(line);
    if (!hasAnyParsedField(parsedLine)) continue;
    out = mergeParsedConfig(out, parsedLine);
  }

  return out;
}
// Module-private object parser

function parseObjectConfig(item: unknown): Partial<FormState> {
  if (!item || typeof item !== "object") return {};

  const obj = item as Record<string, unknown>;
  const rawBaseUrl =
    obj.baseUrl ?? obj.base_url ?? obj.url ?? obj.endpoint ?? obj.host ?? obj.apiBase ?? obj.api_base;
  const rawApiKey =
    obj.apiKey ??
    obj.api_key ??
    obj.key ??
    obj.token ??
    obj.access_token ??
    obj.authorization ??
    obj.auth;
  const rawModel = obj.model ?? obj.model_name ?? obj.modelName ?? obj.default_model ?? obj.defaultModel;

  return {
    name: "",
    baseUrl: rawBaseUrl ? normalizeBaseUrl(String(rawBaseUrl)) : "",
    apiKey: rawApiKey ? cleanKey(String(rawApiKey)) : "",
    model: rawModel ? normalizeParsedModelValue(String(rawModel)) : ""
  };
}
// Exported segment / cc-switch parsers

export function parseSingleSegment(input: string): Partial<ParsedConfig> {
  const text = input.trim();
  if (!text) return {};

  const out: Partial<ParsedConfig> = parseStructuredSegment(text);

  const keyPatterns = [
    /api[_-]?key["'\s:：=＝]+([A-Za-z0-9._-]{10,})/i,
    /bearer\s+([A-Za-z0-9._-]{10,})/i,
    /key["'\s:：=＝]+([A-Za-z0-9._-]{10,})/i
  ];
  for (const p of keyPatterns) {
    const m = text.match(p);
    if (m?.[1]) {
      out.apiKey = cleanKey(m[1]);
      break;
    }
  }
  if (!out.apiKey) {
    const fallback = text.match(/(?:sk|rk|ak|pk)[-_][A-Za-z0-9._-]{8,}/i);
    if (fallback?.[0]) out.apiKey = cleanKey(fallback[0]);
  }

  const urlMatch = text.match(/https?:\/\/[^\s"'`]+/i);
  if (urlMatch?.[0]) {
    out.baseUrl = normalizeBaseUrl(urlMatch[0]);
  } else {
    const hostLike = text.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s"'`]*)?/i);
    if (hostLike?.[0]) out.baseUrl = normalizeBaseUrl(hostLike[0]);
  }

  const modelMatch = text.match(
    /(?:^|\n|\r|[,{])\s*(?:model|model_name|modelName|default_model|defaultModel|模型)\s*["']?\s*[:：=＝]\s*["'`]?([^"'`\n\r,}]+)["'`]?/i
  );
  if (modelMatch?.[1]) out.model = normalizeParsedModelValue(modelMatch[1]);

  return out;
}

export function parseCcSwitchDeepLink(input: string): Partial<ParsedConfig> | null {
  const text = input.trim();
  if (!/^ccswitch:\/\/v1\/import\?/i.test(text)) return null;

  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "ccswitch:") return null;
    if (parsed.hostname !== "v1") return null;
    if (parsed.pathname !== "/import") return null;

    const resource = parsed.searchParams.get("resource");
    if (resource !== "provider") return null;

    const app = (parsed.searchParams.get("app") || "").trim().toLowerCase();
    const endpoint = (parsed.searchParams.get("endpoint") || "")
      .split(",")
      .map((value) => value.trim())
      .find(Boolean);

    return {
      name: (parsed.searchParams.get("name") || "").trim(),
      baseUrl: normalizeBaseUrl(endpoint || ""),
      apiKey: cleanKey(parsed.searchParams.get("apiKey") || ""),
      model: (parsed.searchParams.get("model") || "").trim(),
      sourceMeta: {
        kind: "cc-switch-deeplink",
        ccSwitchApp: isCcSwitchApp(app) ? app : undefined
      }
    };
  } catch {
    return null;
  }
}

export function parseCcSwitchProviderObject(item: unknown): Partial<ParsedConfig> {
  if (!isRecord(item)) return {};

  const resource = typeof item.resource === "string" ? item.resource.trim().toLowerCase() : "";
  const app = typeof item.app === "string" ? item.app.trim().toLowerCase() : "";
  const endpointValue = typeof item.endpoint === "string" ? item.endpoint : "";
  const endpoint = endpointValue
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);

  const looksLikeProvider =
    resource === "provider" ||
    Boolean(
      typeof item.name === "string" &&
        (typeof item.endpoint === "string" || typeof item.apiKey === "string" || typeof item.model === "string")
    );

  if (!looksLikeProvider) return {};

  return {
    name: typeof item.name === "string" ? item.name.trim() : "",
    baseUrl: normalizeBaseUrl(endpoint || ""),
    apiKey: cleanKey(typeof item.apiKey === "string" ? item.apiKey : ""),
    model: typeof item.model === "string" ? item.model.trim() : "",
    sourceMeta: {
      kind: "cc-switch-provider",
      ccSwitchApp: isCcSwitchApp(app) ? app : undefined
    }
  };
}

export function parseCcSwitchTextBlock(input: string): Partial<ParsedConfig> {
  const text = input.trim();
  if (!text) return {};

  const appMatch = text.match(/(?:^|\n)\s*app\s*[:：=＝]\s*([a-z-]+)/i);
  const nameMatch = text.match(/(?:^|\n)\s*name\s*[:：=＝]\s*(.+?)(?:\n|$)/i);
  const endpointMatch = text.match(/(?:^|\n)\s*endpoint\s*[:：=＝]\s*(.+?)(?:\n|$)/i);
  const keyMatch = text.match(/(?:^|\n)\s*apiKey\s*[:：=＝]\s*(.+?)(?:\n|$)/i);
  const modelMatch = text.match(/(?:^|\n)\s*(?:model|模型)\s*[:：=＝]\s*(.+?)(?:\n|$)/i);

  if (!appMatch && !endpointMatch && !keyMatch && !modelMatch) return {};

  const app = (appMatch?.[1] || "").trim().toLowerCase();
  const endpoint = (endpointMatch?.[1] || "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);

  return {
    name: (nameMatch?.[1] || "").trim(),
    baseUrl: normalizeBaseUrl(endpoint || ""),
    apiKey: cleanKey(keyMatch?.[1] || ""),
    model: normalizeParsedModelValue(modelMatch?.[1] || ""),
    sourceMeta: {
      kind: "cc-switch-provider",
      ccSwitchApp: isCcSwitchApp(app) ? app : undefined
    }
  };
}
// Exported finalization & config creation

export function finalizeParsed(items: Partial<ParsedConfig>[], startIndex: number): ParsedConfig[] {
  const cleaned = items
    .map((item) => ({
      name: (item.name || "").trim(),
      baseUrl: normalizeBaseUrl(item.baseUrl || ""),
      apiKey: cleanKey(item.apiKey || ""),
      model: (item.model || "").trim(),
      sourceMeta: item.sourceMeta
    }))
    .filter((item) => item.baseUrl || item.apiKey || item.model);

  const deduped: ParsedConfig[] = [];
  const seen = new Set<string>();

  for (const item of cleaned) {
    const key = `${item.baseUrl}__${item.apiKey}__${item.model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.map((item, index) => ({
    ...item,
    name: item.name || makeDefaultName(startIndex + index)
  }));
}

export function createKeyConfigsFromParsed(items: ParsedConfig[]): KeyConfig[] {
  return items.map((item) => ({
    id: crypto.randomUUID(),
    name: item.name,
    baseUrl: item.baseUrl,
    apiKey: item.apiKey,
    model: item.model,
    createdAt: new Date().toISOString(),
    sourceMeta: item.sourceMeta || { kind: "manual" }
  }));
}
// Exported top-level parser

export function parsePastedConfigs(input: string, startIndex: number): ParsedConfig[] {
  const text = input.trim();
  if (!text) return [];

  const deepLinks = collectGlobalMatches(text, /ccswitch:\/\/v1\/import\?[^\s"'`]+/gi)
    .map(parseCcSwitchDeepLink)
    .filter((item): item is Partial<ParsedConfig> => Boolean(item));
  const fromDeepLinks = finalizeParsed(deepLinks, startIndex);
  if (fromDeepLinks.length > 0) return fromDeepLinks;

  const fromCcSwitchSql = finalizeParsed(
    parseCcSwitchSqlProviders(text).map((item) => ({
      name: item.name,
      baseUrl: item.baseUrl,
      apiKey: item.apiKey,
      model: item.model,
      sourceMeta: {
        kind: "cc-switch-provider" as const,
        ccSwitchApp: item.appType
      }
    })),
    startIndex
  );
  if (fromCcSwitchSql.length > 0) return fromCcSwitchSql;

  try {
    const parsed = JSON.parse(text) as unknown;
    let source: unknown[] = [];

    if (Array.isArray(parsed)) {
      source = parsed;
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.configs)) source = obj.configs;
      else if (Array.isArray(obj.items)) source = obj.items;
      else source = [obj];
    }

    const fromCcSwitchJson = finalizeParsed(source.map(parseCcSwitchProviderObject), startIndex);
    if (fromCcSwitchJson.length > 0) return fromCcSwitchJson;

    const fromJson = finalizeParsed(source.map(parseObjectConfig), startIndex);
    if (fromJson.length > 0) return fromJson;
  } catch {
    // Ignore JSON parse errors and continue with text parsing.
  }

  const normalizedText = preprocessStructuredText(text);
  const structuredItems: Partial<ParsedConfig>[] = [];
  let current: Partial<ParsedConfig> = {};

  for (const rawLine of normalizedText.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      if (hasCoreParsedField(current)) {
        structuredItems.push(current);
        current = {};
      }
      continue;
    }

    if (DECORATIVE_LINE_RE.test(line)) continue;

    if (INDEX_ONLY_LINE_RE.test(line)) {
      if (hasAnyParsedField(current)) {
        structuredItems.push(current);
        current = {};
      }
      continue;
    }

    const parsedLine = parseSingleSegment(line);
    if (!hasAnyParsedField(parsedLine)) continue;

    if (shouldStartNewParsedConfig(current, parsedLine)) {
      structuredItems.push(current);
      current = {};
    }

    current = mergeParsedConfig(current, parsedLine);
  }

  if (hasAnyParsedField(current)) {
    structuredItems.push(current);
  }

  const fromStructuredText = finalizeParsed(structuredItems, startIndex);
  if (fromStructuredText.length > 0) return fromStructuredText;

  const blocks = normalizedText
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (blocks.length > 1) {
    const fromCcSwitchBlocks = finalizeParsed(blocks.map(parseCcSwitchTextBlock), startIndex);
    if (fromCcSwitchBlocks.length > 0) return fromCcSwitchBlocks;

    const fromBlocks = finalizeParsed(blocks.map(parseSingleSegment), startIndex);
    if (fromBlocks.length > 0) return fromBlocks;
  }

  const singleCcSwitchBlock = finalizeParsed([parseCcSwitchTextBlock(text)], startIndex);
  if (singleCcSwitchBlock.length > 0) return singleCcSwitchBlock;

  const globalUrls = collectGlobalMatches(text, /https?:\/\/[^\s"'`]+/gi).map(normalizeBaseUrl);
  const globalKeys = [
    ...collectGlobalMatches(text, /api[_-]?key["'\s:：=＝]+([A-Za-z0-9._-]{10,})/gi, 1),
    ...collectGlobalMatches(text, /bearer\s+([A-Za-z0-9._-]{10,})/gi, 1),
    ...collectGlobalMatches(text, /(?:sk|rk|ak|pk)[-_][A-Za-z0-9._-]{8,}/gi)
  ].map(cleanKey);
  const globalModels = [
    ...collectGlobalMatches(
      text,
      /(?:^|\n|\r|[,{])\s*(?:model|model_name|modelName|default_model|defaultModel|模型)\s*["']?\s*[:：=＝]\s*["'`]?([^"'`\n\r,}]+)["'`]?/gi,
      1
    )
  ].map(normalizeParsedModelValue);

  const paired: Partial<FormState>[] = [];
  const pairCount = Math.max(globalUrls.length, globalKeys.length, globalModels.length);
  for (let i = 0; i < pairCount; i += 1) {
    const baseUrl = globalUrls[i] || globalUrls[0] || "";
    const apiKey = globalKeys[i] || globalKeys[0] || "";
    const model = globalModels[i] || globalModels[0] || "";
    if (baseUrl || apiKey || model) paired.push({ baseUrl, apiKey, model });
  }

  const fromGlobal = finalizeParsed(paired, startIndex);
  if (fromGlobal.length > 0) return fromGlobal;

  const single = finalizeParsed([parseSingleSegment(text)], startIndex);
  return single;
}
// Exported formatters

export function formatConfig(item: KeyConfig, type: ExportType): string {
  if (type === "md") {
    return [
      `## ${item.name}`,
      "",
      `- 地址: ${item.baseUrl}`,
      `- Key: ${item.apiKey}`,
      `- 模型: ${item.model || "(未设置)"}`,
      `- 创建时间: ${item.createdAt}`,
      ""
    ].join("\n");
  }
  return [
    `名称: ${item.name}`,
    `地址: ${item.baseUrl}`,
    `Key: ${item.apiKey}`,
    `模型: ${item.model || "(未设置)"}`,
    `创建时间: ${item.createdAt}`,
    ""
  ].join("\n");
}

export function formatAll(configs: KeyConfig[], type: ExportType): string {
  if (configs.length === 0) return "";
  if (type === "md") {
    return [
      "# AI API Key 配置导出",
      "",
      ...configs.map((item) => formatConfig(item, type))
    ].join("\n");
  }
  return [
    "AI API Key 配置导出",
    "====================",
    "",
    ...configs.map((item, idx) => [`[${idx + 1}]`, formatConfig(item, type)].join("\n"))
  ].join("\n");
}

export function formatConfigMasked(item: KeyConfig, type: ExportType): string {
  if (type === "md") {
    return [
      `## ${item.name}`,
      "",
      `- 地址: ${item.baseUrl}`,
      `- Key: ${toMaskedKey(item.apiKey)}`,
      `- 模型: ${item.model || "(未设置)"}`,
      `- 创建时间: ${item.createdAt}`,
      ""
    ].join("\n");
  }
  return [
    `名称: ${item.name}`,
    `地址: ${item.baseUrl}`,
    `Key: ${toMaskedKey(item.apiKey)}`,
    `模型: ${item.model || "(未设置)"}`,
    `创建时间: ${item.createdAt}`,
    ""
  ].join("\n");
}

export function formatAllMasked(configs: KeyConfig[], type: ExportType): string {
  if (configs.length === 0) return "";
  if (type === "md") {
    return [
      "# AI API Key 配置导出",
      "",
      ...configs.map((item) => formatConfigMasked(item, type))
    ].join("\n");
  }
  return [
    "AI API Key 配置导出",
    "====================",
    "",
    ...configs.map((item, idx) => [`[${idx + 1}]`, formatConfigMasked(item, type)].join("\n"))
  ].join("\n");
}
