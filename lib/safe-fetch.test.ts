import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { resolveSafeOpenAIBaseUrl } from "./safe-fetch.ts";

describe("safe OpenAI fetch setup", () => {
  it("pins a dispatcher when a public hostname was DNS-validated", async () => {
    const safeBaseUrl = await resolveSafeOpenAIBaseUrl("https://relay.example.com/v1", {
      allowPrivateNetwork: false,
      allowedHosts: [],
      resolveAddresses: async () => ["8.8.8.8"],
    });

    assert.equal(safeBaseUrl.url, "https://relay.example.com/v1");
    assert.ok(safeBaseUrl.dispatcher);
  });

  it("does not pin explicitly allowed private-network URLs", async () => {
    const safeBaseUrl = await resolveSafeOpenAIBaseUrl("http://localhost:11434/v1", {
      allowPrivateNetwork: true,
      allowedHosts: [],
      resolveAddresses: async () => ["127.0.0.1"],
    });

    assert.equal(safeBaseUrl.url, "http://localhost:11434/v1");
    assert.equal(safeBaseUrl.dispatcher, undefined);
  });
});
