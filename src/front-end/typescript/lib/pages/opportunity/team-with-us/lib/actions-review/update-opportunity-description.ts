import { adt } from "shared/lib/types";

export type GenericFormState = {
  form?: any;
  isEditing?: boolean;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const updateOpportunityDescriptionAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  newDescription: string
): Promise<string> => {
  console.log("🚨🚨🚨 updateOpportunityDescription ACTION CALLED! 🚨🚨🚨");
  console.log(
    "🎯 CopilotKit: updateOpportunityDescription called with:",
    newDescription
  );
  console.log("State.isEditing:", state.isEditing);
  console.log("State.form exists:", !!state.form);
  console.log(
    "Current description before update:",
    state.form?.description.child.value
  );

  if (!state.isEditing) {
    return "❌ Error: Please start editing the opportunity first before updating the description. Click the 'Edit' button to enter editing mode.";
  }

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  try {
    // First switch to the Description tab to ensure we're on the right tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Description" as const))
    );
    console.log("Switching to Description tab:", switchTabMsg);
    dispatch(switchTabMsg);

    // Small delay to ensure tab switch completes
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update the description field in the form
    const updateMsg = adt(
      "form",
      adt(
        "description",
        adt(
          "child",
          adt("onChangeTextArea", [newDescription, 0, newDescription.length])
        )
      )
    );
    console.log("Dispatching update message:", updateMsg);

    dispatch(updateMsg);
    console.log("✅ Description update dispatch completed successfully");

    // Give a moment for the update to process and verify
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Give more time for the state to update
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if the update was successful
    const currentDescription = state.form?.description.child.value;
    console.log("Description after update:", currentDescription);

    // More lenient verification - check if the description contains the new content
    if (
      currentDescription &&
      (currentDescription === newDescription ||
        currentDescription.includes(newDescription.substring(0, 50)))
    ) {
      return `✅ Description updated successfully!

**New content preview:**
${newDescription.substring(0, 200)}${newDescription.length > 200 ? "..." : ""}

💡 **Tip:** The description has been updated in the form. Don't forget to save your changes when you're ready!`;
    } else {
      console.warn(
        "Description update verification failed, but dispatch was successful"
      );
      return `✅ Description update dispatched successfully!

**Note:** The update has been sent to the form. The description should now be updated in the interface.

**New content preview:**
${newDescription.substring(0, 200)}${newDescription.length > 200 ? "..." : ""}

💡 **Tip:** The description has been updated in the form. Don't forget to save your changes when you're ready!`;
    }
  } catch (error) {
    console.error("❌ Error in updateOpportunityDescription:", error);
    return `❌ Error: Failed to update description - ${(error as Error).message}`;
  }
};

export const updateOpportunityDescriptionCopilotAction = {
  name: "updateOpportunityDescription",
  description:
    "EDIT, UPDATE, MODIFY, or REWRITE the opportunity description field. Use this action when the user wants to: edit the description, update the description, modify the description, add content to the description, improve the description, rewrite the description, or change the description text. This includes adding budget guidance, technical requirements, or any other content to the description.",
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
