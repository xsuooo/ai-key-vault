"use client";

import { memo, useState } from "react";
import { FaTimesCircle } from "react-icons/fa";
import { useAppStore } from "@/store";
import type { KeyConfig } from "@/types/index";
// Component

export const ConfigCardTags = memo(function ConfigCardTags({
  item,
}: {
  item: KeyConfig;
}) {
  const addTag = useAppStore((s) => s.addTag);
  const removeTag = useAppStore((s) => s.removeTag);

  const [showTagInput, setShowTagInput] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {(item.tags || []).map((tag) => (
        <span
          key={`${item.id}-utag-${tag}`}
          className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        >
          {tag}
          <button
            type="button"
            className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-emerald-500 hover:bg-emerald-200 hover:text-emerald-800 dark:hover:bg-emerald-800 dark:hover:text-emerald-100"
            onClick={() => removeTag(item.id, tag)}
            title={`移除标签 ${tag}`}
            aria-label={`移除标签 ${tag}`}
          >
            <FaTimesCircle className="h-2.5 w-2.5" aria-hidden />
          </button>
        </span>
      ))}
      {showTagInput ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            type="text"
            className="w-20 rounded-full border border-emerald-300 bg-white px-2 py-0.5 text-[11px] text-emerald-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-300 dark:border-emerald-700 dark:bg-zinc-900 dark:text-emerald-200"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (tagDraft.trim()) {
                  addTag(item.id, tagDraft);
                  setTagDraft("");
                  setShowTagInput(false);
                }
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setTagDraft("");
                setShowTagInput(false);
              }
            }}
            onBlur={() => {
              if (tagDraft.trim()) {
                addTag(item.id, tagDraft);
              }
              setTagDraft("");
              setShowTagInput(false);
            }}
            placeholder="标签名"
          />
        </span>
      ) : (
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-emerald-300 text-emerald-500 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
          onClick={() => setShowTagInput(true)}
          title="添加标签"
          aria-label="添加标签"
        >
          <span className="text-xs leading-none">+</span>
        </button>
      )}
    </div>
  );
});
