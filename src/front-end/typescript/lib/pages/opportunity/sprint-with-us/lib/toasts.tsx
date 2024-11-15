import {
  swuOpportunityStatusToPastTenseVerb,
  swuOpportunityStatusToPresentTenseVerb
} from "front-end/lib/pages/opportunity/sprint-with-us/lib";
import Link, {
  iconLinkSymbol,
  rightPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { SWUOpportunityStatus } from "shared/lib/resources/opportunity/sprint-with-us";
import { adt, Id } from "shared/lib/types";

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
      title: `Unable to ${swuOpportunityStatusToPresentTenseVerb(
        s
      )} Opportunity`,
      body: `Sprint With Us opportunity could not be ${swuOpportunityStatusToPastTenseVerb(
        s
      ).toLowerCase()}. Please try again later.`
    };
  }
};

export const published = {
  success: (opportunityId: Id) => {
    const { title, body } = statusChanged.success(
      SWUOpportunityStatus.Published
    );
    return {
      title,
      body: (
        <div>
          {body}
          <div className="mt-2">
            <Link
              newTab
              symbol_={rightPlacement(iconLinkSymbol("external-link"))}
              dest={routeDest(adt("opportunitySWUView", { opportunityId }))}>
              View opportunity
            </Link>
          </div>
        </div>
      )
    };
  },
  error: statusChanged.error(SWUOpportunityStatus.Published)
};

export const draftCreated = {
  success: {
    title: "Draft Opportunity Saved",
    body: "Draft Sprint With Us opportunity has been saved. You can return to this page to complete and publish this opportunity at a later date."
  },
  error: {
    title: "Unable to Save Draft Opportunity",
    body: "Draft Sprint With Us opportunity could not be saved. Please try again later."
  }
};

export const deleted = {
  success: {
    title: "Opportunity Deleted",
    body: "Sprint With Us opportunity has been deleted."
  },
  error: {
    title: "Unable to Delete Opportunity",
    body: "Sprint With Us opportunity could not be deleted."
  }
};

export const changesSaved = {
  success: {
    title: "Opportunity Changes Saved",
    body: "Your changes to this Sprint With Us opportunity have been saved."
  },
  error: {
    title: "Unable to Save Changes",
    body: "Your changes to this Sprint With Us opportunity could not be saved. Please fix the errors in the form and try again."
  }
};

export const changesPublished = {
  success: {
    title: "Opportunity Changes Published",
    body: "Your changes to this Sprint With Us opportunity have been published."
  },
  error: {
    title: "Unable to Publish Changes",
    body: "Your changes to this Sprint With Us opportunity could not be published. Please fix the errors in the form and try again."
  }
};

export const startedEditing = {
  error: {
    title: "Unable to Edit Opportunity",
    body: "This opportunity cannot be edited at this time. Please try again later."
  }
};

export const submittedQuestionEvaluationScoresForConsensus = {
  success: {
    title: "Evaluations Submitted for Consensus",
    body: "Your evaluations for this Sprint With Us opportunity have been submitted for consensus."
  },
  error: {
    title: "Unable to Submit Evaluations for Consensus",
    body: "Your evaluations for this Sprint With Us opportunity could not be submitted for consensus. Please try again later."
  }
};
