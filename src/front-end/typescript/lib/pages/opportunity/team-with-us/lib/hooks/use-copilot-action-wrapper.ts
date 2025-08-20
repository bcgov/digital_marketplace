import React from "react";
import { useCopilotAction } from "@copilotkit/react-core";

// Import unified actions
import { updateOpportunityDescriptionCopilotAction } from "../actions/update-opportunity-description";
import { updateOpportunityFieldCopilotAction } from "../actions/update-opportunity-field";
import { addResourceCopilotAction } from "../actions/add-resource";
import { updateResourceCopilotAction } from "../actions/update-resource";
import { deleteResourceCopilotAction } from "../actions/delete-resource";
import { addQuestionCopilotAction } from "../actions/add-question";
import { updateQuestionCopilotAction } from "../actions/update-question";
import { deleteQuestionCopilotAction } from "../actions/delete-question";
import { getOpportunityFieldValueCopilotAction } from "../actions/get-opportunity-field-value";
import { getResourceDetailsCopilotAction } from "../actions/get-resource-details";
import { getQuestionDetailsCopilotAction } from "../actions/get-question-details";
import { getOpportunityDescriptionCopilotAction } from "../actions/get-opportunity-description";

// Import workflow-specific actions
import { startGuidedCreationCopilotAction } from "../actions/start-guided-creation";
import { startEditingCopilotAction } from "../actions/start-editing";
import { reviewOpportunityCopilotAction } from "../actions/review-opportunity";
import { getCreationProgressCopilotAction } from "../actions/get-creation-progress";
import { getNextCreationStepCopilotAction } from "../actions/get-next-creation-step";
import { reviewWithAICopilotAction } from "../actions/review-with-ai";

// Import utility actions (no changes needed)
import { getCriteriaDocumentationCopilotAction } from "../actions/get-criteria-documentation";
import { listAvailableDocumentsCopilotAction } from "../actions/list-available-documents";
import {
  debugTestCopilotAction,
  debugGenerateQuestionsWithAICopilotAction,
  debugResourceSelectionCopilotAction
} from "../actions/debug-actions";
import { generateQuestionsWithAICopilotAction } from "../actions/generate-questions-with-ai";
import { checkQuestionGenerationStatusCopilotAction } from "../actions/check-question-generation-status";

// Import unified context interface
import { UnifiedActionContext } from "../actions/base-action-template";

// Generic types for the wrapper
export type GenericFormState = {
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

// Helper function to create unified context from existing state
export function createUnifiedContext(
  state: GenericFormState,
  workflow?: "create" | "review"
): UnifiedActionContext {
  // Auto-detect workflow if not provided
  const detectedWorkflow =
    workflow || (state.isEditing !== undefined ? "review" : "create");

  return {
    workflow: detectedWorkflow,
    isEditing: state.isEditing,
    form: state.form,
    opportunity: state.opportunity,
    ...state // Include all other properties
  };
}

// Action configuration interface
export interface CopilotActionConfig {
  name: string;
  description: string;
  parameters: any[];
  action: (
    state: UnifiedActionContext,
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

// Register unified actions (these work for both creation and review workflows)
registerAction(updateOpportunityDescriptionCopilotAction);
registerAction(updateOpportunityFieldCopilotAction);
registerAction(addResourceCopilotAction);
registerAction(updateResourceCopilotAction);
registerAction(deleteResourceCopilotAction);
registerAction(addQuestionCopilotAction);
registerAction(updateQuestionCopilotAction);
registerAction(deleteQuestionCopilotAction);
registerAction(getOpportunityFieldValueCopilotAction);
registerAction(getResourceDetailsCopilotAction);
registerAction(getQuestionDetailsCopilotAction);
registerAction(getOpportunityDescriptionCopilotAction);
registerAction(reviewWithAICopilotAction);

// Register workflow-specific actions
registerAction(startGuidedCreationCopilotAction); // Creation workflow only
registerAction(startEditingCopilotAction); // Review workflow only
registerAction(reviewOpportunityCopilotAction); // Review workflow only
registerAction(getCreationProgressCopilotAction); // Creation workflow only
registerAction(getNextCreationStepCopilotAction); // Creation workflow only
registerAction(reviewWithAICopilotAction); // Review workflow only

// Register review-specific actions that don't have create equivalents
registerAction(getOpportunityDescriptionCopilotAction); // Review workflow only

// Register utility actions (work in both workflows)
registerAction(getCriteriaDocumentationCopilotAction);
registerAction(listAvailableDocumentsCopilotAction);
registerAction(debugTestCopilotAction);
registerAction(debugGenerateQuestionsWithAICopilotAction);
registerAction(debugResourceSelectionCopilotAction);
registerAction(generateQuestionsWithAICopilotAction);
registerAction(checkQuestionGenerationStatusCopilotAction);

// The main wrapper hook for unified actions
export const useCopilotActionWrapper = (
  actionName: string,
  state: GenericFormState,
  dispatch: GenericDispatch,
  workflow?: "create" | "review",
  ...additionalArgs: any[]
) => {
  const action = actionsRegistry[actionName];

  if (!action) {
    console.error(`❌ Action "${actionName}" not found in registry`);
    return;
  }

  // Generate unique handler instance ID for debugging
  const handlerInstanceId = React.useRef(
    Math.random().toString(36).substring(7)
  );
  const componentInstanceId = React.useRef(
    Math.random().toString(36).substring(7)
  );

  // Stabilize the handler with useCallback for unified actions
  const stableHandler = React.useCallback(
    async (params: any) => {
      const executionId = Math.random().toString(36).substring(7);

      // Create unified context from existing state
      const unifiedState = createUnifiedContext(state, workflow);

      console.log(`🚨🚨🚨 UNIFIED ACTION EXECUTING: ${actionName} 🚨🚨🚨`, {
        executionId,
        handlerInstanceId: handlerInstanceId.current,
        componentInstanceId: componentInstanceId.current,
        timestamp: new Date().toISOString(),
        params,
        workflowType: unifiedState.workflow,
        isEditing: unifiedState.isEditing,
        hasForm: !!unifiedState.form
      });

      try {
        // Execute the unified action with enhanced context
        const result = await action.action(
          unifiedState,
          dispatch,
          ...Object.values(params),
          ...additionalArgs // Pass additional args for workflow-specific needs
        );

        console.log(`✅✅✅ UNIFIED ACTION COMPLETED: ${actionName} ✅✅✅`, {
          executionId,
          handlerInstanceId: handlerInstanceId.current,
          componentInstanceId: componentInstanceId.current,
          timestamp: new Date().toISOString(),
          resultLength: result?.length || 0,
          resultPreview: result?.substring(0, 100) || "No result"
        });

        return result;
      } catch (error) {
        console.error(`❌❌❌ UNIFIED ACTION ERROR: ${actionName} ❌❌❌`, {
          executionId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    },
    [actionName, state, dispatch, action, workflow, additionalArgs]
  );

  // Stabilize the action object with useMemo
  const stableAction = React.useMemo(() => {
    return {
      name: action.name,
      description: action.description,
      parameters: action.parameters,
      handler: stableHandler,
      _isRenderAndWait: true // CopilotKit library compatibility flag
    };
  }, [action.name, action.description, action.parameters, stableHandler]);

  // Register with stable dependencies
  return useCopilotAction(stableAction, [stableAction]);
};

// Export the registry for external access if needed
export { actionsRegistry };
