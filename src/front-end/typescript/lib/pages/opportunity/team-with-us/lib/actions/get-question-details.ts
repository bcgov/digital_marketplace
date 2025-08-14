import * as FormField from "front-end/lib/components/form-field";

export type GenericFormState = {
  form?: any;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const getQuestionDetailsAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  questionIndex?: string
): Promise<string> => {
  console.log("🚨🚨🚨 getQuestionDetails ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
  console.log("Question index:", questionIndex);

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  const questions = state.form?.resourceQuestions?.questions || [];
  if (questions.length === 0) {
    return "📋 **No questions found**\n\n💡 **Tip:** You can add questions using the addQuestion action.";
  }

  try {
    if (
      questionIndex !== undefined &&
      questionIndex !== null &&
      questionIndex !== ""
    ) {
      // Get specific question
      const index = parseInt(questionIndex);
      if (isNaN(index) || index < 0 || index >= questions.length) {
        return `❌ Error: Invalid question index ${questionIndex}. Available indices: 0-${questions.length - 1}`;
      }

      const question = questions[index];
      // Extract values using FormField.getValue()
      const questionText =
        (FormField.getValue(question.question as any) as string) || "(not set)";
      const guidelineText =
        (FormField.getValue(question.guideline as any) as string) ||
        "(not set)";
      const wordLimit = FormField.getValue(question.wordLimit) || "(not set)";
      const score = FormField.getValue(question.score) || "(not set)";
      const minimumScore =
        FormField.getValue(question.minimumScore) || "(not set)";

      return `📋 **Question ${index + 1} Details:**

**Question Text:** ${questionText}
**Guideline:** ${guidelineText}
**Word Limit:** ${wordLimit}
**Score:** ${score}
**Minimum Score:** ${minimumScore}

💡 **Tip:** You can update these fields using the updateQuestion action.`;
    } else {
      // Get all questions
      let response = `📋 **All Questions (${questions.length} total):**\n\n`;

      questions.forEach((question: any, index: number) => {
        const questionText =
          (FormField.getValue(question.question as any) as string) ||
          "(not set)";
        const guidelineText =
          (FormField.getValue(question.guideline as any) as string) ||
          "(not set)";
        const wordLimit = FormField.getValue(question.wordLimit) || "(not set)";
        const score = FormField.getValue(question.score) || "(not set)";
        const minimumScore =
          FormField.getValue(question.minimumScore) || "(not set)";

        response += `**Question ${index + 1}:**\n`;
        response += `  - Text: ${questionText.substring(0, 100)}${questionText.length > 100 ? "..." : ""}\n`;
        response += `  - Guideline: ${guidelineText.substring(0, 100)}${guidelineText.length > 100 ? "..." : ""}\n`;
        response += `  - Word Limit: ${wordLimit}\n`;
        response += `  - Score: ${score}\n`;
        response += `  - Minimum Score: ${minimumScore}\n\n`;
      });

      response +=
        "💡 **Tip:** You can update any question using updateQuestion(questionIndex, fieldName, value) or get details for a specific question using getQuestionDetails(questionIndex).";

      return response;
    }
  } catch (error: any) {
    console.error("❌ Error getting question details:", error);
    return `❌ Error: Failed to get question details - ${error.message}`;
  }
};

export const getQuestionDetailsCopilotAction = {
  name: "getQuestionDetails",
  description:
    "Get the current details of all questions or a specific question in the Team With Us opportunity during creation.",
  parameters: [
    {
      name: "questionIndex",
      type: "string",
      description:
        "Optional: The index of the question to get details for (0-based). If not provided, returns details for all questions.",
      required: false
    }
  ],
  action: getQuestionDetailsAction
};
