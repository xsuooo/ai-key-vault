"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { normalizeStoredConfigs } from "./normalizers";
import {
  INTRO_SEEN_KEY,
  STORAGE_KEY,
  loadConfigsFromStorage,
} from "./storage";

import { createUISlice } from "./slices/ui-slice";
import { createConfigSlice } from "./slices/config-slice";
import { createTestSlice } from "./slices/test-slice";
import { createBenchmarkSlice } from "./slices/benchmark-slice";

import type { AppState } from "./slices/types";

export type { AppState };

export type { UIState, UIActions } from "./slices/ui-slice";
export type { ConfigState, ConfigActions } from "./slices/config-slice";
export type { TestState, TestActions } from "./slices/test-slice";
export type { BenchmarkState, BenchmarkActions } from "./slices/benchmark-slice";

let storeInitialized = false;
let localStorageDebounceId: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>()(subscribeWithSelector((...args) => ({
  ...createUISlice(...args),
  ...createConfigSlice(...args),
  ...createTestSlice(...args),
  ...createBenchmarkSlice(...args),

  initStore: () => {
    if (storeInitialized) return;
    storeInitialized = true;

    const set = args[0];
    const {
      configs: restoredConfigs,
      sourceKey,
      legacyKeysToRemove,
    } = loadConfigsFromStorage(localStorage, normalizeStoredConfigs);
    if (restoredConfigs.length > 0) {
      set({ configs: restoredConfigs } as Partial<AppState>);
    }
    if (sourceKey && sourceKey !== STORAGE_KEY) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restoredConfigs));
    }
    for (const key of legacyKeysToRemove) {
      localStorage.removeItem(key);
    }

    const seen = localStorage.getItem(INTRO_SEEN_KEY) === "1";
    set({ introExpanded: !seen } as Partial<AppState>);
    if (!seen) {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    }

    useAppStore.subscribe(
      (state) => state.configs,
      (configs) => {
        if (localStorageDebounceId !== null) {
          clearTimeout(localStorageDebounceId);
        }
        localStorageDebounceId = setTimeout(() => {
          localStorageDebounceId = null;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
        }, 800);
      }
    );
  }
})));
