import { CONTACT_EMAIL, PROCUREMENT_CONCIERGE_URL } from 'front-end/config';
import { View } from 'front-end/lib/framework';
import Link, { AnchorProps, emailDest, externalDest, iconLinkSymbol, rightPlacement, routeDest } from 'front-end/lib/views/link';
import Separator from 'front-end/lib/views/separator';
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
    dest: emailDest([CONTACT_EMAIL])
  },
  {
    children: 'Procurement Concierge',
    dest: externalDest(PROCUREMENT_CONCIERGE_URL),
    newTab: true,
    symbol_: rightPlacement(iconLinkSymbol('external-link'))
  }
];

const Footer: View<{}> = () => {
  return (
    <footer className='w-100 bg-bcgov-blue text-light border-top-gov d-print-none'>
      <Container>
        <Row>
          <Col xs='12' className='d-flex flex-row flex-wrap align-items-center pt-3'>
            {links.map((link, i) => (
              <div key={`footer-link-${i}`} className='mb-3'>
                <Link {...link} className='o-75' color='white' button={false} />
                {i < links.length - 1
                  ? (<Separator spacing='2' color='blue-dark-alt'>|</Separator>)
                  : null}
              </div>
            ))}
          </Col>
          <Col xs='12' className='small pb-3 o-75 text-white'>
            Owned and operated by the Government of B.C.&nbsp;
            <Link newTab color='white' dest={externalDest('https://www.realfolk.io')} className='text-decoration-underline'>
              Designed and implemented by Real Folk.
            </Link>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
