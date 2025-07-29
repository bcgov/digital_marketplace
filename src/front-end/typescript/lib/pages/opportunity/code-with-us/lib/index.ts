import * as History from "front-end/lib/components/table/history";
import { ThemeColor } from "front-end/lib/types";
import { isDateInThePast } from "shared/lib";
import {
  CWUOpportunity,
  CWUOpportunityEvent,
  CWUOpportunityStatus,
  isOpen
} from "shared/lib/resources/opportunity/code-with-us";
import { isAdmin, User } from "shared/lib/resources/user";

export function cwuOpportunityStatusToColor(
  s: CWUOpportunityStatus
): ThemeColor {
  switch (s) {
    case CWUOpportunityStatus.Draft:
      return "secondary";
    case CWUOpportunityStatus.UnderReview:
      return "warning";
    case CWUOpportunityStatus.Published:
      return "success";
    case CWUOpportunityStatus.Evaluation:
      return "warning";
    case CWUOpportunityStatus.Processing:
      return "warning";
    case CWUOpportunityStatus.Awarded:
      return "success";
    case CWUOpportunityStatus.DeprecatedSuspended:
      return "danger";
    case CWUOpportunityStatus.Canceled:
      return "danger";
  }
}

export function cwuOpportunityStatusToTitleCase(
  s: CWUOpportunityStatus
): string {
  switch (s) {
    case CWUOpportunityStatus.Draft:
      return "Draft";
    case CWUOpportunityStatus.UnderReview:
      return "Under Review";
    case CWUOpportunityStatus.Published:
      return "Published";
    case CWUOpportunityStatus.Evaluation:
      return "Evaluation";
    case CWUOpportunityStatus.Processing:
      return "Processing";
    case CWUOpportunityStatus.Awarded:
      return "Awarded";
    case CWUOpportunityStatus.DeprecatedSuspended:
      return "Suspended";
    case CWUOpportunityStatus.Canceled:
      return "Cancelled"; // Use British spelling for copy.
  }
}

export function cwuOpportunityToPublicStatus(
  o: Pick<CWUOpportunity, "status" | "createdBy" | "proposalDeadline">,
  viewerUser?: User
): string {
  const admin =
    !!viewerUser && (isAdmin(viewerUser) || o.createdBy?.id === viewerUser.id);
  if (admin) {
    return cwuOpportunityStatusToTitleCase(o.status);
  } else {
    if (isOpen(o)) {
      return "Open";
    } else if (o.status === CWUOpportunityStatus.Canceled) {
      return "Canceled";
    } else if (o.status === CWUOpportunityStatus.DeprecatedSuspended) {
      return "Suspended";
    } else if (o.status === CWUOpportunityStatus.Evaluation) {
      return "Evaluation";
    } else if (
      o.status === CWUOpportunityStatus.Published &&
      isDateInThePast(o.proposalDeadline)
    ) {
      // If deadline has passed but status is still Published, show as Evaluation
      return "Evaluation";
    } else if (o.status === CWUOpportunityStatus.Processing) {
      return "Processing";
    } else {
      return "Completed";
    }
  }
}

export function cwuOpportunityToPublicColor(
  o: Pick<CWUOpportunity, "status" | "createdBy" | "proposalDeadline">,
  viewerUser?: User
): ThemeColor {
  const admin =
    !!viewerUser && (isAdmin(viewerUser) || o.createdBy?.id === viewerUser.id);
  if (admin) {
    return cwuOpportunityStatusToColor(o.status);
  } else {
    if (isOpen(o)) {
      return "success";
    } else if (o.status === CWUOpportunityStatus.Evaluation) {
      return "warning";
    } else if (
      o.status === CWUOpportunityStatus.Published &&
      isDateInThePast(o.proposalDeadline)
    ) {
      // If deadline has passed but status is still Published, use warning color
      return "warning";
    } else if (o.status === CWUOpportunityStatus.Processing) {
      return "warning";
    } else if (o.status === CWUOpportunityStatus.DeprecatedSuspended) {
      return "danger";
    } else if (o.status === CWUOpportunityStatus.Canceled) {
      return "danger";
    } else {
      return "success";
    }
  }
}

export function cwuOpportunityStatusToPresentTenseVerb(
  s: CWUOpportunityStatus
): string {
  switch (s) {
    case CWUOpportunityStatus.DeprecatedSuspended:
      return "Suspend";
    case CWUOpportunityStatus.Canceled:
      return "Cancel";
    case CWUOpportunityStatus.UnderReview:
      return "Submit";
    case CWUOpportunityStatus.Published:
      return "Publish";
    case CWUOpportunityStatus.Awarded:
      return "Award";
    case CWUOpportunityStatus.Processing:
      return "Process";
    case CWUOpportunityStatus.Evaluation:
    case CWUOpportunityStatus.Draft:
      return "Update";
  }
}

export function cwuOpportunityStatusToPastTenseVerb(
  s: CWUOpportunityStatus
): string {
  switch (s) {
    case CWUOpportunityStatus.DeprecatedSuspended:
      return "Suspended";
    case CWUOpportunityStatus.Canceled:
      return "Cancelled";
    case CWUOpportunityStatus.UnderReview:
      return "Submitted";
    case CWUOpportunityStatus.Published:
      return "Published";
    case CWUOpportunityStatus.Awarded:
      return "Awarded";
    case CWUOpportunityStatus.Processing:
      return "Processed";
    case CWUOpportunityStatus.Evaluation:
    case CWUOpportunityStatus.Draft:
      return "Updated";
  }
}

export function cwuOpportunityEventToTitleCase(e: CWUOpportunityEvent): string {
  switch (e) {
    case CWUOpportunityEvent.AddendumAdded:
      return "Addendum Added";
    case CWUOpportunityEvent.Edited:
      return "Edited";
    case CWUOpportunityEvent.NoteAdded:
      return "Note Added";
  }
}

export function opportunityToHistoryItems({
  history
}: CWUOpportunity): History.Item[] {
  if (!history) {
    return [];
  }
  return history.map((s) => ({
    type: {
      text:
        s.type.tag === "status"
          ? cwuOpportunityStatusToTitleCase(s.type.value)
          : cwuOpportunityEventToTitleCase(s.type.value),
      color:
        s.type.tag === "status"
          ? cwuOpportunityStatusToColor(s.type.value)
          : undefined
    },
    note: s.note,
    attachments: s.attachments,
    createdAt: s.createdAt,
    createdBy: s.createdBy || undefined
  }));
}
