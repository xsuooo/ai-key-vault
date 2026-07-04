"use client";

import type { UIState, UIActions } from "./ui-slice";
import type { ConfigState, ConfigActions } from "./config-slice";
import type { TestState, TestActions } from "./test-slice";
import type { BenchmarkState, BenchmarkActions } from "./benchmark-slice";
// Combined store types

export interface StoreOnlyActions {
  initStore: () => void;
}

export type AppState = UIState & ConfigState & TestState & BenchmarkState
  & UIActions & ConfigActions & TestActions & BenchmarkActions
  & StoreOnlyActions;

// Re-export for convenience
export type {
  UIState,
  UIActions,
  ConfigState,
  ConfigActions,
  TestState,
  TestActions,
  BenchmarkState,
  BenchmarkActions
};
