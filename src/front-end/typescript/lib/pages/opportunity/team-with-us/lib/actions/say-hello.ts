import {
  GenericFormState,
  detectWorkflowType,
  createActionSuccess
} from "./base-action-template";

export const sayHelloAction = async (
  state: GenericFormState,
  _dispatch: any,
  name: string
): Promise<string> => {
  console.log("🚨🚨🚨 UNIFIED sayHello ACTION CALLED! 🚨🚨🚨");
  console.log("Name parameter:", name);

  const workflowType = detectWorkflowType(state);
  console.log(`🔍 Detected workflow: ${workflowType}`);

  // Simple alert for greeting
  alert(`Hello, ${name}!`);

  return createActionSuccess(
    "Hello!",
    `Hello, ${name}! 👋\n\n**Workflow:** ${workflowType}`,
    `Greeting sent in ${workflowType} workflow`
  );
};

export const sayHelloCopilotAction = {
  name: "sayHello",
  description:
    "UNIFIED: Say hello to someone. Works in both creation and review workflows.",
  parameters: [
    {
      name: "name",
      type: "string",
      description: "Name of the person to greet"
    }
  ],
  action: sayHelloAction
};
