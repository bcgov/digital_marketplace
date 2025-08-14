import { adt } from "shared/lib/types";

export type GenericFormState = {
  form?: any;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const addResourceAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch
): Promise<string> => {
  console.log("🔧 addResource called");

  if (!state.form) {
    console.error("❌ Form state not available");
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  console.log("✅ Form state available, proceeding with resource addition");

  try {
    // Switch to Resource Details tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Resource Details" as const))
    );
    dispatch(switchTabMsg as any);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Add new resource
    const addResourceMsg = adt("form", adt("resources", adt("addResource")));
    console.log("🔄 Dispatching addResource message:", addResourceMsg);
    dispatch(addResourceMsg as any);
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
  name: "addResource",
  description:
    "Add a new resource to the Team With Us opportunity. Use this when the user wants to add another resource requirement.",
  parameters: [],
  action: addResourceAction
};
