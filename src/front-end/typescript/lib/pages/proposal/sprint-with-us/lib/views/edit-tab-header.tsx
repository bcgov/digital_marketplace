import { component } from "front-end/lib/framework";
import {
  swuProposalStatusToColor,
  swuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/sprint-with-us/lib";
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
import { SWUProposal } from "shared/lib/resources/proposal/sprint-with-us";
import { User } from "shared/lib/resources/user";
import { adt } from "shared/lib/types";
import {
  swuOpportunityToPublicColor,
  swuOpportunityToPublicStatus
} from "front-end/lib/pages/opportunity/sprint-with-us/lib";

export interface Props {
  proposal: SWUProposal;
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
          text={swuOpportunityToPublicStatus(proposal.opportunity, viewerUser)}
          color={swuOpportunityToPublicColor(proposal.opportunity, viewerUser)}
        />
      )
    },
    {
      name: "Proposal Status",
      children: (
        <Badge
          text={swuProposalStatusToTitleCase(propStatus, viewerUser.type)}
          color={swuProposalStatusToColor(propStatus, viewerUser.type)}
        />
      )
    },
    {
      name: "Organization",
      children: (() => {
        if (proposal.organization) {
          if (proposal.organization.active) {
            return (
              <Link
                dest={routeDest(
                  adt("orgEdit", { orgId: proposal.organization.id })
                )}>
                {proposal.organization.legalName}
              </Link>
            );
          } else {
            return proposal.organization.legalName;
          }
        } else {
          return proposal.anonymousProponentName;
        }
      })()
    }
  ];
  return (
    <div>
      <Row className="mb-5">
        <Col xs="12">
          <h3 className="mb-2">
            Sprint With Us:&nbsp;
            <Link
              newTab
              dest={routeDest(
                adt("opportunitySWUView", {
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
              adt("proposalSWUExportOne", {
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
