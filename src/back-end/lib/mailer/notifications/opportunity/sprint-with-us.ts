import * as templates from 'back-end/lib/mailer/templates';
import { send } from 'back-end/lib/mailer/transport';
import { formatAmount, formatDate } from 'shared/lib';
import { SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { User } from 'shared/lib/resources/user';

export async function newCWUOpportunityPublished(recipient: User, opportunity: SWUOpportunity): Promise<void> {
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

function viewSWUOpportunityCallToAction(opportunity: SWUOpportunity): templates.LinkProps {
  return {
    text: 'View Sprint With Us Details',
    url: templates.makeUrl(`opportunities/sprint-with-us/${opportunity.id}`)
  };
}
