import { adt } from "shared/lib/types";
import { twuServiceAreaToTitleCase } from "front-end/lib/pages/opportunity/team-with-us/lib";
import {
  GenericFormState,
  GenericDispatch,
  detectWorkflowType
} from "./base-action-template";

// EXACT ORIGINAL FUNCTIONALITY PRESERVED - NO ADDITIONAL FEATURES ADDED
export const updateResourceAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  resourceIndex: string, // PRESERVED: Original takes string, not number
  fieldName: string,
  value: string // PRESERVED: Original takes string, not any
): Promise<string> => {
  console.log("🚨🚨🚨 UNIFIED updateResource ACTION CALLED! 🚨🚨🚨");
  console.log("🎯 CopilotKit: Unified updateResource called with:", {
    resourceIndex,
    fieldName,
    value
  });

  // Auto-detect workflow type
  const workflowType = detectWorkflowType(state);
  console.log(
    `🔍 Detected workflow: ${workflowType}, isEditing: ${state.isEditing}`
  );

  // PRESERVED FROM REVIEW ORIGINAL: Check if editing mode is required
  if (workflowType === "review" && !state.isEditing) {
    return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
  }

  // PRESERVED FROM BOTH ORIGINALS: Check if form exists
  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  // PRESERVED FROM BOTH ORIGINALS: Parse and validate resource index
  const index = parseInt(resourceIndex);
  if (isNaN(index) || index < 0) {
    return "❌ Error: Invalid resource index. Please provide a valid number (0 for first resource, 1 for second, etc.)";
  }

  // PRESERVED FROM BOTH ORIGINALS: Check if resource exists
  const resourceCount = state.form?.resources?.resources?.length || 0;
  if (index >= resourceCount) {
    return `❌ Error: Resource index ${index} does not exist. There are only ${resourceCount} resources (indices 0-${resourceCount - 1}).`;
  }

  // PRESERVED FROM BOTH ORIGINALS: Validate field name
  const validFields = [
    "serviceArea",
    "targetAllocation",
    "mandatorySkills",
    "optionalSkills"
  ];
  if (!validFields.includes(fieldName)) {
    return `❌ Error: Invalid field name '${fieldName}'. Valid fields: ${validFields.join(", ")}`;
  }

  try {
    // Switch to Resource Details tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Resource Details" as const))
    );
    console.log("Switching to Resource Details tab:", switchTabMsg);
    dispatch(switchTabMsg);

    await new Promise((resolve) => setTimeout(resolve, 100));

    let updateMsg;

    if (fieldName === "serviceArea") {
      // PRESERVED FROM BOTH ORIGINALS: Validate service area value
      const validServiceAreas = [
        "FULL_STACK_DEVELOPER",
        "DATA_PROFESSIONAL",
        "AGILE_COACH",
        "DEVOPS_SPECIALIST",
        "SERVICE_DESIGNER"
      ];
      if (!validServiceAreas.includes(value)) {
        return `❌ Error: Invalid service area '${value}'. Valid service areas: ${validServiceAreas.join(", ")}`;
      }

      // PRESERVED FROM BOTH ORIGINALS: Service area update structure
      updateMsg = adt(
        "form",
        adt(
          "resources",
          adt("serviceArea", {
            rIndex: index,
            childMsg: adt(
              "child",
              adt("onChange", {
                value,
                label: twuServiceAreaToTitleCase(value as any)
              })
            )
          })
        )
      );
    } else if (fieldName === "targetAllocation") {
      // PRESERVED FROM BOTH ORIGINALS: Validate target allocation
      const allocation = parseInt(value);
      if (isNaN(allocation) || allocation < 10 || allocation > 100) {
        return "❌ Error: Target allocation must be a number between 10 and 100 (representing percentage)";
      }

      // PRESERVED FROM BOTH ORIGINALS: Target allocation update structure
      updateMsg = adt(
        "form",
        adt(
          "resources",
          adt("targetAllocation", {
            rIndex: index,
            childMsg: adt(
              "child",
              adt("onChange", {
                value: String(allocation),
                label: String(allocation)
              })
            )
          })
        )
      );
    } else if (
      fieldName === "mandatorySkills" ||
      fieldName === "optionalSkills"
    ) {
      // PRESERVED FROM BOTH ORIGINALS: Parse comma-separated skills
      const skills = value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const skillOptions = skills.map((skill) => ({
        value: skill,
        label: skill
      }));

      // PRESERVED FROM BOTH ORIGINALS: Skills update structure
      updateMsg = adt(
        "form",
        adt(
          "resources",
          adt(fieldName, {
            rIndex: index,
            childMsg: adt("child", adt("onChange", skillOptions))
          })
        )
      );
    }

    console.log("Dispatching resource update:", updateMsg);
    dispatch(updateMsg);

    // USE REVIEW TIMING FOR BOTH: 500ms wait (review original timing)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // USE REVIEW BEHAVIOR FOR BOTH: Get updated value to confirm
    const updatedResource = state.form?.resources?.resources?.[index];
    let currentValue = "(not set)";

    if (fieldName === "serviceArea") {
      currentValue =
        updatedResource?.serviceArea?.child?.value?.value || "(not set)";
    } else if (fieldName === "targetAllocation") {
      currentValue =
        updatedResource?.targetAllocation?.child?.value?.toString() ||
        "(not set)";
    } else if (fieldName === "mandatorySkills") {
      currentValue =
        updatedResource?.mandatorySkills?.child?.value
          ?.map((s: any) => s.value)
          .join(", ") || "(not set)";
    } else if (fieldName === "optionalSkills") {
      currentValue =
        updatedResource?.optionalSkills?.child?.value
          ?.map((s: any) => s.value)
          .join(", ") || "(not set)";
    }

    // USE REVIEW SUCCESS MESSAGE FOR BOTH workflows
    // const workflowSpecificTip =
    //   workflowType === "review"
    //     ? "Don't forget to save your changes when you're ready!"
    //     : "Don't forget to save or publish your opportunity when you're ready!";

    return `✅ **Resource ${index + 1} ${fieldName} updated successfully!**

**Field:** ${fieldName}
**New value:** ${value}
**Current value in form:** ${currentValue}`;

    // 💡 **Tip:** The resource has been updated in the form. ${workflowSpecificTip}`;
  } catch (error: any) {
    console.error("❌ Error updating resource:", error);
    return `❌ Error: Failed to update resource ${fieldName} - ${error.message}`;
  }
};

// Export the complete useCopilotAction configuration
export const updateResourceCopilotAction = {
  name: "updateResource",
  description:
    "Update a specific field of a resource in the Team With Us opportunity. Use this to modify service area, target allocation, or skills.",
  parameters: [
    {
      name: "resourceIndex",
      type: "string", // PRESERVED: Original takes string, not number
      description:
        "The index of the resource to update (0-based, e.g., '0' for first resource, '1' for second resource)",
      required: true
    },
    {
      name: "fieldName",
      type: "string",
      description:
        "The field to update. Options: 'serviceArea', 'targetAllocation', 'mandatorySkills', 'optionalSkills'",
      required: true
    },
    {
      name: "value",
      type: "string", // PRESERVED: Original takes string, not any
      description:
        "The new value. For serviceArea use: 'FULL_STACK_DEVELOPER', 'DATA_PROFESSIONAL', 'AGILE_COACH', 'DEVOPS_SPECIALIST', 'SERVICE_DESIGNER'. For targetAllocation use percentage as string (e.g., '50'). For skills use comma-separated values (e.g., 'JavaScript,React,Node.js').",
      required: true
    }
  ],
  action: updateResourceAction
};
