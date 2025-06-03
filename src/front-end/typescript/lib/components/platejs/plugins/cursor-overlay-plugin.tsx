import React from "react";
import { CursorOverlayPlugin } from "@udecode/plate-selection/react";

import { CursorOverlay } from "../ui/cursor-overlay";

export const cursorOverlayPlugin = CursorOverlayPlugin.configure({
  render: {
    afterEditable: () => <CursorOverlay />
  }
});
