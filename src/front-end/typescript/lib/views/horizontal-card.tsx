import Icon from 'front-end/lib/views/icon';
import { Col, Row } from 'reactstrap';
import React from 'react';
import Link from 'front-end/lib/views/link';

export interface HorizontalCardParams {
  title: string;
  description: string;
  buttonText: string;
}


export function HorizontalCard(params: HorizontalCardParams) {
  return (
      <Row>
        <Col xs='11' className='mx-auto sign-in-card'>
          <h2>
            <Icon name='paperclip' color='primary'/>
            <span className="pl-1">{params.title}</span>
          </h2>
          <p>{params.description}</p>
          <Link button className='btn-primary'>{params.buttonText}</Link>
        </Col>
      </Row>
  );
}
