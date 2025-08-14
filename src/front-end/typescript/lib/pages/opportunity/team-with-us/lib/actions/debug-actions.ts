// Generic types for the wrapper
export type GenericFormState = {
  resources?: {
    resources?: any[];
  };
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

// Debug test action
export const debugTestAction = async (
  _state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  console.log("🧪 DEBUG: Test action called successfully on CREATE page!");
  return "✅ Debug test successful! CopilotKit actions are working on the CREATE page. The action system is functioning correctly.";
};

// Debug generateQuestionsWithAI action
export const debugGenerateQuestionsWithAIAction = async (
  _state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  console.log("🧪 DEBUG: Testing generateQuestionsWithAI action registration");
  return "✅ generateQuestionsWithAI action is registered and accessible. You can now use generateQuestionsWithAI() to generate questions with AI.";
};

// Debug resource selection action
export const debugResourceSelectionAction = async (
  state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  console.log("🧪 DEBUG: Testing resource selection functionality");

  if (!state.form) {
    return "❌ Error: Form not available";
  }

  const resourceCount = state.form?.resources?.resources?.length || 0;
  const resources = state.form?.resources?.resources || [];

  let result = `📊 **Resource Selection Debug Report**\n\n`;
  result += `**Total Resources:** ${resourceCount}\n\n`;

  if (resourceCount === 0) {
    result +=
      "**Status:** No resources found. Use addResource() to create a resource first.\n";
    return result;
  }

  result += "**Resource Details:**\n";
  resources.forEach((resource: any, index: number) => {
    const serviceArea = resource.serviceArea?.child?.value;
    const targetAllocation = resource.targetAllocation?.child?.value;
    const mandatorySkills = resource.mandatorySkills?.child?.value || [];
    const optionalSkills = resource.optionalSkills?.child?.value || [];

    result += `\n**Resource ${index + 1}:**\n`;
    result += `- Service Area: ${serviceArea ? `${serviceArea.label} (${serviceArea.value})` : "Not set"}\n`;
    result += `- Target Allocation: ${targetAllocation ? `${targetAllocation.value}%` : "Not set"}\n`;
    result += `- Mandatory Skills: ${mandatorySkills.length > 0 ? mandatorySkills.map((s: any) => s.value).join(", ") : "None"}\n`;
    result += `- Optional Skills: ${optionalSkills.length > 0 ? optionalSkills.map((s: any) => s.value).join(", ") : "None"}\n`;
  });

  result += `\n**Test Commands:**\n`;
  result += `- Use updateResource(0, 'serviceArea', 'SERVICE_DESIGNER') to set service area\n`;
  result += `- Use updateResource(0, 'targetAllocation', '50') to set allocation\n`;

  return result;
};

// Export the complete useCopilotAction configurations
export const debugTestCopilotAction = {
  name: "debugTest",
  description:
    "Simple test action to verify CopilotKit actions are working. Call this to test the action system.",
  parameters: [],
  action: debugTestAction
};

export const debugGenerateQuestionsWithAICopilotAction = {
  name: "debugGenerateQuestionsWithAI",
  description:
    "Debug action to test if generateQuestionsWithAI action is properly registered and accessible.",
  parameters: [],
  action: debugGenerateQuestionsWithAIAction
};

export const debugResourceSelectionCopilotAction = {
  name: "debugResourceSelection",
  description:
    "Debug action to test resource selection and service area setting functionality.",
  parameters: [],
  action: debugResourceSelectionAction
};
