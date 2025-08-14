import { adt } from "shared/lib/types";

// Generic types that can work with any form state
export type GenericFormState = {
  resourceQuestions?: {
    questions?: any[];
  };
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

/**
 * Action to add a new resource question to the Team With Us opportunity.
 * This will create a blank question that can then be customized.
 */
export const addQuestionAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch
): Promise<string> => {
  console.log("🔧 addQuestion called");

  if (!state.form) {
    console.error("❌ Form state not available");
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  console.log("✅ Form state available, proceeding with question addition");

  try {
    // Switch to Resource Questions tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const))
    );
    dispatch(switchTabMsg);
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Add a new question - use the exact same structure as the working edit page
    const addQuestionMsg = adt(
      "form",
      adt("resourceQuestions", adt("addQuestion"))
    );
    console.log("🔄 Dispatching addQuestion:", addQuestionMsg);
    dispatch(addQuestionMsg);
    await new Promise((resolve) => setTimeout(resolve, 300));

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
