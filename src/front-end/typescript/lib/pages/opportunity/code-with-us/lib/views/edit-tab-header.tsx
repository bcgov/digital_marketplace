import { View } from 'front-end/lib/framework';
import { cwuOpportunityStatusToColor, cwuOpportunityStatusToTitleCase } from 'front-end/lib/pages/opportunity/code-with-us/lib';
import Badge from 'front-end/lib/views/badge';
import DateMetadata from 'front-end/lib/views/date-metadata';
import DescriptionList from 'front-end/lib/views/description-list';
import Link, { iconLinkSymbol, rightPlacement, routeDest } from 'front-end/lib/views/link';
import { compact } from 'lodash';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { CWUOpportunity, DEFAULT_OPPORTUNITY_TITLE, hasCWUOpportunityBeenPublished } from 'shared/lib/resources/opportunity/code-with-us';
import { adt } from 'shared/lib/types';

export interface Props {
  opportunity: CWUOpportunity;
}

const EditTabHeader: View<Props> = ({ opportunity }) => {
  const createdBy = opportunity.createdBy;
  const oppStatus = opportunity.status;
  const hasBeenPublished = hasCWUOpportunityBeenPublished(opportunity);
  const dates = [
    hasBeenPublished
      ? {
          tag: 'date' as const,
          date: opportunity.createdAt,
          label: 'Published'
        }
      : null,
    {
      tag: 'date' as const,
      date: opportunity.updatedAt,
      label: 'Last updated'
    }
  ];
  const items = [
    {
      name: 'Status',
      children: (<Badge text={cwuOpportunityStatusToTitleCase(oppStatus)} color={cwuOpportunityStatusToColor(oppStatus)} />)
    },
    createdBy
      ? {
          name: 'Created By',
          children: (<Link color='primary' dest={routeDest(adt('userProfile', { userId: createdBy.id }))}>{createdBy.name}</Link>)
        }
      : null
  ];
  return (
    <div>
      <Row className='mb-5'>
        <Col xs='12'>
          <div className='mb-2 font-weight-bold text-secondary text-uppercase'>Code-With-Us Opportunity</div>
          <h2 className='mb-2'>{opportunity.title || DEFAULT_OPPORTUNITY_TITLE}</h2>
          <DateMetadata dates={compact(dates)} />
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <DescriptionList items={compact(items)} />
          {hasBeenPublished
            ? (<Link
                newTab
                color='info'
                className='mt-3'
                dest={routeDest(adt('opportunityCWUView', { opportunityId: opportunity.id }))}
                symbol_={rightPlacement(iconLinkSymbol('external-link'))}>
                View Published Opportunity
              </Link>)
            : null}
        </Col>
      </Row>
    </div>
  );
};

export default EditTabHeader;
