import { makePageMetadata, viewValid } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, PageComponent, PageInit, replaceRoute, Update } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Markdown from 'front-end/lib/views/markdown';
import { includes } from 'lodash';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';
import { invalid, isValid, valid, Validation } from 'shared/lib/validation';

export type ContentId
  = 'markdown-guide'
  | 'terms-and-conditions'
  | 'about'
  | 'disclaimer'
  | 'privacy'
  | 'accessibility'
  | 'copyright'
  | 'code-with-us-opportunity-guide'
  | 'code-with-us-proposal-guide'
  | 'code-with-us-terms-and-conditions'
  | 'sprint-with-us-opportunity-guide'
  | 'sprint-with-us-proposal-guide'
  | 'sprint-with-us-terms-and-conditions';

export function parseContentId(id: any): ContentId | null {
  if (includes(Object.keys(DEFINITIONS), id)) {
    return id;
  } else {
    return null;
  }
}

interface ContentDefinition {
  title: string;
}

type ContentDefinitions = {
  [K in ContentId]: ContentDefinition;
};

const DEFINITIONS: ContentDefinitions = {
  'markdown-guide': {
    title: 'Markdown Guide'
  },
  'terms-and-conditions': {
    title: 'Digital Marketplace Terms & Conditions for E-Bidding'
  },
  'about': {
    title: 'About Us'
  },
  'disclaimer': {
    title: 'Disclaimer'
  },
  'privacy': {
    title: 'B.C. Government Website Privacy Statement'
  },
  'accessibility': {
    title: 'Accessibility'
  },
  'copyright': {
    title: 'Copyright'
  },
  'code-with-us-opportunity-guide': {
    title: 'Code With Us Opportunity Guide'
  },
  'code-with-us-proposal-guide': {
    title: 'Code With Us Proposal Guide'
  },
  'code-with-us-terms-and-conditions': {
    title: 'Code With Us Terms'
  },
  'sprint-with-us-opportunity-guide': {
    title: 'Sprint With Us Opportunity Guide'
  },
  'sprint-with-us-proposal-guide': {
    title: 'Sprint With Us Proposal Guide'
  },
  'sprint-with-us-terms-and-conditions': {
    title: 'Sprint With Us Terms and Conditions'
  }
};

export type RouteParams = ContentId | null;

interface ValidState {
  id: ContentId;
  definition: ContentDefinition;
  body: string;
}

export type State = Validation<Immutable<ValidState>, null>;

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ routePath, routeParams, dispatch }) => {
  if (routeParams) {
    const result = await api.getMarkdownFile(routeParams);
    if (api.isValid(result)) {
      return valid(immutable({
        id: routeParams,
        definition: DEFINITIONS[routeParams],
        body: result.value
      }));
    }
  }
  dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
  return invalid(null);
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = viewValid(({ state }) => {
  return (
    <Row className={`content-${state.id}`}>
      <Col xs='12'>
        <h1 className='mb-5'>{state.definition.title}</h1>
        <Markdown source={state.body} openLinksInNewTabs escapeHtml={false} />
      </Col>
    </Row>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata(state) {
    return makePageMetadata(isValid(state) ? state.value.definition.title : 'Welcome');
  }
};
