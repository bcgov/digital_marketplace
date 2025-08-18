import { adt } from "shared/lib/types";

export type GenericFormState = {
  form?: any;
  isEditing?: boolean; // Added for edit context
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const generateQuestionsWithAIAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch
): Promise<string> => {
  console.log(
    "🚨🚨🚨 generateQuestionsWithAI ACTION CALLED ON EDIT PAGE! 🚨🚨🚨"
  );

  if (!state.isEditing) {
    return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
  }

  if (!state.form) {
    return "❌ Error: Form not available. Please try refreshing the page.";
  }

  // Check if we have resources with skills
  const resources = state.form?.resources?.resources || [];
  if (resources.length === 0) {
    return "❌ Error: No resources found. Please add resources with skills first using the addResource action.";
  }

  // Check if resources have skills defined
  const hasSkills = resources.some((resource: any) => {
    const mandatorySkills = resource.mandatorySkills?.child?.value || [];
    const optionalSkills = resource.optionalSkills?.child?.value || [];
    return mandatorySkills.length > 0 || optionalSkills.length > 0;
  });

  if (!hasSkills) {
    return "❌ Error: No skills found in resources. Please add skills to your resources first using the updateResource action.";
  }

  try {
    // Switch to Resource Questions tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const))
    );
    console.log("Switching to Resource Questions tab:", switchTabMsg);
    dispatch(switchTabMsg);

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Build generation context from form state
    const generationContext = {
      title: state.form?.title?.child?.value || "",
      teaser: state.form?.teaser?.child?.value || "",
      description: state.form?.description?.child?.value || "",
      location: state.form?.location?.child?.value || "",
      remoteOk: state.form?.remoteOk?.child?.value === "yes",
      remoteDesc: state.form?.remoteDesc?.child?.value || "",
      resources: resources.map((resource: any) => ({
        serviceArea: resource.serviceArea?.child?.value?.value || "",
        targetAllocation: resource.targetAllocation?.child?.value?.value || 0,
        mandatorySkills: (resource.mandatorySkills?.child?.value || []).map(
          (s: any) => s.value
        ),
        optionalSkills: (resource.optionalSkills?.child?.value || []).map(
          (s: any) => s.value
        )
      }))
    };

    console.log("Generation context:", generationContext);

    // Trigger AI generation using the existing functionality
    const generateWithAIMsg = adt(
      "form",
      adt("resourceQuestions", adt("generateWithAI", generationContext))
    );
    console.log("Triggering AI generation:", generateWithAIMsg);
    dispatch(generateWithAIMsg);

    // Wait a moment for the generation to start
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Give more time for the generation to start and check status
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if generation started successfully
    const isGenerating = state.form?.resourceQuestions?.isGenerating;
    const generationErrors =
      state.form?.resourceQuestions?.generationErrors || [];

    if (isGenerating) {
      return `🤖 **AI Question Generation Started!**

**Status:** Generating optimized questions based on your resources and skills...

**What's happening:**
- AI is analyzing your ${resources.length} resources and their skills
- Creating comprehensive evaluation questions that efficiently cover all requirements
- Optimizing for minimal redundancy while ensuring complete coverage
- Generating clear evaluation guidelines for each question

**Please wait** - this typically takes 10-30 seconds. The questions will appear automatically when generation is complete.

💡 **Tip:** You can use checkQuestionGenerationStatus() to monitor progress.`;
    } else if (generationErrors.length > 0) {
      return `❌ **AI Generation Failed to Start**

**Status:** Generation encountered errors

**Errors:**
${generationErrors.map((error: any) => `- ${error}`).join("\n")}

**Next steps:**
- Check that your resources have skills defined
- Try the generateQuestionsWithAI action again
- If the issue persists, contact support`;
    } else {
      // Check if there are existing questions that need confirmation
      const existingQuestions = state.form?.resourceQuestions?.questions || [];
      if (existingQuestions.length > 0) {
        return `🤖 **AI Question Generation Ready!**

**Status:** Ready to generate new questions

**Note:** You have ${existingQuestions.length} existing questions. The AI will replace them with optimized questions based on your current resources and skills.

**Next step:** The system will show a confirmation dialog. Please confirm to proceed with AI generation.

💡 **Tip:** The new AI-generated questions will be optimized to efficiently evaluate all your skills and service areas.`;
      } else {
        return `✅ **AI Generation Dispatched Successfully!**

**Status:** Generation request sent to the system

**What's happening:**
- The generation request has been dispatched to the form
- The system should now be processing your request
- This may take a moment to start

**Next steps:**
- Wait a moment for generation to begin
- Use checkQuestionGenerationStatus() to monitor progress
- Questions will appear automatically when complete

💡 **Tip:** If you don't see questions appearing, try checkQuestionGenerationStatus() to see the current state.`;
      }
    }
  } catch (error: any) {
    console.error("❌ Error in generateQuestionsWithAI:", error);
    return `❌ Error: Failed to start AI generation - ${error.message}`;
  }
};

export const generateQuestionsWithAICopilotAction = {
  name: "generateQuestionsWithAI_review",
  description:
    "Generate comprehensive evaluation questions using AI based on the skills and service areas defined in your resources. This will create optimized questions that cover all your requirements efficiently.",
  parameters: [],
  action: generateQuestionsWithAIAction
};
