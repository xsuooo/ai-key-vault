export type ConfigCardViewMode = "list" | "grid" | "compact";

export type ConfigCardModeCapabilities = {
  canSelect: boolean;
  hasPrimaryActions: boolean;
  hasSecondaryActions: boolean;
  hasExpandableDetails: boolean;
};

const FULL_CAPABILITIES: ConfigCardModeCapabilities = {
  canSelect: true,
  hasPrimaryActions: true,
  hasSecondaryActions: true,
  hasExpandableDetails: true,
};

export function getConfigCardModeCapabilities(mode: ConfigCardViewMode): ConfigCardModeCapabilities {
  if (mode === "compact") return FULL_CAPABILITIES;
  return FULL_CAPABILITIES;
}

export function isCompactConfigCardMode(mode: ConfigCardViewMode): boolean {
  return mode === "compact";
}
