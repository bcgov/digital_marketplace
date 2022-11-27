import {
  getActionsValid,
  makePageMetadata,
  makeStartLoading,
  makeStopLoading,
  updateValid,
  viewValid
} from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import * as MenuSidebar from "front-end/lib/components/sidebar/menu";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as OrgForm from "front-end/lib/pages/organization/lib/components/form";
import * as toasts from "front-end/lib/pages/organization/lib/toasts";
import { makeSidebarState } from "front-end/lib/pages/user/profile/tab";
import {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState {
  submitLoading: number;
  user: User;
  orgForm: Immutable<OrgForm.State>;
  sidebar: Immutable<MenuSidebar.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg =
  | ADT<"orgForm", OrgForm.Msg>
  | ADT<"sidebar", MenuSidebar.Msg>
  | ADT<"submit">
  | ADT<"onSubmitResponse", OrgForm.PersistResult>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType<RouteParams, State, Msg>({
  userType: [UserType.Vendor],
  success({ shared }) {
    const [orgFormState, orgFormCmds] = OrgForm.init({});
    const [sidebarState, sidebarCmds] = makeSidebarState(
      "organizations",
      shared.sessionUser,
      shared.sessionUser
    );
    return [
      valid(
        immutable({
          submitLoading: 0,
          user: shared.sessionUser,
          orgForm: immutable(orgFormState),
          sidebar: immutable(sidebarState)
        })
      ),
      [
        component_.cmd.dispatch(component_.page.readyMsg()),
        ...component_.cmd.mapMany(
          orgFormCmds,
          (msg) => adt("orgForm", msg) as Msg
        ),
        ...component_.cmd.mapMany(
          sidebarCmds,
          (msg) => adt("sidebar", msg) as Msg
        )
      ]
    ];
  },
  fail({ routePath, shared }) {
    if (!shared.session) {
      return [
        invalid(null),
        [
          component_.cmd.dispatch(
            component_.global.replaceRouteMsg(
              adt("signIn" as const, {
                redirectOnSuccess: routePath
              })
            )
          )
        ]
      ];
    } else {
      return [
        invalid(null),
        [
          component_.cmd.dispatch(
            component_.global.replaceRouteMsg(
              adt("notFound" as const, { path: routePath })
            )
          )
        ]
      ];
    }
  }
});

const startSubmitLoading = makeStartLoading<ValidState>("submitLoading");
const stopSubmitLoading = makeStopLoading<ValidState>("submitLoading");

const update: component_.page.Update<State, InnerMsg, Route> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "orgForm":
        return component_.base.updateChild({
          state,
          childStatePath: ["orgForm"],
          childUpdate: OrgForm.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("orgForm", value)
        });
      case "sidebar":
        return component_.base.updateChild({
          state,
          childStatePath: ["sidebar"],
          childUpdate: MenuSidebar.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("sidebar", value)
        });
      case "submit":
        return [
          startSubmitLoading(state),
          [
            component_.cmd.map(
              OrgForm.persist(adt("create", state.orgForm)),
              (response) => adt("onSubmitResponse", response)
            )
          ]
        ];
      case "onSubmitResponse": {
        const response = msg.value;
        switch (response.tag) {
          case "valid": {
            const [formState, formCmds, organization] = response.value;
            return [
              state.set("orgForm", formState),
              [
                ...component_.cmd.mapMany(
                  formCmds,
                  (msg) => adt("orgForm", msg) as Msg
                ),
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("success", toasts.created.success)
                  )
                ),
                component_.cmd.dispatch(
                  component_.global.newRouteMsg(
                    adt("orgEdit" as const, {
                      orgId: organization.id
                    })
                  )
                )
              ]
            ];
          }
          case "invalid":
          default:
            return [
              stopSubmitLoading(state).set("orgForm", response.value),
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("error", toasts.created.error)
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
  ({ state, dispatch }) => {
    return (
      <div>
        <Row>
          <Col className="mb-5" xs="12">
            <h2>Create Organization</h2>
          </Col>
        </Row>
        <Row>
          <Col xs="12">
            <OrgForm.view
              state={state.orgForm}
              disabled={false}
              dispatch={component_.base.mapDispatch(dispatch, (value) =>
                adt("orgForm" as const, value)
              )}
            />
          </Col>
        </Row>
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
  sidebar: {
    size: "medium",
    color: "light",
    view: viewValid(({ state, dispatch }) => {
      return (
        <MenuSidebar.view
          state={state.sidebar}
          dispatch={component_.base.mapDispatch(dispatch, (msg) =>
            adt("sidebar" as const, msg)
          )}
        />
      );
    })
  },
  getActions: getActionsValid(({ state, dispatch }) => {
    const isSubmitLoading = state.submitLoading > 0;
    const isValid = OrgForm.isValid(state.orgForm);
    return component_.page.actions.links([
      {
        children: "Create Organization",
        onClick: () => dispatch(adt("submit")),
        button: true,
        loading: isSubmitLoading,
        disabled: !isValid || isSubmitLoading,
        symbol_: leftPlacement(iconLinkSymbol("plus-circle")),
        color: "primary"
      },
      {
        children: "Cancel",
        color: "c-nav-fg-alt",
        dest: routeDest(
          adt("userProfile", {
            userId: state.user.id,
            tab: "organizations" as const
          })
        )
      }
    ]);
  }),
  getMetadata() {
    return makePageMetadata("Create Organization");
  }
};
