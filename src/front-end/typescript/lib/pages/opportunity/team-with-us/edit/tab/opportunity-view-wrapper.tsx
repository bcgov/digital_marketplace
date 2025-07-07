/**
 * opportunity-view-wrapper.tsx
 *
 * OpportunityViewWrapper is a wrapper that includes the EditTabHeader, Reporting and <Row>-><Col>->Children components.
 * It is used to wrap the children components of the OpportunityView. Used for regular as well as read-only views.
 *
 * Props:
 * - opportunity (TWUOpportunity): The opportunity to display.
 * - viewerUser (User): The user viewing the opportunity.
 * - children (React.ReactNode): The children to display.
 *
 * Example:
 * <OpportunityViewWrapper opportunity={opportunity} viewerUser={viewerUser}>
 *   <div>Hello, world!</div>
 * </OpportunityViewWrapper>
 */
import { component as component_ } from "front-end/lib/framework";
import { Col, Row } from "reactstrap";
import { User } from "shared/lib/resources/user";
import {
  TWUOpportunity,
  TWUOpportunityStatus
} from "shared/lib/resources/opportunity/team-with-us";
import EditTabHeader from "front-end/lib/pages/opportunity/team-with-us/lib/views/edit-tab-header";
import React from "react";
import { ReportCardList } from "front-end/lib/views/report-card-list";
import { ReportCard } from "front-end/lib/views/report-card-list";
import { formatAmount, formatDate } from "shared/lib";

interface Props {
  opportunity: TWUOpportunity;
  viewerUser: User;
  children: React.ReactNode;
}

const Reporting: component_.base.View<Props> = ({ opportunity }) => {
  if (!opportunity || opportunity.status === TWUOpportunityStatus.Draft) {
    return null;
  }
  const reporting = opportunity.reporting;
  const reportCards: ReportCard[] = [
    {
      icon: "alarm-clock",
      name: "Proposals Deadline",
      value: formatDate(opportunity.proposalDeadline)
    },
    {
      icon: "binoculars",
      name: "Total Views",
      value: formatAmount(reporting?.numViews || 0)
    },
    {
      icon: "eye",
      name: "Watching",
      value: formatAmount(reporting?.numWatchers || 0)
    }
  ];
  return (
    <Row className="mt-5">
      <Col xs="12">
        <ReportCardList reportCards={reportCards} />
      </Col>
    </Row>
  );
};

const OpportunityViewWrapper: component_.base.View<Props> = ({
  opportunity,
  viewerUser,
  children
}) => {
  return (
    <div>
      <EditTabHeader opportunity={opportunity} viewerUser={viewerUser} />
      <Reporting
        opportunity={opportunity}
        viewerUser={viewerUser}
        children={children}
      />
      <Row className="mt-5">
        <Col xs="12">{children}</Col>
      </Row>
    </div>
  );
};

export default OpportunityViewWrapper;
