import { ThemeColor } from 'front-end/lib/types';
import { SWUProposalEvent, SWUProposalStatus } from 'shared/lib/resources/proposal/sprint-with-us';
import { UserType } from 'shared/lib/resources/user';

export function swuProposalStatusToColor(s: SWUProposalStatus, viewerUserType: UserType): ThemeColor {
  switch (s) {
    case SWUProposalStatus.Draft        : return 'secondary';
    case SWUProposalStatus.Submitted    : return 'success';
    case SWUProposalStatus.UnderReviewTeamQuestions: return 'warning';
    case SWUProposalStatus.UnderReviewCodeChallenge: return 'warning';
    case SWUProposalStatus.UnderReviewTeamScenario: return 'warning';
    case SWUProposalStatus.EvaluatedTeamQuestions: return viewerUserType === UserType.Vendor ? 'warning' : 'blue';
    case SWUProposalStatus.EvaluatedCodeChallenge: return viewerUserType === UserType.Vendor ? 'warning' : 'blue';
    case SWUProposalStatus.EvaluatedTeamScenario: return viewerUserType === UserType.Vendor ? 'warning' : 'blue';
    case SWUProposalStatus.Awarded      : return 'success';
    case SWUProposalStatus.NotAwarded   : return 'blue';
    case SWUProposalStatus.Disqualified : return 'danger';
    case SWUProposalStatus.Withdrawn    : return 'danger';
  }
}

export function swuProposalStatusToTitleCase(s: SWUProposalStatus, viewerUserType: UserType): string {
  switch (s) {
    case SWUProposalStatus.Draft        : return 'Draft';
    case SWUProposalStatus.Submitted    : return 'Submitted';
    case SWUProposalStatus.UnderReviewTeamQuestions: return viewerUserType === UserType.Vendor ? 'Under Review' : 'Team Questions';
    case SWUProposalStatus.UnderReviewCodeChallenge: return viewerUserType === UserType.Vendor ? 'Under Review' : 'Code Challenge';
    case SWUProposalStatus.UnderReviewTeamScenario: return viewerUserType === UserType.Vendor ? 'Under Review' : 'Team Scenario';
    case SWUProposalStatus.EvaluatedTeamQuestions: return viewerUserType === UserType.Vendor ? 'Under Review' : 'Team Questions';
    case SWUProposalStatus.EvaluatedCodeChallenge: return viewerUserType === UserType.Vendor ? 'Under Review' : 'Code Challenge';
    case SWUProposalStatus.EvaluatedTeamScenario: return viewerUserType === UserType.Vendor ? 'Under Review' : 'Team Scenario';
    case SWUProposalStatus.Awarded      : return 'Awarded';
    case SWUProposalStatus.NotAwarded   : return 'Not Awarded';
    case SWUProposalStatus.Disqualified : return 'Disqualified';
    case SWUProposalStatus.Withdrawn    : return 'Withdrawn';
  }
}

export function swuProposalEventToTitleCase(e: SWUProposalEvent): string {
  switch (e) {
    case SWUProposalEvent.QuestionsScoreEntered: return 'Team Questions Score Entered';
    case SWUProposalEvent.ChallengeScoreEntered: return 'Code Challenge Score Entered';
    case SWUProposalEvent.ScenarioScoreEntered: return 'Team Scenario Score Entered';
    case SWUProposalEvent.PriceScoreEntered: return 'Price Score Entered';
  }
}
