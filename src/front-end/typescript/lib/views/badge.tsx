import { View } from 'front-end/typescript/lib/framework';
import { cwuOpportunityToPublicColor, cwuOpportunityToPublicStatus } from 'front-end/typescript/lib/pages/opportunity/code-with-us/lib';
import { swuOpportunityToPublicColor, swuOpportunityToPublicStatus } from 'front-end/typescript/lib/pages/opportunity/sprint-with-us/lib';
import { ThemeColor } from 'front-end/typescript/lib/types';
import React from 'react';
import * as reactstrap from 'reactstrap';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { User } from 'shared/lib/resources/user';
import { ADT } from 'shared/lib/types';

export interface Props {
  text: string;
  color: ThemeColor;
  className?: string;
  pill?: boolean;
}

const Badge: View<Props> = ({ text, color, className = '', pill }) => {
  className = `${className} text-capitalize text-nowrap`;
  return (
    <reactstrap.Badge color={color} className={className} pill={pill}>
      {text}
    </reactstrap.Badge>
  );
};

export default Badge;

type Opportunity
  = ADT<'cwu', Pick<CWUOpportunity, 'status' | 'createdBy' | 'proposalDeadline'>>
  | ADT<'swu', Pick<SWUOpportunity, 'status' | 'createdBy' | 'proposalDeadline'>>;

interface OpportunityBadgeProps {
  opportunity: Opportunity;
  viewerUser?: User;
  className?: string;
}

export const OpportunityBadge: View<OpportunityBadgeProps> = ({ opportunity, viewerUser, className }) => {
  switch (opportunity.tag) {
    case 'cwu':
      return (<Badge
        className={className}
        text={cwuOpportunityToPublicStatus(opportunity.value, viewerUser)}
        color={cwuOpportunityToPublicColor(opportunity.value, viewerUser)} />);
    case 'swu':
      return (<Badge
        className={className}
        text={swuOpportunityToPublicStatus(opportunity.value, viewerUser)}
        color={swuOpportunityToPublicColor(opportunity.value, viewerUser)} />);
  }
};
