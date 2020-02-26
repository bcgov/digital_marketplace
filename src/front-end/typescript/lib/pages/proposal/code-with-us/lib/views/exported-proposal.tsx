import { View } from 'front-end/lib/framework';
import DescriptionList from 'front-end/lib/views/description-list';
import Link, { externalDest, iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import Markdown from 'front-end/lib/views/markdown';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatDateAndTime } from 'shared/lib';
import { fileBlobPath } from 'shared/lib/resources/file';
import { CWUProposal, getCWUProponentName, getCWUProponentTypeTitleCase } from 'shared/lib/resources/proposal/code-with-us';
import { User } from 'shared/lib/resources/user';

export interface Props {
  className?: string;
  showOpportunityInformation?: boolean;
  exportedBy?: User;
  exportedAt?: Date;
  proposal: CWUProposal;
}

export const ExportedPropsal: View<Props> = ({ proposal, showOpportunityInformation, exportedBy, exportedAt, className }) => {
  return (
    <div className={className}>
      <Row>
        <Col xs='12'>
          <h3 className='mb-4'>Vendor Proposal</h3>
          <DescriptionList
            items={[
              { name: 'ID', children: proposal.id },
              showOpportunityInformation ? { name: 'Opportunity', children: proposal.opportunity.title } : null,
              showOpportunityInformation ? { name: 'Opportunity Type', children: 'Code With Us' } : null,
              { name: 'Proponent', children: getCWUProponentName(proposal) },
              { name: 'Proponent Type', children: getCWUProponentTypeTitleCase(proposal) },
              { name: 'Vendor', children: proposal.createdBy.name },
              proposal.score ? { name: 'Score', children: `${proposal.score}%` } : null,
              exportedBy ? { name: 'Exported By', children: exportedBy.name } : null,
              exportedAt ? { name: 'Exported On', children: formatDateAndTime(exportedAt) } : null
            ]}
          />
        </Col>
      </Row>
      <Row className='mt-5'>
        <Col xs='12'>
          <h5 className='mb-4'>Proposal:</h5>
          <div><Markdown source={proposal.proposalText} openLinksInNewTabs /></div>
        </Col>
      </Row>
      {proposal.additionalComments
        ? (<Row className='mt-5'>
            <Col xs='12'>
              <h5 className='mb-4'>Additional Comments:</h5>
              <div><Markdown source={proposal.proposalText} openLinksInNewTabs /></div>
            </Col>
          </Row>)
        : null}
        {proposal.attachments.length
          ? (<Row className='mt-5'>
              <Col xs='12'>
                <h5 className='mb-4'>Attachments:</h5>
                {proposal.attachments.map((a, i) => (
                  <Link
                    key={`cwu-proposal-export-attachment-${i}`}
                    className={i < proposal.attachments.length - 1 ? 'mb-3' : ''}
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

export default ExportedPropsal;
