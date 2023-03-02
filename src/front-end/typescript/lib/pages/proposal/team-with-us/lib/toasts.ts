import * as opportunityToasts from "front-end/lib/pages/opportunity/team-with-us/lib/toasts";
import {
  twuProposalStatusToPastTenseVerb,
  twuProposalStatusToPresentTenseVerb
} from "front-end/lib/pages/proposal/team-with-us/lib";
import { TWUOpportunityStatus } from "shared/lib/resources/opportunity/team-with-us";
import { TWUProposalStatus } from "shared/lib/resources/proposal/team-with-us";

export const awarded = {
  success: opportunityToasts.statusChanged.success(
    TWUOpportunityStatus.Awarded
  ),
  error: opportunityToasts.statusChanged.error(TWUOpportunityStatus.Awarded)
};

export const submitted = {
  success: {
    title: "Proposal Submitted",
    body: "Your Team With Us proposal has been submitted. You can make changes to, and resubmit, your proposal prior to the opportunity's proposal deadline."
  },
  error: {
    title: "Unable to Submit Proposal",
    body: "Your Team With Us proposal could not be submitted. Please fix any errors in the form and try again."
  }
};

export const statusChanged = {
  success: (s: TWUProposalStatus) => {
    const verb = twuProposalStatusToPastTenseVerb(s);
    return {
      title: `Proposal ${verb}`,
      body: `Team With Us proposal has been ${verb.toLowerCase()}.`
    };
  },
  error: (s: TWUProposalStatus) => {
    return {
      title: `Unable to ${twuProposalStatusToPresentTenseVerb(s)} Proposal`,
      body: `Team With Us proposal could not be ${twuProposalStatusToPastTenseVerb(
        s
      ).toLowerCase()}. Please try again later.`
    };
  }
};

export const draftCreated = {
  success: {
    title: "Draft Proposal Saved",
    body: "Your draft Team With Us proposal has been saved. You can return to this page to complete and submit your proposal prior to the opportunity's proposal deadline."
  },
  error: {
    title: "Unable to Save Draft Proposal",
    body: "Your draft Team With Us proposal could not be saved. Please try again later."
  }
};

export const deleted = {
  success: {
    title: "Proposal Deleted",
    body: "Your Team With Us proposal has been deleted."
  },
  error: {
    title: "Unable to Delete Proposal",
    body: "Your Team With Us proposal could not be deleted. Please try again later."
  }
};

export const changesSaved = {
  success: {
    title: "Proposal Changes Saved",
    body: "Your changes to your Team With Us proposal have been saved."
  },
  error: {
    title: "Unable to Save Proposal",
    body: "Your changes to your Team With Us proposal could not be saved. Please try again later."
  }
};

export const changesSubmitted = {
  success: {
    title: "Proposal Changes Submitted",
    body: "Your changes to your Team With Us proposal have been submitted."
  },
  error: {
    title: "Unable to Submit Proposal Changes",
    body: "Your changes to your Team With Us proposal could not be submitted. Please try again later."
  }
};
