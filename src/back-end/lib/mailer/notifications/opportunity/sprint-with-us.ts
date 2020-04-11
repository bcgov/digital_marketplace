import { CONTACT_EMAIL } from 'back-end/config';
import * as db from 'back-end/lib/db';
import * as templates from 'back-end/lib/mailer/templates';
import { send } from 'back-end/lib/mailer/transport';
import { unionBy } from 'lodash';
import { formatAmount, formatDate, formatTime } from 'shared/lib';
import { SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { User, UserType } from 'shared/lib/resources/user';
import { getValidValue } from 'shared/lib/validation';

export async function handleSWUSubmittedForReview(connection: db.Connection, opportunity: SWUOpportunity): Promise<void> {
  // Notify all admin users of the submitted SWU
  const adminUsers = getValidValue(await db.readManyUsersByRole(connection, UserType.Admin), null) || [];
  await Promise.all(adminUsers.map(async admin => await newSWUOpportunitySubmittedForReview(admin, opportunity)));

  // Notify the authoring gov user of the submission
  const author = opportunity.createdBy && getValidValue(await db.readOneUser(connection, opportunity.createdBy.id), null);
  if (author) {
    await newSWUOpportunitySubmittedForReviewAuthor(author, opportunity);
  }
}

export async function handleSWUPublished(connection: db.Connection, opportunity: SWUOpportunity): Promise<void> {
  // Notify all users with notifications on
  const subscribedUsers = getValidValue(await db.readManyUsersNotificationsOn(connection), null) || [];
  await Promise.all(subscribedUsers.map(async user => await newSWUOpportunityPublished(user, opportunity)));

  // Notify authoring gov user of successful publish
  const author = opportunity?.createdBy && getValidValue(await db.readOneUser(connection, opportunity.createdBy.id), null);
  if (author) {
    await successfulSWUPublication(author, opportunity);
  }
}

export async function handleSWUUpdated(connection: db.Connection, opportunity: SWUOpportunity): Promise<void> {
  // Notify all subscribed users on this opportunity, as well as users with proposals (we union so we don't notify anyone twice)
  const subscribedUsers = getValidValue(await db.readManySWUSubscribedUsers(connection, opportunity.id), null) || [];
  const usersWithProposals = getValidValue(await db.readManyCWUProposalAuthors(connection, opportunity.id), null) || [];
  const unionedUsers = unionBy(subscribedUsers, usersWithProposals, 'id');
  await Promise.all(unionedUsers.map(async user => await updatedSWUOpportunity(user, opportunity)));
}

export async function handleSWUCancelled(connection: db.Connection, opportunity: SWUOpportunity): Promise<void> {
  // Notify all subscribed users on this opportunity, as well as users with proposals (we union so we don't notify anyone twice)
  const subscribedUsers = getValidValue(await db.readManySWUSubscribedUsers(connection, opportunity.id), null) || [];
  const usersWithProposals = getValidValue(await db.readManySWUProposalAuthors(connection, opportunity.id), null) || [];
  const unionedUsers = unionBy(subscribedUsers, usersWithProposals, 'id');
  await Promise.all(unionedUsers.map(async user => await cancelledSWUOpportunitySubscribed(user, opportunity)));

  // Notify authoring gov user of cancellation
  const author = opportunity.createdBy && getValidValue(await db.readOneUser(connection, opportunity.createdBy.id), null);
  if (author) {
    await cancelledSWUOpportunityActioned(author, opportunity);
  }
}

export async function handleSWUSuspended(connection: db.Connection, opportunity: SWUOpportunity): Promise<void> {
  // Notify all subscribed users on this opportunity, as well as users with proposals (we union so we don't notify anyone twice)
  const subscribedUsers = getValidValue(await db.readManySWUSubscribedUsers(connection, opportunity.id), null) || [];
  const usersWithProposals = getValidValue(await db.readManySWUProposalAuthors(connection, opportunity.id), null) || [];
  const unionedUsers = unionBy(subscribedUsers, usersWithProposals, 'id');
  await Promise.all(unionedUsers.map(async user => await suspendedSWUOpportunitySubscribed(user, opportunity)));

  // Notify authoring gov user of suspension
  const author = opportunity.createdBy && getValidValue(await db.readOneUser(connection, opportunity.createdBy.id), null);
  if (author) {
    await suspendedSWUOpportunityActioned(author, opportunity);
  }
}

export async function handleSWUReadyForEvaluation(connection: db.Connection, opportunity: SWUOpportunity): Promise<void> {
  // Notify gov user that the opportunity is ready
  const author = opportunity.createdBy && getValidValue(await db.readOneUser(connection, opportunity.createdBy.id), null) || null;
  if (author) {
    await readyForEvalSWUOpportunity(author, opportunity);
  }
}

async function newSWUOpportunityPublished(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'A New Sprint With Us Opportunity Has Been Posted';
  const description = 'A new opportunity has been posted to the Digital Marketplace:';
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

async function updatedSWUOpportunity(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'A Sprint With Us Opportunity Has Been Updated';
  const description = 'The following Digital Marketplace opportunity has been updated:';
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

async function newSWUOpportunitySubmittedForReview(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'A Sprint With Us Opportunity Has Been Submitted For Review'; // Used for subject line and heading
  const description = 'The following Digital Marketplace opportunity has been submitted for review:';
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
            prefix: 'You can review and publish this opportunity by ',
            link: {
              text: 'signing in',
              url: templates.makeUrl('sign-in')
            },
            suffix: ' and accessing the opportunity from the opportunity list.'
          },
          { prefix: 'You can also edit the opportunity prior to publishing.  The opportunity author will be notified when you publish, and the opportunity will made visible to the public.' }
        ]
      },
      callsToAction: [viewSWUOpportunityCallToAction(opportunity, true)]
    })
  });
}

async function newSWUOpportunitySubmittedForReviewAuthor(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'Your Sprint With Us Opportunity Has Been Submitted For Review'; // Used for subject line and heading
  const description = 'You have submitted the following Digital Marketplace opportunity for review:';
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
          { prefix: 'An administrator will review your opportunity.  You will be notified once the opportunity has been posted.' },
          { prefix: `If you have any questions, please send an email to ${CONTACT_EMAIL}.`}
        ]
      },
      callsToAction: [viewSWUOpportunityCallToAction(opportunity, true)]
    })
  });
}

async function successfulSWUPublication(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'Your Sprint With Us Opportunity Has Been Posted'; // Used for subject line and heading
  const description = 'You have successfully posted the following Digital Marketplace opportunity';
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
          { prefix: 'Sit back and relax as Vendors submit proposals to your opportunity. You will not be able to view these proposals until the opportunity has reached its closing date and time.' },
          { prefix: 'Once the opportunity has closed, you will be notified that the proposal submissions are ready for your review.' },
          {
            prefix: 'If you would like to make a change to your opportunity, such as adding an addendum, simply ',
            link: {
              text: 'sign-in',
              url: templates.makeUrl('sign-in')
            },
            suffix: ' and access the opportunity via your dashboard.'
          }
        ]
      },
      callsToAction: [viewSWUOpportunityCallToAction(opportunity, true)]
    })
  });
}

async function cancelledSWUOpportunitySubscribed(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'A Sprint With Us Opportunity Has Been Cancelled';
  const description = 'The following Digital Marketplace opportunity has been cancelled:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)],
      body: {
        content: [
          { prefix: `If you have any questions, please send an email to ${CONTACT_EMAIL}.`}
        ]
      }
    })
  });
}

async function cancelledSWUOpportunityActioned(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'A Sprint With Us Opportunity Has Been Cancelled';
  const description = 'You have cancelled the following opportunity on the Digital Marketplace:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)]
    })
  });
}

async function suspendedSWUOpportunitySubscribed(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'A Sprint With Us Opportunity Has Been Suspended';
  const description = 'The following Digital Marketplace opportunity has been suspended:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)],
      body: {
        content: [
          { prefix: 'If you have already submitted a proposal to this opportunity, you may make changes to it while the opportunity is suspended.'},
          { prefix: `If you have any questions, please send an email to ${CONTACT_EMAIL}.`}
        ]
      }
    })
  });
}

async function suspendedSWUOpportunityActioned(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'A Sprint With Us Opportunity Has Been Suspended';
  const description = 'You have suspended the following opportunity on the Digital Marketplace:';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)]
    })
  });
}

async function readyForEvalSWUOpportunity(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'Your Sprint With Us Opportunity is Ready to Be Evaluated';
  const description = 'Your Digital Marketplace opportunity has reached its proposal deadline.';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)],
      body: {
        content: [
          { prefix: 'You may now view proposals submitted by vendors and assign scores to each submission.  Please note that each vendor with a submitted proposal will remain anonymous until the next phase of the opportunity has begun.' }
        ]
      },
      callsToAction: [viewSWUOpportunityCallToAction(opportunity, true)]
    })
  });
}

export function makeSWUOpportunityInformation(opportunity: SWUOpportunity): templates.DescriptionListProps {
  const items = [
    { name: 'Type', value: 'Sprint With Us' },
    { name: 'Value', value: `$${formatAmount(opportunity.totalMaxBudget)}` },
    { name: 'Location', value: opportunity.location },
    { name: 'Remote OK?', value: opportunity.remoteOk ? 'Yes' : 'No' },
    { name: 'Proposals Due', value: `${formatDate(opportunity.proposalDeadline, false)} at ${formatTime(opportunity.proposalDeadline, true)}` }
  ];
  return {
    title: opportunity.title,
    items
  };
}

export function viewSWUOpportunityCallToAction(opportunity: SWUOpportunity, authenticatedView = false): templates.LinkProps {
  return {
    text: 'View Opportunity',
    url: authenticatedView ? templates.makeUrl(`sign-in?redirectOnSuccess=${encodeURIComponent(`/opportunities/sprint-with-us/${opportunity.id}`)}`) : templates.makeUrl(`opportunities/sprint-with-us/${opportunity.id}`)
  };
}
