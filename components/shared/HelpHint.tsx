"use client";
import { FaQuestionCircle } from "react-icons/fa";

export function HelpHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-zinc-400 transition hover:text-zinc-700" aria-label={text} title={text} tabIndex={0}>
        <FaQuestionCircle aria-hidden />
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-zinc-900 px-3 py-2 text-[11px] leading-5 text-white shadow-xl group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}
