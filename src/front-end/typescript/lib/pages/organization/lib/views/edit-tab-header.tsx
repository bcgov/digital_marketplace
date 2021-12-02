import { View } from 'front-end/typescript/lib/framework';
import Icon from 'front-end/typescript/lib/views/icon';
import React from 'react';
import { Col, Row } from 'reactstrap';

export interface Props {
  legalName: string;
  swuQualified: boolean;
}

const EditTabHeader: View<Props> = ({ legalName, swuQualified }) => {
  return (
    <Row>
      <Col xs='12'>
        <h2>{legalName}</h2>
        {swuQualified
          ? (<div className='d-flex align-items-center flex-nowrap'>
              <Icon name='shield-check' color='success' width={0.9} height={0.9} className='mr-2' />
              <span className='font-size-small'>Sprint With Us Qualified</span>
            </div>)
          : null}
      </Col>
    </Row>
  );
};

export default EditTabHeader;
