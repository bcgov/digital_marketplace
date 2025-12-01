// 'use client';

// import * as React from 'react';

// import type { CreatePlateEditorOptions } from 'platejs/react';

// import { getCommentKey, getDraftCommentKey } from '@platejs/comment';
// import { CommentPlugin, useCommentId } from '@platejs/comment/react';
// import {
//   differenceInDays,
//   differenceInHours,
//   differenceInMinutes,
//   format,
// } from 'date-fns';
// import {
//   ArrowUpIcon,
//   CheckIcon,
//   MoreHorizontalIcon,
//   PencilIcon,
//   TrashIcon,
//   XIcon,
// } from 'lucide-react';
// import { type Value, KEYS, nanoid, NodeApi } from 'platejs';
// import {
//   Plate,
//   useEditorPlugin,
//   useEditorRef,
//   usePlateEditor,
//   usePluginOption,
// } from 'platejs/react';

// import { Avatar, AvatarFallback, AvatarImage } from './avatar';
// import { Button } from './button';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuGroup,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from './dropdown-menu';
// import { cn } from './utils';
// import { BasicMarksKit } from 'src/front-end/typescript/lib/components/platejs/components/editor/plugins/basic-marks-kit';
// import {
//   type TDiscussion,
//   discussionPlugin,
// } from 'src/front-end/typescript/lib/components/platejs/components/editor/plugins/discussion-kit';

// import { Editor, EditorContainer } from './editor';

// export interface TComment {
//   id: string;
//   contentRich: Value;
//   createdAt: Date;
//   discussionId: string;
//   isEdited: boolean;
//   userId: string;
// }

// export function Comment(props: {
//   comment: TComment;
//   discussionLength: number;
//   editingId: string | null;
//   index: number;
//   setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
//   documentContent?: string;
//   showDocumentContent?: boolean;
//   onEditorClick?: () => void;
// }) {
//   const {
//     comment,
//     discussionLength,
//     documentContent,
//     editingId,
//     index,
//     setEditingId,
//     showDocumentContent = false,
//     onEditorClick,
//   } = props;

//   const editor = useEditorRef();
//   const userInfo = usePluginOption(discussionPlugin, 'user', comment.userId);
//   const currentUserId = usePluginOption(discussionPlugin, 'currentUserId');

//   const resolveDiscussion = async (id: string) => {
//     const updatedDiscussions = editor
//       .getOption(discussionPlugin, 'discussions')
//       .map((discussion) => {
//         if (discussion.id === id) {
//           return { ...discussion, isResolved: true };
//         }
//         return discussion;
//       });
//     editor.setOption(discussionPlugin, 'discussions', updatedDiscussions);
//   };

//   const removeDiscussion = async (id: string) => {
//     const updatedDiscussions = editor
//       .getOption(discussionPlugin, 'discussions')
//       .filter((discussion) => discussion.id !== id);
//     editor.setOption(discussionPlugin, 'discussions', updatedDiscussions);
//   };

//   const updateComment = async (input: {
//     id: string;
//     contentRich: Value;
//     discussionId: string;
//     isEdited: boolean;
//   }) => {
//     const updatedDiscussions = editor
//       .getOption(discussionPlugin, 'discussions')
//       .map((discussion) => {
//         if (discussion.id === input.discussionId) {
//           const updatedComments = discussion.comments.map((comment) => {
//             if (comment.id === input.id) {
//               return {
//                 ...comment,
//                 contentRich: input.contentRich,
//                 isEdited: true,
//                 updatedAt: new Date(),
//               };
//             }
//             return comment;
//           });
//           return { ...discussion, comments: updatedComments };
//         }
//         return discussion;
//       });
//     editor.setOption(discussionPlugin, 'discussions', updatedDiscussions);
//   };

//   const { tf } = useEditorPlugin(CommentPlugin);

//   // Replace to your own backend or refer to potion
//   const isMyComment = currentUserId === comment.userId;

//   const initialValue = comment.contentRich;

//   const commentEditor = useCommentEditor(
//     {
//       id: comment.id,
//       value: initialValue,
//     },
//     [initialValue]
//   );

//   const onCancel = () => {
//     setEditingId(null);
//     commentEditor.tf.replaceNodes(initialValue, {
//       at: [],
//       children: true,
//     });
//   };

//   const onSave = () => {
//     void updateComment({
//       id: comment.id,
//       contentRich: commentEditor.children,
//       discussionId: comment.discussionId,
//       isEdited: true,
//     });
//     setEditingId(null);
//   };

//   const onResolveComment = () => {
//     void resolveDiscussion(comment.discussionId);
//     tf.comment.unsetMark({ id: comment.discussionId });
//   };

//   const isFirst = index === 0;
//   const isLast = index === discussionLength - 1;
//   const isEditing = editingId && editingId === comment.id;

//   const [hovering, setHovering] = React.useState(false);
//   const [dropdownOpen, setDropdownOpen] = React.useState(false);

//   return (
//     <div
//       onMouseEnter={() => setHovering(true)}
//       onMouseLeave={() => setHovering(false)}
//     >
//       <div className="tw:relative tw:flex tw:items-center">
//         <Avatar className="tw:size-5">
//           <AvatarImage alt={userInfo?.name} src={userInfo?.avatarUrl} />
//           <AvatarFallback>{userInfo?.name?.[0]}</AvatarFallback>
//         </Avatar>
//         <h4 className="tw:mx-2 tw:text-sm tw:leading-none tw:font-semibold">
//           {/* Replace to your own backend or refer to potion */}
//           {userInfo?.name}
//         </h4>

//         <div className="tw:text-xs tw:leading-none tw:text-muted-foreground/80">
//           <span className="tw:mr-1">
//             {formatCommentDate(new Date(comment.createdAt))}
//           </span>
//           {comment.isEdited && <span>(edited)</span>}
//         </div>

//         {isMyComment && (hovering || dropdownOpen) && (
//           <div className="tw:absolute tw:top-0 tw:right-0 tw:flex tw:space-x-1">
//             {index === 0 && (
//               <Button
//                 variant="ghost"
//                 className="tw:h-6 tw:p-1 tw:text-muted-foreground"
//                 onClick={onResolveComment}
//                 type="button"
//               >
//                 <CheckIcon className="tw:size-4" />
//               </Button>
//             )}

//             <CommentMoreDropdown
//               onCloseAutoFocus={() => {
//                 setTimeout(() => {
//                   commentEditor.tf.focus({ edge: 'endEditor' });
//                 }, 0);
//               }}
//               onRemoveComment={() => {
//                 if (discussionLength === 1) {
//                   tf.comment.unsetMark({ id: comment.discussionId });
//                   void removeDiscussion(comment.discussionId);
//                 }
//               }}
//               comment={comment}
//               dropdownOpen={dropdownOpen}
//               setDropdownOpen={setDropdownOpen}
//               setEditingId={setEditingId}
//             />
//           </div>
//         )}
//       </div>

//       {isFirst && showDocumentContent && (
//         <div className="tw:text-subtle-foreground tw:relative tw:mt-1 tw:flex tw:pl-[32px] tw:text-sm">
//           {discussionLength > 1 && (
//             <div className="tw:absolute tw:top-[5px] tw:left-3 tw:h-full tw:w-0.5 tw:shrink-0 tw:bg-muted" />
//           )}
//           <div className="tw:my-px tw:w-0.5 tw:shrink-0 tw:bg-highlight" />
//           {documentContent && <div className="tw:ml-2">{documentContent}</div>}
//         </div>
//       )}

//       <div className="tw:relative tw:my-1 tw:pl-[26px]">
//         {!isLast && (
//           <div className="tw:absolute tw:top-0 tw:left-3 tw:h-full tw:w-0.5 tw:shrink-0 tw:bg-muted" />
//         )}
//         <Plate readOnly={!isEditing} editor={commentEditor}>
//           <EditorContainer variant="comment">
//             <Editor
//               variant="comment"
//               className="tw:w-auto tw:grow"
//               onClick={() => onEditorClick?.()}
//             />

//             {isEditing && (
//               <div className="tw:ml-auto tw:flex tw:shrink-0 tw:gap-1">
//                 <Button
//                   size="icon"
//                   variant="ghost"
//                   className="tw:size-[28px]"
//                   onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
//                     e.stopPropagation();
//                     void onCancel();
//                   }}
//                 >
//                   <div className="tw:flex tw:size-5 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-[50%] tw:bg-primary/40">
//                     <XIcon className="tw:size-3 tw:stroke-[3px] tw:text-background" />
//                   </div>
//                 </Button>

//                 <Button
//                   size="icon"
//                   variant="ghost"
//                   onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
//                     e.stopPropagation();
//                     void onSave();
//                   }}
//                 >
//                   <div className="tw:flex tw:size-5 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-[50%] tw:bg-brand">
//                     <CheckIcon className="tw:size-3 tw:stroke-[3px] tw:text-background" />
//                   </div>
//                 </Button>
//               </div>
//             )}
//           </EditorContainer>
//         </Plate>
//       </div>
//     </div>
//   );
// }

// function CommentMoreDropdown(props: {
//   comment: TComment;
//   dropdownOpen: boolean;
//   setDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
//   setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
//   onCloseAutoFocus?: () => void;
//   onRemoveComment?: () => void;
// }) {
//   const {
//     comment,
//     dropdownOpen,
//     setDropdownOpen,
//     setEditingId,
//     onCloseAutoFocus,
//     onRemoveComment,
//   } = props;

//   const editor = useEditorRef();

//   const selectedEditCommentRef = React.useRef<boolean>(false);

//   const onDeleteComment = React.useCallback(() => {
//     if (!comment.id)
//       return alert('You are operating too quickly, please try again later.');

//     // Find and update the discussion
//     const updatedDiscussions = editor
//       .getOption(discussionPlugin, 'discussions')
//       .map((discussion) => {
//         if (discussion.id !== comment.discussionId) {
//           return discussion;
//         }

//         const commentIndex = discussion.comments.findIndex(
//           (c) => c.id === comment.id
//         );
//         if (commentIndex === -1) {
//           return discussion;
//         }

//         return {
//           ...discussion,
//           comments: [
//             ...discussion.comments.slice(0, commentIndex),
//             ...discussion.comments.slice(commentIndex + 1),
//           ],
//         };
//       });

//     // Save back to session storage
//     editor.setOption(discussionPlugin, 'discussions', updatedDiscussions);
//     onRemoveComment?.();
//   }, [comment.discussionId, comment.id, editor, onRemoveComment]);

//   const onEditComment = React.useCallback(() => {
//     selectedEditCommentRef.current = true;

//     if (!comment.id)
//       return alert('You are operating too quickly, please try again later.');

//     setEditingId(comment.id);
//   }, [comment.id, setEditingId]);

//   return (
//     <DropdownMenu
//       open={dropdownOpen}
//       onOpenChange={setDropdownOpen}
//       modal={false}
//     >
//       <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
//         <Button variant="ghost" className={cn("tw:h-6 tw:p-1 tw:text-muted-foreground")}>
//           <MoreHorizontalIcon className="tw:size-4" />
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent
//         className="tw:w-48"
//         onCloseAutoFocus={(e) => {
//           if (selectedEditCommentRef.current) {
//             onCloseAutoFocus?.();
//             selectedEditCommentRef.current = false;
//           }

//           return e.preventDefault();
//         }}
//       >
//         <DropdownMenuGroup>
//           <DropdownMenuItem onClick={onEditComment}>
//             <PencilIcon className="tw:size-4" />
//             Edit comment
//           </DropdownMenuItem>
//           <DropdownMenuItem onClick={onDeleteComment}>
//             <TrashIcon className="tw:size-4" />
//             Delete comment
//           </DropdownMenuItem>
//         </DropdownMenuGroup>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }

// const useCommentEditor = (
//   options: Omit<CreatePlateEditorOptions, 'plugins'> = {},
//   deps: any[] = []
// ) => {
//   const commentEditor = usePlateEditor(
//     {
//       id: 'comment',
//       plugins: BasicMarksKit,
//       value: [],
//       ...options,
//     },
//     deps
//   );

//   return commentEditor;
// };

// export function CommentCreateForm({
//   autoFocus = false,
//   className,
//   discussionId: discussionIdProp,
//   focusOnMount = false,
// }: {
//   autoFocus?: boolean;
//   className?: string;
//   discussionId?: string;
//   focusOnMount?: boolean;
// }) {
//   const discussions = usePluginOption(discussionPlugin, 'discussions');

//   const editor = useEditorRef();
//   const commentId = useCommentId();
//   const discussionId = discussionIdProp ?? commentId;

//   const userInfo = usePluginOption(discussionPlugin, 'currentUser');
//   const [commentValue, setCommentValue] = React.useState<Value | undefined>();
//   const commentContent = React.useMemo(
//     () =>
//       commentValue
//         ? NodeApi.string({ children: commentValue, type: KEYS.p })
//         : '',
//     [commentValue]
//   );
//   const commentEditor = useCommentEditor();

//   React.useEffect(() => {
//     if (commentEditor && focusOnMount) {
//       commentEditor.tf.focus();
//     }
//   }, [commentEditor, focusOnMount]);

//   const onAddComment = React.useCallback(async () => {
//     if (!commentValue) return;

//     commentEditor.tf.reset();

//     if (discussionId) {
//       // Get existing discussion
//       const discussion = discussions.find((d) => d.id === discussionId);
//       if (!discussion) {
//         // Mock creating suggestion
//         const newDiscussion: TDiscussion = {
//           id: discussionId,
//           comments: [
//             {
//               id: nanoid(),
//               contentRich: commentValue,
//               createdAt: new Date(),
//               discussionId,
//               isEdited: false,
//               userId: editor.getOption(discussionPlugin, 'currentUserId'),
//             },
//           ],
//           createdAt: new Date(),
//           isResolved: false,
//           userId: editor.getOption(discussionPlugin, 'currentUserId'),
//         };

//         editor.setOption(discussionPlugin, 'discussions', [
//           ...discussions,
//           newDiscussion,
//         ]);
//         return;
//       }

//       // Create reply comment
//       const comment: TComment = {
//         id: nanoid(),
//         contentRich: commentValue,
//         createdAt: new Date(),
//         discussionId,
//         isEdited: false,
//         userId: editor.getOption(discussionPlugin, 'currentUserId'),
//       };

//       // Add reply to discussion comments
//       const updatedDiscussion = {
//         ...discussion,
//         comments: [...discussion.comments, comment],
//       };

//       // Filter out old discussion and add updated one
//       const updatedDiscussions = discussions
//         .filter((d) => d.id !== discussionId)
//         .concat(updatedDiscussion);

//       editor.setOption(discussionPlugin, 'discussions', updatedDiscussions);

//       return;
//     }

//     const commentsNodeEntry = editor
//       .getApi(CommentPlugin)
//       .comment.nodes({ at: [], isDraft: true });

//     if (commentsNodeEntry.length === 0) return;

//     const documentContent = commentsNodeEntry
//       .map(([node]) => node.text)
//       .join('');

//     const _discussionId = nanoid();
//     // Mock creating new discussion
//     const newDiscussion: TDiscussion = {
//       id: _discussionId,
//       comments: [
//         {
//           id: nanoid(),
//           contentRich: commentValue,
//           createdAt: new Date(),
//           discussionId: _discussionId,
//           isEdited: false,
//           userId: editor.getOption(discussionPlugin, 'currentUserId'),
//         },
//       ],
//       createdAt: new Date(),
//       documentContent,
//       isResolved: false,
//       userId: editor.getOption(discussionPlugin, 'currentUserId'),
//     };

//     editor.setOption(discussionPlugin, 'discussions', [
//       ...discussions,
//       newDiscussion,
//     ]);

//     const id = newDiscussion.id;

//     commentsNodeEntry.forEach(([, path]) => {
//       editor.tf.setNodes(
//         {
//           [getCommentKey(id)]: true,
//         },
//         { at: path, split: true }
//       );
//       editor.tf.unsetNodes([getDraftCommentKey()], { at: path });
//     });
//   }, [commentValue, commentEditor.tf, discussionId, editor, discussions]);

//   return (
//     <div className={cn("tw:flex tw:w-full", className)}>
//       <div className="tw:mt-2 tw:mr-1 tw:shrink-0">
//         {/* Replace to your own backend or refer to potion */}
//         <Avatar className="tw:size-5">
//           <AvatarImage alt={userInfo?.name} src={userInfo?.avatarUrl} />
//           <AvatarFallback>{userInfo?.name?.[0]}</AvatarFallback>
//         </Avatar>
//       </div>

//       <div className="tw:relative tw:flex tw:grow tw:gap-2">
//         <Plate
//           onChange={({ value }) => {
//             setCommentValue(value);
//           }}
//           editor={commentEditor}
//         >
//           <EditorContainer variant="comment">
//             <Editor
//               variant="comment"
//               className="tw:min-h-[25px] tw:grow tw:pt-0.5 tw:pr-8"
//               onKeyDown={(e) => {
//                 if (e.key === 'Enter' && !e.shiftKey) {
//                   e.preventDefault();
//                   onAddComment();
//                 }
//               }}
//               placeholder="Reply..."
//               autoComplete="off"
//               autoFocus={autoFocus}
//             />

//             <Button
//               size="icon"
//               variant="ghost"
//               className="tw:absolute tw:right-0.5 tw:bottom-0.5 tw:ml-auto tw:size-6 tw:shrink-0"
//               disabled={commentContent.trim().length === 0}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 onAddComment();
//               }}
//             >
//               <div className="tw:flex tw:size-6 tw:items-center tw:justify-center tw:rounded-full">
//                 <ArrowUpIcon />
//               </div>
//             </Button>
//           </EditorContainer>
//         </Plate>
//       </div>
//     </div>
//   );
// }

// export const formatCommentDate = (date: Date) => {
//   const now = new Date();
//   const diffMinutes = differenceInMinutes(now, date);
//   const diffHours = differenceInHours(now, date);
//   const diffDays = differenceInDays(now, date);

//   if (diffMinutes < 60) {
//     return `${diffMinutes}m`;
//   }
//   if (diffHours < 24) {
//     return `${diffHours}h`;
//   }
//   if (diffDays < 2) {
//     return `${diffDays}d`;
//   }

//   return format(date, 'MM/dd/yyyy');
// };
