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

type ScoreTest = "Resource Questions" | "Challenge";

export const scored = {
  success: (test: ScoreTest) => ({
    title: `${test} Scored`,
    body: `Team With Us proposal's ${test} ha${
      test === "Resource Questions" ? "ve" : "s"
    } been scored.`
  }),
  error: (test: ScoreTest) => ({
    title: `Unable to Score ${test}`,
    body: `Team With Us proposal's ${test} could not be scored. Please try again later.`
  })
};

export const questionEvaluationDraftCreated = {
  success: {
    title: "Draft Evaluation Saved",
    body: "Your draft Team With Us evaluation has been saved. You can return to this page to modify your evaluation prior to submission."
  },
  error: {
    title: "Unable to Save Draft Evaluation",
    body: "Your draft Team With Us evaluation could not be saved. Please try again later."
  }
};

export const questionEvaluationChangesSaved = {
  success: {
    title: "Evaluation Changes Saved",
    body: "Your changes to your Team With Us evaluation have been saved."
  },
  error: {
    title: "Unable to Save Evaluation",
    body: "Your changes to your Team With Us evaluation could not be saved. Please try again later."
  }
};

export const screenedIn = {
  success: {
    title: "Proposal Screened In",
    body: "Team With Us proposal has been screened into the next round."
  },
  error: {
    title: "Unable to Screen In Proposal",
    body: "Team With Us proposal could not be screened into the next round. Please try again later."
  }
};

export const screenedOut = {
  success: {
    title: "Proposal Screened Out",
    body: "Team With Us proposal has been screened out of the next round."
  },
  error: {
    title: "Unable to Screen Out Proposal",
    body: "Team With Us proposal could not be screened out of the next round. Please try again later."
  }
};
