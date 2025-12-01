"use client";

import { ListPlugin } from "@platejs/list/react";
import { KEYS } from "platejs";

import { IndentKit } from "front-end/lib/components/platejs/components/editor/plugins/indent-kit";


export const ListKit = [
  ...IndentKit,
  ListPlugin.configure({
    inject: {
      targetPlugins: [
        ...KEYS.heading,
        KEYS.p,
        KEYS.blockquote,
        KEYS.codeBlock,
        KEYS.toggle,
        KEYS.img
      ]
    }
  })
];
