import { adt } from "shared/lib/types";

export type GenericFormState = {
  form?: any;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const testAddQuestionAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch
): Promise<string> => {
  console.log("🧪 Testing basic question addition");

  if (!state.form) {
    return "❌ Error: Form not available";
  }

  try {
    // Switch to Resource Questions tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const))
    );
    dispatch(switchTabMsg as any);
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Add a new question
    const addQuestionMsg = adt(
      "form",
      adt("resourceQuestions", adt("addQuestion"))
    );
    console.log("🔄 Dispatching test question add:", addQuestionMsg);
    dispatch(addQuestionMsg as any);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const questionCount = state.form?.resourceQuestions?.questions?.length || 0;
    console.log("📋 Questions after test add:", questionCount);

    return `✅ Test question addition completed! Total questions: ${questionCount}`;
  } catch (error: any) {
    console.error("❌ Test question addition failed:", error);
    return `❌ Test failed: ${error.message}`;
  }
};

export const testAddQuestionCopilotAction = {
  name: "testAddQuestion",
  description:
    "Simple test to add a blank question without any parameters. Use this to test if basic question addition is working.",
  parameters: [],
  action: testAddQuestionAction
};
