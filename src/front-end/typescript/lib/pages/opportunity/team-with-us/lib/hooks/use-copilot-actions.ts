import { useCopilotActionWrapper } from "./use-copilot-action-wrapper";
import { useCopilotChat } from "@copilotkit/react-core";

export interface UseCopilotActionsParams {
  state: any;
  dispatch: any;
  context: "create" | "edit";
}

/**
 * Unified hook for all CopilotKit actions used across create and edit pages
 * This centralizes all action registrations and ensures consistency
 */
export function useCopilotActions({
  state,
  dispatch,
  context
}: UseCopilotActionsParams) {
  const { appendMessage, reset } = useCopilotChat();

  // Map "edit" context to "review" for compatibility with existing action wrapper
  const workflow = context === "edit" ? "review" : context;

  // ==================== CRITERIA AND DOCUMENTATION ACTIONS ====================
  useCopilotActionWrapper(
    "getCriteriaDocumentation",
    state,
    dispatch,
    workflow
  );
  useCopilotActionWrapper("listAvailableDocuments", state, dispatch, workflow);

  // ==================== DEBUG ACTIONS ====================
  useCopilotActionWrapper(
    "debugGenerateQuestionsWithAI",
    state,
    dispatch,
    workflow
  );
  useCopilotActionWrapper("debugResourceSelection", state, dispatch, workflow);

  // ==================== OPPORTUNITY FIELD MANAGEMENT ACTIONS ====================
  useCopilotActionWrapper(
    "updateOpportunityDescription",
    state,
    dispatch,
    workflow
  );
  useCopilotActionWrapper(
    "getOpportunityFieldValue",
    state,
    dispatch,
    workflow
  );
  useCopilotActionWrapper("updateOpportunityField", state, dispatch, workflow);
  useCopilotActionWrapper(
    "getOpportunityDescription",
    state,
    dispatch,
    workflow
  );
  useCopilotActionWrapper("startEditing", state, dispatch, workflow);
  useCopilotActionWrapper("sayHello", state, dispatch, workflow);
  useCopilotActionWrapper("getCreationProgress", state, dispatch, workflow);
  useCopilotActionWrapper("getNextCreationStep", state, dispatch, workflow);

  // ==================== RESOURCE MANAGEMENT ACTIONS ====================
  useCopilotActionWrapper("addResource", state, dispatch, workflow);
  useCopilotActionWrapper("deleteResource", state, dispatch, workflow);
  useCopilotActionWrapper("updateResource", state, dispatch, workflow);
  useCopilotActionWrapper("getResourceDetails", state, dispatch, workflow);

  // ==================== QUESTION MANAGEMENT ACTIONS ====================
  useCopilotActionWrapper("addQuestion", state, dispatch, workflow);
  useCopilotActionWrapper("deleteQuestion", state, dispatch, workflow);
  useCopilotActionWrapper("updateQuestion", state, dispatch, workflow);
  useCopilotActionWrapper("getQuestionDetails", state, dispatch, workflow);

  // ==================== AI GENERATION ACTIONS ====================
  useCopilotActionWrapper("generateQuestionsWithAI", state, dispatch, workflow);
  useCopilotActionWrapper(
    "checkQuestionGenerationStatus",
    state,
    dispatch,
    workflow
  );

  // ==================== WORKFLOW ACTIONS ====================
  useCopilotActionWrapper(
    "startGuidedCreation",
    state,
    dispatch,
    workflow,
    reset,
    appendMessage
  );
  useCopilotActionWrapper("reviewWithAI", state, dispatch, workflow);

  return {
    appendMessage,
    reset
  };
}
