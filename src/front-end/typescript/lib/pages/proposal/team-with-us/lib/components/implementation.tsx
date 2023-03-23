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
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import Link, {
  iconLinkSymbol,
  imageLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { compareStrings, find, formatDate } from "shared/lib";
import {
  AffiliationMember,
  memberIsPending
} from "shared/lib/resources/affiliation";
import { adt, ADT, Id } from "shared/lib/types";
import {
  CreateTWUTeamProposalBody,
  CreateTWUTeamProposalBodyValidationErrors,
  TWUOpportunityProposal,
  TWUProposalTeamMember
} from "shared/lib/resources/proposal/team-with-us";

export interface Params {
  orgId?: Id;
  affiliations: AffiliationMember[];
  opportunity?: TWUOpportunityProposal;
}

type ModalId = ADT<"addTeamMembers"> | ADT<"viewTeamMember", Member>;

export interface Member extends AffiliationMember {
  index: number;
  added: boolean;
  toBeAdded: boolean;
}

export interface State extends Omit<Params, "affiliations" | "orgId"> {
  idNamespace: string;
  orgId: Id | null;
  showModal: ModalId | null;
  members: Member[];
  membersTable: Immutable<Table.State>;
}

export type Msg =
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"toggleAffiliationToBeAdded", number>
  | ADT<"addTeamMembers">
  | ADT<"removeTeamMember", Id>
  | ADT<"membersTable", Table.Msg>;

/**
 * Compares two tuples of users, existing users and users affiliated with an
 * organization.
 *
 * @param affiliations
 * @param existingMembers
 * @returns - one tuple of members
 */
function affiliationsToMembers(
  affiliations: AffiliationMember[],
  existingMembers: TWUProposalTeamMember[]
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
        added: !!existingTeamMember,
        toBeAdded: false
      };
    })
    .sort((a, b) => compareStrings(a.user.name, b.user.name));
}

/**
 * Sets the state for 'members' and 'orgId'
 *
 * @param state
 * @param affiliations
 * @param orgId
 */
export function setAffiliations(
  state: Immutable<State>,
  affiliations: AffiliationMember[],
  orgId: Id
): Immutable<State> {
  state = state
    .set(
      "members",
      affiliationsToMembers(
        affiliations,
        state.opportunity?.proposalMembers || []
      )
    )
    .set("orgId", orgId);
  return state;
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  const { opportunity } = params;
  const { affiliations, orgId, ...paramsForState } = params;
  const members = affiliationsToMembers(
    affiliations,
    opportunity?.proposalMembers || []
  );
  const [membersTableState, membersTableCmds] = Table.init({
    idNamespace: `twu-proposal-implementation-members-${Math.random()}`
  });
  return [
    {
      ...paramsForState,
      idNamespace: String(Math.random()),
      orgId: orgId || null,
      showModal: null,
      members,
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
      return [state, []];
    }

    case "removeTeamMember":
      state = state.update("members", (ms) =>
        ms.map((m) => {
          const shouldRemove = m.user.id === msg.value;
          return {
            ...m,
            added: shouldRemove ? false : m.added
          };
        })
      );
      return [state, []];

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

export type Values = CreateTWUTeamProposalBody;

/**
 * Gets the user id of each member that's added to a proposal
 *
 * @param state
 */
export function getValues(state: Immutable<State>): Values {
  return {
    members: getAddedMembers(state).map(({ user }) => ({
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

export type Errors = CreateTWUTeamProposalBodyValidationErrors;

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
  return !!addedMembers.length && areAllMembersConfirmed(addedMembers);
}

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  title: string;
  icon: AvailableIcons;
  iconColor?: ThemeColor;
  disabled?: boolean;
  className?: string;
}

const Dates: component_.base.View<Props> = ({ state }) => {
  const opportunity = state.opportunity;
  if (!opportunity) {
    return null;
  }
  return (
    <Row className="mb-4">
      <Col xs="12" className="d-flex flex-nowrap align-items-center">
        <Icon name="calendar" width={0.9} height={0.9} className="mr-1" />
        <span className="font-weight-bold mr-2">Phase Dates</span>
        <span>
          {formatDate(opportunity.startDate)} to{" "}
          {formatDate(opportunity.completionDate)}
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
  const { addedMembers, dispatch, disabled } = params;
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
          {memberIsPending(m) ? <PendingBadge className="ml-3" /> : null}
        </div>
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

export const view: component_.base.View<Props> = (props) => {
  const { state } = props;
  return (
    <Row className="mt-5" {...state}>
      <Dates {...props} />
      <TeamMembers {...props} />
    </Row>
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
                <div className="border-top border-left">
                  {nonAddedMembers.map((m, i) => {
                    return (
                      <div
                        key={`twu-proposal-phase-affiliation-${i}`}
                        className="d-flex flex-nowrap align-items-center py-2 px-3 border-right border-bottom">
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
                            className="rounded-circle border mr-2"
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
                          <PendingBadge className="ml-3" />
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
