"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { EChartsOption } from "echarts";
import { useMemo, useState } from "react";
import { FaChartBar, FaSearch } from "react-icons/fa";

import { useAppStore } from "@/store";
import { NoticeToast } from "@/components/shared/NoticeToast";
import { smallBtn, inputClass } from "@/components/shared/ui-constants";
import { collectFinishedBenchmarks } from "@/lib/benchmark-utils";
import type { FinishedModelBenchmarkResult } from "@/types/index";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const CHART_STYLE = { height: 420, width: "100%" } as const;

const CONFIG_COLORS = [
  "#16a34a", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e11d48", "#a855f7", "#0d9488", "#d946ef",
];

export default function ComparePage() {
  const configs = useAppStore((s) => s.configs);
  const benchmarkMap = useAppStore((s) => s.benchmarkMap);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [metric, setMetric] = useState<"avgMs" | "medianMs" | "firstTokenMedianMs">("avgMs");

  // Configs with at least one benchmark result
  const configsHavingBenchmarks = useMemo(() => {
    return configs.filter((c) => {
      const runtime = benchmarkMap[c.id] || {};
      const stored = c.benchmarks || {};
      return Object.keys({ ...stored, ...runtime }).length > 0;
    });
  }, [configs, benchmarkMap]);

  const filteredConfigs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return configsHavingBenchmarks;
    return configsHavingBenchmarks.filter(
      (c) => c.name.toLowerCase().includes(q) || c.baseUrl.toLowerCase().includes(q),
    );
  }, [searchQuery, configsHavingBenchmarks]);

  // Toggle config selection
  function toggleConfig(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  // Gather selected configs and their benchmark data
  const selectedData = useMemo(() => {
    return selectedIds
      .map((id, idx) => {
        const cfg = configs.find((c) => c.id === id);
        if (!cfg) return null;
        const results: FinishedModelBenchmarkResult[] = collectFinishedBenchmarks(cfg, benchmarkMap[cfg.id]);
        return { config: cfg, results, color: CONFIG_COLORS[idx % CONFIG_COLORS.length] };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [selectedIds, configs, benchmarkMap]);

  // Build chart option: grouped bar chart by model, colored by config
  const chartOption = useMemo<EChartsOption | null>(() => {
    if (selectedData.length === 0) return null;

    const metricLabel = metric === "avgMs" ? "平均耗时" : metric === "medianMs" ? "中位耗时" : "首字中位";
    const allModels = new Set<string>();
    for (const d of selectedData) {
      for (const r of d.results) {
        if (r.speed && r.status === "success") allModels.add(r.model);
      }
    }

    const modelList = [...allModels].sort();
    if (modelList.length === 0) return null;

    const series = selectedData.map((d) => ({
      name: d.config.name,
      type: "bar" as const,
      barMaxWidth: 18,
      itemStyle: { color: d.color, borderRadius: [6, 6, 0, 0] },
      data: modelList.map((model) => {
        const result = d.results.find((r) => r.model === model);
        if (!result?.speed) return 0;
        return metric === "avgMs"
          ? result.speed.avgMs
          : metric === "medianMs"
            ? result.speed.medianMs
            : result.speed.firstTokenMedianMs ?? 0;
      }),
    }));

    return {
      animationDuration: 260,
      grid: { left: 16, right: 16, top: 40, bottom: 10, containLabel: true },
      legend: {
        top: 0,
        textStyle: { color: "#334155", fontSize: 11 },
        data: selectedData.map((d) => d.config.name),
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (value: unknown) => {
          const n = typeof value === "number" ? value : 0;
          if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
          return `${Math.round(n)}ms`;
        },
      },
      xAxis: {
        type: "category",
        axisLabel: { color: "#0f172a", fontSize: 11, rotate: modelList.length > 12 ? 35 : 0, width: 140, overflow: "truncate" },
        data: modelList,
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: "#64748b",
          formatter: (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`),
        },
        splitLine: { lineStyle: { color: "#e2e8f0" } },
        name: metricLabel,
        nameTextStyle: { color: "#64748b", fontSize: 11 },
      },
      series,
    };
  }, [selectedData, metric]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-3 py-4 text-zinc-900 dark:text-zinc-100 sm:px-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/" className={smallBtn}>
              &larr; 返回
            </Link>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">跨配置性能对比</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            选择多个配置，按模型分组对比基准测试结果。
          </p>
        </div>
      </div>

      {/* Config selector */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            选择配置（{selectedIds.length} 已选 / {configsHavingBenchmarks.length} 有数据）
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={smallBtn}
              onClick={() => setSelectedIds(configsHavingBenchmarks.map((c) => c.id))}
            >
              全选
            </button>
            <button
              type="button"
              className={smallBtn}
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0}
            >
              清空
            </button>
          </div>
        </div>

        <div className="relative mb-3">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索配置名称..."
            className={`${inputClass} py-1.5 pl-9 text-sm`}
          />
        </div>

        {filteredConfigs.length > 0 ? (
          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
            {filteredConfigs.map((cfg) => {
              const checked = selectedIds.includes(cfg.id);
              return (
                <label
                  key={cfg.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                    checked
                      ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-900/20"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleConfig(cfg.id)}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-100">{cfg.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-zinc-400 dark:text-zinc-500 truncate max-w-[260px]">
                    {cfg.baseUrl}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-3">
            {configsHavingBenchmarks.length === 0
              ? "尚无配置完成过基准测试，请先到单个配置的评测页面运行测试。"
              : "未匹配到配置。"}
          </p>
        )}
      </section>

      {/* Metric toggle */}
      {selectedData.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <FaChartBar className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">指标：</span>
          {(
            [
              { key: "avgMs", label: "平均耗时" },
              { key: "medianMs", label: "中位耗时" },
              { key: "firstTokenMedianMs", label: "首字中位" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                metric === item.key
                  ? "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
              onClick={() => setMetric(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
        {chartOption ? (
          <ReactECharts option={chartOption} style={CHART_STYLE} notMerge />
        ) : (
          <div className="flex h-96 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
            {selectedData.length === 0
              ? "请在上方勾选至少一个已有基准测试数据的配置"
              : "所选配置中暂无可绘制的图表数据"}
          </div>
        )}
      </section>

      {/* Legend / config names */}
      {selectedData.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">已选配置概览</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selectedData.map((d) => (
              <div
                key={d.config.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2.5"
              >
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{d.config.name}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {d.results.length} 个模型已测试
                  </p>
                </div>
                <Link
                  href={`/benchmark/${d.config.id}`}
                  className={`${smallBtn} ml-auto shrink-0`}
                >
                  详情
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <NoticeToast />
    </main>
  );
}
