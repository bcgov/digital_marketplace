import { cwuOpportunityStatusToPastTenseVerb, cwuOpportunityStatusToPresentTenseVerb } from 'front-end/lib/pages/opportunity/code-with-us/lib';
import { CWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';

export const statusChanged = {
  success: (s: CWUOpportunityStatus) => {
    const verb = cwuOpportunityStatusToPastTenseVerb(s);
    return {
      title: `Opportunity ${verb}`,
      body: `Code With Us opportunity has been ${verb.toLowerCase()}.`
    };
  },
  error: (s: CWUOpportunityStatus) => {
    return {
      title: `Unable to ${cwuOpportunityStatusToPresentTenseVerb(s)} Opportunity`,
      body: `Code With Us opportunity could not be ${cwuOpportunityStatusToPastTenseVerb(s).toLowerCase()}. Please try again later.`
    };
  }
};

export const draftCreated = {
  success: {
    title: 'Draft Opportunity Saved',
    body: 'Draft Code With Us opportunity has been saved. You can return to this page to complete and publish this opportunity at a later date.'
  },
  error: {
    title: 'Unable to Save Draft Opportunity',
    body: 'Draft Code With Us opportunity could not be saved. Please try again later.'
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
  },
  error: {
    title: 'Unable to Save Changes',
    body: 'Your changes to this Code With Us opportunity could not be saved. Please fix the errors in the form and try again.'
  }
};

export const changesPublished = {
  success: {
    title: 'Opportunity Changes Published',
    body: 'Your changes to this Code With Us opportunity have been published.'
  },
  error: {
    title: 'Unable to Publish Changes',
    body: 'Your changes to this Code With Us opportunity could not be published. Please fix the errors in the form and try again.'
  }
};

export const startedEditing = {
  error: {
    title: 'Unable to Edit Opportunity',
    body: 'This opportunity cannot be edited at this time. Please try again later.'
  }
};
