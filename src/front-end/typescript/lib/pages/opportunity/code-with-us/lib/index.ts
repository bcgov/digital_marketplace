import * as History from 'front-end/lib/components/table/history';
import { ThemeColor } from 'front-end/lib/types';
import { CWUOpportunity, CWUOpportunityEvent, CWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';

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

export function opportunityToHistoryItems({ history }: CWUOpportunity): History.Item[] {
  if (!history) { return []; }
  return history
    .map(s => ({
      type: {
        text: s.type.tag === 'status' ? cwuOpportunityStatusToTitleCase(s.type.value) : cwuOpportunityEventToTitleCase(s.type.value),
        color: s.type.tag === 'status' ? cwuOpportunityStatusToColor(s.type.value) : undefined
      },
      note: s.note,
      createdAt: s.createdAt,
      createdBy: s.createdBy || undefined
    }));
}
