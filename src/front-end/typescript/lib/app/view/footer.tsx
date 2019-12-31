import { CONTACT_EMAIL } from 'front-end/config';
import { View } from 'front-end/lib/framework';
import Link, { AnchorProps, emailDest, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { adt } from 'shared/lib/types';

const links: AnchorProps[] = [
  {
    children: 'Home',
    dest: routeDest(adt('landing', null))
  },
  {
    children: 'About',
    dest: routeDest(adt('content', 'about'))
  },
  {
    children: 'Disclaimer',
    dest: routeDest(adt('content', 'disclaimer'))
  },
  {
    children: 'Privacy',
    dest: routeDest(adt('content', 'privacy'))
  },
  {
    children: 'Accessibility',
    dest: routeDest(adt('content', 'accessibility'))
  },
  {
    children: 'Copyright',
    dest: routeDest(adt('content', 'copyright'))
  },
  {
    children: 'Contact Us',
    dest: emailDest(CONTACT_EMAIL)
  }
];

const Footer: View<{}> = () => {
  return (
    <footer className='w-100 bg-info text-light border-top-gov'>
      <Container>
        <Row>
          <Col xs='12' className='d-flex flex-row flex-wrap align-items-center pt-3'>
            {links.map((link, i) => (
              <div key={`footer-link-${i}`} className={`mb-3 ${i < links.length - 1 ? 'pr-3 mr-3 border-right border-info-alt' : ''}`}>
                <Link {...link} className='o-75' color='white' button={false} />
              </div>
            ))}
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
