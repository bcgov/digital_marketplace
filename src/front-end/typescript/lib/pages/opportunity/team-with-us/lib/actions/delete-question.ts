import { adt } from "shared/lib/types";

export type GenericFormState = {
  form?: any;
  isEditing?: boolean; // Added for edit context
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const deleteQuestionAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  questionIndex: string
): Promise<string> => {
  console.log("🚨🚨🚨 deleteQuestion ACTION CALLED! 🚨🚨🚨");
  console.log("Question index:", questionIndex);

  // PRESERVED FROM REVIEW ORIGINAL: Check if editing mode is required
  if (state.isEditing !== undefined && !state.isEditing) {
    return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
  }

  // PRESERVED FROM BOTH ORIGINALS: Check if form exists
  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  // PRESERVED FROM BOTH ORIGINALS: Parse and validate index
  const index = parseInt(questionIndex);
  if (isNaN(index) || index < 0) {
    return "❌ Error: Invalid question index. Please provide a valid number (0 for first question, 1 for second, etc.)";
  }

  // PRESERVED FROM BOTH ORIGINALS: Check if index is valid
  const questionCount = state.form?.resourceQuestions?.questions?.length || 0;
  if (index >= questionCount) {
    return `❌ Error: Question index ${index} does not exist. There are only ${questionCount} questions (indices 0-${questionCount - 1}).`;
  }

  try {
    // PRESERVED FROM BOTH ORIGINALS: Switch to Resource Questions tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const))
    );
    console.log("Switching to Resource Questions tab:", switchTabMsg);
    dispatch(switchTabMsg);

    // EXACT 200ms delay from originals
    await new Promise((resolve) => setTimeout(resolve, 200));

    // EXACT ORIGINAL DISPATCH - COMBINED FROM BOTH ORIGINALS
    const deleteQuestionMsg = adt(
      "form",
      adt("resourceQuestions", adt("deleteQuestion", index))
    );
    console.log("Deleting question at index:", index);
    dispatch(deleteQuestionMsg);

    // EXACT 300ms delay from originals
    await new Promise((resolve) => setTimeout(resolve, 300));

    // EXACT SUCCESS MESSAGE from both originals
    const newQuestionCount =
      state.form?.resourceQuestions?.questions?.length || 0;

    return `✅ **Question ${index + 1} deleted successfully!**

**Questions remaining:** ${newQuestionCount}

**Tip:** Question indices have been adjusted. The former question ${index + 2} is now question ${index + 1} (index ${index}).`;
  } catch (error: any) {
    console.error("❌ Error deleting question:", error);
    return `❌ Error: Failed to delete question - ${error.message}`;
  }
};

export const deleteQuestionCopilotAction = {
  name: "deleteQuestion",
  description:
    "Delete a specific resource question from the Team With Us opportunity during creation.",
  parameters: [
    {
      name: "questionIndex",
      type: "string",
      description:
        "The index of the question to delete (0-based, e.g., '0' for first question, '1' for second question)",
      required: true
    }
  ],
  action: deleteQuestionAction
};
