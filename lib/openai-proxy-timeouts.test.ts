import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  PROBE_CLIENT_TIMEOUT_MS,
  PROBE_FALLBACK_MAX_CANDIDATES,
  getProbeWorstCaseTimeoutMs,
} from "./openai-proxy-timeouts.ts";

describe("OpenAI probe timeout budget", () => {
  it("keeps fallback probing inside the client request timeout", () => {
    assert.ok(PROBE_FALLBACK_MAX_CANDIDATES > 0);
    assert.ok(getProbeWorstCaseTimeoutMs() < PROBE_CLIENT_TIMEOUT_MS);
  });
});
