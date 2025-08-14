export type GenericFormState = {
  form?: any;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const getResourceDetailsAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  resourceIndex?: string
): Promise<string> => {
  console.log("🚨🚨🚨 getResourceDetails ACTION CALLED! 🚨🚨🚨");
  console.log("Resource index:", resourceIndex);

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  const resources = state.form?.resources?.resources || [];
  if (resources.length === 0) {
    return "📋 **No resources found**\n\n💡 **Tip:** You can add resources using the addResource action.";
  }

  try {
    if (
      resourceIndex !== undefined &&
      resourceIndex !== null &&
      resourceIndex !== ""
    ) {
      // Get specific resource
      const index = parseInt(resourceIndex);
      if (isNaN(index) || index < 0 || index >= resources.length) {
        return `❌ Error: Invalid resource index ${resourceIndex}. Available indices: 0-${resources.length - 1}`;
      }

      const resource = resources[index];
      const serviceArea =
        resource.serviceArea?.child?.value?.value || "(not set)";
      const targetAllocation =
        resource.targetAllocation?.child?.value?.value || "(not set)";
      const mandatorySkills =
        resource.mandatorySkills?.child?.value
          ?.map((s: any) => s.value)
          .join(", ") || "(not set)";
      const optionalSkills =
        resource.optionalSkills?.child?.value
          ?.map((s: any) => s.value)
          .join(", ") || "(not set)";

      return `📋 **Resource ${index + 1} Details:**

**Service Area:** ${serviceArea}
**Target Allocation:** ${targetAllocation}%
**Mandatory Skills:** ${mandatorySkills}
**Optional Skills:** ${optionalSkills}

💡 **Tip:** You can update these fields using the updateResource action.`;
    } else {
      // Get all resources
      let response = `📋 **All Resources (${resources.length} total):**\n\n`;

      resources.forEach((resource: any, index: number) => {
        const serviceArea =
          resource.serviceArea?.child?.value?.value || "(not set)";
        const targetAllocation =
          resource.targetAllocation?.child?.value?.value || "(not set)";
        const mandatorySkills =
          resource.mandatorySkills?.child?.value
            ?.map((s: any) => s.value)
            .join(", ") || "(not set)";
        const optionalSkills =
          resource.optionalSkills?.child?.value
            ?.map((s: any) => s.value)
            .join(", ") || "(not set)";

        response += `**Resource ${index + 1}:**\n`;
        response += `  - Service Area: ${serviceArea}\n`;
        response += `  - Target Allocation: ${targetAllocation}%\n`;
        response += `  - Mandatory Skills: ${mandatorySkills}\n`;
        response += `  - Optional Skills: ${optionalSkills}\n\n`;
      });

      response +=
        "💡 **Tip:** You can update any resource using updateResource(resourceIndex, fieldName, value) or get details for a specific resource using getResourceDetails(resourceIndex).";

      return response;
    }
  } catch (error) {
    console.error("❌ Error getting resource details:", error);
    return `❌ Error: Failed to get resource details - ${(error as Error).message}`;
  }
};

export const getResourceDetailsCopilotAction = {
  name: "getResourceDetails",
  description:
    "Get the current details of all resources or a specific resource in the Team With Us opportunity.",
  parameters: [
    {
      name: "resourceIndex",
      type: "string",
      description:
        "Optional: The index of the resource to get details for (0-based). If not provided, returns details for all resources.",
      required: false
    }
  ],
  action: getResourceDetailsAction
};
