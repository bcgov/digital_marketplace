import { Route } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import {
  makeViewTeamMemberModal,
  PendingBadge
} from "front-end/lib/pages/organization/lib/views/team-member";
import { userAvatarPath } from "front-end/lib/pages/user/lib";
import { ThemeColor } from "front-end/lib/types";
import Accordion from "front-end/lib/views/accordion";
import Capabilities, { Capability } from "front-end/lib/views/capabilities";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import Link, {
  iconLinkSymbol,
  imageLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Input, Row } from "reactstrap";
import { compareStrings, find, formatDate } from "shared/lib";
import {
  AffiliationMember,
  memberIsPending,
  membersHaveCapability
} from "shared/lib/resources/affiliation";
import { SWUOpportunityPhase } from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateSWUProposalPhaseBody,
  CreateSWUProposalPhaseValidationErrors,
  SWUProposalPhase,
  SWUProposalTeamMember
} from "shared/lib/resources/proposal/sprint-with-us";
import { adt, ADT, Id } from "shared/lib/types";

export interface Params {
  orgId?: Id;
  affiliations: AffiliationMember[];
  opportunityPhase?: SWUOpportunityPhase;
  proposalPhase?: SWUProposalPhase;
  isAccordionOpen: boolean;
}

type ModalId = ADT<"addTeamMembers"> | ADT<"viewTeamMember", Member>;

export interface Member extends AffiliationMember {
  index: number;
  scrumMaster: boolean;
  added: boolean;
  toBeAdded: boolean;
}

export interface State extends Omit<Params, "affiliations" | "orgId"> {
  idNamespace: string;
  orgId: Id | null;
  showModal: ModalId | null;
  members: Member[];
  membersTable: Immutable<Table.State>;
  capabilities: Capability[];
}

export type Msg =
  | ADT<"toggleAccordion">
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"toggleAffiliationToBeAdded", number>
  | ADT<"addTeamMembers">
  | ADT<"setScrumMaster", Id>
  | ADT<"removeTeamMember", Id>
  | ADT<"membersTable", Table.Msg>;

export function setIsAccordionOpen(
  state: Immutable<State>,
  isAccordionOpen: boolean
): Immutable<State> {
  return state.set("isAccordionOpen", isAccordionOpen);
}

function affiliationsToMembers(
  affiliations: AffiliationMember[],
  existingMembers: SWUProposalTeamMember[]
): Member[] {
  return affiliations
    .map((a, index) => {
      const existingTeamMember = find(
        existingMembers,
        ({ member }) => member.id === a.user.id
      );
      return {
        ...a,
        index,
        scrumMaster: existingTeamMember?.scrumMaster || false,
        added: !!existingTeamMember,
        toBeAdded: false
      };
    })
    .sort((a, b) => compareStrings(a.user.name, b.user.name));
}

export function determineCapabilities(
  members: Member[],
  opportunityPhase?: SWUOpportunityPhase
): Capability[] {
  return opportunityPhase
    ? opportunityPhase.requiredCapabilities.map((c) => ({
        ...c,
        checked: membersHaveCapability(members, c.capability)
      }))
    : [];
}

/**
 * Sets the state with added members and members from the opportunity phase
 * already saved in state, while determining if the members have capabilities
 * checked.
 *
 * @param state
 */
function resetCapabilities(state: Immutable<State>): Immutable<State> {
  return state.set(
    "capabilities",
    determineCapabilities(getAddedMembers(state), state.opportunityPhase)
  );
}

function enforceScrumMaster(state: Immutable<State>): Immutable<State> {
  let hasScrumMaster = false;
  for (const m of state.members) {
    hasScrumMaster = m.added && m.scrumMaster;
  }
  if (!hasScrumMaster) {
    return state.update("members", (ms) => {
      for (const m of ms) {
        if (m.added && !hasScrumMaster) {
          m.scrumMaster = true;
          hasScrumMaster = true;
        } else {
          m.scrumMaster = false;
        }
      }
      return ms;
    });
  }
  return state.set(
    "capabilities",
    determineCapabilities(getAddedMembers(state), state.opportunityPhase)
  );
}

export function setAffiliations(
  state: Immutable<State>,
  affiliations: AffiliationMember[],
  orgId: Id
): Immutable<State> {
  state = state
    .set(
      "members",
      affiliationsToMembers(affiliations, state.proposalPhase?.members || [])
    )
    .set("orgId", orgId);
  return resetCapabilities(state);
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  const { opportunityPhase, proposalPhase } = params;
  const { affiliations, orgId, ...paramsForState } = params;
  const members = affiliationsToMembers(
    affiliations,
    proposalPhase?.members || []
  );
  const [membersTableState, membersTableCmds] = Table.init({
    idNamespace: `swu-proposal-phase-members-${Math.random()}`
  });
  return [
    {
      ...paramsForState,
      idNamespace: String(Math.random()),
      orgId: orgId || null,
      showModal: null,
      members,
      capabilities: determineCapabilities(
        filterAddedMembers(members, true),
        opportunityPhase
      ),
      membersTable: immutable(membersTableState)
    },
    component_.cmd.mapMany(
      membersTableCmds,
      (msg) => adt("membersTable", msg) as Msg
    )
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "toggleAccordion":
      return [state.update("isAccordionOpen", (v) => !v), []];

    case "showModal":
      return [state.set("showModal", msg.value), []];

    case "hideModal":
      return [state.set("showModal", null), []];

    case "toggleAffiliationToBeAdded":
      return [
        state.update("members", (ms) =>
          ms.map((a) => {
            return a.index === msg.value
              ? { ...a, toBeAdded: !a.toBeAdded }
              : a;
          })
        ),
        []
      ];

    case "addTeamMembers": {
      state = state.set("showModal", null).update("members", (ms) =>
        ms.map((a) => ({
          ...a,
          added: a.added || a.toBeAdded,
          toBeAdded: false
        }))
      );
      state = enforceScrumMaster(state);
      return [resetCapabilities(state), []];
    }

    case "setScrumMaster":
      return [
        state.update("members", (ms) =>
          ms.map((m) => ({
            ...m,
            scrumMaster: m.user.id === msg.value
          }))
        ),
        []
      ];

    case "removeTeamMember":
      state = state.update("members", (ms) =>
        ms.map((m) => {
          const shouldRemove = m.user.id === msg.value;
          return {
            ...m,
            added: shouldRemove ? false : m.added,
            scrumMaster: shouldRemove ? false : m.scrumMaster
          };
        })
      );
      state = enforceScrumMaster(state);
      return [resetCapabilities(state), []];

    case "membersTable":
      return component_.base.updateChild({
        state,
        childStatePath: ["membersTable"],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "membersTable", value })
      });
  }
};

export type Values = Pick<CreateSWUProposalPhaseBody, "members">;

export function getValues(state: Immutable<State>): Values {
  return {
    members: getAddedMembers(state).map(({ user, scrumMaster }) => ({
      scrumMaster,
      member: user.id
    }))
  };
}

function filterAddedMembers(members: Member[], isAdded: boolean): Member[] {
  return members.filter(({ added }) => isAdded === added);
}

export function getAddedMembers(state: Immutable<State>): Member[] {
  return filterAddedMembers(state.members, true);
}

export function getNonAddedMembers(state: Immutable<State>): Member[] {
  return filterAddedMembers(state.members, false);
}

export type Errors = CreateSWUProposalPhaseValidationErrors;

/**
 * No need to set errors as the fields themselves can't result in errors.
 * TODO - find a better solution than disabling eslint
 */
export function setErrors(
  state: Immutable<State>,
  errors?: Errors // eslint-disable-line @typescript-eslint/no-unused-vars
): Immutable<State> {
  return state;
}

// Nothing to visibly validate for this component.
export function validate(state: Immutable<State>): Immutable<State> {
  return state;
}

function areAllCapabilitiesChecked(capabilities: Capability[]): boolean {
  for (const c of capabilities) {
    if (!c.checked) {
      return false;
    }
  }
  return true;
}

function areAllMembersConfirmed(members: Member[]): boolean {
  for (const m of members) {
    if (memberIsPending(m)) {
      return false;
    }
  }
  return true;
}

export function isValid(state: Immutable<State>): boolean {
  const addedMembers = getAddedMembers(state);
  return (
    !!addedMembers.length &&
    areAllMembersConfirmed(addedMembers) &&
    areAllCapabilitiesChecked(state.capabilities)
  );
}

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  title: string;
  icon: AvailableIcons;
  iconColor?: ThemeColor;
  disabled?: boolean;
  className?: string;
}

const Dates: component_.base.View<Props> = ({ state }) => {
  const opportunityPhase = state.opportunityPhase;
  if (!opportunityPhase) {
    return null;
  }
  return (
    <Row className="mb-4">
      <Col xs="12" className="d-flex flex-nowrap align-items-center">
        <Icon name="calendar" width={0.9} height={0.9} className="me-1" />
        <span className="fw-bold me-2">Phase Dates</span>
        <span>
          {formatDate(opportunityPhase.startDate)} to{" "}
          {formatDate(opportunityPhase.completionDate)}
        </span>
      </Col>
    </Row>
  );
};

function membersTableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Team Member",
      className: "text-nowrap",
      style: {
        width: "100%",
        minWidth: "240px"
      }
    },
    {
      children: "Scrum Master",
      className: "text-center text-nowrap",
      style: {
        width: "0px"
      }
    },
    {
      children: null,
      style: {
        width: "0px"
      }
    }
  ];
}

interface MemberTableBodyRowsParams
  extends Pick<Props, "dispatch" | "disabled"> {
  idNamespace: string;
  addedMembers: Member[];
}

function membersTableBodyRows(
  params: MemberTableBodyRowsParams
): Table.BodyRows {
  const { addedMembers, idNamespace, dispatch, disabled } = params;
  return addedMembers.map((m) => [
    {
      children: (
        <div className="d-flex align-items-center flex-nowrap">
          <Link
            onClick={() =>
              dispatch(adt("showModal", adt("viewTeamMember" as const, m)))
            }
            symbol_={leftPlacement(imageLinkSymbol(userAvatarPath(m.user)))}>
            {m.user.name}
          </Link>
          {memberIsPending(m) ? <PendingBadge className="ms-3" /> : null}
        </div>
      )
    },
    {
      className: "text-center align-middle",
      children: (
        <Input
          id={`${idNamespace}-phase-scrum-master-${m.id}`}
          checked={m.scrumMaster}
          disabled={disabled}
          type="radio"
          onChange={(e) => {
            if (e.currentTarget.checked) {
              dispatch(adt("setScrumMaster", m.user.id));
            }
          }}
        />
      )
    },
    {
      children: disabled ? null : (
        <Link
          button
          size="sm"
          symbol_={leftPlacement(iconLinkSymbol("user-times"))}
          onClick={() => dispatch(adt("removeTeamMember", m.user.id))}
          color="danger">
          Remove
        </Link>
      )
    }
  ]);
}

const TeamMembers: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  const addedMembers = getAddedMembers(state);
  return (
    <Row className="mb-5">
      <Col xs="12">
        <h4>Team Members</h4>
        <p className="mb-0">
          To satisfy this phase{"'"}s requirements, your team must only consist
          of confirmed (non-pending) members of the selected organization.
        </p>
        {disabled ? null : (
          <Link
            button
            outline
            color="primary"
            size="sm"
            disabled={disabled}
            className="mt-3"
            onClick={() =>
              dispatch(adt("showModal", adt("addTeamMembers")) as Msg)
            }
            symbol_={leftPlacement(iconLinkSymbol("user-plus"))}>
            Add Team Member(s)
          </Link>
        )}
      </Col>
      {addedMembers.length ? (
        <Col xs="12" className="mt-4">
          <Table.view
            headCells={membersTableHeadCells()}
            bodyRows={membersTableBodyRows({
              addedMembers,
              dispatch,
              disabled,
              idNamespace: state.idNamespace
            })}
            state={state.membersTable}
            dispatch={component_.base.mapDispatch(dispatch, (v) =>
              adt("membersTable" as const, v)
            )}
          />
        </Col>
      ) : null}
    </Row>
  );
};

const CapabilitiesView: component_.base.View<Props> = ({ state }) => {
  return (
    <Row>
      <Col xs="12">
        <h4>Required Capabilities</h4>
        <p className="mb-4">
          This list will automatically update to reflect the combined
          capabilities of your selected team (includes pending team members). To
          satisfy this phase{"'"}s requirements, your team must collectively
          possess all capabilities listed here.
        </p>
      </Col>
      <Col xs="12">
        <Capabilities grid capabilities={state.capabilities} />
      </Col>
    </Row>
  );
};

export const view: component_.base.View<Props> = (props) => {
  const { state, title, icon, iconColor, dispatch, className } = props;
  return (
    <Accordion
      className={className}
      toggle={() => dispatch(adt("toggleAccordion"))}
      color="info"
      title={title}
      titleClassName="h3 mb-0"
      icon={icon}
      iconWidth={2}
      iconHeight={2}
      iconClassName="me-3"
      iconColor={iconColor}
      chevronWidth={1.5}
      chevronHeight={1.5}
      open={state.isAccordionOpen}>
      <Dates {...props} />
      <TeamMembers {...props} />
      <CapabilitiesView {...props} />
    </Accordion>
  );
};

export const getModal: component_.page.GetModal<State, Msg> = (state) => {
  if (!state.showModal) {
    return component_.page.modal.hide();
  }
  switch (state.showModal.tag) {
    case "viewTeamMember":
      return makeViewTeamMemberModal({
        member: state.showModal.value,
        onCloseMsg: adt("hideModal") as Msg
      });

    case "addTeamMembers": {
      const nonAddedMembers = getNonAddedMembers(state);
      return component_.page.modal.show({
        title: "Add Team Member(s)",
        onCloseMsg: adt("hideModal") as Msg,
        body: (dispatch) => {
          if (!state.orgId) {
            return null;
          }
          return (
            <div>
              <p>
                Select the team member(s) that you want to propose to be part of
                your team for this opportunity. If you do not see the team
                member that you want to add, you must send them a{" "}
                <Link
                  newTab
                  dest={routeDest(
                    adt("orgEdit", { orgId: state.orgId, tab: "team" }) as Route
                  )}>
                  request to join your organization
                </Link>
                .
              </p>
              {nonAddedMembers.length ? (
                <div className="border-top border-start">
                  {nonAddedMembers.map((m, i) => {
                    return (
                      <div
                        key={`swu-proposal-phase-affiliation-${i}`}
                        className="d-flex flex-nowrap align-items-center py-2 px-3 border-end border-bottom">
                        <Link
                          onClick={() =>
                            dispatch(adt("toggleAffiliationToBeAdded", m.index))
                          }
                          symbol_={leftPlacement(
                            iconLinkSymbol(
                              m.toBeAdded ? "check-circle" : "circle"
                            )
                          )}
                          symbolClassName={
                            m.toBeAdded ? "text-success" : "text-body"
                          }
                          className="text-nowrap flex-nowrap"
                          color="body">
                          <img
                            className="rounded-circle border me-2"
                            style={{
                              width: "1.75rem",
                              height: "1.75rem",
                              objectFit: "cover"
                            }}
                            src={userAvatarPath(m.user)}
                          />
                          {m.user.name}
                        </Link>
                        {memberIsPending(m) ? (
                          <PendingBadge className="ms-3" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <strong>
                  This organization does not have any additional team members
                  that can be added to this phase.
                </strong>
              )}
            </div>
          );
        },
        actions: [
          {
            text: "Add Team Member(s)",
            disabled: !nonAddedMembers.reduce(
              (acc, { toBeAdded }) => acc || toBeAdded,
              false as boolean
            ),
            button: true,
            color: "primary",
            icon: "user-plus",
            msg: adt("addTeamMembers")
          },
          {
            text: "Cancel",
            color: "secondary",
            msg: adt("hideModal")
          }
        ]
      });
    }
  }
};
