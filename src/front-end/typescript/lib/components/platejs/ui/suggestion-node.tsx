// 'use client';

// import * as React from 'react';

// import type { TSuggestionData, TSuggestionText } from 'platejs';
// import type { PlateLeafProps, RenderNodeWrapper } from 'platejs/react';

// import { CornerDownLeftIcon } from 'lucide-react';
// import { PlateLeaf, useEditorPlugin, usePluginOption } from 'platejs/react';

// import { cn } from './utils';
// import {
//   type SuggestionConfig,
//   suggestionPlugin,
// } from 'src/front-end/typescript/lib/components/platejs/components/editor/plugins/suggestion-kit';

// export function SuggestionLeaf(props: PlateLeafProps<TSuggestionText>) {
//   const { api, setOption } = useEditorPlugin(suggestionPlugin);
//   const leaf = props.leaf;

//   const leafId: string = api.suggestion.nodeId(leaf) ?? '';
//   const activeSuggestionId = usePluginOption(suggestionPlugin, 'activeId');
//   const hoverSuggestionId = usePluginOption(suggestionPlugin, 'hoverId');
//   const dataList = api.suggestion.dataList(leaf);

//   const hasRemove = dataList.some((data) => data.type === 'remove');
//   const hasActive = dataList.some((data) => data.id === activeSuggestionId);
//   const hasHover = dataList.some((data) => data.id === hoverSuggestionId);

//   const diffOperation = { type: hasRemove ? 'delete' : 'insert' } as const;

//   const Component = ({ delete: 'del', insert: 'ins', update: 'span' } as const)[
//     diffOperation.type
//   ];

//   return (
//     <PlateLeaf
//       {...props}
//       as={Component}
//       className={cn(
//         "tw:bg-emerald-100 tw:text-emerald-700 tw:no-underline tw:transition-colors tw:duration-200",
//         (hasActive || hasHover) && "tw:bg-emerald-200/80",
//         hasRemove && "tw:bg-red-100 tw:text-red-700",
//         (hasActive || hasHover) && hasRemove && "tw:bg-red-200/80 tw:no-underline"
//       )}
//       attributes={{
//         ...props.attributes,
//         onMouseEnter: () => setOption('hoverId', leafId),
//         onMouseLeave: () => setOption('hoverId', null),
//       }}
//     >
//       {props.children}
//     </PlateLeaf>
//   );
// }

// export const SuggestionLineBreak: RenderNodeWrapper<SuggestionConfig> = ({
//   api,
//   element,
// }) => {
//   if (!api.suggestion.isBlockSuggestion(element)) return;

//   const suggestionData = element.suggestion;

//   if (!suggestionData?.isLineBreak) return;

//   return function Component({ children }) {
//     return (
//       <React.Fragment>
//         {children}
//         <SuggestionLineBreakContent suggestionData={suggestionData} />
//       </React.Fragment>
//     );
//   };
// };

// function SuggestionLineBreakContent({
//   suggestionData,
// }: {
//   suggestionData: TSuggestionData;
// }) {
//   const { type } = suggestionData;
//   const isRemove = type === 'remove';
//   const isInsert = type === 'insert';

//   const activeSuggestionId = usePluginOption(suggestionPlugin, 'activeId');
//   const hoverSuggestionId = usePluginOption(suggestionPlugin, 'hoverId');

//   const isActive = activeSuggestionId === suggestionData.id;
//   const isHover = hoverSuggestionId === suggestionData.id;

//   const spanRef = React.useRef<HTMLSpanElement>(null);

//   return (
//     <span
//       ref={spanRef}
//       className={cn(
//         "tw:absolute tw:border-b-2 tw:border-b-brand/[.24] tw:bg-brand/[.08] tw:text-justify tw:text-brand/80 tw:no-underline tw:transition-colors tw:duration-200",
//         isInsert &&
//           (isActive || isHover) &&
//           "tw:border-b-brand/[.60] tw:bg-brand/[.13]",
//         isRemove &&
//           "tw:border-b-gray-300 tw:bg-gray-300/25 tw:text-gray-400 tw:line-through",
//         isRemove &&
//           (isActive || isHover) &&
//           "tw:border-b-gray-500 tw:bg-gray-400/25 tw:text-gray-500 tw:no-underline"
//       )}
//       style={{
//         bottom: 4.5,
//         height: 21,
//       }}
//       contentEditable={false}
//     >
//       <CornerDownLeftIcon className="tw:mt-0.5 tw:size-4" />
//     </span>
//   );
// }
