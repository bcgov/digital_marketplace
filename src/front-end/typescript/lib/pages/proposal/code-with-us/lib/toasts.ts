import { statusChanged } from 'front-end/lib/pages/opportunity/code-with-us/lib/toasts';
import { CWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';

export const awarded = {
  success: statusChanged.success(CWUOpportunityStatus.Awarded)
};

export const submitted = {
  success: {
    title: 'Proposal Submitted',
    body: 'Your Code With Us proposal has been submitted. You can make changes to, and resubmit, your proposal prior to the opportunity\'s proposal deadline.'
  }
};

export const scored = {
  success: {
    title: 'Proposal Scored',
    body: 'Code With Us proposal has been scored.'
  }
};

export const disqualified = {
  success: {
    title: 'Proposal Disqualified',
    body: 'Code With Us proposal has been disqualified.'
  }
};

export const draftCreated = {
  success: {
    title: 'Draft Proposal Saved',
    body: 'Your draft Code With Us proposal has been saved. You can return to this page to complete and submit your proposal prior to the opportunity\'s proposal deadline.'
  }
};

export const withdrawn = {
  success: {
    title: 'Proposal Withdrawn',
    body: 'Your Code With Us proposal has been withdrawn.'
  }
};

export const deleted = {
  success: {
    title: 'Proposal Deleted',
    body: 'Your Code With Us proposal has been deleted.'
  }
};

export const changesSaved = {
  success: {
    title: 'Proposal Changes Saved',
    body: 'Your changes to your Code With Us proposal have been saved.'
  }
};

export const changesSubmitted = {
  success: {
    title: 'Proposal Changes Submitted',
    body: 'Your changes to your Code With Us proposal have been submitted.'
  }
};
