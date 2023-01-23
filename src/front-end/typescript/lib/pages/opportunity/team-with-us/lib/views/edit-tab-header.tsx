import { component } from "front-end/lib/framework";
import {
  twuOpportunityStatusToColor,
  twuOpportunityStatusToTitleCase
} from "front-end/lib/pages/opportunity/team-with-us/lib";
import Badge from "front-end/lib/views/badge";
import DateMetadata from "front-end/lib/views/date-metadata";
import DescriptionList from "front-end/lib/views/description-list";
import Link, { routeDest } from "front-end/lib/views/link";
import { compact } from "lodash";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  // DEFAULT_OPPORTUNITY_TITLE,
  TWUOpportunity
} from "shared/lib/resources/opportunity/team-with-us";
import { isAdmin, User } from "shared/lib/resources/user";
import { adt } from "shared/lib/types";

export interface Props {
  opportunity: TWUOpportunity;
  viewerUser: User;
}

const EditTabHeader: component.base.View<Props> = ({
  opportunity,
  viewerUser
}) => {
  const createdBy = opportunity.createdBy;
  const oppStatus = opportunity.status;
  const dates = [
    opportunity.publishedAt
      ? {
          tag: "date" as const,
          date: opportunity.publishedAt,
          label: "Published"
        }
      : null,
    {
      tag: "date" as const,
      date: opportunity.updatedAt,
      label: "Updated"
    }
  ];
  const items = [
    {
      name: "Status",
      children: (
        <Badge
          text={twuOpportunityStatusToTitleCase(oppStatus)}
          color={twuOpportunityStatusToColor(oppStatus)}
        />
      )
    },
    createdBy
      ? {
          name: "Created By",
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
      <Row className="mb-5">
        <Col xs="12">
          <h3 className="mb-2">
            Sprint With Us:&nbsp;
            {/* <Link
              newTab
              dest={routeDest(
                adt("opportunitySWUView", { opportunityId: opportunity.id })
              )}>
              {opportunity.title || DEFAULT_OPPORTUNITY_TITLE}
            </Link> */}
          </h3>
          <DateMetadata dates={compact(dates)} />
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <DescriptionList items={compact(items)} />
        </Col>
      </Row>
    </div>
  );
};

export default EditTabHeader;
