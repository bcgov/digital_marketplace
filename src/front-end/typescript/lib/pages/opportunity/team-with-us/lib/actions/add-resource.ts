import { adt } from "shared/lib/types";

// EXACT ORIGINAL FUNCTIONALITY PRESERVED - NO ADDITIONAL FEATURES ADDED
export type GenericFormState = {
  form?: any;
  isEditing?: boolean; // Added for edit context
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

// EXACT COMBINATION OF BOTH ORIGINAL ACTIONS
export const addResourceAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch
): Promise<string> => {
  console.log("🚨🚨🚨 addResource ACTION CALLED! 🚨🚨🚨");

  // PRESERVED FROM REVIEW ORIGINAL: Check if editing mode is required
  if (state.isEditing !== undefined && !state.isEditing) {
    return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
  }

  // PRESERVED FROM BOTH ORIGINALS: Check if form exists
  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  try {
    // PRESERVED FROM BOTH ORIGINALS: Switch to Resource Details tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Resource Details" as const))
    );
    dispatch(switchTabMsg);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // PRESERVED FROM BOTH ORIGINALS: Add new resource with EXACT original dispatch
    const addResourceMsg = adt("form", adt("resources", adt("addResource")));
    console.log("Adding new resource:", addResourceMsg);
    dispatch(addResourceMsg);
    await new Promise((resolve) => setTimeout(resolve, 200)); // EXACT 200ms from originals

    // PRESERVED FROM BOTH ORIGINALS: Get resource count and return exact success message
    const resourceCount = state.form?.resources?.resources?.length || 0;
    return `✅ **New resource added successfully!**

**Total resources:** ${resourceCount}

💡 **Tip:** You can now configure the service area, target allocation, and skills for the new resource using the updateResource action.`;
  } catch (error: any) {
    console.error("❌ Error adding resource:", error);
    return `❌ Error: Failed to add resource - ${error.message}`;
  }
};

// Export the complete useCopilotAction configuration
export const addResourceCopilotAction = {
  name: "addResource",
  description:
    "Add a new resource to the Team With Us opportunity. Use this when the user wants to add another resource requirement.",
  parameters: [],
  action: addResourceAction
};
