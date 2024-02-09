import * as FormField from "front-end/lib/components/form-field";
import * as Select from "front-end/lib/components/form-field/select";
import * as NumberField from "front-end/lib/components/form-field/number";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import { find } from "lodash";
import React from "react";
import { Col, Row } from "reactstrap";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import {
  CreateTWUProposalTeamMemberBody,
  CreateTWUProposalTeamMemberValidationErrors,
  TWUProposalTeamMember
} from "shared/lib/resources/proposal/team-with-us";
import { adt, ADT, Id } from "shared/lib/types";
import * as proposalValidation from "shared/lib/validation/proposal/team-with-us";
import { compareNumbers } from "shared/lib";
import { invalid, valid } from "shared/lib/validation";
import { TWUResource } from "shared/lib/resources/opportunity/team-with-us";
import { UpdateReturnValue } from "front-end/lib/framework/component/base";

export interface Params {
  orgId?: Id;
  affiliations: AffiliationMember[];
  proposalTeam: TWUProposalTeamMember[];
  resources: TWUResource[];
}

export interface Staff extends AffiliationMember {
  resource?: Id;
}

export interface TeamMember {
  resource: TWUResource;
  member: Immutable<Select.State>;
  hourlyRate: Immutable<NumberField.State>;
}

export interface State extends Omit<Params, "affiliations" | "orgId"> {
  orgId: Id | null;
  members: TeamMember[];
  staff: Staff[];
}

export type Msg =
  | ADT<"member", [number, Select.Msg]>
  | ADT<"hourlyRate", [number, NumberField.Msg]>;

function affiliationsToStaff(
  affiliations: AffiliationMember[],
  proposalTeam: TWUProposalTeamMember[]
): Staff[] {
  return affiliations.map((a) => {
    const existingTeamMember = find(
      proposalTeam,
      ({ member }) => member.id === a.user.id
    );
    return {
      ...a,
      resource: existingTeamMember?.resource
    };
  });
}

function getNonAddedStaffOptions(staff: Staff[]): Select.Options {
  return adt(
    "options",
    staff
      .filter((s) => {
        return !s.resource;
      })
      .map(({ user: { name, id } }) => ({
        label: name,
        value: id
      }))
  );
}

/**
 * Compares two tuples of users, existing users and users affiliated with an
 * organization.
 *
 * @param staff
 * @param existingMembers
 * @returns - one tuple of members
 */
function initTeam(
  resources: TWUResource[],
  staff: Staff[],
  existingMembers: TWUProposalTeamMember[]
): [TeamMember, component_.Cmd<Msg>[]][] {
  return resources
    .map((r, index) => {
      const existingTeamMember = find(
        existingMembers,
        ({ resource }) => resource === r.id
      );
      const selectedMemberOption = existingTeamMember
        ? {
            label: existingTeamMember.member.name,
            value: existingTeamMember.member.id
          }
        : null;
      const [memberState, memberCmds] = Select.init({
        errors: [],
        validate: (option) => {
          if (!option) {
            return invalid(["Please select a team member."]);
          }
          return valid(option);
        },
        child: {
          value: selectedMemberOption,
          id: "twu-proposal-member", // TODO: Better ID
          options: getNonAddedStaffOptions(staff)
        }
      });
      const [hourlyRateState, hourlyRateCmds] = NumberField.init({
        errors: [],
        validate: (v) => {
          if (v === null) {
            return invalid([`Please enter a valid hourly rate.`]);
          }
          return proposalValidation.validateTWUHourlyRate(v);
        },
        child: {
          value: existingTeamMember?.hourlyRate || null,
          id: "twu-proposal-hourly-rate", // TODO: Better ID
          min: 1
        }
      });
      return [
        {
          member: immutable(memberState),
          hourlyRate: immutable(hourlyRateState),
          resource: r
        },
        [
          ...component_.cmd.mapMany(
            memberCmds,
            (msg) => adt("member", [index, msg]) as Msg
          ),
          ...component_.cmd.mapMany(
            hourlyRateCmds,
            (msg) => adt("hourlyRate", [index, msg]) as Msg
          )
        ]
      ] as [TeamMember, component_.Cmd<Msg>[]];
    })
    .sort((a, b) => compareNumbers(a[0].resource.order, b[0].resource.order));
}

/**
 * Sets the state for 'members', 'staff', and 'orgId'
 *
 * @param state
 * @param affiliations
 * @param orgId
 */
export function setMembers(
  state: Immutable<State>,
  affiliations: AffiliationMember[],
  orgId: Id
): UpdateReturnValue<State, Msg> {
  const staff = affiliationsToStaff(affiliations, state.proposalTeam);
  const members = initTeam(state.resources, staff, state.proposalTeam);
  state = state
    .set(
      "members",
      members.map((m) => m[0])
    )
    .set("orgId", orgId)
    .set("staff", staff);
  return [
    state,
    members.reduce((acc, m) => [...acc, ...m[1]], [] as component_.Cmd<Msg>[])
  ];
}

/**
 * Initializes team before setMembers is called
 *
 * @param params
 * @returns
 */
export const init: component_.base.Init<Params, State, Msg> = (params) => {
  const { orgId, affiliations, proposalTeam, resources, ...paramsForState } =
    params;
  const staff = affiliationsToStaff(affiliations, proposalTeam);
  const members = initTeam(resources, staff, proposalTeam);
  return [
    {
      ...paramsForState,
      proposalTeam,
      resources,
      orgId: orgId || null,
      members: members.map((m) => m[0]),
      staff
    },
    members.reduce((acc, m) => [...acc, ...m[1]], [] as component_.Cmd<Msg>[])
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "member": {
      const [index] = msg.value;
      const prevMember = Select.getValue(state.members[index].member);
      return component_.base.updateChild({
        state,
        childStatePath: ["members", String(msg.value[0]), "member"],
        childUpdate: Select.update,
        childMsg: msg.value[1],
        mapChildMsg: (value) => adt("member", [msg.value[0], value]) as Msg,
        updateAfter: (state) => {
          const currMember = Select.getValue(state.members[index].member);
          // Adds resource ID to current member and removes it from the previous member
          const staffState = state.update("staff", (ms) =>
            ms.map((staff) => {
              return staff.user.id === currMember
                ? { ...staff, resource: state.resources[index].id }
                : staff.user.id === prevMember &&
                  staff.resource === state.resources[index].id
                ? { ...staff, resource: undefined }
                : staff;
            })
          );

          const members = staffState.members.reduce((acc, _, i) => {
            return acc.updateIn(["members", i, "member"], (s) =>
              Select.setOptions(
                s as Immutable<Select.State>,
                getNonAddedStaffOptions(staffState.staff)
              )
            );
          }, staffState);
          return [members, []];
        }
      });
    }

    case "hourlyRate":
      return component_.base.updateChild({
        state,
        childStatePath: ["members", String(msg.value[0]), "hourlyRate"],
        childUpdate: NumberField.update,
        childMsg: msg.value[1],
        mapChildMsg: (value) => adt("hourlyRate", [msg.value[0], value]) as Msg
      });
  }
};

export type Values = CreateTWUProposalTeamMemberBody[];

export function getValues(state: Immutable<State>): Values {
  return state.members.map((m) => ({
    member: Select.getValue(m.member),
    hourlyRate: FormField.getValue(m.hourlyRate) ?? 0,
    resource: m.resource.id
  }));
}

export type Errors = CreateTWUProposalTeamMemberValidationErrors[];

export function setErrors(
  state: Immutable<State>,
  errors: Errors = []
): Immutable<State> {
  return errors.reduce((acc, e, i) => {
    return acc
      .updateIn(["members", i, "member"], (s) =>
        FormField.setErrors(s as Immutable<Select.State>, e.member || [])
      )
      .updateIn(["members", i, "hourlyRate"], (s) =>
        FormField.setErrors(s as Immutable<Select.State>, e.hourlyRate || [])
      );
  }, state);
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state.members.reduce((acc, _, i) => {
    return acc
      .updateIn(["members", i, "member"], (s) =>
        FormField.validate(s as Immutable<Select.State>)
      )
      .updateIn(["members", i, "hourlyRate"], (s) =>
        FormField.validate(s as Immutable<NumberField.State>)
      );
  }, state);
}

function isMemberValid(member: TeamMember): boolean {
  return (
    FormField.isValid(member.member) && FormField.isValid(member.hourlyRate)
  );
}

export function isValid(state: Immutable<State>): boolean {
  return state.members.reduce((acc, m) => {
    return acc && isMemberValid(m);
  }, true as boolean);
}

interface MemberViewProps {
  index: number;
  member: TeamMember;
  disabled?: boolean;
  dispatch: component_.base.Dispatch<Msg>;
}

const MemberView: component_.base.View<MemberViewProps> = (props) => {
  const { member, dispatch, index, disabled } = props;
  // const isValid = isMemberValid(member);
  // const title = `Question ${index + 1}`;
  return (
    <Row>
      <p>{member.resource.serviceArea}</p>
      <p>{member.resource.targetAllocation}</p>
      <Col md="6" xs="12">
        <Select.view
          extraChildProps={{}}
          label="Resource Name"
          placeholder="Please select a resource name"
          help="Dunno"
          required
          disabled={disabled}
          state={member.member}
          dispatch={component_.base.mapDispatch(
            dispatch,
            (value) => adt("member" as const, [index, value]) as Msg
          )}
        />
      </Col>

      <Col md="6" xs="12">
        <NumberField.view
          extraChildProps={{ prefix: "$" }}
          label="Hourly Rate"
          placeholder="Hourly Rate"
          help="Dunno"
          required
          disabled={disabled}
          state={member.hourlyRate}
          dispatch={component_.base.mapDispatch(
            dispatch,
            (value) => adt("hourlyRate" as const, [index, value]) as Msg
          )}
        />
      </Col>
    </Row>
    // <Accordion
    //   className={""}
    //   toggle={() => dispatch(adt("toggleAccordion", index))}
    //   color="info"
    //   title={title}
    //   titleClassName="h3 mb-0"
    //   icon={isValid ? undefined : "exclamation-circle"}
    //   iconColor={isValid ? undefined : "warning"}
    //   iconWidth={2}
    //   iconHeight={2}
    //   chevronWidth={1.5}
    //   chevronHeight={1.5}
    //   open={member.isAccordianOpen}>
    //   <p style={{ whiteSpace: "pre-line" }}>{member.question.question}</p>
    //   <div className="mb-3 small text-secondary d-flex flex-column flex-md-row flex-nowrap">
    //     <div className="mb-2 mb-md-0">
    //       {member.question.wordLimit} word limit
    //     </div>
    //     <Separator spacing="2" color="secondary" className="d-none d-md-block">
    //       |
    //     </Separator>
    //     <div>Scored out of {member.question.score}</div>
    //   </div>
    //   <Alert color="primary" fade={false} className="mb-4">
    //     <div style={{ whiteSpace: "pre-line" }}>
    //       {member.question.guideline}
    //     </div>
    //   </Alert>
    //   <RichMarkdownEditor.view
    //     required
    //     label={`${title} Response`}
    //     placeholder={`${title} Response`}
    //     help={`Provide your response to this question. You may use Markdown to write your response, however please do not include any images or links, as they will be redacted. Please ensure to stay within the question's response word limit.`}
    //     extraChildProps={{
    //       style: { height: "50vh", minHeight: "400px" }
    //     }}
    //     className="mb-0"
    //     disabled={disabled}
    //     state={member.response}
    //     dispatch={component_.base.mapDispatch(
    //       dispatch,
    //       (value) => adt("response", [index, value]) as Msg
    //     )}
    //   />
    // </Accordion>
  );
};

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: component_.base.View<Props> = (props) => {
  const { state, disabled } = props;
  return (
    <div>
      {state.members.map((member, i) => (
        <Row key={`twu-proposal-team-question-response-${i}`}>
          <Col xs="12" className={i < state.resources.length - 1 ? "mb-4" : ""}>
            <MemberView
              index={i}
              disabled={disabled}
              member={member}
              dispatch={props.dispatch}
            />
          </Col>
        </Row>
      ))}
    </div>
  );
};
