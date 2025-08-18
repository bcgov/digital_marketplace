import { adt } from "shared/lib/types";

export type GenericFormState = {
  form?: any;
  isEditing?: boolean;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const deleteResourceAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  resourceIndex: string
): Promise<string> => {
  console.log("🚨🚨🚨 deleteResource ACTION CALLED! 🚨🚨🚨");
  console.log("Resource index:", resourceIndex);

  if (!state.isEditing) {
    return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
  }

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  const index = parseInt(resourceIndex);
  if (isNaN(index) || index < 0) {
    return "❌ Error: Invalid resource index. Please provide a valid number (0 for first resource, 1 for second, etc.)";
  }

  const resourceCount = state.form?.resources?.resources?.length || 0;
  if (index >= resourceCount) {
    return `❌ Error: Resource index ${index} does not exist. There are only ${resourceCount} resources (indices 0-${resourceCount - 1}).`;
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

    // Delete resource
    const deleteResourceMsg = adt(
      "form",
      adt("resources", adt("deleteResource", index))
    );
    console.log("Deleting resource at index:", index);
    dispatch(deleteResourceMsg);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const newResourceCount = state.form?.resources?.resources?.length || 0;
    return `✅ **Resource ${index + 1} deleted successfully!**

**Resources remaining:** ${newResourceCount}

💡 **Tip:** Resource indices have been updated. The first resource is now index 0, second is index 1, etc.`;
  } catch (error: any) {
    console.error("❌ Error deleting resource:", error);
    return `❌ Error: Failed to delete resource - ${error.message}`;
  }
};

export const deleteResourceCopilotAction = {
  name: "deleteResource_review",
  description:
    "Delete a resource from the Team With Us opportunity. Use this when the user wants to remove a resource requirement.",
  parameters: [
    {
      name: "resourceIndex",
      type: "string",
      description:
        "The index of the resource to delete (0-based, e.g., '0' for first resource, '1' for second resource)",
      required: true
    }
  ],
  action: deleteResourceAction
};
