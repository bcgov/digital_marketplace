import { adt } from "shared/lib/types";

export type GenericFormState = {
  opportunity?: any;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export type Msg = any; // Add Msg type for the adt usage

export const reviewWithAIAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch
): Promise<string> => {
  console.log(
    "🚨🚨🚨 reviewWithAI ACTION CALLED ON EDIT PAGE! 🚨🚨🚨, state: ",
    state
  );

  if (!state.opportunity) {
    console.log(
      "❌ No opportunity available. Please try refreshing the page, state: ",
      state
    );
    return "❌ Error: No opportunity available. Please try refreshing the page.";
  }

  try {
    // Trigger the review with AI process
    const reviewMsg = adt("reviewWithAI") as Msg;
    console.log("Triggering review with AI:", reviewMsg);
    dispatch(reviewMsg);

    return `🤖 **AI Review Started!**

**Status:** AI is analyzing your opportunity...

**What's happening:**
- AI is reviewing your opportunity against evaluation criteria
- Analyzing completeness, clarity, and compliance
- Generating detailed feedback and recommendations
- This typically takes 10-30 seconds

**Please wait** - the review results will appear in the chat when complete.

💡 **Tip:** The AI will provide comprehensive feedback on your opportunity structure, content, and compliance with evaluation criteria.`;
  } catch (error) {
    console.error("❌ Error in reviewWithAI:", error);
    return `❌ Error: Failed to start AI review - ${(error as Error).message}`;
  }
};

export const reviewWithAICopilotAction = {
  name: "reviewWithAI",
  description:
    "Trigger an AI review of the current opportunity. This will analyze the opportunity and provide feedback based on evaluation criteria.",
  parameters: [],
  action: reviewWithAIAction
};
