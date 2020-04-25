import { View } from 'front-end/lib/framework';
import { ThemeColor } from 'front-end/lib/types';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import React, { ReactElement } from 'react';
import { Col, Row } from 'reactstrap';

export interface Props {
  icon?: AvailableIcons;
  iconText?: string;
  foreColor?: ThemeColor;
  bgColor?: ThemeColor;
  header: string;
  subText?: string | ReactElement;
  className?: string;
}

export const HowItWorksItem: View<Props> = ({ icon, iconText, bgColor = 'purple', foreColor = 'white', header, subText, className }) => {
  return (
    <Row className={`d-flex flex-md-row ${className}`}>
      <Col className='flex-grow-0'>
        <div
          className={`d-md-flex d-none justify-content-center align-items-center rounded-circle bg-${bgColor}`}
          style={{width: '4.25rem', height: '4.25rem'}}>
          {icon ?
            <Icon name={icon} color={foreColor} width={2.5} height={2.5} /> :
            <span className='text-white text-center' style={{fontSize: '2.5rem'}}>{iconText}</span>}
        </div>
        <div
          className={`d-flex d-md-none justify-content-center align-items-center rounded-circle p-2 bg-${bgColor}`}
          style={{width: '2.25rem', height: '2.25rem'}}>
          {icon ?
            <Icon name={icon} color={foreColor} width={1.5} height={1.5} /> :
            <span className='text-white text-center' style={{fontSize: '1.5rem'}}>{iconText}</span>}
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
