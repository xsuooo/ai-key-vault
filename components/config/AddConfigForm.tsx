"use client";

import { useRef } from "react";
import { FaMagic, FaPaste, FaSave } from "react-icons/fa";
import { useAppStore } from "@/store";
import {
  labelClass,
  inputClass,
  btnGhost,
  btnPrimary,
  endpointHintText,
} from "@/components/shared/ui-constants";
import { makeDefaultName } from "@/lib/config-parser";
import { parsePastedConfigs } from "@/lib/config-parser";

export function AddConfigForm() {
  const configs = useAppStore((s) => s.configs);
  const form = useAppStore((s) => s.form);
  const pasteRaw = useAppStore((s) => s.pasteRaw);
  const setForm = useAppStore((s) => s.setForm);
  const setPasteRaw = useAppStore((s) => s.setPasteRaw);
  const addConfig = useAppStore((s) => s.addConfig);
  const addMultipleConfigs = useAppStore((s) => s.addMultipleConfigs);
  const applyPaste = useAppStore((s) => s.applyPaste);
  const addFromPaste = useAppStore((s) => s.addFromPaste);
  const setNotice = useAppStore((s) => s.setNotice);

  const ccSwitchSqlInputRef = useRef<HTMLInputElement | null>(null);
  const nextIndex = configs.length + 1;

  async function importCcSwitchSqlFile(file: File) {
    const content = await file.text();
    const parsed = parsePastedConfigs(content, nextIndex);
    if (parsed.length === 0) {
      setNotice("未从 cc-switch SQL 中识别到可导入配置");
      return;
    }

    const { createKeyConfigsFromParsed } = await import("@/lib/config-parser");
    const newItems = createKeyConfigsFromParsed(parsed);
    addMultipleConfigs(newItems);
    setNotice(`已从 cc-switch SQL 导入 ${newItems.length} 个配置`);
  }

  async function handleCcSwitchSqlFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      await importCcSwitchSqlFile(file);
    } catch (e) {
      console.error(e);
      setNotice("读取 cc-switch SQL 文件失败");
    }
  }

  function openCcSwitchSqlFilePicker() {
    ccSwitchSqlInputRef.current?.click();
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm transition-shadow duration-150 dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">新增配置</h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{configs.length} 条配置</span>
      </div>

      <label className={labelClass}>粘贴内容（支持一次解析多个配置，也支持 cc-switch SQL 文本）</label>
      <textarea
        id="add-config-form-textarea"
        className={inputClass}
        value={pasteRaw}
        onChange={(e) => setPasteRaw(e.target.value)}
        placeholder="可粘贴 curl、JSON、环境变量、ccswitch:// 链接、cc-switch 导出的 SQL、多个配置块"
        rows={3}
      />
      <input
        ref={ccSwitchSqlInputRef}
        type="file"
        accept=".sql,text/sql,text/plain"
        className="hidden"
        onChange={handleCcSwitchSqlFileChange}
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={btnGhost} onClick={applyPaste}>
          <FaMagic aria-hidden />
          <span>解析到表单</span>
        </button>
        <button type="button" className={btnPrimary} onClick={addFromPaste}>
          <FaPaste aria-hidden />
          <span>粘贴并直接新增</span>
        </button>
        <button type="button" className={btnGhost} onClick={openCcSwitchSqlFilePicker}>
          <FaPaste aria-hidden />
          <span>导入 cc-switch SQL</span>
        </button>
      </div>

      <form onSubmit={addConfig} className="mt-3">
        <label className={labelClass}>名称</label>
        <input
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={`例如：${makeDefaultName(nextIndex)}`}
        />

        <label className={labelClass}>地址</label>
        <input
          className={inputClass}
          value={form.baseUrl}
          onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          placeholder="例如：https://api.openai.com"
          required
        />
        <p className="mt-1 text-[11px] leading-5 text-zinc-500">{endpointHintText}</p>

        <label className={labelClass}>Key</label>
        <input
          className={inputClass}
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          placeholder="例如：sk-xxxx"
          required
        />

        <label className={labelClass}>模型（可选）</label>
        <input
          className={inputClass}
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          placeholder="例如：gpt-4.1-mini"
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary}>
            <FaSave aria-hidden />
            <span>保存配置</span>
          </button>
        </div>
      </form>
    </section>
  );
}
