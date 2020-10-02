import { makePageMetadata, prefixPath } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import { BulletPoint } from 'front-end/lib/views/bullet-point';
import Link, { iconLinkSymbol, rightPlacement, routeDest } from 'front-end/lib/views/link';
import ProgramCard from 'front-end/lib/views/program-card';
import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

const IMG_MAX_WIDTH = '400px';

export interface State {
  totalCount: number;
  totalAwarded: number;
}

type InnerMsg = ADT<'noop'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => {
  const metricsR = await api.metrics.readMany();
  if (!api.isValid(metricsR)) {
    return {
      totalCount: 0,
      totalAwarded: 0
    };
  }

  return metricsR.value[0];
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const Hero: ComponentView<State, Msg> = ({state, dispatch}) => {
  return (
    <Container className='hero-component pb-7 pb-md-8 pt-sm-4 pt-md-3'>
      <Row className='justify-content-left text-left'>
        <Col md='5'>
          <h1 className='roboto' style={{lineHeight: '3.75rem'}}>
            Collaborez <br/>avec le gouvernement <br/>du Québec
          </h1>
          <div className='mt-3 mb-3'>
          Le marché numérique gouvernemental est une nouvelle
          plateforme qui contribue à bâtir un écosystème en matière
          d'innovation et de collaboration entre les entrepreneurs
          technologiques et le gouvernement du Québec.
          </div>
          <Link
            button
            outline
            symbol_={rightPlacement(iconLinkSymbol('arrow-right'))}
            dest={routeDest(adt('content', 'about'))}
            color='primary'
            className='mr-3'>
            À propos
          </Link>
          <Link
            button
            symbol_={rightPlacement(iconLinkSymbol('arrow-right'))}
            dest={routeDest(adt('opportunities', null))}
            color='primary'>
            Parcourez les opportunités
          </Link>
        </Col>
        <Col xs='12' sm='10' md='7'>
          <img src={prefixPath('images/illustrations/accueil.svg')} className='w-100' alt='Logo Échanges entre concepteurs' />
        </Col>
      </Row>
    </Container>
  );
};

const Programs: View = () => {
  return (
    <div className='py-7'>
      <Container>
        <Row>
          <ProgramCard
            img={prefixPath('/images/illustrations/developpez_avec_nous.svg')}
            title='Développez avec nous'
            className='mb-4 mb-md-0'
            description={
              (<div>
                <div>Soyez payé</div>
                <div>pour soumettre du code.</div>
                <div className='mt-3'>Des opportunités allant jusqu’à 70 000 $</div>
              </div>)
            }
            links={[
              {
                button: true,
                dest: routeDest(adt('learnMoreCWU', null)),
                children: ['Plus d\'information'],
                color: 'primary',
                outline: true,
                symbol_: rightPlacement(iconLinkSymbol('arrow-right'))
              }
            ]}
          />
          <ProgramCard
            img={prefixPath('/images/illustrations/cocreez_avec_nous.svg')}
            title='Cocréez avec nous'
            className='mb-4 mb-md-0'
            description={
              (<div>
                <div>Fournissez une équipe Agile pour travailler avec un gestionnaire de produit gouvernemental dans un environnement DevOps moderne.</div>
                <div className='mt-3'>Des opportunités allant jusqu’à 2 000 000$.</div>
              </div>)
            }
            links={[
              {
                button: true,
                dest: routeDest(adt('learnMoreSWU', null)),
                children: [('Plus d\'information')],
                color: 'primary',
                outline: true,
                symbol_: rightPlacement(iconLinkSymbol('arrow-right'))
              }
            ]}
          />
        </Row>
      </Container>
    </div>
  );
};

const AppInfo: View = () => {
  return (
    <Container className=''>
      <Row className='justify-content-center text-center'>
        <Col xs='12' md='8'>
          <div className='mb-0 font-size-large'>
            Rejoignez une communauté de développeurs, d'entrepreneurs <br />et d'innovateurs pour participer au développement <br />technologique de la fonction publique.
          </div>
        </Col>
      </Row>
      <Row>
        <Col xs='12' className='d-flex align-items-center justify-content-center'>
          <div className='px-1 pt-1 mt-4 bg-qcgov-blue' style={{ width: '5rem' }} />
        </Col>
      </Row>
    </Container>
  );
};

const VendorRoleInfo: View = () => {
  return (
    <Container className='mt-7 mt-md-9'>
      <Row>
        <Col xs='12' className='order-2 order-md-1'>
          <h6 className='text-c-landing-role-heading font-size-large'>Fournisseurs</h6>
        </Col>
        <Col xs='12' md='6' className='order-3 order-md-2'>
          <div className='mb-3 font-size-large font-weight-light'>Collaborez avec la fonction publique afin de créer de produits numériques innovants.</div>
          <BulletPoint
            className='my-4'
            header='Soumettez des propositions pour ouvrir des opportunités'
            subText="Enregistrez une version provisoire de votre proposition jusqu'à ce que vous soyez prêt à la soumettre." />
          <BulletPoint
            className='my-4'
            header='Affichez et exportez vos propositions soumises'
            subText='Affichez toutes les soumissions passées et en suspens. Vous pourrez voir vos scores et classements une fois soumis.' />
          <BulletPoint
            className='my-4'
            header='Créez votre équipe'
            subText='Ajoutez des membres à votre organisation.' />
        </Col>
        <Col xs='12' md='6' className='order-1 order-md-3 mb-5 mb-md-0'>
          <img style={{ maxWidth: IMG_MAX_WIDTH }} className='w-100 mx-auto d-block' src={prefixPath('/images/illustrations/vendeurs.svg')} />
        </Col>
      </Row>
    </Container>
  );
};

const GovRoleInfo: View = () => {
  return (
    <Container className='my-7 my-md-9'>
      <Row>
        <Col xs='12' md='7' className='mb-5 mb-md-0'>
          <img style={{ maxWidth: IMG_MAX_WIDTH }} className='w-100 mx-auto d-block' src={prefixPath('/images/illustrations/employes.svg')} />
        </Col>
        <Col cs='12' md='5'>
          <Row>
            <Col xs='12'>
              <h6 className='text-c-landing-role-heading font-size-large'>Employés de la fonction publique</h6>
            </Col>
            <Col xs='12'>
              <div className='mb-3 font-size-large font-weight-light'>Faites affaires avec des développeurs talentueux et qualifiés pour créer vos produits numériques.</div>
              <BulletPoint
                className='my-4'
                header='Publiez une nouvelle opportunité'
                subText='Sélectionnez le programme qui convient à vos besoins, publiez votre opportunité et attendez que les propositions arrivent.' />
              <BulletPoint
                className='my-4'
                header='Affichez et gérez vos opportunités publiées'
                subText="Affichez un historique complet de vos opportunités publiées où vous pouvez examiner et évaluer toutes les propositions reçues, attribuer l'opportunité au soumissionaire retenu et plus encore." />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

const BottomView: View = () => {
  return (
    <Container className='my-7'>
      <Row className='justify-content-center text-center'>
        <Col xs='12' md='8'>
          <div className="font-size-large">Découvrez les dernières opportunités<br /> sur le marché numérique</div>
        </Col>
      </Row>
      <Row className='mt-5'>
        <Col xs='12' className='d-flex justify-content-center'>
          <Link
            button
            symbol_={rightPlacement(iconLinkSymbol('arrow-right'))}
            dest={routeDest(adt('opportunities', null))}
            color='primary'>
            Parcourez les opportunités
          </Link>
        </Col>
      </Row>
    </Container>
  );
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      <Hero state={state} dispatch={dispatch} />
      <Programs />
      <AppInfo />
      <GovRoleInfo />
      <VendorRoleInfo />
      <BottomView />
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  fullWidth: true,
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Accueil');
  }
};
