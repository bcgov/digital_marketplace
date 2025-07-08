import { component as component_, immutable } from "front-end/lib/framework";
import { Col, Row } from "reactstrap";
import { User } from "shared/lib/resources/user";
import { CWUProposal } from "shared/lib/resources/proposal/code-with-us";
import EditTabHeader from "front-end/lib/pages/proposal/code-with-us/lib/views/edit-tab-header";
import { Reporting } from "front-end/lib/pages/proposal/code-with-us/edit/tab/proposal";
import React from "react";

interface Props {
  proposal: CWUProposal;
  viewerUser: User;
  children?: React.ReactNode;
}

const ProposalViewWrapper: component_.base.View<Props> = (props) => {
  const { proposal, viewerUser } = props;

  return (
    <div>
      <EditTabHeader proposal={proposal} viewerUser={viewerUser} />
      <Reporting state={immutable({ proposal }) as any} dispatch={() => {}} />
      <Row className="mt-5">
        <Col xs="12">{props.children}</Col>
      </Row>
    </div>
  );
};

export default ProposalViewWrapper;
