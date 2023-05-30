import {
  getActionsValid,
  getModalValid,
  makePageMetadata,
  makeStartLoading,
  makeStopLoading,
  updateValid,
  ValidatedState,
  viewValid
} from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Form from "front-end/lib/pages/content/lib/components/form";
import * as toasts from "front-end/lib/pages/content/lib/toasts";
import {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { UserType } from "shared/lib/resources/user";
import * as ContentResource from "shared/lib/resources/content";
import { ADT, adt } from "shared/lib/types";
import { invalid, valid } from "shared/lib/validation";

type ModalId = "publish";

interface ValidState {
  loading: number;
  showModal: ModalId | null;
  form: Immutable<Form.State>;
}

export type State = ValidatedState<ValidState>;

type InnerMsg =
  | ADT<"form", Form.Msg>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"publish">
  | ADT<
      "onPublishResponse",
      api.ResponseValidation<
        ContentResource.Content,
        ContentResource.CreateValidationErrors
      >
    >;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

export const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType<RouteParams, State, InnerMsg>({
  userType: [UserType.Admin],
  success() {
    const [formState, formCmds] = Form.init({});
    return [
      valid(
        immutable({
          loading: 0,
          showModal: null,
          form: immutable(formState)
        })
      ),
      [
        ...component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg),
        component_.cmd.dispatch(component_.page.readyMsg())
      ]
    ];
  },
  fail({ routePath }) {
    return [
      invalid(null),
      [
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            adt("notFound", {
              path: routePath
            }) as Route
          )
        )
      ]
    ];
  }
});

const startLoading = makeStartLoading<ValidState>("loading");
const stopLoading = makeStopLoading<ValidState>("loading");

export const update: component_.page.Update<State, InnerMsg, Route> =
  updateValid(({ state, msg }) => {
    switch (msg.tag) {
      case "form":
        return component_.base.updateChild({
          state,
          childStatePath: ["form"],
          childUpdate: Form.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("form", value)
        });
      case "showModal":
        return [state.set("showModal", msg.value), []];
      case "hideModal":
        return [state.set("showModal", null), []];
      case "publish": {
        const values = Form.getValues(state.form);
        return [
          startLoading(state).set("showModal", null),
          [
            api.content.create<Msg>()(values, (response) =>
              adt("onPublishResponse", response)
            )
          ]
        ];
      }
      case "onPublishResponse": {
        const response = msg.value;
        switch (response.tag) {
          case "valid":
            return [
              state,
              [
                component_.cmd.dispatch(
                  component_.global.newRouteMsg(
                    adt("contentEdit", response.value.slug) as Route
                  )
                ),
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("success", toasts.published.success(response.value))
                  )
                )
              ]
            ];
          case "invalid":
            state = state.update("form", (s) =>
              Form.setErrors(s, response.value)
            );
            return [
              stopLoading(state),
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("error", toasts.published.error)
                  )
                )
              ]
            ];
          case "unhandled":
          default:
            return [
              stopLoading(state),
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("error", toasts.published.error)
                  )
                )
              ]
            ];
        }
      }
      default:
        return [state, []];
    }
  });

export const view: component_.base.ComponentView<State, Msg> = viewValid(
  ({ state, dispatch }) => {
    return (
      <div>
        <Row>
          <Col xs="12">
            <h1 className="mb-5">Create a New Page</h1>
          </Col>
        </Row>
        <Form.view
          state={state.form}
          dispatch={component_.base.mapDispatch(
            dispatch,
            (msg) => adt("form", msg) as Msg
          )}
        />
      </div>
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
  getMetadata() {
    return makePageMetadata("Create a New Page");
  },
  getActions: getActionsValid(({ state, dispatch }) => {
    const loading = state.loading > 0;
    const isValid = Form.isValid(state.form);
    return adt("links", [
      {
        children: "Publish",
        onClick: () => dispatch(adt("showModal", "publish") as Msg),
        button: true,
        loading,
        disabled: !isValid || loading,
        symbol_: leftPlacement(iconLinkSymbol("bullhorn")),
        color: "primary"
      },
      {
        children: "Cancel",
        color: "c-nav-fg-alt",
        dest: routeDest(adt("contentList", null))
      }
    ]);
  }),
  getModal: getModalValid<ValidState, Msg>((state) => {
    switch (state.showModal) {
      case "publish":
        return component_.page.modal.show({
          title: "Publish Page?",
          body: () =>
            "Are you sure you want to publish this page? Once published, all users will be able to access it by navigating to its URL.",
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Publish Page",
              icon: "bullhorn" as const,
              color: "primary" as const,
              msg: adt("publish") as Msg,
              button: true
            },
            {
              text: "Cancel",
              color: "secondary" as const,
              msg: adt("hideModal")
            }
          ]
        });
      case null:
        return component_.page.modal.hide();
    }
  })
};
