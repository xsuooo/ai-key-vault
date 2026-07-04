import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  assertPublicOpenAIBaseUrl,
  isBlockedNetworkAddress,
  resolvePublicOpenAIBaseUrl,
} from "./server-url-guard.ts";

describe("server URL guard", () => {
  it("allows HTTPS URLs that resolve to public addresses", async () => {
    const url = await assertPublicOpenAIBaseUrl("https://api.example.com/v1", {
      allowPrivateNetwork: false,
      allowedHosts: [],
      resolveAddresses: async () => ["8.8.8.8"],
    });

    assert.equal(url, "https://api.example.com/v1");
  });

  it("rejects plain HTTP unless private-network override is enabled", async () => {
    await assert.rejects(
      () =>
        assertPublicOpenAIBaseUrl("http://api.example.com/v1", {
          allowPrivateNetwork: false,
          allowedHosts: [],
          resolveAddresses: async () => ["8.8.8.8"],
        }),
      /HTTPS/,
    );
  });

  it("rejects hostnames resolving to private addresses", async () => {
    await assert.rejects(
      () =>
        assertPublicOpenAIBaseUrl("https://relay.example.com/v1", {
          allowPrivateNetwork: false,
          allowedHosts: [],
          resolveAddresses: async () => ["10.0.0.8"],
        }),
      /private|internal|reserved/i,
    );
  });

  it("returns the validated public addresses for callers that need pinned fetch", async () => {
    const result = await resolvePublicOpenAIBaseUrl("https://relay.example.com/v1", {
      allowPrivateNetwork: false,
      allowedHosts: [],
      resolveAddresses: async () => ["8.8.8.8", "1.1.1.1"],
    });

    assert.equal(result.url, "https://relay.example.com/v1");
    assert.deepEqual(result.pinnedAddresses, ["8.8.8.8", "1.1.1.1"]);
  });

  it("allows explicitly whitelisted hosts", async () => {
    const url = await assertPublicOpenAIBaseUrl("http://localhost:11434/v1", {
      allowPrivateNetwork: false,
      allowedHosts: ["localhost"],
      resolveAddresses: async () => ["127.0.0.1"],
    });

    assert.equal(url, "http://localhost:11434/v1");
  });

  it("classifies common non-public address ranges", () => {
    assert.equal(isBlockedNetworkAddress("127.0.0.1"), true);
    assert.equal(isBlockedNetworkAddress("169.254.169.254"), true);
    assert.equal(isBlockedNetworkAddress("192.168.1.10"), true);
    assert.equal(isBlockedNetworkAddress("::1"), true);
    assert.equal(isBlockedNetworkAddress("8.8.8.8"), false);
  });
});
