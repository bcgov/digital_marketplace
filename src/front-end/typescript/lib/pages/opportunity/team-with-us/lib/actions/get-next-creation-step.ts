import { DEFAULT_LOCATION } from "front-end/config";
import { createActionError, detectWorkflowType } from "./base-action-template";

// Generic types for the wrapper - PRESERVED FROM ORIGINAL
export type GenericFormState = {
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

// Action function - PRESERVING ALL ORIGINAL FUNCTIONALITY
export const getNextCreationStepAction = async (
  state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  console.log("🚨🚨🚨 getNextCreationStep ACTION CALLED! 🚨🚨🚨");

  // UNIFIED APPROACH: Check workflow type to ensure this is used in creation workflow
  const workflowType = detectWorkflowType(state);
  if (workflowType !== "create") {
    return createActionError(
      "Invalid Workflow",
      "The getNextCreationStep action can only be used in the creation workflow.",
      "This action is for guiding creation steps. For reviewing existing opportunities, use the review workflow."
    );
  }

  try {
    // PRESERVED FROM ORIGINAL: Exact form availability check
    if (!state.form) {
      return "❌ Error: Form not available.";
    }

    // PRESERVED FROM ORIGINAL: Step-by-step guidance with EXACT original logic and content
    if (!(state.form.title?.child.value || "").trim()) {
      return `## 🎯 **Step 1: Project Title**

Ask the user: "What is the title of your project or initiative?"

**Examples to share:**
- "Digital Platform Modernization"
- "Customer Portal Development"
- "Data Analytics Implementation"
- "Legacy System Migration"

**Tips:** Should be clear, descriptive, and immediately understandable to vendors.

**Action to use:** updateOpportunityField("title", value)`;
    }

    if (!(state.form.teaser?.child.value || "").trim()) {
      return `## 📝 **Step 2: Project Summary**

Ask the user: "Can you provide a brief summary (2-3 sentences) of what this project involves?"

**Examples to share:**
- "We need to modernize our legacy platform to improve user experience and scalability. The project involves migrating to cloud infrastructure and implementing modern development practices."
- "Our organization requires a new customer portal to streamline service delivery and improve client satisfaction."

**Tips:** Should be concise but informative, focusing on the business need and high-level approach.

**Action to use:** updateOpportunityField("teaser", value)`;
    }

    if (
      !state.form.location?.child.value ||
      state.form.location.child.value.trim() === DEFAULT_LOCATION
    ) {
      return `## 📍 **Step 3: Project Location**

Ask the user: "Where will this project primarily take place? (Can be remote, hybrid, or specific location)"

**Examples to share:**
- "Remote" (if fully remote)
- "Vancouver, BC" (if specific location)
- "Hybrid - Vancouver office with remote options"

**Current default:** Victoria (change if different)

**Action to use:** updateOpportunityField("location", value)`;
    }

    if (!state.form.proposalDeadline?.child.value) {
      return `## 📅 **Step 4: Proposal Deadline**

Ask the user: "When do you need proposals submitted by? (Remember: minimum 10-day posting period required)"

**Tips to mention:**
- Must allow at least 10 business days from posting
- Consider evaluation time needed after deadline
- Format: YYYY-MM-DD

**Action to use:** updateOpportunityField("proposalDeadline", "YYYY-MM-DD")`;
    }

    if (!state.form.startDate?.child.value) {
      return `## 🚀 **Step 5: Project Start Date**

Ask the user: "When would you like the project to start?"

**Tips to mention:**
- Should be after proposal evaluation and vendor selection
- Allow time for contract setup and team onboarding
- Format: YYYY-MM-DD

**Action to use:** updateOpportunityField("startDate", "YYYY-MM-DD")`;
    }

    if (!state.form.completionDate?.child.value) {
      return `## 🏁 **Step 6: Expected Completion**

Ask the user: "When do you expect the project to be completed?"

**Tips to mention:**
- Consider project complexity and scope
- Team With Us typically used for 6-24 month engagements
- Format: YYYY-MM-DD

**Action to use:** updateOpportunityField("completionDate", "YYYY-MM-DD")`;
    }

    if (
      !(
        state.form.maxBudget?.child.value &&
        state.form.maxBudget.child.value > 0
      )
    ) {
      return `## 💰 **Step 7: Budget Information**

Ask the user: "What is your maximum budget for this project?"

**Guidance to provide:**
- Team With Us standard: $20,000-25,000/month per full-time resource
- For 12-month project with 1 FTE: approximately $240,000-300,000
- Budget should align with resource requirements and timeline

**Action to use:** updateOpportunityField("maxBudget", numberValue)`;
    }

    if ((state.form.resources?.resources || []).length === 0) {
      return `## 👥 **Step 8: Resource Requirements**

Ask the user: "What skills and roles do you need for this project? What type of team members would be ideal?"

**Service areas to mention:**
- Full Stack Developer
- Data Professional
- Agile Coach
- DevOps Specialist
- Service Designer

**Information to gather for each resource:**
- Service area
- Allocation percentage (e.g., 50% = part-time, 100% = full-time)
- Mandatory skills
- Optional skills

**Action to use:** addResource() for each role needed`;
    }

    if (!(state.form.description?.child.value || "").trim()) {
      return `## 📋 **Step 9: Detailed Description**

Ask the user: "Can you provide a detailed description of the project? Include background, objectives, scope, and any specific requirements."

**Should include:**
- Organization background and context
- Project objectives and outcomes
- Scope of work and deliverables
- Technical requirements
- Constraints or considerations

**Action to use:** updateOpportunityDescription(content)`;
    }

    if ((state.form.resourceQuestions?.questions || []).length === 0) {
      return `## ❓ **Step 10: Evaluation Questions**

Ask the user: "What questions would you like to ask vendors to evaluate their proposals? These help assess relevant experience and approach."

**Two approaches available:**

**🤖 AI Generation (Recommended):**
- Use generateQuestionsWithAI() to automatically create optimized questions based on your resources and skills
- AI will generate 3-8 comprehensive questions that efficiently cover all your requirements
- Questions include guidelines and scoring automatically
- Perfect when you have resources with skills defined

**✏️ Manual Creation:**
- Use addQuestion() to create blank questions, then customize them
- Better for specific, custom questions
- More control over exact wording and focus

**Suggested workflow:**
1. If you have resources with skills: "I can help you generate optimized questions using AI based on your skills. Should I do that?"
2. If user prefers manual: "Let me create some blank questions for you to customize."
3. If user wants AI: CALL generateQuestionsWithAI()
4. If user wants manual: CALL addQuestion() for each question needed

**Troubleshooting:**
- If generateQuestionsWithAI() is not available, use debugGenerateQuestionsWithAI() to test the action system
- Fall back to addQuestion() if AI generation is not working
- Use checkQuestionGenerationStatus() to monitor AI generation progress

**Action to use:** generateQuestionsWithAI() for AI generation, or addQuestion() for manual creation`;
    }

    // PRESERVED FROM ORIGINAL: Completion message
    return `## 🎉 **Creation Complete!**

All required sections have been completed. Ready for final review!

**Next steps:**
1. Review all entered information
2. Validate against procurement requirements
3. Save as draft or submit for review

Use reviewWithAI() to perform final validation.`;
  } catch (error: any) {
    console.error("❌ Error in getNextCreationStep:", error);
    return createActionError(
      "Step Analysis Failed",
      `Failed to determine next creation step: ${error.message}`,
      "Please try again or refresh the page if the issue persists."
    );
  }
};

// Export the complete useCopilotAction configuration - PRESERVED FROM ORIGINAL
export const getNextCreationStepCopilotAction = {
  name: "getNextCreationStep",
  description:
    "Get detailed guidance for the next step in the creation process. Use this to know what to ask for next.",
  parameters: [],
  action: getNextCreationStepAction
};
