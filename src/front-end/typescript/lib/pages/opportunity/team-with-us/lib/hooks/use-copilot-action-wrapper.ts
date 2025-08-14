import { useCopilotAction } from "@copilotkit/react-core";
import { addQuestionCopilotAction } from "../actions/add-question";
import { getCriteriaDocumentationCopilotAction } from "../actions/get-criteria-documentation";
import { listAvailableDocumentsCopilotAction } from "../actions/list-available-documents";
import {
  debugTestCopilotAction,
  debugGenerateQuestionsWithAICopilotAction,
  debugResourceSelectionCopilotAction
} from "../actions/debug-actions";
import { updateOpportunityDescriptionCopilotAction } from "../actions/update-opportunity-description";
import { getNextCreationStepCopilotAction } from "../actions/get-next-creation-step";
import { updateOpportunityFieldCopilotAction } from "../actions/update-opportunity-field";
import { getCreationProgressCopilotAction } from "../actions/get-creation-progress";
import { getOpportunityFieldValueCopilotAction } from "../actions/get-opportunity-field-value";
import { deleteQuestionCopilotAction } from "../actions/delete-question";
import { updateQuestionCopilotAction } from "../actions/update-question";
import { getQuestionDetailsCopilotAction } from "../actions/get-question-details";
import { addResourceCopilotAction } from "../actions/add-resource";
import { deleteResourceCopilotAction } from "../actions/delete-resource";
import { updateResourceCopilotAction } from "../actions/update-resource";
import { getResourceDetailsCopilotAction } from "../actions/get-resource-details";
import { startGuidedCreationCopilotAction } from "../actions/start-guided-creation";
import { testAddResourceCopilotAction } from "../actions/test-add-resource";
import { testAddQuestionCopilotAction } from "../actions/test-add-question";
import { generateQuestionsWithAICopilotAction } from "../actions/generate-questions-with-ai";
import { checkQuestionGenerationStatusCopilotAction } from "../actions/check-question-generation-status";

// Import actions-review actions
import { updateOpportunityDescriptionCopilotAction as updateOpportunityDescriptionEditCopilotAction } from "../actions-review/update-opportunity-description";
import { getOpportunityDescriptionCopilotAction } from "../actions-review/get-opportunity-description";
import { updateOpportunityFieldCopilotAction as updateOpportunityFieldEditCopilotAction } from "../actions-review/update-opportunity-field";
import { addResourceCopilotAction as addResourceEditCopilotAction } from "../actions-review/add-resource";
import { deleteResourceCopilotAction as deleteResourceEditCopilotAction } from "../actions-review/delete-resource";
import { updateResourceCopilotAction as updateResourceEditCopilotAction } from "../actions-review/update-resource";
import { getResourceDetailsCopilotAction as getResourceDetailsEditCopilotAction } from "../actions-review/get-resource-details";
import { addQuestionCopilotAction as addQuestionEditCopilotAction } from "../actions-review/add-question";
import { deleteQuestionCopilotAction as deleteQuestionEditCopilotAction } from "../actions-review/delete-question";
import { updateQuestionCopilotAction as updateQuestionEditCopilotAction } from "../actions-review/update-question";
import { getQuestionDetailsCopilotAction as getQuestionDetailsEditCopilotAction } from "../actions-review/get-question-details";
import { getOpportunityFieldValueCopilotAction as getOpportunityFieldValueEditCopilotAction } from "../actions-review/get-opportunity-field-value";
import { actionTestCopilotAction as actionTestEditCopilotAction } from "../actions-review/action-test";
import { startEditingCopilotAction } from "../actions-review/start-editing";
import { reviewOpportunityCopilotAction as reviewOpportunityEditCopilotAction } from "../actions-review/review-opportunity";
import { sayHelloCopilotAction as sayHelloEditCopilotAction } from "../actions-review/say-hello";
import { generateQuestionsWithAICopilotAction as generateQuestionsWithAIEditCopilotAction } from "../actions-review/generate-questions-with-ai";
import { checkQuestionGenerationStatusCopilotAction as checkQuestionGenerationStatusEditCopilotAction } from "../actions-review/check-question-generation-status";
import { reviewWithAICopilotAction as reviewWithAIEditCopilotAction } from "../actions-review/review-with-ai";

// Generic types for the wrapper
export type GenericFormState = {
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

// Action configuration interface
export interface CopilotActionConfig {
  name: string;
  description: string;
  parameters: any[];
  action: (
    state: GenericFormState,
    dispatch: GenericDispatch,
    ...args: any[]
  ) => Promise<string>;
}

// Actions registry - will be populated as we create more actions
const actionsRegistry: Record<string, CopilotActionConfig> = {};

// Function to register actions
export const registerAction = (action: CopilotActionConfig) => {
  actionsRegistry[action.name] = action;
};

// Auto-register all actions
registerAction(addQuestionCopilotAction);
registerAction(getCriteriaDocumentationCopilotAction);
registerAction(listAvailableDocumentsCopilotAction);
registerAction(debugTestCopilotAction);
registerAction(debugGenerateQuestionsWithAICopilotAction);
registerAction(debugResourceSelectionCopilotAction);
registerAction(updateOpportunityDescriptionCopilotAction);
registerAction(getNextCreationStepCopilotAction);
registerAction(updateOpportunityFieldCopilotAction);
registerAction(getCreationProgressCopilotAction);
registerAction(getOpportunityFieldValueCopilotAction);
registerAction(deleteQuestionCopilotAction);
registerAction(updateQuestionCopilotAction);
registerAction(getQuestionDetailsCopilotAction);
registerAction(addResourceCopilotAction);
registerAction(deleteResourceCopilotAction);
registerAction(updateResourceCopilotAction);
registerAction(getResourceDetailsCopilotAction);
registerAction(startGuidedCreationCopilotAction);
registerAction(testAddResourceCopilotAction);
registerAction(testAddQuestionCopilotAction);
registerAction(generateQuestionsWithAICopilotAction);
registerAction(checkQuestionGenerationStatusCopilotAction);

// Register actions-review actions (these will override the create actions for edit context)
registerAction(updateOpportunityDescriptionEditCopilotAction);
registerAction(getOpportunityDescriptionCopilotAction);
registerAction(updateOpportunityFieldEditCopilotAction);
registerAction(addResourceEditCopilotAction);
registerAction(deleteResourceEditCopilotAction);
registerAction(updateResourceEditCopilotAction);
registerAction(getResourceDetailsEditCopilotAction);
registerAction(addQuestionEditCopilotAction);
registerAction(deleteQuestionEditCopilotAction);
registerAction(updateQuestionEditCopilotAction);
registerAction(getQuestionDetailsEditCopilotAction);
registerAction(getOpportunityFieldValueEditCopilotAction);
registerAction(actionTestEditCopilotAction);
registerAction(startEditingCopilotAction);
registerAction(reviewOpportunityEditCopilotAction);
registerAction(sayHelloEditCopilotAction);
registerAction(generateQuestionsWithAIEditCopilotAction);
registerAction(checkQuestionGenerationStatusEditCopilotAction);
registerAction(reviewWithAIEditCopilotAction);

// The main wrapper hook
export const useCopilotActionWrapper = (
  actionName: string,
  state: GenericFormState,
  dispatch: GenericDispatch,
  ..._args: any[]
) => {
  const action = actionsRegistry[actionName];

  if (!action) {
    console.error(`❌ Action "${actionName}" not found in registry`);
    return;
  }

  return useCopilotAction({
    name: action.name,
    description: action.description,
    parameters: action.parameters,
    handler: async (params: any) =>
      action.action(state, dispatch, ...Object.values(params))
  });
};

// Export the registry for external access if needed
export { actionsRegistry };
