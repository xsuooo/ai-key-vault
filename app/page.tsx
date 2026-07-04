"use client";
import { useEffect } from "react";
import { useAppStore } from "@/store";
import AppHeader from "@/components/layout/AppHeader";
import IntroSection from "@/components/layout/IntroSection";
import { AddConfigForm } from "@/components/config/AddConfigForm";
import { ConfigList } from "@/components/config/ConfigList";
import { ConfigListActions } from "@/components/config/ConfigListActions";
import { NoticeToast } from "@/components/shared/NoticeToast";
import { HelpHint } from "@/components/shared/HelpHint";
import { endpointHintText } from "@/components/shared/ui-constants";

export default function Home() {
  const testAllConfigs = useAppStore((s) => s.testAllConfigs);
  const probeAllConfigs = useAppStore((s) => s.probeAllConfigs);
  const setConfigSearch = useAppStore((s) => s.setConfigSearch);

  useEffect(() => {
    function isEditableTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    }

    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const inInput = isEditableTarget(e.target);

      // Ctrl+N / Cmd+N → scroll to top, focus first form input
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => {
          document.getElementById("add-config-form-textarea")?.focus();
        }, 150);
        return;
      }

      // Ctrl+Shift+T / Cmd+Shift+T → probe all configs
      if (mod && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        probeAllConfigs();
        return;
      }

      // Ctrl+T / Cmd+T → test all configs (must be checked after Ctrl+Shift+T)
      if (mod && !e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        testAllConfigs();
        return;
      }

      // / (when not in an input) → focus search
      if (e.key === "/" && !inInput && !mod) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder*="搜索"]')?.focus();
        return;
      }

      // Escape → blur active input, clear search
      if (e.key === "Escape") {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setConfigSearch("");
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [testAllConfigs, probeAllConfigs, setConfigSearch]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-3 px-3 py-4 text-zinc-900 dark:text-zinc-100 sm:px-4 lg:px-6">
      <AppHeader />
      <IntroSection />
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(21rem,0.82fr)_minmax(32rem,1.35fr)]">
        <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <AddConfigForm />
        </div>
        <section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm transition-shadow duration-150 dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-semibold whitespace-nowrap text-zinc-900 dark:text-zinc-100">配置列表</h2>
              <HelpHint text={endpointHintText} />
            </div>
            <ConfigListActions />
          </div>
          <ConfigList />
        </section>
      </div>
      <NoticeToast />
    </main>
  );
}
