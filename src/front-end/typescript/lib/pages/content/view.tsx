import {
  getMetadataValid,
  makePageMetadata,
  ValidatedState,
  viewValid,
  updateValid
} from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import { immutable, component as component_ } from "front-end/lib/framework";
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
  routePath: string;
  content: Content | null;
}

export type State = ValidatedState<ValidState>;

export type InnerMsg = ADT<
  "onContentResponse",
  api.ResponseValidation<Content, string[]>
>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = ({ routePath, routeParams }) => {
  if (routeParams) {
    return [
      valid(immutable({ routePath, content: null })),
      [
        api.content.readOne<Msg>()(routeParams, (msg) =>
          adt("onContentResponse", msg)
        )
      ]
    ];
  } else {
    return [
      invalid(null),
      [
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            adt("notFound", { path: routePath }) as Route
          )
        )
      ]
    ];
  }
};

const update: component_.page.Update<State, InnerMsg, Route> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "onContentResponse": {
        const response = msg.value;
        if (api.isValid(response)) {
          return [
            state.set("content", response.value),
            [component_.cmd.dispatch(component_.page.readyMsg())]
          ];
        } else {
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.replaceRouteMsg(
                  adt("notFound", { path: state.routePath }) as Route
                )
              )
            ]
          ];
        }
      }
      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state }) => {
    const content = state.content;
    if (!content) return null;
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
      <Row className={`content-${content.slug}`}>
        <Col xs="12">
          <h1>{content.title}</h1>
          <DateMetadata dates={dates} className="mb-5" />
          <Markdown
            source={content.body}
            openLinksInNewTabs
            escapeHtml={false}
          />
        </Col>
      </Row>
    );
  }
);

export const component: component_.page.Component<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = {
  init,
  update,
  view,
  getMetadata: getMetadataValid((state) => {
    return makePageMetadata(state.content?.title || "");
  }, makePageMetadata())
};
