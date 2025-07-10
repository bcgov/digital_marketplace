import { EMPTY_STRING } from "front-end/config";
import { Route } from "front-end/lib/app/types";
import EditTabHeader from "front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header";
import DescriptionList from "front-end/lib/views/description-list";
import Link, { emailDest, routeDest } from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import Skills from "front-end/lib/views/skills";
import React from "react";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import { Col, Row } from "reactstrap";
import { formatAmount, formatDate } from "shared/lib";
import { NUM_SCORE_DECIMALS } from "shared/lib/resources/proposal/code-with-us";
import { isAdmin, User } from "shared/lib/resources/user";
import { adt } from "shared/lib/types";
import { component as component_ } from "front-end/lib/framework";

export interface Props {
  opportunity: CWUOpportunity;
  viewerUser: User;
}

const SuccessfulProponent: component_.base.View<Props> = ({
  opportunity,
  viewerUser
}) => {
  if (!opportunity) return null;
  const { successfulProponent } = opportunity;
  if (!successfulProponent?.score) {
    return null;
  }
  const isViewerAdmin = isAdmin(viewerUser);
  const items = [
    {
      name: "Awarded Proponent",
      children: (() => {
        if (isViewerAdmin) {
          const nameRoute: Route = (() => {
            switch (successfulProponent.id.tag) {
              case "individual":
                return adt("userProfile", {
                  userId: successfulProponent.id.value
                }) as Route;
              case "organization":
                return adt("orgEdit", {
                  orgId: successfulProponent.id.value
                }) as Route;
            }
          })();
          const email = (() => {
            if (successfulProponent.email) {
              return (
                <span>
                  (
                  <Link dest={emailDest([successfulProponent.email])}>
                    {successfulProponent.email}
                  </Link>
                  )
                </span>
              );
            } else {
              return null;
            }
          })();
          return (
            <div>
              <Link newTab dest={routeDest(nameRoute)}>
                {successfulProponent.name}
              </Link>{" "}
              {email}
            </div>
          );
        } else {
          return successfulProponent.name;
        }
      })()
    },
    {
      name: "Submitted By",
      children: (() => {
        if (!successfulProponent.createdBy) {
          return null;
        }
        if (isViewerAdmin) {
          return (
            <Link
              newTab
              dest={routeDest(
                adt("userProfile", { userId: successfulProponent.createdBy.id })
              )}>
              {successfulProponent.createdBy.name}
            </Link>
          );
        } else {
          return successfulProponent.createdBy.name;
        }
      })()
    }
  ];
  return (
    <div className="mt-5 pt-5 border-top">
      <Row>
        <Col xs="12">
          <h4 className="mb-4">Successful Proponent</h4>
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="4" className="mb-4 mb-md-0 d-flex d-md-block">
          <ReportCard
            icon="star-full"
            iconColor="c-report-card-icon-highlight"
            name="Winning Score"
            value={`${
              successfulProponent.score
                ? `${successfulProponent.score.toFixed(NUM_SCORE_DECIMALS)}%`
                : EMPTY_STRING
            }`}
          />
        </Col>
        <Col xs="12" md="8" className="d-flex align-items-center flex-nowrap">
          <DescriptionList items={items} />
        </Col>
      </Row>
    </div>
  );
};

const Details: component_.base.View<Props> = ({ opportunity }) => {
  if (!opportunity) return null;
  const skills = opportunity.skills;
  const items = [
    {
      name: "Assignment Date",
      children: formatDate(opportunity.assignmentDate)
    },
    {
      name: "Start Date",
      children: formatDate(opportunity.startDate)
    }
  ];
  const reportCards: ReportCard[] = [
    {
      icon: "alarm-clock",
      name: "Proposals Deadline",
      value: formatDate(opportunity.proposalDeadline)
    },
    {
      icon: "badge-dollar",
      name: "Value",
      value: formatAmount(opportunity.reward, "$")
    },
    {
      icon: "map-marker",
      name: "Location",
      value: opportunity.location
    }
  ];
  return (
    <div className="mt-5 pt-5 border-top">
      <Row>
        <Col xs="12">
          <h4 className="mb-4">Details</h4>
        </Col>
      </Row>
      <Row className="mb-5">
        <Col xs="12">
          <ReportCardList reportCards={reportCards} />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="6">
          <DescriptionList items={items} />
        </Col>
        <Col xs="12" md="6">
          <div className="font-weight-bold mb-2 mt-3 mt-md-0">
            Required Skills
          </div>
          <Skills skills={skills} />
        </Col>
      </Row>
    </div>
  );
};

const SummaryView: component_.base.View<Props> = (props) => {
  const { opportunity, viewerUser } = props;
  if (!opportunity) return null;
  return (
    <div>
      <EditTabHeader opportunity={opportunity} viewerUser={viewerUser} />
      <SuccessfulProponent {...props} />
      <Details {...props} />
    </div>
  );
};

export default SummaryView;
