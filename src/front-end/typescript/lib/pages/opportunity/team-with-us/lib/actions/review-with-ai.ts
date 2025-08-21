import { FORMATTED_CRITERIA } from "../ai";

export type GenericFormState = {
  opportunity?: any;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export type Msg = any; // Add Msg type for the adt usage

export const reviewWithAIAction = async (
  state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  console.log(
    "🚨🚨🚨 reviewWithAI ACTION CALLED ON EDIT PAGE! 🚨🚨🚨, state: ",
    state
  );

  if (!state.opportunity && !state.form?.opportunity) {
    console.log(
      "❌ No opportunity available. Please try refreshing the page, state: ",
      state
    );
    return "❌ Error: No opportunity available. Please try refreshing the page.";
  }

  try {
    // Get the opportunity data
    const opportunity = state.opportunity || state.form?.opportunity;

    return `Please review this Team With Us opportunity and provide feedback based on the evaluation criteria. Here's the opportunity data:

${JSON.stringify(opportunity, null, 2)}

${FORMATTED_CRITERIA}`;
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
