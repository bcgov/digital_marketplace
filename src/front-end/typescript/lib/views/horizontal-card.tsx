// import { Route } from 'front-end/lib/app/types';
import { getSignInUrl } from 'front-end/lib/index';
import Icon from 'front-end/lib/views/icon';
import Link, { externalDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';

export interface HorizontalCardParams {
  title: string;
  description: string;
  buttonText: string;
  signInTarget: 'idir' | 'github';
}

export function HorizontalCard(params: HorizontalCardParams) {
  return (
    <Row>
      <Col xs='12'>
        <div className='mx-auto bg-white p-4 shadow mb-4 border rounded-sm'>
          <h2>
            <Icon name='paperclip' color='primary'/>
            <span className='pl-1'>{params.title}</span>
          </h2>
          <p>{params.description}</p>
          <Link button dest={externalDest(getSignInUrl(params.signInTarget))} className='btn-primary'>{params.buttonText}</Link>
        </div>
      </Col>
    </Row>
  );
}
