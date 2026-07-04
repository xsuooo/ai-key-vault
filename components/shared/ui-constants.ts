import type { CcSwitchApp } from "@/types/index";

export const labelClass = "mb-1.5 mt-3 first:mt-0 block text-sm font-semibold text-zinc-700 dark:text-zinc-300";
export const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all duration-150 focus:border-zinc-400 focus:ring-4 focus:ring-emerald-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-emerald-900";
export const smallInputClass = "w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none transition-all duration-150 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-emerald-900";
export const btnBase = "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-emerald-900";
export const btnPrimary = btnBase + " border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-700";
export const btnGhost = btnBase + " border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:hover:border-zinc-600";
export const topBtnBase = "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-emerald-900";
export const topBtnPrimary = topBtnBase + " border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-700";
export const topBtnGhost = topBtnBase + " border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";
export const topBtnDanger = topBtnBase + " border-red-200 bg-white text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:bg-zinc-800 dark:text-red-400 dark:hover:border-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300";
export const smallBtn = "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-all duration-150 hover:border-zinc-400 hover:bg-zinc-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus-visible:ring-emerald-900";
export const smallBtnPrimary = "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-600 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-all duration-150 hover:bg-emerald-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 dark:border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 dark:focus-visible:ring-emerald-900";
export const smallDangerBtn = "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition-all duration-150 hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 dark:border-red-800 dark:bg-zinc-800 dark:text-red-400 dark:hover:border-red-700 dark:hover:bg-red-900/30 dark:focus-visible:ring-red-950";
export const iconCopyBtn = "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-all duration-150 hover:bg-zinc-100 hover:text-zinc-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300";
export const endpointHintText = "地址只填域名也可以，系统会自动兼容 /v1、/chat/completions、/responses；测试会兼容流式、普通响应和 Responses，并优先展示信息量更高的那份回复。";
export const CC_SWITCH_APPS: { value: CcSwitchApp; label: string }[] = [
  { value: "claude", label: "Claude" },
  { value: "codex", label: "Codex" },
  { value: "gemini", label: "Gemini" },
  { value: "opencode", label: "OpenCode" },
  { value: "openclaw", label: "OpenClaw" },
];
