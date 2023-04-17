import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/organization/edit/tab";
import * as OrgForm from "front-end/lib/pages/organization/lib/components/form";
import * as toasts from "front-end/lib/pages/organization/lib/toasts";
import EditTabHeader from "front-end/lib/pages/organization/lib/views/edit-tab-header";
import Link, { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import * as OrgResource from "shared/lib/resources/organization";
import { User } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";

export interface State extends Tab.Params {
  isEditing: boolean;
  editingLoading: number;
  saveChangesLoading: number;
  archiveLoading: number;
  showArchiveModal: boolean;
  showSaveChangesModal: boolean;
  orgForm: Immutable<OrgForm.State>;
}

export type InnerMsg =
  | ADT<"orgForm", OrgForm.Msg>
  | ADT<"startEditing">
  | ADT<"onStartEditingResponse", OrgResource.Organization | null>
  | ADT<"cancelEditing">
  | ADT<"saveChanges">
  | ADT<"onSaveChangesResponse", OrgForm.PersistResult>
  | ADT<"archive">
  | ADT<"onArchiveResponse", OrgResource.Organization | null>
  | ADT<"hideArchiveModal">
  | ADT<"hideSaveChangesModal">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

function resetOrgForm(
  organization: OrgResource.Organization
): component_.base.InitReturnValue<OrgForm.State, OrgForm.Msg> {
  return OrgForm.init({ organization });
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [orgFormState, orgFormCmds] = resetOrgForm(params.organization);
  return [
    {
      ...params,
      isEditing: false,
      editingLoading: 0,
      saveChangesLoading: 0,
      archiveLoading: 0,
      showArchiveModal: false,
      showSaveChangesModal: false,
      orgForm: immutable(orgFormState)
    },
    component_.cmd.mapMany(orgFormCmds, (msg) => adt("orgForm", msg) as Msg)
  ];
};

const startEditingLoading = makeStartLoading<State>("editingLoading");
const stopEditingLoading = makeStopLoading<State>("editingLoading");
const startSaveChangesLoading = makeStartLoading<State>("saveChangesLoading");
const stopSaveChangesLoading = makeStopLoading<State>("saveChangesLoading");
const startArchiveLoading = makeStartLoading<State>("archiveLoading");
const stopArchiveLoading = makeStopLoading<State>("archiveLoading");

function isOwner(user: User, org: OrgResource.Organization): boolean {
  return !!org.owner && user.id === org.owner.id;
}

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "archive": {
      const organization = state.organization;
      if (!state.showArchiveModal) {
        return [state.set("showArchiveModal", true), []];
      } else {
        state = startArchiveLoading(state).set("showArchiveModal", false);
      }
      return [
        state,
        [
          api.organizations.delete_<Msg>()(organization.id, (response) =>
            adt(
              "onArchiveResponse",
              api.isValid(response) ? response.value : null
            )
          )
        ]
      ];
    }
    case "onArchiveResponse": {
      const organization = msg.value;
      if (organization) {
        if (isOwner(state.viewerUser, state.organization)) {
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.archived.success)
                )
              ),
              component_.cmd.dispatch(
                component_.global.replaceRouteMsg(
                  adt("userProfile" as const, {
                    userId: state.viewerUser.id,
                    tab: "organizations" as const
                  })
                )
              )
            ]
          ];
        } else {
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.archived.success)
                )
              ),
              component_.cmd.dispatch(
                component_.global.replaceRouteMsg(adt("orgList" as const, {}))
              )
            ]
          ];
        }
      } else {
        return [
          stopArchiveLoading(state),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("error", toasts.archived.error)
              )
            )
          ]
        ];
      }
    }
    case "saveChanges": {
      const organization = state.organization;
      if (!state.showSaveChangesModal) {
        return [state.set("showSaveChangesModal", true), []];
      } else {
        state = startSaveChangesLoading(state).set(
          "showSaveChangesModal",
          false
        );
      }
      return [
        state,
        [
          component_.cmd.map(
            OrgForm.persist(
              adt("update", {
                state: state.orgForm,
                orgId: organization.id,
                extraBody: {
                  logoImageFile:
                    organization.logoImageFile && organization.logoImageFile.id
                }
              })
            ),
            (response) => adt("onSaveChangesResponse", response) as Msg
          )
        ]
      ];
    }
    case "onSaveChangesResponse": {
      state = stopSaveChangesLoading(state);
      const result = msg.value;
      switch (result.tag) {
        case "valid": {
          const [formState, formCmds, organization] = result.value;
          return [
            state
              .set("isEditing", false)
              .set("organization", organization)
              .set("orgForm", formState),
            [
              ...component_.cmd.mapMany(
                formCmds,
                (msg) => adt("orgForm", msg) as Msg
              ),
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.updated.success)
                )
              )
            ]
          ];
        }
        case "invalid":
        default:
          return [
            state.set("orgForm", result.value),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.updated.error)
                )
              )
            ]
          ];
      }
    }
    case "startEditing":
      return [
        startEditingLoading(state),
        [
          api.organizations.readOne<Msg>()(state.organization.id, (response) =>
            adt(
              "onStartEditingResponse",
              api.isValid(response) ? response.value : null
            )
          )
        ]
      ];
    case "onStartEditingResponse": {
      state = stopEditingLoading(state);
      const organization = msg.value;
      if (!organization) return [state, []];
      const [formState, formCmds] = resetOrgForm(organization);
      return [
        state
          .set("isEditing", true)
          .set("organization", organization)
          .set("orgForm", immutable(formState)),
        component_.cmd.mapMany(formCmds, (msg) => adt("orgForm", msg) as Msg)
      ];
    }
    case "cancelEditing": {
      const [formState, formCmds] = resetOrgForm(state.organization);
      return [
        state.set("isEditing", false).set("orgForm", immutable(formState)),
        component_.cmd.mapMany(formCmds, (msg) => adt("orgForm", msg) as Msg)
      ];
    }
    case "hideArchiveModal":
      return [state.set("showArchiveModal", false), []];
    case "hideSaveChangesModal":
      return [state.set("showSaveChangesModal", false), []];
    case "orgForm":
      return component_.base.updateChild({
        state,
        childStatePath: ["orgForm"],
        childUpdate: OrgForm.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("orgForm", value) as Msg
      });
    default:
      return [state, []];
  }
};

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  const isEditingLoading = state.editingLoading > 0;
  const isSaveChangesLoading = state.saveChangesLoading > 0;
  const isArchiveLoading = state.archiveLoading > 0;
  const isLoading =
    isEditingLoading || isSaveChangesLoading || isArchiveLoading;
  return (
    <div>
      <EditTabHeader
        legalName={state.organization.legalName}
        swuQualified={state.swuQualified}
        twuQualified={state.twuQualified}
      />
      <Row className="mt-5">
        <Col xs="12">
          <OrgForm.view
            state={state.orgForm}
            disabled={isLoading || !state.isEditing}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("orgForm" as const, value)
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col>
          <div className="mt-5 pt-5 border-top">
            <h3>Archive Organization</h3>
            <p className="mb-4">
              Archiving this organization means that it will no longer be
              available for opportunity proposals.
            </p>
          </div>
        </Col>
      </Row>
      <Row>
        <Col>
          <Link
            button
            loading={isArchiveLoading}
            disabled={isLoading}
            color="danger"
            symbol_={leftPlacement(iconLinkSymbol("minus-circle"))}
            onClick={() => dispatch(adt("archive"))}>
            Archive Organization
          </Link>
        </Col>
      </Row>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  onInitResponse() {
    return component_.page.readyMsg();
  },
  getModal: (state) => {
    if (state.showArchiveModal) {
      return component_.page.modal.show({
        title: "Archive Organization?",
        body: () => "Are you sure you want to archive this organization?",
        onCloseMsg: adt("hideArchiveModal") as Msg,
        actions: [
          {
            text: "Archive Organization",
            icon: "minus-circle",
            color: "danger",
            msg: adt("archive"),
            button: true
          },
          {
            text: "Cancel",
            color: "secondary",
            msg: adt("hideArchiveModal")
          }
        ]
      });
    } else if (state.showSaveChangesModal) {
      return component_.page.modal.show({
        title: "Save Changes?",
        body: () =>
          "Are you sure you want to save the changes you've made to this organization?",
        onCloseMsg: adt("hideSaveChangesModal") as Msg,
        actions: [
          {
            text: "Save Changes",
            icon: "check",
            color: "success",
            msg: adt("saveChanges"),
            button: true
          },
          {
            text: "Cancel",
            color: "secondary",
            msg: adt("hideSaveChangesModal")
          }
        ]
      });
    }
    return component_.page.modal.hide();
  },
  getActions: ({ state, dispatch }) => {
    const isEditingLoading = state.editingLoading > 0;
    const isSaveChangesLoading = state.saveChangesLoading > 0;
    const isArchiveLoading = state.archiveLoading > 0;
    const isLoading =
      isEditingLoading || isSaveChangesLoading || isArchiveLoading;
    const isValid = OrgForm.isValid(state.orgForm);
    if (!state.isEditing) {
      return component_.page.actions.links([
        {
          children: "Edit Organization",
          onClick: () => dispatch(adt("startEditing")),
          button: true,
          loading: isEditingLoading,
          disabled: isLoading,
          symbol_: leftPlacement(iconLinkSymbol("user-edit")),
          color: "primary"
        }
      ]);
    } else {
      return component_.page.actions.links([
        {
          children: "Save Changes",
          disabled: !isValid || isLoading,
          onClick: () => dispatch(adt("saveChanges")),
          button: true,
          loading: isSaveChangesLoading,
          symbol_: leftPlacement(iconLinkSymbol("check")),
          color: "success"
        },
        {
          children: "Cancel",
          disabled: isLoading,
          onClick: () => dispatch(adt("cancelEditing")),
          color: "c-nav-fg-alt"
        }
      ]);
    }
  }
};
