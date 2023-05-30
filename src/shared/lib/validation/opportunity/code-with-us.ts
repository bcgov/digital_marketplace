import { uniq } from "lodash";
import { CWU_MAX_BUDGET } from "shared/config";
import { setDateTo4PM } from "shared/lib";
import {
  CreateCWUOpportunityStatus,
  CWUOpportunity,
  CWUOpportunityStatus,
  isCWUOpportunityClosed,
  parseCWUOpportunityStatus
} from "shared/lib/resources/opportunity/code-with-us";
import {
  ArrayValidation,
  invalid,
  mapValid,
  valid,
  validateArray,
  validateDate,
  validateGenericString,
  validateNumber,
  Validation
} from "shared/lib/validation";
export { validateAddendumText } from "shared/lib/validation/addendum";

export function validateCWUOpportunityStatus(
  raw: string,
  isOneOf: CWUOpportunityStatus[]
): Validation<CWUOpportunityStatus> {
  const parsed = parseCWUOpportunityStatus(raw);
  if (!parsed) {
    return invalid([`"${raw}" is not a valid CodeWithUs opportunity status.`]);
  }
  if (!isOneOf.includes(parsed)) {
    return invalid([`"${raw}" is not one of: ${isOneOf.join(", ")}`]);
  }
  return valid(parsed);
}

export function validateCreateCWUOpportunityStatus(
  raw: string
): Validation<CreateCWUOpportunityStatus> {
  return validateCWUOpportunityStatus(raw, [
    CWUOpportunityStatus.Draft,
    CWUOpportunityStatus.Published
  ]) as Validation<CreateCWUOpportunityStatus>;
}

export function validateReward(raw: string | number): Validation<number> {
  return validateNumber(raw, 1, CWU_MAX_BUDGET, "reward", "a");
}

export function validateSkills(raw: string[]): ArrayValidation<string> {
  if (!raw.length) {
    return invalid([["Please select at least one skill."]]);
  }
  const validatedArray = validateArray(raw, (v) =>
    validateGenericString(v, "Skill", 1, 100)
  );
  return mapValid<string[], string[][], string[]>(validatedArray, (skills) =>
    uniq(skills)
  );
}

export function validateProposalDeadline(
  raw: string,
  opportunity?: CWUOpportunity
): Validation<Date> {
  const now = new Date();
  let minDate = now;
  if (opportunity && isCWUOpportunityClosed(opportunity)) {
    minDate = opportunity.proposalDeadline;
  }
  return validateDate(raw, setDateTo4PM(minDate), undefined, setDateTo4PM);
}

export function validateSubmissionInfo(raw: string): Validation<string> {
  return validateGenericString(raw, "Project Submission Info", 0, 500);
}

export function validateAcceptanceCriteria(raw: string): Validation<string> {
  return validateGenericString(raw, "Acceptance Criteria", 1, 5000);
}

export function validateEvaluationCriteria(raw: string): Validation<string> {
  return validateGenericString(raw, "Evaluation Criteria", 1, 2000);
}

export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, "Status Note", 0, 1000);
}
