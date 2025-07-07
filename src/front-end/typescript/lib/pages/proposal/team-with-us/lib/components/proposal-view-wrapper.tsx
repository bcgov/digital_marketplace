import { component as component_ } from "front-end/lib/framework";
import { Col, Row } from "reactstrap";
import { User } from "shared/lib/resources/user";
import { TWUProposal } from "shared/lib/resources/proposal/team-with-us";
import EditTabHeader from "front-end/lib/pages/proposal/team-with-us/lib/views/edit-tab-header";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { formatDateAtTime } from "shared/lib";

interface Props {
  proposal: TWUProposal;
  viewerUser: User;
  children?: React.ReactNode;
}

const Reporting: component_.base.View<{ proposal: TWUProposal }> = ({
  proposal
}) => {
  // const numTeamMembers = twuProposalNumTeamMembers(proposal);
  // const totalProposedCost = twuProposalTotalProposedCost(proposal);
  const reportCards: Array<ReportCard | null> = [
    {
      icon: "alarm-clock",
      name: "Proposals Deadline",
      value: formatDateAtTime(proposal.opportunity.proposalDeadline, true)
    }
    // {
    //   icon: "users",
    //   name: `Team Member${numTeamMembers === 1 ? "" : "s"}`,
    //   value: String(numTeamMembers)
    // },
    // {
    //   icon: "badge-dollar",
    //   name: "Proposed Cost",
    //   value: formatAmount(totalProposedCost, "$")
    // }
  ];
  return (
    <Row className="mt-5">
      <Col xs="12">
        <ReportCardList reportCards={reportCards} />
      </Col>
    </Row>
  );
};

const ProposalViewWrapper: component_.base.View<Props> = (props) => {
  const { proposal, viewerUser } = props;

  return (
    <div>
      <EditTabHeader proposal={proposal} viewerUser={viewerUser} />
      <Reporting proposal={proposal} />
      <Row className="mt-5">
        <Col xs="12">{props.children}</Col>
      </Row>
    </div>
  );
};

export default ProposalViewWrapper;
