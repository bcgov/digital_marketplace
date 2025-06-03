import * as React from "react";

import { createPlatePlugin } from "@udecode/plate/react";

import { FixedToolbar } from "../fixed-toolbar";
import { FixedToolbarButtons } from "../ui/fixed-toolbar-buttons";

export const FixedToolbarPlugin = createPlatePlugin({
  key: "fixed-toolbar",
  render: {
    beforeEditable: () => (
      <FixedToolbar>
        <FixedToolbarButtons />
      </FixedToolbar>
    )
  }
});
