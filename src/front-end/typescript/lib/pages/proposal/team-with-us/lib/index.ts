import { ThemeColor } from "front-end/lib/types";
import { TWUProposalStatus } from "shared/lib/resources/proposal/team-with-us";
import { UserType } from "shared/lib/resources/user";

export function twuProposalStatusToColor(
  s: TWUProposalStatus,
  viewerUserType: UserType
): ThemeColor {
  switch (s) {
    case TWUProposalStatus.Draft:
      return "secondary";
    case TWUProposalStatus.Submitted:
    case TWUProposalStatus.Awarded:
      return "success";
    case TWUProposalStatus.UnderReviewResourceQuestions:
    case TWUProposalStatus.UnderReviewChallenge:
      return "warning";
    case TWUProposalStatus.EvaluatedResourceQuestions:
    case TWUProposalStatus.EvaluatedChallenge:
      return viewerUserType === UserType.Vendor ? "warning" : "primary";
    case TWUProposalStatus.NotAwarded:
      return "primary";
    case TWUProposalStatus.Disqualified:
    case TWUProposalStatus.Withdrawn:
      return "danger";
  }
}

export function twuProposalStatusToTitleCase(
  s: TWUProposalStatus,
  viewerUserType: UserType
): string {
  switch (s) {
    case TWUProposalStatus.Draft:
      return "Draft";
    case TWUProposalStatus.Submitted:
      return "Submitted";
    case TWUProposalStatus.UnderReviewResourceQuestions:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Under Review (Q)";
    case TWUProposalStatus.EvaluatedResourceQuestions:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Evaluated (Q)";
    case TWUProposalStatus.UnderReviewChallenge:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Under Review (C)";
    case TWUProposalStatus.EvaluatedChallenge:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Evaluated (C)";
    case TWUProposalStatus.Awarded:
      return "Awarded";
    case TWUProposalStatus.NotAwarded:
      return "Not Awarded";
    case TWUProposalStatus.Disqualified:
      return "Disqualified";
    case TWUProposalStatus.Withdrawn:
      return "Withdrawn";
  }
}

export function twuProposalStatusToPresentTenseVerb(
  s: TWUProposalStatus
): string {
  switch (s) {
    case TWUProposalStatus.Draft:
      return "Save";
    case TWUProposalStatus.Submitted:
      return "Submit";
    case TWUProposalStatus.Awarded:
      return "Award";
    case TWUProposalStatus.Withdrawn:
      return "Withdraw";
    case TWUProposalStatus.EvaluatedChallenge:
      return "Score";
    default:
      return "Update";
  }
}

export function twuProposalStatusToPastTenseVerb(s: TWUProposalStatus): string {
  switch (s) {
    case TWUProposalStatus.Draft:
      return "Saved";
    case TWUProposalStatus.Submitted:
      return "Submitted";
    case TWUProposalStatus.Awarded:
      return "Awarded";
    case TWUProposalStatus.Withdrawn:
      return "Withdrawn";
    case TWUProposalStatus.EvaluatedChallenge:
      return "Scored";
    default:
      return "Update";
  }
}
