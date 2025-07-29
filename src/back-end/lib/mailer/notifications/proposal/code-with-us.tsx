import * as db from "back-end/lib/db";
import { Emails } from "back-end/lib/mailer";
import {
  makeCWUOpportunityInformation,
  viewCWUOpportunityCallToAction
} from "back-end/lib/mailer/notifications/opportunity/code-with-us";
import * as templates from "back-end/lib/mailer/templates";
import { makeSend } from "back-end/lib/mailer/transport";
import React from "react";
import { EMPTY_STRING } from "shared/config";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import {
  CWUProposal,
  CWUProposalSlim
} from "shared/lib/resources/proposal/code-with-us";
import { AuthenticatedSession } from "shared/lib/resources/session";
import { User, UserType } from "shared/lib/resources/user";
import { Id } from "shared/lib/types";
import { getValidValue } from "shared/lib/validation";

export async function handleCWUProposalSubmitted(
  connection: db.Connection,
  proposalId: Id,
  session: AuthenticatedSession
): Promise<void> {
  // Notify the submitting user
  const proposal = getValidValue(
    await db.readOneCWUProposal(connection, proposalId, session),
    null
  );
  const opportunity =
    proposal &&
    getValidValue(
      await db.readOneCWUOpportunity(
        connection,
        proposal.opportunity.id,
        session
      ),
      null
    );
  if (proposal && opportunity) {
    await successfulCWUProposalSubmission(session.user, opportunity, proposal);
  }
}

export async function handleCWUProposalAwarded(
  connection: db.Connection,
  proposalId: Id,
  session: AuthenticatedSession
): Promise<void> {
  // Notify the awarded proponent
  const proposal = getValidValue(
    await db.readOneCWUProposal(connection, proposalId, session),
    null
  );
  const opportunity =
    proposal &&
    getValidValue(
      await db.readOneCWUOpportunity(
        connection,
        proposal.opportunity.id,
        session
      ),
      null
    );
  const awardedUser =
    proposal &&
    getValidValue(
      await db.readOneUser(connection, proposal.createdBy.id),
      null
    );
  if (proposal && opportunity && awardedUser) {
    await awardedCWUProposalSubmission(awardedUser, opportunity, proposal);

    // Notify the unsuccessful proponents
    const allOpportunityProposals = getValidValue(
      await db.readManyCWUProposals(connection, session, opportunity.id),
      null
    );
    if (allOpportunityProposals) {
      for (const proposal of allOpportunityProposals.filter(
        (p) => p.id !== proposalId
      )) {
        const unsuccessfulProponent = getValidValue(
          await db.readOneUser(connection, proposal.createdBy.id),
          null
        );
        if (unsuccessfulProponent) {
          await unsuccessfulCWUProposalSubmission(
            unsuccessfulProponent,
            opportunity,
            proposal
          );
        }
      }
    }
  }
}

export async function handleCWUProposalWithdrawn(
  connection: db.Connection,
  proposalId: Id,
  session: AuthenticatedSession
): Promise<void> {
  const proposal = getValidValue(
    await db.readOneCWUProposal(connection, proposalId, session),
    null
  );
  const opportunity =
    proposal &&
    getValidValue(
      await db.readOneCWUOpportunity(
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
      await withdrawnCWUProposalSubmissionProposalAuthor(
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
            await withdrawnCWUProposalSubmission(
              admin,
              withdrawnProponent,
              opportunity
            )
        )
      );
    }
  }
}

export const successfulCWUProposalSubmission = makeSend(
  successfulCWUProposalSubmissionT
);

export async function successfulCWUProposalSubmissionT(
  recipient: User,
  opportunity: CWUOpportunity,
  proposal: CWUProposal
): Promise<Emails> {
  const title = "Your Code With Us Opportunity Proposal Has Been Submitted";
  const description =
    "You have successfully submitted a proposal for the following Digital Marketplace opportunity:";
  return [
    {
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeCWUOpportunityInformation(opportunity)],
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
              evaluated, you will be notified if you have been awarded the
              opportunity or if your proposal was unsuccessful.
            </p>
            <p>Good luck!</p>
          </div>
        ),
        callsToAction: [
          viewCWUOpportunityCallToAction(opportunity),
          viewCWUProposalCallToAction(proposal)
        ]
      })
    }
  ];
}

export const awardedCWUProposalSubmission = makeSend(
  awardedCWUProposalSubmissionT
);

export async function awardedCWUProposalSubmissionT(
  recipient: User,
  opportunity: CWUOpportunity,
  proposal: CWUProposal | CWUProposalSlim
): Promise<Emails> {
  const title = "You Have Been Awarded a Code With Us Opportunity";
  const description =
    "Congratulations!  You have been awarded the following Digital Marketplace opportunity:";
  return [
    {
      summary: "CWU opportunity awarded; sent to successful proponent.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeCWUOpportunityInformation(opportunity, false)],
        body: (
          <div>
            <p>
              If you would like to view your total score,{" "}
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
          viewCWUOpportunityCallToAction(opportunity),
          viewCWUProposalCallToAction(proposal)
        ]
      })
    }
  ];
}

export const unsuccessfulCWUProposalSubmission = makeSend(
  unsuccessfulCWUProposalSubmissionT
);

export async function unsuccessfulCWUProposalSubmissionT(
  recipient: User,
  opportunity: CWUOpportunity,
  proposal: CWUProposal | CWUProposalSlim
): Promise<Emails> {
  const title = "A Code With Us Opportunity: Award Decision Made";
  const description =
    "The following Digital Marketplace opportunity that you submitted a proposal to has been awarded:";

  // Get opportunity details from the standard information function
  const opportunityDetails = makeCWUOpportunityInformation(opportunity, false);

  return [
    {
      summary: "CWU opportunity awarded; sent to unsuccessful proponents.",
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
              If you would like to view your total score,{" "}
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
          viewCWUOpportunityCallToAction(opportunity),
          viewCWUProposalCallToAction(proposal)
        ]
      })
    }
  ];
}

export const withdrawnCWUProposalSubmissionProposalAuthor = makeSend(
  withdrawnCWUProposalSubmissionProposalAuthorT
);

export async function withdrawnCWUProposalSubmissionProposalAuthorT(
  recipient: User,
  opportunity: CWUOpportunity
): Promise<Emails> {
  const title = "Your Proposal Has Been Withdrawn";
  const description =
    "Your proposal for the following Digital Marketplace opportunity has been withdrawn:";
  return [
    {
      summary: "CWU proposal withdrawn; sent to proponent who has withdrawn.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeCWUOpportunityInformation(opportunity)],
        body: (
          <div>
            <p>
              If you would like to resubmit a proposal to the opportunity you
              may do so prior to the proposal deadline.
            </p>
          </div>
        ),
        callsToAction: [viewCWUOpportunityCallToAction(opportunity)]
      })
    }
  ];
}

export const withdrawnCWUProposalSubmission = makeSend(
  withdrawnCWUProposalSubmissionT
);

export async function withdrawnCWUProposalSubmissionT(
  recipient: User,
  withdrawnProponent: User,
  opportunity: CWUOpportunity
): Promise<Emails> {
  const title = "A Proposal Has Been Withdrawn";
  const description = `${withdrawnProponent.name} has withdrawn their proposal for the following Digital Marketplace opportunity:`;
  return [
    {
      summary: "CWU proposal withdrawn; sent to the opportunity author.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeCWUOpportunityInformation(opportunity)],
        callsToAction: [viewCWUOpportunityCallToAction(opportunity)]
      })
    }
  ];
}

export function viewCWUProposalCallToAction(
  proposal: CWUProposal | CWUProposalSlim
) {
  return {
    text: "View Proposal",
    url: templates.makeUrl(
      `/opportunities/code-with-us/${proposal.opportunity.id}/proposals/${proposal.id}/edit`
    ),
    style: templates.styles.classes.buttonInfo
  };
}
