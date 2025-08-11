import { BaseListPlugin } from "@platejs/list";
import { KEYS } from "platejs";

import { BaseIndentKit } from "./indent-base-kit";


export const BaseListKit = [
  ...BaseIndentKit,
  BaseListPlugin.configure({
    inject: {
      targetPlugins: [
        ...KEYS.heading,
        KEYS.p,
        KEYS.blockquote,
        KEYS.codeBlock,
        KEYS.toggle
      ]
    }
  })
];
