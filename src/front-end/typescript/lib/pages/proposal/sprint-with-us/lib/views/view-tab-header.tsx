import { View } from 'front-end/lib/framework';
import { swuProposalStatusToColor, swuProposalStatusToTitleCase } from 'front-end/lib/pages/proposal/sprint-with-us/lib';
import Badge from 'front-end/lib/views/badge';
import DescriptionList from 'front-end/lib/views/description-list';
import Icon from 'front-end/lib/views/icon';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { doesOrganizationHaveAdminInfo, doesOrganizationMeetSWUQualification } from 'shared/lib/resources/organization';
import { getSWUProponentName, SWUProposal } from 'shared/lib/resources/proposal/sprint-with-us';
import { isAdmin, User } from 'shared/lib/resources/user';
import { adt } from 'shared/lib/types';

export interface Props {
  proposal: SWUProposal;
  viewerUser: User;
}

const ViewTabHeader: View<Props> = ({ proposal, viewerUser }) => {
  const createdBy = proposal.createdBy;
  const propStatus = proposal.status;
  const items = [
    {
      name: 'Status',
      children: (<Badge text={swuProposalStatusToTitleCase(propStatus, viewerUser.type)} color={swuProposalStatusToColor(propStatus, viewerUser.type)} />)
    },
    {
      name: 'Proponent',
      children: proposal.organization && proposal.organization.active && isAdmin(viewerUser)
        ? (<span>
            <Link dest={routeDest(adt('orgEdit', { orgId: proposal.organization.id }))}>{proposal.organization.legalName}</Link>
            &nbsp;
            ({proposal.anonymousProponentName})
          </span>)
        : getSWUProponentName(proposal)
    },
    proposal.organization && doesOrganizationHaveAdminInfo(proposal.organization)
      ? {
          name: 'Qualified Supplier',
          children: doesOrganizationMeetSWUQualification(proposal.organization)
            ? (<Icon name='check' color='success' />)
            : (<Icon name='times' color='danger' />)
        }
      : null,
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
          <h3 className='mb-5'>Sprint With Us: Vendor Proposal</h3>
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <DescriptionList items={items} />
        </Col>
      </Row>
    </div>
  );
};

export default ViewTabHeader;
