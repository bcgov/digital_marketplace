import Icon from 'front-end/lib/views/icon';
import Link from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';

export interface HorizontalCardParams {
  title: string;
  description: string;
  buttonText: string;
}

export function HorizontalCard(params: HorizontalCardParams) {
  return (
    <Row>
      <Col xs='12' className='mx-auto bg-white p-4 shadow mb-4 border border-dark rounded-sm'>
        <h2>
          <Icon name='paperclip' color='primary'/>
          <span className='pl-1'>{params.title}</span>
        </h2>
        <p>{params.description}</p>
        <Link button className='btn-primary'>{params.buttonText}</Link>
      </Col>
    </Row>
  );
}
