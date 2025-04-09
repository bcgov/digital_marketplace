import { component } from "front-end/lib/framework";
import {
  cwuProposalStatusToColor,
  cwuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/code-with-us/lib";
import Badge from "front-end/lib/views/badge";
import DateMetadata from "front-end/lib/views/date-metadata";
import DescriptionList from "front-end/lib/views/description-list";
import Link, {
  iconLinkSymbol,
  rightPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { CWUProposal } from "shared/lib/resources/proposal/code-with-us";
import { User } from "shared/lib/resources/user";
import { adt } from "shared/lib/types";
import {
  cwuOpportunityToPublicColor,
  cwuOpportunityToPublicStatus
} from "front-end/lib/pages/opportunity/code-with-us/lib";

export interface Props {
  proposal: CWUProposal;
  viewerUser: User;
}

const ViewTabHeader: component.base.View<Props> = ({
  proposal,
  viewerUser
}) => {
  const propStatus = proposal.status;
  const dates = [
    proposal.submittedAt
      ? {
          tag: "date" as const,
          date: proposal.submittedAt,
          label: "Submitted"
        }
      : null,
    {
      tag: "date" as const,
      date: proposal.updatedAt,
      label: "Updated"
    }
  ];
  const items = [
    {
      name: "Opportunity Status",
      children: (
        <Badge
          text={cwuOpportunityToPublicStatus(proposal.opportunity, viewerUser)}
          color={cwuOpportunityToPublicColor(proposal.opportunity, viewerUser)}
        />
      )
    },
    {
      name: "Proposal Status",
      children: (
        <Badge
          text={cwuProposalStatusToTitleCase(propStatus, viewerUser.type)}
          color={cwuProposalStatusToColor(propStatus, viewerUser.type)}
        />
      )
    }
  ];
  return (
    <div>
      <Row className="mb-5">
        <Col xs="12">
          <h3 className="mb-2">
            Code With Us:&nbsp;
            <Link
              newTab
              dest={routeDest(
                adt("opportunityCWUView", {
                  opportunityId: proposal.opportunity.id
                })
              )}>
              {proposal.opportunity.title}
            </Link>
          </h3>
          <DateMetadata dates={dates} />
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <DescriptionList items={items} />
          <Link
            newTab
            color="info"
            className="mt-3"
            dest={routeDest(
              adt("proposalCWUExportOne", {
                opportunityId: proposal.opportunity.id,
                proposalId: proposal.id
              })
            )}
            symbol_={rightPlacement(iconLinkSymbol("file-export"))}>
            Export Proposal
          </Link>
        </Col>
      </Row>
    </div>
  );
};

export default ViewTabHeader;
