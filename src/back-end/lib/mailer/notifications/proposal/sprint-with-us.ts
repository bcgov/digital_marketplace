import { CONTACT_EMAIL } from 'back-end/config';
import * as db from 'back-end/lib/db';
import { makeSWUOpportunityInformation, viewSWUOpportunityCallToAction } from 'back-end/lib/mailer/notifications/opportunity/sprint-with-us';
import * as templates from 'back-end/lib/mailer/templates';
import { send } from 'back-end/lib/mailer/transport';
import { isSWUOpportunityClosed, SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { SWUProposal, SWUProposalSlim } from 'shared/lib/resources/proposal/sprint-with-us';
import { AuthenticatedSession } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { getValidValue } from 'shared/lib/validation';

export async function handleSWUProposalSubmitted(connection: db.Connection, proposalId: Id, session: AuthenticatedSession): Promise<void> {
  // Notify the submitting user
  const proposal = getValidValue(await db.readOneSWUProposal(connection, proposalId, session), null);
  const opportunity = proposal && getValidValue(await db.readOneSWUOpportunity(connection, proposal.opportunity.id, session), null);
  const author = proposal?.createdBy && getValidValue(await db.readOneUser(connection, proposal.createdBy.id), null);
  if (proposal && opportunity && author) {
    await successfulSWUProposalSubmission(author, opportunity, proposal);
  }
}

export async function handleSWUProposalAwarded(connection: db.Connection, proposalId: Id, session: AuthenticatedSession): Promise<void> {
  // Notify the awarded proponent
  const proposal = getValidValue(await db.readOneSWUProposal(connection, proposalId, session), null);
  const opportunity = proposal && getValidValue(await db.readOneSWUOpportunity(connection, proposal.opportunity.id, session), null);
  const awardedUser = proposal?.createdBy && getValidValue(await db.readOneUser(connection, proposal.createdBy.id), null);
  if (proposal && opportunity && awardedUser) {
    await awardedSWUProposalSubmission(awardedUser, opportunity, proposal);

    // Notify the unsuccessful proponents
    const allOpportunityProposals = getValidValue(await db.readManySWUProposals(connection, session, opportunity.id), null);
    if (allOpportunityProposals) {
      for (const proposal of allOpportunityProposals.filter(p => p.id !== proposalId)) {
        const unsuccessfulProponent = proposal.createdBy && getValidValue(await db.readOneUser(connection, proposal.createdBy.id), null);
        if (unsuccessfulProponent) {
          await unsuccessfulSWUProposalSubmission(unsuccessfulProponent, opportunity, proposal);
        }
      }
    }
  }
}

export async function handleSWUProposalDisqualified(connection: db.Connection, proposalId: Id, session: AuthenticatedSession): Promise<void> {
  //Notify the disqualified proponent
  const proposal = getValidValue(await db.readOneSWUProposal(connection, proposalId, session), null);
  const opportunity = proposal && getValidValue(await db.readOneSWUOpportunity(connection, proposal.opportunity.id, session), null);
  const disqualifiedProponent = proposal?.createdBy && getValidValue(await db.readOneUser(connection, proposal.createdBy.id), null);
  if (proposal && opportunity && disqualifiedProponent) {
    await disqualifiedSWUProposalSubmission(disqualifiedProponent, opportunity, proposal);
  }
}

export async function handleSWUProposalWithdrawn(connection: db.Connection, proposalId: Id, session: AuthenticatedSession): Promise<void> {
  //Notify the opportunity author if the opportunity is in an awardable state
  const proposal = getValidValue(await db.readOneSWUProposal(connection, proposalId, session), null);
  const opportunity = proposal && getValidValue(await db.readOneSWUOpportunity(connection, proposal.opportunity.id, session), null);
  // Need to read opportunityAuthor separate here, as this session will not be allowed to read from opportunity itself
  const opportunityAuthor = proposal && getValidValue(await db.readOneSWUOpportunityAuthor(connection, proposal.opportunity.id), null);

  if (proposal && opportunity) {
    const withdrawnProponent = proposal.createdBy && getValidValue(await db.readOneUser(connection, proposal.createdBy.id), null);
    // Notify opportunity author if opportunity is closed
    if (opportunityAuthor && withdrawnProponent && isSWUOpportunityClosed(opportunity)) {
      await withdrawnSWUProposalSubmission(opportunityAuthor, withdrawnProponent, opportunity);
    }
    // Notify proposal author
    if (withdrawnProponent) {
      await withdrawnSWUProposalSubmissionProposalAuthor(withdrawnProponent, opportunity);
    }
  }
}

async function successfulSWUProposalSubmission(recipient: User, opportunity: SWUOpportunity, proposal: SWUProposal): Promise<void> {
  const title = 'Your Sprint With Us Opportunity Has Been Submitted';
  const description = 'You have successfully submitted a proposal for the following Digital Marketplace opportunity:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)],
      body: {
        title: 'What Happens Next?',
        content: [
          {
            prefix: 'If you would like to make changes to your proposal simply ',
            link: {
              text: 'sign in',
              url: templates.makeUrl('sign-in')
            },
            suffix: ' and access the proposal via your dashboard.  All changes must be submitted prior to the proposal deadline.'
          },
          { prefix: 'Once the proposal deadline has been reached, your proposal will be reviewed and assigned a score.  After all proposals have been evaluated, you will be notified if you will be proceeding to the next stage of the opportunity or if your proposal was unsuccessful.' },
          { prefix: 'Good luck!'}
        ]
      },
      callsToAction: [viewSWUOpportunityCallToAction(opportunity), viewSWUProposalCallToAction(proposal)]
    })
  });
}

async function awardedSWUProposalSubmission(recipient: User, opportunity: SWUOpportunity, proposal: SWUProposal | SWUProposalSlim): Promise<void> {
  const title = 'You Have Been Awarded a Sprint With Us Opportunity';
  const description = 'Congratulations!  You have been awarded the following Digital Marketplace opportunity:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)],
      body: {
        title: 'What Happens Next?',
        content: [
          {
            prefix: 'If you would like to view your scores for each stage of the opportunity, ',
            link: {
              text: 'sign in',
              url: templates.makeUrl('sign-in')
            },
            suffix: ' and access your proposal via your dashboard.'
          },
          {
            prefix: 'A member of the Digital Marketplace or the owner of the opportunity will be in touch with you shortly to discuss next steps.'
          }
        ]
      },
      callsToAction: [viewSWUOpportunityCallToAction(opportunity), viewSWUProposalCallToAction(proposal)]
    })
  });
}

async function unsuccessfulSWUProposalSubmission(recipient: User, opportunity: SWUOpportunity, proposal: SWUProposal | SWUProposalSlim): Promise<void> {
  const title = 'A Sprint With Us Opportunity Has Closed';
  const description = 'The following Digital Marketplace opportunity that you submitted a proposal to has closed:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)],
      body: {
        content: [
          { prefix: `The opportunity has been awarded to ${opportunity.successfulProponentName}`},
          {
            prefix: 'If you would like to view your scores for each stage of the opportunity, ',
            link: {
              text: 'sign in',
              url: templates.makeUrl('sign-in')
            },
            suffix: ' and access your proposal via your dashboard.'
          },
          {
            prefix: 'Thank you for your submission and we wish you luck on the next opportunity.'
          }
        ]
      },
      callsToAction: [viewSWUOpportunityCallToAction(opportunity), viewSWUProposalCallToAction(proposal)]
    })
  });
}

async function disqualifiedSWUProposalSubmission(recipient: User, opportunity: SWUOpportunity, proposal: SWUProposal | SWUProposalSlim): Promise<void> {
  const title = 'Your Sprint With Us Proposal Has Been Disqualified';
  const description = 'The proposal that you submitted for the following Digital Marketplace opportunity has been disqualified:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)],
      body: {
        content: [
          { prefix: `If you have any questions, please send an email to ${CONTACT_EMAIL}`}
        ]
      },
      callsToAction: [viewSWUOpportunityCallToAction(opportunity), viewSWUProposalCallToAction(proposal)]
    })
  });
}

async function withdrawnSWUProposalSubmissionProposalAuthor(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'Your Proposal Has Been Withdrawn';
  const description = 'Your proposal for the following Digital Marketplace opportunity has been withdrawn:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)],
      body: {
        content: [
          { prefix: 'If you would like to resubmit a proposal to the opportunity you may do so prior to the proposal deadline.' }
        ]
      },
      callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
    })
  });
}

async function withdrawnSWUProposalSubmission(recipient: User, withdrawnProponent: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'A Proposal Has Been Withdrawn';
  const description = `${withdrawnProponent.name} has withdrawn their proposal for the following Digital Marketplace opportunity:`;
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)],
      callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
    })
  });
}

export function viewSWUProposalCallToAction(proposal: SWUProposal | SWUProposalSlim): templates.LinkProps {
  return {
    text: 'View Proposal',
    url: templates.makeUrl(`sign-in?redirectOnSuccess=${encodeURIComponent(`/proposals/sprint-with-us/${proposal.id}`)}`)
  };
}
