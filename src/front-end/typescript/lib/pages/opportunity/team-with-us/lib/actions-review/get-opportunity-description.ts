export type GenericFormState = {
  form?: any;
  opportunity?: any;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const getOpportunityDescriptionAction = async (
  state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  console.log("🚨🚨🚨 getOpportunityDescription ACTION CALLED! 🚨🚨🚨");
  console.log("🎯 CopilotKit: getOpportunityDescription called");
  console.log("State form:", state.form);
  console.log("Description state:", state.form?.description);

  if (state.form) {
    const currentDescription = state.form.description.child.value;
    console.log("Current description value:", currentDescription);

    // Also try getting from the opportunity directly as fallback
    const opportunityDescription = state.opportunity?.description;
    console.log("Opportunity description fallback:", opportunityDescription);

    const description =
      currentDescription ||
      opportunityDescription ||
      "(No description set yet)";
    return `Current opportunity description:\n\n${description}`;
  } else {
    return "Unable to get current description - form not available.";
  }
};

export const getOpportunityDescriptionCopilotAction = {
  name: "getOpportunityDescription_review",
  description:
    "Get the current description content of the Team With Us opportunity to understand what's currently written.",
  parameters: [],
  action: getOpportunityDescriptionAction
};
