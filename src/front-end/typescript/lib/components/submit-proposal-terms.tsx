import { APP_TERMS_CONTENT_ID } from "front-end/config";
import { Route } from "front-end/lib/app/types";
import * as FormField from "front-end/lib/components/form-field";
import * as Checkbox from "front-end/lib/components/form-field/checkbox";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import Link, { routeDest } from "front-end/lib/views/link";
import React from "react";
import { COPY } from "shared/config";
import { ADT, adt } from "shared/lib/types";

export interface State {
  proposal: Immutable<Checkbox.State>;
  app: Immutable<Checkbox.State>;
}

export type Msg = ADT<"proposal", Checkbox.Msg> | ADT<"app", Checkbox.Msg>;

export interface Params {
  proposal: Checkbox.Params;
  app: Checkbox.Params;
}

export const init: component_.base.Init<Params, State, Msg> = ({
  proposal,
  app
}) => {
  const [proposalState, proposalCmds] = Checkbox.init(proposal);
  const [appState, appCmds] = Checkbox.init(app);
  return [
    {
      proposal: immutable(proposalState),
      app: immutable(appState)
    },
    [
      ...component_.cmd.mapMany(
        proposalCmds,
        (msg) => adt("proposal", msg) as Msg
      ),
      ...component_.cmd.mapMany(appCmds, (msg) => adt("app", msg) as Msg)
    ]
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "proposal":
      return component_.base.updateChild({
        state,
        childStatePath: ["proposal"],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: (v) => adt("proposal", v) as Msg
      });
    case "app":
      return component_.base.updateChild({
        state,
        childStatePath: ["app"],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: (v) => adt("app", v) as Msg
      });
  }
};

export function setProposalCheckbox(
  state: Immutable<State>,
  v: Checkbox.Value
): Immutable<State> {
  return state.update("proposal", (s) => FormField.setValue(s, v));
}

export function getProposalCheckbox(state: Immutable<State>): Checkbox.Value {
  return FormField.getValue(state.proposal);
}

export function setAppCheckbox(
  state: Immutable<State>,
  v: Checkbox.Value
): Immutable<State> {
  return state.update("app", (s) => FormField.setValue(s, v));
}

export function getAppCheckbox(state: Immutable<State>): Checkbox.Value {
  return FormField.getValue(state.app);
}

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  opportunityType: "Sprint With Us" | "Code With Us" | "Team With Us";
  action: "submitting" | "submitting changes to";
  termsTitle: string;
  termsRoute: Route;
}

export const view: component_.base.View<Props> = ({
  opportunityType,
  action,
  termsTitle,
  termsRoute,
  state,
  dispatch
}) => {
  return (
    <div>
      <p>
        Please ensure you have reviewed the{" "}
        <Link newTab dest={routeDest(termsRoute)}>
          {termsTitle}
        </Link>{" "}
        and{" "}
        <Link newTab dest={routeDest(adt("contentView", APP_TERMS_CONTENT_ID))}>
          {COPY.appTermsTitle}
        </Link>{" "}
        prior to {action} your proposal for this {opportunityType} opportunity.
      </p>
      <Checkbox.view
        extraChildProps={{
          inlineLabel: (
            <span>
              I acknowledge that I have read, fully understand and agree to the{" "}
              <i>{termsTitle}</i>.
            </span>
          )
        }}
        className="fw-bold"
        state={state.proposal}
        dispatch={component_.base.mapDispatch(
          dispatch,
          (v) => adt("proposal", v) as Msg
        )}
      />
      <Checkbox.view
        extraChildProps={{
          inlineLabel: (
            <span>
              I acknowledge that I have read, fully understand and agree to the{" "}
              <i>{COPY.appTermsTitle}</i>.
            </span>
          )
        }}
        className="fw-bold"
        state={state.app}
        dispatch={component_.base.mapDispatch(
          dispatch,
          (v) => adt("app", v) as Msg
        )}
      />
    </div>
  );
};

export const component: component_.base.Component<Params, State, Msg, Props> = {
  init,
  update,
  view
};

export default component;
