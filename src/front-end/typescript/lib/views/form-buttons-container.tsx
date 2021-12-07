import { View, ViewElementChildren } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';

export interface Props {
  className?: string;
  children: ViewElementChildren;
}

const FormButtonsContainer: View<Props> = ({ className, children }) => {
  return (
    <Row className={className}>
      <Col xs='12' className='py-1 d-flex flex-nowrap flex-row flex-md-row-reverse align-items-center overflow-auto'>
        {children}
      </Col>
    </Row>
  );
};

export default FormButtonsContainer;
