import * as History from "front-end/lib/components/table/history";
import { ThemeColor } from "front-end/lib/types";
import { flatten, startCase, uniq } from "lodash";
import {
  isOpen,
  TWUOpportunity,
  TWUOpportunityEvent,
  TWUOpportunityStatus,
  TWUServiceArea
} from "shared/lib/resources/opportunity/team-with-us";
import { isAdmin, User } from "shared/lib/resources/user";

export function twuOpportunityStatusToColor(
  s: TWUOpportunityStatus
): ThemeColor {
  switch (s) {
    case TWUOpportunityStatus.Draft:
      return "secondary";
    case TWUOpportunityStatus.UnderReview:
      return "warning";
    case TWUOpportunityStatus.Published:
      return "success";
    case TWUOpportunityStatus.EvaluationResourceQuestions:
      return "warning";
    case TWUOpportunityStatus.EvaluationChallenge:
      return "warning";
    case TWUOpportunityStatus.Awarded:
      return "success";
    case TWUOpportunityStatus.Canceled:
      return "danger";
  }
}

export function twuOpportunityStatusToTitleCase(
  s: TWUOpportunityStatus
): string {
  switch (s) {
    case TWUOpportunityStatus.Draft:
      return "Draft";
    case TWUOpportunityStatus.UnderReview:
      return "Under Review";
    case TWUOpportunityStatus.Published:
      return "Published";
    case TWUOpportunityStatus.EvaluationResourceQuestions:
      return "Resource Questions";
    case TWUOpportunityStatus.EvaluationChallenge:
      return "Evaluation Challenge";
    case TWUOpportunityStatus.Awarded:
      return "Awarded";
    case TWUOpportunityStatus.Canceled:
      return "Cancelled"; //British spelling
  }
}

export function twuOpportunityStatusToPresentTenseVerb(
  s: TWUOpportunityStatus
): string {
  switch (s) {
    case TWUOpportunityStatus.Draft:
      return "Save";
    case TWUOpportunityStatus.UnderReview:
      return "Submit";
    case TWUOpportunityStatus.Published:
      return "Publish";
    case TWUOpportunityStatus.Awarded:
      return "Award";
    case TWUOpportunityStatus.Canceled:
      return "Cancel";
    default:
      return "Update";
  }
}

export function twuOpportunityStatusToPastTenseVerb(
  s: TWUOpportunityStatus
): string {
  switch (s) {
    case TWUOpportunityStatus.Draft:
      return "Saved";
    case TWUOpportunityStatus.UnderReview:
      return "Submitted";
    case TWUOpportunityStatus.Published:
      return "Published";
    case TWUOpportunityStatus.Awarded:
      return "Awarded";
    case TWUOpportunityStatus.Canceled:
      return "Cancelled"; //British spelling
    default:
      return "Updated";
  }
}

export function twuOpportunityToPublicStatus(
  o: Pick<TWUOpportunity, "status" | "createdBy" | "proposalDeadline">,
  viewerUser?: User
): string {
  const admin =
    !!viewerUser && (isAdmin(viewerUser) || o.createdBy?.id === viewerUser.id);
  if (admin) {
    return twuOpportunityStatusToTitleCase(o.status);
  } else {
    if (isOpen(o)) {
      return "Open";
    } else if (o.status === TWUOpportunityStatus.Canceled) {
      return "Canceled";
    } else {
      return "Closed";
    }
  }
}

export function twuOpportunityToPublicColor(
  o: Pick<TWUOpportunity, "status" | "createdBy" | "proposalDeadline">,
  viewerUser?: User
): ThemeColor {
  const admin =
    !!viewerUser && (isAdmin(viewerUser) || o.createdBy?.id === viewerUser.id);
  if (admin) {
    return twuOpportunityStatusToColor(o.status);
  } else {
    if (isOpen(o)) {
      return "success";
    } else {
      return "danger";
    }
  }
}

export function twuOpportunityEventToTitleCase(e: TWUOpportunityEvent): string {
  switch (e) {
    case TWUOpportunityEvent.AddendumAdded:
      return "Addendum Added";
    case TWUOpportunityEvent.Edited:
      return "Edited";
    case TWUOpportunityEvent.NoteAdded:
      return "Note Added";
  }
}

export function opportunityToHistoryItems({
  history
}: TWUOpportunity): History.Item[] {
  if (!history) {
    return [];
  }
  return history.map((s) => ({
    type: {
      text:
        s.type.tag === "status"
          ? twuOpportunityStatusToTitleCase(s.type.value)
          : twuOpportunityEventToTitleCase(s.type.value),
      color:
        s.type.tag === "status"
          ? twuOpportunityStatusToColor(s.type.value)
          : undefined
    },
    note: s.note,
    createdAt: s.createdAt,
    createdBy: s.createdBy || undefined
  }));
}

/**
 * Formats a Team With Us service area to title case.
 *
 * @param s
 * @returns
 */
export function twuServiceAreaToTitleCase(s: TWUServiceArea) {
  if (s === TWUServiceArea.DevopsSpecialist) {
    return "DevOps Specialist";
  }
  return startCase(
    Object.keys(TWUServiceArea)[Object.values(TWUServiceArea).indexOf(s)]
  );
}

/**
 * Flattens and removes duplicates from a TWU opportunity's mandatory and
 * optional skills.
 *
 * @param opp TWU opportunity with resources
 * @returns object containing aggregated mandatory and optional skills
 */
export function aggregateResourceSkills(opp: TWUOpportunity): {
  mandatory: string[];
  optional: string[];
} {
  const [mandatory, optional] = (["mandatorySkills", "optionalSkills"] as const)
    .map((skill) => opp.resources.map((resource) => resource[skill]))
    .map((skills) => uniq(flatten(skills)));

  return { mandatory, optional };
}
