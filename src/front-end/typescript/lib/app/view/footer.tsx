import { View } from 'front-end/lib/framework';
import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { Session } from 'shared/lib/resources/session';

export interface State {
  title: string;
}

const ProvinceLogo: View<{}> = () => {
  return (
    <img
      src='/images/bcgov_logo.svg'
      alt='The Province of British Columbia'
      style={{ width: '165px' }} />
  );
};

const Footer: View<{ session?: Session }> = ({ session }) => {
  return (
    <footer className='w-100 bg-info text-light border-top-gov'>
      <Container className='py-4'>
        <Row>
          <Col xs='12' className='d-flex flex-row justify-content-between align-items-center'>
            <ProvinceLogo />
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
