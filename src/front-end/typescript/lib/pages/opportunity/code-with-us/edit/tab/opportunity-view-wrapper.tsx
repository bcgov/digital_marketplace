import { component as component_ } from "front-end/lib/framework";
import { Col, Row } from "reactstrap";
import { User } from "shared/lib/resources/user";
import {
  CWUOpportunity,
  CWUOpportunityStatus
} from "shared/lib/resources/opportunity/code-with-us";
import EditTabHeader from "front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header";
import React from "react";
import { ReportCardList } from "front-end/lib/views/report-card-list";
import { ReportCard } from "front-end/lib/views/report-card-list";
import { formatAmount } from "shared/lib";

interface Props {
  opportunity: CWUOpportunity;
  viewerUser: User;
  children?: React.ReactNode;
}

interface ReportingProps {
  opportunity: CWUOpportunity;
}

const Reporting: component_.base.View<ReportingProps> = ({ opportunity }) => {
  if (!opportunity || opportunity.status === CWUOpportunityStatus.Draft) {
    return null;
  }
  const reporting = opportunity.reporting;
  const reportCards: ReportCard[] = [
    {
      icon: "binoculars",
      name: "Total Views",
      value: formatAmount(reporting?.numViews || 0)
    },
    {
      icon: "eye",
      name: "Watching",
      value: formatAmount(reporting?.numWatchers || 0)
    },
    {
      icon: "comment-dollar",
      name: `Proposal${reporting?.numProposals === 1 ? "" : "s"}`,
      value: formatAmount(reporting?.numProposals || 0)
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

const OpportunityViewWrapper: component_.base.View<Props> = (props) => {
  const opportunity = props.opportunity;
  const viewerUser = props.viewerUser;
  return (
    <div>
      <EditTabHeader opportunity={opportunity} viewerUser={viewerUser} />
      <Reporting opportunity={opportunity} />
      <Row className="mt-5">
        <Col xs="12">{props.children}</Col>
      </Row>
    </div>
  );
};

export default OpportunityViewWrapper;
