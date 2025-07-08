import { component as component_, immutable } from "front-end/lib/framework";
import { Col, Row } from "reactstrap";
import { User } from "shared/lib/resources/user";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import EditTabHeader from "front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header";
import { Reporting } from "front-end/lib/pages/opportunity/code-with-us/edit/tab/opportunity";
import React from "react";

interface Props {
  opportunity: CWUOpportunity;
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
