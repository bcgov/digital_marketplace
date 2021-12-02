import { EMPTY_STRING } from 'front-end/typescript/config';
import { fileBlobPath } from 'front-end/typescript/lib';
import { View } from 'front-end/typescript/lib/framework';
import { swuProposalStatusToColor, swuProposalStatusToTitleCase } from 'front-end/typescript/lib/pages/proposal/sprint-with-us/lib';
import Badge from 'front-end/typescript/lib/views/badge';
import DescriptionList from 'front-end/typescript/lib/views/description-list';
import Link, { externalDest, iconLinkSymbol, leftPlacement } from 'front-end/typescript/lib/views/link';
import { ProposalMarkdown } from 'front-end/typescript/lib/views/markdown';
import Separator from 'front-end/typescript/lib/views/separator';
import React from 'react';
import { Alert, Col, Row } from 'reactstrap';
import { countWords, formatDateAndTime } from 'shared/lib';
import { getQuestionByOrder, SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { SWUProposal, SWUProposalTeamQuestionResponse } from 'shared/lib/resources/proposal/sprint-with-us';
import { User, UserType } from 'shared/lib/resources/user';

export interface Props {
  className?: string;
  showOpportunityInformation?: boolean;
  exportedBy?: User;
  exportedAt?: Date;
  proposal: SWUProposal;
  opportunity: SWUOpportunity;
  anonymous: boolean;
}

interface TeamQuestionResponseViewProps {
  opportunity: SWUOpportunity;
  response: SWUProposalTeamQuestionResponse;
  index: number;
  className?: string;
}

const TeamQuestionResponseView: View<TeamQuestionResponseViewProps> = ({ opportunity, response, index, className }) => {
  const question = getQuestionByOrder(opportunity, response.order);
  if (!question) { return null; }
  return (
    <div className={className}>
      <h5 className='mb-3'>Question {index + 1}</h5>
      <p style={{ whiteSpace: 'pre-line' }}>{question.question}</p>
      <div className='mb-3 small text-secondary d-flex flex-column flex-sm-row flex-nowrap'>
        <div className='mb-2 mb-sm-0'>{countWords(response.response)} / {question.wordLimit} word{question.wordLimit === 1 ? '' : 's'}</div>
        <Separator spacing='2' color='secondary' className='d-none d-sm-block'>|</Separator>
        <div>
          {response.score === undefined || response.score === null
            ? `Unscored (${question.score} point${question.score === 1 ? '' : 's'} available)`
            : `${response.score} / ${question.score} point${question.score === 1 ? '' : 's'}`}
        </div>
      </div>
      <Alert color='primary' fade={false} className='mb-4'>
        <div style={{ whiteSpace: 'pre-line' }}>
          {question.guideline}
        </div>
      </Alert>
      <ProposalMarkdown
        box
        source={response.response || EMPTY_STRING} />
    </div>
  );
};

export const ExportedProposal: View<Props> = ({ opportunity, proposal, showOpportunityInformation, exportedBy, exportedAt, className, anonymous }) => {
  return (
    <div className={className}>
      <Row>
        <Col xs='12'>
          <h3 className='mb-4'>{anonymous ? 'Anonymized Proponent Team Questions' : 'Sprint With Us Proposal'}</h3>
          <DescriptionList
            items={[
              { name: 'ID', children: proposal.id },
              showOpportunityInformation ? { name: 'Opportunity', children: proposal.opportunity.title } : null,
              showOpportunityInformation ? { name: 'Opportunity Type', children: 'Sprint With Us' } : null,
              { name: 'Proponent', children: anonymous ? proposal.anonymousProponentName : (proposal.organization?.legalName || '') },
              !anonymous ? {
                name: 'Proposal Status',
                children: (<Badge text={swuProposalStatusToTitleCase(proposal.status, exportedBy?.type || UserType.Vendor)} color={swuProposalStatusToColor(proposal.status, exportedBy?.type || UserType.Vendor)} />)
              } : null,
              showOpportunityInformation && exportedBy ? { name: 'Exported By', children: exportedBy.name } : null,
              showOpportunityInformation && exportedAt ? { name: 'Exported On', children: formatDateAndTime(exportedAt) } : null
            ]}
          />
        </Col>
      </Row>
      { !anonymous ?
        <Row>
          <Col xs='12'>
            <h5 className='mt-5 mb-4'>Scores</h5>
            <DescriptionList
              items={[
                { name: 'Team Questions', children: (proposal.questionsScore ? `${proposal.questionsScore.toFixed(2)} %` : '-') },
                { name: 'Code Challenge', children: (proposal.challengeScore ? `${proposal.challengeScore.toFixed(2)} %` : '-') },
                { name: 'Team Scenario', children: (proposal.scenarioScore ? `${proposal.scenarioScore.toFixed(2)} %` : '-') },
                { name: 'Price', children: (proposal.priceScore ? `${proposal.priceScore.toFixed(2)} %` : '-') },
                { name: 'Total Score', children: (proposal.totalScore ? `${proposal.totalScore.toFixed(2)} %` : '-' ) }
              ]}
            />
          </Col>
        </Row> : null }
      <Row>
        <Col xs='12'>
          <div>
            {proposal.teamQuestionResponses.map((r, i) => {
              return (
                <TeamQuestionResponseView
                  className='mt-5'
                  opportunity={opportunity}
                  response={r}
                  index={i}
                  key={`swu-proposal-export-team-question-${i}`} />
              );
            })}
          </div>
        </Col>
      </Row>
      {!anonymous && proposal.attachments?.length ?
        (<Row className='mt-5'>
            <Col xs='12'>
              <h5 className='mb-4'>Attachments:</h5>
              {proposal.attachments.map((a, i) => (
                <Link
                  key={`swu-proposal-export-attachment-${i}`}
                  className={i < proposal.attachments!.length - 1 ? 'mb-3' : ''}
                  download
                  symbol_={leftPlacement(iconLinkSymbol('paperclip'))}
                  dest={externalDest(fileBlobPath(a))}>
                  {a.name}
                </Link>
              ))}
            </Col>
          </Row>)
        : null}
    </div>
  );
};

export default ExportedProposal;
