import { DEFAULT_LOCATION } from "front-end/config";
import {
  UnifiedActionContext,
  createActionError,
  detectWorkflowType
} from "./base-action-template";

// Keep original GenericFormState for backward compatibility but extend with UnifiedActionContext
export type GenericFormState = UnifiedActionContext & {
  form?: {
    title?: { child: { value: string } };
    teaser?: { child: { value: string } };
    location?: { child: { value: string } };
    proposalDeadline?: { child: { value: string } };
    startDate?: { child: { value: string } };
    completionDate?: { child: { value: string } };
    maxBudget?: { child: { value: number } };
    resources?: { resources: any[] };
    description?: { child: { value: string } };
    resourceQuestions?: { questions: any[] };
  };
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

// Creation workflow action function - PRESERVED EXACT ORIGINAL FUNCTIONALITY
export const getCreationProgressAction = async (
  state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  console.log("🚨🚨🚨 getCreationProgress ACTION CALLED! 🚨🚨🚨");

  // Check workflow type - this action is only for creation workflow
  const workflowType = detectWorkflowType(state);
  if (workflowType !== "create") {
    return createActionError(
      "Invalid Workflow",
      "The getCreationProgress action can only be used in the creation workflow.",
      "This action is for tracking creation progress. For reviewing existing opportunities, use the review workflow."
    );
  }

  // EXACT ORIGINAL CODE - NO CHANGES TO LOGIC OR FUNCTIONALITY
  if (!state.form) {
    return "❌ Error: Form not available.";
  }

  const progress = {
    hasTitle: (state.form.title?.child.value || "").trim().length > 0,
    hasTeaser: (state.form.teaser?.child.value || "").trim().length > 0,
    hasLocation:
      state.form.location?.child.value &&
      state.form.location.child.value.trim() !== DEFAULT_LOCATION,
    hasProposalDeadline: !!state.form.proposalDeadline?.child.value,
    hasStartDate: !!state.form.startDate?.child.value,
    hasCompletionDate: !!state.form.completionDate?.child.value,
    hasBudget: !!(
      state.form.maxBudget?.child.value && state.form.maxBudget.child.value > 0
    ),
    resourceCount: (state.form.resources?.resources || []).length,
    hasDescription:
      (state.form.description?.child.value || "").trim().length > 0,
    questionCount: (state.form.resourceQuestions?.questions || []).length
  };

  let nextStep = "";
  let currentProgress = "";

  if (!progress.hasTitle) {
    nextStep = "**Next:** Ask for the project title";
    currentProgress = "Starting project overview";
  } else if (!progress.hasTeaser) {
    nextStep = "**Next:** Ask for a project summary/teaser (2-3 sentences)";
    currentProgress = "Title ✅";
  } else if (!progress.hasLocation) {
    nextStep = "**Next:** Ask for the project location";
    currentProgress = "Title ✅, Teaser ✅";
  } else if (!progress.hasProposalDeadline) {
    nextStep = "**Next:** Ask for proposal deadline date";
    currentProgress = "Overview section ✅";
  } else if (!progress.hasStartDate) {
    nextStep = "**Next:** Ask for project start date";
    currentProgress = "Overview ✅, Deadline ✅";
  } else if (!progress.hasCompletionDate) {
    nextStep = "**Next:** Ask for expected completion date";
    currentProgress = "Timeline partially complete";
  } else if (!progress.hasBudget) {
    nextStep = "**Next:** Ask for maximum budget";
    currentProgress = "Timeline ✅";
  } else if (progress.resourceCount === 0) {
    nextStep =
      "**Next:** Ask about resource requirements (what skills/roles needed)";
    currentProgress = "Budget ✅";
  } else if (!progress.hasDescription) {
    nextStep = "**Next:** Ask for detailed project description";
    currentProgress = "Resources ✅ (" + progress.resourceCount + " added)";
  } else if (progress.questionCount === 0) {
    nextStep = "**Next:** Create evaluation questions for assessing proposals";
    currentProgress = "Description ✅";
  } else {
    nextStep = "**Ready for final review!**";
    currentProgress = "All sections complete ✅";
  }

  return `## 📊 **Creation Progress**

${currentProgress}

${nextStep}

### 📋 **Completion Status:**
- Title: ${progress.hasTitle ? "✅" : "❌"}
- Summary: ${progress.hasTeaser ? "✅" : "❌"}
- Location: ${progress.hasLocation ? "✅" : "❌"}
- Proposal Deadline: ${progress.hasProposalDeadline ? "✅" : "❌"}
- Start Date: ${progress.hasStartDate ? "✅" : "❌"}
- Completion Date: ${progress.hasCompletionDate ? "✅" : "❌"}
- Budget: ${progress.hasBudget ? "✅" : "❌"}
- Resources: ${progress.resourceCount > 0 ? `✅ (${progress.resourceCount})` : "❌"}
- Description: ${progress.hasDescription ? "✅" : "❌"}
- Questions: ${progress.questionCount > 0 ? `✅ (${progress.questionCount})` : "❌"}`;
};

// Export the complete useCopilotAction configuration
export const getCreationProgressCopilotAction = {
  name: "getCreationProgress",
  description:
    "CREATION WORKFLOW: Analyze the current progress of opportunity creation and provide detailed feedback on completion status, next steps, and suggested actions. This action is only available in the creation workflow.",
  parameters: [],
  action: getCreationProgressAction
};
