import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
// import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/organization/edit/tab";
import * as toasts from "front-end/lib/pages/organization/lib/toasts";
import EditTabHeader from "front-end/lib/pages/organization/lib/views/edit-tab-header";
import {
  acceptedSWUTermsText,
  TITLE as SWU_TERMS_TITLE
} from "front-end/lib/pages/organization/sprint-with-us-terms";
import Icon from "front-end/lib/views/icon";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { doesOrganizationMeetSWUQualificationNumTeamMembers } from "shared/lib/resources/organization";
import { isAdmin } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { mapValid, valid, Validation } from "shared/lib/validation";

export interface State extends Tab.Params {
  isEditing: boolean;
  editingLoading: number;
  saveChangesLoading: number;
  showSaveChangesModal: boolean;
}

export type InnerMsg =
  // | ADT<"orgForm", OrgForm.Msg>
  | ADT<"startEditing">
  | ADT<"onStartEditingResponse">
  | ADT<"cancelEditing">
  | ADT<"saveChanges">
  | ADT<"onSaveChangesResponse", Validation<string[]>>
  | ADT<"hideSaveChangesModal">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  return [
    {
      ...params,
      isEditing: false,
      editingLoading: 0,
      saveChangesLoading: 0,
      showSaveChangesModal: false
    },
    []
  ];
};

const startEditingLoading = makeStartLoading<State>("editingLoading");
const stopEditingLoading = makeStopLoading<State>("editingLoading");
const startSaveChangesLoading = makeStartLoading<State>("saveChangesLoading");
const stopSaveChangesLoading = makeStopLoading<State>("saveChangesLoading");

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "saveChanges": {
      // const organization = state.organization;
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
          // component_.cmd.map(
          //   OrgForm.persist(
          //     adt("update", {
          //       state: state.orgForm,
          //       orgId: organization.id,
          //       extraBody: {
          //         logoImageFile:
          //           organization.logoImageFile && organization.logoImageFile.id
          //       }
          //     })
          //   ),
          //   (response) => adt("onSaveChangesResponse", response) as Msg
          // )
          component_.cmd.dispatch(
            adt(
              "onSaveChangesResponse",
              mapValid(valid(["thing"]), () => "thing")
            ) as Msg
          )
        ]
      ];
    }
    case "onSaveChangesResponse": {
      state = stopSaveChangesLoading(state);
      const result = msg.value;
      switch (result.tag) {
        case "valid": {
          // const [formState, formCmds, organization] = result.value;
          return [
            state.set("isEditing", false),
            // .set("organization", organization)
            // .set("orgForm", formState),
            [
              // ...component_.cmd.mapMany(
              //   formCmds,
              //   (msg) => adt("orgForm", msg) as Msg
              // ),
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.serviceAreasUpdated.success)
                )
              )
            ]
          ];
        }
        case "invalid":
        default:
          return [
            state,
            // state.set("orgForm", result.value),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.serviceAreasUpdated.error)
                )
              )
            ]
          ];
      }
    }
    case "startEditing":
      return [
        startEditingLoading(state),

        // api.organizations.readOne(state.organization.id, (response) =>
        //   adt(
        //     "onStartEditingResponse",
        //     api.isValid(response) ? response.value : null
        //   )
        // ) as component_.Cmd<Msg>
        [component_.cmd.dispatch(adt("onStartEditingResponse"))]
      ];
    case "onStartEditingResponse": {
      state = stopEditingLoading(state);
      // const organization = msg.value;
      // if (!organization) return [state, []];
      // const [formState, formCmds] = resetOrgForm(organization);
      return [
        state.set("isEditing", true),
        // .set("organization", organization)
        // .set("orgForm", immutable(formState)),
        // component_.cmd.mapMany(formCmds, (msg) => adt("orgForm", msg) as Msg)
        []
      ];
    }
    case "cancelEditing": {
      // const [formState, formCmds] = resetOrgForm(state.organization);
      return [
        // state.set("isEditing", false).set("orgForm", immutable(formState)),
        state.set("isEditing", false),
        // component_.cmd.mapMany(formCmds, (msg) => adt("orgForm", msg) as Msg)
        []
      ];
    }
    case "hideSaveChangesModal":
      return [state.set("showSaveChangesModal", false), []];
    default:
      return [state, []];
  }
};

interface RequirementProps {
  name: string | component_.base.ViewElement;
  description: string;
  checked: boolean;
  className?: string;
}

const Requirement: component_.base.View<RequirementProps> = ({
  name,
  description,
  checked,
  className = ""
}) => {
  return (
    <div className={`d-flex flex-nowrap align-items-start ${className}`}>
      <Icon
        name={checked ? "check-circle" : "circle"}
        color={checked ? "success" : "body"}
        className="mr-2 mt-1 flex-shrink-0"
      />
      <div className="flex-grow-1">
        <div className="mb-1">{name}</div>
        <div className="small text-secondary">{description}</div>
      </div>
    </div>
  );
};

const view: component_.base.ComponentView<State, Msg> = ({ state }) => {
  return (
    <div>
      <EditTabHeader
        legalName={state.organization.legalName}
        swuQualified={state.swuQualified}
      />
      <Row className="mt-5">
        <Col xs="12">
          <h3>Requirements</h3>
          <p className="mb-4">
            To qualify to submit proposals for Sprint With Us opportunities,
            your organization must meet the following requirements:
          </p>
          <Requirement
            className="mb-4"
            name="At least two team members."
            description='Add team members from the "Team" tab to begin the process of satisfying this requirement.'
            checked={doesOrganizationMeetSWUQualificationNumTeamMembers(
              state.organization
            )}
          />
          <Requirement
            className="mb-4"
            name="Team members collectively possess all capabilities."
            description="Your team members can choose their capabilities on their user profiles."
            checked={!!state.organization.possessAllCapabilities}
          />
          <Requirement
            name={`Agreed to ${SWU_TERMS_TITLE}.`}
            description={`You can view the ${SWU_TERMS_TITLE} below.`}
            checked={!!state.organization.acceptedSWUTerms}
          />
        </Col>
      </Row>
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3>Terms & Conditions</h3>
            <p className="mb-4">
              {acceptedSWUTermsText(
                state.organization,
                `View the ${SWU_TERMS_TITLE} by clicking the button below.`
              )}
            </p>
            <Link
              button
              color="primary"
              dest={routeDest(
                adt("orgSWUTerms", { orgId: state.organization.id })
              )}>
              View Terms & Conditions
            </Link>
          </Col>
        </Row>
      </div>
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
    if (state.showSaveChangesModal) {
      return component_.page.modal.show({
        title: "Are you sure?",
        body: () =>
          "Please confirm your changes to the Service Area list for this organization.",
        onCloseMsg: adt("hideSaveChangesModal") as Msg,
        actions: [
          {
            text: "Save Changes",
            icon: "check",
            color: "primary",
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
    const isLoading = isEditingLoading || isSaveChangesLoading;
    // const isValid = OrgForm.isValid(state.orgForm);
    if (isAdmin(state.viewerUser)) {
      if (!state.isEditing) {
        return component_.page.actions.links([
          {
            children: "Edit",
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
            // disabled: !isValid || isLoading,
            disabled: isLoading,
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
    return component_.page.actions.links([]);
  }
};
