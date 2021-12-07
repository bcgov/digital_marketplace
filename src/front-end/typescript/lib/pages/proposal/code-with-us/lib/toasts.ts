import * as opportunityToasts from 'front-end/lib/pages/opportunity/code-with-us/lib/toasts';
import { cwuProposalStatusToPastTenseVerb, cwuProposalStatusToPresentTenseVerb } from 'front-end/lib/pages/proposal/code-with-us/lib';
import { CWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';
import { CWUProposalStatus } from 'shared/lib/resources/proposal/code-with-us';

export const awarded = {
  success: opportunityToasts.statusChanged.success(CWUOpportunityStatus.Awarded),
  error: opportunityToasts.statusChanged.error(CWUOpportunityStatus.Awarded)
};

export const submitted = {
  success: {
    title: 'Proposal Submitted',
    body: 'Your Code With Us proposal has been submitted. You can make changes to, and resubmit, your proposal prior to the opportunity\'s proposal deadline.'
  },
  error: {
    title: 'Unable to Submit Proposal',
    body: 'Your Code With Us proposal could not be submitted. Please fix any errors in the form and try again.'
  }
};

export const statusChanged = {
  success: (s: CWUProposalStatus) => {
    const verb = cwuProposalStatusToPastTenseVerb(s);
    return {
      title: `Proposal ${verb}`,
      body: `Code With Us proposal has been ${verb.toLowerCase()}.`
    };
  },
  error: (s: CWUProposalStatus) => {
    return {
      title: `Unable to ${cwuProposalStatusToPresentTenseVerb(s)} Proposal`,
      body: `Code With Us proposal could not be ${cwuProposalStatusToPastTenseVerb(s).toLowerCase()}. Please try again later.`
    };
  }
};

export const draftCreated = {
  success: {
    title: 'Draft Proposal Saved',
    body: 'Your draft Code With Us proposal has been saved. You can return to this page to complete and submit your proposal prior to the opportunity\'s proposal deadline.'
  },
  error: {
    title: 'Unable to Save Draft Proposal',
    body: 'Your draft Code With Us proposal could not be saved. Please try again later.'
  }
};

export const deleted = {
  success: {
    title: 'Proposal Deleted',
    body: 'Your Code With Us proposal has been deleted.'
  },
  error: {
    title: 'Unable to Delete Proposal',
    body: 'Your Code With Us proposal could not be deleted. Please try again later.'
  }
};

export const changesSaved = {
  success: {
    title: 'Proposal Changes Saved',
    body: 'Your changes to your Code With Us proposal have been saved.'
  },
  error: {
    title: 'Unable to Save Proposal',
    body: 'Your changes to your Code With Us proposal could not be saved. Please try again later.'
  }
};

export const changesSubmitted = {
  success: {
    title: 'Proposal Changes Submitted',
    body: 'Your changes to your Code With Us proposal have been submitted.'
  },
  error: {
    title: 'Unable to Submit Proposal Changes',
    body: 'Your changes to your Code With Us proposal could not be submitted. Please try again later.'
  }
};
