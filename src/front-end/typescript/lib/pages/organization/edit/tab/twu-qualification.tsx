import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import {
  component as component_,
  Immutable,
  immutable
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/organization/edit/tab";
import * as FormField from "front-end/lib/components/form-field";
import * as toasts from "front-end/lib/pages/organization/lib/toasts";
import * as Checkbox from "front-end/lib/components/form-field/checkbox";
import * as OrgResource from "shared/lib/resources/organization";
import EditTabHeader from "front-end/lib/pages/organization/lib/views/edit-tab-header";
import {
  acceptedTWUTermsText,
  TITLE as TWU_TERMS_TITLE
} from "front-end/lib/pages/organization/team-with-us-terms";
import Icon from "front-end/lib/views/icon";
import Link, {
  externalDest,
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React, { ReactElement } from "react";
import { Col, Row } from "reactstrap";
import { isAdmin, isVendor } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { kebabCase } from "lodash";
import { TWUServiceAreaRecord } from "shared/lib/resources/service-area";
import { TWU_BC_BID_URL } from "front-end/config";
import ALL_SERVICE_AREAS from "shared/lib/data/service-areas";
import { TWUServiceArea } from "shared/lib/resources/opportunity/team-with-us";
import { twuServiceAreaToTitleCase } from "front-end/lib/pages/opportunity/team-with-us/lib";

type AvailableServiceArea = { serviceArea: TWUServiceArea; name: string };

interface ServiceArea extends AvailableServiceArea {
  checkbox: Immutable<Checkbox.State>;
}

export interface State extends Tab.Params {
  isEditing: boolean;
  editingLoading: number;
  saveChangesLoading: number;
  showSaveChangesModal: boolean;
  qualifiedServiceAreas: ServiceArea[];
}

export type InnerMsg =
  | ADT<"startEditing">
  | ADT<"onStartEditingResponse", OrgResource.Organization>
  | ADT<"cancelEditing">
  | ADT<"saveChanges">
  | ADT<
      "onSaveChangesResponse",
      api.ResponseValidation<
        OrgResource.Organization,
        OrgResource.UpdateValidationErrors
      >
    >
  | ADT<"hideSaveChangesModal">
  | ADT<"onSelectServiceArea", [number, Checkbox.Msg]>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

function resetQualifiedServiceAreas(
  organizationServiceAreas: TWUServiceAreaRecord[]
) {
  return ALL_SERVICE_AREAS.map((serviceArea) => ({
    serviceArea,
    name: twuServiceAreaToTitleCase(serviceArea)
  })).reduce<[ServiceArea[], component_.Cmd<Msg>[]]>(
    ([serviceAreas, serviceAreasCmds], serviceArea, index) => {
      const [checkboxState, checkboxCmds] = Checkbox.init({
        errors: [],
        child: {
          value: !!organizationServiceAreas.find(
            (orgSa) => serviceArea.serviceArea === orgSa.serviceArea
          ),
          id: `twu-service-area-qualified-${kebabCase(serviceArea.serviceArea)}`
        }
      });
      return [
        [
          ...serviceAreas,
          { ...serviceArea, checkbox: immutable(checkboxState) }
        ],
        [
          ...serviceAreasCmds,
          ...component_.cmd.mapMany(
            checkboxCmds,
            (msg) => adt("onSelectServiceArea", [index, msg]) as Msg
          )
        ]
      ];
    },
    [[], []]
  );
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [qualifiedServiceAreas, qualifiedServiceAreasCmds] =
    resetQualifiedServiceAreas(params.organization.serviceAreas);
  return [
    {
      ...params,
      isEditing: false,
      editingLoading: 0,
      saveChangesLoading: 0,
      showSaveChangesModal: false,
      qualifiedServiceAreas: qualifiedServiceAreas
    },
    qualifiedServiceAreasCmds
  ];
};

const startEditingLoading = makeStartLoading<State>("editingLoading");
const stopEditingLoading = makeStopLoading<State>("editingLoading");
const startSaveChangesLoading = makeStartLoading<State>("saveChangesLoading");
const stopSaveChangesLoading = makeStopLoading<State>("saveChangesLoading");

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "saveChanges": {
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
          api.organizations.update()(
            state.organization.id,
            // TODO: Use serviceArea IDs when loading service areas from the backend
            adt(
              "qualifyServiceAreas",
              state.qualifiedServiceAreas
                .filter((serviceArea) =>
                  FormField.getValue(serviceArea.checkbox)
                )
                .map(({ serviceArea }) => serviceArea)
            ),
            (response) => adt("onSaveChangesResponse", response) as Msg
          ) as component_.Cmd<Msg>
        ]
      ];
    }
    case "onSaveChangesResponse": {
      state = stopSaveChangesLoading(state);
      const result = msg.value;
      switch (result.tag) {
        case "valid": {
          const organization = result.value;
          return [
            state
              .set("isEditing", false)
              .set("organization", organization)
              .set(
                "twuQualified",
                OrgResource.doesOrganizationMeetTWUQualification(organization)
              ),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.serviceAreasUpdated.success)
                )
              )
            ]
          ];
        }
        case "invalid":
        default: {
          const [qualifiedServiceAreas, qualifiedServiceAreasCmds] =
            resetQualifiedServiceAreas(state.organization.serviceAreas);
          return [
            state.set("qualifiedServiceAreas", qualifiedServiceAreas),
            [
              ...qualifiedServiceAreasCmds,
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.serviceAreasUpdated.error)
                )
              )
            ]
          ];
        }
      }
    }
    case "startEditing":
      return [
        startEditingLoading(state),
        // Refresh Organization to avoid stale data, i.e. user left tab open.
        [
          api.organizations.readOne()(state.organization.id, (response) =>
            adt(
              "onStartEditingResponse",
              api.isValid(response) ? response.value : null
            )
          ) as component_.Cmd<Msg>
        ]
      ];
    case "onStartEditingResponse": {
      state = stopEditingLoading(state);
      const organization = msg.value;
      if (!organization) return [state, []];
      const [qualifiedServiceAreas, qualifiedServiceAreasCmds] =
        resetQualifiedServiceAreas(organization.serviceAreas);
      return [
        state
          .set("isEditing", true)
          .set("organization", organization)
          .set("qualifiedServiceAreas", qualifiedServiceAreas),
        qualifiedServiceAreasCmds
      ];
    }
    case "cancelEditing": {
      const [qualifiedServiceAreas, qualifiedServiceAreasCmds] =
        resetQualifiedServiceAreas(state.organization.serviceAreas);
      return [
        state
          .set("isEditing", false)
          .set("qualifiedServiceAreas", qualifiedServiceAreas),
        qualifiedServiceAreasCmds
      ];
    }
    case "hideSaveChangesModal":
      return [state.set("showSaveChangesModal", false), []];
    case "onSelectServiceArea":
      return component_.base.updateChild({
        state,
        childStatePath: [
          "qualifiedServiceAreas",
          String(msg.value[0]),
          "checkbox"
        ],
        childUpdate: Checkbox.update,
        childMsg: msg.value[1],
        mapChildMsg: (value) =>
          adt("onSelectServiceArea", [msg.value[0], value]) as Msg
      });
    default:
      return [state, []];
  }
};

interface RequirementProps {
  name: string | component_.base.ViewElement;
  description: string | ReactElement;
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
        className="me-2 mt-1 flex-shrink-0"
      />
      <div className="flex-grow-1">
        <div className="mb-1">{name}</div>
        <div className="small text-secondary">{description}</div>
      </div>
    </div>
  );
};

const view: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  const isEditingLoading = state.editingLoading > 0;
  const isSaveChangesLoading = state.saveChangesLoading > 0;
  const isLoading = isEditingLoading || isSaveChangesLoading;
  return (
    <div>
      <EditTabHeader
        legalName={state.organization.legalName}
        swuQualified={state.swuQualified}
        twuQualified={state.twuQualified}
      />
      <Row className="mt-5">
        <Col xs="12">
          <h3>Requirements</h3>
          <p className="mb-4">
            To qualify to submit proposals for Team With Us opportunities, your
            organization must meet the following requirements:
          </p>
          <Requirement
            className="mb-4"
            name={
              <>
                To qualify for one or more Service Areas, you must complete the
                RFQ through{" "}
                <Link dest={externalDest(TWU_BC_BID_URL)} newTab>
                  BC Bid
                </Link>
                .
              </>
            }
            description="You can view the RFQ documents by navigating to the BC Bid link above."
            checked={!!state.organization.possessOneServiceArea}
          />
          <Requirement
            name={`Agreed to ${TWU_TERMS_TITLE}.`}
            description={`You can view the ${TWU_TERMS_TITLE} below.`}
            checked={!!state.organization.acceptedTWUTerms}
          />
        </Col>
      </Row>
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3>Service Areas</h3>
            {state.qualifiedServiceAreas.map((serviceArea, i) => (
              <Checkbox.view
                key={kebabCase(serviceArea.serviceArea)}
                extraChildProps={{ inlineLabel: serviceArea.name }}
                disabled={isLoading || !state.isEditing}
                state={serviceArea.checkbox}
                className="mb-0"
                dispatch={component_.base.mapDispatch(
                  dispatch,
                  (msg) => adt("onSelectServiceArea", [i, msg]) as Msg
                )}
              />
            ))}
          </Col>
        </Row>
      </div>
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3>Terms & Conditions</h3>
            <p className="mb-4">
              {acceptedTWUTermsText(
                state.organization,
                `View the ${TWU_TERMS_TITLE} by clicking the button below.`
              )}
            </p>
            <Link
              button
              color="primary"
              dest={routeDest(
                adt("orgTWUTerms", { orgId: state.organization.id })
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
  },
  getAlerts: (state) => ({
    info: (() => {
      if (!state.twuQualified) {
        if (isVendor(state.viewerUser)) {
          return [
            {
              text: (
                <div>
                  This organization is not qualified to apply for{" "}
                  <em>Team With Us</em> opportunities. You must apply to become
                  a Qualified Supplier.
                </div>
              )
            }
          ];
        } else if (isAdmin(state.viewerUser)) {
          return [
            {
              text: (
                <div>
                  This organization is not qualified to apply for{" "}
                  <em>Team With Us</em> opportunities.
                </div>
              )
            }
          ];
        }
      }
      return [];
    })()
  })
};
