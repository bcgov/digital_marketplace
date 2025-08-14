import { adt } from "shared/lib/types";
import { twuServiceAreaToTitleCase } from "front-end/lib/pages/opportunity/team-with-us/lib";

export type GenericFormState = {
  form?: any;
  isEditing?: boolean;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const updateResourceAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  resourceIndex: string,
  fieldName: string,
  value: string
): Promise<string> => {
  console.log("🚨🚨🚨 updateResource ACTION CALLED! 🚨🚨🚨");
  console.log(
    "Resource index:",
    resourceIndex,
    "Field:",
    fieldName,
    "Value:",
    value
  );

  if (!state.isEditing) {
    return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
  }

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  const index = parseInt(resourceIndex);
  if (isNaN(index) || index < 0) {
    return "❌ Error: Invalid resource index. Please provide a valid number (0 for first resource, 1 for second, etc.)";
  }

  const resourceCount = state.form?.resources?.resources?.length || 0;
  if (index >= resourceCount) {
    return `❌ Error: Resource index ${index} does not exist. There are only ${resourceCount} resources (indices 0-${resourceCount - 1}).`;
  }

  // Validate field name
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

    await new Promise((resolve) => setTimeout(resolve, 200));

    let updateMsg;

    if (fieldName === "serviceArea") {
      // Validate service area value
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
      const allocation = parseInt(value);
      if (isNaN(allocation) || allocation < 10 || allocation > 100) {
        return "❌ Error: Target allocation must be a number between 10 and 100 (representing percentage)";
      }

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
      // Parse comma-separated skills
      const skills = value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const skillOptions = skills.map((skill) => ({
        value: skill,
        label: skill
      }));

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

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get the updated value to confirm it was set
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

    return `✅ **Resource ${index + 1} ${fieldName} updated successfully!**

**Field:** ${fieldName}
**New value:** ${value}
**Current value in form:** ${currentValue}

💡 **Tip:** The resource has been updated in the form. Don't forget to save your changes when you're ready!`;
  } catch (error: any) {
    console.error("❌ Error updating resource:", error);
    return `❌ Error: Failed to update resource ${fieldName} - ${error.message}`;
  }
};

export const updateResourceCopilotAction = {
  name: "updateResource",
  description:
    "Update a specific field of a resource in the Team With Us opportunity. Use this to modify service area, target allocation, or skills.",
  parameters: [
    {
      name: "resourceIndex",
      type: "string",
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
      type: "string",
      description:
        "The new value. For serviceArea use: 'FULL_STACK_DEVELOPER', 'DATA_PROFESSIONAL', 'AGILE_COACH', 'DEVOPS_SPECIALIST', 'SERVICE_DESIGNER'. For targetAllocation use percentage as string (e.g., '50'). For skills use comma-separated values (e.g., 'JavaScript,React,Node.js').",
      required: true
    }
  ],
  action: updateResourceAction
};
