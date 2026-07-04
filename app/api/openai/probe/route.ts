import { NextRequest, NextResponse } from "next/server";

import { runOpenAIProbe } from "@/lib/openai-proxy";
import type { OpenAIProxyProbeRequest } from "@/lib/openai-proxy-types";
import { normalizeOpenAIProbeRequest } from "@/lib/openai-proxy-request";
import { makeErrorDetail } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Partial<OpenAIProxyProbeRequest>;
  try {
    body = (await request.json()) as Partial<OpenAIProxyProbeRequest>;
  } catch {
    return NextResponse.json({ message: "请求体不是合法 JSON" }, { status: 400 });
  }

  try {
    return NextResponse.json(await runOpenAIProbe(normalizeOpenAIProbeRequest(body)));
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        result: {
          status: "error",
          supportedModels: [],
          detail: makeErrorDetail(error),
          testedAt: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
