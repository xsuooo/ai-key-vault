export const STORAGE_KEY = "ai-key-vault-configs-v1";
export const LEGACY_STORAGE_KEYS = ["ai-key-vault-configs", "ai-key-check-configs-v1"];
export const INTRO_SEEN_KEY = "ai-key-vault-intro-seen-v1";

type StorageReader = {
  getItem(key: string): string | null;
};

export type LoadConfigsResult<TConfig> = {
  configs: TConfig[];
  sourceKey?: string;
  legacyKeysToRemove: string[];
};

export function loadConfigsFromStorage<TConfig>(
  storage: StorageReader,
  normalize: (raw: string) => TConfig[],
): LoadConfigsResult<TConfig> {
  const primaryRaw = storage.getItem(STORAGE_KEY);
  if (primaryRaw !== null) {
    try {
      return {
        configs: normalize(primaryRaw),
        sourceKey: STORAGE_KEY,
        legacyKeysToRemove: [...LEGACY_STORAGE_KEYS],
      };
    } catch {
      // Corrupt current storage should not prevent recovery from legacy keys.
    }
  }

  for (const key of LEGACY_STORAGE_KEYS) {
    const raw = storage.getItem(key);
    if (raw === null) continue;

    try {
      const configs = normalize(raw);
      if (configs.length > 0) {
        return {
          configs,
          sourceKey: key,
          legacyKeysToRemove: [...LEGACY_STORAGE_KEYS],
        };
      }
    } catch {
      continue;
    }
  }

  return { configs: [], legacyKeysToRemove: [] };
}
