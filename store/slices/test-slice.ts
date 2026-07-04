"use client";

import type { StateCreator } from "zustand";

import type {
  KeyConfig,
  ProbeResult,
  TestResult,
  FinishedTestResult,
  FinishedProbeResult
} from "@/types/index";

import {
  cleanKey,
  toOpenAIBaseUrl,
  makeErrorDetail,
  postJsonWithTimeout,
  FAIL_TEXT
} from "@/lib/utils";
import { PROBE_CLIENT_TIMEOUT_MS } from "@/lib/openai-proxy-timeouts";

import type {
  OpenAIProxyTestResponse,
  OpenAIProxyProbeResponse
} from "@/lib/openai-proxy-types";

import type { AppState } from "./types";
// Test slice state & actions types

export interface TestState {
  loadingMap: Record<string, boolean>;
  resultMap: Record<string, TestResult>;
  probeMap: Record<string, ProbeResult>;
}

export interface TestActions {
  runTest: (item: KeyConfig) => Promise<boolean>;
  testConfig: (item: KeyConfig) => Promise<void>;
  testAllConfigs: () => Promise<void>;
  runModelProbe: (item: KeyConfig) => Promise<boolean>;
  probeConfig: (item: KeyConfig) => Promise<void>;
  probeAllConfigs: () => Promise<void>;
  commitFinishedTestResult: (id: string, result: FinishedTestResult) => void;
  commitFinishedProbeResult: (id: string, result: FinishedProbeResult) => void;
}

export type TestSlice = TestState & TestActions;
// Slice creator

export const createTestSlice: StateCreator<AppState, [], [], TestSlice> = (set, get) => ({
  // State defaults
  loadingMap: {},
  resultMap: {},
  probeMap: {},
  // Benchmark result commit helpers (internal logic)
  commitFinishedTestResult: (id: string, result: FinishedTestResult) => {
    set((state) => ({
      resultMap: { ...state.resultMap, [id]: result },
      configs: state.configs.map((item) => {
        if (item.id !== id) return item;
        const history = [...(item.testHistory || []), result];
        const capped = history.length > 30 ? history.slice(history.length - 30) : history;
        return { ...item, lastTest: result, testHistory: capped };
      })
    }));
  },

  commitFinishedProbeResult: (id: string, result: FinishedProbeResult) => {
    set((state) => ({
      probeMap: { ...state.probeMap, [id]: result },
      configs: state.configs.map((item) =>
        item.id === id
          ? {
              ...item,
              probe: result,
              model: !item.model && result.recommendedModel ? result.recommendedModel : item.model
            }
          : item
      )
    }));
  },
  // Async: runTest
  runTest: async (item) => {
    set((state) => ({
      loadingMap: { ...state.loadingMap, [item.id]: true },
      resultMap: { ...state.resultMap, [item.id]: { status: "pending", message: "测试中..." } }
    }));

    const baseUrl = toOpenAIBaseUrl(item.baseUrl);
    const apiKey = cleanKey(item.apiKey);

    if (!baseUrl || !apiKey) {
      const result: FinishedTestResult = {
        status: "error",
        message: FAIL_TEXT,
        detail: "地址或 Key 为空",
        testedAt: new Date().toISOString()
      };
      get().commitFinishedTestResult(item.id, result);
      set((state) => ({ loadingMap: { ...state.loadingMap, [item.id]: false } }));
      return false;
    }

    const defaultPrompt = "Reply with exactly OK. Do not add anything else.";
    const prompt = (item.testPrompt && item.testPrompt.trim()) || defaultPrompt;

    try {
      const response = await postJsonWithTimeout<OpenAIProxyTestResponse>(
        "/api/openai/test",
        {
          baseUrl,
          apiKey,
          model: item.model || "gpt-4o-mini",
          prompt,
          ...(typeof item.testMaxTokens === "number" && item.testMaxTokens > 0 ? { maxTokens: item.testMaxTokens } : {}),
          ...(typeof item.testTemperature === "number" && !Number.isNaN(item.testTemperature) ? { temperature: item.testTemperature } : {}),
        },
        45000
      );

      get().commitFinishedTestResult(item.id, response.result);
      set((state) => ({ loadingMap: { ...state.loadingMap, [item.id]: false } }));
      return response.ok;
    } catch (error: unknown) {
      const result: FinishedTestResult = {
        status: "error",
        message: FAIL_TEXT,
        detail: makeErrorDetail(error),
        testedAt: new Date().toISOString()
      };
      get().commitFinishedTestResult(item.id, result);
      set((state) => ({ loadingMap: { ...state.loadingMap, [item.id]: false } }));
      return false;
    }
  },

  testConfig: async (item) => {
    const ok = await get().runTest(item);
    get().setNotice(ok ? `${item.name} 测试通过` : `${item.name} 测试失败`);
  },

  testAllConfigs: async () => {
    const { configs } = get();
    if (configs.length === 0) {
      get().setNotice("暂无配置可测试");
      return;
    }

    set({
      testingAll: true,
      testBatchProgress: { done: 0, total: configs.length, currentName: configs[0]?.name }
    });
    get().setNotice("开始测试全部配置...");

    let passCount = 0;
    for (let index = 0; index < configs.length; index += 1) {
      const item = configs[index];
      set({ testBatchProgress: { done: index, total: configs.length, currentName: item.name } });
      const ok = await get().runTest(item);
      if (ok) passCount += 1;
      set({ testBatchProgress: { done: index + 1, total: configs.length, currentName: item.name } });
    }

    const failCount = configs.length - passCount;
    set({ testingAll: false, testBatchProgress: null });
    get().setNotice(`测试完成：通过 ${passCount}，失败 ${failCount}`);
  },
  // Async: runModelProbe
  runModelProbe: async (item) => {
    set((state) => ({
      probeMap: {
        ...state.probeMap,
        [item.id]: {
          status: "pending",
          supportedModels: item.probe?.supportedModels || []
        }
      }
    }));

    const baseUrl = toOpenAIBaseUrl(item.baseUrl);
    const apiKey = cleanKey(item.apiKey);

    if (!baseUrl || !apiKey) {
      const result: FinishedProbeResult = {
        status: "error",
        supportedModels: [],
        detail: "地址或 Key 为空，无法探测模型",
        testedAt: new Date().toISOString()
      };
      get().commitFinishedProbeResult(item.id, result);
      return false;
    }

    try {
      const response = await postJsonWithTimeout<OpenAIProxyProbeResponse>(
        "/api/openai/probe",
        {
          baseUrl,
          apiKey,
          currentModel: item.model
        },
        PROBE_CLIENT_TIMEOUT_MS
      );
      get().commitFinishedProbeResult(item.id, response.result);
      return response.ok;
    } catch (error: unknown) {
      const result: FinishedProbeResult = {
        status: "error",
        supportedModels: [],
        detail: makeErrorDetail(error),
        testedAt: new Date().toISOString()
      };
      get().commitFinishedProbeResult(item.id, result);
      return false;
    }
  },

  probeConfig: async (item) => {
    const ok = await get().runModelProbe(item);
    get().setNotice(ok ? `${item.name} 模型探测完成` : `${item.name} 模型探测失败`);
  },

  probeAllConfigs: async () => {
    const { configs } = get();
    if (configs.length === 0) {
      get().setNotice("暂无配置可探测");
      return;
    }

    set({
      probingAll: true,
      probeBatchProgress: { done: 0, total: configs.length, currentName: configs[0]?.name }
    });
    get().setNotice("开始探测全部模型...");

    let okCount = 0;
    for (let index = 0; index < configs.length; index += 1) {
      const item = configs[index];
      set({ probeBatchProgress: { done: index, total: configs.length, currentName: item.name } });
      const ok = await get().runModelProbe(item);
      if (ok) okCount += 1;
      set({ probeBatchProgress: { done: index + 1, total: configs.length, currentName: item.name } });
    }

    set({ probingAll: false, probeBatchProgress: null });
    get().setNotice(`探测完成：成功 ${okCount}，失败 ${configs.length - okCount}`);
  }
});
