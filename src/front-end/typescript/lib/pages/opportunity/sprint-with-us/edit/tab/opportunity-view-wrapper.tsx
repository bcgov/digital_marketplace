/**
 * opportunity-view-wrapper.tsx
 *
 * OpportunityViewWrapper is a wrapper that includes the EditTabHeader, Reporting and <Row>-><Col>->Children components.
 * It is used to wrap the children components of the OpportunityView. Used for regular as well as read-only views.
 *
 * Props:
 * - opportunity (SWUOpportunity): The opportunity to display.
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
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import EditTabHeader from "front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header";
import { Reporting } from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/opportunity";
import React from "react";

interface Props {
  opportunity: SWUOpportunity;
  viewerUser: User;
  children?: React.ReactNode;
}

const OpportunityViewWrapper: component_.base.View<Props> = (props) => {
  const opportunity = props.opportunity;
  const viewerUser = props.viewerUser;
  return (
    <div>
      <EditTabHeader opportunity={opportunity} viewerUser={viewerUser} />
      <Reporting
        state={immutable({ opportunity }) as any}
        dispatch={() => {}}
      />
      <Row className="mt-5">
        <Col xs="12">{props.children}</Col>
      </Row>
    </div>
  );
};

export default OpportunityViewWrapper;
