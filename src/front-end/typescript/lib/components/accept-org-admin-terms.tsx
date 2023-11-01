import * as FormField from "front-end/lib/components/form-field";
import * as Checkbox from "front-end/lib/components/form-field/checkbox";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import React from "react";
import { ADT, adt } from "shared/lib/types";

export interface State {
  orgAdmin: Immutable<Checkbox.State>;
}

export type Msg = ADT<"orgAdmin", Checkbox.Msg>;

export type Params = Checkbox.Params;

export const init: component_.base.Init<Params, State, Msg> = (orgAdmin) => {
  const [orgAdminState, orgAdminCmds] = Checkbox.init(orgAdmin);
  return [
    {
      orgAdmin: immutable(orgAdminState)
    },
    component_.cmd.mapMany(orgAdminCmds, (msg) => adt("orgAdmin", msg) as Msg)
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "orgAdmin":
      return component_.base.updateChild({
        state,
        childStatePath: ["orgAdmin"],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: (v) => adt("orgAdmin", v) as Msg
      });
  }
};

export function setOrgAdminCheckbox(
  state: Immutable<State>,
  v: Checkbox.Value
): Immutable<State> {
  return state.update("orgAdmin", (s) => FormField.setValue(s, v));
}

export function getOrgAdminCheckbox(state: Immutable<State>): Checkbox.Value {
  return FormField.getValue(state.orgAdmin);
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
        className="font-weight-bold"
        state={state.orgAdmin}
        dispatch={component_.base.mapDispatch(
          dispatch,
          (v) => adt("orgAdmin", v) as Msg
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
