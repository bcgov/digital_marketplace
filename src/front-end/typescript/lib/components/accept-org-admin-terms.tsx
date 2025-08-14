import * as FormField from "front-end/lib/components/form-field";
import * as Checkbox from "front-end/lib/components/form-field/checkbox";
import { Immutable, component as component_ } from "front-end/lib/framework";
import React from "react";

export type State = Checkbox.State;
export type Msg = Checkbox.Msg;
export type Params = Checkbox.Params;

export const init = Checkbox.init;
export const update = Checkbox.update;

export function setOrgAdminCheckbox(
  state: Immutable<State>,
  v: Checkbox.Value
): Immutable<State> {
  return FormField.setValue(state, v);
}

export function getOrgAdminCheckbox(state: Immutable<State>): Checkbox.Value {
  return FormField.getValue(state);
}

export type Props = component_.base.ComponentViewProps<State, Msg>;

export const view: component_.base.View<Props> = ({ state, dispatch }) => {
  return (
    <div>
      <p>
        By giving admin powers to this user, they will be able to create, edit,
        and submit legally binding Proposals in response to Competition Notices
        on behalf of your organization.
      </p>
      <Checkbox.view
        extraChildProps={{
          inlineLabel:
            "By checking the box, you confirm that you are making this user an agent of your organization for the purposes of responding to Competition Notices."
        }}
        className="fw-bold"
        state={state}
        dispatch={dispatch}
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
