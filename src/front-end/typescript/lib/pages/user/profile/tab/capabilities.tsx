import { Route } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/user/profile/tab";
import Icon from "front-end/lib/views/icon";
import Link, { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import React from "react";
import { Col, Row, Spinner } from "reactstrap";
import { CAPABILITIES_WITH_DESCRIPTIONS } from "shared/lib/data/capabilities";
import {
  usersAreEquivalent,
  UpdateValidationErrors,
  User
} from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";

export interface Capability {
  name: string;
  description: string[];
  checked: boolean;
  open: boolean;
}

export interface State extends Tab.Params {
  capabilities: Capability[];
  loading: number | null; //index of capability loading
}

export type InnerMsg =
  | ADT<"toggleOpen", number>
  | ADT<"toggleChecked", number>
  | ADT<
      "onToggleCheckedResponse",
      api.ResponseValidation<User, UpdateValidationErrors>
    >;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  return [
    {
      ...params,
      loading: null,
      capabilities: CAPABILITIES_WITH_DESCRIPTIONS.map((capability) => ({
        ...capability,
        checked:
          params.profileUser.capabilities.indexOf(capability.name) !== -1,
        open: false
      }))
    },
    []
  ];
};

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "toggleChecked": {
      const capabilities = state.capabilities.filter((c, i) =>
        i === msg.value ? !c.checked : c.checked
      );
      return [
        state.set("loading", msg.value),
        [
          api.users.update<Msg>()(
            state.profileUser.id,
            adt(
              "updateCapabilities",
              capabilities.map(({ name }) => name)
            ),
            (response) => adt("onToggleCheckedResponse", response)
          )
        ]
      ];
    }
    case "onToggleCheckedResponse": {
      state = state.set("loading", null);
      const response = msg.value;
      if (api.isValid(response)) {
        state = state.update("capabilities", (cs) =>
          cs.map((c) => ({
            ...c,
            checked: response.value.capabilities.indexOf(c.name) !== -1
          }))
        );
      }
      return [state, []];
    }
    case "toggleOpen":
      return [
        state.update("capabilities", (cs) =>
          cs.map((c, i) => {
            return i === msg.value ? { ...c, open: !c.open } : c;
          })
        ),
        []
      ];

    default:
      return [state, []];
  }
};

interface CapabilityProps extends Capability {
  dispatch: component_.base.Dispatch<Msg>;
  index: number;
  loading: boolean;
  disabled: boolean;
}

const Capability: component_.base.View<CapabilityProps> = ({
  dispatch,
  index,
  loading,
  disabled,
  name,
  description,
  checked,
  open
}) => {
  return (
    <div className="border border-top-0">
      <div
        className={`${
          open ? "bg-light border-bottom" : ""
        } p-3 d-flex align-items-center`}
        style={{ cursor: "pointer" }}
        onClick={() => dispatch(adt("toggleOpen", index))}>
        <Link
          onClick={(e) => {
            if (e) {
              e.stopPropagation();
            }
            dispatch(adt("toggleChecked", index));
          }}
          symbol_={leftPlacement(
            iconLinkSymbol(checked ? "check-circle" : "circle")
          )}
          symbolClassName={checked ? "text-success" : "text-body"}
          color="body"
          disabled={loading || disabled}>
          <span>{name}</span>
          {loading ? (
            <Spinner color="secondary" size="sm" className="ms-3" />
          ) : null}
        </Link>
        <Icon
          color="info"
          className="ms-auto"
          name={open ? "chevron-up" : "chevron-down"}
        />
      </div>
      {open ? (
        <ul className={open ? "py-5 pe-4 ps-5 m-0" : "d-none"}>
          {description.map((item, i) => (
            <li key={`capability-${index}-description-${i}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = (props) => {
  const { state, dispatch } = props;
  return (
    <Row>
      <Col xs="12">
        <h2>Capabilities & Skills</h2>
        <p className="mb-5">
          Sprint With Us opportunities require teams with the capabilities and
          skills shown below. Select the capabilities that you possess by
          clicking on their names or checkboxes. Let us know what you can do!
        </p>
      </Col>
      <Col xs="12">
        <h4 className="mb-4">Capabilities</h4>
        <div className="border-top">
          {state.capabilities.map((capability, i) => (
            <Capability
              key={`user-profile-capability-${i}`}
              {...capability}
              index={i}
              loading={state.loading === i}
              disabled={
                !!state.loading ||
                !usersAreEquivalent(state.viewerUser, state.profileUser)
              }
              dispatch={dispatch}
            />
          ))}
        </div>
      </Col>
    </Row>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  onInitResponse() {
    return component_.page.readyMsg();
  }
};
