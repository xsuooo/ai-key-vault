"use client";

import type { StateCreator } from "zustand";

import type {
  KeyConfig,
  FormState,
  CcSwitchApp,
  ProbeResult,
  TestResult,
  TestBatchProgress,
  ProbeBatchProgress,
  BenchmarkBatchProgress,
  BenchmarkSummary
} from "@/types/index";

import {
  isLikelyChatBenchmarkable,
  DEFAULT_BENCHMARK_ROUNDS
} from "@/lib/benchmark-utils";

import { buildCcSwitchDeepLink } from "@/lib/utils";
import { defaultProbeResult } from "../normalizers";
import type { AppState } from "./types";
// Module-level state (not persisted)

let noticeTimerId: ReturnType<typeof setTimeout> | null = null;
// UI slice state & actions types

export interface UIState {
  notice: string;
  form: FormState;
  formSourceMeta: KeyConfig["sourceMeta"];
  pasteRaw: string;
  editingId: string | null;
  editForm: FormState;
  editingModelId: string | null;
  modelDraft: string;
  configSearch: string;
  configTagFilter: string;
  selectedIds: string[];
  introExpanded: boolean;
  ccSwitchDialogId: string | null;
  ccSwitchTargetApp: CcSwitchApp;
  benchmarkSearch: string;
  benchmarkRoundsInput: string;
  selectedProbeModels: string[];
  benchmarkChartModel: string;
  benchmarkListCollapsed: boolean;
  benchmarkDetailModel: string;
  benchmarkPrompt: string;
  testingAll: boolean;
  probingAll: boolean;
  testBatchProgress: TestBatchProgress | null;
  probeBatchProgress: ProbeBatchProgress | null;
  viewMode: "list" | "grid" | "compact";
  allExpanded: boolean;
}

export interface UIActions {
  setNotice: (notice: string) => void;
  setForm: (form: FormState) => void;
  setFormSourceMeta: (meta: KeyConfig["sourceMeta"]) => void;
  setPasteRaw: (raw: string) => void;
  setEditingId: (id: string | null) => void;
  setEditForm: (form: FormState) => void;
  setEditingModelId: (id: string | null) => void;
  setModelDraft: (draft: string) => void;
  setConfigSearch: (search: string) => void;
  setConfigTagFilter: (tag: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setIntroExpanded: (expanded: boolean) => void;
  setCcSwitchDialogId: (id: string | null) => void;
  setCcSwitchTargetApp: (app: CcSwitchApp) => void;
  setBenchmarkSearch: (search: string) => void;
  setBenchmarkRoundsInput: (input: string) => void;
  setSelectedProbeModels: (models: string[]) => void;
  setBenchmarkChartModel: (model: string) => void;
  setBenchmarkListCollapsed: (collapsed: boolean) => void;
  setBenchmarkDetailModel: (model: string) => void;
  setBenchmarkPrompt: (prompt: string) => void;
  setResultMap: (fn: (prev: Record<string, TestResult>) => Record<string, TestResult>) => void;
  setProbeMap: (fn: (prev: Record<string, ProbeResult>) => Record<string, ProbeResult>) => void;
  setBenchmarkMap: (fn: (prev: Record<string, Record<string, import("@/types/index").ModelBenchmarkResult>>) => Record<string, Record<string, import("@/types/index").ModelBenchmarkResult>>) => void;
  setBenchmarkBatch: (fn: ((prev: BenchmarkBatchProgress | null) => BenchmarkBatchProgress | null) | BenchmarkBatchProgress | null) => void;
  setBenchmarkSummaryMap: (fn: (prev: Record<string, BenchmarkSummary>) => Record<string, BenchmarkSummary>) => void;

  deleteSelected: () => void;
  testSelected: () => Promise<void>;
  probeSelected: () => Promise<void>;

  openCcSwitchDialog: (item: KeyConfig) => void;
  closeCcSwitchDialog: () => void;
  importToCcSwitch: (item: KeyConfig, app: CcSwitchApp) => void;
  copyCcSwitchLink: (item: KeyConfig, app: CcSwitchApp) => Promise<void>;

  toggleProbeModelSelection: (model: string) => void;
  selectVisibleProbeModels: (models: string[]) => void;
  selectAllProbeModels: (configId?: string) => void;
  clearSelectedProbeModels: () => void;

  setViewMode: (mode: "list" | "grid" | "compact") => void;
  setAllExpanded: (expanded: boolean) => void;
}

export type UISlice = UIState & UIActions;
// Slice creator

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set, get) => ({
  // State defaults
  notice: "",
  form: { name: "", baseUrl: "", apiKey: "", model: "" },
  formSourceMeta: undefined,
  pasteRaw: "",
  editingId: null,
  editForm: { name: "", baseUrl: "", apiKey: "", model: "" },
  editingModelId: null,
  modelDraft: "",
  configSearch: "",
  configTagFilter: "",
  selectedIds: [],
  introExpanded: false,
  ccSwitchDialogId: null,
  ccSwitchTargetApp: "codex",
  benchmarkSearch: "",
  benchmarkRoundsInput: String(DEFAULT_BENCHMARK_ROUNDS),
  selectedProbeModels: [],
  benchmarkChartModel: "",
  benchmarkListCollapsed: false,
  benchmarkDetailModel: "",
  benchmarkPrompt: "Reply with exactly OK. Do not add anything else.",
  testingAll: false,
  probingAll: false,
  testBatchProgress: null,
  probeBatchProgress: null,
  viewMode: "list",
  allExpanded: true,
  // Simple setters
  setForm: (form) => set({ form }),
  setFormSourceMeta: (meta) => set({ formSourceMeta: meta }),
  setPasteRaw: (raw) => set({ pasteRaw: raw }),
  setEditingId: (id) => set({ editingId: id }),
  setEditForm: (form) => set({ editForm: form }),
  setEditingModelId: (id) => set({ editingModelId: id }),
  setModelDraft: (draft) => set({ modelDraft: draft }),
  setConfigSearch: (search) => set({ configSearch: search }),
  setConfigTagFilter: (tag) => set({ configTagFilter: tag }),
  toggleSelect: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter((i) => i !== id)
      : [...state.selectedIds, id]
  })),
  selectAll: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  setIntroExpanded: (expanded) => set({ introExpanded: expanded }),
  setCcSwitchDialogId: (id) => set({ ccSwitchDialogId: id }),
  setCcSwitchTargetApp: (app) => set({ ccSwitchTargetApp: app }),
  setBenchmarkSearch: (search) => set({ benchmarkSearch: search }),
  setBenchmarkRoundsInput: (input) => set({ benchmarkRoundsInput: input }),
  setSelectedProbeModels: (models) => set({ selectedProbeModels: models }),
  setBenchmarkChartModel: (model) => set({ benchmarkChartModel: model }),
  setBenchmarkListCollapsed: (collapsed) => set({ benchmarkListCollapsed: collapsed }),
  setBenchmarkDetailModel: (model) => set({ benchmarkDetailModel: model }),
  setBenchmarkPrompt: (prompt) => set({ benchmarkPrompt: prompt }),
  setResultMap: (fn) => set((state) => ({ resultMap: fn(state.resultMap) })),
  setProbeMap: (fn) => set((state) => ({ probeMap: fn(state.probeMap) })),
  setBenchmarkMap: (fn) => set((state) => ({ benchmarkMap: fn(state.benchmarkMap) })),
  setBenchmarkBatch: (fn) =>
    set((state) => ({
      benchmarkBatch: typeof fn === "function" ? fn(state.benchmarkBatch) : fn
    })),
  setBenchmarkSummaryMap: (fn) => set((state) => ({ benchmarkSummaryMap: fn(state.benchmarkSummaryMap) })),

  setViewMode: (mode) => set({ viewMode: mode }),
  setAllExpanded: (expanded) => set({ allExpanded: expanded }),
  // Notice
  setNotice: (notice) => {
    if (noticeTimerId !== null) {
      clearTimeout(noticeTimerId);
    }
    if (!notice) {
      noticeTimerId = null;
      set({ notice: "" });
      return;
    }
    noticeTimerId = setTimeout(() => {
      noticeTimerId = null;
      set({ notice: "" });
    }, 4000);
    set({ notice });
  },
  // Bulk selection actions
  deleteSelected: () => {
    const { selectedIds, configs } = get();
    if (selectedIds.length === 0) return;
    const idSet = new Set(selectedIds);
    const state = get();
    const nextResultMap = { ...state.resultMap };
    const nextProbeMap = { ...state.probeMap };
    const nextBenchmarkMap = { ...state.benchmarkMap };
    for (const id of selectedIds) {
      delete nextResultMap[id];
      delete nextProbeMap[id];
      delete nextBenchmarkMap[id];
    }
    set({
      configs: configs.filter((item) => !idSet.has(item.id)),
      selectedIds: [],
      resultMap: nextResultMap,
      probeMap: nextProbeMap,
      benchmarkMap: nextBenchmarkMap,
      editingModelId: state.editingModelId && idSet.has(state.editingModelId) ? null : state.editingModelId,
      modelDraft: state.editingModelId && idSet.has(state.editingModelId) ? "" : state.modelDraft,
      ccSwitchDialogId: state.ccSwitchDialogId && idSet.has(state.ccSwitchDialogId) ? null : state.ccSwitchDialogId
    });
    get().setNotice(`已删除 ${selectedIds.length} 条配置`);
  },

  testSelected: async () => {
    const { selectedIds, configs } = get();
    const targets = configs.filter((item) => selectedIds.includes(item.id));
    if (targets.length === 0) {
      get().setNotice("请先选择要测试的配置");
      return;
    }
    set({
      testingAll: true,
      testBatchProgress: { done: 0, total: targets.length, currentName: targets[0]?.name }
    });
    get().setNotice(`开始测试 ${targets.length} 条选中配置...`);
    let passCount = 0;
    for (let index = 0; index < targets.length; index += 1) {
      const item = targets[index];
      set({ testBatchProgress: { done: index, total: targets.length, currentName: item.name } });
      const ok = await get().runTest(item);
      if (ok) passCount += 1;
      set({ testBatchProgress: { done: index + 1, total: targets.length, currentName: item.name } });
    }
    const failCount = targets.length - passCount;
    set({ testingAll: false, testBatchProgress: null, selectedIds: [] });
    get().setNotice(`选中测试完成：通过 ${passCount}，失败 ${failCount}`);
  },

  probeSelected: async () => {
    const { selectedIds, configs } = get();
    const targets = configs.filter((item) => selectedIds.includes(item.id));
    if (targets.length === 0) {
      get().setNotice("请先选择要探测的配置");
      return;
    }
    set({
      probingAll: true,
      probeBatchProgress: { done: 0, total: targets.length, currentName: targets[0]?.name }
    });
    get().setNotice(`开始探测 ${targets.length} 条选中配置...`);
    let okCount = 0;
    for (let index = 0; index < targets.length; index += 1) {
      const item = targets[index];
      set({ probeBatchProgress: { done: index, total: targets.length, currentName: item.name } });
      const ok = await get().runModelProbe(item);
      if (ok) okCount += 1;
      set({ probeBatchProgress: { done: index + 1, total: targets.length, currentName: item.name } });
    }
    set({ probingAll: false, probeBatchProgress: null, selectedIds: [] });
    get().setNotice(`选中探测完成：成功 ${okCount}，失败 ${targets.length - okCount}`);
  },
  // CC Switch dialog
  openCcSwitchDialog: (item) => {
    if (!item.baseUrl || !item.apiKey) {
      get().setNotice("导入到 CC Switch 需要完整的地址和 Key");
      return;
    }
    set({
      ccSwitchDialogId: item.id,
      ccSwitchTargetApp: item.sourceMeta?.ccSwitchApp || "codex"
    });
  },

  closeCcSwitchDialog: () => {
    set({ ccSwitchDialogId: null });
  },

  importToCcSwitch: (item, app) => {
    const link = buildCcSwitchDeepLink(item, app);
    set({ ccSwitchDialogId: null });
    window.location.assign(link);
    get().setNotice(`已尝试唤起 CC Switch（${app}）`);
  },

  copyCcSwitchLink: async (item, app) => {
    await get().copyText(buildCcSwitchDeepLink(item, app), `已复制 CC Switch 链接（${app}）`);
  },

  toggleProbeModelSelection: (model) => {
    set((state) => ({
      selectedProbeModels: state.selectedProbeModels.includes(model)
        ? state.selectedProbeModels.filter((item) => item !== model)
        : [...state.selectedProbeModels, model]
    }));
  },

  selectVisibleProbeModels: (models) => {
    set({ selectedProbeModels: models });
  },

  selectAllProbeModels: (configId) => {
    const state = get();
    const probe = configId
      ? state.probeMap[configId] ||
        state.configs.find((c) => c.id === configId)?.probe ||
        defaultProbeResult()
      : defaultProbeResult();

    const allBenchmarkable = probe.supportedModels.filter((m) => isLikelyChatBenchmarkable(m));
    set({ selectedProbeModels: allBenchmarkable });
  },

  clearSelectedProbeModels: () => {
    set({ selectedProbeModels: [] });
  }
});
