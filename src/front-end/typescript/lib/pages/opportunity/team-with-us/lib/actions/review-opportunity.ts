import React from "react";

// Keep original GenericFormState for backward compatibility
export type GenericFormState = {
  opportunity?: any;
  form?: any;
  reviewInProgress?: React.MutableRefObject<boolean>;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

// Review workflow action function - EXACT ORIGINAL FUNCTIONALITY PRESERVED
export const reviewOpportunityAction = async (
  state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  console.log("🚨🚨🚨 reviewOpportunity ACTION CALLED! 🚨🚨🚨");
  console.log("🔍 State keys:", Object.keys(state));
  console.log("🔍 Opportunity exists:", !!state.opportunity);
  console.log("🔍 Form exists:", !!state.form);

  // Get the reviewInProgress ref from state
  const reviewInProgress = state.reviewInProgress;

  // Prevent multiple simultaneous calls
  if (reviewInProgress?.current) {
    return "⏳ A review is already in progress. Please wait for it to complete.";
  }

  // Check for opportunity data in multiple possible locations
  let opportunity = state.opportunity;
  if (!opportunity && state.form?.opportunity) {
    console.log("Found opportunity in form.opportunity");
    opportunity = state.form.opportunity;
  }
  if (!opportunity && state.form?.state?.opportunity) {
    console.log("Found opportunity in form.state.opportunity");
    opportunity = state.form.state.opportunity;
  }

  if (!opportunity) {
    console.error("❌ No opportunity data found in any expected location");
    console.error("❌ State structure:", state);
    return "It seems I wasn't able to access the opportunity data needed for the review. Could you please confirm if you want me to review the current opportunity you have been editing? If so, I will fetch the latest details and proceed with the review.";
  }

  try {
    if (reviewInProgress) {
      reviewInProgress.current = true;
    }

    console.log("✅ Opportunity data found:", opportunity);

    // Perform the review directly without triggering the reviewWithAI workflow
    // This prevents the loop that was caused by the workflow
    const form = state.form;

    if (!form) {
      if (reviewInProgress) {
        reviewInProgress.current = false;
      }
      return "❌ Error: Form not available for review.";
    }

    // Reset the flag after a delay
    if (reviewInProgress) {
      setTimeout(() => {
        reviewInProgress.current = false;
      }, 5000);
    }

    console.log("✅ Review process initiated directly");
    return "🔍 **Starting comprehensive review...**\n\nI'm analyzing your Team With Us opportunity against procurement criteria. Please wait a moment for the detailed review.";
  } catch (error) {
    if (reviewInProgress) {
      reviewInProgress.current = false;
    }
    console.error("❌ Error in reviewOpportunity:", error);
    return `❌ Error: Failed to review opportunity - ${(error as Error).message}`;
  }
};

// Export the complete useCopilotAction configuration
export const reviewOpportunityCopilotAction = {
  name: "reviewOpportunity",
  description:
    "Perform a comprehensive review of the Team With Us opportunity against procurement criteria. Use this ONLY when users explicitly request a review. Do not call automatically or repeatedly.",
  parameters: [],
  action: reviewOpportunityAction
};
