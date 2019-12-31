import { makePageMetadata, viewValid } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, PageComponent, PageInit, replaceRoute, Update } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Markdown from 'front-end/lib/views/markdown';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';
import { invalid, isValid, valid, Validation } from 'shared/lib/validation';

export type ContentId
  = 'terms-and-conditions';

export function parseContentId(id: any): ContentId | null {
  switch (id) {
    case 'terms-and-conditions':
      return id;
    default:
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
  'terms-and-conditions': {
    title: 'Terms & Conditions'
  }
};

export type RouteParams = ContentId | null;

interface ValidState {
  definition: ContentDefinition;
  body: string;
}

export type State = Validation<Immutable<ValidState>, null>;

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ routeParams, dispatch }) => {
  if (routeParams) {
    const result = await api.getMarkdownFile(routeParams);
    if (api.isValid(result)) {
      return valid(immutable({
        definition: DEFINITIONS[routeParams],
        body: result.value
      }));
    }
  }
  dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
  return invalid(null);
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = viewValid(({ state }) => {
  return (
    <Row>
      <Col xs='12'>
        <h1>{state.definition.title}</h1>
        <Markdown source={state.body} openLinksInNewTabs />
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
