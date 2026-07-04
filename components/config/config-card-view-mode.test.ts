import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getConfigCardModeCapabilities } from "./config-card-view-mode.ts";

describe("config card view mode capabilities", () => {
  it("keeps compact mode operational", () => {
    const compact = getConfigCardModeCapabilities("compact");

    assert.equal(compact.canSelect, true);
    assert.equal(compact.hasPrimaryActions, true);
    assert.equal(compact.hasSecondaryActions, true);
    assert.equal(compact.hasExpandableDetails, true);
  });

  it("keeps list and grid modes full-featured", () => {
    for (const mode of ["list", "grid"] as const) {
      const capabilities = getConfigCardModeCapabilities(mode);

      assert.equal(capabilities.canSelect, true);
      assert.equal(capabilities.hasPrimaryActions, true);
      assert.equal(capabilities.hasSecondaryActions, true);
      assert.equal(capabilities.hasExpandableDetails, true);
    }
  });
});
