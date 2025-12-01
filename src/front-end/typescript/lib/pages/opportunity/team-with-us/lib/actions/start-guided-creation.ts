import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import {
  UnifiedActionContext,
  createActionError,
  detectWorkflowType
} from "./base-action-template";

// Creation workflow action function
export const startGuidedCreationAction = async (
  state: UnifiedActionContext,
  dispatch: any,
  reset: () => void,
  appendMessage: (message: TextMessage) => void
): Promise<string> => {
  console.log("🚨🚨🚨 startGuidedCreation ACTION CALLED! 🚨🚨🚨");

  // Check workflow type - this action is only for creation workflow
  const workflowType = detectWorkflowType(state);
  if (workflowType !== "create") {
    return createActionError(
      "Invalid Workflow",
      "The startGuidedCreation action can only be used in the creation workflow.",
      "This action is for creating new opportunities. For editing existing opportunities, use the startEditing action instead."
    );
  }

  try {
    console.log("✨ Starting dedicated guided creation workflow");

    // Clear chat for fresh start
    reset();

    setTimeout(() => {
      // Send system context first
      appendMessage(
        new TextMessage({
          content: `SYSTEM: GUIDED CREATION WORKFLOW ACTIVE

You are now in GUIDED CREATION mode. Your role is to:

1. Guide the user through creating a Team With Us opportunity step-by-step
2. Ask for information conversationally about each section
3. Use actions to fill form fields immediately as information is provided
4. Progress systematically through all required sections
5. Provide examples, guidance, and best practices

This is CREATION mode - you are building new content, not reviewing existing content.

**CRITICAL: You have access to these specific actions for question generation:**
- generateQuestionsWithAI() - Use this to automatically generate optimized questions based on resources and skills
- addQuestion() - Use this to create blank questions for manual customization
- checkQuestionGenerationStatus() - Use this to monitor AI generation progress

**When users reach the questions step and have resources with skills:**
1. ALWAYS try to use generateQuestionsWithAI() first
2. If that action is not available, fall back to addQuestion() and create questions manually
3. Provide clear guidance on what to do next

Required workflow actions:
- updateOpportunityField(fieldName, value) - Fill form fields as users provide info
- addResource() - Add resource requirements
- updateResource(resourceIndex, fieldName, value) - Configure resources with skills
- generateQuestionsWithAI() - Generate optimized questions (PREFERRED)
- addQuestion() - Create manual questions (FALLBACK)
- getCreationProgress() - Check progress and next steps`,
          role: Role.System,
          id: "guided-creation-context"
        })
      );

      setTimeout(() => {
        // Send the main guided creation message
        appendMessage(
          new TextMessage({
            content: `# 🌟 **Team With Us Opportunity Creation Assistant**

Welcome! I'm here to help you create a compliant Team With Us opportunity step by step. I'll guide you through each section and automatically fill out the form as we discuss your project.

## 📋 **What We'll Build Together:**
1. **Project Overview** - Title, summary, and location
2. **Timeline Planning** - Key dates and milestones
3. **Budget Planning** - Maximum budget for the engagement
4. **Resource Requirements** - Skills and roles you need
5. **Project Description** - Detailed scope and deliverables
6. **Evaluation Questions** - How you'll assess vendor proposals (with AI-powered generation!)
7. **Final Review** - Compliance and quality check

I'll handle the form fields automatically, so you can focus on describing your project needs.

**🤖 AI-Powered Features:**
- **Smart Question Generation**: Once you define your resources and skills, I can automatically generate optimized evaluation questions
- **Comprehensive Coverage**: AI creates questions that efficiently evaluate all your requirements
- **Best Practices**: Questions follow government procurement standards and best practices

---

## 🎯 **Step 1: Project Title**

Let's start with the basics. **What would you like to call your project?**

Please provide a clear, descriptive title that vendors will immediately understand. Here are some good examples:
- "Digital Platform Modernization Initiative"
- "Customer Portal Development Project"
- "Data Analytics Platform Implementation"
- "Legacy System Migration to Cloud"
- "API Integration and Automation Platform"

Your project title should be specific enough to convey the type of work but broad enough to allow for vendor creativity in their approach.

**What's your project title?**`,
            role: Role.System,
            id: "guided-creation-welcome"
          })
        );
      }, 200);
    }, 100);

    return "✨ **Guided Creation Started!**\n\nI'm ready to help you create your Team With Us opportunity step-by-step. Let's build something great together!";
  } catch (error: any) {
    console.error("❌ Error starting guided creation:", error);
    return `❌ Error: Failed to start guided creation - ${error.message}`;
  }
};

// Export the complete useCopilotAction configuration
export const startGuidedCreationCopilotAction = {
  name: "startGuidedCreation",
  description:
    "Start the guided creation workflow for a new Team With Us opportunity. Use this when users want step-by-step guidance to create an opportunity from scratch.",
  parameters: [],
  action: startGuidedCreationAction
};
