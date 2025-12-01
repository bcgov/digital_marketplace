"use client";

import * as React from "react";
import { createPlatePlugin } from "platejs/react";

import { FixedToolbar } from "front-end/lib/components/platejs/ui/fixed-toolbar";
import { FixedToolbarButtons } from "front-end/lib/components/platejs/ui/fixed-toolbar-buttons";

export const FixedToolbarKit = [
  createPlatePlugin({
    key: "fixed-toolbar",
    render: {
      beforeEditable: () => (
        <FixedToolbar>
          <FixedToolbarButtons />
        </FixedToolbar>
      )
    }
  })
];
