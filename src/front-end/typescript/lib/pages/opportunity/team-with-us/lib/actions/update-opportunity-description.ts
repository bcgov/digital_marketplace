import { adt } from "shared/lib/types";
import {
  UnifiedActionContext,
  GenericDispatch,
  detectWorkflowType,
  createActionError,
  createActionSuccess,
  validateFormExists,
  validateEditMode
} from "./base-action-template";

// Unified action function
export const updateOpportunityDescriptionAction = async (
  state: UnifiedActionContext,
  dispatch: GenericDispatch,
  newDescription: string
): Promise<string> => {
  console.log(
    "🚨🚨🚨 UNIFIED updateOpportunityDescription ACTION CALLED! 🚨🚨🚨"
  );
  console.log(
    "🎯 CopilotKit: Unified updateOpportunityDescription called with:",
    newDescription
  );

  // Auto-detect workflow type
  const workflowType = detectWorkflowType(state);
  console.log(
    `🔍 Detected workflow: ${workflowType}, isEditing: ${state.isEditing}`
  );

  // Validate form exists
  const formError = validateFormExists(state, "updateOpportunityDescription");
  if (formError) return formError;

  // Validate edit mode for review workflow
  if (workflowType === "review") {
    const editError = validateEditMode(state, "updateOpportunityDescription");
    if (editError) return editError;
  }

  try {
    console.log("State.form exists:", !!state.form);
    console.log(
      "Current description before update:",
      state.form?.description?.child?.value ||
        state.form?.description?.value ||
        "Not found"
    );

    // Switch to Description tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Description" as const))
    );
    console.log("Switching to Description tab:", switchTabMsg);
    dispatch(switchTabMsg);

    // Small delay to ensure tab switch completes
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update the description field - handle both state structures
    const descriptionField =
      state.form?.description?.child || state.form?.description;
    if (!descriptionField) {
      return createActionError(
        "Description Field Not Found",
        "Could not locate the description field in the form.",
        "Please ensure you are on the correct form tab and try again."
      );
    }

    // Update description based on workflow type
    let updateMsg;
    // if (workflowType === 'review') {
    // Review workflow uses child.value structure
    updateMsg = adt(
      "form",
      adt(
        "description",
        adt(
          "child",
          adt("onChangeTextArea", [newDescription, 0, newDescription.length])
        )
      )
    );
    // } else {
    //   // Create workflow uses direct value structure
    //   updateMsg = adt(
    //     "form",
    //     adt(
    //       "description",
    //       adt("onChangeTextArea", [newDescription, 0, newDescription.length])
    //     )
    //   );
    // }

    console.log("Dispatching update message:", updateMsg);
    dispatch(updateMsg);
    console.log("✅ Description update dispatch completed successfully");

    // Give time for the update to process
    await new Promise((resolve) => setTimeout(resolve, 500));

    const workflowSpecificMsg =
      workflowType === "review"
        ? "Don't forget to save your changes when you're ready!"
        : "Don't forget to save or publish your opportunity when you're ready!";

    return createActionSuccess(
      "Description Updated Successfully!",
      `✅ **Description updated successfully!**\n\n**New content preview:**\n${newDescription.substring(0, 200)}${newDescription.length > 200 ? "..." : ""}\n\n💡 **Tip:** The description has been updated in the form. ${workflowSpecificMsg}`,
      `Updated in ${workflowType} workflow`
    );
  } catch (error: any) {
    console.error("❌ Error in unified updateOpportunityDescription:", error);
    return createActionError(
      "Update Failed",
      `Failed to update description: ${error.message}`,
      "Please try again or refresh the page if the issue persists."
    );
  }
};

// Export the complete useCopilotAction configuration
export const updateOpportunityDescriptionCopilotAction = {
  name: "updateOpportunityDescription",
  description:
    "UNIFIED: Update or replace the description field content of the Team With Us opportunity. Works in both creation and review workflows. This action can be used when the user wants to modify, improve, or completely rewrite the opportunity description.",
  parameters: [
    {
      name: "newDescription",
      type: "string",
      description:
        "The new description content for the opportunity. This should be a complete description that will replace the current content.",
      required: true
    }
  ],
  action: updateOpportunityDescriptionAction
};
