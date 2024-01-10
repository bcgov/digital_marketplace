import { Col, Row } from "reactstrap";
import Link, { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import { ADT, adt } from "shared/lib/types";
import React from "react";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import * as Select from "front-end/lib/components/form-field/select";
import {
  TWUResource,
  TWUServiceArea
} from "shared/lib/resources/opportunity/team-with-us";
import { invalid, valid } from "shared/lib/validation";
import { twuServiceAreaToTitleCase } from "front-end/lib/pages/opportunity/team-with-us/lib";
import { arrayFromRange } from "shared/lib";

interface Resource {
  serviceArea: Immutable<Select.State>;
  targetAllocation: Immutable<Select.State>;
}

export interface State {
  resources: Resource[];
}

export type Msg =
  | ADT<"addResource">
  | ADT<"deleteResource", number>
  | ADT<"serviceArea", { childMsg: Select.Msg; rIndex: number }>
  | ADT<"targetAllocation", { childMsg: Select.Msg; rIndex: number }>;

export interface Params {
  resources: TWUResource[];
}

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

/**
 * Local helper function to obtain and modify the key of
 * (enum) TWUServiceArea if given the value.
 *
 * @see {@link TWUServiceArea}
 *
 * @param v - a value from the key/value pair of TWUServiceArea
 * @returns - a single label/value pair for a select list
 */
function getSingleKeyValueOption(v: TWUServiceArea): Select.Option {
  return {
    label: twuServiceAreaToTitleCase(v),
    value: v
  };
}

function createResource(
  rIndex: number,
  resource?: TWUResource
): component_.base.InitReturnValue<Resource, Msg> {
  /**
   * Sets a single key/value pair for service area, or null
   *
   * @see {@link getSingleKeyValueOption}
   */
  const serviceArea: Select.Option | null = (() => {
    const v = resource?.serviceArea ? resource.serviceArea : null;
    if (!v) {
      return null;
    }
    return getSingleKeyValueOption(v as TWUServiceArea);
  })();

  const selectedTargetAllocationOption = resource?.targetAllocation
    ? {
        label: String(resource.targetAllocation),
        value: String(resource.targetAllocation)
      }
    : null;

  const [serviceAreaState, serviceAreaCmds] = Select.init({
    errors: [],
    validate: (option) => {
      if (!option) {
        return invalid(["Please select a Service Area."]);
      }
      return valid(option);
    },
    child: {
      value: serviceArea,
      id: "twu-service-area",
      options: Select.objectToOptions(TWUServiceArea)
    }
  });
  const [targetAllocationState, targetAllocationCmds] = Select.init({
    errors: [],
    validate: (option) => {
      if (!option) {
        return invalid(["Please select a Resource Target Allocation."]);
      }
      return valid(option);
    },
    child: {
      value: selectedTargetAllocationOption ?? null,
      id: "twu-opportunity-target-allocation",
      options: adt(
        "options",
        [
          ...arrayFromRange<Select.Option>(10, {
            offset: 1,
            step: 10,
            cb: (number) => {
              const value = String(number);
              return { value, label: value };
            }
          })
        ].reverse()
      )
    }
  });

  return [
    {
      serviceArea: immutable(serviceAreaState),
      targetAllocation: immutable(targetAllocationState)
    },
    [
      ...component_.cmd.mapMany(
        serviceAreaCmds,
        (childMsg) => adt("serviceArea", { childMsg, rIndex }) as Msg
      ),
      ...component_.cmd.mapMany(
        targetAllocationCmds,
        (childMsg) =>
          adt("targetAllocation", {
            childMsg,
            rIndex
          }) as Msg
      )
    ]
  ];
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  const [resources, cmds] = params.resources
    .map((resource, index) => createResource(index, resource))
    .reduce(
      ([accResources, accCmds], [r, cs]) => [
        [...accResources, r],
        [...accCmds, ...cs]
      ],
      [[], []] as component_.base.InitReturnValue<Resource[], Msg>
    );
  return [
    {
      resources
    },
    cmds
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "addResource": {
      const [resource, cmds] = createResource(state.resources.length);
      return [state.set("resources", [...state.resources, resource]), cmds];
    }

    case "deleteResource": {
      return [
        state.set(
          "resources",
          state.resources.reduce((acc, r, index) => {
            return index === msg.value ? acc : [...acc, r];
          }, [] as Resource[])
        ),
        []
      ];
    }

    case "serviceArea": {
      const componentMessage = msg.value.childMsg;
      const rIndex = msg.value.rIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["resources", `${rIndex}`, "resource"],
        childUpdate: Select.update,
        childMsg: componentMessage,
        mapChildMsg: (value) => adt("serviceArea", { rIndex, childMsg: value })
      });
    }

    case "targetAllocation": {
      const componentMessage = msg.value.childMsg;
      const rIndex = msg.value.rIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["resources", `${rIndex}`, "targetAllocation"],
        childUpdate: Select.update,
        childMsg: componentMessage,
        mapChildMsg: (value) =>
          adt("targetAllocation", { rIndex, childMsg: value })
      });
    }
  }
};

interface ResourceViewProps {
  index: number;
  state: Resource;
  dispatch: component_.base.Dispatch<Msg>;
  disabled?: boolean;
}

const ResourceView: component_.base.View<ResourceViewProps> = (props) => {
  const { index, state, dispatch, disabled } = props;
  return (
    <div className={index > 0 ? "pt-5 mt-5 border-top" : ""}>
      <Row>
        <Col xs="12">
          <div className="d-flex align-items-center mb-4">
            <h3 className="mb-0">Question {index + 1}</h3>
            {disabled ? null : (
              <Link
                button
                outline
                size="sm"
                color="info"
                className="ml-4"
                symbol_={leftPlacement(iconLinkSymbol("trash"))}
                onClick={() => dispatch(adt("deleteResource", index))}>
                Delete
              </Link>
            )}
          </div>
        </Col>
      </Row>
      <Row>
        <Col md="6" xs="12">
          <Select.view
            extraChildProps={{}}
            label="Service Area"
            placeholder="Service Area"
            help="Each TWU Opportunity must be matched to one and only one Service Area."
            required
            disabled={disabled}
            state={state.serviceArea}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("serviceArea" as const, { childMsg: value, rIndex: index })
            )}
          />
        </Col>

        <Col md="6" xs="12">
          <Select.view
            extraChildProps={{ prefix: "%" }}
            label="Resource Target Allocation"
            placeholder="% Allocation"
            help="Indicate the desired Full-Time Equivalency (FTE) allocation in terms of a 40-hour work week. For example, a resource working 20 hours a week would be allocated at 50% FTE."
            required
            disabled={disabled}
            state={state.targetAllocation}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("targetAllocation" as const, {
                childMsg: value,
                rIndex: index
              })
            )}
          />
        </Col>
      </Row>
    </div>
  );
};
const AddButton: component_.base.View<Props> = ({
  state,
  disabled,
  dispatch
}) => {
  if (disabled) {
    return null;
  }
  return (
    <Row>
      <Col xs="12">
        <div className={state.resources.length ? "mt-5 pt-5 border-top" : ""}>
          <Link
            button
            outline
            disabled={disabled}
            size="sm"
            color="primary"
            symbol_={leftPlacement(iconLinkSymbol("plus-circle"))}
            onClick={() => {
              dispatch(adt("addResource"));
            }}>
            Add a Resource
          </Link>
        </div>
      </Col>
    </Row>
  );
};

export const view: component_.base.View<Props> = (props) => {
  const { state, disabled } = props;
  return (
    <div>
      {state.resources.map((resource, i) => (
        <ResourceView
          key={`resource-${i}`}
          index={i}
          disabled={disabled}
          state={resource}
          dispatch={props.dispatch}
        />
      ))}
      <AddButton {...props} />
    </div>
  );
};
