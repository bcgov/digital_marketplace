import { component as component_ } from "front-end/lib/framework";
import { Col, Row } from "reactstrap";
import EditTabHeader from "front-end/lib/pages/proposal/sprint-with-us/lib/views/edit-tab-header";
import {
  Reporting,
  State,
  Msg
} from "front-end/lib/pages/proposal/sprint-with-us/edit/tab/proposal";
import React from "react";

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  children?: React.ReactNode;
}

const ProposalViewWrapper: component_.base.View<Props> = (props) => {
  const { state } = props;

  if (!state.proposal) {
    return null;
  }

  return (
    <div>
      <EditTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      <Reporting {...props} />
      <Row className="mt-5">
        <Col xs="12">{props.children}</Col>
      </Row>
    </div>
  );
};

export default ProposalViewWrapper;
