import { View } from 'front-end/lib/framework';
import { cwuProposalStatusToColor, cwuProposalStatusToTitleCase } from 'front-end/lib/pages/proposal/code-with-us/lib';
import Badge from 'front-end/lib/views/badge';
import DescriptionList from 'front-end/lib/views/description-list';
import Link, { iconLinkSymbol, rightPlacement, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { CWUProposal, getCWUProponentName, getCWUProponentTypeTitleCase } from 'shared/lib/resources/proposal/code-with-us';
import { isAdmin, User } from 'shared/lib/resources/user';
import { adt } from 'shared/lib/types';

export interface Props {
  proposal: CWUProposal;
  viewerUser: User;
}

const ViewTabHeader: View<Props> = ({ proposal, viewerUser }) => {
  const createdBy = proposal.createdBy;
  const propStatus = proposal.status;
  const items = [
    {
      name: 'Status',
      children: (<Badge text={cwuProposalStatusToTitleCase(propStatus, viewerUser.type)} color={cwuProposalStatusToColor(propStatus, viewerUser.type)} />)
    },
    {
      name: 'Proponent',
      children: (() => {
        const name = getCWUProponentName(proposal);
        if (proposal.proponent.tag === 'organization' && proposal.proponent.value.active && isAdmin(viewerUser)) {
          return (<Link dest={routeDest(adt('orgEdit', { orgId: proposal.proponent.value.id }))}>{name}</Link>);
        }
        return name;
      })()
    },
    { name: 'Proponent Type', children: getCWUProponentTypeTitleCase(proposal) },
    createdBy
      ? {
          name: 'Submitted By',
          children: isAdmin(viewerUser)
            ? (<Link color='primary' dest={routeDest(adt('userProfile', { userId: createdBy.id }))}>{createdBy.name}</Link>)
            : createdBy.name
        }
      : null
  ];
  return (
    <div>
      <Row>
        <Col xs='12'>
          <h3 className='mb-5'>Code With Us: Vendor Proposal</h3>
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
