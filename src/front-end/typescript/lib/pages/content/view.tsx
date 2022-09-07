import {
  getMetadataValid,
  makePageMetadata,
  ValidatedState,
  viewValid
} from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  ComponentView,
  GlobalComponentMsg,
  immutable,
  PageComponent,
  PageInit,
  replaceRoute,
  Update
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import DateMetadata from "front-end/lib/views/date-metadata";
import Markdown from "front-end/lib/views/markdown";
import React from "react";
import { Col, Row } from "reactstrap";
import { Content } from "shared/lib/resources/content";
import { adt, ADT } from "shared/lib/types";
import { invalid, valid } from "shared/lib/validation";

export type RouteParams = string; //slug

interface ValidState {
  content: Content;
}

export type State = ValidatedState<ValidState>;

export type Msg = GlobalComponentMsg<ADT<"noop">, Route>;

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({
  routePath,
  routeParams,
  dispatch
}) => {
  if (routeParams) {
    const result = await api.content.readOne(routeParams);
    if (api.isValid(result)) {
      return valid(
        immutable({
          content: result.value
        })
      );
    }
  }
  dispatch(replaceRoute(adt("notFound" as const, { path: routePath })));
  return invalid(null);
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = viewValid(({ state }) => {
  const content = state.content;
  const dates = [
    {
      tag: "dateAndTime" as const,
      date: content.createdAt,
      label: "Published"
    },
    {
      tag: "dateAndTime" as const,
      date: content.updatedAt,
      label: "Updated"
    }
  ];
  return (
    <Row className={`content-${state.content.slug}`}>
      <Col xs="12">
        <h1>{state.content.title}</h1>
        <DateMetadata dates={dates} className="mb-5" />
        <Markdown
          source={state.content.body}
          openLinksInNewTabs
          escapeHtml={false}
        />
      </Col>
    </Row>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata: getMetadataValid((state) => {
    return makePageMetadata(state.content.title);
  }, makePageMetadata())
};
