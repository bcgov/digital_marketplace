import * as React from "react";

import {
  type SlateElementProps,
  type SlateLeafProps,
  type TCodeBlockElement,
  SlateElement,
  SlateLeaf
} from "platejs";

export function CodeBlockElementStatic(
  props: SlateElementProps<TCodeBlockElement>
) {
  return (
    <SlateElement
      className="tw:py-1 tw:**:[.hljs-addition]:bg-[#f0fff4] tw:**:[.hljs-addition]:text-[#22863a] tw:dark:**:[.hljs-addition]:bg-[#3c5743] tw:dark:**:[.hljs-addition]:text-[#ceead5] tw:**:[.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable]:text-[#005cc5] tw:dark:**:[.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable]:text-[#6596cf] tw:**:[.hljs-built\\\\_in,.hljs-symbol]:text-[#e36209] tw:dark:**:[.hljs-built\\\\_in,.hljs-symbol]:text-[#c3854e] tw:**:[.hljs-bullet]:text-[#735c0f] tw:**:[.hljs-comment,.hljs-code,.hljs-formula]:text-[#6a737d] tw:dark:**:[.hljs-comment,.hljs-code,.hljs-formula]:text-[#6a737d] tw:**:[.hljs-deletion]:bg-[#ffeef0] tw:**:[.hljs-deletion]:text-[#b31d28] tw:dark:**:[.hljs-deletion]:bg-[#473235] tw:dark:**:[.hljs-deletion]:text-[#e7c7cb] tw:**:[.hljs-emphasis]:italic tw:**:[.hljs-keyword,.hljs-doctag,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language\\\\_]:text-[#d73a49] tw:dark:**:[.hljs-keyword,.hljs-doctag,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language\\\\_]:text-[#ee6960] tw:**:[.hljs-name,.hljs-quote,.hljs-selector-tag,.hljs-selector-pseudo]:text-[#22863a] tw:dark:**:[.hljs-name,.hljs-quote,.hljs-selector-tag,.hljs-selector-pseudo]:text-[#36a84f] tw:**:[.hljs-regexp,.hljs-string,.hljs-meta_.hljs-string]:text-[#032f62] tw:dark:**:[.hljs-regexp,.hljs-string,.hljs-meta_.hljs-string]:text-[#3593ff] tw:**:[.hljs-section]:font-bold tw:**:[.hljs-section]:text-[#005cc5] tw:dark:**:[.hljs-section]:text-[#61a5f2] tw:**:[.hljs-strong]:font-bold tw:**:[.hljs-title,.hljs-title.class\\\\_,.hljs-title.class\\\\_.inherited\\\\_\\\\_,.hljs-title.function\\\\_]:text-[#6f42c1] tw:dark:**:[.hljs-title,.hljs-title.class\\\\_,.hljs-title.class\\\\_.inherited\\\\_\\\\_,.hljs-title.function\\\\_]:text-[#a77bfa]"
      {...props}>
      <div className="tw:relative tw:rounded-md tw:bg-muted/50">
        <pre className="tw:overflow-x-auto tw:p-8 tw:pr-4 tw:font-mono tw:text-sm tw:leading-[normal] tw:[tab-size:2] tw:print:break-inside-avoid">
          <code>{props.children}</code>
        </pre>
      </div>
    </SlateElement>
  );
}

export function CodeLineElementStatic(props: SlateElementProps) {
  return <SlateElement {...props} />;
}

export function CodeSyntaxLeafStatic(props: SlateLeafProps) {
  const tokenClassName = props.leaf.className as string;

  return <SlateLeaf className={tokenClassName} {...props} />;
}
