// EXACT ORIGINAL TYPES PRESERVED FROM BOTH ORIGINALS
export type GenericFormState = {
  form?: any;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

// EXACT COMBINATION OF BOTH ORIGINAL ACTIONS - NO ADDITIONAL FUNCTIONALITY
export const getOpportunityFieldValueAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  fieldName: string
): Promise<string> => {
  console.log("🚨🚨🚨 getOpportunityFieldValue ACTION CALLED! 🚨🚨🚨");
  console.log("🎯 Getting value for field:", fieldName);

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  try {
    let currentValue;
    let fieldType = "";

    // Ensure form state is available and properly typed - EXACT FROM CREATE ORIGINAL
    if (
      !state.form ||
      typeof state.form === "boolean" ||
      !("title" in state.form)
    ) {
      return "❌ Error: Form state not available or invalid.";
    }

    // EXACT FIELD HANDLING FROM BOTH ORIGINALS - PRESERVED
    // Text fields
    if (["title", "teaser", "location", "remoteDesc"].includes(fieldName)) {
      currentValue = (state.form as any)[fieldName]?.child?.value || "";
      fieldType = "text";
    }
    // Number fields
    else if (
      [
        "maxBudget",
        "costRecovery",
        "questionsWeight",
        "challengeWeight",
        "priceWeight"
      ].includes(fieldName)
    ) {
      currentValue = (state.form as any)[fieldName]?.child?.value;
      fieldType = "number";
    }
    // Radio field
    else if (fieldName === "remoteOk") {
      currentValue = (state.form as any)[fieldName]?.child?.value;
      fieldType = "radio";
    }
    // Date fields
    else if (
      [
        "proposalDeadline",
        "assignmentDate",
        "startDate",
        "completionDate"
      ].includes(fieldName)
    ) {
      const dateValue = (state.form as any)[fieldName]?.child?.value;
      currentValue = dateValue
        ? `${dateValue[0]}-${String(dateValue[1]).padStart(2, "0")}-${String(dateValue[2]).padStart(2, "0")}`
        : null;
      fieldType = "date";
    } else {
      return `❌ Error: Unknown field '${fieldName}'. Available fields: title, teaser, location, maxBudget, costRecovery, remoteOk, remoteDesc, proposalDeadline, assignmentDate, startDate, completionDate, questionsWeight, challengeWeight, priceWeight`;
    }

    // EXACT RETURN FORMAT FROM BOTH ORIGINALS - PRESERVED
    return `📋 **Current value for ${fieldName}:**

**Value:** ${currentValue !== null && currentValue !== undefined ? currentValue : "(not set)"}
**Type:** ${fieldType}

💡 **Tip:** You can update this field using the updateOpportunityField action.`;
  } catch (error: any) {
    console.error("❌ Error getting field value:", error);
    return `❌ Error: Failed to get ${fieldName} value - ${error.message}`;
  }
};

// EXACT ACTION CONFIGURATION FROM BOTH ORIGINALS - PRESERVED
export const getOpportunityFieldValueCopilotAction = {
  name: "getOpportunityFieldValue",
  description:
    "Get the current value of any field in the Team With Us opportunity form during creation. Use this to check what's currently in a field before updating it.",
  parameters: [
    {
      name: "fieldName",
      type: "string",
      description:
        "The field to get the value from. Options: 'title', 'teaser', 'location', 'maxBudget', 'costRecovery', 'remoteOk', 'remoteDesc', 'proposalDeadline', 'assignmentDate', 'startDate', 'completionDate', 'questionsWeight', 'challengeWeight', 'priceWeight'",
      required: true
    }
  ],
  action: getOpportunityFieldValueAction
};
