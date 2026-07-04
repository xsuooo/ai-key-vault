"use client";

import Image from "next/image";
import { useEffect, useSyncExternalStore } from "react";
import { FaMoon, FaSun } from "react-icons/fa";

const THEME_KEY = "ai-key-vault-theme";
const THEME_CHANGE_EVENT = "ai-key-vault-theme-change";
type Theme = "light" | "dark";

function getStoredTheme(): Theme | undefined {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : undefined;
  } catch {
    return undefined;
  }
}

function getClientTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeTheme(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  media.addEventListener("change", onStoreChange);
  queueMicrotask(onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    media.removeEventListener("change", onStoreChange);
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function saveTheme(theme: Theme) {
  applyTheme(theme);
  localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function getServerTheme(): Theme {
  return "light";
}

export default function AppHeader() {
  const theme = useSyncExternalStore(subscribeTheme, getClientTheme, getServerTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => saveTheme(theme === "dark" ? "light" : "dark");

  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          <Image
            src="/logo.png"
            alt="Logo"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-cover ring-1 ring-emerald-200 sm:h-9 sm:w-9"
            priority
          />
          <span>AI Key Vault</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">本地保存、批量测试、模型识别、性能评测、复制与导出</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition-all duration-150 hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          title={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}
          aria-label={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}
        >
          {theme === "dark" ? <FaSun className="h-4 w-4" aria-hidden /> : <FaMoon className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">{theme === "dark" ? "亮色" : "暗色"}</span>
        </button>
      </div>
    </header>
  );
}
