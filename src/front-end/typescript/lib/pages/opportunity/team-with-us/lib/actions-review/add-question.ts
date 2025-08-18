import { adt } from "shared/lib/types";

export type GenericFormState = {
  form?: any;
  isEditing?: boolean; // Added for edit context
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const addQuestionAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch
): Promise<string> => {
  console.log("🚨🚨🚨 addQuestion ACTION CALLED! 🚨🚨🚨");

  if (!state.isEditing) {
    return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
  }

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  try {
    // Switch to Resource Questions tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const))
    );
    console.log("Switching to Resource Questions tab:", switchTabMsg);
    dispatch(switchTabMsg);

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Add a new question
    const addQuestionMsg = adt(
      "form",
      adt("resourceQuestions", adt("addQuestion"))
    );
    console.log("Adding new question:", addQuestionMsg);
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

export const addQuestionCopilotAction = {
  name: "addQuestion_review",
  description:
    "Add a new resource question to the Team With Us opportunity. This will create a blank question that you can then customize.",
  parameters: [],
  action: addQuestionAction
};
