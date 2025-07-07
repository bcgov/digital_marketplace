import { component as component_ } from "front-end/lib/framework";
import { Col, Row } from "reactstrap";
import { User } from "shared/lib/resources/user";
import { CWUProposal } from "shared/lib/resources/proposal/code-with-us";
import EditTabHeader from "front-end/lib/pages/proposal/code-with-us/lib/views/edit-tab-header";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { formatAmount, formatDateAtTime } from "shared/lib";
import { EMPTY_STRING } from "front-end/config";
import { CWUProposalStatus } from "shared/lib/resources/proposal/code-with-us";

interface Props {
  proposal: CWUProposal;
  viewerUser: User;
  children?: React.ReactNode;
}

interface ReportingProps {
  proposal: CWUProposal;
}

const Reporting: component_.base.View<ReportingProps> = ({ proposal }) => {
  if (!proposal) return null;
  const showScoreAndRanking =
    proposal.status === CWUProposalStatus.Awarded ||
    proposal.status === CWUProposalStatus.NotAwarded;
  const reportCards: Array<ReportCard | null> = [
    {
      icon: "alarm-clock",
      name: "Proposals Deadline",
      value: formatDateAtTime(proposal.opportunity.proposalDeadline, true)
    },
    showScoreAndRanking
      ? {
          icon: "star-full",
          iconColor: "c-report-card-icon-highlight",
          name: "Total Score",
          value: proposal.score ? `${proposal.score}%` : EMPTY_STRING
        }
      : null,
    showScoreAndRanking
      ? {
          icon: "trophy",
          iconColor: "c-report-card-icon-highlight",
          name: "Ranking",
          value: proposal.rank
            ? formatAmount(proposal.rank, undefined, true)
            : EMPTY_STRING
        }
      : null
  ].filter(Boolean) as ReportCard[];

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
