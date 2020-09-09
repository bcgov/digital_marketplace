import { CONTACT_EMAIL, PROCUREMENT_CONCIERGE_URL } from 'front-end/config';
import { prefixPath } from 'front-end/lib';
import { View } from 'front-end/lib/framework';
import Link, { AnchorProps, emailDest, externalDest, iconLinkSymbol, rightPlacement, routeDest } from 'front-end/lib/views/link';
import Separator from 'front-end/lib/views/separator';
import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { adt } from 'shared/lib/types';

const links: AnchorProps[] = [
  {
    children: 'Accueil',
    dest: routeDest(adt('landing', null))
  },
  {
    children: 'Accessibilité',
    dest: routeDest(adt('content', 'accessibility'))
  },
  {
    children: 'Avertissement',
    dest: routeDest(adt('content', 'disclaimer'))
  },
  {
    children: 'Politique de confidentialité',
    dest: routeDest(adt('content', 'privacy'))
  },
  {
    children: "À propos d'Échange entre concepteurs",
    dest: routeDest(adt('content', 'about'))
  },
  {
    children: 'Contrats',
    dest: externalDest(PROCUREMENT_CONCIERGE_URL),
    newTab: true,
    symbol_: rightPlacement(iconLinkSymbol('external-link'))
  }
];

const Footer: View<{}> = () => {
  return (
    <footer className='w-100 d-print-none bg-white'>
      <div className="bg-blue-dark-alt-2">
      <Container className='w-100'>
        <Row className=" mb-4 mt-4">
          <Col xs='12' className='d-flex flex-row flex-wrap pt-3'>
            <div className='flex-grow-1'>
            
            </div>
            <div className='flex-shrink-0 mr-5'>
              <div className='mb-2'><Link dest={emailDest([CONTACT_EMAIL])} className="font-size-large roboto" color='white'>Nous joindre</Link></div>
              <ul className='footer-link-list'>
                <li><a href="#">Téléphone</a></li>
                <li><a target="_blank" href="/bureaux-de-services/">Bureaux de services&nbsp;</a></li>
                <li><a href="/nous-joindre/courriel/">Courriel  </a></li>
                <li><a href="mailto:info@quebec.ca?subject=Problèmes%20techniques%20reliés%20à%20la%20plateforme">Problèmes techniques</a></li>
              </ul>
            </div>
            <div className='flex-shrink-0 mr-4'>
              <div className='footer-social-list-title font-size-large text-white mb-2'>Suivez-nous</div>
              <ul className="d-flex footer-social-list">
                <li>
                  <a target="_blank" href="https://www.facebook.com/GouvQc/">
                    <img alt="Facebook pictogramme" src={prefixPath('/images/facebook.svg')} width="97" height="97" />
                  </a>
                </li>
                <li>
                  <a target="_blank" href="https://twitter.com/gouvqc">
                    <img alt="Twitter pictogramme" src={prefixPath('/images/Twitter.svg')} width="97" height="97" />
                  </a>
                </li>
                <li>
                  <a target="_blank" href="https://www.youtube.com/channel/UCgi4UW4SNeYNl4n-AEvgKoQ/featured">
                    <img alt="YouTube pictogramme" src={prefixPath('/images/Youtube.svg')} width="97" height="68" />
                  </a>
                </li>
              </ul>
            </div>
          </Col>
        </Row>
      </Container>
      </div>
      <Container>  
        <Row className="mb-3">
          <Col xs='12' className='text-center pt-3'>
            {links.map((link, i) => (
              <span key={`footer-link-${i}`} className='mb-3'>
                <Link {...link} className='o-75 font-size-extra-small' color='primary' button={false} />
                {i < links.length - 1
                  ? (<Separator spacing='4' color='white'>|</Separator>)
                  : null}
              </span>
            ))}
          </Col>
        </Row>
        <Row className="mb-1">
          <Col className='text-center'>
            <img src={prefixPath('/images/quebec_logo_pied_page.svg')} alt='Québec' style={{ 'height': '35px' }}/>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col className='text-center'>
            <a className="font-size-extra-small" href="http://www.droitauteur.gouv.qc.ca/copyright.php" target="_self">© Gouvernement du Québec,&nbsp;2020</a>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
