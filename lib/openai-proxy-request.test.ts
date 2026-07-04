import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeOpenAITestRequest } from "./openai-proxy-request.ts";

describe("OpenAI proxy request normalization", () => {
  it("keeps advanced test options from the API request body", () => {
    const request = normalizeOpenAITestRequest({
      baseUrl: "https://api.example.com/v1",
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      prompt: "Say pong",
      maxTokens: 17,
      temperature: 0.25,
    });

    assert.equal(request.maxTokens, 17);
    assert.equal(request.temperature, 0.25);
  });
});
