"use client";

import { memo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FaBolt, FaCopy, FaEdit, FaFileExport, FaMagic, FaSave, FaSpinner, FaTimesCircle, FaTrashAlt, FaVial } from "react-icons/fa";
import { useAppStore } from "@/store";
import type { KeyConfig } from "@/types/index";
import {
  labelClass,
  inputClass,
  btnPrimary,
  btnGhost,
  smallBtn,
  smallBtnPrimary,
  smallDangerBtn,
  endpointHintText,
} from "@/components/shared/ui-constants";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatConfig, formatConfigMasked } from "@/lib/config-parser";
import { defaultProbeResult } from "@/lib/utils";
// Component

export const ConfigCardActions = memo(function ConfigCardActions({
  item,
  compact = false,
}: {
  item: KeyConfig;
  compact?: boolean;
}) {
  const router = useRouter();
  // Store state
  const testing = useAppStore((s) => s.loadingMap[item.id]);
  const probe = useAppStore((s) => s.probeMap[item.id]) ?? item.probe ?? defaultProbeResult();
  const editingId = useAppStore((s) => s.editingId);
  const editForm = useAppStore((s) => s.editForm);

  // Store actions
  const setEditForm = useAppStore((s) => s.setEditForm);
  const testConfig = useAppStore((s) => s.testConfig);
  const probeConfig = useAppStore((s) => s.probeConfig);
  const startEdit = useAppStore((s) => s.startEdit);
  const cancelEdit = useAppStore((s) => s.cancelEdit);
  const saveEdit = useAppStore((s) => s.saveEdit);
  const removeConfig = useAppStore((s) => s.removeConfig);
  const copyText = useAppStore((s) => s.copyText);
  const exportOne = useAppStore((s) => s.exportOne);
  const downloadText = useAppStore((s) => s.downloadText);
  const openCcSwitchDialog = useAppStore((s) => s.openCcSwitchDialog);

  // Local UI state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Derived
  const isEditing = editingId === item.id;
  const probing = probe.status === "pending";

  function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    removeConfig(item.id);
  }

  function handleExportMasked() {
    const filename = `${item.name || "ai-key"}.txt`;
    downloadText(filename, formatConfigMasked(item, "txt"));
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50/30 p-3 ring-2 ring-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:ring-emerald-900">
        <label className={labelClass}>名称</label>
        <input
          className={inputClass}
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
        />

        <label className={labelClass}>地址</label>
        <input
          className={inputClass}
          value={editForm.baseUrl}
          onChange={(e) => setEditForm({ ...editForm, baseUrl: e.target.value })}
          placeholder="例如：https://api.openai.com"
        />
        <p className="mt-1 text-[11px] leading-5 text-zinc-500">{endpointHintText}</p>

        <label className={labelClass}>Key</label>
        <input
          className={inputClass}
          value={editForm.apiKey}
          onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
        />

        <label className={labelClass}>模型</label>
        <input
          className={inputClass}
          value={editForm.model}
          onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={() => saveEdit(item.id)}>
            <FaSave aria-hidden />
            <span>保存编辑</span>
          </button>
          <button type="button" className={btnGhost} onClick={cancelEdit}>
            <FaTimesCircle aria-hidden />
            <span>取消</span>
          </button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:flex-nowrap">
          <button
            type="button"
            className="compact-icon-btn compact-icon-btn-primary"
            onClick={() => testConfig(item)}
            disabled={testing}
            title="测试"
            aria-label={`测试 ${item.name}`}
          >
            {testing ? <FaSpinner className="animate-spin" aria-hidden /> : <FaBolt aria-hidden />}
          </button>
          <button
            type="button"
            className="compact-icon-btn"
            onClick={() => probeConfig(item)}
            disabled={probing}
            title="识别模型"
            aria-label={`识别 ${item.name} 的模型`}
          >
            {probing ? <FaSpinner className="animate-spin" aria-hidden /> : <FaMagic aria-hidden />}
          </button>
          <button
            type="button"
            className="compact-icon-btn"
            onClick={() => router.push(`/benchmark/${item.id}`)}
            disabled={probe.supportedModels.length === 0}
            title={probe.supportedModels.length > 0 ? "性能评测" : "请先识别模型"}
            aria-label={probe.supportedModels.length > 0 ? `评测 ${item.name}` : `${item.name} 请先识别模型`}
          >
            <FaVial aria-hidden />
          </button>
          <button
            type="button"
            className="compact-icon-btn"
            onClick={() => copyText(formatConfig(item, "txt"), `已复制：${item.name}`)}
            title="复制"
            aria-label={`复制 ${item.name}`}
          >
            <FaCopy aria-hidden />
          </button>
          <button
            type="button"
            className="compact-icon-btn"
            onClick={() => openCcSwitchDialog(item)}
            title="导出到 CC Switch"
            aria-label={`导出 ${item.name} 到 CC Switch`}
          >
            <FaFileExport aria-hidden />
          </button>
          <button
            type="button"
            className="compact-icon-btn"
            onClick={() => startEdit(item)}
            title="编辑"
            aria-label={`编辑 ${item.name}`}
          >
            <FaEdit aria-hidden />
          </button>
          <button
            type="button"
            className="compact-icon-btn compact-icon-btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
            title="删除"
            aria-label={`删除 ${item.name}`}
          >
            <FaTrashAlt aria-hidden />
          </button>
        </div>

        {showDeleteConfirm
          ? createPortal(
              <ConfirmDialog
                title="删除配置"
                message={`确认删除「${item.name}」吗？此操作不可恢复。`}
                confirmLabel="删除"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteConfirm(false)}
              />,
              document.body,
            )
          : null}
      </>
    );
  }

  return (
    <>
      <div className="mt-3 grid gap-2 border-t border-zinc-200 pt-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={smallBtnPrimary}
            onClick={() => testConfig(item)}
            disabled={testing}
            title="测试"
            aria-label="测试"
          >
            {testing ? <FaSpinner className="animate-spin" aria-hidden /> : <FaBolt aria-hidden />}
            <span>测试</span>
          </button>
          <button
            type="button"
            className={smallBtn}
            onClick={() => probeConfig(item)}
            disabled={probing}
            title="识别模型"
            aria-label="识别模型"
          >
            {probing ? <FaSpinner className="animate-spin" aria-hidden /> : <FaMagic aria-hidden />}
            <span>识别模型</span>
          </button>
          <button
            type="button"
            className={smallBtn}
            onClick={() => router.push(`/benchmark/${item.id}`)}
            disabled={probe.supportedModels.length === 0}
            title={probe.supportedModels.length > 0 ? "性能评测" : "请先识别模型"}
            aria-label={probe.supportedModels.length > 0 ? "性能评测" : "请先识别模型"}
          >
            <FaVial aria-hidden />
            <span>性能评测</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 border-t border-zinc-100 pt-2 mt-1 sm:border-t-0 sm:pt-0 sm:mt-0 sm:justify-end dark:border-zinc-800">
          <button
            type="button"
            className={smallBtn}
            onClick={() => copyText(formatConfig(item, "txt"), `已复制：${item.name}`)}
            title="复制"
            aria-label="复制"
          >
            <FaCopy aria-hidden />
            <span>复制</span>
          </button>
          <ExportMenu
            onExport={(type) => exportOne(item, type)}
            extraActions={[
              { label: "导出到 CC Switch", onClick: () => openCcSwitchDialog(item), tone: "accent" },
              { label: "导出（隐藏 Key）", onClick: () => handleExportMasked(), tone: "default" },
            ]}
            label="导出·CC"
            size="small"
          />
          <button
            type="button"
            className={smallBtn}
            onClick={() => startEdit(item)}
            title="编辑"
            aria-label="编辑"
          >
            <FaEdit aria-hidden />
            <span>编辑</span>
          </button>
          <button
            type="button"
            className={smallDangerBtn}
            onClick={() => setShowDeleteConfirm(true)}
            title="删除"
            aria-label="删除"
          >
            <FaTrashAlt aria-hidden />
            <span>删除</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm
        ? createPortal(
            <ConfirmDialog
              title="删除配置"
              message={`确认删除「${item.name}」吗？此操作不可恢复。`}
              confirmLabel="删除"
              onConfirm={handleDeleteConfirm}
              onCancel={() => setShowDeleteConfirm(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
});
