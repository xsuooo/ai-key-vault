import { NextRequest, NextResponse } from "next/server";

import { runOpenAITest } from "@/lib/openai-proxy";
import type { OpenAIProxyTestRequest } from "@/lib/openai-proxy-types";
import { normalizeOpenAITestRequest } from "@/lib/openai-proxy-request";
import { FAIL_TEXT, makeErrorDetail } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Partial<OpenAIProxyTestRequest>;
  try {
    body = (await request.json()) as Partial<OpenAIProxyTestRequest>;
  } catch {
    return NextResponse.json({ message: "请求体不是合法 JSON" }, { status: 400 });
  }

  try {
    return NextResponse.json(await runOpenAITest(normalizeOpenAITestRequest(body)));
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        result: {
          status: "error",
          message: FAIL_TEXT,
          detail: makeErrorDetail(error),
          testedAt: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
