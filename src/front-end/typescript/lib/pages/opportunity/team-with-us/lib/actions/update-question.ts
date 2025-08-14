import { adt } from "shared/lib/types";

export type GenericFormState = {
  form?: any;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const updateQuestionAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  questionIndex: string,
  fieldName: string,
  value: string
): Promise<string> => {
  console.log("🚨🚨🚨 updateQuestion ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
  console.log(
    "Question index:",
    questionIndex,
    "Field:",
    fieldName,
    "Value:",
    value
  );

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  const index = parseInt(questionIndex);
  if (isNaN(index) || index < 0) {
    return "❌ Error: Invalid question index. Please provide a valid number (0 for first question, 1 for second, etc.)";
  }

  const questionCount = state.form?.resourceQuestions?.questions?.length || 0;
  if (index >= questionCount) {
    return `❌ Error: Question index ${index} does not exist. There are only ${questionCount} questions (indices 0-${questionCount - 1}).`;
  }

  // Validate field name
  const validFields = [
    "text",
    "guideline",
    "wordLimit",
    "score",
    "minimumScore"
  ];
  if (!validFields.includes(fieldName)) {
    return `❌ Error: Invalid field name '${fieldName}'. Valid fields: ${validFields.join(", ")}`;
  }

  try {
    // Switch to Resource Questions tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const))
    );
    dispatch(switchTabMsg as any);

    await new Promise((resolve) => setTimeout(resolve, 200));

    let updateMsg;

    if (fieldName === "text") {
      updateMsg = adt(
        "form",
        adt(
          "resourceQuestions",
          adt("questionText", {
            qIndex: index,
            childMsg: adt("onChangeTextArea", [value, 0, value.length])
          })
        )
      );
    } else if (fieldName === "guideline") {
      updateMsg = adt(
        "form",
        adt(
          "resourceQuestions",
          adt("guidelineText", {
            qIndex: index,
            childMsg: adt("onChangeTextArea", [value, 0, value.length])
          })
        )
      );
    } else if (fieldName === "wordLimit") {
      const limit = parseInt(value);
      if (isNaN(limit) || limit < 1 || limit > 2000) {
        return "❌ Error: Word limit must be a number between 1 and 2000";
      }

      updateMsg = adt(
        "form",
        adt(
          "resourceQuestions",
          adt("wordLimit", {
            qIndex: index,
            childMsg: adt("child", adt("onChange", limit))
          })
        )
      );
    } else if (fieldName === "score") {
      const score = parseInt(value);
      if (isNaN(score) || score < 1 || score > 100) {
        return "❌ Error: Score must be a number between 1 and 100";
      }

      updateMsg = adt(
        "form",
        adt(
          "resourceQuestions",
          adt("score", {
            qIndex: index,
            childMsg: adt("child", adt("onChange", score))
          })
        )
      );
    } else if (fieldName === "minimumScore") {
      const minScore = parseInt(value);
      if (isNaN(minScore) || minScore < 0 || minScore > 100) {
        return "❌ Error: Minimum score must be a number between 0 and 100";
      }

      updateMsg = adt(
        "form",
        adt(
          "resourceQuestions",
          adt("minimumScore", {
            qIndex: index,
            childMsg: adt("child", adt("onChange", minScore))
          })
        )
      );
    }

    console.log("Dispatching question update:", updateMsg);
    dispatch(updateMsg as any);

    await new Promise((resolve) => setTimeout(resolve, 500));

    return `✅ **Question ${index + 1} ${fieldName} updated successfully during creation!**

**Field:** ${fieldName}
**New value:** ${value}

💡 **Tip:** The question has been updated in the form. Don't forget to save your changes when you're ready!`;
  } catch (error: any) {
    console.error("❌ Error updating question:", error);
    return `❌ Error: Failed to update question ${fieldName} - ${error.message}`;
  }
};

export const updateQuestionCopilotAction = {
  name: "updateQuestion",
  description:
    "Update a specific field of a resource question in the Team With Us opportunity during creation. Use this to modify question text, guidelines, word limits, or scoring.",
  parameters: [
    {
      name: "questionIndex",
      type: "string",
      description:
        "The index of the question to update (0-based, e.g., '0' for first question, '1' for second question)",
      required: true
    },
    {
      name: "fieldName",
      type: "string",
      description:
        "The field to update. Options: 'text', 'guideline', 'wordLimit', 'score', 'minimumScore'",
      required: true
    },
    {
      name: "value",
      type: "string",
      description:
        "The new value. For 'text' and 'guideline' use plain text. For 'wordLimit', 'score', and 'minimumScore' use numbers as strings (e.g., '500', '20', '10').",
      required: true
    }
  ],
  action: updateQuestionAction
};
