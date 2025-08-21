import { adt } from "shared/lib/types";
import { parseDateValue } from "../ai";
import {
  GenericFormState,
  GenericDispatch,
  detectWorkflowType,
  createActionError,
  createActionSuccess,
  validateFormExists,
  validateEditMode
} from "./base-action-template";

// Helper function to parse date values (from original review code)
function parseDateValueHelper(dateStr: string) {
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return [parseInt(year), parseInt(month), parseInt(day)];
}

// Comprehensive field configurations from both original implementations
const FIELD_CONFIGS = {
  // Overview Tab - Text fields
  title: {
    tab: "Overview",
    type: "text",
    msg: (value: string) =>
      adt("form", adt("title", adt("child", adt("onChange", value))))
  },
  teaser: {
    tab: "Overview",
    type: "text",
    msg: (value: string) =>
      adt("form", adt("teaser", adt("child", adt("onChange", value))))
  },
  location: {
    tab: "Overview",
    type: "text",
    msg: (value: string) =>
      adt("form", adt("location", adt("child", adt("onChange", value))))
  },
  remoteDesc: {
    tab: "Overview",
    type: "text",
    msg: (value: string) =>
      adt("form", adt("remoteDesc", adt("child", adt("onChange", value))))
  },

  // Overview Tab - Number fields
  maxBudget: {
    tab: "Overview",
    type: "number",
    msg: (value: string) =>
      adt(
        "form",
        adt(
          "maxBudget",
          adt("child", adt("onChange", parseFloat(value) || null))
        )
      )
  },
  costRecovery: {
    tab: "Overview",
    type: "number",
    msg: (value: string) =>
      adt(
        "form",
        adt(
          "costRecovery",
          adt("child", adt("onChange", parseFloat(value) || null))
        )
      )
  },

  // Overview Tab - Radio field
  remoteOk: {
    tab: "Overview",
    type: "radio",
    msg: (value: string) =>
      adt(
        "form",
        adt(
          "remoteOk",
          adt("child", adt("onChange", value === "yes" ? "yes" : "no"))
        )
      )
  },

  // Overview Tab - Date fields
  proposalDeadline: {
    tab: "Overview",
    type: "date",
    msg: (value: string) =>
      adt(
        "form",
        adt(
          "proposalDeadline",
          adt("child", adt("onChange", parseDateValue(value)))
        )
      )
  },
  assignmentDate: {
    tab: "Overview",
    type: "date",
    msg: (value: string) =>
      adt(
        "form",
        adt(
          "assignmentDate",
          adt("child", adt("onChange", parseDateValueHelper(value)))
        )
      )
  },
  startDate: {
    tab: "Overview",
    type: "date",
    msg: (value: string) =>
      adt(
        "form",
        adt("startDate", adt("child", adt("onChange", parseDateValue(value))))
      )
  },
  completionDate: {
    tab: "Overview",
    type: "date",
    msg: (value: string) =>
      adt(
        "form",
        adt(
          "completionDate",
          adt("child", adt("onChange", parseDateValue(value)))
        )
      )
  },

  // Scoring Tab - Number fields
  questionsWeight: {
    tab: "Scoring",
    type: "number",
    msg: (value: string) =>
      adt(
        "form",
        adt(
          "questionsWeight",
          adt("child", adt("onChange", parseFloat(value) || null))
        )
      )
  },
  challengeWeight: {
    tab: "Scoring",
    type: "number",
    msg: (value: string) =>
      adt(
        "form",
        adt(
          "challengeWeight",
          adt("child", adt("onChange", parseFloat(value) || null))
        )
      )
  },
  priceWeight: {
    tab: "Scoring",
    type: "number",
    msg: (value: string) =>
      adt(
        "form",
        adt(
          "priceWeight",
          adt("child", adt("onChange", parseFloat(value) || null))
        )
      )
  }
};

// Unified action function
export const updateOpportunityFieldAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  fieldName: string,
  value: string
): Promise<string> => {
  console.log("🚨🚨🚨 UNIFIED updateOpportunityField ACTION CALLED! 🚨🚨🚨");
  console.log("🎯 CopilotKit: Unified updateOpportunityField called with:", {
    fieldName,
    value
  });

  // Auto-detect workflow type
  const workflowType = detectWorkflowType(state);
  console.log(
    `🔍 Detected workflow: ${workflowType}, isEditing: ${state.isEditing}`
  );

  // Validate form exists
  const formError = validateFormExists(state, "updateOpportunityField");
  if (formError) return formError;

  // Validate edit mode for review workflow
  if (workflowType === "review") {
    const editError = validateEditMode(state, "updateOpportunityField");
    if (editError) return editError;
  }

  // Check if the field is supported
  const config = FIELD_CONFIGS[fieldName as keyof typeof FIELD_CONFIGS];
  if (!config) {
    return createActionError(
      "Unknown Field",
      `Unknown field '${fieldName}'. Available fields: ${Object.keys(FIELD_CONFIGS).join(", ")}`,
      "Please use one of the supported field names listed above."
    );
  }

  try {
    console.log("State.form exists:", !!state.form);
    console.log(
      `Current ${fieldName} before update:`,
      state.form?.[fieldName]?.child?.value ||
        state.form?.[fieldName]?.value ||
        "Not found"
    );

    // Switch to the appropriate tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", config.tab as any))
    );
    console.log(`Switching to ${config.tab} tab:`, switchTabMsg);
    dispatch(switchTabMsg);

    // Small delay to ensure tab switch completes
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update the field
    const updateMsg = config.msg(value);
    console.log("Dispatching field update:", updateMsg);
    dispatch(updateMsg);
    console.log("✅ Field update dispatch completed successfully");

    // Give a moment for the update to process
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Determine workflow-specific success message
    // const workflowSpecificMsg =
    //   workflowType === "review"
    //     ? "Don't forget to save your changes when you're ready!"
    //     : "Don't forget to save or publish your opportunity when you're ready!";

    return createActionSuccess(
      "Field Updated Successfully",
      `✅ **${fieldName}** updated successfully!

**Tab:** ${config.tab}
**New value:** ${value}
**Field type:** ${config.type}`

      // 💡 **Tip:** The field has been updated in the form. ${workflowSpecificMsg}`,
      //       `Updated ${fieldName} in ${workflowType} workflow`
    );
  } catch (error: any) {
    console.error("❌ Error in unified updateOpportunityField:", error);
    return createActionError(
      "Update Failed",
      `Failed to update ${fieldName}: ${error.message}`,
      "Please try again or refresh the page if the issue persists."
    );
  }
};

// Export the complete useCopilotAction configuration
export const updateOpportunityFieldCopilotAction = {
  name: "updateOpportunityField",
  description:
    "Update any field in the Team With Us opportunity form. Use this when users want to modify specific fields like title, location, budget, dates, etc.",
  parameters: [
    {
      name: "fieldName",
      type: "string",
      description:
        "The field to update. Complete list: 'title', 'teaser', 'location', 'maxBudget', 'costRecovery', 'remoteOk', 'remoteDesc', 'proposalDeadline', 'assignmentDate', 'startDate', 'completionDate', 'questionsWeight', 'challengeWeight', 'priceWeight'",
      required: true
    },
    {
      name: "value",
      type: "string",
      description:
        "The new value for the field. For dates use YYYY-MM-DD format. For remoteOk use 'yes' or 'no'. For numbers use numeric strings.",
      required: true
    }
  ],
  action: updateOpportunityFieldAction
};
