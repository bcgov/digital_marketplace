import { View } from 'front-end/lib/framework';
import { swuOpportunityStatusToColor, swuOpportunityStatusToTitleCase } from 'front-end/lib/pages/opportunity/sprint-with-us/lib';
import Badge from 'front-end/lib/views/badge';
import DateMetadata from 'front-end/lib/views/date-metadata';
import DescriptionList from 'front-end/lib/views/description-list';
import Link, { iconLinkSymbol, rightPlacement, routeDest } from 'front-end/lib/views/link';
import { compact } from 'lodash';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { DEFAULT_OPPORTUNITY_TITLE, SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { isAdmin, User } from 'shared/lib/resources/user';
import { adt } from 'shared/lib/types';

export interface Props {
  opportunity: SWUOpportunity;
  viewerUser: User;
}

const EditTabHeader: View<Props> = ({ opportunity, viewerUser }) => {
  const createdBy = opportunity.createdBy;
  const oppStatus = opportunity.status;
  const dates = [
    opportunity.publishedAt
      ? {
          tag: 'date' as const,
          date: opportunity.publishedAt,
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
      children: (<Badge text={swuOpportunityStatusToTitleCase(oppStatus)} color={swuOpportunityStatusToColor(oppStatus)} />)
    },
    createdBy
      ? {
          name: 'Created By',
          children: isAdmin(viewerUser)
            ? (<Link color='primary' dest={routeDest(adt('userProfile', { userId: createdBy.id }))}>{createdBy.name}</Link>)
            : createdBy.name
        }
      : null
  ];
  return (
    <div>
      <Row className='mb-5'>
        <Col xs='12'>
          <div className='mb-2 font-size-small font-weight-bold text-secondary text-uppercase'>Sprint With Us Opportunity</div>
          <h3 className='mb-2'>{opportunity.title || DEFAULT_OPPORTUNITY_TITLE}</h3>
          <DateMetadata dates={compact(dates)} />
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <DescriptionList items={compact(items)} />
          <Link
            newTab
            color='info'
            className='mt-3'
            dest={routeDest(adt('opportunitySWUView', { opportunityId: opportunity.id }))}
            symbol_={rightPlacement(iconLinkSymbol('external-link'))}>
            View Opportunity
          </Link>
        </Col>
      </Row>
    </div>
  );
};

export default EditTabHeader;
