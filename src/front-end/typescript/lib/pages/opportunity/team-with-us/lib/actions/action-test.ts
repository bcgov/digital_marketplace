import { GenericFormState, detectWorkflowType } from "./base-action-template";

export const actionTestAction = async (
  state: GenericFormState,
  _dispatch: any
): Promise<string> => {
  console.log("🚨🚨🚨 UNIFIED actionTest ACTION CALLED - SIMPLE TEST! 🚨🚨🚨");

  const workflowType = detectWorkflowType(state);
  console.log(`🔍 Detected workflow: ${workflowType}`);

  // Simple alert for testing
  alert("Action test successful!");

  return `🎉 **Actions are working!** This unified action was called successfully in ${workflowType} workflow.`;
};

export const actionTestCopilotAction = {
  name: "actionTest",
  description:
    "UNIFIED: A simple action that responds immediately. Use this when the user asks 'test actions' or 'are actions working'. Works in both creation and review workflows.",
  parameters: [],
  action: actionTestAction
};
