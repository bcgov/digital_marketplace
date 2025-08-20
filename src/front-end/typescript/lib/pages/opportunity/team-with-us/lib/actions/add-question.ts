import { adt } from "shared/lib/types";

// Generic types for the wrapper - EXACT FROM ORIGINAL
export type GenericFormState = {
  form?: any;
  isEditing?: boolean; // Added for edit context - EXACT FROM REVIEW
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

// EXACT COMBINATION OF BOTH ORIGINAL ACTIONS - NO NEW FUNCTIONALITY ADDED
export const addQuestionAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch
): Promise<string> => {
  console.log("🚨🚨🚨 UNIFIED addQuestion ACTION CALLED! 🚨🚨🚨"); // Changed from original for clarity

  // PRESERVED FROM REVIEW ORIGINAL: Check if editing mode is required
  if (state.isEditing !== undefined && !state.isEditing) {
    return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
  }

  // PRESERVED FROM BOTH ORIGINALS: Check if form exists
  if (!state.form) {
    console.error("❌ Form state not available");
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  console.log("✅ Form state available, proceeding with question addition");

  try {
    // Switch to Resource Questions tab - EXACT FROM BOTH ORIGINALS
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const))
    );
    dispatch(switchTabMsg);

    // EXACT 200ms delay from both originals
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Add a new question - use the exact same structure as the working edit page
    // EXACT FROM ORIGINAL CREATE: adt("addQuestion") - no null parameter
    const addQuestionMsg = adt(
      "form",
      adt("resourceQuestions", adt("addQuestion"))
    );
    console.log("🔄 Dispatching addQuestion:", addQuestionMsg);
    dispatch(addQuestionMsg);

    // EXACT 300ms delay from both originals
    await new Promise((resolve) => setTimeout(resolve, 300));

    // EXACT SUCCESS MESSAGE from both originals - PRESERVED WORD FOR WORD
    const questionCount = state.form?.resourceQuestions?.questions?.length || 0;

    return `✅ **New question added successfully!**

**Question #:** ${questionCount} (index ${questionCount - 1})

💡 **Tip:** You can now customize this question using:
- updateQuestion(${questionCount - 1}, "text", "Your question text here")
- updateQuestion(${questionCount - 1}, "guideline", "Your guideline text here")
- updateQuestion(${questionCount - 1}, "wordLimit", "500")
- updateQuestion(${questionCount - 1}, "score", "20")`;
  } catch (error: any) {
    console.error("❌ Error adding question:", error);
    return `❌ Error: Failed to add question - ${error.message}`;
  }
};

// Export the complete useCopilotAction configuration
export const addQuestionCopilotAction = {
  name: "addQuestion",
  description:
    "Add a new resource question to the Team With Us opportunity. This will create a blank question that you can then customize.",
  parameters: [],
  action: addQuestionAction
};
