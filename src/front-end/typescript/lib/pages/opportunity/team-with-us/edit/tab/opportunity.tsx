import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/opportunity/team-with-us/edit/tab";
import * as Form from "front-end/lib/pages/opportunity/team-with-us/lib/components/form";
import * as toasts from "front-end/lib/pages/opportunity/team-with-us/lib/toasts";
import EditTabHeader from "front-end/lib/pages/opportunity/team-with-us/lib/views/edit-tab-header";
import {
  iconLinkSymbol,
  leftPlacement,
  Props as LinkProps
} from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import { formatAmount, formatDate } from "shared/lib";
import {
  canTWUOpportunityDetailsBeEdited,
  isTWUOpportunityPublic,
  isUnpublished,
  TWUOpportunity,
  TWUOpportunityStatus,
  UpdateValidationErrors
} from "shared/lib/resources/opportunity/team-with-us";
import { isAdmin, User } from "shared/lib/resources/user";
import { adt, ADT, Id, BodyWithErrors } from "shared/lib/types";

type ModalId =
  | "publish"
  | "submit"
  | "publishChanges"
  | "submitChanges"
  | "saveChangesAndPublish"
  | "saveChangesAndSubmit"
  | "delete"
  | "cancel"
  | "suspend";

export interface State extends Tab.Params {
  opportunity: TWUOpportunity | null;
  form: Immutable<Form.State> | null;
  showModal: ModalId | null;
  startEditingLoading: number;
  saveChangesLoading: number;
  saveChangesAndUpdateStatusLoading: number;
  updateStatusLoading: number;
  deleteLoading: number;
  isEditing: boolean;
}

type UpdateStatus =
  | TWUOpportunityStatus.UnderReview
  | TWUOpportunityStatus.Published
  | TWUOpportunityStatus.Canceled
  | TWUOpportunityStatus.Suspended;

export type InnerMsg =
  | ADT<"resetOpportunity", [TWUOpportunity, boolean]>
  | ADT<"form", Form.Msg>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"startEditing">
  | ADT<
      "onStartEditingResponse",
      api.ResponseValidation<TWUOpportunity, string[]>
    >
  | ADT<"cancelEditing">
  | ADT<"saveChanges">
  | ADT<"onSaveChangesResult", Form.PersistResult>
  | ADT<"saveChangesAndPublish">
  | ADT<"onSaveChangesAndPublishPersistFormResult", Form.PersistResult>
  | ADT<"onSaveChangesAndPublishUpdateStatusResult", UpdateStatusResult>
  | ADT<"saveChangesAndSubmit">
  | ADT<"onSaveChangesAndSubmitPersistFormResult", Form.PersistResult>
  | ADT<"onSaveChangesAndSubmitUpdateStatusResult", UpdateStatusResult>
  | ADT<"updateStatus", UpdateStatus>
  | ADT<"onUpdateStatusResult", [UpdateStatus, UpdateStatusResult]>
  | ADT<"delete">
  | ADT<
      "onDeleteResult",
      api.ResponseValidation<TWUOpportunity, BodyWithErrors>
    >;

export type Msg = component_.page.Msg<InnerMsg, Route>;

function initForm(
  opportunity: TWUOpportunity,
  viewerUser: User,
  activeTab?: Form.TabId,
  validate = false
): [Immutable<Form.State>, component_.Cmd<Form.Msg>[]] {
  const [formState, formCmds] = Form.init({
    opportunity,
    viewerUser,
    activeTab,
    canRemoveExistingAttachments: canTWUOpportunityDetailsBeEdited(
      opportunity,
      isAdmin(viewerUser)
    )
  });
  let immutableFormState = immutable(formState);
  if (validate) {
    immutableFormState = Form.validate(immutableFormState);
  }
  return [immutableFormState, formCmds];
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  return [
    {
      ...params,
      opportunity: null,
      form: null,
      showModal: null,
      startEditingLoading: 0,
      saveChangesLoading: 0,
      saveChangesAndUpdateStatusLoading: 0,
      updateStatusLoading: 0,
      deleteLoading: 0,
      isEditing: false
    },
    []
  ];
};

const startStartEditingLoading = makeStartLoading<State>("startEditingLoading");
const stopStartEditingLoading = makeStopLoading<State>("startEditingLoading");
const startSaveChangesLoading = makeStartLoading<State>("saveChangesLoading");
const stopSaveChangesLoading = makeStopLoading<State>("saveChangesLoading");
const startSaveChangesAndUpdateStatusLoading = makeStartLoading<State>(
  "saveChangesAndUpdateStatusLoading"
);
const stopSaveChangesAndUpdateStatusLoading = makeStopLoading<State>(
  "saveChangesAndUpdateStatusLoading"
);
const startUpdateStatusLoading = makeStartLoading<State>("updateStatusLoading");
const stopUpdateStatusLoading = makeStopLoading<State>("updateStatusLoading");
const startDeleteLoading = makeStartLoading<State>("deleteLoading");
const stopDeleteLoading = makeStopLoading<State>("deleteLoading");

function persistForm(
  form: Immutable<Form.State>,
  mapResult: (result: Form.PersistResult) => InnerMsg
): component_.Cmd<InnerMsg> {
  return component_.cmd.map(
    Form.persist(form, adt("update" as const)),
    mapResult
  );
}

function handlePersistFormResult(
  state: Immutable<State>,
  result: Form.PersistResult,
  onValid?: (
    state: Immutable<State>
  ) => component_.base.UpdateReturnValue<State, Msg>,
  onInvalid?: (
    state: Immutable<State>
  ) => component_.base.UpdateReturnValue<State, Msg>
): component_.base.UpdateReturnValue<State, Msg> {
  switch (result.tag) {
    case "valid": {
      const [newFormState, formCmds, newOpportunity] = result.value;
      state = state
        .set("form", newFormState)
        .set("opportunity", newOpportunity)
        .set("isEditing", false);
      const [onValidState, onValidCmds] = onValid
        ? onValid(state)
        : [state, []];
      return [
        onValidState,
        [
          ...onValidCmds,
          ...component_.cmd.mapMany(
            formCmds,
            (msg) => adt("form", msg) as InnerMsg
          )
        ]
      ];
    }
    case "invalid": {
      state = state.set("form", result.value);
      return onInvalid ? onInvalid(state) : [state, []];
    }
  }
}

type UpdateStatusResult = api.ResponseValidation<
  TWUOpportunity,
  UpdateValidationErrors
>;

function updateStatus(
  opportunityId: Id,
  newStatus: UpdateStatus,
  mapResult: (result: UpdateStatusResult) => InnerMsg
): component_.Cmd<InnerMsg> {
  const updateAction = (() => {
    switch (newStatus) {
      case TWUOpportunityStatus.UnderReview:
        return "submitForReview";
      case TWUOpportunityStatus.Published:
        return "publish";
      case TWUOpportunityStatus.Suspended:
        return "suspend";
      case TWUOpportunityStatus.Canceled:
        return "cancel";
    }
  })();
  return api.opportunities.twu.update<InnerMsg>()(
    opportunityId,
    adt(updateAction, ""),
    mapResult
  );
}

function handleUpdateStatusResult(
  state: Immutable<State>,
  result: UpdateStatusResult,
  onValid?: (
    state: Immutable<State>
  ) => component_.base.UpdateReturnValue<State, Msg>,
  onInvalid?: (
    state: Immutable<State>
  ) => component_.base.UpdateReturnValue<State, Msg>
): component_.base.UpdateReturnValue<State, Msg> {
  const currentFormState = state.form;
  if (!currentFormState) return [state, []];
  switch (result.tag) {
    case "valid": {
      const opportunity = result.value;
      const [newFormState, formCmds] = initForm(
        opportunity,
        state.viewerUser,
        Form.getActiveTab(currentFormState)
      );
      state = state.set("opportunity", opportunity).set("form", newFormState);
      const [onValidState, onValidCmds] = onValid
        ? onValid(state)
        : [state, []];
      return [
        onValidState,
        [
          ...onValidCmds,
          ...component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg)
        ]
      ];
    }
    case "invalid":
    case "unhandled":
      //FIXME show validation errors?
      return onInvalid ? onInvalid(state) : [state, []];
  }
}

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "resetOpportunity": {
      const [opportunity, validateForm] = msg.value;
      const currentFormState = state.form;
      const activeTab = currentFormState
        ? Form.getActiveTab(currentFormState)
        : undefined;
      const [formState, formCmds] = initForm(
        opportunity,
        state.viewerUser,
        activeTab,
        validateForm
      );
      return [
        state.set("opportunity", opportunity).set("form", formState),
        [
          ...component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg),
          component_.cmd.dispatch(component_.page.readyMsg())
        ]
      ];
    }
    case "form":
      return component_.base.updateChild({
        state,
        childStatePath: ["form"],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("form", value)
      });
    case "showModal":
      return [state.set("showModal", msg.value), []];
    case "hideModal":
      return [state.set("showModal", null), []];
    case "startEditing": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      return [
        startStartEditingLoading(state),
        [
          api.opportunities.twu.readOne<Msg>()(opportunity.id, (result) =>
            adt("onStartEditingResponse", result)
          )
        ]
      ];
    }
    case "onStartEditingResponse": {
      state = stopStartEditingLoading(state);
      const result = msg.value;
      switch (result.tag) {
        case "valid":
          return [
            state.set("isEditing", true),
            [
              component_.cmd.dispatch(
                adt("resetOpportunity", [
                  result.value,
                  isUnpublished(result.value)
                ]) as InnerMsg
              )
            ]
          ];
        case "invalid":
        case "unhandled":
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.startedEditing.error)
                )
              )
            ]
          ];
      }
      break;
    }
    case "cancelEditing": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      return [
        state.set("isEditing", false),
        [
          component_.cmd.dispatch(
            adt("resetOpportunity", [opportunity, false]) as InnerMsg
          )
        ]
      ];
    }
    case "saveChanges": {
      const form = state.form;
      if (!form) return [state, []];
      state = state.set("showModal", null);
      return [
        startSaveChangesLoading(state),
        [persistForm(form, (result) => adt("onSaveChangesResult", result))]
      ];
    }
    case "onSaveChangesResult": {
      state = stopSaveChangesLoading(state);
      return handlePersistFormResult(
        state,
        msg.value,
        (state1) => {
          return [
            state1,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "success",
                    state1.opportunity &&
                      isTWUOpportunityPublic(state1.opportunity)
                      ? toasts.changesPublished.success
                      : toasts.changesSaved.success
                  )
                )
              )
            ]
          ];
        },
        (state1) => {
          return [
            state1,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "error",
                    state1.opportunity &&
                      isTWUOpportunityPublic(state1.opportunity)
                      ? toasts.changesPublished.error
                      : toasts.changesSaved.error
                  )
                )
              )
            ]
          ];
        }
      );
    }
    case "saveChangesAndPublish": {
      const form = state.form;
      if (!form) return [state, []];
      state = state.set("showModal", null);
      return [
        startSaveChangesAndUpdateStatusLoading(state),
        [
          persistForm(form, (result) =>
            adt("onSaveChangesAndPublishPersistFormResult", result)
          )
        ]
      ];
    }
    case "onSaveChangesAndPublishPersistFormResult": {
      const [newState, cmds] = handlePersistFormResult(state, msg.value);
      const opportunity = state.opportunity;
      if (!opportunity) return [newState, cmds];
      return [
        newState,
        [
          ...cmds,
          updateStatus(
            opportunity.id,
            TWUOpportunityStatus.Published,
            (result) => adt("onSaveChangesAndPublishUpdateStatusResult", result)
          )
        ]
      ];
    }
    case "onSaveChangesAndPublishUpdateStatusResult": {
      state = stopSaveChangesAndUpdateStatusLoading(state);
      return handleUpdateStatusResult(
        state,
        msg.value,
        (state1) => {
          const opportunity = state1.opportunity;
          if (!opportunity) return [state1, []];
          return [
            state1,
            [
              component_.cmd.dispatch(component_.global.reloadMsg()),
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.published.success(opportunity.id))
                )
              )
            ]
          ];
        },
        (state1) => {
          return [
            state1,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.published.error)
                )
              )
            ]
          ];
        }
      );
    }
    case "saveChangesAndSubmit": {
      const form = state.form;
      if (!form) return [state, []];
      state = state.set("showModal", null);
      return [
        startSaveChangesAndUpdateStatusLoading(state),
        [
          persistForm(form, (result) =>
            adt("onSaveChangesAndSubmitPersistFormResult", result)
          )
        ]
      ];
    }
    case "onSaveChangesAndSubmitPersistFormResult": {
      const [newState, cmds] = handlePersistFormResult(state, msg.value);
      const opportunity = state.opportunity;
      if (!opportunity) return [newState, cmds];
      return [
        newState,
        [
          ...cmds,
          updateStatus(
            opportunity.id,
            TWUOpportunityStatus.UnderReview,
            (result) => adt("onSaveChangesAndSubmitUpdateStatusResult", result)
          )
        ]
      ];
    }
    case "onSaveChangesAndSubmitUpdateStatusResult": {
      state = stopSaveChangesAndUpdateStatusLoading(state);
      return handleUpdateStatusResult(
        state,
        msg.value,
        (state1) => {
          const opportunity = state1.opportunity;
          if (!opportunity) return [state1, []];
          return [
            state1,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "success",
                    toasts.statusChanged.success(
                      TWUOpportunityStatus.UnderReview
                    )
                  )
                )
              )
            ]
          ];
        },
        (state1) => {
          return [
            state1,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "error",
                    toasts.statusChanged.error(TWUOpportunityStatus.UnderReview)
                  )
                )
              )
            ]
          ];
        }
      );
    }
    case "updateStatus": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = state.set("showModal", null);
      return [
        startUpdateStatusLoading(state),
        [
          updateStatus(opportunity.id, msg.value, (result) =>
            adt("onUpdateStatusResult", [msg.value, result])
          )
        ]
      ];
    }
    case "onUpdateStatusResult": {
      const [intendedStatus, result] = msg.value;
      const isPublish = intendedStatus === TWUOpportunityStatus.Published;
      state = stopUpdateStatusLoading(state);
      return handleUpdateStatusResult(
        state,
        result,
        (state1) => {
          const opportunity = state1.opportunity;
          if (!opportunity) return [state1, []];
          return [
            state1,
            isPublish
              ? [
                  component_.cmd.dispatch(component_.global.reloadMsg()),
                  component_.cmd.dispatch(
                    component_.global.showToastMsg(
                      adt("success", toasts.published.success(opportunity.id))
                    )
                  )
                ]
              : [
                  component_.cmd.dispatch(
                    component_.global.showToastMsg(
                      adt(
                        "success",
                        toasts.statusChanged.success(opportunity.status)
                      )
                    )
                  )
                ]
          ];
        },
        (state1) => {
          const opportunity = state1.opportunity;
          if (!opportunity) return [state1, []];
          return [
            state1,
            isPublish
              ? [
                  component_.cmd.dispatch(
                    component_.global.showToastMsg(
                      adt("error", toasts.published.error)
                    )
                  )
                ]
              : [
                  component_.cmd.dispatch(
                    component_.global.showToastMsg(
                      adt(
                        "error",
                        toasts.statusChanged.error(opportunity.status)
                      )
                    )
                  )
                ]
          ];
        }
      );
    }
    case "delete": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      return [
        startDeleteLoading(state),
        [
          api.opportunities.twu.delete_<Msg>()(opportunity.id, (result) =>
            adt("onDeleteResult", result)
          )
        ]
      ];
    }
    case "onDeleteResult": {
      const result = msg.value;
      switch (result.tag) {
        case "valid":
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.replaceRouteMsg(
                  adt("opportunities" as const, null)
                )
              ),
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.deleted.success)
                )
              )
            ]
          ];
        default:
          return [
            stopDeleteLoading(state),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.deleted.error)
                )
              )
            ]
          ];
      }
    }
    default:
      return [state, []];
  }
};

const Reporting: component_.base.ComponentView<State, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  if (!opportunity || opportunity.status === TWUOpportunityStatus.Draft) {
    return null;
  }
  const reporting = opportunity.reporting;
  const reportCards: ReportCard[] = [
    {
      icon: "alarm-clock",
      name: "Proposals Due",
      value: formatDate(opportunity.proposalDeadline)
    },
    {
      icon: "binoculars",
      name: "Total Views",
      value: formatAmount(reporting?.numViews || 0)
    },
    {
      icon: "eye",
      name: "Watching",
      value: formatAmount(reporting?.numWatchers || 0)
    }
  ];
  return (
    <Row className="mt-5">
      <Col xs="12">
        <ReportCardList reportCards={reportCards} />
      </Col>
    </Row>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = (props) => {
  const { state, dispatch } = props;
  const opportunity = state.opportunity;
  const form = state.form;
  if (!opportunity || !form) return null;
  const viewerUser = state.viewerUser;
  const isStartEditingLoading = state.startEditingLoading > 0;
  const isSaveChangesLoading = state.saveChangesLoading > 0;
  const isUpdateStatusLoading = state.updateStatusLoading > 0;
  const isDeleteLoading = state.deleteLoading > 0;
  const isLoading =
    isStartEditingLoading ||
    isSaveChangesLoading ||
    isUpdateStatusLoading ||
    isDeleteLoading;
  return (
    <div>
      <EditTabHeader opportunity={opportunity} viewerUser={viewerUser} />
      <Reporting {...props} />
      <Row className="mt-5">
        <Col xs="12">
          <Form.view
            disabled={!state.isEditing || isLoading}
            state={form}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("form" as const, msg)
            )}
          />
        </Col>
      </Row>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,

  onInitResponse(response) {
    return adt("resetOpportunity", [response[0], false]) as InnerMsg;
  },

  getAlerts(state) {
    const opportunity = state.opportunity;
    const form = state.form;
    if (!opportunity || !form) return component_.page.alerts.empty();
    return {
      warnings:
        opportunity.status === TWUOpportunityStatus.Draft && !Form.isValid(form)
          ? [
              {
                text: `This opportunity is a draft. Please select "Edit" from the Actions dropdown to complete and ${
                  isAdmin(state.viewerUser) ? "publish" : "submit"
                } this opportunity.`
              }
            ]
          : []
    };
  },

  getModal: (state) => {
    const opportunity = state.opportunity;
    if (!opportunity) return component_.page.modal.hide();
    switch (state.showModal) {
      case "publish":
      case "saveChangesAndPublish":
        return component_.page.modal.show({
          title: "Publish Team With Us Opportunity?",
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Publish Opportunity",
              icon: "bullhorn",
              color: "primary",
              button: true,
              msg:
                state.showModal === "publish"
                  ? (adt("updateStatus", TWUOpportunityStatus.Published) as Msg)
                  : adt("saveChangesAndPublish")
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ],
          body: () =>
            "Are you sure you want to publish this opportunity? Once published, all subscribers will be notified."
        });
      case "submit":
      case "saveChangesAndSubmit":
        return component_.page.modal.show({
          title: "Submit Opportunity for Review?",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Submit for Review",
              icon: "paper-plane",
              color: "primary",
              button: true,
              msg:
                state.showModal === "submit"
                  ? (adt(
                      "updateStatus",
                      TWUOpportunityStatus.UnderReview
                    ) as Msg)
                  : adt("saveChangesAndSubmit")
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ],
          body: () =>
            "Are you sure you want to submit this Team With Us opportunity for review? Once submitted, an administrator will review it and may reach out to you to request changes before publishing it."
        });
      case "publishChanges":
        return component_.page.modal.show({
          title: "Publish Changes to Team With Us Opportunity?",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Publish Changes",
              icon: "bullhorn",
              color: "primary",
              button: true,
              msg: adt("saveChanges") // This is the reason this is a different modal from 'saveChangesAndPublish'
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ],
          body: () =>
            "Are you sure you want to publish your changes to this opportunity? Once published, all subscribers will be notified."
        });
      case "submitChanges":
        return component_.page.modal.show({
          title: "Submit Changes for Review?",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Submit Changes",
              icon: "paper-plane",
              color: "primary",
              button: true,
              msg: adt("saveChanges") // This is the reason this is a different modal from 'saveChangesAndPublish'
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ],
          body: () =>
            "Are you sure you want to submit your changes to this Team With Us opportunity for review? Once submitted, an administrator will review it and may reach out to you to request changes before publishing it."
        });
      case "suspend":
        return component_.page.modal.show({
          title: "Suspend Team With Us Opportunity?",
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Suspend Opportunity",
              icon: "pause-circle",
              color: "warning",
              button: true,
              msg: adt("updateStatus", TWUOpportunityStatus.Suspended) as Msg
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ],
          body: () =>
            "Are you sure you want to suspend this opportunity? Once suspended, all subscribers and vendors with pending or submitted proposals will be notified."
        });
      case "delete":
        return component_.page.modal.show({
          title: "Delete Team With Us Opportunity?",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Delete Opportunity",
              icon: "trash",
              color: "danger",
              button: true,
              msg: adt("delete")
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ],
          body: () =>
            "Are you sure you want to delete this opportunity? You will not be able to recover it once it has been deleted."
        });
      case "cancel":
        return component_.page.modal.show({
          title: "Cancel Team With Us Opportunity?",
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Cancel Opportunity",
              icon: "minus-circle",
              color: "danger",
              button: true,
              msg: adt("updateStatus", TWUOpportunityStatus.Canceled) as Msg
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ],
          body: () =>
            "Are you sure you want to cancel this opportunity? Once cancelled, all subscribers and vendors with pending or submitted proposals will be notified."
        });
      case null:
        return component_.page.modal.hide();
    }
  },

  /**
   *
   * @param param0
   * @returns
   */
  getActions({ state, dispatch }) {
    const isStartEditingLoading = state.startEditingLoading > 0;
    const isSaveChangesLoading = state.saveChangesLoading > 0;
    const isSaveChangesAndUpdateStatusLoading =
      state.saveChangesAndUpdateStatusLoading > 0;
    const isUpdateStatusLoading = state.updateStatusLoading > 0;
    const isDeleteLoading = state.deleteLoading > 0;
    const isLoading =
      isStartEditingLoading ||
      isSaveChangesLoading ||
      isUpdateStatusLoading ||
      isDeleteLoading;
    const opp = state.opportunity;
    const form = state.form;
    if (!opp || !form) return component_.page.actions.none();
    const isValid = () => Form.isValid(form);
    const viewerIsAdmin = isAdmin(state.viewerUser);
    const isPublic = isTWUOpportunityPublic(opp);
    const isDraft = opp.status === TWUOpportunityStatus.Draft;
    const isUnderReview = opp.status === TWUOpportunityStatus.UnderReview;
    // Show relevant actions when the user is editing the opportunity.
    if (state.isEditing) {
      return component_.page.actions.links(
        (() => {
          const links: LinkProps[] = [];
          if (!isPublic && viewerIsAdmin) {
            // Allow admins to publish changes directly after editing a non-public opp.
            links.push({
              children: "Publish",
              symbol_: leftPlacement(iconLinkSymbol("bullhorn")),
              button: true,
              loading: isSaveChangesAndUpdateStatusLoading,
              disabled: isSaveChangesAndUpdateStatusLoading || !isValid(),
              color: "primary",
              onClick: () =>
                dispatch(adt("showModal", "saveChangesAndPublish" as const))
            });
          } else if (isDraft && !viewerIsAdmin) {
            // Allow non-admin opp owners to submit changes directly to admins
            // when editing a draft opp.
            links.push({
              children: "Submit for Review",
              symbol_: leftPlacement(iconLinkSymbol("paper-plane")),
              button: true,
              loading: isSaveChangesAndUpdateStatusLoading,
              disabled: isSaveChangesAndUpdateStatusLoading || !isValid(),
              color: "primary",
              onClick: () =>
                dispatch(adt("showModal", "saveChangesAndSubmit" as const))
            });
          }
          if (viewerIsAdmin) {
            // Show the save button for admins.
            links.push({
              children: isTWUOpportunityPublic(opp)
                ? "Publish Changes"
                : "Save Changes",
              disabled:
                isSaveChangesLoading ||
                (() => {
                  if (isDraft) {
                    // No validation required, always possible to save a draft.
                    return false;
                  } else {
                    return !isValid();
                  }
                })(),
              onClick: () =>
                dispatch(
                  isTWUOpportunityPublic(opp)
                    ? adt("showModal", "publishChanges" as const)
                    : adt("saveChanges")
                ),
              button: true,
              loading: isSaveChangesLoading,
              symbol_: leftPlacement(
                iconLinkSymbol(
                  isTWUOpportunityPublic(opp) ? "bullhorn" : "save"
                )
              ),
              color: isTWUOpportunityPublic(opp) ? "primary" : "success"
            });
          } else if (!viewerIsAdmin && (isDraft || isUnderReview)) {
            // Show a save/submit button for non-admins only when the opp is a draft or under review.
            links.push({
              children: isUnderReview ? "Submit Changes" : "Save Changes",
              disabled:
                isSaveChangesLoading ||
                (() => {
                  if (isDraft) {
                    // No validation required, always possible to save a draft.
                    return false;
                  } else {
                    return !isValid();
                  }
                })(),
              onClick: () =>
                dispatch(
                  isUnderReview
                    ? adt("showModal", "submitChanges" as const)
                    : adt("saveChanges")
                ),
              button: true,
              loading: isSaveChangesLoading,
              symbol_: leftPlacement(
                iconLinkSymbol(isUnderReview ? "paper-plane" : "save")
              ),
              color: isUnderReview ? "primary" : "success"
            });
          }
          // Add cancel link.
          links.push({
            children: "Cancel",
            disabled: isLoading,
            onClick: () => dispatch(adt("cancelEditing")),
            color: "c-nav-fg-alt"
          });
          return links;
        })()
      );
    }
    // Show actions when the user is not editing the opportunity.
    switch (opp.status) {
      case TWUOpportunityStatus.Draft:
        return component_.page.actions.dropdown({
          text: "Actions",
          loading: isLoading,
          linkGroups: [
            {
              links: [
                {
                  children: viewerIsAdmin ? "Publish" : "Submit for Review",
                  disabled: !isValid(),
                  symbol_: leftPlacement(
                    iconLinkSymbol(viewerIsAdmin ? "bullhorn" : "paper-plane")
                  ),
                  onClick: () =>
                    dispatch(
                      adt(
                        "showModal",
                        viewerIsAdmin ? "publish" : "submit"
                      ) as Msg
                    )
                },
                {
                  children: "Edit",
                  symbol_: leftPlacement(iconLinkSymbol("edit")),
                  onClick: () => dispatch(adt("startEditing"))
                }
              ]
            },
            {
              links: [
                {
                  children: "Delete",
                  symbol_: leftPlacement(iconLinkSymbol("trash")),
                  onClick: () => dispatch(adt("showModal", "delete" as const))
                }
              ]
            }
          ]
        });

      case TWUOpportunityStatus.UnderReview:
        if (viewerIsAdmin) {
          return component_.page.actions.dropdown({
            text: "Actions",
            loading: isLoading,
            linkGroups: [
              {
                links: [
                  {
                    children: "Publish",
                    disabled: !isValid(),
                    symbol_: leftPlacement(iconLinkSymbol("bullhorn")),
                    onClick: () => dispatch(adt("showModal", "publish") as Msg)
                  },
                  {
                    children: "Edit",
                    symbol_: leftPlacement(iconLinkSymbol("edit")),
                    onClick: () => dispatch(adt("startEditing"))
                  }
                ]
              },
              {
                links: [
                  {
                    children: "Delete",
                    symbol_: leftPlacement(iconLinkSymbol("trash")),
                    onClick: () => dispatch(adt("showModal", "delete" as const))
                  }
                ]
              }
            ]
          });
        } else {
          return component_.page.actions.links([
            {
              children: "Edit",
              symbol_: leftPlacement(iconLinkSymbol("edit")),
              onClick: () => dispatch(adt("startEditing")),
              button: true,
              color: "primary"
            }
          ]);
        }
      case TWUOpportunityStatus.Published:
        if (!viewerIsAdmin) {
          return component_.page.actions.none();
        }
        return component_.page.actions.dropdown({
          text: "Actions",
          loading: isLoading,
          linkGroups: [
            {
              links: [
                {
                  children: "Edit",
                  symbol_: leftPlacement(iconLinkSymbol("edit")),
                  onClick: () => dispatch(adt("startEditing"))
                }
              ]
            },
            {
              links: [
                {
                  children: "Suspend",
                  symbol_: leftPlacement(iconLinkSymbol("pause-circle")),
                  onClick: () => dispatch(adt("showModal", "suspend" as const))
                },
                {
                  children: "Cancel",
                  symbol_: leftPlacement(iconLinkSymbol("minus-circle")),
                  onClick: () => dispatch(adt("showModal", "cancel" as const))
                }
              ]
            }
          ]
        });
      case TWUOpportunityStatus.Suspended:
        if (!viewerIsAdmin) {
          return component_.page.actions.none();
        }
        return component_.page.actions.dropdown({
          text: "Actions",
          loading: isLoading,
          linkGroups: [
            {
              links: [
                {
                  children: "Publish",
                  symbol_: leftPlacement(iconLinkSymbol("bullhorn")),
                  onClick: () => dispatch(adt("showModal", "publish" as const))
                },
                {
                  children: "Edit",
                  symbol_: leftPlacement(iconLinkSymbol("edit")),
                  onClick: () => dispatch(adt("startEditing"))
                }
              ]
            },
            {
              links: [
                {
                  children: "Cancel",
                  symbol_: leftPlacement(iconLinkSymbol("minus-circle")),
                  onClick: () => dispatch(adt("showModal", "cancel" as const))
                }
              ]
            }
          ]
        });
      case TWUOpportunityStatus.EvaluationResourceQuestions:
      case TWUOpportunityStatus.EvaluationChallenge:
        if (!viewerIsAdmin) {
          return component_.page.actions.none();
        }
        return component_.page.actions.links([
          {
            children: "Cancel",
            symbol_: leftPlacement(iconLinkSymbol("minus-circle")),
            onClick: () => dispatch(adt("showModal", "cancel" as const)),
            button: true,
            outline: true,
            color: "c-nav-fg-alt"
          }
        ]);
      default:
        return component_.page.actions.none();
    }
  }
};
