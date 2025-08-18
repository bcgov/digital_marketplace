import * as FormField from "front-end/lib/components/form-field";

export type GenericFormState = {
  form?: any;
  isEditing?: boolean; // Added for edit context
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const checkQuestionGenerationStatusAction = async (
  state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  console.log(
    "🚨🚨🚨 checkQuestionGenerationStatus ACTION CALLED ON EDIT PAGE! 🚨🚨🚨"
  );

  if (!state.isEditing) {
    return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
  }

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  const resourceQuestions = state.form?.resourceQuestions;
  const isGenerating = resourceQuestions?.isGenerating || false;
  const generationErrors = resourceQuestions?.generationErrors || [];
  const questions = resourceQuestions?.questions || [];

  if (isGenerating) {
    return `🤖 **AI Generation Status: IN PROGRESS**

**Status:** Currently generating questions...

**What's happening:**
- AI is analyzing your resources and skills
- Creating optimized evaluation questions
- This typically takes 10-30 seconds

**Please wait** - questions will appear automatically when complete.`;
  } else if (generationErrors.length > 0) {
    return `❌ **AI Generation Status: ERROR**

**Status:** Generation failed

**Errors:**
${generationErrors.map((error: any) => `- ${error}`).join("\n")}

**Next steps:**
- Check that your resources have skills defined
- Try the generateQuestionsWithAI action again
- If the issue persists, contact support`;
  } else if (questions.length > 0) {
    return `✅ **AI Generation Status: COMPLETE**

**Status:** Successfully generated ${questions.length} questions

**Questions created:**
${questions
  .map((q: any, i: number) => {
    const questionText =
      (FormField.getValue(q.question as any) as string) || "(not set)";
    return `${i + 1}. ${questionText.substring(0, 100)}${questionText.length > 100 ? "..." : ""}`;
  })
  .join("\n")}

**Next steps:**
- Review the generated questions
- Customize them if needed using updateQuestion()
- Add more questions manually if desired`;
  } else {
    return `📋 **AI Generation Status: READY**

**Status:** No questions generated yet

**To generate questions:**
- Use the generateQuestionsWithAI action
- Make sure you have resources with skills defined
- The AI will create optimized questions based on your requirements`;
  }
};

export const checkQuestionGenerationStatusCopilotAction = {
  name: "checkQuestionGenerationStatus_review",
  description:
    "Check the current status of AI question generation. Use this to see if generation is in progress, complete, or if there were any errors.",
  parameters: [],
  action: checkQuestionGenerationStatusAction
};
