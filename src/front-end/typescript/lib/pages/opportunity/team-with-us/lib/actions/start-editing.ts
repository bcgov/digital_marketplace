import { adt } from "shared/lib/types";

// EXACT ORIGINAL FUNCTIONALITY PRESERVED - NO ADDITIONAL FEATURES ADDED
export type GenericFormState = {
  opportunity?: any;
  isEditing?: boolean; // Added for edit context
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const startEditingAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch
): Promise<string> => {
  console.log("🚨🚨🚨 startEditing ACTION CALLED! 🚨🚨🚨");

  if (state.isEditing) {
    return "✅ **Already in editing mode!**\n\nThe opportunity is already being edited. You can now make changes to any field using the available actions.";
  }

  if (!state.opportunity) {
    return "❌ Error: No opportunity data available for editing.";
  }

  try {
    console.log("🔧 Starting editing mode...");

    // Dispatch the startEditing action
    dispatch(adt("startEditing"));

    console.log("✅ Editing mode initiated");
    return "🔧 **Editing mode enabled!**\n\nYou can now edit the opportunity. Use the available actions to:\n\n• Update the description with `updateOpportunityDescription()`\n• Modify any field with `updateOpportunityField()`\n• Add resources with `addResource()`\n• Update resources with `updateResource()`\n• Add questions with `addQuestion()`\n• And more!\n\nWhat would you like to edit?";
  } catch (error: any) {
    console.error("❌ Error starting editing mode:", error);
    return `❌ Error: Failed to start editing mode - ${error.message}`;
  }
};

export const startEditingCopilotAction = {
  name: "startEditing",
  description:
    "Start editing mode for the Team With Us opportunity. Use this when users want to edit, modify, or make changes to the opportunity. This enables the form for editing.",
  parameters: [],
  action: startEditingAction
};
