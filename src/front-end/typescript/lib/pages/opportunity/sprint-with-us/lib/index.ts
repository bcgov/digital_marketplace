import { ThemeColor } from 'front-end/lib/types';
import { SWUOpportunityStatus } from 'shared/lib/resources/opportunity/sprint-with-us';

export function swuOpportunityStatusToColor(s: SWUOpportunityStatus): ThemeColor {
  switch (s) {
    case SWUOpportunityStatus.Draft: return 'secondary';
    case SWUOpportunityStatus.UnderReview: return 'warning';
    case SWUOpportunityStatus.Published: return 'success';
    case SWUOpportunityStatus.EvaluationTeamQuestions: return 'warning';
    case SWUOpportunityStatus.EvaluationCodeChallenge: return 'warning';
    case SWUOpportunityStatus.EvaluationTeamScenario: return 'warning';
    case SWUOpportunityStatus.Awarded: return 'success';
    case SWUOpportunityStatus.Suspended: return 'secondary';
    case SWUOpportunityStatus.Canceled: return 'danger';
  }
}

export function swuOpportunityStatusToTitleCase(s: SWUOpportunityStatus): string {
  switch (s) {
    case SWUOpportunityStatus.Draft: return 'Draft';
    case SWUOpportunityStatus.UnderReview: return 'Under Review';
    case SWUOpportunityStatus.Published: return 'Published';
    case SWUOpportunityStatus.EvaluationTeamQuestions: return 'Team Questions';
    case SWUOpportunityStatus.EvaluationCodeChallenge: return 'Code Challenge';
    case SWUOpportunityStatus.EvaluationTeamScenario: return 'Team Scenario';
    case SWUOpportunityStatus.Awarded: return 'Awarded';
    case SWUOpportunityStatus.Suspended: return 'Suspended';
    case SWUOpportunityStatus.Canceled: return 'Cancelled'; //British spelling
  }
}

export function swuOpportunityStatusToPresentTenseVerb(s: SWUOpportunityStatus): string {
  switch (s) {
    case SWUOpportunityStatus.UnderReview: return 'Submit';
    case SWUOpportunityStatus.Published: return 'Publish';
    case SWUOpportunityStatus.Awarded: return 'Award';
    case SWUOpportunityStatus.Suspended: return 'Suspend';
    case SWUOpportunityStatus.Canceled: return 'Cancel';
    default: return 'Save';
  }
}

export function swuOpportunityStatusToPastTenseVerb(s: SWUOpportunityStatus): string {
  switch (s) {
    case SWUOpportunityStatus.UnderReview: return 'Submitted';
    case SWUOpportunityStatus.Published: return 'Published';
    case SWUOpportunityStatus.Awarded: return 'Awarded';
    case SWUOpportunityStatus.Suspended: return 'Suspended';
    case SWUOpportunityStatus.Canceled: return 'Cancelled'; //British spelling
    default: return 'Saved';
  }
}
