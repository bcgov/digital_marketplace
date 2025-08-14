import { Immutable, component as component_ } from "front-end/lib/framework";
import Link, { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { ADT, adt } from "shared/lib/types";

export interface Capability {
  capability: string;
  checked: boolean;
  fullTime: boolean;
}

export type CapabilityWithOptionalFullTime = Omit<Capability, "fullTime"> & {
  fullTime?: boolean;
};

export interface Params {
  capabilities: CapabilityWithOptionalFullTime[];
  showFullTimeSwitch?: boolean;
}

export interface State {
  capabilities: Capability[];
  showFullTimeSwitch: boolean;
}

export type Msg = ADT<"toggleChecked", number> | ADT<"toggleFullTime", number>;

export type Values = Array<Omit<Capability, "checked">>;

export function getValues(state: Immutable<State>): Values {
  return state.capabilities.reduce((acc, { capability, checked, fullTime }) => {
    return checked
      ? [
          ...acc,
          {
            capability,
            fullTime
          }
        ]
      : acc;
  }, [] as Values);
}

export function isAtLeastOneChecked(state: Immutable<State>): boolean {
  for (const c of state.capabilities) {
    if (c.checked) {
      return true;
    }
  }
  return false;
}

export function areAllChecked(state: Immutable<State>): boolean {
  return state.capabilities.reduce(
    (acc, { checked }) => acc && checked,
    true as boolean
  );
}

export function setCapabilities(
  state: Immutable<State>,
  cs: CapabilityWithOptionalFullTime[]
): Immutable<State> {
  return state.set(
    "capabilities",
    cs.map((c) => ({
      ...c,
      fullTime: !!c.fullTime
    }))
  );
}

export const init: component_.base.Init<Params, State, Msg> = ({
  capabilities,
  showFullTimeSwitch = false
}) => {
  return [
    {
      showFullTimeSwitch,
      capabilities: capabilities.map((c) => ({
        ...c,
        fullTime: !!c.fullTime
      }))
    },
    []
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "toggleChecked":
      return [
        state.update("capabilities", (cs) =>
          cs.map((c, i) => {
            return i === msg.value ? { ...c, checked: !c.checked } : c;
          })
        ),
        []
      ];
    case "toggleFullTime":
      return [
        state.update("capabilities", (cs) =>
          cs.map((c, i) => {
            return i === msg.value ? { ...c, fullTime: !c.fullTime } : c;
          })
        ),
        []
      ];
  }
};

interface FullTimeSwitchProps {
  fullTime: boolean;
  disabled?: boolean;
  index: number;
  dispatch: component_.base.Dispatch<Msg>;
}

const FullTimeSwitch: component_.base.View<FullTimeSwitchProps> = ({
  fullTime,
  disabled,
  index,
  dispatch
}) => {
  const selectedClassName = (selected: boolean) => {
    return selected
      ? "bg-c-capability-grid-switch text-white"
      : "text-secondary border";
  };
  const baseSwitchClassName =
    "d-flex justify-content-center align-items-center";
  const width = "2rem";
  const padding = "0.15rem 0.25rem";
  return (
    <div
      onClick={() => !disabled && dispatch(adt("toggleFullTime", index))}
      style={{ cursor: "pointer" }}
      className={`d-flex align-items-stretch font-size-extra-small fw-bold ms-auto ${
        disabled ? "disabled o-75" : ""
      }`}>
      <div
        className={`${baseSwitchClassName} ${selectedClassName(
          !fullTime
        )} rounded-start border-end-0`}
        style={{ width, padding }}>
        P/T
      </div>
      <div
        className={`${baseSwitchClassName} ${selectedClassName(
          fullTime
        )} rounded-end border-start-0`}
        style={{ width, padding }}>
        F/T
      </div>
    </div>
  );
};

interface CapabilityProps extends Capability {
  index: number;
  showFullTimeSwitch: boolean;
  disabled?: boolean;
  dispatch: component_.base.Dispatch<Msg>;
}

const Capability: component_.base.View<CapabilityProps> = ({
  capability,
  fullTime,
  checked,
  dispatch,
  showFullTimeSwitch,
  index,
  disabled
}) => {
  return (
    <div className="border-end border-bottom d-flex flex-nowrap align-items-center p-2">
      <Link
        onClick={() => dispatch(adt("toggleChecked", index))}
        symbol_={leftPlacement(
          iconLinkSymbol(checked ? "check-circle" : "circle")
        )}
        symbolClassName={checked ? "text-success" : "text-body"}
        className="py-1 font-size-small text-nowrap"
        iconSymbolSize={0.9}
        color="body"
        disabled={disabled}>
        {capability}
      </Link>
      {checked && showFullTimeSwitch ? (
        <FullTimeSwitch
          fullTime={fullTime}
          disabled={disabled}
          index={index}
          dispatch={dispatch}
        />
      ) : null}
    </div>
  );
};

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row className="g-0 border-top border-start">
      {state.capabilities.map((c, i) => (
        <Col xs="12" md="6" key={`phase-capability-${i}`}>
          <Capability
            {...c}
            showFullTimeSwitch={state.showFullTimeSwitch}
            dispatch={dispatch}
            disabled={disabled}
            index={i}
          />
        </Col>
      ))}
    </Row>
  );
};
