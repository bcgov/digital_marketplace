import { EMPTY_STRING } from "front-end/config";
import { Route } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as toasts from "front-end/lib/pages/organization/lib/toasts";
import { PendingBadge } from "front-end/lib/pages/organization/lib/views/team-member";
import * as Tab from "front-end/lib/pages/user/profile/tab";
import Icon from "front-end/lib/views/icon";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { compareStrings, find } from "shared/lib";
import {
  AffiliationSlim,
  memberIsOrgAdmin,
  memberIsPending,
  MembershipType
} from "shared/lib/resources/affiliation";
import { doesOrganizationMeetSWUQualification } from "shared/lib/resources/organization";
import { adt, ADT, Id } from "shared/lib/types";

type TableAffiliation = AffiliationSlim;

type ModalId =
  | ADT<"deleteAffiliation", AffiliationSlim>
  | ADT<"approveAffiliation", AffiliationSlim>
  | ADT<"rejectAffiliation", AffiliationSlim>;

export interface State extends Tab.Params {
  showModal: ModalId | null;
  deleteAffiliationLoading: Id | null;
  approveAffiliationLoading: Id | null;
  rejectAffiliationLoading: Id | null;
  ownedRecords: TableAffiliation[];
  affiliatedRecords: TableAffiliation[];
  ownedTable: Immutable<Table.State>;
  affiliatedTable: Immutable<Table.State>;
}

export type InnerMsg =
  | ADT<"noop">
  | ADT<
      "onInitResponse",
      [
        Tab.Params["invitation"],
        api.ResponseValidation<AffiliationSlim[], string[]>
      ]
    >
  | ADT<"ownedTable", Table.Msg>
  | ADT<"affiliatedTable", Table.Msg>
  | ADT<"deleteAffiliation", AffiliationSlim>
  | ADT<"onDeleteAffiliationResponse", [AffiliationSlim, boolean]>
  | ADT<"approveAffiliation", AffiliationSlim>
  | ADT<"onApproveAffiliationResponse", [AffiliationSlim, boolean]>
  | ADT<"rejectAffiliation", AffiliationSlim>
  | ADT<"onRejectAffiliationResponse", [AffiliationSlim, boolean]>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = ({
  viewerUser,
  profileUser,
  invitation
}) => {
  const [ownedTableState, ownedTableCmds] = Table.init({
    idNamespace: "user-profile-orgs-owned"
  });
  const [affiliatedTableState, affiliatedTableCmds] = Table.init({
    idNamespace: "user-profile-orgs-affiliated"
  });
  return [
    {
      showModal: null,
      deleteAffiliationLoading: null,
      approveAffiliationLoading: null,
      rejectAffiliationLoading: null,
      profileUser,
      viewerUser,
      ownedRecords: [],
      affiliatedRecords: [],
      ownedTable: immutable(ownedTableState),
      affiliatedTable: immutable(affiliatedTableState)
    },
    [
      ...component_.cmd.mapMany(
        ownedTableCmds,
        (msg) => adt("ownedTable", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        affiliatedTableCmds,
        (msg) => adt("affiliatedTable", msg) as Msg
      ),
      api.affiliations.readMany<Msg>()(
        (response) => adt("onInitResponse", [invitation, response]) as Msg
      )
    ]
  ];
};

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "onInitResponse": {
      let affiliations: TableAffiliation[] = [];
      const [invitation, response] = msg.value;
      if (api.isValid(response)) {
        affiliations = response.value.sort((a, b) =>
          compareStrings(a.organization.legalName, b.organization.legalName)
        );
      }
      let showModal: State["showModal"] = null;
      if (invitation) {
        const affiliation = find(
          affiliations,
          (a) => a.id === invitation.affiliationId
        );
        if (affiliation && memberIsPending(affiliation)) {
          showModal = adt(
            invitation.response === "approve"
              ? "approveAffiliation"
              : "rejectAffiliation",
            affiliation
          );
        }
      }
      return [
        state.merge({
          showModal,
          ownedRecords: affiliations.filter(
            (a) => a.membershipType === MembershipType.Owner
          ),
          affiliatedRecords: affiliations.filter(
            (a) => a.membershipType !== MembershipType.Owner
          )
        }),
        [component_.cmd.dispatch(component_.page.readyMsg())]
      ];
    }
    case "showModal":
      return [state.set("showModal", msg.value), []];
    case "hideModal":
      return [state.set("showModal", null), []];
    case "ownedTable":
      return component_.base.updateChild({
        state,
        childStatePath: ["ownedTable"],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "ownedTable", value })
      });
    case "affiliatedTable":
      return component_.base.updateChild({
        state,
        childStatePath: ["affiliatedTable"],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "affiliatedTable", value })
      });
    case "deleteAffiliation":
      return [
        state
          .set("deleteAffiliationLoading", msg.value.id)
          .set("showModal", null),
        [
          api.affiliations.delete_<Msg>()(
            msg.value.id,
            (response) =>
              adt("onDeleteAffiliationResponse", [
                msg.value,
                api.isValid(response)
              ]) as Msg
          )
        ]
      ];
    case "onDeleteAffiliationResponse": {
      state = state.set("deleteAffiliationLoading", null);
      const [affiliation, succeeded] = msg.value;
      if (!succeeded) {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("error", toasts.leftOrganization.error(affiliation))
              )
            )
          ]
        ];
      }
      const [initState, initCmds] = init({
        profileUser: state.profileUser,
        viewerUser: state.viewerUser
      });
      return [
        immutable(initState),
        [
          ...initCmds,
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt("success", toasts.leftOrganization.success(affiliation))
            )
          )
        ]
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
                msg.value,
                api.isValid(response)
              ]) as Msg
          )
        ]
      ];
    case "onApproveAffiliationResponse": {
      state = state.set("approveAffiliationLoading", null);
      const [affiliation, succeeded] = msg.value;
      if (!succeeded) {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt(
                  "error",
                  toasts.approvedOrganizationRequest.error(affiliation)
                )
              )
            )
          ]
        ];
      }
      const [initState, initCmds] = init({
        profileUser: state.profileUser,
        viewerUser: state.viewerUser
      });
      return [
        immutable(initState),
        [
          ...initCmds,
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt(
                "success",
                toasts.approvedOrganizationRequest.success(affiliation)
              )
            )
          )
        ]
      ];
    }
    case "rejectAffiliation":
      return [
        state
          .set("rejectAffiliationLoading", msg.value.id)
          .set("showModal", null),
        [
          api.affiliations.delete_<Msg>()(
            msg.value.id,
            (response) =>
              adt("onRejectAffiliationResponse", [
                msg.value,
                api.isValid(response)
              ]) as Msg
          )
        ]
      ];
    case "onRejectAffiliationResponse": {
      state = state.set("rejectAffiliationLoading", null);
      const [affiliation, succeeded] = msg.value;
      if (!succeeded) {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt(
                  "error",
                  toasts.rejectedOrganizationRequest.error(affiliation)
                )
              )
            )
          ]
        ];
      }
      const [initState, initCmds] = init({
        profileUser: state.profileUser,
        viewerUser: state.viewerUser
      });
      return [
        immutable(initState),
        [
          ...initCmds,
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt(
                "success",
                toasts.rejectedOrganizationRequest.success(affiliation)
              )
            )
          )
        ]
      ];
    }
    default:
      return [state, []];
  }
};

function ownedTableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Legal Name",
      className: "text-nowrap",
      style: {
        width: "100%",
        minWidth: "240px"
      }
    },
    {
      children: "Team Members",
      className: "text-center text-nowrap",
      style: {
        width: "0px"
      }
    },
    {
      children: "SWU Qualified?",
      className: "text-center text-nowrap",
      style: {
        width: "0px"
      }
    }
  ];
}

function ownedTableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.ownedRecords.map((affiliation) => {
    const swuQualified = doesOrganizationMeetSWUQualification(
      affiliation.organization
    );
    const orgId = affiliation.organization.id;
    return [
      {
        children: (
          <Link dest={routeDest(adt("orgEdit", { orgId }))}>
            {affiliation.organization.legalName}
          </Link>
        )
      },
      {
        className: "text-center",
        children: (
          <Link
            dest={routeDest(adt("orgEdit", { orgId, tab: "team" as const }))}>
            {String(affiliation.organization.numTeamMembers) || EMPTY_STRING}
          </Link>
        )
      },
      {
        className: "text-center",
        children: (
          <Icon
            name={swuQualified ? "check" : "times"}
            color={swuQualified ? "success" : "body"}
          />
        )
      }
    ];
  });
}

function affiliatedTableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Legal Name",
      className: "text-nowrap",
      style: {
        width: "100%",
        minWidth: "240px"
      }
    },
    {
      children: "",
      style: {
        width: "0px"
      }
    }
  ];
}

function affiliatedTableBodyRows(
  state: Immutable<State>,
  dispatch: component_.base.Dispatch<Msg>
): Table.BodyRows {
  return state.affiliatedRecords.map((affiliation) => {
    const isDeleteLoading = state.deleteAffiliationLoading === affiliation.id;
    const isApproveLoading = state.approveAffiliationLoading === affiliation.id;
    const isRejectLoading = state.rejectAffiliationLoading === affiliation.id;
    const isDisabled = isDeleteLoading || isApproveLoading || isRejectLoading;
    const isPending = memberIsPending(affiliation);
    return [
      {
        children: (
          <div>
            {memberIsOrgAdmin(affiliation) ? (
              <Link
                dest={routeDest(
                  adt("orgEdit", { orgId: affiliation.organization.id })
                )}>
                {affiliation.organization.legalName}
              </Link>
            ) : (
              <span>{affiliation.organization.legalName}</span>
            )}
            {isPending ? <PendingBadge className="ms-3" /> : null}
          </div>
        ),
        style: {
          verticalAlign: "middle"
        }
      },
      {
        showOnHover: !(isApproveLoading || isRejectLoading || isDeleteLoading),
        children: isPending ? (
          <div className="d-flex align-items-center flex-nowrap">
            <Link
              button
              disabled={isDisabled}
              loading={isApproveLoading}
              size="sm"
              color="success"
              className="me-2"
              symbol_={leftPlacement(iconLinkSymbol("user-check"))}
              onClick={() =>
                dispatch(
                  adt(
                    "showModal",
                    adt("approveAffiliation", affiliation)
                  ) as Msg
                )
              }>
              Approve
            </Link>
            <Link
              button
              disabled={isDisabled}
              loading={isRejectLoading}
              size="sm"
              color="danger"
              symbol_={leftPlacement(iconLinkSymbol("user-times"))}
              onClick={() =>
                dispatch(
                  adt("showModal", adt("rejectAffiliation", affiliation)) as Msg
                )
              }>
              Reject
            </Link>
          </div>
        ) : (
          <Link
            button
            disabled={isDisabled}
            loading={isDeleteLoading}
            size="sm"
            color="danger"
            symbol_={leftPlacement(iconLinkSymbol("user-times"))}
            onClick={() =>
              dispatch(
                adt("showModal", adt("deleteAffiliation", affiliation)) as Msg
              )
            }>
            Leave
          </Link>
        ),
        className: "py-2"
      }
    ];
  });
}

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  const dispatchOwnedTable = component_.base.mapDispatch<Msg, Table.Msg>(
    dispatch,
    (value) => ({ tag: "ownedTable", value })
  );
  const dispatchAffiliatedTable = component_.base.mapDispatch<Msg, Table.Msg>(
    dispatch,
    (value) => ({ tag: "affiliatedTable", value })
  );
  return (
    <div>
      <Row>
        <Col xs="12">
          <h2>Owned Organizations</h2>
          <p className={state.ownedRecords.length ? "mb-5" : "mb-0"}>
            {state.ownedRecords.length
              ? "You are the owner of the following organizations:"
              : "You do not own any organizations."}
          </p>
        </Col>
      </Row>
      {state.ownedRecords.length ? (
        <Row>
          <Col xs="12">
            <Table.view
              headCells={ownedTableHeadCells()}
              bodyRows={ownedTableBodyRows(state)}
              state={state.ownedTable}
              dispatch={dispatchOwnedTable}
            />
          </Col>
        </Row>
      ) : null}
      <Row>
        <Col xs="12">
          <div className="mt-5 pt-5 border-top">
            <h2>Affiliated Organizations</h2>
            <p className="mb-5">
              {state.affiliatedRecords.length
                ? "You have given these companies permission to put you forward as a team member on proposals for opportunities."
                : "You are not affiliated with any organizations."}
            </p>
          </div>
        </Col>
      </Row>
      {state.affiliatedRecords.length ? (
        <Row>
          <Col xs="12">
            <Table.view
              headCells={affiliatedTableHeadCells()}
              bodyRows={affiliatedTableBodyRows(state, dispatch)}
              state={state.affiliatedTable}
              dispatch={dispatchAffiliatedTable}
            />
          </Col>
        </Row>
      ) : null}
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  onInitResponse() {
    return adt("noop");
  },
  getModal(state) {
    if (!state.showModal) {
      return component_.page.modal.hide();
    }
    switch (state.showModal.tag) {
      case "deleteAffiliation":
        return component_.page.modal.show({
          title: "Leave Organization?",
          body: () =>
            "Are you sure you want to leave this organization? You will no longer be able to be included as a team member in its opportunity proposals.",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Leave Organization",
              icon: "user-times",
              color: "danger",
              msg: adt("deleteAffiliation", state.showModal.value),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
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
      case "rejectAffiliation":
        return component_.page.modal.show({
          title: "Reject Request?",
          body: () =>
            "Are you sure you want to reject this organization's request for you to join their team?",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Reject Request",
              icon: "user-times",
              color: "danger",
              msg: adt("rejectAffiliation", state.showModal.value),
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
  },
  getActions() {
    return component_.page.actions.links([
      {
        children: "Create Organization",
        dest: routeDest(adt("orgCreate", null)),
        button: true,
        symbol_: leftPlacement(iconLinkSymbol("plus-circle")),
        color: "primary"
      }
    ]);
  }
};
