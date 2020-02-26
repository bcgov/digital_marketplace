import { View } from 'front-end/lib/framework';
import { cwuProposalStatusToColor, cwuProposalStatusToTitleCase } from 'front-end/lib/pages/proposal/code-with-us/lib';
import Badge from 'front-end/lib/views/badge';
import DateMetadata from 'front-end/lib/views/date-metadata';
import DescriptionList from 'front-end/lib/views/description-list';
import Link, { iconLinkSymbol, rightPlacement, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { CWUProposal } from 'shared/lib/resources/proposal/code-with-us';
import { User } from 'shared/lib/resources/user';
import { adt } from 'shared/lib/types';

export interface Props {
  proposal: CWUProposal;
  viewerUser: User;
}

const ViewTabHeader: View<Props> = ({ proposal, viewerUser }) => {
  const propStatus = proposal.status;
  const dates = [
    proposal.submittedAt
      ? ({
          tag: 'date' as const,
          date: proposal.submittedAt,
          label: 'Submitted'
        })
      : null,
    {
      tag: 'date' as const,
      date: proposal.updatedAt,
      label: 'Last updated'
    }
  ];
  const items = [
    {
      name: 'Status',
      children: (<Badge text={cwuProposalStatusToTitleCase(propStatus, viewerUser.type)} color={cwuProposalStatusToColor(propStatus, viewerUser.type)} />)
    }
  ];
  return (
    <div>
      <Row className='mb-5'>
        <Col xs='12'>
          <div className='mb-2 font-size-small font-weight-bold text-secondary text-uppercase'>Code With Us Opportunity</div>
          <h3 className='mb-2'>
            Proposal: <Link dest={routeDest(adt('opportunityCWUView', { opportunityId: proposal.opportunity.id }))}>{proposal.opportunity.title}</Link>
          </h3>
          <DateMetadata dates={dates} />
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <DescriptionList items={items} />
          <Link
            newTab
            color='info'
            className='mt-3'
            dest={routeDest(adt('proposalCWUExportOne', { opportunityId: proposal.opportunity.id, proposalId: proposal.id }))}
            symbol_={rightPlacement(iconLinkSymbol('file-export'))}>
            Export Proposal
          </Link>
        </Col>
      </Row>
    </div>
  );
};

export default ViewTabHeader;
