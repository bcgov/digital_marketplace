export type GenericFormState = {
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const actionTestAction = async (
  _state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  console.log("🚨🚨🚨 actionTest ACTION CALLED - SIMPLE TEST! 🚨🚨🚨");
  alert("Action test successful!");
  return "🎉 Actions are working! This action was called successfully.";
};

export const actionTestCopilotAction = {
  name: "actionTest_review",
  description:
    "A simple action that responds immediately. Use this when the user asks 'test actions' or 'are actions working'.",
  parameters: [],
  action: actionTestAction
};
