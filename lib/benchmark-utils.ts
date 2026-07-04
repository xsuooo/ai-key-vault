import {
  uniqueStrings,
  isRecord,
  cleanOneLineText,
  safeDateToIso,
  firstNonEmptyString,
  medianOf,
  averageOf,
  computeStability
} from "@/lib/utils";
import type {
  ModelBenchmarkResult,
  FinishedModelBenchmarkResult,
  BenchmarkSummary,
  BenchmarkRoundDetail,
  KeyConfig
} from "@/types/index";
// Constants

export const DEFAULT_BENCHMARK_ROUNDS = 2;

export const MODEL_TAG_RULES: { tag: string; patterns: RegExp[] }[] = [
  { tag: "image", patterns: [/\bimage\b/i, /\bvision\b/i, /\bvl\b/i, /\bflux\b/i, /\bsd(?:xl)?\b/i, /stable[- ]?diffusion/i] },
  { tag: "embedding", patterns: [/embedding/i, /\bembed\b/i, /text-embedding/i, /\bbge\b/i, /\bmxbai\b/i, /\be5\b/i] },
  { tag: "thinking", patterns: [/thinking/i, /\breason/i, /\bthink\b/i, /\bo1\b/i, /\bo3\b/i, /\bo4\b/i, /\br1\b/i] },
  { tag: "coding", patterns: [/\bcoder\b/i, /\bcoding\b/i, /\bcode\b/i, /devstral/i] },
  { tag: "audio", patterns: [/\baudio\b/i, /\bspeech\b/i, /\btts\b/i, /whisper/i, /transcri/i] },
  { tag: "rerank", patterns: [/rerank/i, /reranker/i] },
  { tag: "moderation", patterns: [/moderation/i] }
];
// Tag helpers

export function inferModelTags(model: string): string[] {
  const normalized = model.trim();
  if (!normalized) return [];

  const out: string[] = [];
  for (const rule of MODEL_TAG_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      out.push(rule.tag);
    }
  }

  return uniqueStrings(out);
}

export function getTagClassName(tag: string): string {
  if (tag === "image") return "border-rose-200 bg-rose-50 text-rose-700";
  if (tag === "embedding") return "border-sky-200 bg-sky-50 text-sky-700";
  if (tag === "thinking") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tag === "coding") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tag === "audio") return "border-violet-200 bg-violet-50 text-violet-700";
  if (tag === "rerank") return "border-zinc-300 bg-zinc-100 text-zinc-700";
  if (tag === "moderation") return "border-red-200 bg-red-50 text-red-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}
// Round detail normalisation

export function normalizeBenchmarkRoundDetail(input: unknown, index = 0): BenchmarkRoundDetail | undefined {
  if (!isRecord(input)) return undefined;

  const roundRaw = typeof input.round === "number" && Number.isFinite(input.round) ? Math.round(input.round) : index + 1;
  const ok = typeof input.ok === "boolean" ? input.ok : typeof input.elapsedMs === "number" && Number.isFinite(input.elapsedMs);
  const elapsedMs =
    typeof input.elapsedMs === "number" && Number.isFinite(input.elapsedMs) ? Math.max(0, Math.round(input.elapsedMs)) : undefined;
  const firstTokenMs =
    typeof input.firstTokenMs === "number" && Number.isFinite(input.firstTokenMs)
      ? Math.max(0, Math.round(input.firstTokenMs))
      : undefined;
  const error = typeof input.error === "string" && input.error.trim() ? cleanOneLineText(input.error, 260) : undefined;

  return {
    round: Math.max(1, roundRaw),
    ok,
    elapsedMs,
    firstTokenMs,
    error
  };
}

export function buildRoundDetailsFromSamples(
  rounds: number,
  elapsedSamples: number[],
  firstTokenSamples: number[] = [],
  errors: string[] = []
): BenchmarkRoundDetail[] {
  const out: BenchmarkRoundDetail[] = [];

  for (let index = 0; index < rounds; index += 1) {
    const elapsedMs = elapsedSamples[index];
    const firstTokenMs = firstTokenSamples[index];
    const error = errors[index];

    out.push({
      round: index + 1,
      ok: typeof elapsedMs === "number",
      elapsedMs,
      firstTokenMs: typeof firstTokenMs === "number" ? firstTokenMs : undefined,
      error: typeof elapsedMs === "number" ? undefined : error
    });
  }

  return out;
}

export function getBenchmarkRoundDetails(result?: ModelBenchmarkResult): BenchmarkRoundDetail[] {
  if (!result?.speed) return [];

  if (Array.isArray(result.speed.roundDetails) && result.speed.roundDetails.length > 0) {
    return [...result.speed.roundDetails].sort((left, right) => left.round - right.round);
  }

  return buildRoundDetailsFromSamples(
    result.speed.rounds,
    result.speed.samplesMs,
    result.speed.firstTokenSamplesMs,
    []
  );
}
// Speed / result normalisation

export function normalizeBenchmarkSpeed(input: unknown): FinishedModelBenchmarkResult["speed"] | undefined {
  if (!isRecord(input)) return undefined;

  const roundDetails = Array.isArray(input.roundDetails)
    ? input.roundDetails
        .map((item, index) => normalizeBenchmarkRoundDetail(item, index))
        .filter((item): item is BenchmarkRoundDetail => Boolean(item))
        .sort((left, right) => left.round - right.round)
    : [];
  const successRate =
    typeof input.successRate === "number" && Number.isFinite(input.successRate) ? Math.min(1, Math.max(0, input.successRate)) : 0;
  const samplesMs = Array.isArray(input.samplesMs)
    ? input.samplesMs
        .map((item) => (typeof item === "number" && Number.isFinite(item) ? Math.max(0, Math.round(item)) : 0))
        .filter((item) => item > 0)
    : roundDetails.map((item) => item.elapsedMs).filter((item): item is number => typeof item === "number");
  const firstTokenSamplesMs = Array.isArray(input.firstTokenSamplesMs)
    ? input.firstTokenSamplesMs
        .map((item) => (typeof item === "number" && Number.isFinite(item) ? Math.max(0, Math.round(item)) : 0))
        .filter((item) => item > 0)
    : roundDetails.map((item) => item.firstTokenMs).filter((item): item is number => typeof item === "number");
  const rounds = typeof input.rounds === "number" && Number.isFinite(input.rounds) ? Math.max(1, Math.round(input.rounds)) : roundDetails.length || samplesMs.length;
  const medianMsCandidate =
    typeof input.medianMs === "number" && Number.isFinite(input.medianMs) ? Math.max(0, Math.round(input.medianMs)) : 0;
  const avgMsCandidate = typeof input.avgMs === "number" && Number.isFinite(input.avgMs) ? Math.max(0, Math.round(input.avgMs)) : 0;
  const medianMs = medianMsCandidate || (samplesMs.length > 0 ? medianOf(samplesMs) : 0);
  const avgMs = avgMsCandidate || (samplesMs.length > 0 ? averageOf(samplesMs) : 0);
  const stabilityMs =
    typeof input.stabilityMs === "number" && Number.isFinite(input.stabilityMs)
      ? Math.max(0, Math.round(input.stabilityMs))
      : computeStability(samplesMs);
  const firstTokenMedianMs =
    typeof input.firstTokenMedianMs === "number" && Number.isFinite(input.firstTokenMedianMs)
      ? Math.max(0, Math.round(input.firstTokenMedianMs))
      : firstTokenSamplesMs.length > 0
        ? medianOf(firstTokenSamplesMs)
        : undefined;
  const firstTokenAvgMs =
    typeof input.firstTokenAvgMs === "number" && Number.isFinite(input.firstTokenAvgMs)
      ? Math.max(0, Math.round(input.firstTokenAvgMs))
      : firstTokenSamplesMs.length > 0
        ? averageOf(firstTokenSamplesMs)
        : undefined;

  if (!rounds || !medianMs || !avgMs) return undefined;

  return {
    rounds,
    medianMs,
    avgMs,
    successRate: successRate || (samplesMs.length > 0 ? Math.min(1, samplesMs.length / rounds) : 0),
    stabilityMs,
    samplesMs,
    firstTokenMedianMs,
    firstTokenAvgMs,
    firstTokenSamplesMs: firstTokenSamplesMs.length > 0 ? firstTokenSamplesMs : undefined,
    roundDetails: roundDetails.length > 0 ? roundDetails : buildRoundDetailsFromSamples(rounds, samplesMs, firstTokenSamplesMs)
  };
}

export function normalizeFinishedBenchmarkResult(
  input: unknown,
  modelKey: string
): FinishedModelBenchmarkResult | undefined {
  if (!isRecord(input)) return undefined;

  const status = input.status;
  if (status !== "success" && status !== "error") return undefined;

  const model = typeof input.model === "string" && input.model.trim() ? input.model.trim() : modelKey.trim();
  if (!model) return undefined;

  const tags = Array.isArray(input.tags) ? uniqueStrings(input.tags.map((item) => String(item))) : inferModelTags(model);
  const speed = normalizeBenchmarkSpeed(input.speed);
  const detail = typeof input.detail === "string" && input.detail.trim() ? cleanOneLineText(input.detail, 360) : "";
  const testedAt = safeDateToIso(input.testedAt);

  if (!testedAt) return undefined;

  return {
    status,
    model,
    tags,
    speed,
    detail: detail || undefined,
    testedAt
  };
}

export function normalizeStoredBenchmarks(input: unknown): KeyConfig["benchmarks"] | undefined {
  const out: Record<string, FinishedModelBenchmarkResult> = {};
  const entries = Array.isArray(input)
    ? input
        .map((item, index) => {
          const model = isRecord(item) ? firstNonEmptyString(item.model, item.name, item.id) : "";
          return model ? [model || String(index), item] : null;
        })
        .filter((item): item is [string, unknown] => Boolean(item))
    : isRecord(input)
      ? Object.entries(input)
      : [];

  for (const [modelKey, value] of entries) {
    const normalized = normalizeFinishedBenchmarkResult(value, modelKey);
    if (!normalized) continue;
    out[normalized.model] = normalized;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}
// Benchmark metadata helpers

export function isLikelyChatBenchmarkable(model: string, tags?: string[]): boolean {
  const normalized = model.trim().toLowerCase();
  const resolvedTags = tags || inferModelTags(model);

  if (resolvedTags.includes("embedding") || resolvedTags.includes("image") || resolvedTags.includes("rerank") || resolvedTags.includes("moderation")) {
    return false;
  }

  return !/(whisper|transcri|text-embedding|embedding-|rerank|stable-diffusion|sdxl|flux|moderation)/i.test(normalized);
}

export function getBenchmarkRounds(input: string | number): number {
  const numeric = typeof input === "number" ? input : Number.parseInt(String(input).trim(), 10);
  if (!Number.isFinite(numeric)) return DEFAULT_BENCHMARK_ROUNDS;
  return Math.min(3, Math.max(1, Math.round(numeric)));
}

export function defaultModelBenchmarkResult(model: string): ModelBenchmarkResult {
  return { status: "idle", model, tags: inferModelTags(model) };
}

export function benchmarkStatusLabel(result: ModelBenchmarkResult): string {
  if (result.status === "pending") return "测试中...";
  if (result.status === "success") return "已测试";
  if (result.status === "error") return "测试失败";
  return "未测试";
}
// Summary builders

export function collectFinishedBenchmarks(item: KeyConfig, runtimeBenchmarks?: Record<string, ModelBenchmarkResult>) {
  const merged = {
    ...(item.benchmarks || {}),
    ...(runtimeBenchmarks || {})
  };

  return Object.values(merged).filter(
    (benchmark): benchmark is FinishedModelBenchmarkResult => benchmark.status === "success"
  );
}

export function buildBenchmarkSummary(
  configId: string,
  results: FinishedModelBenchmarkResult[],
  fallbackRounds = DEFAULT_BENCHMARK_ROUNDS,
  scopeModels: string[] = []
): BenchmarkSummary | null {
  const modelList = uniqueStrings(scopeModels.length > 0 ? scopeModels : results.map((item) => item.model));
  if (results.length === 0 && modelList.length === 0) return null;

  const successfulBenchmarks = results.filter((item) => item.status === "success" && item.speed);
  const fastest = pickFastestBenchmark(successfulBenchmarks);
  const quickestFirstToken = pickQuickestFirstTokenBenchmark(successfulBenchmarks);
  const mostStable = pickMostStableBenchmark(successfulBenchmarks);
  const recommended = pickRecommendedBenchmark(successfulBenchmarks);
  const finishedAt = [...results]
    .map((item) => item.testedAt)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

  return {
    configId,
    rounds: Math.max(
      1,
      ...results.map((item) => item.speed?.rounds || 0),
      fallbackRounds
    ),
    models: modelList,
    totalModels: modelList.length,
    successModels: successfulBenchmarks.length,
    fastestModel: fastest?.model,
    fastestMedianMs: fastest?.speed?.medianMs,
    quickestFirstTokenModel: quickestFirstToken?.model,
    quickestFirstTokenMs: quickestFirstToken?.speed?.firstTokenMedianMs,
    mostStableModel: mostStable?.model,
    stabilityMs: mostStable?.speed?.stabilityMs,
    recommendedModel: recommended?.model,
    finishedAt: finishedAt || new Date().toISOString()
  };
}
// Benchmark pickers

export function pickFastestBenchmark(benchmarks: FinishedModelBenchmarkResult[]): FinishedModelBenchmarkResult | undefined {
  return [...benchmarks]
    .filter((item) => typeof item.speed?.medianMs === "number")
    .sort((left, right) => (left.speed?.medianMs || Number.POSITIVE_INFINITY) - (right.speed?.medianMs || Number.POSITIVE_INFINITY))[0];
}

export function pickQuickestFirstTokenBenchmark(benchmarks: FinishedModelBenchmarkResult[]): FinishedModelBenchmarkResult | undefined {
  return [...benchmarks]
    .filter((item) => typeof item.speed?.firstTokenMedianMs === "number")
    .sort(
      (left, right) =>
        (left.speed?.firstTokenMedianMs || Number.POSITIVE_INFINITY) -
        (right.speed?.firstTokenMedianMs || Number.POSITIVE_INFINITY)
    )[0];
}

export function pickMostStableBenchmark(benchmarks: FinishedModelBenchmarkResult[]): FinishedModelBenchmarkResult | undefined {
  return [...benchmarks]
    .filter((item) => typeof item.speed?.stabilityMs === "number")
    .sort((left, right) => (left.speed?.stabilityMs || Number.POSITIVE_INFINITY) - (right.speed?.stabilityMs || Number.POSITIVE_INFINITY))[0];
}

export function pickRecommendedBenchmark(benchmarks: FinishedModelBenchmarkResult[]): FinishedModelBenchmarkResult | undefined {
  const ranked = [...benchmarks]
    .filter((item) => item.speed)
    .sort((left, right) => {
      const leftScore = (left.speed?.successRate || 0) * 100000 - (left.speed?.medianMs || 0) - (left.speed?.stabilityMs || 0) * 2;
      const rightScore = (right.speed?.successRate || 0) * 100000 - (right.speed?.medianMs || 0) - (right.speed?.stabilityMs || 0) * 2;
      return rightScore - leftScore;
    });

  return ranked[0];
}
