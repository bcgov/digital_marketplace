import { CONTACT_EMAIL } from 'back-end/config';
import * as db from 'back-end/lib/db';
import { makeCWUOpportunityInformation, viewCWUOpportunityCallToAction } from 'back-end/lib/mailer/notifications/opportunity/code-with-us';
import * as templates from 'back-end/lib/mailer/templates';
import { send } from 'back-end/lib/mailer/transport';
import { canCWUOpportunityBeAwarded, CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { CWUProposal, CWUProposalSlim } from 'shared/lib/resources/proposal/code-with-us';
import { AuthenticatedSession } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { getValidValue } from 'shared/lib/validation';

export async function handleCWUProposalSubmitted(connection: db.Connection, proposalId: Id, session: AuthenticatedSession): Promise<void> {
  // Notify the submitting user
  const proposal = getValidValue(await db.readOneCWUProposal(connection, proposalId, session), null);
  const opportunity = proposal && getValidValue(await db.readOneCWUOpportunity(connection, proposal.opportunity.id, session), null);
  if (proposal && opportunity) {
    await successfulCWUProposalSubmission(session.user, opportunity, proposal);
  }
}

export async function handleCWUProposalAwarded(connection: db.Connection, proposalId: Id, session: AuthenticatedSession): Promise<void> {
  // Notify the awarded proponent
  const proposal = getValidValue(await db.readOneCWUProposal(connection, proposalId, session), null);
  const opportunity = proposal && getValidValue(await db.readOneCWUOpportunity(connection, proposal.opportunity.id, session), null);
  const awardedUser = proposal && getValidValue(await db.readOneUser(connection, proposal.createdBy.id), null);
  if (proposal && opportunity && awardedUser) {
    await awardedCWUProposalSubmission(awardedUser, opportunity, proposal);

    // Notify the unsuccessful proponents
    const allOpportunityProposals = getValidValue(await db.readManyCWUProposals(connection, session, opportunity.id), null);
    if (allOpportunityProposals) {
      for (const proposal of allOpportunityProposals.filter(p => p.id !== proposalId)) {
        const unsuccessfulProponent = getValidValue(await db.readOneUser(connection, proposal.createdBy.id), null);
        if (unsuccessfulProponent) {
          await unsuccessfulCWUProposalSubmission(unsuccessfulProponent, opportunity, proposal);
        }
      }
    }
  }
}

export async function handleCWUProposalDisqualified(connection: db.Connection, proposalId: Id, session: AuthenticatedSession): Promise<void> {
  //Notify the disqualified proponent
  const proposal = getValidValue(await db.readOneCWUProposal(connection, proposalId, session), null);
  const opportunity = proposal && getValidValue(await db.readOneCWUOpportunity(connection, proposal.opportunity.id, session), null);
  const disqualifiedProponent = proposal && getValidValue(await db.readOneUser(connection, proposal.createdBy.id), null);
  if (proposal && opportunity && disqualifiedProponent) {
    await disqualifiedCWUProposalSubmission(disqualifiedProponent, opportunity, proposal);
  }
}

export async function handleCWUProposalWithdrawn(connection: db.Connection, proposalId: Id, session: AuthenticatedSession): Promise<void> {
  //Notify the opportunity author if the opportunity is in an awardable state
  const proposal = getValidValue(await db.readOneCWUProposal(connection, proposalId, session), null);
  const opportunity = proposal && getValidValue(await db.readOneCWUOpportunity(connection, proposal.opportunity.id, session), null);
  if (proposal && opportunity && canCWUOpportunityBeAwarded(opportunity)) {
    const withdrawnProponent = proposal && getValidValue(await db.readOneUser(connection, proposal.createdBy.id), null);
    if (withdrawnProponent) {
      await withdrawnCWUProposalSubmission(session.user, withdrawnProponent, opportunity);
    }
  }
}

async function successfulCWUProposalSubmission(recipient: User, opportunity: CWUOpportunity, proposal: CWUProposal): Promise<void> {
  const title = 'Your Code With Us Opportunity Has Been Submitted';
  const description = 'You have successfully submitted a proposal for the following Digital Marketplace opportunity:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeCWUOpportunityInformation(opportunity)],
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
      callsToAction: [viewCWUOpportunityCallToAction(opportunity), viewCWUProposalCallToAction(proposal)]
    })
  });
}

async function awardedCWUProposalSubmission(recipient: User, opportunity: CWUOpportunity, proposal: CWUProposal | CWUProposalSlim): Promise<void> {
  const title = 'You Have Been Awarded a Code With Us Opportunity';
  const description = 'Congratulations!  You have been awarded the following Digital Marketplace opportunity:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeCWUOpportunityInformation(opportunity)],
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
      callsToAction: [viewCWUOpportunityCallToAction(opportunity), viewCWUProposalCallToAction(proposal)]
    })
  });
}

async function unsuccessfulCWUProposalSubmission(recipient: User, opportunity: CWUOpportunity, proposal: CWUProposal | CWUProposalSlim): Promise<void> {
  const title = 'A Code With Us Opportunity Has Closed';
  const description = 'The following Digital Marketplace opportunity that you submitted a proposal to has closed:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeCWUOpportunityInformation(opportunity)],
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
            prefix: 'Thank you for submission and we wish you luck on the next opportunity.'
          }
        ]
      },
      callsToAction: [viewCWUOpportunityCallToAction(opportunity), viewCWUProposalCallToAction(proposal)]
    })
  });
}

async function disqualifiedCWUProposalSubmission(recipient: User, opportunity: CWUOpportunity, proposal: CWUProposal | CWUProposalSlim): Promise<void> {
  const title = 'Your Code With Us Proposal Has Been Disqualified';
  const description = 'The proposal that you submitted for the following Digital Marketplace opportunity has been disqualified:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeCWUOpportunityInformation(opportunity)],
      body: {
        content: [
          { prefix: `If you have any questions, please send an email to ${CONTACT_EMAIL}`}
        ]
      },
      callsToAction: [viewCWUOpportunityCallToAction(opportunity), viewCWUProposalCallToAction(proposal)]
    })
  });
}

async function withdrawnCWUProposalSubmission(recipient: User, withdrawnProponent: User, opportunity: CWUOpportunity): Promise<void> {
  const title = 'A Proposal Has Been Withdrawn';
  const description = `${withdrawnProponent.name} has withdrawn their proposal for the following Digital Marketplace opportunity:`;
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeCWUOpportunityInformation(opportunity)],
      callsToAction: [viewCWUOpportunityCallToAction(opportunity)]
    })
  });
}

export function viewCWUProposalCallToAction(proposal: CWUProposal | CWUProposalSlim): templates.LinkProps {
  return {
    text: 'View Proposal',
    url: templates.makeUrl(`sign-in?redirectOnSuccess=${encodeURIComponent(`/proposals/code-with-us/${proposal.id}`)}`)
  };
}
