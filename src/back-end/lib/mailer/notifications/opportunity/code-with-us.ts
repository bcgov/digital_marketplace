import * as templates from 'back-end/lib/mailer/templates';
import { send } from 'back-end/lib/mailer/transport';
import { formatAmount, formatDate } from 'shared/lib';
import { CWUOpportunity, CWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';
import { User } from 'shared/lib/resources/user';
import { ADT } from 'shared/lib/types';

export type CWUEditsToNotifyOn
  = ADT<'status', CWUOpportunityStatus>
  | ADT<'deadline', Date>
  | ADT<'addendum', string>;

export async function newCWUOpportunityPublished(recipient: User, opportunity: CWUOpportunity): Promise<void> {
  const title = 'Digital Marketplace - A new Code With Us Opportunity has been published';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description: `Hi ${recipient.name}, a New Code With Us opportunity is available:`,
      descriptionLists: [makeCWUOpportunityInformation(opportunity)],
      callToAction: viewCWUOpportunityCallToAction(opportunity)
    })
  });
}

export async function updatedCWUOpportunity(recipient: User, opportunity: CWUOpportunity, edits: CWUEditsToNotifyOn): Promise<void> {
  const title = 'Digital Marketplace - An opportunity you are watching has been updated';
  const description = `Hi ${recipient.name}, a Code With Us opportunity you are watching has been updated:`;
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      descriptionLists: [makeCWUOpportunityEditsInformation(opportunity, edits)]
    })
  });
}

function makeCWUOpportunityInformation(opportunity: CWUOpportunity): templates.DescriptionListProps {
  const items = [
    { name: 'Title', value: opportunity.title },
    { name: 'Value', value: `$${formatAmount(opportunity.reward)}` },
    { name: 'Deadline to apply', value: formatDate(opportunity.proposalDeadline) }
  ];
  return {
    title: 'Opportunity',
    items
  };
}

function makeCWUOpportunityEditsInformation(opportunity: CWUOpportunity, edits: CWUEditsToNotifyOn): templates.DescriptionListProps {
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

function viewCWUOpportunityCallToAction(opportunity: CWUOpportunity): templates.LinkProps {
  return {
    text: 'View Code With Us Details',
    url: templates.makeUrl(`opportunities/code-with-us/${opportunity.id}`)
  };
}
