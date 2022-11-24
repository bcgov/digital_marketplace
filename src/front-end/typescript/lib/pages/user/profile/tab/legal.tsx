import { APP_TERMS_CONTENT_ID } from "front-end/config";
import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as AcceptNewTerms from "front-end/lib/components/accept-new-app-terms";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/user/profile/tab";
import Link, {
  emailDest,
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { COPY } from "shared/config";
import { formatDate, formatTime } from "shared/lib";
import { adt, ADT } from "shared/lib/types";

// Only vendors can view this tab.

type ModalId = "acceptNewTerms";

export interface State extends Tab.Params {
  showModal: ModalId | null;
  acceptNewTermsLoading: number;
  acceptNewTerms: Immutable<AcceptNewTerms.State>;
}

export type InnerMsg =
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"acceptNewTerms", AcceptNewTerms.Msg>
  | ADT<"submitAcceptNewTerms">
  | ADT<"onAcceptNewTermsResponse", AcceptNewTerms.AcceptNewTermsResponse>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = ({
  viewerUser,
  profileUser
}) => {
  const [acceptNewTermsState, acceptNewTermsCmds] = AcceptNewTerms.init({
    errors: [],
    child: {
      value: !!profileUser.acceptedTermsAt,
      id: "profile-legal-accept-new-terms"
    }
  });
  return [
    {
      profileUser,
      viewerUser,
      showModal: null,
      acceptNewTermsLoading: 0,
      acceptNewTerms: immutable(acceptNewTermsState)
    },
    component_.cmd.mapMany(acceptNewTermsCmds, (msg) =>
      adt("acceptNewTerms", msg)
    )
  ];
};

function hideModal(state: Immutable<State>): Immutable<State> {
  return state.set("showModal", null);
}

const startAcceptNewTermsLoading = makeStartLoading<State>(
  "acceptNewTermsLoading"
);
const stopAcceptNewTermsLoading = makeStopLoading<State>(
  "acceptNewTermsLoading"
);

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "showModal":
      return [state.set("showModal", msg.value), []];
    case "hideModal":
      return [hideModal(state), []];
    case "acceptNewTerms":
      return component_.base.updateChild({
        state,
        childStatePath: ["acceptNewTerms"],
        childUpdate: AcceptNewTerms.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("acceptNewTerms", value)
      });
    case "submitAcceptNewTerms":
      return AcceptNewTerms.submitAcceptNewTerms({
        state,
        userId: state.profileUser.id,
        startLoading: startAcceptNewTermsLoading,
        onAcceptNewTermsResponse(response) {
          return adt("onAcceptNewTermsResponse", response);
        }
      });
    case "onAcceptNewTermsResponse":
      return AcceptNewTerms.onAcceptNewTermsResponse<State, InnerMsg>({
        state,
        stopLoading: stopAcceptNewTermsLoading,
        response: msg.value
      });
    default:
      return [state, []];
  }
};

const TermsSubtext: component_.base.View<{
  children: component_.base.ViewElementChildren;
}> = ({ children }) => {
  return <div className="mt-2 text-secondary font-size-small">{children}</div>;
};

const view: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  const acceptedTerms = state.profileUser.acceptedTermsAt;
  const hasAcceptedLatest = !!acceptedTerms;
  return (
    <div>
      <Row>
        <Col xs="12">
          <h2>Policies, Terms & Agreements</h2>
          <p className="mb-0">
            In this section, you will find all of the policies, terms and
            agreements relevant to vendors of the Digital Marketplace.
          </p>
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <div className="mt-5 pt-5 border-top">
            <h3>Privacy Policy</h3>
            <div>
              Your personal information is being collected by the Ministry of
              Citizens’ Services under s.26(c) of the Freedom of Information and
              Protection of Privacy Act (FOIPPA). The collection, use and
              disclosure of your personal information is for the purpose of
              notifying, applying and awarding opportunities on the Digital
              Marketplace. If you have any questions, please contact: Zachary
              Woodward, Senior Director, Procurement, Ministry of Citizens’
              Services,{" "}
              <Link dest={emailDest(["procurementadvisory@gov.bc.ca"])}>
                procurementadvisory@gov.bc.ca
              </Link>
              .
            </div>
            <TermsSubtext>
              You agreed to the Digital Marketplace <i>Privacy Policy</i> when
              you created your Digital Marketplace account.
            </TermsSubtext>
          </div>
        </Col>
        <Col xs="12">
          <div className="mt-4">
            <h3>Terms & Conditions</h3>
            <div className="mt-3">
              <Link
                newTab
                dest={routeDest(adt("contentView", APP_TERMS_CONTENT_ID))}
                symbol_={
                  hasAcceptedLatest
                    ? undefined
                    : leftPlacement(iconLinkSymbol("warning"))
                }
                symbolClassName="text-warning">
                {COPY.appTermsTitle}
              </Link>
              {acceptedTerms ? (
                <TermsSubtext>
                  You agreed to the <i>{COPY.appTermsTitle}</i> on{" "}
                  {formatDate(acceptedTerms)} at{" "}
                  {formatTime(acceptedTerms, true)}.
                </TermsSubtext>
              ) : (
                <TermsSubtext>
                  The <i>{COPY.appTermsTitle}</i> have been updated. Please{" "}
                  <Link
                    newTab
                    dest={routeDest(adt("contentView", APP_TERMS_CONTENT_ID))}>
                    review the latest version
                  </Link>{" "}
                  and{" "}
                  <Link
                    onClick={() =>
                      dispatch(adt("showModal", "acceptNewTerms" as const))
                    }>
                    agree to the updated terms
                  </Link>
                  .
                </TermsSubtext>
              )}
            </div>
            <div className="mt-3">
              <Link
                newTab
                dest={routeDest(
                  adt("contentView", "code-with-us-terms-and-conditions")
                )}>
                Code With Us Terms & Conditions
              </Link>
            </div>
            <div className="mt-3">
              <Link
                newTab
                dest={routeDest(
                  adt("contentView", "sprint-with-us-terms-and-conditions")
                )}>
                Sprint With Us Terms & Conditions
              </Link>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  onInitResponse() {
    return component_.page.readyMsg();
  },
  getModal(state) {
    const hasAcceptedTerms = AcceptNewTerms.getCheckbox(state.acceptNewTerms);
    const isAcceptNewTermsLoading = state.acceptNewTermsLoading > 0;
    switch (state.showModal) {
      case null:
        return component_.page.modal.hide();
      case "acceptNewTerms":
        return AcceptNewTerms.makeModal<Msg>({
          loading: isAcceptNewTermsLoading,
          disabled: !hasAcceptedTerms || isAcceptNewTermsLoading,
          state: state.acceptNewTerms,
          mapMsg: (msg) => adt("acceptNewTerms", msg) as Msg,
          onSubmitMsg: adt("submitAcceptNewTerms"),
          onCloseMsg: adt("hideModal")
        });
    }
  }
};
