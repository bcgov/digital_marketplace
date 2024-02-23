import * as FormField from "front-end/lib/components/form-field";
import * as Select from "front-end/lib/components/form-field/select";
import * as NumberField from "front-end/lib/components/form-field/number";
import Accordion from "front-end/lib/views/accordion";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import { find } from "lodash";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  AffiliationMember,
  MembershipStatus
} from "shared/lib/resources/affiliation";
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
import { twuServiceAreaToTitleCase } from "front-end/lib/pages/opportunity/team-with-us/lib";
import Skills from "front-end/lib/views/skills";

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
  isImportantInformationAccordionOpen: boolean;
}

export type Msg =
  | ADT<"member", [number, Select.Msg]>
  | ADT<"hourlyRate", [number, NumberField.Msg]>
  | ADT<"toggleImportantInformationAccordion">;

function affiliationsToStaff(
  affiliations: AffiliationMember[],
  proposalTeam: TWUProposalTeamMember[]
): Staff[] {
  return affiliations.reduce<Staff[]>((acc, a) => {
    if (a.membershipStatus !== MembershipStatus.Active) {
      return acc;
    }
    const existingTeamMember = find(
      proposalTeam,
      ({ member }) => member.id === a.user.id
    );
    return [
      ...acc,
      {
        ...a,
        resource: existingTeamMember?.resource
      }
    ];
  }, []);
}

function getNonAddedStaffOptions(staff: Staff[]): Select.Options {
  return adt(
    "options",
    staff.reduce<Select.Option[]>((acc, { resource, user: { name, id } }) => {
      if (resource) {
        return acc;
      }
      return [...acc, { label: name, value: id }];
    }, [])
  );
}

/**
 * Compares two tuples of users, existing users and users affiliated with an
 * organization.
 *
 * @param resources
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
      const idNamespace = String(Math.random());

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
          id: `${idNamespace}-team-member`,
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
          id: `${idNamespace}-team-hourly-rate`,
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
      staff,
      isImportantInformationAccordionOpen: true
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

    case "toggleImportantInformationAccordion":
      return [
        state.update("isImportantInformationAccordionOpen", (v) => !v),
        []
      ];
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
  return (
    <div className={index > 0 ? "pt-4 mt-2 border-top" : ""}>
      <h5 className="bg-c-proposal-twu-form-team-member-heading p-2 pt-3 pb-3">
        Resource {index + 1}
      </h5>
      <Row className="mb-2">
        <Col md="9" xs="7">
          <Select.view
            extraChildProps={{}}
            label="Resource Name"
            placeholder="Please select a resource name"
            required
            disabled={disabled}
            state={member.member}
            dispatch={component_.base.mapDispatch(
              dispatch,
              (value) => adt("member" as const, [index, value]) as Msg
            )}
          />
        </Col>
        <Col md="3" xs="5" className="text-center">
          <NumberField.view
            extraChildProps={{ prefix: "$" }}
            label="Hourly Rate"
            placeholder="Hourly Rate"
            required
            disabled={disabled}
            state={member.hourlyRate}
            dispatch={component_.base.mapDispatch(
              dispatch,
              (value) => adt("hourlyRate" as const, [index, value]) as Msg
            )}
          />
        </Col>
        <div className="w-100"></div>
        <Col md="9" xs="7">
          <div className="font-weight-bold d-flex flex-nowrap">
            Service Area
          </div>
          <p>{twuServiceAreaToTitleCase(member.resource.serviceArea)}</p>
        </Col>
        <Col md="3" xs="5">
          <div className="font-weight-bold d-flex flex-nowrap justify-content-center">
            Allocation
          </div>
          <p className="text-center">{member.resource.targetAllocation}%</p>
        </Col>
      </Row>
      <Row>
        <Col>
          <div className="font-weight-bold mb-2">Mandatory Skills</div>
          <Skills skills={member.resource.mandatorySkills} />
        </Col>
      </Row>
    </div>
  );
};

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: component_.base.View<Props> = (props) => {
  const { state, disabled, dispatch } = props;
  const memberText = `member${state.members.length ? "s" : ""}`;
  return (
    <div>
      <h4 className="text-capitalize">Team {memberText}</h4>
      <Accordion
        toggle={() => dispatch(adt("toggleImportantInformationAccordion"))}
        color="black"
        icon="exclamation-circle"
        iconWidth={2}
        iconHeight={2}
        title="Important Information"
        titleClassName="h4 mb-0"
        chevronWidth={1.5}
        chevronHeight={1.5}
        open={state.isImportantInformationAccordionOpen}
        className="mb-1">
        <Row>
          <Col xs="12">
            <p>
              To satisfy this opportunity&apos;s requirements, your team member
              must only consist of confirmed (non-pending) {memberText} of the
              selected organization.
            </p>
            <p className="font-weight-bold">
              Proponents take note of the following pricing rules and
              requirements:
            </p>
            <ol className="li-paren-lower-alpha">
              <li>
                Proponent pricing quoted will be taken to mean and deemed to be:
                <ol className="li-paren-lower-roman">
                  <li>in Canadian dollars;</li>
                  <li>
                    inclusive of all costs or expenses that may be incurred with
                    respect to the services specified by the Competition Notice;
                  </li>
                  <li>exclusive of any applicable taxes.</li>
                </ol>
              </li>
              <li>
                In addition, the following rules apply to pricing bid by
                Proponents:
                <ol className="li-paren-lower-roman">
                  <li>
                    Team With Us Terms & Conditions section 1.8 regarding
                    pricing and its provisions are incorporated herein by this
                    reference.
                  </li>
                  <li>
                    All pricing bid is required to be unconditional and
                    unqualified. If any pricing bid does not meet this
                    requirement, the Proponent&apos;s Proposal may be rejected
                    resulting in the Proponent being eliminated from the
                    Competition Notice competition.
                  </li>
                  <li>
                    Failure to provide pricing where required by the Competition
                    Notice will result in the Proponent being unable to submit a
                    Proposal.
                  </li>
                  <li>
                    Entering the numerical figure of “$0”, “$zero”, or the like
                    in response to a call for a specific dollar amount will
                    result in the Proponent being unable to submit a Proposal.
                  </li>
                  <li>
                    The Contract will provide that the Contractor may request an
                    increase in the bid pricing for any extension term of the
                    Contract, limited to any increases, if any, as supported by
                    the Canadian Consumer Price Index or 3% whichever is lower.
                  </li>
                </ol>
              </li>
            </ol>
            <p>
              Please provide the hourly rate you are proposing for this
              opportunity.
            </p>
          </Col>
        </Row>
      </Accordion>
      {state.members.map((member, i) => (
        <Row key={`twu-proposal-team-question-response-${i}`}>
          <Col xs="12">
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
