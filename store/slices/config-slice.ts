"use client";

import type { StateCreator } from "zustand";

import type {
  KeyConfig,
  ExportType,
  ProbeResult,
  FinishedProbeResult,
  ModelBenchmarkResult
} from "@/types/index";

import {
  normalizeBaseUrl,
  cleanKey,
  sanitizeFilename,
  formatDurationLabel,
  formatSuccessRateLabel,
  toDateTimeLabel
} from "@/lib/utils";

import {
  buildBenchmarkSummary,
  getBenchmarkRoundDetails
} from "@/lib/benchmark-utils";

import {
  parsePastedConfigs,
  createKeyConfigsFromParsed,
  makeDefaultName,
  formatConfig,
  formatAll
} from "@/lib/config-parser";

import { normalizeStoredConfigs } from "../normalizers";
import type { AppState } from "./types";
// Config slice state & actions types

export interface ConfigState {
  configs: KeyConfig[];
}

export interface ConfigActions {
  addConfig: (e: React.FormEvent<HTMLFormElement>) => void;
  addMultipleConfigs: (items: KeyConfig[]) => void;
  removeConfig: (id: string) => void;
  removeAllConfigs: () => void;
  applyParsedFromPaste: () => void;
  applyPaste: () => void;
  addFromPaste: () => void;
  startEdit: (item: KeyConfig) => void;
  cancelEdit: () => void;
  saveEdit: (id: string) => void;
  startInlineModelEdit: (item: KeyConfig) => void;
  saveInlineModelEdit: (id: string) => void;
  cancelInlineModelEdit: () => void;
  applyProbeModel: (id: string, model: string) => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;
  setTestPrompt: (id: string, prompt: string) => void;
  setTestMaxTokens: (id: string, maxTokens: number | undefined) => void;
  setTestTemperature: (id: string, temperature: number | undefined) => void;
  exportOne: (item: KeyConfig, type: ExportType) => void;
  exportAll: (type: ExportType) => void;
  exportAsJson: () => void;
  exportBenchmarkReport: (configId: string) => void;
  importFromJson: (file: File) => Promise<void>;
  downloadText: (filename: string, content: string) => void;
  copyText: (text: string, okText: string) => Promise<void>;
  copyProbeModels: (item: KeyConfig, probe: ProbeResult | FinishedProbeResult) => Promise<void>;
  copySingleProbeModel: (model: string) => Promise<void>;
}

export type ConfigSlice = ConfigState & ConfigActions;
// Slice creator

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (set, get) => ({
  // State defaults
  configs: [],
  // Config CRUD actions
  addConfig: (e) => {
    e.preventDefault();
    const { form, formSourceMeta, configs } = get();
    const baseUrl = normalizeBaseUrl(form.baseUrl);
    const apiKey = cleanKey(form.apiKey);
    const model = form.model.trim();
    let name = form.name.trim();

    if (!baseUrl && !apiKey && !model) {
      get().setNotice("请至少填写地址、Key、模型中的一个");
      return;
    }
    if (!name) name = makeDefaultName(configs.length + 1);

    const item: KeyConfig = {
      id: crypto.randomUUID(),
      name,
      baseUrl,
      apiKey,
      model,
      createdAt: new Date().toISOString(),
      sourceMeta: formSourceMeta || { kind: "manual" }
    };
    set({
      configs: [item, ...configs],
      form: { name: "", baseUrl: "", apiKey: "", model: "" },
      formSourceMeta: undefined,
      pasteRaw: ""
    });
    get().setNotice("保存成功");
  },

  addMultipleConfigs: (items) => {
    if (items.length === 0) return;
    const { configs } = get();
    set({
      configs: [...items, ...configs],
      pasteRaw: ""
    });
  },

  removeConfig: (id) => {
    const state = get();
    const nextResultMap = { ...state.resultMap };
    delete nextResultMap[id];
    const nextProbeMap = { ...state.probeMap };
    delete nextProbeMap[id];
    const nextBenchmarkMap = { ...state.benchmarkMap };
    delete nextBenchmarkMap[id];

    set({
      configs: state.configs.filter((i) => i.id !== id),
      resultMap: nextResultMap,
      probeMap: nextProbeMap,
      benchmarkMap: nextBenchmarkMap,
      editingModelId: state.editingModelId === id ? null : state.editingModelId,
      modelDraft: state.editingModelId === id ? "" : state.modelDraft,
      ccSwitchDialogId: state.ccSwitchDialogId === id ? null : state.ccSwitchDialogId
    });
    get().setNotice("已删除");
  },

  removeAllConfigs: () => {
    const { configs } = get();
    if (configs.length === 0) {
      get().setNotice("暂无配置可删除");
      return;
    }

    set({
      configs: [],
      resultMap: {},
      probeMap: {},
      benchmarkMap: {},
      loadingMap: {},
      editingId: null,
      editingModelId: null,
      modelDraft: "",
      formSourceMeta: undefined,
      ccSwitchDialogId: null
    });
    get().setNotice("已删除全部配置");
  },
  // Paste actions
  applyParsedFromPaste: () => {
    const { pasteRaw, configs } = get();
    const parsed = parsePastedConfigs(pasteRaw, configs.length + 1);
    if (parsed.length === 0) {
      get().setNotice("未识别到完整配置");
      return;
    }

    set({
      form: {
        name: parsed[0].name,
        baseUrl: parsed[0].baseUrl,
        apiKey: parsed[0].apiKey,
        model: parsed[0].model
      },
      formSourceMeta: parsed[0].sourceMeta
    });
    if (parsed.length > 1) {
      get().setNotice(`已识别 ${parsed.length} 个配置，点击"粘贴并直接新增"可一次导入`);
    } else {
      get().setNotice("已解析到表单");
    }
  },

  applyPaste: () => get().applyParsedFromPaste(),

  addFromPaste: () => {
    const { pasteRaw, configs } = get();
    const parsed = parsePastedConfigs(pasteRaw, configs.length + 1);
    if (parsed.length === 0) {
      get().setNotice("未识别到可插入字段");
      return;
    }

    const newItems = createKeyConfigsFromParsed(parsed);
    set({
      configs: [...newItems, ...configs],
      form: { name: "", baseUrl: "", apiKey: "", model: "" },
      formSourceMeta: undefined,
      pasteRaw: ""
    });
    get().setNotice(`已新增 ${newItems.length} 个配置`);
  },
  // Edit actions
  startEdit: (item) => {
    set({
      editingId: item.id,
      editForm: { name: item.name, baseUrl: item.baseUrl, apiKey: item.apiKey, model: item.model }
    });
  },

  cancelEdit: () => {
    set({
      editingId: null,
      editForm: { name: "", baseUrl: "", apiKey: "", model: "" }
    });
  },

  saveEdit: (id) => {
    const state = get();
    const baseUrl = normalizeBaseUrl(state.editForm.baseUrl);
    const apiKey = cleanKey(state.editForm.apiKey);
    const name = state.editForm.name.trim();
    const model = state.editForm.model.trim();

    if (!baseUrl && !apiKey && !model) {
      get().setNotice("请至少填写地址、Key、模型中的一个");
      return;
    }

    const original = state.configs.find((item) => item.id === id);
    const resetLastTest = original
      ? original.baseUrl !== baseUrl || original.apiKey !== apiKey || (original.model || "") !== model
      : false;
    const resetProbe = original ? original.baseUrl !== baseUrl || original.apiKey !== apiKey : false;
    const resetBenchmarks = resetProbe;

    const nextResultMap = { ...state.resultMap };
    const nextProbeMap = { ...state.probeMap };
    const nextBenchmarkMap = { ...state.benchmarkMap };

    if (resetLastTest) delete nextResultMap[id];
    if (resetProbe) delete nextProbeMap[id];
    if (resetBenchmarks) delete nextBenchmarkMap[id];

    set({
      configs: state.configs.map((item) =>
        item.id === id
          ? {
              ...item,
              name: name || item.name,
              baseUrl,
              apiKey,
              model,
              lastTest: resetLastTest ? undefined : item.lastTest,
              probe: resetProbe ? undefined : item.probe,
              benchmarks: resetBenchmarks ? undefined : item.benchmarks
            }
          : item
      ),
      resultMap: nextResultMap,
      probeMap: nextProbeMap,
      benchmarkMap: nextBenchmarkMap,
      editingModelId: state.editingModelId === id ? null : state.editingModelId,
      modelDraft: state.editingModelId === id ? "" : state.modelDraft,
      editingId: null,
      editForm: { name: "", baseUrl: "", apiKey: "", model: "" }
    });
    get().setNotice("已保存编辑");
  },

  startInlineModelEdit: (item) => {
    set({
      editingModelId: item.id,
      modelDraft: item.model || ""
    });
  },

  saveInlineModelEdit: (id) => {
    const state = get();
    const nextModel = state.modelDraft.trim();
    const original = state.configs.find((item) => item.id === id);
    const resetLastTest = original ? (original.model || "") !== nextModel : false;

    const nextResultMap = { ...state.resultMap };
    if (resetLastTest) delete nextResultMap[id];

    set({
      configs: state.configs.map((item) =>
        item.id === id ? { ...item, model: nextModel, lastTest: resetLastTest ? undefined : item.lastTest } : item
      ),
      resultMap: nextResultMap,
      editingModelId: null,
      modelDraft: ""
    });
    get().setNotice("模型已更新");
  },

  cancelInlineModelEdit: () => {
    set({ editingModelId: null, modelDraft: "" });
  },

  applyProbeModel: (id, model) => {
    const nextModel = model.trim();
    if (!nextModel) return;

    const state = get();
    const original = state.configs.find((item) => item.id === id);
    const resetLastTest = original ? (original.model || "") !== nextModel : false;

    const nextResultMap = { ...state.resultMap };
    if (resetLastTest) delete nextResultMap[id];

    set({
      configs: state.configs.map((item) =>
        item.id === id
          ? { ...item, model: nextModel, lastTest: resetLastTest ? undefined : item.lastTest }
          : item
      ),
      resultMap: nextResultMap,
      modelDraft: state.editingModelId === id ? nextModel : state.modelDraft
    });
    get().setNotice(`已切换为 ${nextModel}`);
  },
  // Tag actions
  addTag: (id, tag) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    set((state) => ({
      configs: state.configs.map((item) =>
        item.id === id
          ? { ...item, tags: [...(item.tags || []), trimmed].filter((t, i, a) => a.indexOf(t) === i) }
          : item
      )
    }));
  },

  removeTag: (id, tag) => {
    set((state) => ({
      configs: state.configs.map((item) =>
        item.id === id
          ? { ...item, tags: (item.tags || []).filter((t) => t !== tag) }
          : item
      )
    }));
  },

  setTestPrompt: (id, prompt) => {
    const trimmed = prompt.trim();
    set((state) => ({
      configs: state.configs.map((item) =>
        item.id === id ? { ...item, testPrompt: trimmed || undefined } : item
      )
    }));
  },

  setTestMaxTokens: (id, maxTokens) => {
    set((state) => ({
      configs: state.configs.map((item) =>
        item.id === id ? { ...item, testMaxTokens: maxTokens } : item
      )
    }));
  },

  setTestTemperature: (id, temperature) => {
    set((state) => ({
      configs: state.configs.map((item) =>
        item.id === id ? { ...item, testTemperature: temperature } : item
      )
    }));
  },
  // Export / clipboard helpers
  downloadText: (filename, content) => {
    if (!content) {
      get().setNotice("没有可导出的内容");
      return;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    get().setNotice("导出完成");
  },

  copyText: async (text, okText) => {
    if (!text) {
      get().setNotice("没有可复制的内容");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      get().setNotice(okText);
    } catch (e) {
      console.error(e);
      get().setNotice("复制失败，请检查浏览器权限");
    }
  },

  exportOne: (item, type) => {
    const filename = `${sanitizeFilename(item.name || "ai-key")}.${type}`;
    const content = formatConfig(item, type);
    get().downloadText(filename, content);
  },

  exportAll: (type) => {
    const { configs } = get();
    const content = formatAll(configs, type);
    const filename = `ai-key-configs.${type}`;
    get().downloadText(filename, content);
  },

  exportAsJson: () => {
    const { configs } = get();
    if (configs.length === 0) {
      get().setNotice("暂无配置可导出");
      return;
    }
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      configs
    };
    const json = JSON.stringify(payload, null, 2);
    const filename = `ai-key-configs-${new Date().toISOString().slice(0, 10)}.json`;
    get().downloadText(filename, json);
  },

  exportBenchmarkReport: (configId: string) => {
    const state = get();
    const configItem = state.configs.find((c) => c.id === configId);
    if (!configItem) {
      get().setNotice("未找到该配置");
      return;
    }

    const mergedByModel: Record<string, ModelBenchmarkResult> = {
      ...(configItem.benchmarks || {}),
      ...(state.benchmarkMap[configId] || {})
    };
    const allResults = Object.values(mergedByModel).filter(
      (r): r is import("@/types/index").FinishedModelBenchmarkResult => r.status === "success" || r.status === "error"
    );

    if (allResults.length === 0) {
      get().setNotice("暂无评测结果可导出");
      return;
    }

    const rounds = allResults[0]?.speed?.rounds ?? 1;
    const summary = state.benchmarkSummaryMap[configId] ||
      buildBenchmarkSummary(configId, allResults.filter((r) => r.status === "success"), rounds);

    const successResults = allResults.filter((r) => r.status === "success");
    const failedResults = allResults.filter((r) => r.status === "error");

    const lines: string[] = [];
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    lines.push(`# 性能评测报告 — ${configItem.name}`);
    lines.push("");
    lines.push(`- **导出时间**: ${now}`);
    lines.push(`- **Base URL**: ${configItem.baseUrl || "(未设置)"}`);
    lines.push(`- **当前模型**: ${configItem.model || "(未设置)"}`);
    lines.push(`- **评测轮次**: ${rounds}`);
    lines.push(`- **测试提示词**: ${state.benchmarkPrompt.trim() || "Reply with exactly OK. Do not add anything else."}`);
    lines.push("");

    lines.push("## 摘要");
    lines.push("");
    lines.push(`| 指标 | 值 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| 目标模型数 | ${summary.totalModels} |`);
    lines.push(`| 成功模型数 | ${summary.successModels} |`);
    lines.push(`| 最快模型 | ${summary.fastestModel || "-"}（中位 ${formatDurationLabel(summary.fastestMedianMs)}）|`);
    lines.push(`| 首字最快 | ${summary.quickestFirstTokenModel || "-"}（${formatDurationLabel(summary.quickestFirstTokenMs)}）|`);
    lines.push(`| 最稳模型 | ${summary.mostStableModel || "-"}（波动 ${formatDurationLabel(summary.stabilityMs)}）|`);
    lines.push(`| 推荐模型 | ${summary.recommendedModel || "-"} |`);
    lines.push("");

    const sorted = [...allResults].sort((a, b) => {
      if (a.status !== b.status) return a.status === "success" ? -1 : 1;
      return (a.speed?.medianMs ?? Infinity) - (b.speed?.medianMs ?? Infinity);
    });

    lines.push("## 模型结果");
    lines.push("");
    lines.push("| 模型 | 状态 | 平均耗时 | 中位耗时 | 首字中位 | 成功率 | 波动 |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const r of sorted) {
      const statusLabel = r.status === "success" ? "成功" : "失败";
      lines.push(
        `| ${r.model} | ${statusLabel} | ${formatDurationLabel(r.speed?.avgMs)} | ${formatDurationLabel(r.speed?.medianMs)} | ${formatDurationLabel(r.speed?.firstTokenMedianMs)} | ${formatSuccessRateLabel(r.speed?.successRate)} | ${formatDurationLabel(r.speed?.stabilityMs)} |`
      );
    }
    lines.push("");

    const withRounds = successResults.filter((r) => {
      const details = getBenchmarkRoundDetails(r);
      return details.length > 0;
    });

    if (withRounds.length > 0) {
      lines.push("## 轮次明细");
      lines.push("");
      for (const r of withRounds) {
        lines.push(`### ${r.model}`);
        lines.push("");
        lines.push("| 轮次 | 状态 | 总耗时 | 首字时间 | 错误信息 |");
        lines.push("| --- | --- | --- | --- | --- |");
        const details = getBenchmarkRoundDetails(r);
        for (const d of details) {
          lines.push(
            `| 第${d.round}轮 | ${d.ok ? "成功" : "失败"} | ${d.ok ? formatDurationLabel(d.elapsedMs) : "-"} | ${d.ok ? formatDurationLabel(d.firstTokenMs) : "-"} | ${d.error || "-"} |`
          );
        }
        lines.push("");
      }
    }

    if (failedResults.length > 0) {
      lines.push("## 失败模型");
      lines.push("");
      for (const r of failedResults) {
        lines.push(`- **${r.model}**: ${r.detail || "未知错误"}`);
      }
      lines.push("");
    }

    const modelsWithHistory = Object.keys(configItem.benchmarkHistory || {}).filter(
      (m) => (configItem.benchmarkHistory?.[m]?.length || 0) > 0
    );
    if (modelsWithHistory.length > 0) {
      lines.push("## 历史记录");
      lines.push("");
      for (const model of modelsWithHistory) {
        const history = configItem.benchmarkHistory![model];
        lines.push(`### ${model}（共 ${history.length} 次）`);
        lines.push("");
        lines.push("| 时间 | 平均 | 中位 | 首字中位 | 成功率 |");
        lines.push("| --- | --- | --- | --- | --- |");
        for (const entry of history) {
          lines.push(
            `| ${entry.testedAt ? toDateTimeLabel(new Date(entry.testedAt)) : "-"} | ${formatDurationLabel(entry.speed?.avgMs)} | ${formatDurationLabel(entry.speed?.medianMs)} | ${formatDurationLabel(entry.speed?.firstTokenMedianMs)} | ${formatSuccessRateLabel(entry.speed?.successRate)} |`
          );
        }
        lines.push("");
      }
    }

    lines.push("---");
    lines.push(`> 导出自 AI Key Vault。`);

    const safeFilename = sanitizeFilename(configItem.name || "benchmark");
    const filename = `benchmark-report-${safeFilename}-${new Date().toISOString().slice(0, 10)}.md`;
    get().downloadText(filename, lines.join("\n"));
  },

  importFromJson: async (file) => {
    try {
      const text = await file.text();
      const configs = normalizeStoredConfigs(text);
      if (configs.length === 0) {
        get().setNotice("未识别到有效配置");
        return;
      }
      set((state) => ({ configs: [...configs, ...state.configs] }));
      get().setNotice(`已从 JSON 恢复 ${configs.length} 条配置`);
    } catch (e) {
      console.error(e);
      get().setNotice("JSON 文件解析失败");
    }
  },

  copyProbeModels: async (item, probe) => {
    const lines = [
      `名称: ${item.name}`,
      `推荐模型: ${probe.recommendedModel || "(无)"}`,
      `模型数量: ${probe.supportedModels.length}`,
      "",
      ...probe.supportedModels
    ];

    await get().copyText(lines.join("\n"), `已复制 ${item.name} 的探测模型`);
  },

  copySingleProbeModel: async (model) => {
    await get().copyText(model, `已复制模型 ${model}`);
  }
});
