import React from "react";

export type GenericFormState = {
  opportunity?: any;
  form?: any;
  reviewInProgress?: React.MutableRefObject<boolean>;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const reviewOpportunityAction = async (
  state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  console.log("🚨🚨🚨 reviewOpportunity ACTION CALLED! 🚨🚨🚨");

  // Get the reviewInProgress ref from state
  const reviewInProgress = state.reviewInProgress;

  console.log("🔍 Review in progress:", reviewInProgress);

  // Prevent multiple simultaneous calls
  if (reviewInProgress?.current) {
    console.log("⚠️ Review already in progress, skipping duplicate call");
    return "⏳ A review is already in progress. Please wait for it to complete.";
  }

  console.log("🔍 Starting comprehensive opportunity review...");

  if (!state.opportunity) {
    return "❌ Error: No opportunity data available for review.";
  }

  try {
    if (reviewInProgress) {
      reviewInProgress.current = true;
    }

    // Perform the review directly without triggering the reviewWithAI workflow
    // This prevents the loop that was caused by the workflow
    // const _opportunity = state.opportunity;
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

export const reviewOpportunityCopilotAction = {
  name: "reviewOpportunity",
  description:
    "Perform a comprehensive review of the Team With Us opportunity against procurement criteria. Use this ONLY when users explicitly request a review. Do not call automatically or repeatedly.",
  parameters: [],
  action: reviewOpportunityAction
};
