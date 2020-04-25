import { View } from 'front-end/lib/framework';
import { ThemeColor } from 'front-end/lib/types';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import React from 'react';
import { Col, Row } from 'reactstrap';

export interface Props {
  icon: AvailableIcons;
  foreColor?: ThemeColor;
  bgColor?: ThemeColor;
  header: string;
  subText?: string;
  className?: string;
}

export const HowItWorksItem: View<Props> = ({ icon, bgColor = 'purple', foreColor = 'white', header, subText, className }) => {
  return (
    <Row className={`d-flex flex-md-row ${className}`}>
      <Col className='flex-grow-0'>
        <div className={`d-md-flex d-none justify-content-center align-items-center rounded-circle p-3 bg-${bgColor}`}>
          <Icon name={icon} color={foreColor} width={2.5} height={2.5} />
        </div>
        <div className={`d-flex d-md-none justify-content-center align-items-center rounded-circle p-2 bg-${bgColor}`}>
          <Icon name={icon} color={foreColor} width={1.5} height={1.5} />
        </div>
      </Col>
      <Col xs='10' className='d-flex flex-column'>
        <strong className='mb-2'>{header}</strong>
        {subText}
      </Col>
    </Row>
  );
};

export default HowItWorksItem;
