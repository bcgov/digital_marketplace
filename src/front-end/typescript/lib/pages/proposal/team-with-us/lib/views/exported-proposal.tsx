import { EMPTY_STRING } from "front-end/config";
import { fileBlobPath } from "front-end/lib";
import { component } from "front-end/lib/framework";
import {
  twuProposalStatusToColor,
  twuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/team-with-us/lib";
import Badge from "front-end/lib/views/badge";
import DescriptionList from "front-end/lib/views/description-list";
import Link, {
  externalDest,
  iconLinkSymbol,
  leftPlacement
} from "front-end/lib/views/link";
import { ProposalMarkdown } from "front-end/lib/views/markdown";
import Separator from "front-end/lib/views/separator";
import React from "react";
import { Alert, Col, Row } from "reactstrap";
import { countWords, formatDateAndTime } from "shared/lib";
import {
  getQuestionByOrder,
  TWUOpportunity
} from "shared/lib/resources/opportunity/team-with-us";
import {
  TWUProposal,
  TWUProposalResourceQuestionResponse
} from "shared/lib/resources/proposal/team-with-us";
import { User, UserType } from "shared/lib/resources/user";

export interface Props {
  className?: string;
  showOpportunityInformation?: boolean;
  exportedBy?: User;
  exportedAt?: Date;
  proposal: TWUProposal;
  opportunity: TWUOpportunity;
  anonymous: boolean;
}

interface ResourceQuestionResponseViewProps {
  opportunity: TWUOpportunity;
  response: TWUProposalResourceQuestionResponse;
  index: number;
  className?: string;
}

const ResourceQuestionResponseView: component.base.View<
  ResourceQuestionResponseViewProps
> = ({ opportunity, response, index, className }) => {
  const question = getQuestionByOrder(opportunity, response.order);
  if (!question) {
    return null;
  }
  return (
    <div className={className}>
      <h5 className="mb-3">Question {index + 1}</h5>
      <p style={{ whiteSpace: "pre-line" }}>{question.question}</p>
      <div className="mb-3 small text-secondary d-flex flex-column flex-sm-row flex-nowrap">
        <div className="mb-2 mb-sm-0">
          {countWords(response.response)} / {question.wordLimit} word
          {question.wordLimit === 1 ? "" : "s"}
        </div>
        <Separator spacing="2" color="secondary" className="d-none d-sm-block">
          |
        </Separator>
        <div>
          {response.score === undefined || response.score === null
            ? `Unscored (${question.score} point${
                question.score === 1 ? "" : "s"
              } available)`
            : `${response.score} / ${question.score} point${
                question.score === 1 ? "" : "s"
              }`}
        </div>
      </div>
      <Alert color="primary" fade={false} className="mb-4">
        <div style={{ whiteSpace: "pre-line" }}>{question.guideline}</div>
      </Alert>
      <ProposalMarkdown box source={response.response || EMPTY_STRING} />
    </div>
  );
};

export const ExportedProposal: component.base.View<Props> = ({
  opportunity,
  proposal,
  showOpportunityInformation,
  exportedBy,
  exportedAt,
  className,
  anonymous
}) => {
  return (
    <div className={className}>
      <Row>
        <Col xs="12">
          <h3 className="mb-4">
            {anonymous
              ? "Anonymized Proposal Resource Questions"
              : "Team With Us Proposal"}
          </h3>
          <DescriptionList
            items={[
              { name: "ID", children: proposal.id },
              showOpportunityInformation
                ? { name: "Opportunity", children: proposal.opportunity.title }
                : null,
              showOpportunityInformation
                ? { name: "Opportunity Type", children: "Team With Us" }
                : null,
              {
                name: "Proponent",
                children: anonymous
                  ? proposal.anonymousProponentName
                  : proposal.organization?.legalName || ""
              },
              !anonymous
                ? {
                    name: "Proposal Status",
                    children: (
                      <Badge
                        text={twuProposalStatusToTitleCase(
                          proposal.status,
                          exportedBy?.type || UserType.Vendor
                        )}
                        color={twuProposalStatusToColor(
                          proposal.status,
                          exportedBy?.type || UserType.Vendor
                        )}
                      />
                    )
                  }
                : null,
              showOpportunityInformation && exportedBy
                ? { name: "Exported By", children: exportedBy.name }
                : null,
              showOpportunityInformation && exportedAt
                ? {
                    name: "Exported On",
                    children: formatDateAndTime(exportedAt)
                  }
                : null
            ]}
          />
        </Col>
      </Row>
      {!anonymous ? (
        <Row>
          <Col xs="12">
            <h5 className="mt-5 mb-4">Scores</h5>
            <DescriptionList
              items={[
                {
                  name: "Proposal Resource Questions",
                  children: proposal.questionsScore
                    ? `${proposal.questionsScore.toFixed(2)} %`
                    : "-"
                },
                {
                  name: "Code Challenge",
                  children: proposal.challengeScore
                    ? `${proposal.challengeScore.toFixed(2)} %`
                    : "-"
                },
                {
                  name: "Price",
                  children: proposal.priceScore
                    ? `${proposal.priceScore.toFixed(2)} %`
                    : "-"
                },
                {
                  name: "Total Score",
                  children: proposal.totalScore
                    ? `${proposal.totalScore.toFixed(2)} %`
                    : "-"
                }
              ]}
            />
          </Col>
        </Row>
      ) : null}
      <Row>
        <Col xs="12">
          <div>
            {proposal.resourceQuestionResponses.map((r, i) => {
              return (
                <ResourceQuestionResponseView
                  className="mt-5"
                  opportunity={opportunity}
                  response={r}
                  index={i}
                  key={`twu-proposal-export-resource-question-${i}`}
                />
              );
            })}
          </div>
        </Col>
      </Row>
      {!anonymous && proposal.attachments?.length ? (
        <Row className="mt-5">
          <Col xs="12">
            <h5 className="mb-4">Attachments:</h5>
            {proposal.attachments.map((a, i) => (
              <Link
                key={`twu-proposal-export-attachment-${i}`}
                className={
                  proposal.attachments && i < proposal.attachments.length - 1
                    ? "mb-3"
                    : ""
                }
                download
                symbol_={leftPlacement(iconLinkSymbol("paperclip"))}
                dest={externalDest(fileBlobPath(a))}>
                {a.name}
              </Link>
            ))}
          </Col>
        </Row>
      ) : null}
    </div>
  );
};

export default ExportedProposal;
