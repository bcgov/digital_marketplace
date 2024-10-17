import { ThemeColor } from "front-end/lib/types";
import {
  SWUProposalEvent,
  SWUProposalStatus
} from "shared/lib/resources/proposal/sprint-with-us";
import { UserType } from "shared/lib/resources/user";

export function swuProposalStatusToColor(
  s: SWUProposalStatus,
  viewerUserType: UserType
): ThemeColor {
  switch (s) {
    case SWUProposalStatus.Draft:
      return "secondary";
    case SWUProposalStatus.Submitted:
    case SWUProposalStatus.Awarded:
      return "success";
    case SWUProposalStatus.UnderReviewTeamQuestions:
    case SWUProposalStatus.UnderReviewCodeChallenge:
    case SWUProposalStatus.UnderReviewTeamScenario:
    case SWUProposalStatus.TeamQuestionsPanelIndividual:
    case SWUProposalStatus.TeamQuestionsPanelConsensus:
      return "warning";
    case SWUProposalStatus.EvaluatedTeamQuestions:
    case SWUProposalStatus.EvaluatedCodeChallenge:
    case SWUProposalStatus.EvaluatedTeamScenario:
      return viewerUserType === UserType.Vendor ? "warning" : "primary";
    case SWUProposalStatus.NotAwarded:
      return "primary";
    case SWUProposalStatus.Disqualified:
    case SWUProposalStatus.Withdrawn:
      return "danger";
  }
}

export function swuProposalStatusToTitleCase(
  s: SWUProposalStatus,
  viewerUserType: UserType
): string {
  switch (s) {
    case SWUProposalStatus.Draft:
      return "Draft";
    case SWUProposalStatus.Submitted:
      return "Submitted";
    case SWUProposalStatus.TeamQuestionsPanelIndividual:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Panel Evaluation (Individual)";
    case SWUProposalStatus.TeamQuestionsPanelConsensus:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Panel Evaluation (Consensus)";
    case SWUProposalStatus.UnderReviewTeamQuestions:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Under Review (TQ)";
    case SWUProposalStatus.UnderReviewCodeChallenge:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Under Review (CC)";
    case SWUProposalStatus.UnderReviewTeamScenario:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Under Review (TS)";
    case SWUProposalStatus.EvaluatedTeamQuestions:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Evaluated (TQ)";
    case SWUProposalStatus.EvaluatedCodeChallenge:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Evaluated (CC)";
    case SWUProposalStatus.EvaluatedTeamScenario:
      return viewerUserType === UserType.Vendor
        ? "Under Review"
        : "Evaluated (TS)";
    case SWUProposalStatus.Awarded:
      return "Awarded";
    case SWUProposalStatus.NotAwarded:
      return "Not Awarded";
    case SWUProposalStatus.Disqualified:
      return "Non-compliant";
    case SWUProposalStatus.Withdrawn:
      return "Withdrawn";
  }
}

export function swuProposalEventToTitleCase(e: SWUProposalEvent): string {
  switch (e) {
    case SWUProposalEvent.QuestionsScoreEntered:
      return "Team Questions Score Entered";
    case SWUProposalEvent.ChallengeScoreEntered:
      return "Code Challenge Score Entered";
    case SWUProposalEvent.ScenarioScoreEntered:
      return "Team Scenario Score Entered";
    case SWUProposalEvent.PriceScoreEntered:
      return "Price Score Entered";
  }
}

export function swuProposalStatusToPresentTenseVerb(
  s: SWUProposalStatus
): string {
  switch (s) {
    case SWUProposalStatus.Draft:
      return "Save";
    case SWUProposalStatus.Submitted:
      return "Submit";
    case SWUProposalStatus.Awarded:
      return "Award";
    case SWUProposalStatus.Withdrawn:
      return "Withdraw";
    default:
      return "Update";
  }
}

export function swuProposalStatusToPastTenseVerb(s: SWUProposalStatus): string {
  switch (s) {
    case SWUProposalStatus.Draft:
      return "Saved";
    case SWUProposalStatus.Submitted:
      return "Submitted";
    case SWUProposalStatus.Awarded:
      return "Awarded";
    case SWUProposalStatus.Withdrawn:
      return "Withdrawn";
    default:
      return "Updated";
  }
}
