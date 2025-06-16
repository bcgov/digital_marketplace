import * as React from "react";

import { createPlatePlugin, useEditorReadOnly } from "@udecode/plate/react";

import { FixedToolbar } from "../fixed-toolbar";
import {
  FixedToolbarButtons,
  FixedToolbarButtonsProps
} from "../ui/fixed-toolbar-buttons";

// Create a function to generate a configured plugin
export function createFixedToolbarPlugin(
  toolbarMode: FixedToolbarButtonsProps["toolbarMode"] = "full"
) {
  return createPlatePlugin({
    key: "fixed-toolbar",
    options: { toolbarMode },
    render: {
      beforeEditable: () => {
        const readOnly = useEditorReadOnly();

        if (readOnly) {
          return null;
        }

        return (
          <FixedToolbar>
            <FixedToolbarButtons toolbarMode={toolbarMode} />
          </FixedToolbar>
        );
      }
    }
  });
}

// Export the key for consistency
export const FixedToolbarPlugin = {
  key: "fixed-toolbar"
};
