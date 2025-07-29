import * as db from "back-end/lib/db";
import { Emails } from "back-end/lib/mailer";
import {
  makeSWUOpportunityInformation,
  viewSWUOpportunityCallToAction
} from "back-end/lib/mailer/notifications/opportunity/sprint-with-us";
import * as templates from "back-end/lib/mailer/templates";
import { makeSend } from "back-end/lib/mailer/transport";
import React from "react";
import { EMPTY_STRING } from "shared/config";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import {
  SWUProposal,
  SWUProposalSlim
} from "shared/lib/resources/proposal/sprint-with-us";
import { AuthenticatedSession } from "shared/lib/resources/session";
import { User, UserType } from "shared/lib/resources/user";
import { Id } from "shared/lib/types";
import { getValidValue } from "shared/lib/validation";

export async function handleSWUProposalSubmitted(
  connection: db.Connection,
  proposalId: Id,
  session: AuthenticatedSession
): Promise<void> {
  // Notify the submitting user
  const proposal = getValidValue(
    await db.readOneSWUProposal(connection, proposalId, session),
    null
  );
  const opportunity =
    proposal &&
    getValidValue(
      await db.readOneSWUOpportunity(
        connection,
        proposal.opportunity.id,
        session
      ),
      null
    );
  const author =
    proposal?.createdBy &&
    getValidValue(
      await db.readOneUser(connection, proposal.createdBy.id),
      null
    );
  if (proposal && opportunity && author) {
    await successfulSWUProposalSubmission(author, opportunity, proposal);
  }
}

export async function handleSWUProposalAwarded(
  connection: db.Connection,
  proposalId: Id,
  session: AuthenticatedSession
): Promise<void> {
  // Notify the awarded proponent
  const proposal = getValidValue(
    await db.readOneSWUProposal(connection, proposalId, session),
    null
  );
  const opportunity =
    proposal &&
    getValidValue(
      await db.readOneSWUOpportunity(
        connection,
        proposal.opportunity.id,
        session
      ),
      null
    );
  const awardedUser =
    proposal?.createdBy &&
    getValidValue(
      await db.readOneUser(connection, proposal.createdBy.id),
      null
    );
  if (proposal && opportunity && awardedUser) {
    await awardedSWUProposalSubmission(awardedUser, opportunity, proposal);

    // Notify the unsuccessful proponents
    const allOpportunityProposals = getValidValue(
      await db.readManySWUProposals(connection, session, opportunity.id),
      null
    );
    if (allOpportunityProposals) {
      for (const proposal of allOpportunityProposals.filter(
        (p) => p.id !== proposalId
      )) {
        const unsuccessfulProponent =
          proposal.createdBy &&
          getValidValue(
            await db.readOneUser(connection, proposal.createdBy.id),
            null
          );
        if (unsuccessfulProponent) {
          await unsuccessfulSWUProposalSubmission(
            unsuccessfulProponent,
            opportunity,
            proposal
          );
        }
      }
    }
  }
}

export async function handleSWUProposalWithdrawn(
  connection: db.Connection,
  proposalId: Id,
  session: AuthenticatedSession
): Promise<void> {
  const proposal = getValidValue(
    await db.readOneSWUProposal(connection, proposalId, session),
    null
  );
  const opportunity =
    proposal &&
    getValidValue(
      await db.readOneSWUOpportunity(
        connection,
        proposal.opportunity.id,
        session
      ),
      null
    );

  if (proposal && opportunity) {
    const withdrawnProponent =
      proposal.createdBy &&
      getValidValue(
        await db.readOneUser(connection, proposal.createdBy.id),
        null
      );
    // Notify proposal author
    if (withdrawnProponent) {
      await withdrawnSWUProposalSubmissionProposalAuthor(
        withdrawnProponent,
        opportunity
      );

      // Notify admins that the proposal has been withdrawn
      const adminUsers =
        getValidValue(
          await db.readManyUsersByRole(connection, UserType.Admin),
          null
        ) || [];
      await Promise.all(
        adminUsers.map(
          async (admin) =>
            await withdrawnSWUProposalSubmission(
              admin,
              withdrawnProponent,
              opportunity
            )
        )
      );
    }
  }
}

export const successfulSWUProposalSubmission = makeSend(
  successfulSWUProposalSubmissionT
);

export async function successfulSWUProposalSubmissionT(
  recipient: User,
  opportunity: SWUOpportunity,
  proposal: SWUProposal
): Promise<Emails> {
  const title = "Your Sprint With Us Opportunity Proposal Has Been Submitted";
  const description =
    "You have successfully submitted a proposal for the following Digital Marketplace opportunity:";
  return [
    {
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        body: (
          <div>
            <p style={{ ...templates.styles.utilities.font.italic }}>
              What Happens Next?
            </p>
            <p>
              If you would like to make changes to your proposal, simply{" "}
              <templates.Link
                text="sign in"
                url={templates.makeUrl("sign-in")}
              />{" "}
              and access the proposal via your dashboard. All changes must be
              submitted prior to the proposal deadline.
            </p>
            <p>
              Once the proposal deadline has been reached, your proposal will be
              reviewed and assigned a score. After all proposals have been
              evaluated, you will be notified if you will be proceeding to the
              next stage of the opportunity or if your proposal was
              unsuccessful.
            </p>
            <p>Good luck!</p>
          </div>
        ),
        callsToAction: [
          viewSWUOpportunityCallToAction(opportunity),
          viewSWUProposalCallToAction(proposal)
        ]
      })
    }
  ];
}

export const awardedSWUProposalSubmission = makeSend(
  awardedSWUProposalSubmissionT
);

export async function awardedSWUProposalSubmissionT(
  recipient: User,
  opportunity: SWUOpportunity,
  proposal: SWUProposal | SWUProposalSlim
): Promise<Emails> {
  const title = "You Have Been Awarded a Sprint With Us Opportunity";
  const description =
    "Congratulations!  You have been awarded the following Digital Marketplace opportunity:";
  return [
    {
      summary: "SWU opportunity awarded; sent to successful proponent.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity, false)],
        body: (
          <div>
            <p>
              If you would like to view your scores for each stage of the
              opportunity,{" "}
              <templates.Link
                text="sign in"
                url={templates.makeUrl("sign-in")}
              />{" "}
              and access your proposal via your dashboard.
            </p>
            <p style={{ ...templates.styles.utilities.font.italic }}>
              What Happens Next?
            </p>
            <p>
              A member of the Digital Marketplace or the owner of the
              opportunity will be in touch with you shortly to discuss next
              steps.
            </p>
          </div>
        ),
        callsToAction: [
          viewSWUOpportunityCallToAction(opportunity),
          viewSWUProposalCallToAction(proposal)
        ]
      })
    }
  ];
}

export const unsuccessfulSWUProposalSubmission = makeSend(
  unsuccessfulSWUProposalSubmissionT
);

export async function unsuccessfulSWUProposalSubmissionT(
  recipient: User,
  opportunity: SWUOpportunity,
  proposal: SWUProposal | SWUProposalSlim
): Promise<Emails> {
  const title = "A Sprint With Us Opportunity: Award Decision Made";
  const description =
    "The following Digital Marketplace opportunity that you submitted a proposal to has been awarded:";

  // Get opportunity details from the standard information function
  const opportunityDetails = makeSWUOpportunityInformation(opportunity, false);

  return [
    {
      summary: "SWU opportunity awarded; sent to unsuccessful proponents.",
      to: recipient.email || [],
      subject: title,
      html: templates.awardDecision({
        title,
        description,
        opportunityTitle: opportunity.title,
        awardedTo: opportunity.successfulProponent?.name || EMPTY_STRING,
        opportunityDetails: opportunityDetails.items,
        body: (
          <div>
            <p>
              If you would like to view your scores for each stage of the
              opportunity,{" "}
              <templates.Link
                text="sign in"
                url={templates.makeUrl("sign-in")}
              />{" "}
              and access your proposal via your dashboard.
            </p>
            <p>
              Thank you for your submission and we wish you luck on the next
              opportunity.
            </p>
          </div>
        ),
        callsToAction: [
          viewSWUOpportunityCallToAction(opportunity),
          viewSWUProposalCallToAction(proposal)
        ]
      })
    }
  ];
}

export const withdrawnSWUProposalSubmissionProposalAuthor = makeSend(
  withdrawnSWUProposalSubmissionProposalAuthorT
);

export async function withdrawnSWUProposalSubmissionProposalAuthorT(
  recipient: User,
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title = "Your Proposal Has Been Withdrawn";
  const description =
    "Your proposal for the following Digital Marketplace opportunity has been withdrawn:";
  return [
    {
      summary: "SWU proposal withdrawn; sent to proponent who has withdrawn.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        body: (
          <div>
            <p>
              If you would like to resubmit a proposal to the opportunity you
              may do so prior to the proposal deadline.
            </p>
          </div>
        ),
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    }
  ];
}

export const withdrawnSWUProposalSubmission = makeSend(
  withdrawnSWUProposalSubmissionT
);

export async function withdrawnSWUProposalSubmissionT(
  recipient: User,
  withdrawnProponent: User,
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title = "A Proposal Has Been Withdrawn";
  const description = `${withdrawnProponent.name} has withdrawn their proposal for the following Digital Marketplace opportunity:`;
  return [
    {
      summary: "SWU proposal withdrawn; sent to the opportunity author.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    }
  ];
}

export function viewSWUProposalCallToAction(
  proposal: SWUProposal | SWUProposalSlim
) {
  return {
    text: "View Proposal",
    url: templates.makeUrl(
      `/opportunities/sprint-with-us/${proposal.opportunity.id}/proposals/${proposal.id}/edit`
    ),
    style: templates.styles.classes.buttonInfo
  };
}
