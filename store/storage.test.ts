import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  LEGACY_STORAGE_KEYS,
  STORAGE_KEY,
  loadConfigsFromStorage,
} from "./storage.ts";

type StoredConfig = { id: string };

function makeStorage(seed: Record<string, string>) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

function normalize(raw: string): StoredConfig[] {
  return JSON.parse(raw) as StoredConfig[];
}

describe("config storage migration", () => {
  it("trusts an existing primary key even when it stores an empty list", () => {
    const storage = makeStorage({
      [STORAGE_KEY]: "[]",
      [LEGACY_STORAGE_KEYS[0]]: JSON.stringify([{ id: "stale" }]),
    });

    const result = loadConfigsFromStorage(storage, normalize);

    assert.deepEqual(result.configs, []);
    assert.equal(result.sourceKey, STORAGE_KEY);
    assert.deepEqual(result.legacyKeysToRemove, LEGACY_STORAGE_KEYS);
  });

  it("loads legacy configs only when the primary key is absent", () => {
    const storage = makeStorage({
      [LEGACY_STORAGE_KEYS[0]]: JSON.stringify([{ id: "legacy" }]),
    });

    const result = loadConfigsFromStorage(storage, normalize);

    assert.deepEqual(result.configs, [{ id: "legacy" }]);
    assert.equal(result.sourceKey, LEGACY_STORAGE_KEYS[0]);
    assert.deepEqual(result.legacyKeysToRemove, LEGACY_STORAGE_KEYS);
  });
});
