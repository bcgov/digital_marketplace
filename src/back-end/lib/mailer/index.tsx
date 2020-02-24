import * as templates from 'back-end/lib/mailer/templates';
import { send } from 'back-end/lib/mailer/transport';
import { formatAmount, formatDate } from 'shared/lib';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { User } from 'shared/lib/resources/user';

export async function newCWUOpportunityPublished(recipient: User, opportunity: CWUOpportunity): Promise<void> {
  const title = 'Digital Marketplace - A new Code With Us Opportunity has been published!';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description: `Hi ${recipient.name}, a New Code With Us Opportunity is available:`,
      descriptionLists: [makeCWUOpportunityInformation(opportunity)],
      callToAction: viewCWUOpportunityCallToAction(opportunity)
    })
  });
}

function makeCWUOpportunityInformation(opportunity: CWUOpportunity): templates.DescriptionListProps {
  const items = [
    { name: 'Title', value: opportunity.title },
    { name: 'Value', value: formatAmount(opportunity.reward) },
    { name: 'Deadline to apply', value: formatDate(opportunity.proposalDeadline) }
  ];
  return {
    title: 'Opportunity',
    items
  };
}

function viewCWUOpportunityCallToAction(opportunity: CWUOpportunity): templates.LinkProps {
  return {
    text: 'View Code With Us Details',
    url: templates.makeUrl(`opportunities/code-with-us/${opportunity.id}`)
  };
}
