"use client";

import type { StateCreator } from "zustand";

import type {
  KeyConfig,
  ModelBenchmarkResult,
  FinishedModelBenchmarkResult,
  BenchmarkBatchProgress,
  BenchmarkSummary,
  BenchmarkRoundDetail
} from "@/types/index";

import {
  cleanKey,
  toOpenAIBaseUrl,
  makeErrorDetail,
  uniqueStrings,
  postJsonWithTimeout,
  medianOf,
  averageOf,
  computeStability,
  formatDurationLabel
} from "@/lib/utils";

import {
  inferModelTags,
  isLikelyChatBenchmarkable,
  defaultModelBenchmarkResult,
  pickFastestBenchmark,
  pickQuickestFirstTokenBenchmark,
  pickMostStableBenchmark,
  pickRecommendedBenchmark
} from "@/lib/benchmark-utils";

import type {
  OpenAIProxyBenchmarkRoundResponse
} from "@/lib/openai-proxy-types";

import type { AppState } from "./types";
// Benchmark slice state & actions types

export interface BenchmarkState {
  benchmarkMap: Record<string, Record<string, ModelBenchmarkResult>>;
  benchmarkBatch: BenchmarkBatchProgress | null;
  benchmarkSummaryMap: Record<string, BenchmarkSummary>;
}

export interface BenchmarkActions {
  runModelBenchmark: (
    item: KeyConfig,
    model: string,
    rounds: number,
    onRoundStart?: (modelName: string, roundIndex: number) => void
  ) => Promise<FinishedModelBenchmarkResult | null>;
  benchmarkModels: (item: KeyConfig, models: string[], rounds: number) => Promise<void>;
  commitFinishedBenchmarkResult: (id: string, model: string, result: FinishedModelBenchmarkResult) => void;
}

export type BenchmarkSlice = BenchmarkState & BenchmarkActions;
// Slice creator

export const createBenchmarkSlice: StateCreator<AppState, [], [], BenchmarkSlice> = (set, get) => ({
  // State defaults
  benchmarkMap: {},
  benchmarkBatch: null,
  benchmarkSummaryMap: {},
  // Benchmark result commit helpers (internal logic)
  commitFinishedBenchmarkResult: (id: string, model: string, result: FinishedModelBenchmarkResult) => {
    set((state) => {
      const existingHistory = state.configs.find((item) => item.id === id)?.benchmarkHistory || {};
      const modelHistory = [...(existingHistory[model] || []), result];
      const cappedHistory = modelHistory.length > 20 ? modelHistory.slice(modelHistory.length - 20) : modelHistory;
      return {
        benchmarkMap: {
          ...state.benchmarkMap,
          [id]: {
            ...(state.benchmarkMap[id] || {}),
            [model]: result
          }
        },
        configs: state.configs.map((item) =>
          item.id === id
            ? {
                ...item,
                benchmarks: {
                  ...(item.benchmarks || {}),
                  [model]: result
                },
                benchmarkHistory: {
                  ...(item.benchmarkHistory || {}),
                  [model]: cappedHistory
                }
              }
            : item
        )
      };
    });
  },
  // Async: runModelBenchmark
  runModelBenchmark: async (item, model, rounds, onRoundStart) => {
    const baseUrl = toOpenAIBaseUrl(item.baseUrl);
    const apiKey = cleanKey(item.apiKey);
    const tags = inferModelTags(model);
    const benchmarkPrompt = get().benchmarkPrompt.trim() || "Reply with exactly OK. Do not add anything else.";

    set((state) => ({
      benchmarkMap: {
        ...state.benchmarkMap,
        [item.id]: {
          ...(state.benchmarkMap[item.id] || {}),
          [model]: {
            ...(state.benchmarkMap[item.id]?.[model] || defaultModelBenchmarkResult(model)),
            status: "pending" as const,
            model,
            tags,
            detail: "测试中..."
          }
        }
      }
    }));

    if (!baseUrl || !apiKey) {
      const result: FinishedModelBenchmarkResult = {
        status: "error",
        model,
        tags,
        detail: "地址或 Key 为空，无法执行模型测试",
        testedAt: new Date().toISOString()
      };
      get().commitFinishedBenchmarkResult(item.id, model, result);
      return null;
    }

    const elapsedSamples: number[] = [];
    const firstTokenSamples: number[] = [];
    const speedErrors: string[] = [];
    const roundDetails: BenchmarkRoundDetail[] = [];

    for (let round = 0; round < rounds; round += 1) {
      onRoundStart?.(model, round + 1);
      try {
        const response = await postJsonWithTimeout<OpenAIProxyBenchmarkRoundResponse>(
          "/api/openai/benchmark",
          {
            baseUrl,
            apiKey,
            model,
            prompt: benchmarkPrompt
          },
          25000
        );

        if (response.ok && response.sample) {
          elapsedSamples.push(response.sample.elapsedMs);
          if (typeof response.sample.firstTokenMs === "number") {
            firstTokenSamples.push(response.sample.firstTokenMs);
          }
          roundDetails.push({
            round: round + 1,
            ok: true,
            elapsedMs: response.sample.elapsedMs,
            firstTokenMs: response.sample.firstTokenMs
          });
          continue;
        }

        const errorDetail = response.error || "测速失败，未返回可读内容";
        speedErrors.push(errorDetail);
        roundDetails.push({
          round: round + 1,
          ok: false,
          error: errorDetail
        });
      } catch (error: unknown) {
        const errorDetail = makeErrorDetail(error);
        speedErrors.push(errorDetail);
        roundDetails.push({
          round: round + 1,
          ok: false,
          error: errorDetail
        });
      }
    }

    if (elapsedSamples.length === 0) {
      const result: FinishedModelBenchmarkResult = {
        status: "error",
        model,
        tags,
        speed: {
          rounds,
          medianMs: 0,
          avgMs: 0,
          successRate: 0,
          stabilityMs: 0,
          samplesMs: [],
          roundDetails
        },
        detail: uniqueStrings(speedErrors)[0] || "测速失败，模型未返回可读内容",
        testedAt: new Date().toISOString()
      };
      get().commitFinishedBenchmarkResult(item.id, model, result);
      return null;
    }

    const medianMs = medianOf(elapsedSamples);
    const avgMs = averageOf(elapsedSamples);
    const firstTokenMedianMs = firstTokenSamples.length > 0 ? medianOf(firstTokenSamples) : undefined;
    const firstTokenAvgMs = firstTokenSamples.length > 0 ? averageOf(firstTokenSamples) : undefined;
    const successRate = elapsedSamples.length / rounds;
    const stabilityMs = computeStability(elapsedSamples);
    const detailParts = [
      `成功 ${elapsedSamples.length}/${rounds}`,
      firstTokenMedianMs ? `首字中位 ${formatDurationLabel(firstTokenMedianMs)}` : "",
      `中位耗时 ${formatDurationLabel(medianMs)}`,
      `波动 ${formatDurationLabel(stabilityMs)}`,
      speedErrors.length > 0 ? `异常：${uniqueStrings(speedErrors)[0]}` : ""
    ].filter(Boolean);

    const result: FinishedModelBenchmarkResult = {
      status: "success",
      model,
      tags,
      speed: {
        rounds,
        medianMs,
        avgMs,
        successRate,
        stabilityMs,
        samplesMs: elapsedSamples,
        firstTokenMedianMs,
        firstTokenAvgMs,
        firstTokenSamplesMs: firstTokenSamples.length > 0 ? firstTokenSamples : undefined,
        roundDetails
      },
      detail: detailParts.join("；"),
      testedAt: new Date().toISOString()
    };
    get().commitFinishedBenchmarkResult(item.id, model, result);
    return result;
  },
  // Async: benchmarkModels (batch)
  benchmarkModels: async (item, models, rounds) => {
    const uniqueModels = uniqueStrings(models);
    const benchmarkableModels = uniqueModels.filter((model) => isLikelyChatBenchmarkable(model));
    const skipped = uniqueModels.length - benchmarkableModels.length;

    if (benchmarkableModels.length === 0) {
      get().setNotice(skipped > 0 ? `已跳过 ${skipped} 个非对话模型` : "没有可测试的模型");
      return;
    }

    set((state) => ({
      benchmarkMap: {
        ...state.benchmarkMap,
        [item.id]: {
          ...(state.benchmarkMap[item.id] || {}),
          ...Object.fromEntries(
            benchmarkableModels.map((model) => [
              model,
              {
                ...(state.benchmarkMap[item.id]?.[model] || defaultModelBenchmarkResult(model)),
                status: "pending" as const,
                model,
                tags: inferModelTags(model),
                detail: "测试中..."
              }
            ])
          )
        }
      },
      benchmarkBatch: {
        configId: item.id,
        models: benchmarkableModels,
        rounds,
        done: 0,
        total: benchmarkableModels.length,
        skipped,
        currentModel: benchmarkableModels[0],
        currentRound: 1
      },
      benchmarkListCollapsed: true
    }));

    let okCount = 0;
    const successfulBenchmarks: FinishedModelBenchmarkResult[] = [];

    for (let index = 0; index < benchmarkableModels.length; index += 1) {
      const model = benchmarkableModels[index];

      set((state) => ({
        benchmarkBatch:
          state.benchmarkBatch && state.benchmarkBatch.configId === item.id
            ? { ...state.benchmarkBatch, currentModel: model, currentRound: 1 }
            : state.benchmarkBatch
      }));

      const result = await get().runModelBenchmark(item, model, rounds, (modelName, roundIndex) => {
        set((state) => ({
          benchmarkBatch:
            state.benchmarkBatch && state.benchmarkBatch.configId === item.id
              ? { ...state.benchmarkBatch, currentModel: modelName, currentRound: roundIndex }
              : state.benchmarkBatch
        }));
      });

      if (result) {
        okCount += 1;
        successfulBenchmarks.push(result);
      }

      set((state) => ({
        benchmarkBatch:
          state.benchmarkBatch && state.benchmarkBatch.configId === item.id
            ? { ...state.benchmarkBatch, done: index + 1 }
            : state.benchmarkBatch
      }));
    }

    const fastest = pickFastestBenchmark(successfulBenchmarks);
    const quickestFirstToken = pickQuickestFirstTokenBenchmark(successfulBenchmarks);
    const mostStable = pickMostStableBenchmark(successfulBenchmarks);
    const recommended = pickRecommendedBenchmark(successfulBenchmarks);

    set((state) => ({
      benchmarkSummaryMap: {
        ...state.benchmarkSummaryMap,
        [item.id]: {
          configId: item.id,
          rounds,
          models: uniqueStrings(benchmarkableModels),
          totalModels: benchmarkableModels.length,
          successModels: okCount,
          fastestModel: fastest?.model,
          fastestMedianMs: fastest?.speed?.medianMs,
          quickestFirstTokenModel: quickestFirstToken?.model,
          quickestFirstTokenMs: quickestFirstToken?.speed?.firstTokenMedianMs,
          mostStableModel: mostStable?.model,
          stabilityMs: mostStable?.speed?.stabilityMs,
          recommendedModel: recommended?.model,
          finishedAt: new Date().toISOString()
        }
      },
      benchmarkBatch: null
    }));

    get().setNotice(
      `模型测试完成：成功 ${okCount}，失败 ${benchmarkableModels.length - okCount}${skipped > 0 ? `，跳过 ${skipped}` : ""}`
    );
  }
});
