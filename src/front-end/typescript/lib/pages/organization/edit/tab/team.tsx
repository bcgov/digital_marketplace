import { makeStartLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as AcceptOrgAdminTerms from "front-end/lib/components/accept-org-admin-terms";
import * as FormField from "front-end/lib/components/form-field";
import * as ShortText from "front-end/lib/components/form-field/short-text";
import * as Table from "front-end/lib/components/table";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/organization/edit/tab";
import * as toasts from "front-end/lib/pages/organization/lib/toasts";
import EditTabHeader from "front-end/lib/pages/organization/lib/views/edit-tab-header";
import {
  makeViewTeamMemberModal,
  OwnerBadge,
  PendingBadge
} from "front-end/lib/pages/organization/lib/views/team-member";
import { userAvatarPath } from "front-end/lib/pages/user/lib";
import Capabilities, { Capability } from "front-end/lib/views/capabilities";
import Icon from "front-end/lib/views/icon";
import Link, {
  Props as LinkProps,
  iconLinkSymbol,
  imageLinkSymbol,
  leftPlacement
} from "front-end/lib/views/link";
import React from "react";
import { Col, Input, Row, Spinner } from "reactstrap";
import CAPABILITIES from "shared/lib/data/capabilities";
import {
  AffiliationMember,
  memberIsOwner,
  memberIsPending,
  membersHaveCapability,
  MembershipType,
  Affiliation,
  CreateValidationErrors,
  memberIsOrgAdmin,
  UpdateValidationErrors
} from "shared/lib/resources/affiliation";
import {
  isAdmin,
  isVendor,
  usersAreEquivalent
} from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { validateUserEmail } from "shared/lib/validation/affiliation";

interface NonOwnerMember extends AffiliationMember {
  newOwner: boolean;
  index: number;
}

type ModalId =
  | ADT<"addTeamMembers">
  | ADT<"viewTeamMember", AffiliationMember>
  | ADT<"removeTeamMember", AffiliationMember>
  | ADT<"approveAffiliation", AffiliationMember>
  | ADT<"acceptOrgAdminStatusTerms", AffiliationMember>
  | ADT<"changeOwner">;

export interface State extends Tab.Params {
  showModal: ModalId | null;
  addTeamMembersLoading: number;
  changeOwnerLoading: number;
  removeTeamMemberLoading: Id | null; //Id of affiliation, not user
  approveAffiliationLoading: Id | null; //Id of affiliation, not user
  updateAdminStatusLoading: Id | null;
  membersTable: Immutable<Table.State>;
  capabilities: Capability[];
  addTeamMembersEmails: Array<Immutable<ShortText.State>>;
  acceptOrgAdminTerms: Immutable<AcceptOrgAdminTerms.State>;
  nonOwnerMembers: NonOwnerMember[];
}

export type InnerMsg =
  | ADT<"addTeamMembers">
  | ADT<"onAddTeamMembersResponse", AddTeamMemberState>
  | ADT<"removeTeamMember", AffiliationMember> //Id of affiliation, not user
  | ADT<"onRemoveTeamMemberResponse", [boolean, AffiliationMember]>
  | ADT<"approveAffiliation", AffiliationMember>
  | ADT<"onApproveAffiliationResponse", [boolean, AffiliationMember]>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"membersTable", Table.Msg>
  | ADT<"addTeamMembersEmails", [number, ShortText.Msg]> //[index, msg]
  | ADT<"addTeamMembersEmailsAddField">
  | ADT<"addTeamMembersEmailsRemoveField", number> //index
  | ADT<"onUpdateAdminStatus", AffiliationMember>
  | ADT<
      "onUpdateAdminStatusResponse",
      api.ResponseValidation<Affiliation, UpdateValidationErrors>
    >
  | ADT<"acceptOrgAdminTerms", AcceptOrgAdminTerms.Msg>
  | ADT<"toggleNewOwner", number>
  | ADT<"changeOwner", NonOwnerMember>
  | ADT<"onChangeOwnerResponse", boolean>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export function determineCapabilities(
  members: AffiliationMember[]
): Capability[] {
  //Don't include pending members in capability calculation.
  members = members.filter((m) => !memberIsPending(m));
  return CAPABILITIES.map((capability) => ({
    capability,
    checked: membersHaveCapability(members, capability)
  }));
}

function initAddTeamMemberEmailField(): component_.base.InitReturnValue<
  ShortText.State,
  ShortText.Msg
> {
  return ShortText.init({
    errors: [],
    validate: validateUserEmail,
    child: {
      id: "organization-team-add-team-members-emails",
      type: "email",
      value: ""
    }
  });
}

function resetAddTeamMemberEmails(
  state: Immutable<State>
): component_.base.UpdateReturnValue<State, Msg> {
  const [fieldState, fieldCmds] = initAddTeamMemberEmailField();
  return [
    state.set("addTeamMembersEmails", [immutable(fieldState)]),
    component_.cmd.mapMany(
      fieldCmds,
      (msg) => adt("addTeamMembersEmails", [0, msg]) as Msg
    )
  ];
}

function resetNonOwnerMembers(members: AffiliationMember[]): NonOwnerMember[] {
  return members
    .filter((m) => !memberIsOwner(m))
    .map((m, i) => ({ ...m, index: i, newOwner: false }));
}

function isAffiliationAdminStatusChecked(
  affiliationMember: AffiliationMember
): boolean {
  return (
    memberIsOwner(affiliationMember) || memberIsOrgAdmin(affiliationMember)
  );
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [tableState, tableCmds] = Table.init({
    idNamespace: "organization-members"
  });
  const [addTeamMemberEmailState, addTeamMemberEmailCmds] =
    initAddTeamMemberEmailField();
  const [acceptOrgAdminTermsState, acceptOrgAdminTermsCmds] =
    AcceptOrgAdminTerms.init({
      errors: [],
      child: {
        value: false,
        id: "accept-org-admin-terms"
      }
    });
  return [
    {
      ...params,
      showModal: null,
      addTeamMembersLoading: 0,
      changeOwnerLoading: 0,
      removeTeamMemberLoading: null,
      approveAffiliationLoading: null,
      updateAdminStatusLoading: null,
      capabilities: determineCapabilities(params.affiliations),
      membersTable: immutable(tableState),
      addTeamMembersEmails: [immutable(addTeamMemberEmailState)],
      acceptOrgAdminTerms: immutable(acceptOrgAdminTermsState),
      nonOwnerMembers: resetNonOwnerMembers(params.affiliations)
    },
    [
      ...component_.cmd.mapMany(
        tableCmds,
        (msg) => adt("membersTable", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        addTeamMemberEmailCmds,
        (msg) => adt("addTeamMembersEmails", [0, msg]) as Msg
      ),
      ...component_.cmd.mapMany(
        acceptOrgAdminTermsCmds,
        (msg) => adt("acceptOrgAdminTerms", msg) as Msg
      )
    ]
  ];
};

const startAddTeamMembersLoading = makeStartLoading<State>(
  "addTeamMembersLoading"
);

const startChangeOwnerLoading = makeStartLoading<State>("changeOwnerLoading");

interface AddTeamMemberState {
  successToasts: string[];
  warningToasts: string[];
  errorToasts: string[];
}

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "showModal":
      return [state.set("showModal", msg.value), []];

    case "hideModal": {
      const existingShowModal = state.showModal;
      state = state.set("showModal", null);
      if (existingShowModal)
        switch (existingShowModal.tag) {
          case "acceptOrgAdminStatusTerms": {
            state = state.update("acceptOrgAdminTerms", (s) =>
              AcceptOrgAdminTerms.setOrgAdminCheckbox(s, false)
            );
            break;
          }
          case "addTeamMembers":
            return resetAddTeamMemberEmails(state);
          case "changeOwner":
            state = state.set(
              "nonOwnerMembers",
              resetNonOwnerMembers(state.affiliations)
            );
            break;
        }
      return [state, []];
    }

    case "addTeamMembers": {
      state = startAddTeamMembersLoading(state).set("showModal", null);
      let cmd = component_.cmd.dispatch({
        successToasts: [],
        warningToasts: [],
        errorToasts: []
      } as AddTeamMemberState);
      for (const s of state.addTeamMembersEmails) {
        const userEmail = FormField.getValue(s);
        cmd = component_.cmd.join(
          cmd,
          api.affiliations.create<
            api.ResponseValidation<Affiliation, CreateValidationErrors>
          >()(
            {
              userEmail,
              organization: state.organization.id,
              membershipType: MembershipType.Member
            },
            (response) => response
          ),
          (acc, response) => {
            switch (response.tag) {
              case "valid":
                acc.successToasts.push(userEmail);
                break;
              case "invalid":
                if (response.value.inviteeNotRegistered?.length) {
                  acc.warningToasts.push(userEmail);
                } else {
                  acc.errorToasts.push(userEmail);
                }
                break;
              case "unhandled":
                acc.errorToasts.push(userEmail);
                break;
            }
            return acc;
          }
        );
      }
      return [
        startAddTeamMembersLoading(state),
        [component_.cmd.map(cmd, (acc) => adt("onAddTeamMembersResponse", acc))]
      ];
    }

    case "onAddTeamMembersResponse": {
      const { successToasts, warningToasts, errorToasts } = msg.value;
      // Dispatch resulting toasts to user.
      let toastsCmd: component_.Cmd<Msg>[] = [];
      if (successToasts.length) {
        toastsCmd = [
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt("success", toasts.addedTeamMembers.success(successToasts))
            )
          )
        ];
      }
      if (warningToasts.length) {
        toastsCmd = [
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt("warning", toasts.addedTeamMembers.warning(warningToasts))
            )
          )
        ];
      }
      if (errorToasts.length) {
        toastsCmd = [
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt("error", toasts.addedTeamMembers.error(errorToasts))
            )
          )
        ];
      }
      return [
        state,
        [...toastsCmd, component_.cmd.dispatch(component_.global.reloadMsg())]
      ];
    }

    case "approveAffiliation":
      return [
        state
          .set("approveAffiliationLoading", msg.value.id)
          .set("showModal", null),
        [
          api.affiliations.update<Msg>()(
            msg.value.id,
            adt("approve"),
            (response) =>
              adt("onApproveAffiliationResponse", [
                api.isValid(response),
                msg.value
              ]) as Msg
          )
        ]
      ];

    case "onApproveAffiliationResponse": {
      const [succeeded, member] = msg.value;
      if (!succeeded) {
        return [
          state.set("approveAffiliationLoading", null),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("error", toasts.approvedTeamMember.error(member))
              )
            )
          ]
        ];
      }
      return [
        state,
        [
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt("success", toasts.approvedTeamMember.success(member))
            )
          ),
          component_.cmd.dispatch(component_.global.reloadMsg())
        ]
      ];
    }

    case "removeTeamMember":
      state = state.set("showModal", null);
      return [
        state.set("removeTeamMemberLoading", msg.value.id),
        [
          api.affiliations.delete_<Msg>()(
            msg.value.id,
            (response) =>
              adt("onRemoveTeamMemberResponse", [
                api.isValid(response),
                msg.value
              ]) as Msg
          )
        ]
      ];

    case "onRemoveTeamMemberResponse": {
      const [succeeded, member] = msg.value;
      if (!succeeded) {
        return [
          state.set("removeTeamMemberLoading", null),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("error", toasts.removedTeamMember.error(member))
              )
            )
          ]
        ];
      }
      return [
        state,
        [
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt("success", toasts.removedTeamMember.success(member))
            )
          ),
          component_.cmd.dispatch(component_.global.reloadMsg())
        ]
      ];
    }

    case "membersTable":
      return component_.base.updateChild({
        state,
        childStatePath: ["membersTable"],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "membersTable", value })
      });

    case "addTeamMembersEmails":
      return component_.base.updateChild({
        state,
        childStatePath: ["addTeamMembersEmails", String(msg.value[0])],
        childUpdate: ShortText.update,
        childMsg: msg.value[1],
        mapChildMsg: (value) =>
          adt("addTeamMembersEmails", [msg.value[0], value]) as Msg
      });

    case "addTeamMembersEmailsAddField": {
      const [newFieldState, newFieldCmds] = initAddTeamMemberEmailField();
      return [
        state.set("addTeamMembersEmails", [
          ...state.addTeamMembersEmails,
          immutable(newFieldState)
        ]),
        component_.cmd.mapMany(
          newFieldCmds,
          (msg) =>
            adt("addTeamMembersEmails", [
              state.addTeamMembersEmails.length,
              msg
            ]) as Msg
        )
      ];
    }
    case "addTeamMembersEmailsRemoveField":
      return [
        state.update("addTeamMembersEmails", (vs) => {
          return vs.filter((v, i) => i !== msg.value);
        }),
        []
      ];

    case "onUpdateAdminStatus": {
      const { id: memberId } = msg.value;
      return [
        state.set("updateAdminStatusLoading", memberId).set("showModal", null),
        [
          api.affiliations.update<Msg>()(
            memberId,
            adt(
              "updateAdminStatus",
              !isAffiliationAdminStatusChecked(msg.value)
            ),
            (response) => adt("onUpdateAdminStatusResponse", response) as Msg
          )
        ]
      ];
    }

    case "onUpdateAdminStatusResponse": {
      state = state.set("updateAdminStatusLoading", null);
      const response = msg.value;
      if (api.isValid(response)) {
        state = state
          .set(
            "affiliations",
            state.affiliations.map((affiliationMember) =>
              affiliationMember.id === response.value.id
                ? {
                    ...affiliationMember,
                    membershipType: response.value.membershipType
                  }
                : affiliationMember
            )
          )
          .update("acceptOrgAdminTerms", (s) =>
            AcceptOrgAdminTerms.setOrgAdminCheckbox(s, false)
          );
      }
      return [state, []];
    }

    case "acceptOrgAdminTerms":
      return component_.base.updateChild({
        state,
        childStatePath: ["acceptOrgAdminTerms"],
        childUpdate: AcceptOrgAdminTerms.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("acceptOrgAdminTerms", value)
      });

    case "toggleNewOwner":
      return [
        state.update("nonOwnerMembers", (ms) =>
          ms.map((a) => {
            return a.index === msg.value
              ? { ...a, newOwner: true }
              : { ...a, newOwner: false };
          })
        ),
        []
      ];

    case "changeOwner": {
      const { id: memberId } = msg.value;
      return [
        startChangeOwnerLoading(state).set("showModal", null),
        [
          api.affiliations.update<Msg>()(
            memberId,
            adt("changeOwner"),
            (response) =>
              // api.isValid is true if the updated affiliation was returned
              adt("onChangeOwnerResponse", api.isValid(response)) as Msg
          )
        ]
      ];
    }

    case "onChangeOwnerResponse": {
      const succeeded = msg.value;
      if (!succeeded) {
        return [
          state.set("changeOwnerLoading", 0),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("error", toasts.changedOwner.error(state.organization))
              )
            )
          ]
        ];
      }
      return [
        state,
        [
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt("success", toasts.changedOwner.success(state.organization))
            )
          ),
          component_.cmd.dispatch(component_.global.reloadMsg())
        ]
      ];
    }

    default:
      return [state, []];
  }
};

function membersTableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Team Member",
      style: {
        width: "100%"
      }
    },
    {
      children: "Capabilities",
      className: "text-center"
    },
    {
      children: "Admin",
      className: "text-center"
    },
    {
      children: null
    }
  ];
}

function membersTableBodyRows(
  props: component_.base.ComponentViewProps<State, Msg>
): Table.BodyRows {
  const { state, dispatch } = props;
  const isAddTeamMembersLoading = state.addTeamMembersLoading > 0;
  const isRemoveTeamMemberLoading = !!state.removeTeamMemberLoading;
  const isApproveAffiliationLoading = !!state.approveAffiliationLoading;
  const isAdminStatusLoading = !!state.updateAdminStatusLoading;

  const isLoading =
    isAddTeamMembersLoading ||
    isRemoveTeamMemberLoading ||
    isApproveAffiliationLoading ||
    isAdminStatusLoading;
  return state.affiliations.map((m, i) => {
    // return state.affiliations.map((m, _) => {
    const isMemberLoading = state.removeTeamMemberLoading === m.id;
    const isApproveLoading = state.approveAffiliationLoading === m.id;
    const isAdminStatusLoading = state.updateAdminStatusLoading === m.id;
    return [
      {
        children: (
          <div className="d-flex align-items-center flex-nowrap">
            <Link
              onClick={() =>
                dispatch(adt("showModal", adt("viewTeamMember", m)) as Msg)
              }
              symbol_={leftPlacement(imageLinkSymbol(userAvatarPath(m.user)))}>
              {m.user.name}
            </Link>
            {memberIsOwner(m) ? <OwnerBadge className="ms-3" /> : null}
            {memberIsPending(m) ? <PendingBadge className="ms-3" /> : null}
          </div>
        ),
        className: "text-nowrap align-middle"
      },
      {
        children: String(m.user.capabilities.length),
        className: "text-center align-middle"
      },
      {
        children: isAdminStatusLoading ? (
          <Spinner size="sm" color="secondary" />
        ) : (
          <div className={`affiliations-admin-status-${i}`}>
            <Input
              type="checkbox"
              id={`affiliations-admin-checkbox-${i}`}
              onChange={(e) => {
                if (e) {
                  e.stopPropagation();
                }
                // linter complained about ternary operator, replaced with if/else
                if (isAffiliationAdminStatusChecked(m)) {
                  dispatch(adt("onUpdateAdminStatus", m) as Msg);
                } else {
                  dispatch(
                    adt(
                      "showModal",
                      adt("acceptOrgAdminStatusTerms", m) as ModalId
                    ) as Msg
                  );
                }
              }}
              disabled={
                isLoading ||
                memberIsOwner(m) ||
                usersAreEquivalent(state.viewerUser, m.user)
              }
              checked={isAffiliationAdminStatusChecked(m)}
            />
          </div>
        ),
        className: `text-center align-middle`
      },
      {
        showOnHover: !(isMemberLoading || isApproveLoading),
        children: (
          <div className="d-flex align-items-center flex-nowrap">
            {/* Button only visible for admin on pending team members */}
            {isAdmin(state.viewerUser) && memberIsPending(m) && (
              <Link
                button
                disabled={isLoading}
                loading={isApproveLoading}
                size="sm"
                color="success"
                className="me-2"
                symbol_={leftPlacement(iconLinkSymbol("user-check"))}
                onClick={() =>
                  dispatch(
                    adt("showModal", adt("approveAffiliation", m)) as Msg
                  )
                }>
                Approve
              </Link>
            )}
            {(!(memberIsOwner(m) || !isVendor(state.viewerUser)) ||
              isAdmin(state.viewerUser)) && (
              <Link
                button
                disabled={isLoading}
                loading={isMemberLoading}
                size="sm"
                symbol_={leftPlacement(iconLinkSymbol("user-times"))}
                onClick={() =>
                  dispatch(adt("showModal", adt("removeTeamMember", m)) as Msg)
                }
                color="danger">
                Remove
              </Link>
            )}
          </div>
        ),
        className: "text-end align-middle"
      }
    ];
  });
}

const view: component_.base.ComponentView<State, Msg> = (props) => {
  const { state, dispatch } = props;
  return (
    <div>
      <EditTabHeader
        legalName={state.organization.legalName}
        swuQualified={state.swuQualified}
        twuQualified={state.twuQualified}
      />
      <Row className="mt-5">
        <Col xs="12">
          <h3>Team Members</h3>
          <p className="mb-4">
            Add team members to your organization by clicking on the {'"'}Add
            Team Member(s){'"'} button above. Please ensure team members have
            already signed up for a Digital Marketplace Vendor account before
            adding them to your organization.
          </p>
          {state.affiliations.length ? (
            <Table.view
              headCells={membersTableHeadCells()}
              bodyRows={membersTableBodyRows(props)}
              state={state.membersTable}
              dispatch={component_.base.mapDispatch(dispatch, (v) =>
                adt("membersTable" as const, v)
              )}
            />
          ) : null}
        </Col>
      </Row>
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3>Team Capabilities</h3>
            <p className="mb-4">
              This is a summary of the capabilities your organization{"'"}s team
              possesses as whole, only including the capabilities of confirmed
              (non-pending) members. Team members can claim capabilities in
              their user profiles in the {'"'}Capabilities{'"'} section.
            </p>
            <Capabilities grid capabilities={state.capabilities} />
          </Col>
        </Row>
      </div>
    </div>
  );
};

function isAddTeamMembersEmailsValid(state: Immutable<State>): boolean {
  for (const s of state.addTeamMembersEmails) {
    if (!FormField.isValid(s)) {
      return false;
    }
  }
  return true;
}

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  onInitResponse() {
    return component_.page.readyMsg();
  },
  getModal: (state) => {
    if (!state.showModal) {
      return component_.page.modal.hide();
    }
    switch (state.showModal.tag) {
      case "viewTeamMember":
        return makeViewTeamMemberModal({
          member: state.showModal.value,
          onCloseMsg: adt("hideModal") as Msg
        });

      case "approveAffiliation":
        return component_.page.modal.show({
          title: "Approve Request?",
          body: () =>
            "Approving this request will allow this company to put you forward as a team member on proposals for opportunities.",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Approve Request",
              icon: "user-check",
              color: "success",
              msg: adt("approveAffiliation", state.showModal.value),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });

      case "addTeamMembers": {
        const isValid = isAddTeamMembersEmailsValid(state);
        return component_.page.modal.show({
          title: "Add Team Member(s)",
          onCloseMsg: adt("hideModal") as Msg,
          body: (dispatch) => {
            const addField = () =>
              dispatch(adt("addTeamMembersEmailsAddField"));
            return (
              <div>
                <p>
                  Provide an email address for each team member to invite them
                  to join your organization.
                </p>
                <p>
                  <strong>
                    Please ensure team members have already signed up for a
                    Digital Marketplace Vendor account before adding them to
                    your organization, and only enter the email addresses
                    associated with their Digital Marketplace accounts.
                  </strong>
                </p>
                {state.addTeamMembersEmails.map((s, i) => {
                  const isFirst = i === 0;
                  const isLast = i === state.addTeamMembersEmails.length - 1;
                  const props = {
                    extraChildProps: {},
                    className: "flex-grow-1 mb-0",
                    placeholder: "Email Address",
                    dispatch: component_.base.mapDispatch(
                      dispatch,
                      (v) => adt("addTeamMembersEmails", [i, v]) as Msg
                    ),
                    state: s
                  };
                  return (
                    <div key={`organization-add-team-member-email-${i}`}>
                      {isFirst ? (
                        <FormField.ConditionalLabel
                          label="Email Addresses"
                          required
                          {...props}
                        />
                      ) : null}
                      <div className="mb-3 d-flex align-items-start flex-nowrap">
                        <ShortText.view {...props} />
                        <div
                          className="d-flex flex-nowrap align-items-center"
                          style={{ marginTop: "0.625rem" }}>
                          {state.addTeamMembersEmails.length === 1 ? null : (
                            <Icon
                              hover
                              name="trash"
                              color="info"
                              className="ms-2"
                              width={0.9}
                              height={0.9}
                              onClick={() =>
                                dispatch(
                                  adt("addTeamMembersEmailsRemoveField", i)
                                )
                              }
                            />
                          )}
                          <Icon
                            hover={isLast}
                            name="plus"
                            color="primary"
                            className={`ms-2 ${isLast ? "o-100" : "o-0"}`}
                            width={1.1}
                            height={1.1}
                            onClick={isLast ? addField : undefined}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          },
          actions: [
            {
              text: "Add Team Member(s)",
              button: true,
              disabled: !isValid,
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

      case "removeTeamMember": {
        const affiliation = state.showModal.value;
        return component_.page.modal.show({
          title: `Remove ${affiliation.user.name}?`,
          body: () =>
            `Are you sure you want to remove ${affiliation.user.name} from this organization?`,
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Remove Team Member",
              icon: "user-times",
              color: "danger",
              msg: adt("removeTeamMember", affiliation),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      }

      case "acceptOrgAdminStatusTerms":
        return component_.page.modal.show({
          title: "Please Confirm",
          body: (dispatch) => (
            <AcceptOrgAdminTerms.view
              state={state.acceptOrgAdminTerms}
              dispatch={component_.base.mapDispatch(
                dispatch,
                (msg) => adt("acceptOrgAdminTerms", msg) as Msg
              )}
            />
          ),
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Share Admin Access",
              icon: "user-check",
              color: "primary",
              msg: adt("onUpdateAdminStatus", state.showModal.value),
              button: true,
              disabled: !AcceptOrgAdminTerms.getOrgAdminCheckbox(
                state.acceptOrgAdminTerms
              )
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });

      case "changeOwner": {
        const newOwner = state.nonOwnerMembers.find((m) => m.newOwner);
        return component_.page.modal.show({
          title: "Change Owner",
          onCloseMsg: adt("hideModal") as Msg,
          body: (dispatch) => {
            return (
              <div className="border-top border-start">
                {state.nonOwnerMembers.map((m, i) => {
                  return (
                    <div
                      key={`non-owner-members-${i}`}
                      className="d-flex flex-nowrap align-items-center py-2 px-3 border-end border-bottom">
                      <Link
                        onClick={() => dispatch(adt("toggleNewOwner", m.index))}
                        symbol_={leftPlacement(
                          iconLinkSymbol(m.newOwner ? "check-circle" : "circle")
                        )}
                        symbolClassName={
                          m.newOwner ? "text-success" : "text-body"
                        }
                        className="text-nowrap flex-nowrap"
                        color="body"
                        disabled={memberIsPending(m)}>
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
            );
          },
          actions: [
            {
              text: "Change Owner",
              disabled: !newOwner,
              button: true,
              color: "primary",
              icon: "user-edit",
              msg: newOwner ? adt("changeOwner", newOwner) : adt("hideModal")
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
  },
  getActions: ({ state, dispatch }) => {
    const viewerIsAdmin = isAdmin(state.viewerUser);
    if (!isVendor(state.viewerUser) && !viewerIsAdmin) {
      return component_.page.actions.none();
    }
    const isAddTeamMembersLoading = state.addTeamMembersLoading > 0;
    const isChangeOwnerLoading = state.changeOwnerLoading > 0;
    const isRemoveTeamMemberLoading = !!state.removeTeamMemberLoading;
    const isLoading =
      isAddTeamMembersLoading ||
      isRemoveTeamMemberLoading ||
      isChangeOwnerLoading;
    return component_.page.actions.links([
      {
        children: "Add Team Member(s)",
        onClick: () => dispatch(adt("showModal", adt("addTeamMembers")) as Msg),
        button: true,
        loading: isAddTeamMembersLoading,
        disabled: isLoading,
        symbol_: leftPlacement(iconLinkSymbol("user-plus")),
        color: "primary"
      },
      ...(viewerIsAdmin && state.nonOwnerMembers.length
        ? [
            {
              children: "Change Owner",
              onClick: () =>
                dispatch(adt("showModal", adt("changeOwner")) as Msg),
              button: true,
              outline: true,
              loading: isChangeOwnerLoading,
              disabled: isLoading,
              symbol_: leftPlacement(iconLinkSymbol("user-edit")),
              color: "c-nav-fg-alt"
            } as LinkProps
          ]
        : [])
    ]);
  }
};
