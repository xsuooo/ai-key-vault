"use client";

import type {
  KeyConfig,
  ProbeResult,
  TestResult,
  FinishedTestResult,
  FinishedProbeResult,
  FinishedModelBenchmarkResult
} from "@/types/index";

import {
  normalizeBaseUrl,
  cleanKey,
  cleanOneLineText,
  cleanMultilineText,
  safeDateToIso,
  firstNonEmptyString,
  isRecord,
  PASS_TEXT,
  FAIL_TEXT
} from "@/lib/utils";

import {
  normalizeStoredBenchmarks,
  normalizeFinishedBenchmarkResult
} from "@/lib/benchmark-utils";

import { isCcSwitchApp, makeDefaultName } from "@/lib/config-parser";

export function normalizeFinishedTestResult(input: unknown): FinishedTestResult | undefined {
  if (!isRecord(input)) return undefined;

  const status = input.status;
  if (status !== "success" && status !== "error") return undefined;

  const message = typeof input.message === "string" && input.message.trim() ? input.message.trim() : "";
  const rawDetail = typeof input.detail === "string" && input.detail.trim() ? input.detail.trim() : "";
  const legacyResponseText = rawDetail.startsWith("接口返回：") ? rawDetail.slice("接口返回：".length).trim() : "";
  const responseTextSource =
    typeof input.responseText === "string" && input.responseText.trim() ? input.responseText : legacyResponseText;
  const responseText = responseTextSource ? cleanMultilineText(responseTextSource, 2000) : "";
  const responseSource =
    input.responseSource === "stream" || input.responseSource === "chat" || input.responseSource === "responses"
      ? input.responseSource
      : undefined;
  const detail = rawDetail && !legacyResponseText
    ? cleanOneLineText(rawDetail, 300)
    : responseText
      ? "接口连通，已收到模型回复"
      : "";
  const testedAt = safeDateToIso(input.testedAt) || new Date().toISOString();

  return {
    status,
    message: message || (status === "success" ? PASS_TEXT : FAIL_TEXT),
    detail: detail || undefined,
    responseText: responseText || undefined,
    responseSource,
    testedAt
  };
}

export function normalizeFinishedProbeResult(input: unknown): FinishedProbeResult | undefined {
  if (!isRecord(input)) return undefined;

  const status = input.status;
  if (status !== "success" && status !== "error") return undefined;

  const supportedModels = Array.isArray(input.supportedModels)
    ? input.supportedModels.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const recommendedModel = typeof input.recommendedModel === "string" ? input.recommendedModel.trim() : "";
  const detail = typeof input.detail === "string" && input.detail.trim()
    ? cleanOneLineText(input.detail, 300)
    : "";
  const testedAt = safeDateToIso(input.testedAt) || new Date().toISOString();

  return {
    status,
    supportedModels,
    recommendedModel: recommendedModel || undefined,
    detail: detail || undefined,
    testedAt
  };
}

function normalizeSourceMeta(input: unknown): KeyConfig["sourceMeta"] | undefined {
  if (!isRecord(input)) return undefined;

  const kind = typeof input.kind === "string" ? input.kind.trim() : "";
  if (kind !== "manual" && kind !== "cc-switch-provider" && kind !== "cc-switch-deeplink") return undefined;

  const ccSwitchAppRaw = typeof input.ccSwitchApp === "string" ? input.ccSwitchApp.trim().toLowerCase() : "";
  return {
    kind,
    ccSwitchApp: isCcSwitchApp(ccSwitchAppRaw) ? ccSwitchAppRaw : undefined
  };
}

function normalizeStoredConfigItem(input: unknown, index: number): KeyConfig | undefined {
  if (!isRecord(input)) return undefined;

  const id = typeof input.id === "string" && input.id ? input.id : crypto.randomUUID();
  const rawName = firstNonEmptyString(input.name, input.title, input.label);
  const baseUrl = normalizeBaseUrl(
    firstNonEmptyString(input.baseUrl, input.baseURL, input.url, input.endpoint, input.apiBaseUrl, input.api_url)
  );
  const apiKey = cleanKey(firstNonEmptyString(input.apiKey, input.api_key, input.key, input.token));
  const model = firstNonEmptyString(input.model, input.modelName, input.defaultModel, input.default_model);
  const createdAt = safeDateToIso(input.createdAt) || safeDateToIso(input.updatedAt) || new Date().toISOString();
  const sourceMeta = normalizeSourceMeta(input.sourceMeta);
  const probe = normalizeFinishedProbeResult(input.probe || input.probeResult || input.modelProbe);
  const lastTest = normalizeFinishedTestResult(input.lastTest || input.lastResult || input.testResult);
  const benchmarks = normalizeStoredBenchmarks(input.benchmarks || input.modelBenchmarks || input.benchmarkResults);
  const rawTestHistory = input.testHistory;
  const testHistory = Array.isArray(rawTestHistory)
    ? rawTestHistory.map((item) => normalizeFinishedTestResult(item)).filter((item): item is FinishedTestResult => Boolean(item))
    : undefined;
  const rawHistory = input.benchmarkHistory;
  const benchmarkHistory = isRecord(rawHistory)
    ? Object.fromEntries(
        Object.entries(rawHistory)
          .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
          .map(([key, arr]) => [key, arr.map((item) => normalizeFinishedBenchmarkResult(item, key)).filter((item): item is FinishedModelBenchmarkResult => Boolean(item))])
          .filter(([, arr]) => arr.length > 0)
      )
    : undefined;
  const hasCoreValue = Boolean(rawName || baseUrl || apiKey || model || probe || lastTest || benchmarks);

  if (!hasCoreValue) return undefined;

  const name = rawName || makeDefaultName(index + 1);
  const tags = Array.isArray(input.tags) ? input.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : undefined;
  const testPrompt = typeof input.testPrompt === "string" && input.testPrompt.trim() ? input.testPrompt.trim() : undefined;
  const testMaxTokens = (typeof input.testMaxTokens === "number" && input.testMaxTokens > 0) ? input.testMaxTokens : undefined;
  const testTemperature = (typeof input.testTemperature === "number" && !Number.isNaN(input.testTemperature)) ? input.testTemperature : undefined;
  const expiresAt = safeDateToIso(input.expiresAt) || undefined;
  const rotatedAt = safeDateToIso(input.rotatedAt) || undefined;
  return { id, name, baseUrl, apiKey, model, createdAt, tags: tags && tags.length > 0 ? tags : undefined, sourceMeta, testPrompt, testMaxTokens, testTemperature, probe, lastTest, testHistory: testHistory && testHistory.length > 0 ? testHistory : undefined, benchmarks, benchmarkHistory: benchmarkHistory && Object.keys(benchmarkHistory).length > 0 ? benchmarkHistory : undefined, expiresAt, rotatedAt };
}

function toStoredConfigCandidates(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!isRecord(parsed)) return [];

  if (Array.isArray(parsed.configs)) return parsed.configs;
  if (Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed.data)) return parsed.data;

  const recordValues = Object.values(parsed).filter((item) => isRecord(item));
  if (recordValues.length > 0) return recordValues;

  return [];
}

export function normalizeStoredConfigs(raw: string): KeyConfig[] {
  const parsed = JSON.parse(raw) as unknown;
  const candidates = toStoredConfigCandidates(parsed);
  const normalized: KeyConfig[] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const item = normalizeStoredConfigItem(candidates[index], index);
    if (item) normalized.push(item);
  }

  return normalized;
}

export function defaultProbeResult(): ProbeResult {
  return { status: "idle", supportedModels: [] };
}

export function defaultTestResult(): TestResult {
  return { status: "idle", message: "未测试" };
}
