"use client";

import { memo } from "react";
import { FaCopy, FaKey, FaLink, FaTag } from "react-icons/fa";
import { useAppStore } from "@/store";
import type { KeyConfig } from "@/types/index";
import { inputClass, iconCopyBtn } from "@/components/shared/ui-constants";
import { toMaskedKey } from "@/lib/utils";
import { inferModelTags, getTagClassName } from "@/lib/benchmark-utils";
// Component

export const ConfigCardDetails = memo(function ConfigCardDetails({
  item,
}: {
  item: KeyConfig;
}) {
  const editingModelId = useAppStore((s) => s.editingModelId);
  const modelDraft = useAppStore((s) => s.modelDraft);
  const setModelDraft = useAppStore((s) => s.setModelDraft);
  const startInlineModelEdit = useAppStore((s) => s.startInlineModelEdit);
  const saveInlineModelEdit = useAppStore((s) => s.saveInlineModelEdit);
  const cancelInlineModelEdit = useAppStore((s) => s.cancelInlineModelEdit);
  const copyText = useAppStore((s) => s.copyText);

  const isEditingModel = editingModelId === item.id;
  const currentModelTags = inferModelTags(item.model);

  return (
    <div className="mt-3 grid gap-2 divide-y divide-zinc-100 dark:divide-zinc-800">
      {/* Address row */}
      <div className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[90px_1fr] sm:items-start sm:gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <FaLink aria-hidden /> 地址
        </span>
        <div className="flex min-w-0 max-w-full items-start gap-1.5">
          <span className="min-w-0 flex-1 break-all font-mono text-sm text-zinc-800 dark:text-zinc-200">
            {item.baseUrl || "(未填写)"}
          </span>
          <button
            type="button"
            className={iconCopyBtn}
            onClick={() => copyText(item.baseUrl, `已复制地址：${item.name}`)}
            title="复制地址"
            aria-label="复制地址"
            disabled={!item.baseUrl}
          >
            <FaCopy aria-hidden />
          </button>
        </div>
      </div>

      {/* Key row */}
      <div className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[90px_1fr] sm:items-start sm:gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <FaKey aria-hidden /> Key
        </span>
        <div className="flex min-w-0 max-w-full items-start gap-1.5">
          <span className="min-w-0 flex-1 break-all font-mono text-sm text-zinc-800 dark:text-zinc-200">
            {item.apiKey ? toMaskedKey(item.apiKey) : "(未填写)"}
          </span>
          <button
            type="button"
            className={iconCopyBtn}
            onClick={() => copyText(item.apiKey, `已复制 Key：${item.name}`)}
            title="复制 Key"
            aria-label="复制 Key"
            disabled={!item.apiKey}
          >
            <FaCopy aria-hidden />
          </button>
        </div>
      </div>

      {/* Model row (with inline edit) */}
      <div className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[90px_1fr] sm:items-start sm:gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <FaTag aria-hidden /> 模型
        </span>
        <div className="grid gap-1.5">
          {isEditingModel ? (
            <input
              autoFocus
              className={inputClass}
              value={modelDraft}
              onChange={(e) => setModelDraft(e.target.value)}
              onBlur={() => saveInlineModelEdit(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveInlineModelEdit(item.id);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelInlineModelEdit();
                }
              }}
              placeholder="点击后可修改"
            />
          ) : (
            <button
              type="button"
              className="inline-flex max-w-full rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              onClick={() => startInlineModelEdit(item)}
              title="点击编辑模型"
              aria-label="点击编辑模型"
            >
              <span className="truncate">{item.model || "点击设置模型"}</span>
            </button>
          )}
          {currentModelTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {currentModelTags.map((tag) => (
                <span
                  key={`${item.id}-${tag}`}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${getTagClassName(tag)}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
