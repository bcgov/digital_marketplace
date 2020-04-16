import { swuOpportunityStatusToPastTenseVerb, swuOpportunityStatusToPresentTenseVerb } from 'front-end/lib/pages/opportunity/sprint-with-us/lib';
import { SWUOpportunityStatus } from 'shared/lib/resources/opportunity/sprint-with-us';

export const statusChanged = {
  success: (s: SWUOpportunityStatus) => {
    const verb = swuOpportunityStatusToPastTenseVerb(s);
    return {
      title: `Opportunity ${verb}`,
      body: `Sprint With Us opportunity has been ${verb.toLowerCase()}.`
    };
  },
  error: (s: SWUOpportunityStatus) => {
    return {
      title: `Unable to ${swuOpportunityStatusToPresentTenseVerb(s)} Opportunity`,
      body: `Sprint With Us opportunity could not be ${swuOpportunityStatusToPastTenseVerb(s).toLowerCase()}. Please try again later.`
    };
  }
};

export const draftCreated = {
  success: {
    title: 'Draft Opportunity Saved',
    body: 'Draft Sprint With Us opportunity has been saved. You can return to this page to complete and publish this opportunity at a later date.'
  },
  error: {
    title: 'Unable to Save Draft Opportunity',
    body: 'Draft Sprint With Us opportunity could not be saved. Please try again later.'
  }
};

export const deleted = {
  success: {
    title: 'Opportunity Deleted',
    body: 'Sprint With Us opportunity has been deleted.'
  },
  error: {
    title: 'Unable to Delete Opportunity',
    body: 'Sprint With Us opportunity could not be deleted.'
  }
};

export const changesSaved = {
  success: {
    title: 'Opportunity Changes Saved',
    body: 'Your changes to this Sprint With Us opportunity have been saved.'
  },
  error: {
    title: 'Unable to Save Changes',
    body: 'Your changes to this Sprint With Us opportunity could not be saved. Please fix the errors in the form and try again.'
  }
};

export const changesPublished = {
  success: {
    title: 'Opportunity Changes Published',
    body: 'Your changes to this Sprint With Us opportunity have been published.'
  },
  error: {
    title: 'Unable to Publish Changes',
    body: 'Your changes to this Sprint With Us opportunity could not be published. Please fix the errors in the form and try again.'
  }
};

export const startedEditing = {
  error: {
    title: 'Unable to Edit Opportunity',
    body: 'This opportunity cannot be edited at this time. Please try again later.'
  }
};
