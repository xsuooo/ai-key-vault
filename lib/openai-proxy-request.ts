import type {
  OpenAIProxyBenchmarkRoundRequest,
  OpenAIProxyProbeRequest,
  OpenAIProxyTestRequest,
} from "./openai-proxy-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function finiteNumberField(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizeOpenAITestRequest(body: unknown): OpenAIProxyTestRequest {
  const source = isRecord(body) ? body : {};
  const maxTokens = finiteNumberField(source, "maxTokens");
  const temperature = finiteNumberField(source, "temperature");

  return {
    baseUrl: stringField(source, "baseUrl"),
    apiKey: stringField(source, "apiKey"),
    model: stringField(source, "model"),
    prompt: typeof source.prompt === "string" ? source.prompt : undefined,
    ...(typeof maxTokens === "number" && maxTokens > 0 ? { maxTokens } : {}),
    ...(typeof temperature === "number" ? { temperature } : {}),
  };
}

export function normalizeOpenAIProbeRequest(body: unknown): OpenAIProxyProbeRequest {
  const source = isRecord(body) ? body : {};

  return {
    baseUrl: stringField(source, "baseUrl"),
    apiKey: stringField(source, "apiKey"),
    currentModel: stringField(source, "currentModel"),
  };
}

export function normalizeOpenAIBenchmarkRoundRequest(body: unknown): OpenAIProxyBenchmarkRoundRequest {
  const source = isRecord(body) ? body : {};
  const prompt = typeof source.prompt === "string" && source.prompt.trim() ? source.prompt.trim() : undefined;

  return {
    baseUrl: stringField(source, "baseUrl"),
    apiKey: stringField(source, "apiKey"),
    model: stringField(source, "model"),
    ...(prompt ? { prompt } : {}),
  };
}
