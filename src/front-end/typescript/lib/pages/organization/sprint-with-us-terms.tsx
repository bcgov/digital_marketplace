import { SWU_QUALIFICATION_TERMS_ID } from "front-end/config";
import {
  getAlertsValid,
  makePageMetadata,
  makeStartLoading,
  makeStopLoading,
  updateValid,
  viewValid
} from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as toasts from "front-end/lib/pages/organization/lib/toasts";
import Link, { routeDest } from "front-end/lib/views/link";
import Markdown from "front-end/lib/views/markdown";
import React from "react";
import { Col, Row } from "reactstrap";
import { formatDate, formatTime } from "shared/lib";
import { Organization } from "shared/lib/resources/organization";
import { isAdmin, User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import { Content } from "shared/lib/resources/content";

export const TITLE = "Sprint With Us Terms & Conditions";

export function acceptedSWUTermsText(
  organization: Organization,
  ifNotAcceptedText: string
) {
  return organization.acceptedSWUTerms
    ? `${organization.legalName} agreed to the ${TITLE} on ${formatDate(
        organization.acceptedSWUTerms
      )} at ${formatTime(organization.acceptedSWUTerms)}.`
    : ifNotAcceptedText;
}

export interface RouteParams {
  orgId: Id;
}

interface ValidState {
  acceptLoading: number;
  organization: Organization | null;
  viewerUser: User;
  body: string;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg =
  | ADT<
      "onInitResponse",
      [string, Organization | null, api.ResponseValidation<Content, string[]>]
    >
  | ADT<"accept">
  | ADT<"onAcceptResponse", boolean>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType<RouteParams, State, Msg>({
  userType: [UserType.Vendor, UserType.Admin],
  success({ shared, routePath, routeParams }) {
    return [
      valid(
        immutable({
          acceptLoading: 0,
          organization: null,
          viewerUser: shared.sessionUser,
          body: ""
        })
      ),
      [
        component_.cmd.join(
          api.organizations.readOne()(routeParams.orgId, (response) =>
            api.isValid(response) ? response.value : null
          ),
          api.content.readOne()(
            SWU_QUALIFICATION_TERMS_ID,
            (response) => response
          ),
          (organization, body) =>
            adt("onInitResponse", [routePath, organization, body]) as Msg
        )
      ]
    ];
  },
  fail({ shared, routePath }) {
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

const startAcceptLoading = makeStartLoading<ValidState>("acceptLoading");
const stopAcceptLoading = makeStopLoading<ValidState>("acceptLoading");

const update: component_.base.Update<State, Msg> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "onInitResponse": {
        const [routePath, organization, body] = msg.value;
        if (!organization || !body) {
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.replaceRouteMsg(
                  adt("notFound" as const, { path: routePath })
                )
              )
            ]
          ];
        } else {
          state = state.set("organization", organization);
          if (body && api.isValid(body)) {
            state = state.set("body", body.value.body);
          }
          return [state, [component_.cmd.dispatch(component_.page.readyMsg())]];
        }
      }
      case "accept": {
        const organization = state.organization;
        if (!organization) return [state, []];
        return [
          startAcceptLoading(state),
          [
            api.organizations.update<Msg>()(
              organization.id,
              adt("acceptSWUTerms"),
              (response) => adt("onAcceptResponse", api.isValid(response))
            )
          ]
        ];
      }
      case "onAcceptResponse": {
        const organization = state.organization;
        if (!organization) return [state, []];
        const succeeded = msg.value;
        if (!succeeded) {
          return [
            stopAcceptLoading(state),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.acceptedSWUTerms.error(organization))
                )
              )
            ]
          ];
        }
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("success", toasts.acceptedSWUTerms.success(organization))
              )
            ),
            component_.cmd.dispatch(
              component_.global.newRouteMsg(
                adt("orgEdit", {
                  orgId: organization.id,
                  tab: "swuQualification"
                }) as Route
              )
            )
          ]
        ];
      }
      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state, dispatch }) => {
    const organization = state.organization;
    if (!organization) return null;
    const { acceptedSWUTerms } = organization;
    return (
      <Row>
        <Col xs="12">
          <h1 className="mb-5">{TITLE}</h1>
          <Markdown
            source={state.body}
            openLinksInNewTabs
            className={acceptedSWUTerms ? "" : "mb-5"}
          />
          {acceptedSWUTerms || isAdmin(state.viewerUser) ? null : (
            <div className="d-flex flex-nowrap flex-row-reverse">
              <Link
                button
                className="ms-3"
                color="primary"
                onClick={() => dispatch(adt("accept"))}>
                Accept Terms & Conditions
              </Link>
              <Link
                color="secondary"
                dest={routeDest(
                  adt("orgEdit", {
                    orgId: organization.id,
                    tab: "swuQualification"
                  }) as Route
                )}>
                Cancel
              </Link>
            </div>
          )}
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
  getMetadata() {
    return makePageMetadata(TITLE);
  },
  getAlerts: getAlertsValid((state) => {
    const organization = state.organization;
    if (!organization) return component_.page.alerts.empty();
    const acceptedText = acceptedSWUTermsText(organization, "");
    return {
      info: acceptedText ? [{ text: acceptedText }] : []
    };
  })
};
