// import React from "react";
// import { useCopilotActionWrapper } from "../../lib/hooks/use-copilot-action-wrapper";
// import { Validation } from "shared/lib/validation";
// import { useReviewContext } from "../contexts/review-context";

// export interface ReviewActionsProps<TState> {
//   state: TState;
//   dispatch: any;
//   context: "create" | "edit";
// }

// // Separate component for create mode that doesn't use ReviewContext
// const CreateReviewActions = <TState,>({
//   state,
//   dispatch
// }: {
//   state: TState;
//   dispatch: any;
// }) => {
//   const memoizedDispatch = React.useCallback(dispatch, [dispatch]);

//   const getStateData = (state: TState) => {
//     if (typeof state === "object" && state !== null && "tag" in state) {
//       const validationState = state as unknown as Validation<any, any>;
//       if (validationState.tag === "valid") {
//         return {
//           opportunity: validationState.value.opportunity,
//           form: validationState.value.form?.toJS
//             ? validationState.value.form.toJS()
//             : validationState.value.form,
//           isEditing: validationState.value.isEditing,
//           viewerUser: validationState.value.viewerUser,
//           users: validationState.value.users,
//           reviewInProgress: false
//         };
//       }
//       return null;
//     }
//     return null;
//   };

//   const plainState = React.useMemo(() => getStateData(state), [state]);

//   if (!plainState) {
//     return null;
//   }

//   useCopilotActionWrapper(
//     "reviewOpportunity",
//     plainState,
//     memoizedDispatch,
//     "create"
//   );

//   return null;
// };

// export interface EditReviewActionsProps<TState> {
//   state: TState;
//   dispatch: any;
// }

// // Component for edit mode that uses ReviewContext
// const EditReviewActions = <TState,>({
//   state,
//   dispatch
// }: EditReviewActionsProps<TState>) => {
//   const { reviewInProgress } = useReviewContext();
//   const memoizedDispatch = React.useCallback(dispatch, [dispatch]);

//   const getStateData = (state: TState) => {
//     const directState = state as any;
//     return {
//       opportunity: directState.opportunity,
//       form: directState.form?.toJS ? directState.form.toJS() : directState.form,
//       isEditing: directState.isEditing,
//       viewerUser: directState.viewerUser,
//       users: directState.users,
//       reviewInProgress
//     };
//   };

//   const plainState = React.useMemo(
//     () => getStateData(state),
//     [state, reviewInProgress]
//   );

//   useCopilotActionWrapper(
//     "reviewOpportunity",
//     plainState,
//     memoizedDispatch,
//     "review"
//   );

//   return null;
// };

// // Unified ReviewActions component that works for both create and edit pages
// const ReviewActionsComponent = <TState,>({
//   state,
//   dispatch,
//   context
// }: ReviewActionsProps<TState>) => {
//   if (context === "edit") {
//     // For edit mode, we need to use the component that has access to ReviewProvider
//     // This should be used within a ReviewProvider in the parent component
//     return <EditReviewActions state={state} dispatch={dispatch} />;
//   } else {
//     return <CreateReviewActions state={state} dispatch={dispatch} />;
//   }
// };

// // Add display name for the memoized component
// ReviewActionsComponent.displayName = "ReviewActions";

// export const ReviewActions = React.memo(ReviewActionsComponent) as <TState>(
//   props: ReviewActionsProps<TState>
// ) => React.ReactElement;
