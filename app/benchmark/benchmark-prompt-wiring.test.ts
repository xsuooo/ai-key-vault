import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));

describe("benchmark prompt wiring", () => {
  it("uses the shared store prompt that benchmark execution reads", () => {
    const pageSource = fs.readFileSync(path.join(testDir, "[id]", "page.tsx"), "utf8");

    assert.match(pageSource, /const benchmarkPrompt = useAppStore\(\(s\) => s\.benchmarkPrompt\)/);
    assert.match(pageSource, /const setBenchmarkPrompt = useAppStore\(\(s\) => s\.setBenchmarkPrompt\)/);
    assert.doesNotMatch(pageSource, /const\s+\[benchmarkPrompt,\s*setBenchmarkPrompt\]\s*=\s*useState/);
  });
});
