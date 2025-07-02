import {
  TWUOpportunity
} from "shared/lib/resources/opportunity/team-with-us";

export function opportunityToPublicState(
  opportunity: TWUOpportunity
): Omit<TWUOpportunity, "createdBy" | "updatedBy" | "status" | "id"> {
  const {
    createdBy,
    updatedBy,
    status,
    id,
    ...publicState
  } = opportunity;
  return publicState;
}

export const FORMATTED_CRITERIA = `
Please review this Team With Us opportunity and identify only the areas that need improvement or are inadequately addressed. Focus on providing specific, actionable feedback in a conversational, helpful tone without referencing technical field names or JSON structure.

**Review the following areas and only mention those that need attention:**

**Organization & Legal Requirements**
- Missing or unclear purchasing organization identification (legally required)
- Insufficient background about the organization and importance of their work
- Unclear reason for procurement (why they are buying)

**Contract Outcomes & Responsibilities**
- Vague or missing contract outcomes
- Unclear role responsibilities for service areas
- Task descriptions that don't align with service area responsibilities
- Responsibilities that could benefit from more detail or service area pre-population

**Mandatory Skills & Requirements**
- Mandatory skills not clearly identified or properly evaluated
- Missing minimum standards for required skills (e.g., "2 years of experience")
- Mandatory skills not referenced in questions or response guidelines
- Unclear criteria for evaluators to determine if minimum standards are met
- Incomplete or inappropriate minimum requirements

**Procurement Timeline & Planning**
- Unrealistic or poorly planned procurement timeline
- Missing consideration of minimum 10-day posting period
- Inadequate time for evaluation (recommend minimum 1 week)
- No time allocated for skills challenge (recommend minimum 1 week)
- Insufficient time consideration for opportunities requiring many resources

**Budget Guidance & Financial Planning**
- Missing or unclear budget guidance
- Budget that doesn't align with 20-25k/month standard for full-time resources
- Inappropriate total budget calculation (e.g., should be 12 months × 20-25k = 240-300k)
- Unclear financial expectations for vendors

**Contract Extensions & Legal Language**
- Missing legal language for contract extensions when desired
- Failure to inform vendors that Team With Us allows contract extensions
- Unspecified extension length when applicable

**Key Information Gaps**
- Missing organization details and background
- Unclear contract outcomes and deliverables
- Vague role responsibilities and requirements
- Missing minimum qualification standards
- Unspecified years of experience requirements
- Absent procurement timeline estimates
- Lack of budget guidance and expectations

**Vendor Experience Issues**
- Insufficient information for vendors to submit quality proposals
- Inconsistencies or gaps in the opportunity
- Inadequate detail for accurate proposal preparation
- Elements that might deter qualified vendors or lead to unsuccessful outcomes

If the opportunity adequately addresses all areas, simply respond with: "This opportunity appears to be well-structured and complete. No significant improvements needed."

Otherwise, provide specific suggestions for the areas that need attention, focusing on improvements that would make this opportunity more compliant with procurement requirements, more attractive to qualified vendors, and more likely to result in successful project outcomes.

After your review, identify the most critical issue you found and ask: "Would you like me to help you address [the most pressing issue], or would you prefer guidance on a different aspect of the opportunity?"
`; 