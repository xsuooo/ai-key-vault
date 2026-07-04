"use client";

import { useAppStore } from "@/store";
import { FaChevronDown, FaChevronUp, FaInfoCircle } from "react-icons/fa";

export default function IntroSection() {
  const introExpanded = useAppStore((s) => s.introExpanded);
  const setIntroExpanded = useAppStore((s) => s.setIntroExpanded);

  return (
    <section className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50/70 to-white p-3.5 shadow-sm transition-shadow duration-150 dark:border-emerald-800 dark:from-emerald-950/50 dark:via-emerald-950/30 dark:to-zinc-950">
      <button
        type="button"
        className="group flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setIntroExpanded(!introExpanded)}
        aria-expanded={introExpanded}
        aria-label={introExpanded ? "收起介绍" : "展开介绍"}
      >
        <div>
          <p className="text-base font-extrabold text-emerald-900 sm:text-lg dark:text-emerald-200">这是你的 AI API Key 本地保险箱</p>
          <p className="mt-1 text-xs font-medium text-emerald-700/90 dark:text-emerald-400">
            {introExpanded ? "点击收起说明" : "包含本地保存、后端代理与使用说明；点击展开"}
          </p>
        </div>
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white/80 text-emerald-700 transition-transform duration-150 group-hover:translate-y-0.5">
          {introExpanded ? <FaChevronUp aria-hidden /> : <FaChevronDown aria-hidden />}
        </span>
      </button>

      {introExpanded ? (
        <>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            统一管理名称、地址、Key 和模型，支持粘贴导入、cc-switch SQL 文件导入、一键测试、模型识别、性能评测和唤起 CC Switch；配置数据默认仅保存在当前浏览器本地。
          </p>
          <div className="animate-soft-enter mt-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-700">
                <FaInfoCircle aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-900">请求说明</p>
                <p className="text-sm leading-6 text-emerald-800">
                  连通性测试、模型识别、性能评测这类真实联网请求会通过同源后端发起，避免浏览器直连部分上游接口时被 CORS 拦截。
                </p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs font-medium text-emerald-700/90">单条配置支持直接导出到 CC Switch。</p>
        </>
      ) : null}
    </section>
  );
}
