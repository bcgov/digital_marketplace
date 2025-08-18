import { adt } from "shared/lib/types";

export type GenericFormState = {
  form?: any;
  isEditing?: boolean;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const addResourceAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch
): Promise<string> => {
  console.log("🚨🚨🚨 addResource ACTION CALLED! 🚨🚨🚨");

  if (!state.isEditing) {
    return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
  }

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  try {
    // Switch to Resource Details tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Resource Details" as const))
    );
    console.log("Switching to Resource Details tab:", switchTabMsg);
    dispatch(switchTabMsg);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Add new resource
    const addResourceMsg = adt("form", adt("resources", adt("addResource")));
    console.log("Adding new resource:", addResourceMsg);
    dispatch(addResourceMsg);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const resourceCount = state.form?.resources?.resources?.length || 0;
    return `✅ **New resource added successfully!**

**Total resources:** ${resourceCount}

💡 **Tip:** You can now configure the service area, target allocation, and skills for the new resource using the updateResource action.`;
  } catch (error: any) {
    console.error("❌ Error adding resource:", error);
    return `❌ Error: Failed to add resource - ${error.message}`;
  }
};

export const addResourceCopilotAction = {
  name: "addResource_review",
  description:
    "Add a new resource to the Team With Us opportunity. Use this when the user wants to add another resource requirement.",
  parameters: [],
  action: addResourceAction
};
