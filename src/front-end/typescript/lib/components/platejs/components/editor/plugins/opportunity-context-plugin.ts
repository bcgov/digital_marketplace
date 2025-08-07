import { createPlatePlugin } from "platejs/react";
import { CreateTWUResourceBody } from "shared/lib/resources/opportunity/team-with-us";

export interface OpportunityContext {
  title?: string;
  teaser?: string;
  // Service areas and skills from resources (using CreateTWUResourceBody which has serviceArea as string)
  resources?: CreateTWUResourceBody[];
  // Dates from the opportunity
  proposalDeadline?: string;
  assignmentDate?: string;
  startDate?: string;
  completionDate?: string;
  // Additional context
  location?: string;
  remoteOk?: boolean;
  remoteDesc?: string;
  maxBudget?: number | null;
  description?: string;
  // Resource question specific context
  fieldType?: "question" | "guideline";
  existingQuestions?: string[];
  currentQuestionText?: string;
}

export const OpportunityContextPlugin = createPlatePlugin({
  key: "opportunityContext",
  options: {
    context: {
      title: "",
      teaser: ""
    } as OpportunityContext
  }
});
