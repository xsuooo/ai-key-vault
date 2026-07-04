"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/store/index";
import { StatusPill } from "@/components/shared/StatusPill";
import { HelpHint } from "@/components/shared/HelpHint";
import { NoticeToast } from "@/components/shared/NoticeToast";
import {
  btnPrimary,
  btnGhost,
  smallBtn,
  inputClass,
  labelClass,
  CC_SWITCH_APPS,
} from "@/components/shared/ui-constants";
import { toMaskedKey, buildCcSwitchDeepLink, toDateTimeLabel, defaultTestResult, defaultProbeResult } from "@/lib/utils";
import { FaSpinner } from "react-icons/fa";
import { inferModelTags, getTagClassName } from "@/lib/benchmark-utils";
import type { CcSwitchApp, KeyConfig } from "@/types/index";
import { useState } from "react";
// Advanced settings

type AdvancedTestSettingsProps = {
  config: KeyConfig;
  setNotice: (notice: string) => void;
  setTestPrompt: (id: string, prompt: string) => void;
  setTestMaxTokens: (id: string, maxTokens: number | undefined) => void;
  setTestTemperature: (id: string, temperature: number | undefined) => void;
};

function AdvancedTestSettings({
  config,
  setNotice,
  setTestPrompt,
  setTestMaxTokens,
  setTestTemperature,
}: AdvancedTestSettingsProps) {
  const [testPromptDraft, setTestPromptDraft] = useState(config.testPrompt ?? "");
  const [testMaxTokensDraft, setTestMaxTokensDraft] = useState(config.testMaxTokens?.toString() ?? "");
  const [testTemperatureDraft, setTestTemperatureDraft] = useState(config.testTemperature?.toString() ?? "");

  function handleSaveTestPrompt() {
    setTestPrompt(config.id, testPromptDraft);
    setNotice("自定义测试提示词已保存");
  }

  function handleSaveTestMaxTokens() {
    const parsed = testMaxTokensDraft.trim() === "" ? undefined : Number(testMaxTokensDraft);
    if (parsed !== undefined && (Number.isNaN(parsed) || parsed < 1)) {
      setNotice("Max Tokens 请输入大于 0 的整数");
      return;
    }
    setTestMaxTokens(config.id, parsed);
    setNotice(parsed !== undefined ? "测试 Max Tokens 已保存" : "已清除自定义 Max Tokens");
  }

  function handleSaveTestTemperature() {
    const parsed = testTemperatureDraft.trim() === "" ? undefined : Number(testTemperatureDraft);
    if (parsed !== undefined && (Number.isNaN(parsed) || parsed < 0 || parsed > 2)) {
      setNotice("Temperature 需在 0 ~ 2 之间");
      return;
    }
    setTestTemperature(config.id, parsed);
    setNotice(parsed !== undefined ? "测试 Temperature 已保存" : "已清除自定义 Temperature");
  }

  return (
    <div className="border-t border-zinc-200 px-5 pb-5 pt-4 dark:border-zinc-800">
      <label htmlFor="test-prompt" className={labelClass}>
        自定义测试提示词
      </label>
      <textarea
        id="test-prompt"
        className={inputClass + " mt-1 h-24 w-full resize-y font-mono text-sm"}
        placeholder="留空则使用默认提示词：Reply with exactly OK. Do not add anything else."
        value={testPromptDraft}
        onChange={(e) => setTestPromptDraft(e.target.value)}
      />
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className={btnPrimary + " text-sm"} onClick={handleSaveTestPrompt}>
          保存提示词
        </button>
        <button
          type="button"
          className={btnGhost + " text-sm"}
          onClick={() => setTestPromptDraft(config.testPrompt ?? "")}
        >
          还原
        </button>
        {config.testPrompt && (
          <button
            type="button"
            className={btnGhost + " text-sm"}
            onClick={() => {
              setTestPrompt(config.id, "");
              setTestPromptDraft("");
              setNotice("已清除自定义提示词");
            }}
          >
            清除
          </button>
        )}
      </div>

      <div className="mt-5">
        <label htmlFor="test-max-tokens" className={labelClass}>
          自定义 Max Tokens
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            id="test-max-tokens"
            type="number"
            min={1}
            step={1}
            className={inputClass + " w-40"}
            placeholder="默认 48"
            value={testMaxTokensDraft}
            onChange={(e) => setTestMaxTokensDraft(e.target.value)}
          />
          <button type="button" className={btnPrimary + " text-sm"} onClick={handleSaveTestMaxTokens}>
            保存
          </button>
          <button
            type="button"
            className={btnGhost + " text-sm"}
            onClick={() => setTestMaxTokensDraft(config.testMaxTokens?.toString() ?? "")}
          >
            还原
          </button>
          {config.testMaxTokens !== undefined && (
            <button
              type="button"
              className={btnGhost + " text-sm"}
              onClick={() => {
                setTestMaxTokens(config.id, undefined);
                setTestMaxTokensDraft("");
                setNotice("已清除自定义 Max Tokens");
              }}
            >
              清除
            </button>
          )}
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="test-temperature" className={labelClass}>
          自定义 Temperature
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            id="test-temperature"
            type="number"
            min={0}
            max={2}
            step={0.1}
            className={inputClass + " w-40"}
            placeholder="默认 1.0"
            value={testTemperatureDraft}
            onChange={(e) => setTestTemperatureDraft(e.target.value)}
          />
          <button type="button" className={btnPrimary + " text-sm"} onClick={handleSaveTestTemperature}>
            保存
          </button>
          <button
            type="button"
            className={btnGhost + " text-sm"}
            onClick={() => setTestTemperatureDraft(config.testTemperature?.toString() ?? "")}
          >
            还原
          </button>
          {config.testTemperature !== undefined && (
            <button
              type="button"
              className={btnGhost + " text-sm"}
              onClick={() => {
                setTestTemperature(config.id, undefined);
                setTestTemperatureDraft("");
                setNotice("已清除自定义 Temperature");
              }}
            >
              清除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
// Page

export default function TestProbeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const config = useAppStore((s) => s.configs.find((c) => c.id === id));
  const isTesting = useAppStore((s) => s.loadingMap[id] === true);
  const runtimeResult = useAppStore((s) => s.resultMap[id]);
  const runtimeProbe = useAppStore((s) => s.probeMap[id]);
  const testConfig = useAppStore((s) => s.testConfig);
  const probeConfig = useAppStore((s) => s.probeConfig);
  const applyProbeModel = useAppStore((s) => s.applyProbeModel);
  const setNotice = useAppStore((s) => s.setNotice);
  const copyText = useAppStore((s) => s.copyText);
  const setTestPrompt = useAppStore((s) => s.setTestPrompt);
  const setTestMaxTokens = useAppStore((s) => s.setTestMaxTokens);
  const setTestTemperature = useAppStore((s) => s.setTestTemperature);

  const [ccApp, setCcApp] = useState<CcSwitchApp>("codex");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  if (!config) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-100">
          未找到该配置（id: {id || "空"}）
        </p>
        <Link href="/" className={btnGhost}>
          返回首页
        </Link>
        <NoticeToast />
      </main>
    );
  }
  const testResult = runtimeResult ?? config.lastTest ?? defaultTestResult();
  const probeResult = runtimeProbe ?? config.probe ?? defaultProbeResult();
  const isProbing = probeResult.status === "pending";

  const models = probeResult.status === "success" ? probeResult.supportedModels : [];
  const recommended = probeResult.status === "success" ? probeResult.recommendedModel : undefined;
  async function handleCopyModels() {
    if (models.length === 0) return;
    await copyText(models.join("\n"), "已复制全部模型名称");
  }

  async function handleCopySingleModel(model: string) {
    await copyText(model, `已复制 ${model}`);
  }

  function handleCcExport() {
    if (!config) return;
    const link = buildCcSwitchDeepLink(
      { name: config.name, baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model, sourceMeta: config.sourceMeta },
      ccApp,
    );
    window.open(link, "_blank");
  }

  async function handleCopyCcLink() {
    if (!config) return;
    const link = buildCcSwitchDeepLink(
      { name: config.name, baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model, sourceMeta: config.sourceMeta },
      ccApp,
    );
    await copyText(link, "已复制 CC Switch 链接");
  }
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 dark:bg-zinc-950">
      {/* Back nav */}
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
        <span aria-hidden>&larr;</span>
        返回首页
      </Link>

      {/* Config header */}
      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{config.name}</h1>
        <div className="mt-3 grid gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
          <div>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Base URL：</span>
            <span className="break-all">{config.baseUrl || "（未设置）"}</span>
          </div>
          <div>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">API Key：</span>
            <span>{toMaskedKey(config.apiKey)}</span>
          </div>
          <div>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">模型：</span>
            <span>{config.model || "（未设置）"}</span>
          </div>
          <div>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">创建时间：</span>
            <span>{config.createdAt ? toDateTimeLabel(new Date(config.createdAt)) : "—"}</span>
          </div>
        </div>
      </section>

      {/* Action buttons */}
      <section className="mb-8 flex flex-wrap gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={isTesting}
          onClick={() => testConfig(config)}
        >
          {isTesting ? <><FaSpinner className="inline animate-spin" /> 测试中...</> : "测试连通性"}
        </button>
        <button
          type="button"
          className={btnGhost}
          disabled={isProbing}
          onClick={() => probeConfig(config)}
        >
          {isProbing ? <><FaSpinner className="inline animate-spin" /> 探测中...</> : "探测可用模型"}
        </button>
        <Link href={`/benchmark/${config.id}`} className={btnGhost}>
          性能基准测试
        </Link>
      </section>

      {/* Advanced settings */}
      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          className="flex w-full items-center justify-between p-5 text-base font-semibold text-zinc-900 dark:text-zinc-100"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
        >
          高级设置
          <span className="text-sm font-normal text-zinc-400">{advancedOpen ? "▲" : "▼"}</span>
        </button>

        {advancedOpen && (
          <AdvancedTestSettings
            key={`${config.id}:${config.testPrompt ?? ""}:${config.testMaxTokens ?? ""}:${config.testTemperature ?? ""}`}
            config={config}
            setNotice={setNotice}
            setTestPrompt={setTestPrompt}
            setTestMaxTokens={setTestMaxTokens}
            setTestTemperature={setTestTemperature}
          />
        )}
      </section>

      {/* Test result panel */}
      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          测试结果
          <HelpHint text="向配置的端点发送一条测试请求，验证 API Key 和 Base URL 是否可用。" />
        </h2>

        <div className="mb-3">
          <StatusPill status={testResult.status} message={testResult.message} />
        </div>

        {testResult.status !== "idle" && testResult.detail && (
          <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">详情：</span>
            {testResult.detail}
          </p>
        )}

        {testResult.status === "error" && testResult.responseText && (
          <div className="mt-3">
            <span className={labelClass}>错误响应</span>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-zinc-700 dark:border-red-800 dark:bg-red-900/30 dark:text-zinc-300">
              {testResult.responseText}
            </pre>
          </div>
        )}

        {testResult.status === "success" && testResult.responseText && (
          <div className="mt-3">
            <span className={labelClass}>模型回复</span>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-zinc-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-zinc-300">
              {testResult.responseText}
            </pre>
          </div>
        )}

        {testResult.status === "idle" && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">尚未执行测试，请点击上方按钮开始。</p>
        )}
      </section>

      {/* Test history panel */}
      {config.testHistory && config.testHistory.length > 0 && (
        <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            测试历史
            <HelpHint text="最近的测试记录，最多保留 30 条。" />
          </h2>

          <div className="max-h-80 space-y-2 overflow-auto">
            {[...config.testHistory].reverse().map((entry, idx) => (
              <div
                key={`${entry.testedAt}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "inline-block h-2 w-2 shrink-0 rounded-full " +
                      (entry.status === "success"
                        ? "bg-emerald-500"
                        : "bg-red-500")
                    }
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {entry.status === "success" ? "通过" : "失败"}
                  </span>
                  {entry.detail && (
                    <span className="truncate text-zinc-400 dark:text-zinc-500">
                      {entry.detail}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                  {toDateTimeLabel(new Date(entry.testedAt))}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Probe result panel */}
      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          模型探测结果
          <HelpHint text="调用端点的 /models 接口，获取该 Key 下所有可用模型列表。" />
        </h2>

        {probeResult.status === "idle" && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">尚未执行探测，请点击上方按钮开始。</p>
        )}

        {probeResult.status === "pending" && (
          <p className="text-sm text-amber-600 dark:text-amber-400"><FaSpinner className="mr-1 inline animate-spin" />正在探测可用模型...</p>
        )}

        {probeResult.status === "error" && (
          <div>
            <StatusPill status="error" message="探测失败" />
            {probeResult.detail && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{probeResult.detail}</p>
            )}
          </div>
        )}

        {probeResult.status === "success" && models.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <span>
                共 <span className="font-semibold text-zinc-900 dark:text-zinc-100">{models.length}</span> 个模型
              </span>
              {recommended && (
                <span>
                  推荐：<span className="font-semibold text-emerald-700 dark:text-emerald-400">{recommended}</span>
                </span>
              )}
              <button type="button" className={smallBtn + " ml-auto"} onClick={handleCopyModels}>
                复制全部
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {models.map((model) => {
                const tags = inferModelTags(model);
                const isRecommended = model === recommended;
                return (
                  <div
                    key={model}
                    className={
                      "flex flex-col gap-1 rounded-xl border p-3 text-sm transition " +
                      (isRecommended
                        ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/30"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="break-all font-medium text-zinc-800 dark:text-zinc-200">{model}</span>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className={smallBtn}
                          title="复制模型名称"
                          onClick={() => handleCopySingleModel(model)}
                        >
                          复制
                        </button>
                        <button
                          type="button"
                          className={smallBtn}
                          title="应用为默认模型"
                          onClick={() => applyProbeModel(config.id, model)}
                        >
                          应用
                        </button>
                      </div>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className={
                              "inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] " +
                              getTagClassName(tag)
                            }
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {probeResult.status === "success" && models.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">探测成功，但未返回可用模型列表。</p>
        )}
      </section>

      {/* CC Switch export */}
      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          CC Switch 导出
          <HelpHint text="将当前配置通过 CC Switch 协议导出到目标应用，或复制链接后手动导入。" />
        </h2>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="cc-app-select" className={labelClass}>
              目标应用
            </label>
            <select
              id="cc-app-select"
              className={inputClass + " w-48"}
              value={ccApp}
              onChange={(e) => setCcApp(e.target.value as CcSwitchApp)}
            >
              {CC_SWITCH_APPS.map((app) => (
                <option key={app.value} value={app.value}>
                  {app.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" className={btnPrimary} onClick={handleCcExport}>
            打开 CC Switch 导出
          </button>
          <button type="button" className={btnGhost} onClick={handleCopyCcLink}>
            复制导出链接
          </button>
        </div>
      </section>

      <NoticeToast />
    </main>
  );
}
