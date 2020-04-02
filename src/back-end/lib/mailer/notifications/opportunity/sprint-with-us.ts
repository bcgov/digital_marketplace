import * as templates from 'back-end/lib/mailer/templates';
import { send } from 'back-end/lib/mailer/transport';
import { formatAmount, formatDate } from 'shared/lib';
import { SWUOpportunity, SWUOpportunityStatus } from 'shared/lib/resources/opportunity/sprint-with-us';
import { User } from 'shared/lib/resources/user';
import { ADT } from 'shared/lib/types';

export type SWUEditsToNotifyOn
  = ADT<'status', SWUOpportunityStatus>
  | ADT<'deadline', Date>
  | ADT<'addendum', string>;

export async function newSWUOpportunityPublished(recipient: User, opportunity: SWUOpportunity): Promise<void> {
  const title = 'Digital Marketplace - A new Sprint With Us Opportunity has been published';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description: `Hi ${recipient.name}, a New Sprint With Us opportunity is available:`,
      descriptionLists: [makeSWUOpportunityInformation(opportunity)],
      callToAction: viewSWUOpportunityCallToAction(opportunity)
    })
  });
}

export async function updatedSWUOpportunity(recipient: User, opportunity: SWUOpportunity, edits: SWUEditsToNotifyOn): Promise<void> {
  const title = 'Digital Marketplace - An opportunity you are watching has been updated';
  const description = `Hi ${recipient.name}, a Sprint With Us opportunity you are watching has been updated:`;
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeSWUOpportunityEditsInformation(opportunity, edits)]
    })
  });
}

function makeSWUOpportunityInformation(opportunity: SWUOpportunity): templates.DescriptionListProps {
  const items = [
    { name: 'Title', value: opportunity.title },
    { name: 'Value', value: `$${formatAmount(opportunity.totalMaxBudget)}` },
    { name: 'Deadline to apply', value: formatDate(opportunity.proposalDeadline) }
  ];
  return {
    title: 'Opportunity',
    items
  };
}

function makeSWUOpportunityEditsInformation(opportunity: SWUOpportunity, edits: SWUEditsToNotifyOn): templates.DescriptionListProps {
  const items = [
    { name: 'Title', value: opportunity.title }
  ];

  switch (edits.tag) {
    case 'status':
      items.push({
        name: 'Status Changed',
        value: `Status changed to ${edits.value}`
      });
      break;
    case 'deadline':
      items.push({
        name: 'Deadline Changed',
        value: `Deadline to submit proposals changed to ${formatDate(edits.value)}`
      });
      break;
    case 'addendum':
      items.push({
        name: 'Addendum Added',
        value: edits.value
      });
  }

  return {
    title: 'Update',
    items
  };
}

function viewSWUOpportunityCallToAction(opportunity: SWUOpportunity): templates.LinkProps {
  return {
    text: 'View Sprint With Us Details',
    url: templates.makeUrl(`opportunities/sprint-with-us/${opportunity.id}`)
  };
}
