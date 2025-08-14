import { adt } from "shared/lib/types";
import { parseDateValue } from "../ai";

// Generic types for the wrapper
export type GenericFormState = {
  form?: any;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

// Action function
export const updateOpportunityFieldAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  fieldName: string,
  value: string
): Promise<string> => {
  console.log(
    "🚨🚨🚨 updateOpportunityField ACTION CALLED ON CREATE PAGE! 🚨🚨🚨"
  );
  console.log("🎯 Field:", fieldName, "Value:", value);
  console.log("State.form exists:", !!state.form);

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  // Define field configurations
  const fieldConfigs = {
    // Overview Tab - Text fields
    title: {
      tab: "Overview",
      type: "text",
      msg: adt("form", adt("title", adt("child", adt("onChange", value))))
    },
    teaser: {
      tab: "Overview",
      type: "text",
      msg: adt("form", adt("teaser", adt("child", adt("onChange", value))))
    },
    location: {
      tab: "Overview",
      type: "text",
      msg: adt("form", adt("location", adt("child", adt("onChange", value))))
    },
    remoteDesc: {
      tab: "Overview",
      type: "text",
      msg: adt("form", adt("remoteDesc", adt("child", adt("onChange", value))))
    },

    // Overview Tab - Number fields
    maxBudget: {
      tab: "Overview",
      type: "number",
      msg: adt(
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
      msg: adt(
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
      msg: adt(
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
      msg: adt(
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
      msg: adt(
        "form",
        adt(
          "assignmentDate",
          adt("child", adt("onChange", parseDateValue(value)))
        )
      )
    },
    startDate: {
      tab: "Overview",
      type: "date",
      msg: adt(
        "form",
        adt("startDate", adt("child", adt("onChange", parseDateValue(value))))
      )
    },
    completionDate: {
      tab: "Overview",
      type: "date",
      msg: adt(
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
      msg: adt(
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
      msg: adt(
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
      msg: adt(
        "form",
        adt(
          "priceWeight",
          adt("child", adt("onChange", parseFloat(value) || null))
        )
      )
    }
  };

  const config = fieldConfigs[fieldName as keyof typeof fieldConfigs];
  if (!config) {
    return `❌ Error: Unknown field '${fieldName}'. Available fields: ${Object.keys(fieldConfigs).join(", ")}`;
  }

  try {
    // Switch to the appropriate tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", config.tab as any))
    );
    console.log(`Switching to ${config.tab} tab:`, switchTabMsg);
    dispatch(switchTabMsg as any);

    // Small delay to ensure tab switch completes
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update the field
    console.log("Dispatching field update:", config.msg);
    dispatch(config.msg as any);
    console.log("✅ Field update dispatch completed successfully");

    // Give a moment for the update to process
    await new Promise((resolve) => setTimeout(resolve, 200));

    return `✅ **${fieldName}** updated successfully!

**Tab:** ${config.tab}
**New value:** ${value}
**Field type:** ${config.type}

💡 **Tip:** The field has been updated in the form. Don't forget to save or publish your opportunity when you're ready!`;
  } catch (error: any) {
    console.error("❌ Error in updateOpportunityField:", error);
    return `❌ Error: Failed to update ${fieldName} - ${error.message}`;
  }
};

// Export the complete useCopilotAction configuration
export const updateOpportunityFieldCopilotAction = {
  name: "updateOpportunityField",
  description:
    "Update any field in the Team With Us opportunity form during creation. Use this when users want to modify specific fields like title, location, budget, dates, etc.",
  parameters: [
    {
      name: "fieldName",
      type: "string",
      description:
        "The field to update. Options: 'title', 'teaser', 'location', 'maxBudget', 'costRecovery', 'remoteOk', 'remoteDesc', 'proposalDeadline', 'assignmentDate', 'startDate', 'completionDate', 'questionsWeight', 'challengeWeight', 'priceWeight'",
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
