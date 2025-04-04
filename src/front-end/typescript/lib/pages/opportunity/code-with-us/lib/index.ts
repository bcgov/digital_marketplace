import * as History from "front-end/lib/components/table/history";
import { ThemeColor } from "front-end/lib/types";
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
      return "primary";
    case CWUOpportunityStatus.Awarded:
      return "success";
    case CWUOpportunityStatus.Suspended:
      return "secondary";
    case CWUOpportunityStatus.Canceled:
      return "danger";
  }
  return "secondary";
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
    case CWUOpportunityStatus.Suspended:
      return "Suspended";
    case CWUOpportunityStatus.Canceled:
      return "Canceled";
  }
  return "Unknown";
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
    } else if (o.status === CWUOpportunityStatus.Evaluation) {
      return "Evaluation";
    } else if (o.status === CWUOpportunityStatus.Processing) {
      return "Processing";
    } else {
      return "Closed";
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
    } else {
      return "danger";
    }
  }
}

export function cwuOpportunityStatusToPresentTenseVerb(
  s: CWUOpportunityStatus
): string {
  switch (s) {
    case CWUOpportunityStatus.Suspended:
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
      return "Submit";
  }
  return "Submit";
}

export function cwuOpportunityStatusToPastTenseVerb(
  s: CWUOpportunityStatus
): string {
  switch (s) {
    case CWUOpportunityStatus.Suspended:
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
      return "Submitted";
  }
  return "Submitted";
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
