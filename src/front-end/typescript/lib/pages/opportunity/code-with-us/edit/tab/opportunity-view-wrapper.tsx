import { component as component_ } from "front-end/lib/framework";
import { Col, Row } from "reactstrap";
import { User } from "shared/lib/resources/user";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import EditTabHeader from "front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header";
import {
  Reporting,
  State,
  Msg
} from "front-end/lib/pages/opportunity/code-with-us/edit/tab/opportunity";
import React from "react";

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  opportunity: CWUOpportunity;
  viewerUser: User;
  children?: React.ReactNode;
}

const OpportunityViewWrapper: component_.base.View<Props> = (props) => {
  const { state, dispatch, opportunity, viewerUser, children } = props;
  return (
    <div>
      <EditTabHeader opportunity={opportunity} viewerUser={viewerUser} />
      <Reporting state={state} dispatch={dispatch} />
      <Row className="mt-5">
        <Col xs="12">{children}</Col>
      </Row>
    </div>
  );
};

export default OpportunityViewWrapper;
