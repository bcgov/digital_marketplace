import { ThemeColor } from 'front-end/lib/types';
import { CWUOpportunityEvent, CWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';

export function cwuOpportunityStatusToColor(s: CWUOpportunityStatus): ThemeColor {
  switch (s) {
    case CWUOpportunityStatus.Draft: return 'secondary';
    case CWUOpportunityStatus.Published: return 'success';
    case CWUOpportunityStatus.Evaluation: return 'warning';
    case CWUOpportunityStatus.Awarded: return 'success';
    case CWUOpportunityStatus.Suspended: return 'secondary';
    case CWUOpportunityStatus.Canceled: return 'danger';
  }
}

export function cwuOpportunityEventToColor(e: CWUOpportunityEvent): ThemeColor {
  switch (e) {
    case CWUOpportunityEvent.AddendumAdded: return 'warning';
    case CWUOpportunityEvent.Edited: return 'secondary';
  }
}

export function cwuOpportunityStatusToTitleCase(s: CWUOpportunityStatus): string {
  switch (s) {
    case CWUOpportunityStatus.Draft: return 'Draft';
    case CWUOpportunityStatus.Published: return 'Published';
    case CWUOpportunityStatus.Evaluation: return 'Evaluation';
    case CWUOpportunityStatus.Awarded: return 'Awarded';
    case CWUOpportunityStatus.Suspended: return 'Suspended';
    case CWUOpportunityStatus.Canceled: return 'Cancelled'; // Use British spelling for copy.
  }
}

export function cwuOpportunityEventToTitleCase(e: CWUOpportunityEvent): string {
  switch (e) {
    case CWUOpportunityEvent.AddendumAdded: return 'Addendum Added';
    case CWUOpportunityEvent.Edited: return 'Edited';
  }
}
