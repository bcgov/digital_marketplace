import { APP_TERMS_CONTENT_ID } from "front-end/config";
import { WithState } from "front-end/lib";
import * as UserResource from "shared/lib/resources/user";
import { Route } from "front-end/lib/app/types";
import * as FormField from "front-end/lib/components/form-field";
import * as Checkbox from "front-end/lib/components/form-field/checkbox";
import { Immutable, component as component_ } from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import Link, { routeDest } from "front-end/lib/views/link";
import React from "react";
import { COPY } from "shared/config";
import { adt, Id } from "shared/lib/types";

export type State = Checkbox.State;
export type Msg = Checkbox.Msg;
export type Params = Checkbox.Params;

export const init = Checkbox.init;
export const update = Checkbox.update;

export function setCheckbox(
  state: Immutable<State>,
  v: Checkbox.Value
): Immutable<State> {
  return FormField.setValue(state, v);
}

export function getCheckbox(state: Immutable<State>): Checkbox.Value {
  return FormField.getValue(state);
}

export interface MakeModalParams<ParentMsg> {
  loading: boolean;
  disabled: boolean;
  state: Immutable<State>;
  onSubmitMsg: ParentMsg;
  onCloseMsg: ParentMsg;
  mapMsg(msg: Msg): ParentMsg;
}
export function makeModal<ParentMsg>(
  params: MakeModalParams<ParentMsg>
): component_.page.Modal<ParentMsg> {
  return component_.page.modal.show({
    title: "Review Updated Terms and Conditions",
    body: (dispatch) => (
      <View
        disabled={params.loading}
        state={params.state}
        dispatch={component_.base.mapDispatch(dispatch, params.mapMsg)}
      />
    ),
    onCloseMsg: params.onCloseMsg,
    actions: [
      {
        text: "Agree & Continue",
        color: "primary",
        msg: params.onSubmitMsg,
        button: true,
        loading: params.loading,
        disabled: params.disabled
      },
      {
        text: "Cancel",
        color: "secondary",
        msg: params.onCloseMsg
      }
    ]
  });
}

export type AcceptNewTermsResponse = api.ResponseValidation<
  UserResource.User,
  UserResource.UpdateValidationErrors
>;

export interface SubmitAcceptNewTermsParams<ParentState, ParentInnerMsg> {
  state: Immutable<ParentState>;
  userId: Id;
  startLoading: WithState<ParentState>;
  onAcceptNewTermsResponse(response: AcceptNewTermsResponse): ParentInnerMsg;
}

export function submitAcceptNewTerms<ParentState, ParentInnerMsg>(
  params: SubmitAcceptNewTermsParams<ParentState, ParentInnerMsg>
): component_.base.UpdateReturnValue<
  ParentState,
  component_.global.Msg<ParentInnerMsg, Route>
> {
  return [
    params.startLoading(params.state),
    [
      api.users.update<ParentInnerMsg>()(
        params.userId,
        adt("acceptTerms"),
        (response) => params.onAcceptNewTermsResponse(response)
      )
    ]
  ];
}

export interface OnAcceptNewTermsResponseParams<ParentState> {
  state: Immutable<ParentState>;
  stopLoading: WithState<ParentState>;
  response: api.ResponseValidation<
    UserResource.User,
    UserResource.UpdateValidationErrors
  >;
}

export function onAcceptNewTermsResponse<ParentState, ParentInnerMsg>(
  params: OnAcceptNewTermsResponseParams<ParentState>
): component_.base.UpdateReturnValue<
  ParentState,
  component_.global.Msg<ParentInnerMsg, Route>
> {
  if (api.isValid(params.response)) {
    return [
      params.state,
      [component_.cmd.dispatch(component_.global.reloadMsg())]
    ];
  } else {
    return [params.stopLoading(params.state), []];
  }
}

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}
const View: component_.base.View<Props> = ({ disabled, state, dispatch }) => {
  const termsRoute = adt("contentView", APP_TERMS_CONTENT_ID) as Route;
  return (
    <div>
      <p>
        Please ensure you have reviewed the latest version of the{" "}
        <Link newTab dest={routeDest(termsRoute)}>
          {COPY.appTermsTitle}
        </Link>
        .
      </p>
      <Checkbox.view
        extraChildProps={{
          inlineLabel: (
            <span>
              I acknowledge that I have read, fully understand and agree to the{" "}
              <i>{COPY.appTermsTitle}</i>.
            </span>
          )
        }}
        disabled={disabled}
        className="fw-bold"
        state={state}
        dispatch={dispatch}
      />
      <p className="mb-0">
        Also, make sure you have saved your work before continuing. Any unsaved
        information in forms will be lost.
      </p>
    </div>
  );
};

export const view = View;

export const component: component_.base.Component<Params, State, Msg> = {
  init,
  update,
  view
};

export default component;
