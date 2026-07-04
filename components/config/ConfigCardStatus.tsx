"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FaBolt, FaExchangeAlt, FaMagic, FaVial } from "react-icons/fa";
import { useAppStore } from "@/store";
import type { KeyConfig, TestResult } from "@/types/index";
import { StatusIcon, statusPillClass } from "@/components/shared/StatusPill";
import { HelpHint } from "@/components/shared/HelpHint";
import { toDateTimeLabel, formatDurationLabel, defaultTestResult, defaultProbeResult } from "@/lib/utils";
import {
  benchmarkStatusLabel,
  collectFinishedBenchmarks,
  pickFastestBenchmark,
  pickQuickestFirstTokenBenchmark,
  pickRecommendedBenchmark,
  defaultModelBenchmarkResult,
} from "@/lib/benchmark-utils";
// Local helpers

function testResponseSourceLabel(source?: TestResult["responseSource"]): string {
  if (source === "stream") return "流式";
  if (source === "responses") return "Responses";
  if (source === "chat") return "普通";
  return "";
}
// Component

export const ConfigCardStatus = memo(function ConfigCardStatus({
  item,
}: {
  item: KeyConfig;
}) {
  const result = useAppStore((s) => s.resultMap[item.id]) ?? item.lastTest ?? defaultTestResult();
  const router = useRouter();
  const probe = useAppStore((s) => s.probeMap[item.id]) ?? item.probe ?? defaultProbeResult();
  const runtimeBenchmarks = useAppStore((s) => s.benchmarkMap[item.id]) ?? {};
  const applyProbeModel = useAppStore((s) => s.applyProbeModel);

  const currentBenchmark =
    item.model.trim()
      ? runtimeBenchmarks[item.model] || item.benchmarks?.[item.model] || defaultModelBenchmarkResult(item.model)
      : null;
  const finishedBenchmarks = collectFinishedBenchmarks(item, runtimeBenchmarks);
  const fastestBenchmark = pickFastestBenchmark(finishedBenchmarks);
  const quickestFirstTokenBenchmark = pickQuickestFirstTokenBenchmark(finishedBenchmarks);
  const recommendedBenchmark = pickRecommendedBenchmark(finishedBenchmarks);
  const currentModelInProbe = Boolean(item.model && probe.supportedModels.includes(item.model));
  const selectedProbeModel = currentModelInProbe ? item.model : "";
  const canApplyRecommended = Boolean(probe.recommendedModel && probe.recommendedModel !== item.model);
  const previewModels = useMemo(
    () =>
      probe.supportedModels
        .filter((model) => model === item.model || model === probe.recommendedModel)
        .slice(0, 2),
    [item.model, probe.recommendedModel, probe.supportedModels],
  );

  return (
    <div className="mt-3 grid gap-2 divide-y divide-zinc-100 dark:divide-zinc-800">
      {/* Test status row */}
      <div className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[90px_1fr] sm:items-start sm:gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <FaVial aria-hidden /> 状态
        </span>
        <div className="grid gap-1">
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(result.status)}`}
          >
            <StatusIcon status={result.status} />
            <span>{result.message}</span>
          </span>
          {result.status === "error" && result.detail ? (
            <details className="w-full rounded-lg border border-red-100 bg-red-50/50 px-2 py-1.5 text-xs text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
              <summary className="cursor-pointer font-medium text-red-700">有错误，点击查看详情</summary>
              <div className="mt-1 whitespace-pre-wrap break-words leading-5">{result.detail}</div>
            </details>
          ) : result.detail ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{result.detail}</span>
          ) : null}
          {result.responseText ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
                  AI 返回内容
                </div>
                {result.responseSource ? (
                  <span className="rounded-full border border-emerald-300 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    来源：{testResponseSourceLabel(result.responseSource)}
                  </span>
                ) : null}
              </div>
              <div className="whitespace-pre-wrap break-words text-xs leading-5 text-emerald-950 dark:text-emerald-100">
                {result.responseText}
              </div>
            </div>
          ) : null}
          {item.lastTest?.testedAt ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              上次测试：{toDateTimeLabel(new Date(item.lastTest.testedAt))}（
              {item.lastTest.status === "success" ? "通过" : "失败"}）
            </span>
          ) : null}
        </div>
      </div>

      {/* Probe status row */}
      <div className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[90px_1fr] sm:items-start sm:gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <FaMagic aria-hidden /> 模型识别
          <HelpHint text="读取这组地址和 Key 可见的模型列表，帮助你先知道有哪些模型可以选。" />
        </span>
        <div className="grid gap-1">
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(probe.status)}`}
          >
            <StatusIcon status={probe.status} />
            <span>
              {probe.status === "idle"
                ? "未识别"
                : probe.status === "pending"
                  ? "识别中..."
                  : probe.status === "success"
                    ? "识别成功"
                    : "识别失败"}
            </span>
          </span>
          {probe.recommendedModel ? (
            <span className="text-xs text-zinc-600 dark:text-zinc-400">推荐模型：{probe.recommendedModel}</span>
          ) : null}
          {probe.supportedModels.length > 0 ? (
            <div className="grid max-w-full gap-2">
              <div className="flex max-w-full flex-wrap items-center gap-2">
                <select
                  className="min-w-0 max-w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-emerald-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-emerald-900/40"
                  value={selectedProbeModel}
                  onChange={(event) => applyProbeModel(item.id, event.target.value)}
                  aria-label="切换当前模型"
                >
                  <option value="" disabled>
                    选择模型
                  </option>
                  {probe.supportedModels.map((model) => (
                    <option key={model} value={model}>
                      {model === probe.recommendedModel ? `${model}（推荐）` : model}
                    </option>
                  ))}
                </select>
                {canApplyRecommended ? (
                  <button
                    type="button"
                    className="inline-flex w-fit items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                    onClick={() => applyProbeModel(item.id, probe.recommendedModel || "")}
                  >
                    <FaExchangeAlt aria-hidden />
                    <span>设为推荐</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="inline-flex w-fit items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => router.push(`/test/${item.id}`)}
                >
                  <FaMagic aria-hidden />
                  <span>完整列表 {probe.supportedModels.length}</span>
                </button>
              </div>
              {previewModels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {previewModels.map((model) => (
                    <button
                      key={model}
                      type="button"
                      className={`max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        model === item.model
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                      onClick={() => applyProbeModel(item.id, model)}
                      title={model === item.model ? `${model} 是当前模型` : `切换到 ${model}`}
                    >
                      {model === item.model ? `当前：${model}` : `切换：${model}`}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {probe.detail ? <span className="text-xs text-zinc-500 dark:text-zinc-400">{probe.detail}</span> : null}
          {probe.testedAt ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">最近识别：{toDateTimeLabel(new Date(probe.testedAt))}</span>
          ) : null}
        </div>
      </div>

      {/* Benchmark summary row */}
      <div className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[90px_1fr] sm:items-start sm:gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <FaBolt aria-hidden /> 性能评测
          <HelpHint text="对已识别到的模型做响应速度测试，帮你挑一个更适合日常使用的默认模型。" />
        </span>
        <div className="grid min-w-0 gap-1.5">
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              currentBenchmark ? statusPillClass(currentBenchmark.status) : statusPillClass("idle")
            }`}
          >
            <StatusIcon status={currentBenchmark?.status || "idle"} />
            <span>{currentBenchmark ? benchmarkStatusLabel(currentBenchmark) : "未测试"}</span>
          </span>
          {currentBenchmark?.speed?.medianMs ? (
            <span className="break-all text-xs leading-5 text-zinc-600 dark:text-zinc-400">
              当前中位：{formatDurationLabel(currentBenchmark.speed.medianMs)}
            </span>
          ) : null}
          {currentBenchmark?.speed?.firstTokenMedianMs ? (
            <span className="break-all text-xs leading-5 text-zinc-600 dark:text-zinc-400">
              当前首字：{formatDurationLabel(currentBenchmark.speed.firstTokenMedianMs)}
            </span>
          ) : null}
          {finishedBenchmarks.length > 0 ? (
            <span className="break-all text-xs leading-5 text-zinc-500 dark:text-zinc-400">已测：{finishedBenchmarks.length} 个模型</span>
          ) : null}
          {fastestBenchmark?.speed?.medianMs ? (
            <span className="break-all text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              最快：{fastestBenchmark.model} · {formatDurationLabel(fastestBenchmark.speed.medianMs)}
            </span>
          ) : null}
          {quickestFirstTokenBenchmark?.speed?.firstTokenMedianMs ? (
            <span className="break-all text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              首字最快：{quickestFirstTokenBenchmark.model} ·{" "}
              {formatDurationLabel(quickestFirstTokenBenchmark.speed.firstTokenMedianMs)}
            </span>
          ) : null}
          {recommendedBenchmark ? (
            <span className="break-all text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              推荐默认：{recommendedBenchmark.model}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
});
