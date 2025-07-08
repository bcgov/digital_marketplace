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
import { component as component_, immutable } from "front-end/lib/framework";
import { Col, Row } from "reactstrap";
import { User } from "shared/lib/resources/user";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import EditTabHeader from "front-end/lib/pages/opportunity/team-with-us/lib/views/edit-tab-header";
import { Reporting } from "front-end/lib/pages/opportunity/team-with-us/edit/tab/opportunity";
import React from "react";

interface Props {
  opportunity: TWUOpportunity;
  viewerUser: User;
  children: React.ReactNode;
}

const OpportunityViewWrapper: component_.base.View<Props> = ({
  opportunity,
  viewerUser,
  children
}) => {
  return (
    <div>
      <EditTabHeader opportunity={opportunity} viewerUser={viewerUser} />
      <Reporting
        state={immutable({ opportunity }) as any}
        dispatch={() => {}}
      />
      <Row className="mt-5">
        <Col xs="12">{children}</Col>
      </Row>
    </div>
  );
};

export default OpportunityViewWrapper;
