import { component } from "front-end/lib/framework";
import {
  twuProposalStatusToColor,
  twuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/team-with-us/lib";
import Badge from "front-end/lib/views/badge";
import DescriptionList from "front-end/lib/views/description-list";
import Icon from "front-end/lib/views/icon";
import Link, { routeDest } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  doesOrganizationHaveAdminInfo
  // doesOrganizationMeetTWUQualification
} from "shared/lib/resources/organization";
import {
  getTWUProponentName,
  TWUProposal
} from "shared/lib/resources/proposal/team-with-us";
import { isAdmin, User } from "shared/lib/resources/user";
import { adt } from "shared/lib/types";

export interface Props {
  proposal: TWUProposal;
  viewerUser: User;
}

const ViewTabHeader: component.base.View<Props> = ({
  proposal,
  viewerUser
}) => {
  const createdBy = proposal.createdBy;
  const propStatus = proposal.status;
  const items = [
    {
      name: "Status",
      children: (
        <Badge
          text={twuProposalStatusToTitleCase(propStatus, viewerUser.type)}
          color={twuProposalStatusToColor(propStatus, viewerUser.type)}
        />
      )
    },
    {
      name: "Proponent",
      children:
        proposal.organization &&
        proposal.organization.active &&
        isAdmin(viewerUser) ? (
          <span>
            <Link
              dest={routeDest(
                adt("orgEdit", { orgId: proposal.organization.id })
              )}>
              {proposal.organization.legalName}
            </Link>
            &nbsp; ({proposal.anonymousProponentName})
          </span>
        ) : (
          getTWUProponentName(proposal)
        )
    },
    proposal.organization &&
    doesOrganizationHaveAdminInfo(proposal.organization)
      ? {
          // TODO - uncomment here when TWU qualified works
          name: "Qualified Supplier",
          children: <Icon name="check" color="success" />
          //   doesOrganizationMeetTWUQualification(
          //   proposal.organization
          // ) ? (
          //   <Icon name="check" color="success" />
          // ) : (
          //   <Icon name="times" color="danger" />
          // )
        }
      : null,
    createdBy
      ? {
          name: "Submitted By",
          children: isAdmin(viewerUser) ? (
            <Link
              dest={routeDest(adt("userProfile", { userId: createdBy.id }))}>
              {createdBy.name}
            </Link>
          ) : (
            createdBy.name
          )
        }
      : null
  ];
  return (
    <div>
      <Row>
        <Col xs="12">
          <h3 className="mb-5">Team With Us: Vendor Proposal</h3>
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <DescriptionList items={items} />
        </Col>
      </Row>
    </div>
  );
};

export default ViewTabHeader;
