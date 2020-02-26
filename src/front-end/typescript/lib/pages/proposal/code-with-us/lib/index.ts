import { ThemeColor } from 'front-end/lib/types';
import { CWUProposalEvent, CWUProposalStatus } from 'shared/lib/resources/proposal/code-with-us';
import { UserType } from 'shared/lib/resources/user';

export function cwuProposalStatusToColor(s: CWUProposalStatus, viewerUserType: UserType): ThemeColor {
  switch (s) {
    case CWUProposalStatus.Draft        : return 'secondary';
    case CWUProposalStatus.Submitted    : return 'success';
    case CWUProposalStatus.UnderReview  : return 'warning';
    case CWUProposalStatus.Evaluated    : return viewerUserType === UserType.Vendor ? 'warning' : 'blue';
    case CWUProposalStatus.Awarded      : return 'success';
    case CWUProposalStatus.NotAwarded   : return 'blue';
    case CWUProposalStatus.Disqualified : return 'danger';
    case CWUProposalStatus.Withdrawn    : return 'danger';
  }
}

export function cwuProposalStatusToTitleCase(s: CWUProposalStatus, viewerUserType: UserType): string {
  switch (s) {
    case CWUProposalStatus.Draft        : return 'Draft';
    case CWUProposalStatus.Submitted    : return 'Submitted';
    case CWUProposalStatus.UnderReview  : return 'Under Review';
    case CWUProposalStatus.Evaluated    : return viewerUserType === UserType.Vendor ? 'Under Review' : 'Evaluated';
    case CWUProposalStatus.Awarded      : return 'Awarded';
    case CWUProposalStatus.NotAwarded   : return 'Not Awarded';
    case CWUProposalStatus.Disqualified : return 'Disqualified';
    case CWUProposalStatus.Withdrawn    : return 'Withdrawn';
  }
}

export function cwuProposalEventToTitleCase(e: CWUProposalEvent): string {
  switch (e) {
    case CWUProposalEvent.ScoreEntered  : return 'Score Entered';
  }
}
