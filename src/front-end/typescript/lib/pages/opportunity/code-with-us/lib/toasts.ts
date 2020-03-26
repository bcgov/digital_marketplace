import { cwuOpportunityStatusToTitleCase } from 'front-end/lib/pages/opportunity/code-with-us/lib';
import { CWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';

export const statusChanged = {
  success: (s: Omit<CWUOpportunityStatus, CWUOpportunityStatus.Evaluation | CWUOpportunityStatus.Draft>) => {
    const verb = cwuOpportunityStatusToTitleCase(s as CWUOpportunityStatus);
    return {
      title: `Opportunity ${verb}`,
      body: `Code With Us opportunity has been ${verb.toLowerCase()}.`
    };
  }
};

export const draftCreated = {
  success: {
    title: 'Draft Opportunity Saved',
    body: 'Draft Code With Us opportunity has been saved. You can return to this page to complete and publish this opportunity at a later date.'
  }
};

export const deleted = {
  success: {
    title: 'Opportunity Deleted',
    body: 'Code With Us opportunity has been deleted.'
  },
  error: {
    title: 'Unable to Delete Opportunity',
    body: 'Code With Us opportunity could not be deleted.'
  }
};

export const changesSaved = {
  success: {
    title: 'Opportunity Changes Saved',
    body: 'Your changes to this Code With Us opportunity have been saved.'
  }
};

export const changesPublished = {
  success: {
    title: 'Opportunity Changes Published',
    body: 'Your changes to this Code With Us opportunity have been published.'
  }
};
