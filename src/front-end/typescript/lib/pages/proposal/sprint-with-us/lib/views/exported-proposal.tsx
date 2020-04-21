import { EMPTY_STRING } from 'front-end/config';
import { View } from 'front-end/lib/framework';
import DescriptionList from 'front-end/lib/views/description-list';
import Markdown from 'front-end/lib/views/markdown';
import Separator from 'front-end/lib/views/separator';
import React from 'react';
import { Alert, Col, Row } from 'reactstrap';
import { countWords, formatDateAndTime } from 'shared/lib';
import { getQuestionByOrder, SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { SWUProposal, SWUProposalTeamQuestionResponse } from 'shared/lib/resources/proposal/sprint-with-us';
import { User } from 'shared/lib/resources/user';

export interface Props {
  className?: string;
  showOpportunityInformation?: boolean;
  exportedBy?: User;
  exportedAt?: Date;
  proposal: SWUProposal;
  opportunity: SWUOpportunity;
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
      <p>{question.question}</p>
      <div className='mb-3 small text-secondary d-flex flex-row flex-nowrap'>
        {countWords(response.response)} / {question.wordLimit} word{question.wordLimit === 1 ? '' : 's'}
        <Separator spacing='2' color='secondary' className='d-none d-md-block'>|</Separator>
        {response.score === undefined || response.score === null
          ? `Unscored (${question.score} point${question.score === 1 ? '' : 's'} available)`
          : `${response.score} / ${question.score} point${question.score === 1 ? '' : 's'}`}
      </div>
      <Alert color='primary' fade={false} className='mb-4'>
        {question.guideline}
      </Alert>
      <Markdown
        box
        source={response.response || EMPTY_STRING} />
    </div>
  );
};

export const ExportedPropsal: View<Props> = ({ opportunity, proposal, showOpportunityInformation, exportedBy, exportedAt, className }) => {
  return (
    <div className={className}>
      <Row>
        <Col xs='12'>
          <h3 className='mb-4'>Anonymized Proponent Team Questions</h3>
          <DescriptionList
            items={[
              { name: 'ID', children: proposal.id },
              showOpportunityInformation ? { name: 'Opportunity', children: proposal.opportunity.title } : null,
              showOpportunityInformation ? { name: 'Opportunity Type', children: 'Sprint With Us' } : null,
              { name: 'Proponent', children: proposal.anonymousProponentName },
              exportedBy ? { name: 'Exported By', children: exportedBy.name } : null,
              exportedAt ? { name: 'Exported On', children: formatDateAndTime(exportedAt) } : null
            ]}
          />
        </Col>
      </Row>
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
    </div>
  );
};

export default ExportedPropsal;
