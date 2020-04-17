import { statusChanged } from 'front-end/lib/pages/opportunity/sprint-with-us/lib/toasts';
import { SWUOpportunityStatus } from 'shared/lib/resources/opportunity/sprint-with-us';

export const awarded = {
  success: statusChanged.success(SWUOpportunityStatus.Awarded)
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

type ScoreTest
  = 'Team Questions'
  | 'Code Challenge'
  | 'Team Scenario';

export const scored = {
  success: (test: ScoreTest) => ({
    title: `${test} Scored`,
    body: `Sprint With Us proposal's ${test} ha${test === 'Team Questions' ? 've' : 's'} been scored.`
  })
};

export const screenedIn = {
  success: {
    title: 'Proposal Screened-In',
    body: 'Sprint With Us proposal has been screened into the next round.'
  }
};

export const screenedOut = {
  success: {
    title: 'Proposal Screened-Out',
    body: 'Sprint With Us proposal has been screened out of the next round.'
  }
};

export const disqualified = {
  success: {
    title: 'Proposal Disqualified',
    body: 'Sprint With Us proposal has been disqualified.'
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

export const withdrawn = {
  success: {
    title: 'Proposal Withdrawn',
    body: 'Your Sprint With Us proposal has been withdrawn.'
  }
};

export const deleted = {
  success: {
    title: 'Proposal Deleted',
    body: 'Your Sprint With Us proposal has been deleted.'
  }
};

export const changesSaved = {
  success: {
    title: 'Proposal Changes Saved',
    body: 'Your changes to your Sprint With Us proposal have been saved.'
  }
};

export const changesSubmitted = {
  success: {
    title: 'Proposal Changes Submitted',
    body: 'Your changes to your Sprint With Us proposal have been submitted.'
  }
};
