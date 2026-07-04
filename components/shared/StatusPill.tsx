"use client";
import type { TestStatus } from "@/types/index";
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaVial } from "react-icons/fa";

export function StatusIcon({ status }: { status: TestStatus }) {
  if (status === "success") return <FaCheckCircle aria-hidden />;
  if (status === "error") return <FaTimesCircle aria-hidden />;
  if (status === "pending") return <FaSpinner className="animate-spin" aria-hidden />;
  return <FaVial aria-hidden />;
}

export function statusPillClass(status: TestStatus): string {
  if (status === "success") return "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300";
  if (status === "error") return "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300";
  if (status === "pending") return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300";
  return "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400";
}

export function StatusPill({ status, message }: { status: TestStatus; message?: string }) {
  return (
    <span className={"inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold " + statusPillClass(status)}>
      <StatusIcon status={status} />
      {message ? <span>{message}</span> : null}
    </span>
  );
}
