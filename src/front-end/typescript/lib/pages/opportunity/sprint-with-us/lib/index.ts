import * as History from "front-end/lib/components/table/history";
import { ThemeColor } from "front-end/lib/types";
import {
  isOpen,
  SWUOpportunity,
  SWUOpportunityEvent,
  SWUOpportunityStatus
} from "shared/lib/resources/opportunity/sprint-with-us";
import { isAdmin, User } from "shared/lib/resources/user";

export function swuOpportunityStatusToColor(
  s: SWUOpportunityStatus
): ThemeColor {
  switch (s) {
    case SWUOpportunityStatus.Draft:
      return "secondary";
    case SWUOpportunityStatus.UnderReview:
      return "warning";
    case SWUOpportunityStatus.Published:
      return "success";
    case SWUOpportunityStatus.EvaluationTeamQuestionsIndividual:
    case SWUOpportunityStatus.EvaluationTeamQuestionsConsensus:
      return "warning";
    case SWUOpportunityStatus.EvaluationTeamQuestions:
      return "warning";
    case SWUOpportunityStatus.EvaluationCodeChallenge:
      return "warning";
    case SWUOpportunityStatus.EvaluationTeamScenario:
      return "warning";
    case SWUOpportunityStatus.Awarded:
      return "success";
    case SWUOpportunityStatus.Suspended:
      return "secondary";
    case SWUOpportunityStatus.Canceled:
      return "danger";
  }
}

export function swuOpportunityStatusToTitleCase(
  s: SWUOpportunityStatus
): string {
  switch (s) {
    case SWUOpportunityStatus.Draft:
      return "Draft";
    case SWUOpportunityStatus.UnderReview:
      return "Under Review";
    case SWUOpportunityStatus.Published:
      return "Published";
    case SWUOpportunityStatus.EvaluationTeamQuestionsIndividual:
    case SWUOpportunityStatus.EvaluationTeamQuestionsConsensus:
      return "Evaluation";
    case SWUOpportunityStatus.EvaluationTeamQuestions:
      return "Team Questions";
    case SWUOpportunityStatus.EvaluationCodeChallenge:
      return "Code Challenge";
    case SWUOpportunityStatus.EvaluationTeamScenario:
      return "Team Scenario";
    case SWUOpportunityStatus.Awarded:
      return "Awarded";
    case SWUOpportunityStatus.Suspended:
      return "Suspended";
    case SWUOpportunityStatus.Canceled:
      return "Cancelled"; //British spelling
  }
}

export function swuOpportunityStatusToPresentTenseVerb(
  s: SWUOpportunityStatus
): string {
  switch (s) {
    case SWUOpportunityStatus.Draft:
      return "Save";
    case SWUOpportunityStatus.UnderReview:
      return "Submit";
    case SWUOpportunityStatus.Published:
      return "Publish";
    case SWUOpportunityStatus.Awarded:
      return "Award";
    case SWUOpportunityStatus.Suspended:
      return "Suspend";
    case SWUOpportunityStatus.Canceled:
      return "Cancel";
    default:
      return "Update";
  }
}

export function swuOpportunityStatusToPastTenseVerb(
  s: SWUOpportunityStatus
): string {
  switch (s) {
    case SWUOpportunityStatus.Draft:
      return "Saved";
    case SWUOpportunityStatus.UnderReview:
      return "Submitted";
    case SWUOpportunityStatus.Published:
      return "Published";
    case SWUOpportunityStatus.Awarded:
      return "Awarded";
    case SWUOpportunityStatus.Suspended:
      return "Suspended";
    case SWUOpportunityStatus.Canceled:
      return "Cancelled"; //British spelling
    default:
      return "Updated";
  }
}

export function swuOpportunityToPublicStatus(
  o: Pick<SWUOpportunity, "status" | "createdBy" | "proposalDeadline">,
  viewerUser?: User
): string {
  const admin =
    !!viewerUser && (isAdmin(viewerUser) || o.createdBy?.id === viewerUser.id);
  if (admin) {
    return swuOpportunityStatusToTitleCase(o.status);
  } else {
    if (isOpen(o)) {
      return "Open";
    } else if (o.status === SWUOpportunityStatus.Canceled) {
      return "Canceled";
    } else {
      return "Closed";
    }
  }
}

export function swuOpportunityToPublicColor(
  o: Pick<SWUOpportunity, "status" | "createdBy" | "proposalDeadline">,
  viewerUser?: User
): ThemeColor {
  const admin =
    !!viewerUser && (isAdmin(viewerUser) || o.createdBy?.id === viewerUser.id);
  if (admin) {
    return swuOpportunityStatusToColor(o.status);
  } else {
    if (isOpen(o)) {
      return "success";
    } else {
      return "danger";
    }
  }
}

export function swuOpportunityEventToTitleCase(e: SWUOpportunityEvent): string {
  switch (e) {
    case SWUOpportunityEvent.AddendumAdded:
      return "Addendum Added";
    case SWUOpportunityEvent.Edited:
      return "Edited";
    case SWUOpportunityEvent.NoteAdded:
      return "Note Added";
  }
}

export function opportunityToHistoryItems({
  history
}: SWUOpportunity): History.Item[] {
  if (!history) {
    return [];
  }
  return history.map((s) => ({
    type: {
      text:
        s.type.tag === "status"
          ? swuOpportunityStatusToTitleCase(s.type.value)
          : swuOpportunityEventToTitleCase(s.type.value),
      color:
        s.type.tag === "status"
          ? swuOpportunityStatusToColor(s.type.value)
          : undefined
    },
    note: s.note,
    attachments: s.attachments,
    createdAt: s.createdAt,
    createdBy: s.createdBy || undefined
  }));
}
