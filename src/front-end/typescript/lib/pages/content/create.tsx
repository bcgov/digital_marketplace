import {
  getContextualActionsValid,
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
  ComponentView,
  GlobalComponentMsg,
  Immutable,
  immutable,
  mapComponentDispatch,
  newRoute,
  PageComponent,
  PageInit,
  replaceRoute,
  toast,
  Update,
  updateComponentChild
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
  | ADT<"publish">;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

export const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType<
  RouteParams,
  State,
  Msg
>({
  userType: [UserType.Admin],
  async success({ routeParams, shared }) {
    return valid(
      immutable({
        loading: 0,
        showModal: null,
        form: immutable(await Form.init({}))
      })
    );
  },
  async fail({ dispatch, routePath }) {
    dispatch(
      replaceRoute(
        adt("notFound" as const, {
          path: routePath
        })
      )
    );
    return invalid(null);
  }
});

const startLoading = makeStartLoading<ValidState>("loading");
const stopLoading = makeStopLoading<ValidState>("loading");

export const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case "form":
      return updateComponentChild({
        state,
        childStatePath: ["form"],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("form", value)
      });
    case "showModal":
      return [state.set("showModal", msg.value)];
    case "hideModal":
      return [state.set("showModal", null)];
    case "publish":
      return [
        startLoading(state).set("showModal", null),
        async (state, dispatch) => {
          const values = Form.getValues(state.form);
          const result = await api.content.create(values);
          switch (result.tag) {
            case "valid":
              dispatch(
                newRoute(adt("contentEdit", result.value.slug) as Route)
              );
              dispatch(
                toast(adt("success", toasts.published.success(result.value)))
              );
              return state;
            case "invalid":
              dispatch(toast(adt("error", toasts.published.error)));
              state = state.update("form", (s) =>
                Form.setErrors(s, result.value)
              );
              return stopLoading(state);
            case "unhandled":
              dispatch(toast(adt("error", toasts.published.error)));
              return stopLoading(state);
          }
        }
      ];
    default:
      return [state];
  }
});

export const view: ComponentView<State, Msg> = viewValid(
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
          dispatch={mapComponentDispatch(dispatch, (msg) =>
            adt("form" as const, msg)
          )}
        />
      </div>
    );
  }
);

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata("Create a New Page");
  },
  getContextualActions: getContextualActionsValid(({ state, dispatch }) => {
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
        return {
          title: "Publish Page?",
          body: () =>
            "Are you sure you want to publish this page? Once published, all users will be able to access it by navigating to its URL.",
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Publish Page",
              icon: "bullhorn",
              color: "primary",
              msg: adt("publish"),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        };
      case null:
        return null;
    }
  })
};
