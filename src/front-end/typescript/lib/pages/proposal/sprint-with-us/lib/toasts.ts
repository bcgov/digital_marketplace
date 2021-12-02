import * as opportunityToasts from 'front-end/typescript/lib/pages/opportunity/sprint-with-us/lib/toasts';
import { swuProposalStatusToPastTenseVerb, swuProposalStatusToPresentTenseVerb } from 'front-end/typescript/lib/pages/proposal/sprint-with-us/lib';
import { SWUOpportunityStatus } from 'shared/lib/resources/opportunity/sprint-with-us';
import { SWUProposalStatus } from 'shared/lib/resources/proposal/sprint-with-us';

export const awarded = {
  success: opportunityToasts.statusChanged.success(SWUOpportunityStatus.Awarded),
  error: opportunityToasts.statusChanged.error(SWUOpportunityStatus.Awarded)
};

export const submitted = {
  success: {
    title: 'Proposal Submitted',
    body: 'Your Sprint With Us proposal has been submitted. You can make changes to, and resubmit, your proposal prior to the opportunity\'s proposal deadline.'
  },
  error: {
    title: 'Unable to Submit Proposal',
    body: 'Your Sprint With Us proposal could not be submitted. Please fix any errors in the form and try again.'
  }
};

export const statusChanged = {
  success: (s: SWUProposalStatus) => {
    const verb = swuProposalStatusToPastTenseVerb(s);
    return {
      title: `Proposal ${verb}`,
      body: `Sprint With Us proposal has been ${verb.toLowerCase()}.`
    };
  },
  error: (s: SWUProposalStatus) => {
    return {
      title: `Unable to ${swuProposalStatusToPresentTenseVerb(s)} Proposal`,
      body: `Sprint With Us proposal could not be ${swuProposalStatusToPastTenseVerb(s).toLowerCase()}. Please try again later.`
    };
  }
};

type ScoreTest
  = 'Team Questions'
  | 'Code Challenge'
  | 'Team Scenario';

export const scored = {
  success: (test: ScoreTest) => ({
    title: `${test} Scored`,
    body: `Sprint With Us proposal's ${test} ha${test === 'Team Questions' ? 've' : 's'} been scored.`
  }),
  error: (test: ScoreTest) => ({
    title: `Unable to Score ${test}`,
    body: `Sprint With Us proposal's ${test} could not be scored. Please try again later.`
  })
};

export const screenedIn = {
  success: {
    title: 'Proposal Screened In',
    body: 'Sprint With Us proposal has been screened into the next round.'
  },
  error: {
    title: 'Unable to Screen In Proposal',
    body: 'Sprint With Us proposal could not be screened into the next round. Please try again later.'
  }
};

export const screenedOut = {
  success: {
    title: 'Proposal Screened Out',
    body: 'Sprint With Us proposal has been screened out of the next round.'
  },
  error: {
    title: 'Unable to Screen Out Proposal',
    body: 'Sprint With Us proposal could not be screened out of the next round. Please try again later.'
  }
};

export const draftCreated = {
  success: {
    title: 'Draft Proposal Saved',
    body: 'Your draft Sprint With Us proposal has been saved. You can return to this page to complete and submit your proposal prior to the opportunity\'s proposal deadline.'
  },
  error: {
    title: 'Unable to Save Draft Proposal',
    body: 'Your draft Sprint With Us proposal could not be saved. Please try again later.'
  }
};

export const deleted = {
  success: {
    title: 'Proposal Deleted',
    body: 'Your Sprint With Us proposal has been deleted.'
  },
  error: {
    title: 'Unable to Delete Proposal',
    body: 'Your Sprint With Us proposal could not be deleted. Please try again later.'
  }
};

export const changesSaved = {
  success: {
    title: 'Proposal Changes Saved',
    body: 'Your changes to your Sprint With Us proposal have been saved.'
  },
  error: {
    title: 'Unable to Save Proposal',
    body: 'Your changes to your Sprint With Us proposal could not be saved. Please try again later.'
  }
};

export const changesSubmitted = {
  success: {
    title: 'Proposal Changes Submitted',
    body: 'Your changes to your Sprint With Us proposal have been submitted.'
  },
  error: {
    title: 'Unable to Submit Proposal Changes',
    body: 'Your changes to your Sprint With Us proposal could not be submitted. Please try again later.'
  }
};
