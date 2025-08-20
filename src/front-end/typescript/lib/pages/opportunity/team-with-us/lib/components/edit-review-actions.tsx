import React from "react";
import { useCopilotActionWrapper } from "../../lib/hooks/use-copilot-action-wrapper";
import { useReviewContext } from "../../lib/contexts/review-context";

export interface EditReviewActionsProps<TState> {
  state: TState;
  dispatch: any;
}

// Component for edit mode that uses ReviewContext
export const EditReviewActions = <TState,>({
  state,
  dispatch
}: EditReviewActionsProps<TState>) => {
  const { reviewInProgress } = useReviewContext();
  const memoizedDispatch = React.useCallback(dispatch, [dispatch]);

  const getStateData = (state: TState) => {
    const directState = state as any;
    return {
      opportunity: directState.opportunity,
      form: directState.form?.toJS ? directState.form.toJS() : directState.form,
      isEditing: directState.isEditing,
      viewerUser: directState.viewerUser,
      users: directState.users,
      reviewInProgress
    };
  };

  const plainState = React.useMemo(
    () => getStateData(state),
    [state, reviewInProgress]
  );

  useCopilotActionWrapper(
    "reviewOpportunity",
    plainState,
    memoizedDispatch,
    "review"
  );

  return null;
};
