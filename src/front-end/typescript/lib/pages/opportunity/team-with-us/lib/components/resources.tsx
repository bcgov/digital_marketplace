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
import * as SelectMulti from "front-end/lib/components/form-field/select-multi";
import {
  CreateTWUResourceValidationErrors,
  TWUServiceArea,
  TWUResource,
  parseTWUServiceArea,
  CreateTWUResourceBody
} from "shared/lib/resources/opportunity/team-with-us";
import {
  Validation,
  invalid,
  mapInvalid,
  mapValid,
  valid
} from "shared/lib/validation";
import * as genericValidation from "shared/lib/validation/opportunity/utility";
import { twuServiceAreaToTitleCase } from "front-end/lib/pages/opportunity/team-with-us/lib";
import {
  arrayFromRange,
  arrayContainsGreaterThan1Check as isRemovalPermitted
} from "shared/lib";
import * as FormField from "front-end/lib/components/form-field";
import { getNumberSelectValue } from "front-end/lib/pages/opportunity/team-with-us/lib/components/form";
import { flatten } from "lodash";
import SKILLS from "shared/lib/data/skills";
import ALL_SERVICE_AREAS from "shared/lib/data/service-areas";

interface Resource {
  serviceArea: Immutable<Select.State>;
  targetAllocation: Immutable<Select.State>;
  mandatorySkills: Immutable<SelectMulti.State>;
  optionalSkills: Immutable<SelectMulti.State>;
  removeable: boolean;
}

export interface State {
  resources: Resource[];
}

export type Msg =
  | ADT<"addResource">
  | ADT<"deleteResource", number>
  | ADT<"serviceArea", { childMsg: Select.Msg; rIndex: number }>
  | ADT<"targetAllocation", { childMsg: Select.Msg; rIndex: number }>
  | ADT<"mandatorySkills", { childMsg: SelectMulti.Msg; rIndex: number }>
  | ADT<"optionalSkills", { childMsg: SelectMulti.Msg; rIndex: number }>;

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
  const idNamespace = String(Math.random());
  /**
   * Sets a single key/value pair for service area, or null
   *
   * @see {@link getSingleKeyValueOption}
   */
  const serviceArea: Select.Option | null = (() => {
    const v = resource?.serviceArea;
    if (!v) {
      return null;
    }
    return getSingleKeyValueOption(v);
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
      id: `${idNamespace}-twu-resource-service-area`,
      options: Select.objectToOptions(
        ALL_SERVICE_AREAS.reduce<Record<string, string>>(
          (acc, serviceArea) => ({ ...acc, [serviceArea]: serviceArea }),
          {}
        ),
        twuServiceAreaToTitleCase
      )
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
      id: `${idNamespace}-twu-resource-target-allocation`,
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
  const [mandatorySkillsState, mandatorySkillsCmds] = SelectMulti.init({
    errors: [],
    validate: (v) => {
      const strings = v.map(({ value }) => value);
      const validated0 = genericValidation.validateMandatorySkills(strings);
      const validated1 = mapValid(validated0 as Validation<string[]>, () => v);
      return mapInvalid(validated1, (es) => flatten(es));
    },
    child: {
      value:
        resource?.mandatorySkills.map((value) => ({
          value,
          label: value
        })) ?? [],
      id: `${idNamespace}-twu-resource-twu-mandatory-skills`,
      creatable: true,
      options: SelectMulti.stringsToOptions(SKILLS)
    }
  });
  const [optionalSkillsState, optionalSkillsCmds] = SelectMulti.init({
    errors: [],
    validate: (v) => {
      const strings = v.map(({ value }) => value);
      const validated0 = genericValidation.validateOptionalSkills(strings);
      const validated1 = mapValid(validated0 as Validation<string[]>, () => v);
      return mapInvalid(validated1, (es) => flatten(es));
    },
    child: {
      value:
        resource?.optionalSkills.map((value) => ({
          value,
          label: value
        })) ?? [],
      id: `${idNamespace}-twu-resource-optional-skills`,
      creatable: true,
      options: SelectMulti.stringsToOptions(SKILLS)
    }
  });
  return [
    {
      serviceArea: immutable(serviceAreaState),
      targetAllocation: immutable(targetAllocationState),
      mandatorySkills: immutable(mandatorySkillsState),
      optionalSkills: immutable(optionalSkillsState),
      removeable: true
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
      ),
      ...component_.cmd.mapMany(
        mandatorySkillsCmds,
        (childMsg) => adt("mandatorySkills", { childMsg, rIndex }) as Msg
      ),
      ...component_.cmd.mapMany(
        optionalSkillsCmds,
        (childMsg) => adt("optionalSkills", { childMsg, rIndex }) as Msg
      )
    ]
  ];
}

export type Errors = CreateTWUResourceValidationErrors[];
export function setErrors(
  state: Immutable<State>,
  errors: Errors = []
): Immutable<State> {
  return errors.reduce((acc, e, i) => {
    return acc
      .updateIn(["resources", i, "serviceArea"], (s) =>
        FormField.setErrors(s as Immutable<Select.State>, e.serviceArea || [])
      )
      .updateIn(["resources", i, "targetAllocation"], (s) =>
        FormField.setErrors(
          s as Immutable<Select.State>,
          e.targetAllocation || []
        )
      )
      .updateIn(["resources", i, "mandatorySkills"], (s) =>
        FormField.setErrors(
          s as Immutable<SelectMulti.State>,
          flatten(e.mandatorySkills ?? [])
        )
      )
      .updateIn(["resources", i, "optionalSkills"], (s) =>
        FormField.setErrors(
          s as Immutable<SelectMulti.State>,
          flatten(e.optionalSkills ?? [])
        )
      );
  }, state);
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state.resources.reduce((acc, r, i) => {
    return acc
      .updateIn(["resources", i, "serviceArea"], (s) =>
        FormField.validate(s as Immutable<Select.State>)
      )
      .updateIn(["resources", i, "targetAllocation"], (s) =>
        FormField.validate(s as Immutable<Select.State>)
      )
      .updateIn(["resources", i, "mandatorySkills"], (s) =>
        FormField.validate(s as Immutable<SelectMulti.State>)
      )
      .updateIn(["resources", i, "optionalSkills"], (s) =>
        FormField.validate(s as Immutable<SelectMulti.State>)
      );
  }, state);
}

export function isValid(state: Immutable<State>): boolean {
  if (!state.resources.length) {
    return false;
  }
  return state.resources.reduce((acc, r) => {
    return (
      acc &&
      FormField.isValid(r.serviceArea) &&
      FormField.isValid(r.targetAllocation) &&
      FormField.isValid(r.mandatorySkills) &&
      FormField.isValid(r.optionalSkills)
    );
  }, true as boolean);
}

export type Values = CreateTWUResourceBody[];

export function getValues(state: Immutable<State>): Values {
  return state.resources.reduce<Values>((acc, r, order) => {
    if (!acc) {
      return acc;
    }
    acc.push({
      serviceArea:
        parseTWUServiceArea(Select.getValue(r.serviceArea)) ??
        TWUServiceArea.FullStackDeveloper,
      targetAllocation: getNumberSelectValue(r.targetAllocation) || 0,
      mandatorySkills: SelectMulti.getValueAsStrings(r.mandatorySkills),
      optionalSkills: SelectMulti.getValueAsStrings(r.optionalSkills),
      order: order
    });
    return acc;
  }, []);
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  const [defaultResource, defaultCmds] = createResource(0);
  const [resources, cmds] = params.resources.length
    ? params.resources
        .map((resource, index) => createResource(index, resource))
        .reduce(
          ([accResources, accCmds], [r, cs]) => [
            [...accResources, r],
            [...accCmds, ...cs]
          ],
          [[], []] as component_.base.InitReturnValue<Resource[], Msg>
        )
    : [[defaultResource], defaultCmds];
  return [
    {
      resources: resources.map((resource, _, currentResources) => ({
        ...resource,
        removeable: isRemovalPermitted(currentResources)
      }))
    },
    cmds
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "addResource": {
      const [resource, cmds] = createResource(state.resources.length);
      const currentResources = [...state.resources, resource];
      return [
        state.set(
          "resources",
          currentResources.map((resource) => ({
            ...resource,
            removeable: isRemovalPermitted(currentResources)
          }))
        ),
        cmds
      ];
    }

    case "deleteResource": {
      return [
        state.set(
          "resources",
          state.resources
            .reduce((acc, r, index) => {
              return index === msg.value ? acc : [...acc, r];
            }, [] as Resource[])
            .map((resource, _, resources) => {
              return {
                ...resource,
                removeable: isRemovalPermitted(resources)
              };
            })
        ),
        []
      ];
    }

    case "serviceArea": {
      const componentMessage = msg.value.childMsg;
      const rIndex = msg.value.rIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["resources", `${rIndex}`, "serviceArea"],
        childUpdate: Select.update,
        childMsg: componentMessage,
        mapChildMsg: (value) => adt("serviceArea", { rIndex, childMsg: value })
      });
    }

    case "targetAllocation": {
      const { childMsg, rIndex } = msg.value;
      return component_.base.updateChild({
        state,
        childStatePath: ["resources", `${rIndex}`, "targetAllocation"],
        childUpdate: Select.update,
        childMsg,
        mapChildMsg: (value) =>
          adt("targetAllocation", { rIndex, childMsg: value })
      });
    }

    case "mandatorySkills": {
      const { childMsg, rIndex } = msg.value;
      return component_.base.updateChild({
        state,
        childStatePath: ["resources", `${rIndex}`, "mandatorySkills"],
        childUpdate: SelectMulti.update,
        childMsg,
        mapChildMsg: (value) =>
          adt("mandatorySkills", { rIndex, childMsg: value })
      });
    }

    case "optionalSkills": {
      const { childMsg, rIndex } = msg.value;
      return component_.base.updateChild({
        state,
        childStatePath: ["resources", `${rIndex}`, "optionalSkills"],
        childUpdate: SelectMulti.update,
        childMsg,
        mapChildMsg: (value) =>
          adt("optionalSkills", { rIndex, childMsg: value })
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
            <h3 className="mb-0">Resource {index + 1}</h3>
            {state.removeable ? (
              disabled ? null : (
                <Link
                  button
                  outline
                  size="sm"
                  color="info"
                  className="ms-4"
                  symbol_={leftPlacement(iconLinkSymbol("trash"))}
                  onClick={() => dispatch(adt("deleteResource", index))}>
                  Delete
                </Link>
              )
            ) : null}
          </div>
        </Col>
      </Row>
      <Row>
        <Col md="6" xs="12">
          <Select.view
            extraChildProps={{}}
            label="Service Area"
            placeholder="Service Area"
            help="Select the Service Area, Target Allocation, Mandatory and Optional skills for each resource. To add additional resources to your opportunity, use the 'Add a Resource' button below."
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

        <Col xs="12">
          <SelectMulti.view
            extraChildProps={{}}
            label="Mandatory Skills"
            placeholder="Mandatory Skills"
            help="Start typing to search for a skill from our list or to create your own skill"
            required
            disabled={disabled}
            state={state.mandatorySkills}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("mandatorySkills" as const, {
                childMsg: value,
                rIndex: index
              })
            )}
          />
        </Col>

        <Col xs="12">
          <SelectMulti.view
            extraChildProps={{}}
            label="Optional Skills"
            placeholder="Optional Skills"
            help="Select the skill(s) from the list provided that the successful proponent may possess that would be considered a bonus, or nice-to-have, but is/are not required in order to be awarded the opportunity. If you do not see the skill(s) that you are looking for, you may create a new skill by entering it into the field below."
            disabled={disabled}
            state={state.optionalSkills}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("optionalSkills" as const, { childMsg: value, rIndex: index })
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
