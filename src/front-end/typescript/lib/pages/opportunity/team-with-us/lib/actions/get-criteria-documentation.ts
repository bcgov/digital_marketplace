import {
  identifyRelevantCriteria,
  generateEnhancedCitationText,
  CRITERIA_MAPPINGS
} from "front-end/lib/pages/opportunity/team-with-us/lib/criteria-mapping";

// Generic types for the wrapper
export type GenericFormState = {
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

// Action function
export const getCriteriaDocumentationAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  criteriaArea?: string
): Promise<string> => {
  console.log("Getting criteria documentation for:", criteriaArea);
  console.log("Parameters received:", { criteriaArea });

  try {
    if (criteriaArea && criteriaArea !== "all") {
      console.log("Processing specific criteria area:", criteriaArea);
      const criteria = identifyRelevantCriteria(criteriaArea);
      console.log("Identified criteria:", criteria);
      const citationText = generateEnhancedCitationText(criteria);
      console.log("Generated citation text:", citationText);
      return `Here's the documentation for the requested criteria area:\n${citationText}`;
    } else {
      console.log("Processing all criteria areas");
      // Return all criteria information
      const allCriteria = Object.keys(CRITERIA_MAPPINGS);
      console.log("All criteria keys:", allCriteria);
      const citationText = generateEnhancedCitationText(allCriteria);
      console.log("Generated citation text for all criteria:", citationText);
      return `Here's the complete Team With Us evaluation criteria documentation:\n${citationText}`;
    }
  } catch (error: any) {
    console.error("❌ Error in getCriteriaDocumentation:", error);
    return `Error retrieving criteria documentation: ${error.message}`;
  }
};

// Export the complete useCopilotAction configuration
export const getCriteriaDocumentationCopilotAction = {
  name: "getCriteriaDocumentation",
  description:
    "Get information about Team With Us evaluation criteria and supporting documentation. Use this when users ask about specific criteria, requirements, or need document references.",
  parameters: [
    {
      name: "criteriaArea",
      type: "string",
      description:
        "The specific criteria area to get information about. Options: 'organization-legal', 'contract-outcomes', 'mandatory-skills', 'timeline-planning', 'budget-financial', 'contract-extensions', 'information-gaps', 'vendor-experience', or 'all' for all criteria.",
      required: false
    }
  ],
  action: getCriteriaDocumentationAction
};
