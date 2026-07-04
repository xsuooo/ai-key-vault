import { NextRequest, NextResponse } from "next/server";

import { runOpenAIBenchmarkRound } from "@/lib/openai-proxy";
import type { OpenAIProxyBenchmarkRoundRequest } from "@/lib/openai-proxy-types";
import { normalizeOpenAIBenchmarkRoundRequest } from "@/lib/openai-proxy-request";
import { makeErrorDetail } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Partial<OpenAIProxyBenchmarkRoundRequest>;
  try {
    body = (await request.json()) as Partial<OpenAIProxyBenchmarkRoundRequest>;
  } catch {
    return NextResponse.json({ message: "请求体不是合法 JSON" }, { status: 400 });
  }

  try {
    return NextResponse.json(await runOpenAIBenchmarkRound(normalizeOpenAIBenchmarkRoundRequest(body)));
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: makeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
