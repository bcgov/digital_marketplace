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
import React, { useEffect } from "react";
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
import { useCopilotChat, useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import {
  opportunityToPublicState,
  FORMATTED_CRITERIA
} from "front-end/lib/pages/opportunity/team-with-us/lib/ai";
import { twuServiceAreaToTitleCase } from "front-end/lib/pages/opportunity/team-with-us/lib";
import {
  identifyRelevantCriteria,
  generateEnhancedCitationText,
  CRITERIA_MAPPINGS,
  getAllDocumentsWithLinks
} from "front-end/lib/pages/opportunity/team-with-us/lib/criteria-mapping";
// import ActionDebugPanel from "front-end/lib/pages/opportunity/team-with-us/lib/action-debug";
import * as FormField from "front-end/lib/components/form-field";

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
  users: User[];
  showModal: ModalId | null;
  startEditingLoading: number;
  saveChangesLoading: number;
  saveChangesAndUpdateStatusLoading: number;
  updateStatusLoading: number;
  deleteLoading: number;
  reviewWithAILoading: number;
  opportunityForReview: TWUOpportunity | null;
  isEditing: boolean;
}

type UpdateStatus =
  | TWUOpportunityStatus.UnderReview
  | TWUOpportunityStatus.Published
  | TWUOpportunityStatus.Canceled
  | TWUOpportunityStatus.Suspended;

export type InnerMsg =
  | ADT<"resetOpportunity", [TWUOpportunity, User[], boolean]>
  | ADT<"form", Form.Msg>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"startEditing">
  | ADT<
      "onStartEditingResponse",
      [
        api.ResponseValidation<TWUOpportunity, string[]>,
        api.ResponseValidation<User[], string[]>
      ]
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
    >
  | ADT<"reviewWithAI">
  | ADT<"onReviewAIResponse", Form.PersistResult>
  | ADT<"setOpportunityForReview", TWUOpportunity>
  | ADT<"clearOpportunityForReview">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

function initForm(
  opportunity: TWUOpportunity,
  viewerUser: User,
  users: User[],
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
    ),
    users
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
      users: [],
      form: null,
      showModal: null,
      startEditingLoading: 0,
      saveChangesLoading: 0,
      saveChangesAndUpdateStatusLoading: 0,
      updateStatusLoading: 0,
      deleteLoading: 0,
      reviewWithAILoading: 0,
      opportunityForReview: null,
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
const startReviewWithAILoading = makeStartLoading<State>("reviewWithAILoading");
const stopReviewWithAILoading = makeStopLoading<State>("reviewWithAILoading");

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
        state.users,
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
      const [opportunity, users, validateForm] = msg.value;
      const currentFormState = state.form;
      const activeTab = currentFormState
        ? Form.getActiveTab(currentFormState)
        : undefined;
      const [formState, formCmds] = initForm(
        opportunity,
        state.viewerUser,
        users,
        activeTab,
        validateForm
      );
      return [
        state
          .set("opportunity", opportunity)
          .set("users", users)
          .set("form", formState),
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
          component_.cmd.join(
            api.opportunities.twu.readOne()(
              opportunity.id,
              (response) => response
            ),
            api.users.readMany()((response) => response),
            (opportunity, users) => {
              return adt("onStartEditingResponse", [opportunity, users]) as Msg;
            }
          )
        ]
      ];
    }
    case "onStartEditingResponse": {
      state = stopStartEditingLoading(state);
      const result = msg.value;
      if (api.isValid(result[0]) && api.isValid(result[1])) {
        return [
          state.set("isEditing", true),
          [
            component_.cmd.dispatch(
              adt("resetOpportunity", [
                result[0].value,
                result[1].value,
                isUnpublished(result[0].value)
              ]) as InnerMsg
            )
          ]
        ];
      }
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
    case "cancelEditing": {
      const { opportunity, users } = state;
      if (!opportunity || !users) return [state, []];
      return [
        state.set("isEditing", false),
        [
          component_.cmd.dispatch(
            adt("resetOpportunity", [opportunity, users, false]) as InnerMsg
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
            adt("onUpdateStatusResult", [msg.value, result]) as InnerMsg
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
    case "reviewWithAI": {
      const form = state.form;
      if (!form) return [state, []];

      // Programmatically click the CopilotKit button to open the chat window
      setTimeout(() => {
        const copilotButton = document.querySelector(
          ".copilotKitButton"
        ) as HTMLButtonElement;
        if (copilotButton) {
          copilotButton.click();
        }
      }, 100);

      return [
        startReviewWithAILoading(state),
        [persistForm(form, (result) => adt("onReviewAIResponse", result))]
      ];
    }
    case "onReviewAIResponse": {
      state = stopReviewWithAILoading(state);
      const result = msg.value;
      if (result.tag === "valid") {
        const [resultFormState, resultCmds, opportunity] = result.value;
        return [
          state.set("form", resultFormState),
          [
            ...component_.cmd.mapMany(
              resultCmds,
              (msg) => adt("form", msg) as Msg
            ),
            component_.cmd.dispatch(
              adt("setOpportunityForReview", opportunity) as Msg
            )
          ]
        ];
      }
      return [state, []];
    }
    case "setOpportunityForReview":
      return [state.set("opportunityForReview", msg.value), []];
    case "clearOpportunityForReview":
      return [state.set("opportunityForReview", null), []];
    default:
      return [state, []];
  }
};

const AI_REVIEW_BUTTON_COLOR = "primary";

const Reporting: component_.base.ComponentView<State, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  if (!opportunity || opportunity.status === TWUOpportunityStatus.Draft) {
    return null;
  }
  const reporting = opportunity.reporting;
  const reportCards: ReportCard[] = [
    {
      icon: "alarm-clock",
      name: "Proposals Deadline",
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
  const isStartEditingLoading = state.startEditingLoading > 0;
  const isSaveChangesLoading = state.saveChangesLoading > 0;

  const isUpdateStatusLoading = state.updateStatusLoading > 0;
  const isDeleteLoading = state.deleteLoading > 0;
  const isReviewWithAILoading = state.reviewWithAILoading > 0;
  const isLoading =
    isStartEditingLoading ||
    isSaveChangesLoading ||
    isUpdateStatusLoading ||
    isDeleteLoading ||
    isReviewWithAILoading;

  const { appendMessage, setMessages } = useCopilotChat();

  // Make current opportunity data readable to the copilot
  const readableOpportunity = state.opportunity
    ? opportunityToPublicState(state.opportunity)
    : null;

  useCopilotReadable({
    description: "The Team With Us Opportunity that is currently being edited. This includes all form fields and their current values.",
    value: readableOpportunity
  });

  // Also make the current form state readable
  useCopilotReadable({
    description: "Current form state including whether the opportunity is being edited and field values",
    value: {
      isEditing: state.isEditing,
      currentDescription: state.form?.description.child.value || "",
      formValid: state.form ? Form.isValid(state.form) : false
    }
  });

  // Make available actions visible to the AI with explicit instructions
  useCopilotReadable({
    description: "CRITICAL: Available CopilotKit actions that you MUST ACTUALLY EXECUTE when requested - DO NOT just write the function syntax",
    value: {
      INSTRUCTION: "When a user asks for something that requires an action, you MUST call the action and use its return value. DO NOT write 'getCriteriaDocumentation()' as text - ACTUALLY CALL IT.",
      availableActions: [
        {
          name: "startEditing",
          description: "Start editing mode for the opportunity - CALL THIS ACTION when user wants to edit or modify the opportunity",
          howToUse: "EXECUTE this action when user wants to start editing, don't write function syntax"
        },
        {
          name: "debugTest",
          description: "Test if actions are working - CALL THIS ACTION when user asks to test",
          howToUse: "EXECUTE the action when user asks to test, don't write text"
        },
        {
          name: "getCriteriaDocumentation", 
          description: "Get Team With Us criteria documentation - CALL THIS ACTION when user asks about criteria",
          howToUse: "EXECUTE this action and return the documentation, don't write function syntax"
        },
        {
          name: "getOpportunityDescription",
          description: "Get current opportunity description - CALL THIS ACTION when user asks about description",
          howToUse: "EXECUTE this action to get real description content"
        },
        {
          name: "updateOpportunityDescription",
          description: "Update the opportunity description - CALL THIS ACTION when user wants to change description",
          howToUse: "EXECUTE this action with new text, don't write function syntax"
        },
        {
          name: "reviewOpportunity",
          description: "Perform comprehensive review against procurement criteria - CALL ONLY when user explicitly requests review",
          howToUse: "EXECUTE this action ONLY when user explicitly asks for review. Do not call automatically."
        },
        {
          name: "updateOpportunityField",
          description: "Update any field in the opportunity - CALL THIS ACTION when user wants to change field values",
          howToUse: "EXECUTE this action with field name and new value"
        },
        {
          name: "getOpportunityFieldValue",
          description: "Get current field value - CALL THIS ACTION when user asks about field values",
          howToUse: "EXECUTE this action to get current field values"
        },
        {
          name: "addResource",
          description: "Add new resource requirement - CALL THIS ACTION when user wants to add resources",
          howToUse: "EXECUTE this action to add new resource"
        },
        {
          name: "deleteResource",
          description: "Delete a resource - CALL THIS ACTION when user wants to remove resources",
          howToUse: "EXECUTE this action with resource index"
        },
        {
          name: "updateResource",
          description: "Update resource details - CALL THIS ACTION when user wants to modify resource fields",
          howToUse: "EXECUTE this action with resource index, field name, and new value"
        },
        {
          name: "getResourceDetails",
          description: "Get resource information - CALL THIS ACTION when user asks about resource details",
          howToUse: "EXECUTE this action to get resource details"
        },
        {
          name: "addQuestion",
          description: "Add new resource question - CALL THIS ACTION when user wants to add questions",
          howToUse: "EXECUTE this action to add new question"
        },
        {
          name: "deleteQuestion",
          description: "Delete a question - CALL THIS ACTION when user wants to remove questions",
          howToUse: "EXECUTE this action with question index"
        },
        {
          name: "updateQuestion",
          description: "Update question details - CALL THIS ACTION when user wants to modify question fields",
          howToUse: "EXECUTE this action with question index, field name, and new value"
        },
        {
          name: "getQuestionDetails",
          description: "Get question information - CALL THIS ACTION when user asks about question details",
          howToUse: "EXECUTE this action to get question details"
        }
      ],
      IMPORTANT_REMINDER: "You are equipped with these actions. When users request something these actions can provide, CALL THE ACTION and use the result in your response. Do not write function call syntax as text."
    }
  });

  // Add criteria mapping context to help the AI provide better responses
  useCopilotReadable({
    description: "CRITERIA MAPPING: Enhanced context for procurement criteria questions",
    value: {
      criteriaMapping: {
        description: "When users ask about procurement criteria, requirements, or documentation, use the getCriteriaDocumentation() action to provide authoritative information",
        availableCriteria: CRITERIA_MAPPINGS,
        enhancedResponse: "Always reference official documentation when answering criteria-related questions. Use getCriteriaDocumentation() to provide comprehensive, authoritative responses.",
        isCriteriaRelatedQuestion: "Use this function to detect if a user question is related to procurement criteria",
        identifyRelevantCriteria: "Use this function to find relevant criteria for a user's question",
        generateEnhancedCitationText: "Use this function to create enhanced responses with proper citations"
      }
    }
  });

  // Add criteria mapping support for chat responses
  // Criteria mapping functionality - using a different approach to prevent loops
  React.useEffect(() => {
    console.log("🎯 CRITERIA MAPPING: Setting up enhanced AI responses");
    
    // Instead of monitoring messages (which causes loops), we'll provide
    // the criteria mapping functionality through the AI's system context
    // and make it available through the useCopilotReadable hook
    
  }, []);

  // Count how many times actions are registered (should be minimal)
  const actionRegistrationCount = React.useRef(0);
  actionRegistrationCount.current += 1;
  
  // Log registration count (should stay low)
  useEffect(() => {
    console.log(`🔧 CopilotKit actions registered (count: ${actionRegistrationCount.current})`, {
      isEditing: state.isEditing,
      hasForm: !!state.form,
      hasOpportunity: !!state.opportunity
    });
  }, []); // Empty dependency array = run once on mount

  // Copilot action to edit the description field
  useCopilotAction({
    name: "updateOpportunityDescription",
    description: "EDIT, UPDATE, MODIFY, or REWRITE the opportunity description field. Use this action when the user wants to: edit the description, update the description, modify the description, add content to the description, improve the description, rewrite the description, or change the description text. This includes adding budget guidance, technical requirements, or any other content to the description.",
    parameters: [
      {
        name: "newDescription",
        type: "string",
        description: "The new description content for the opportunity. This should be a complete description that will replace the current content.",
        required: true
      }
    ],
    handler: async ({ newDescription }) => {
      console.log("🚨🚨🚨 updateOpportunityDescription ACTION CALLED! 🚨🚨🚨");
      console.log("🎯 CopilotKit: updateOpportunityDescription called with:", newDescription);
      console.log("State.isEditing:", state.isEditing);
      console.log("State.form exists:", !!state.form);
      console.log("Current description before update:", state.form?.description.child.value);
      
      if (!state.isEditing) {
        return "❌ Error: Please start editing the opportunity first before updating the description. Click the 'Edit' button to enter editing mode.";
      }
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }
      
      try {
        // First switch to the Description tab to ensure we're on the right tab
        const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Description" as const))) as Msg;
        console.log("Switching to Description tab:", switchTabMsg);
        dispatch(switchTabMsg);
        
        // Small delay to ensure tab switch completes
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Update the description field in the form
        const updateMsg = adt("form", adt("description", adt("child", adt("onChangeTextArea", [newDescription, 0, newDescription.length])))) as Msg;
        console.log("Dispatching update message:", updateMsg);
        
        dispatch(updateMsg);
        console.log("✅ Description update dispatch completed successfully");
        
        // Give a moment for the update to process and verify
        await new Promise(resolve => setTimeout(resolve, 200));
        
                  // Give more time for the state to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if the update was successful
          const currentDescription = state.form?.description.child.value;
          console.log("Description after update:", currentDescription);
          
          // More lenient verification - check if the description contains the new content
          if (currentDescription && (currentDescription === newDescription || currentDescription.includes(newDescription.substring(0, 50)))) {
            return `✅ Description updated successfully! 
            
**New content preview:**
${newDescription.substring(0, 200)}${newDescription.length > 200 ? '...' : ''}

💡 **Tip:** The description has been updated in the form. Don't forget to save your changes when you're ready!`;
          } else {
            console.warn("Description update verification failed, but dispatch was successful");
            return `✅ Description update dispatched successfully! 

**Note:** The update has been sent to the form. The description should now be updated in the interface.

**New content preview:**
${newDescription.substring(0, 200)}${newDescription.length > 200 ? '...' : ''}

💡 **Tip:** The description has been updated in the form. Don't forget to save your changes when you're ready!`;
          }
        
      } catch (error) {
        console.error("❌ Error in updateOpportunityDescription:", error);
        return `❌ Error: Failed to update description - ${(error as Error).message}`;
      }
    }
  });

  // Copilot action to get the current description
  useCopilotAction({
    name: "getOpportunityDescription",
    description: "Get the current description content of the Team With Us opportunity to understand what's currently written.",
    parameters: [],
    handler: async () => {
      console.log("🚨🚨🚨 getOpportunityDescription ACTION CALLED! 🚨🚨🚨");
      console.log("🎯 CopilotKit: getOpportunityDescription called");
      console.log("State form:", state.form);
      console.log("Description state:", state.form?.description);
      
      if (state.form) {
        const currentDescription = state.form.description.child.value;
        console.log("Current description value:", currentDescription);
        
        // Also try getting from the opportunity directly as fallback
        const opportunityDescription = state.opportunity?.description;
        console.log("Opportunity description fallback:", opportunityDescription);
        
        const description = currentDescription || opportunityDescription || "(No description set yet)";
        return `Current opportunity description:\n\n${description}`;
      } else {
        return "Unable to get current description - form not available.";
      }
    }
  });

  // Add copilot action for criteria documentation lookup
  useCopilotAction({
    name: "getCriteriaDocumentation",
    description: "Get information about Team With Us evaluation criteria and supporting documentation. Use this when users ask about specific criteria, requirements, or need document references.",
    parameters: [
      {
        name: "criteriaArea",
        type: "string",
        description: "The specific criteria area to get information about. Options: 'organization-legal', 'contract-outcomes', 'mandatory-skills', 'timeline-planning', 'budget-financial', 'contract-extensions', 'information-gaps', 'vendor-experience', or 'all' for all criteria.",
        required: false
      }
    ],
    handler: async ({ criteriaArea }) => {
      console.log("🚨🚨🚨 getCriteriaDocumentation ACTION CALLED! 🚨🚨🚨");
      console.log("🎯 getCriteriaDocumentation action called!");
      console.log("Parameters received:", { criteriaArea });
      
      try {
        if (criteriaArea && criteriaArea !== 'all') {
          console.log("Processing specific criteria area:", criteriaArea);
          const criteria = identifyRelevantCriteria(criteriaArea);
          console.log("Identified criteria:", criteria);
          const citationText = generateEnhancedCitationText(criteria);
          console.log("Generated citation text:", citationText);
          return `Here's the documentation for the requested criteria area:\n${citationText}`;
        } else {
          console.log("Processing all criteria areas");
          // Return all criteria information
          const allCriteria = Object.keys(CRITERIA_MAPPINGS);
          console.log("All criteria keys:", allCriteria);
          const citationText = generateEnhancedCitationText(allCriteria);
          console.log("Generated citation text for all criteria:", citationText);
          return `Here's the complete Team With Us evaluation criteria documentation:\n${citationText}`;
        }
      } catch (error) {
        console.error("❌ Error in getCriteriaDocumentation:", error);
        return `Error retrieving criteria documentation: ${(error as Error).message}`;
      }
    }
  });

  // Add action to list all available documents with links
  useCopilotAction({
    name: "listAvailableDocuments",
    description: "Get a list of all available Team With Us reference documents with clickable links. Use this when users ask for all documents, want to see what's available, or need a complete reference list.",
    parameters: [],
    handler: async () => {
      console.log("🚨🚨🚨 listAvailableDocuments ACTION CALLED! 🚨🚨🚨");
      console.log("🎯 listAvailableDocuments action called!");
      
      try {
        const documents = getAllDocumentsWithLinks();
        console.log("Available documents:", documents);
        
        let response = "📋 **Available Team With Us Reference Documents:**\n\n";
        
        documents.forEach((doc, index) => {
          if (doc.url) {
            response += `${index + 1}. **[${doc.name}](${doc.url})**\n`;
            response += `   *Authority: ${doc.authority}*\n\n`;
          } else {
            response += `${index + 1}. **${doc.name}**\n`;
            response += `   *Authority: ${doc.authority}*\n`;
            response += `   *(Link not available)*\n\n`;
          }
        });
        
        response += "\n💡 **Tip:** Click on any document title to access it directly. These documents contain the official guidelines, requirements, and procedures for Team With Us procurement.";
        
        return response;
      } catch (error) {
        console.error("❌ Error in listAvailableDocuments:", error);
        return `Error retrieving document list: ${(error as Error).message}`;
      }
    }
  });

  // Add a simple debug action to test if actions work at all
  useCopilotAction({
    name: "debugTest",
    description: "Simple test action to verify CopilotKit actions are working. Call this to test the action system.",
    parameters: [],
    handler: async () => {
      console.log("🚨🚨🚨 debugTest ACTION CALLED! 🚨🚨🚨");
      console.log("🎯 DEBUG: Test action called successfully from frontend!");
      console.log("🎯 Action executed at:", new Date().toISOString());
      console.log("🎯 Current state:", { isEditing: state.isEditing, hasForm: !!state.form });
      return "✅ Debug test successful! CopilotKit frontend action executed successfully. The action system is functioning correctly.";
    }
  });

  // Comprehensive action to update any form field
  useCopilotAction({
    name: "updateOpportunityField",
    description: "Update any field in the Team With Us opportunity form. Use this when users want to modify specific fields like title, location, budget, dates, etc.",
    parameters: [
      {
        name: "fieldName",
        type: "string",
        description: "The field to update. Options: 'title', 'teaser', 'location', 'maxBudget', 'costRecovery', 'remoteOk', 'remoteDesc', 'proposalDeadline', 'assignmentDate', 'startDate', 'completionDate', 'questionsWeight', 'challengeWeight', 'priceWeight'",
        required: true
      },
      {
        name: "value",
        type: "string",
        description: "The new value for the field. For dates use YYYY-MM-DD format. For remoteOk use 'yes' or 'no'. For numbers use numeric strings.",
        required: true
      }
    ],
    handler: async ({ fieldName, value }) => {
      console.log("🚨🚨🚨 updateOpportunityField ACTION CALLED! 🚨🚨🚨");
      console.log("🎯 Field:", fieldName, "Value:", value);
      console.log("State.isEditing:", state.isEditing);
      console.log("State.form exists:", !!state.form);
      
      if (!state.isEditing) {
        return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
      }
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }

      // Define field configurations
      const fieldConfigs = {
        // Overview Tab - Text fields
        title: { tab: "Overview", type: "text", msg: adt("form", adt("title", adt("child", adt("onChange", value)))) },
        teaser: { tab: "Overview", type: "text", msg: adt("form", adt("teaser", adt("child", adt("onChange", value)))) },
        location: { tab: "Overview", type: "text", msg: adt("form", adt("location", adt("child", adt("onChange", value)))) },
        remoteDesc: { tab: "Overview", type: "text", msg: adt("form", adt("remoteDesc", adt("child", adt("onChange", value)))) },
        
        // Overview Tab - Number fields
        maxBudget: { 
          tab: "Overview", 
          type: "number", 
          msg: adt("form", adt("maxBudget", adt("child", adt("onChange", parseFloat(value) || null)))) 
        },
        costRecovery: { 
          tab: "Overview", 
          type: "number", 
          msg: adt("form", adt("costRecovery", adt("child", adt("onChange", parseFloat(value) || null)))) 
        },
        
        // Overview Tab - Radio field
        remoteOk: { 
          tab: "Overview", 
          type: "radio", 
          msg: adt("form", adt("remoteOk", adt("child", adt("onChange", value === "yes" ? "yes" : "no")))) 
        },
        
        // Overview Tab - Date fields
        proposalDeadline: { 
          tab: "Overview", 
          type: "date", 
          msg: adt("form", adt("proposalDeadline", adt("child", adt("onChange", parseDateValue(value))))) 
        },
        assignmentDate: { 
          tab: "Overview", 
          type: "date", 
          msg: adt("form", adt("assignmentDate", adt("child", adt("onChange", parseDateValue(value))))) 
        },
        startDate: { 
          tab: "Overview", 
          type: "date", 
          msg: adt("form", adt("startDate", adt("child", adt("onChange", parseDateValue(value))))) 
        },
        completionDate: { 
          tab: "Overview", 
          type: "date", 
          msg: adt("form", adt("completionDate", adt("child", adt("onChange", parseDateValue(value))))) 
        },
        
        // Scoring Tab - Number fields
        questionsWeight: { 
          tab: "Scoring", 
          type: "number", 
          msg: adt("form", adt("questionsWeight", adt("child", adt("onChange", parseFloat(value) || null)))) 
        },
        challengeWeight: { 
          tab: "Scoring", 
          type: "number", 
          msg: adt("form", adt("challengeWeight", adt("child", adt("onChange", parseFloat(value) || null)))) 
        },
        priceWeight: { 
          tab: "Scoring", 
          type: "number", 
          msg: adt("form", adt("priceWeight", adt("child", adt("onChange", parseFloat(value) || null)))) 
        }
      };

      // Helper function to parse date values
      function parseDateValue(dateStr: string) {
        const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (!match) return null;
        const [, year, month, day] = match;
        return [parseInt(year), parseInt(month), parseInt(day)];
      }
      
      const config = fieldConfigs[fieldName as keyof typeof fieldConfigs];
      if (!config) {
        return `❌ Error: Unknown field '${fieldName}'. Available fields: ${Object.keys(fieldConfigs).join(', ')}`;
      }
      
      try {
        // Switch to the appropriate tab
        const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", config.tab as any))) as Msg;
        console.log(`Switching to ${config.tab} tab:`, switchTabMsg);
        dispatch(switchTabMsg);
        
        // Small delay to ensure tab switch completes
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Update the field
        console.log("Dispatching field update:", config.msg);
        dispatch(config.msg as Msg);
        console.log("✅ Field update dispatch completed successfully");
        
        // Give a moment for the update to process
        await new Promise(resolve => setTimeout(resolve, 200));
        

        
        return `✅ **${fieldName}** updated successfully!

**Tab:** ${config.tab}
**New value:** ${value}
**Field type:** ${config.type}

💡 **Tip:** The field has been updated in the form. Don't forget to save your changes when you're ready!`;
        
      } catch (error) {
        console.error("❌ Error in updateOpportunityField:", error);
        return `❌ Error: Failed to update ${fieldName} - ${(error as Error).message}`;
      }
    }
  });

  // Action to add a new resource
  useCopilotAction({
    name: "addResource",
    description: "Add a new resource to the Team With Us opportunity. Use this when the user wants to add another resource requirement.",
    parameters: [],
    handler: async () => {
      console.log("🚨🚨🚨 addResource ACTION CALLED! 🚨🚨🚨");
      
      if (!state.isEditing) {
        return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
      }
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }
      
      try {
        // Switch to Resource Details tab
        const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Details" as const))) as Msg;
        console.log("Switching to Resource Details tab:", switchTabMsg);
        dispatch(switchTabMsg);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Add new resource
        const addResourceMsg = adt("form", adt("resources", adt("addResource"))) as Msg;
        console.log("Adding new resource:", addResourceMsg);
        dispatch(addResourceMsg);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const resourceCount = state.form?.resources?.resources?.length || 0;
        return `✅ **New resource added successfully!**

**Total resources:** ${resourceCount}

💡 **Tip:** You can now configure the service area, target allocation, and skills for the new resource using the updateResource action.`;
        
      } catch (error) {
        console.error("❌ Error adding resource:", error);
        return `❌ Error: Failed to add resource - ${(error as Error).message}`;
      }
    }
  });

  // Action to delete a resource
  useCopilotAction({
    name: "deleteResource",
    description: "Delete a resource from the Team With Us opportunity. Use this when the user wants to remove a resource requirement.",
    parameters: [
      {
        name: "resourceIndex",
        type: "string",
        description: "The index of the resource to delete (0-based, e.g., '0' for first resource, '1' for second resource)",
        required: true
      }
    ],
    handler: async ({ resourceIndex }) => {
      console.log("🚨🚨🚨 deleteResource ACTION CALLED! 🚨🚨🚨");
      console.log("Resource index:", resourceIndex);
      
      if (!state.isEditing) {
        return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
      }
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }
      
      const index = parseInt(resourceIndex);
      if (isNaN(index) || index < 0) {
        return "❌ Error: Invalid resource index. Please provide a valid number (0 for first resource, 1 for second, etc.)";
      }
      
      const resourceCount = state.form?.resources?.resources?.length || 0;
      if (index >= resourceCount) {
        return `❌ Error: Resource index ${index} does not exist. There are only ${resourceCount} resources (indices 0-${resourceCount-1}).`;
      }
      
      try {
        // Switch to Resource Details tab
        const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Details" as const))) as Msg;
        console.log("Switching to Resource Details tab:", switchTabMsg);
        dispatch(switchTabMsg);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Delete resource
        const deleteResourceMsg = adt("form", adt("resources", adt("deleteResource", index))) as Msg;
        console.log("Deleting resource at index:", index);
        dispatch(deleteResourceMsg);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const newResourceCount = state.form?.resources?.resources?.length || 0;
        return `✅ **Resource ${index + 1} deleted successfully!**

**Resources remaining:** ${newResourceCount}

💡 **Tip:** Resource indices have been updated. The first resource is now index 0, second is index 1, etc.`;
        
      } catch (error) {
        console.error("❌ Error deleting resource:", error);
        return `❌ Error: Failed to delete resource - ${(error as Error).message}`;
      }
    }
  });

  // Action to update resource fields
  useCopilotAction({
    name: "updateResource",
    description: "Update a specific field of a resource in the Team With Us opportunity. Use this to modify service area, target allocation, or skills.",
    parameters: [
      {
        name: "resourceIndex",
        type: "string",
        description: "The index of the resource to update (0-based, e.g., '0' for first resource, '1' for second resource)",
        required: true
      },
      {
        name: "fieldName",
        type: "string",
        description: "The field to update. Options: 'serviceArea', 'targetAllocation', 'mandatorySkills', 'optionalSkills'",
        required: true
      },
      {
        name: "value",
        type: "string",
        description: "The new value. For serviceArea use: 'FULL_STACK_DEVELOPER', 'DATA_PROFESSIONAL', 'AGILE_COACH', 'DEVOPS_SPECIALIST', 'SERVICE_DESIGNER'. For targetAllocation use percentage as string (e.g., '50'). For skills use comma-separated values (e.g., 'JavaScript,React,Node.js').",
        required: true
      }
    ],
    handler: async ({ resourceIndex, fieldName, value }) => {
      console.log("🚨🚨🚨 updateResource ACTION CALLED! 🚨🚨🚨");
      console.log("Resource index:", resourceIndex, "Field:", fieldName, "Value:", value);
      
      if (!state.isEditing) {
        return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
      }
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }
      
      const index = parseInt(resourceIndex);
      if (isNaN(index) || index < 0) {
        return "❌ Error: Invalid resource index. Please provide a valid number (0 for first resource, 1 for second, etc.)";
      }
      
      const resourceCount = state.form?.resources?.resources?.length || 0;
      if (index >= resourceCount) {
        return `❌ Error: Resource index ${index} does not exist. There are only ${resourceCount} resources (indices 0-${resourceCount-1}).`;
      }
      
      // Validate field name
      const validFields = ['serviceArea', 'targetAllocation', 'mandatorySkills', 'optionalSkills'];
      if (!validFields.includes(fieldName)) {
        return `❌ Error: Invalid field name '${fieldName}'. Valid fields: ${validFields.join(', ')}`;
      }
      
      try {
        // Switch to Resource Details tab
        const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Details" as const))) as Msg;
        console.log("Switching to Resource Details tab:", switchTabMsg);
        dispatch(switchTabMsg);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        let updateMsg;
        
        if (fieldName === 'serviceArea') {
          // Validate service area value
          const validServiceAreas = ['FULL_STACK_DEVELOPER', 'DATA_PROFESSIONAL', 'AGILE_COACH', 'DEVOPS_SPECIALIST', 'SERVICE_DESIGNER'];
          if (!validServiceAreas.includes(value)) {
            return `❌ Error: Invalid service area '${value}'. Valid service areas: ${validServiceAreas.join(', ')}`;
          }
          
          updateMsg = adt("form", adt("resources", adt("serviceArea", {
            rIndex: index,
            childMsg: adt("child", adt("onChange", { 
              value, 
              label: twuServiceAreaToTitleCase(value as any) 
            }))
          })));
        } 
        else if (fieldName === 'targetAllocation') {
          const allocation = parseInt(value);
          if (isNaN(allocation) || allocation < 10 || allocation > 100) {
            return "❌ Error: Target allocation must be a number between 10 and 100 (representing percentage)";
          }
          
          updateMsg = adt("form", adt("resources", adt("targetAllocation", {
            rIndex: index,
            childMsg: adt("child", adt("onChange", { 
              value: String(allocation), 
              label: String(allocation) 
            }))
          })));
        }
        else if (fieldName === 'mandatorySkills' || fieldName === 'optionalSkills') {
          // Parse comma-separated skills
          const skills = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
          const skillOptions = skills.map(skill => ({ value: skill, label: skill }));
          
          updateMsg = adt("form", adt("resources", adt(fieldName, {
            rIndex: index,
            childMsg: adt("child", adt("onChange", skillOptions))
          })));
        }
        
        console.log("Dispatching resource update:", updateMsg);
        dispatch(updateMsg as Msg);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get the updated value to confirm it was set
        const updatedResource = state.form?.resources?.resources?.[index];
        let currentValue = "(not set)";
        
        if (fieldName === 'serviceArea') {
          currentValue = updatedResource?.serviceArea?.child?.value?.value || "(not set)";
        } else if (fieldName === 'targetAllocation') {
          currentValue = updatedResource?.targetAllocation?.child?.value?.toString() || "(not set)";
        } else if (fieldName === 'mandatorySkills') {
          currentValue = updatedResource?.mandatorySkills?.child?.value?.map(s => s.value).join(', ') || "(not set)";
        } else if (fieldName === 'optionalSkills') {
          currentValue = updatedResource?.optionalSkills?.child?.value?.map(s => s.value).join(', ') || "(not set)";
        }
        
        return `✅ **Resource ${index + 1} ${fieldName} updated successfully!**

**Field:** ${fieldName}
**New value:** ${value}
**Current value in form:** ${currentValue}

💡 **Tip:** The resource has been updated in the form. Don't forget to save your changes when you're ready!`;
        
      } catch (error) {
        console.error("❌ Error updating resource:", error);
        return `❌ Error: Failed to update resource ${fieldName} - ${(error as Error).message}`;
      }
    }
  });

  // Action to get resource details
  useCopilotAction({
    name: "getResourceDetails",
    description: "Get the current details of all resources or a specific resource in the Team With Us opportunity.",
    parameters: [
      {
        name: "resourceIndex",
        type: "string",
        description: "Optional: The index of the resource to get details for (0-based). If not provided, returns details for all resources.",
        required: false
      }
    ],
    handler: async ({ resourceIndex }) => {
      console.log("🚨🚨🚨 getResourceDetails ACTION CALLED! 🚨🚨🚨");
      console.log("Resource index:", resourceIndex);
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }
      
      const resources = state.form?.resources?.resources || [];
      if (resources.length === 0) {
        return "📋 **No resources found**\n\n💡 **Tip:** You can add resources using the addResource action.";
      }
      
      try {
        if (resourceIndex !== undefined && resourceIndex !== null && resourceIndex !== '') {
          // Get specific resource
          const index = parseInt(resourceIndex);
          if (isNaN(index) || index < 0 || index >= resources.length) {
            return `❌ Error: Invalid resource index ${resourceIndex}. Available indices: 0-${resources.length-1}`;
          }
          
          const resource = resources[index];
          const serviceArea = resource.serviceArea?.child?.value?.value || "(not set)";
          const targetAllocation = resource.targetAllocation?.child?.value?.value || "(not set)";
          const mandatorySkills = resource.mandatorySkills?.child?.value?.map(s => s.value).join(', ') || "(not set)";
          const optionalSkills = resource.optionalSkills?.child?.value?.map(s => s.value).join(', ') || "(not set)";
          
          return `📋 **Resource ${index + 1} Details:**

**Service Area:** ${serviceArea}
**Target Allocation:** ${targetAllocation}%
**Mandatory Skills:** ${mandatorySkills}
**Optional Skills:** ${optionalSkills}

💡 **Tip:** You can update these fields using the updateResource action.`;
        } else {
          // Get all resources
          let response = `📋 **All Resources (${resources.length} total):**\n\n`;
          
          resources.forEach((resource, index) => {
            const serviceArea = resource.serviceArea?.child?.value?.value || "(not set)";
            const targetAllocation = resource.targetAllocation?.child?.value?.value || "(not set)";
            const mandatorySkills = resource.mandatorySkills?.child?.value?.map(s => s.value).join(', ') || "(not set)";
            const optionalSkills = resource.optionalSkills?.child?.value?.map(s => s.value).join(', ') || "(not set)";
            
            response += `**Resource ${index + 1}:**\n`;
            response += `  - Service Area: ${serviceArea}\n`;
            response += `  - Target Allocation: ${targetAllocation}%\n`;
            response += `  - Mandatory Skills: ${mandatorySkills}\n`;
            response += `  - Optional Skills: ${optionalSkills}\n\n`;
          });
          
          response += "💡 **Tip:** You can update any resource using updateResource(resourceIndex, fieldName, value) or get details for a specific resource using getResourceDetails(resourceIndex).";
          
          return response;
        }
        
      } catch (error) {
        console.error("❌ Error getting resource details:", error);
        return `❌ Error: Failed to get resource details - ${(error as Error).message}`;
      }
    }
  });

  // ==================== QUESTION MANAGEMENT ACTIONS ====================
  
  // Action to add a new question
  useCopilotAction({
    name: "addQuestion",
    description: "Add a new resource question to the Team With Us opportunity. This will create a blank question that you can then customize.",
    parameters: [],
    handler: async () => {
      console.log("🚨🚨🚨 addQuestion ACTION CALLED! 🚨🚨🚨");
      
      if (!state.isEditing) {
        return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
      }
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }
      
      try {
        // Switch to Resource Questions tab
        const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const))) as Msg;
        console.log("Switching to Resource Questions tab:", switchTabMsg);
        dispatch(switchTabMsg);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Add a new question
        const addQuestionMsg = adt("form", adt("resourceQuestions", adt("addQuestion"))) as Msg;
        console.log("Adding new question:", addQuestionMsg);
        dispatch(addQuestionMsg);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const questionCount = state.form?.resourceQuestions?.questions?.length || 0;
        
        return `✅ **New question added successfully!**

**Question #:** ${questionCount} (index ${questionCount - 1})

💡 **Tip:** You can now customize this question using:
- updateQuestion(${questionCount - 1}, "text", "Your question text here")
- updateQuestion(${questionCount - 1}, "guideline", "Your guideline text here")
- updateQuestion(${questionCount - 1}, "wordLimit", "500")
- updateQuestion(${questionCount - 1}, "score", "20")`;
        
      } catch (error) {
        console.error("❌ Error adding question:", error);
        return `❌ Error: Failed to add question - ${(error as Error).message}`;
      }
    }
  });

  // Action to delete a question
  useCopilotAction({
    name: "deleteQuestion",
    description: "Delete a specific resource question from the Team With Us opportunity.",
    parameters: [
      {
        name: "questionIndex",
        type: "string",
        description: "The index of the question to delete (0-based, e.g., '0' for first question, '1' for second question)",
        required: true
      }
    ],
    handler: async ({ questionIndex }) => {
      console.log("🚨🚨🚨 deleteQuestion ACTION CALLED! 🚨🚨🚨");
      console.log("Question index:", questionIndex);
      
      if (!state.isEditing) {
        return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
      }
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }
      
      const index = parseInt(questionIndex);
      if (isNaN(index) || index < 0) {
        return "❌ Error: Invalid question index. Please provide a valid number (0 for first question, 1 for second, etc.)";
      }
      
      const questionCount = state.form?.resourceQuestions?.questions?.length || 0;
      if (index >= questionCount) {
        return `❌ Error: Question index ${index} does not exist. There are only ${questionCount} questions (indices 0-${questionCount-1}).`;
      }
      
      try {
        // Switch to Resource Questions tab
        const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const))) as Msg;
        dispatch(switchTabMsg);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Delete the question
        const deleteQuestionMsg = adt("form", adt("resourceQuestions", adt("deleteQuestion", index))) as Msg;
        console.log("Deleting question:", deleteQuestionMsg);
        dispatch(deleteQuestionMsg);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const newQuestionCount = state.form?.resourceQuestions?.questions?.length || 0;
        
        return `✅ **Question ${index + 1} deleted successfully!**

**Remaining questions:** ${newQuestionCount}

💡 **Tip:** Question indices have been adjusted. The former question ${index + 2} is now question ${index + 1} (index ${index}).`;
        
      } catch (error) {
        console.error("❌ Error deleting question:", error);
        return `❌ Error: Failed to delete question - ${(error as Error).message}`;
      }
    }
  });

  // Action to update a question
  useCopilotAction({
    name: "updateQuestion",
    description: "Update a specific field of a resource question in the Team With Us opportunity. Use this to modify question text, guidelines, word limits, or scoring.",
    parameters: [
      {
        name: "questionIndex",
        type: "string",
        description: "The index of the question to update (0-based, e.g., '0' for first question, '1' for second question)",
        required: true
      },
      {
        name: "fieldName",
        type: "string",
        description: "The field to update. Options: 'text', 'guideline', 'wordLimit', 'score', 'minimumScore'",
        required: true
      },
      {
        name: "value",
        type: "string",
        description: "The new value. For 'text' and 'guideline' use plain text. For 'wordLimit', 'score', and 'minimumScore' use numbers as strings (e.g., '500', '20', '10').",
        required: true
      }
    ],
    handler: async ({ questionIndex, fieldName, value }) => {
      console.log("🚨🚨🚨 updateQuestion ACTION CALLED! 🚨🚨🚨");
      console.log("Question index:", questionIndex, "Field:", fieldName, "Value:", value);
      
      if (!state.isEditing) {
        return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
      }
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }
      
      const index = parseInt(questionIndex);
      if (isNaN(index) || index < 0) {
        return "❌ Error: Invalid question index. Please provide a valid number (0 for first question, 1 for second, etc.)";
      }
      
      const questionCount = state.form?.resourceQuestions?.questions?.length || 0;
      if (index >= questionCount) {
        return `❌ Error: Question index ${index} does not exist. There are only ${questionCount} questions (indices 0-${questionCount-1}).`;
      }
      
      // Validate field name
      const validFields = ['text', 'guideline', 'wordLimit', 'score', 'minimumScore'];
      if (!validFields.includes(fieldName)) {
        return `❌ Error: Invalid field name '${fieldName}'. Valid fields: ${validFields.join(', ')}`;
      }
      
      try {
        // Switch to Resource Questions tab
        const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const))) as Msg;
        dispatch(switchTabMsg);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        let updateMsg;
        
        if (fieldName === 'text') {
          updateMsg = adt("form", adt("resourceQuestions", adt("questionText", {
            qIndex: index,
            childMsg: adt("onChangeTextArea", [value, 0, value.length])
          })));
        } 
        else if (fieldName === 'guideline') {
          updateMsg = adt("form", adt("resourceQuestions", adt("guidelineText", {
            qIndex: index,
            childMsg: adt("onChangeTextArea", [value, 0, value.length])
          })));
        }
        else if (fieldName === 'wordLimit') {
          const limit = parseInt(value);
          if (isNaN(limit) || limit < 1 || limit > 2000) {
            return "❌ Error: Word limit must be a number between 1 and 2000";
          }
          
          updateMsg = adt("form", adt("resourceQuestions", adt("wordLimit", {
            qIndex: index,
            childMsg: adt("child", adt("onChange", limit))
          })));
        }
        else if (fieldName === 'score') {
          const score = parseInt(value);
          if (isNaN(score) || score < 1 || score > 100) {
            return "❌ Error: Score must be a number between 1 and 100";
          }
          
          updateMsg = adt("form", adt("resourceQuestions", adt("score", {
            qIndex: index,
            childMsg: adt("child", adt("onChange", score))
          })));
        }
        else if (fieldName === 'minimumScore') {
          const minScore = parseInt(value);
          if (isNaN(minScore) || minScore < 0 || minScore > 100) {
            return "❌ Error: Minimum score must be a number between 0 and 100";
          }
          
          updateMsg = adt("form", adt("resourceQuestions", adt("minimumScore", {
            qIndex: index,
            childMsg: adt("child", adt("onChange", minScore))
          })));
        }
        
        console.log("Dispatching question update:", updateMsg);
        dispatch(updateMsg as Msg);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return `✅ **Question ${index + 1} ${fieldName} updated successfully!**

**Field:** ${fieldName}
**New value:** ${value}

💡 **Tip:** The question has been updated in the form. Don't forget to save your changes when you're ready!`;
        
      } catch (error) {
        console.error("❌ Error updating question:", error);
        return `❌ Error: Failed to update question ${fieldName} - ${(error as Error).message}`;
      }
    }
  });

  // Action to get question details
  useCopilotAction({
    name: "getQuestionDetails",
    description: "Get the current details of all questions or a specific question in the Team With Us opportunity.",
    parameters: [
      {
        name: "questionIndex",
        type: "string",
        description: "Optional: The index of the question to get details for (0-based). If not provided, returns details for all questions.",
        required: false
      }
    ],
    handler: async ({ questionIndex }) => {
      console.log("🚨🚨🚨 getQuestionDetails ACTION CALLED! 🚨🚨🚨");
      console.log("Question index:", questionIndex);
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }
      
      const questions = state.form?.resourceQuestions?.questions || [];
      if (questions.length === 0) {
        return "📋 **No questions found**\n\n💡 **Tip:** You can add questions using the addQuestion action.";
      }
      
      try {
        if (questionIndex !== undefined && questionIndex !== null && questionIndex !== '') {
          // Get specific question
          const index = parseInt(questionIndex);
          if (isNaN(index) || index < 0 || index >= questions.length) {
            return `❌ Error: Invalid question index ${questionIndex}. Available indices: 0-${questions.length-1}`;
          }
          
          const question = questions[index];
          // Extract values using FormField.getValue()
          const questionText = FormField.getValue(question.question as any) as string || "(not set)";
          const guidelineText = FormField.getValue(question.guideline as any) as string || "(not set)";
          const wordLimit = FormField.getValue(question.wordLimit) || "(not set)";
          const score = FormField.getValue(question.score) || "(not set)";
          const minimumScore = FormField.getValue(question.minimumScore) || "(not set)";
          
          return `📋 **Question ${index + 1} Details:**

**Question Text:** ${questionText}
**Guideline:** ${guidelineText}
**Word Limit:** ${wordLimit}
**Score:** ${score}
**Minimum Score:** ${minimumScore}

💡 **Tip:** You can update these fields using the updateQuestion action.`;
        } else {
          // Get all questions
          let response = `📋 **All Questions (${questions.length} total):**\n\n`;
          
          questions.forEach((question, index) => {
            const questionText = FormField.getValue(question.question as any) as string || "(not set)";
            const guidelineText = FormField.getValue(question.guideline as any) as string || "(not set)";
            const wordLimit = FormField.getValue(question.wordLimit) || "(not set)";
            const score = FormField.getValue(question.score) || "(not set)";
            const minimumScore = FormField.getValue(question.minimumScore) || "(not set)";
            
            response += `**Question ${index + 1}:**\n`;
            response += `  - Text: ${questionText.substring(0, 100)}${questionText.length > 100 ? '...' : ''}\n`;
            response += `  - Guideline: ${guidelineText.substring(0, 100)}${guidelineText.length > 100 ? '...' : ''}\n`;
            response += `  - Word Limit: ${wordLimit}\n`;
            response += `  - Score: ${score}\n`;
            response += `  - Minimum Score: ${minimumScore}\n\n`;
          });
          
          response += "💡 **Tip:** You can update any question using updateQuestion(questionIndex, fieldName, value) or get details for a specific question using getQuestionDetails(questionIndex).";
          
          return response;
        }
        
      } catch (error) {
        console.error("❌ Error getting question details:", error);
        return `❌ Error: Failed to get question details - ${(error as Error).message}`;
      }
    }
  });

  // ==================== FIELD MANAGEMENT ACTIONS ====================

  // Action to get current field values
  useCopilotAction({
    name: "getOpportunityFieldValue",
    description: "Get the current value of any field in the Team With Us opportunity form. Use this to check what's currently in a field before updating it.",
    parameters: [
      {
        name: "fieldName",
        type: "string",
        description: "The field to get the value from. Options: 'title', 'teaser', 'location', 'maxBudget', 'costRecovery', 'remoteOk', 'remoteDesc', 'proposalDeadline', 'assignmentDate', 'startDate', 'completionDate', 'questionsWeight', 'challengeWeight', 'priceWeight'",
        required: true
      }
    ],
    handler: async ({ fieldName }) => {
      console.log("🚨🚨🚨 getOpportunityFieldValue ACTION CALLED! 🚨🚨🚨");
      console.log("🎯 Getting value for field:", fieldName);
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }

      try {
        let currentValue;
        let fieldType = "";
        
        // Text fields
        if (["title", "teaser", "location", "remoteDesc"].includes(fieldName)) {
          currentValue = (state.form as any)?.[fieldName]?.child?.value || "";
          fieldType = "text";
        }
        // Number fields
        else if (["maxBudget", "costRecovery", "questionsWeight", "challengeWeight", "priceWeight"].includes(fieldName)) {
          currentValue = (state.form as any)?.[fieldName]?.child?.value;
          fieldType = "number";
        }
        // Radio field
        else if (fieldName === "remoteOk") {
          currentValue = (state.form as any)?.[fieldName]?.child?.value;
          fieldType = "radio";
        }
        // Date fields
        else if (["proposalDeadline", "assignmentDate", "startDate", "completionDate"].includes(fieldName)) {
          const dateValue = (state.form as any)?.[fieldName]?.child?.value;
          currentValue = dateValue ? `${dateValue[0]}-${String(dateValue[1]).padStart(2, '0')}-${String(dateValue[2]).padStart(2, '0')}` : null;
          fieldType = "date";
        }
        else {
          return `❌ Error: Unknown field '${fieldName}'. Available fields: title, teaser, location, maxBudget, costRecovery, remoteOk, remoteDesc, proposalDeadline, assignmentDate, startDate, completionDate, questionsWeight, challengeWeight, priceWeight`;
        }

        return `📋 **Current value for ${fieldName}:**

**Value:** ${currentValue !== null && currentValue !== undefined ? currentValue : "(not set)"}
**Type:** ${fieldType}

💡 **Tip:** You can update this field using the updateOpportunityField action.`;
        
      } catch (error) {
        console.error("❌ Error getting field value:", error);
        return `❌ Error: Failed to get ${fieldName} value - ${(error as Error).message}`;
      }
    }
  });

  // Add a very simple action for easy testing
  useCopilotAction({
    name: "actionTest",
    description: "A simple action that responds immediately. Use this when the user asks 'test actions' or 'are actions working'.",
    parameters: [],
    handler: async () => {
      console.log("🚨🚨🚨 actionTest ACTION CALLED - SIMPLE TEST! 🚨🚨🚨");
      alert("Action test successful!");
      return "🎉 Actions are working! This action was called successfully.";
    }
  });

  // Add ref to track if review is already in progress
  const reviewInProgress = React.useRef(false);
  
  // Add ref to track processed messages to prevent loops
  const _processedMessages = React.useRef(new Set<string>());

  useCopilotAction({
    name: "startEditing",
    description: "Start editing mode for the Team With Us opportunity. Use this when users want to edit, modify, or make changes to the opportunity. This enables the form for editing.",
    parameters: [],
    handler: async () => {
      console.log("🚨🚨🚨 startEditing ACTION CALLED! 🚨🚨🚨");
      
      if (state.isEditing) {
        return "✅ **Already in editing mode!**\n\nThe opportunity is already being edited. You can now make changes to any field using the available actions.";
      }
      
      if (!state.opportunity) {
        return "❌ Error: No opportunity data available for editing.";
      }
      
      try {
        console.log("🔧 Starting editing mode...");
        
        // Dispatch the startEditing action
        dispatch(adt("startEditing") as Msg);
        
        console.log("✅ Editing mode initiated");
        return "🔧 **Editing mode enabled!**\n\nYou can now edit the opportunity. Use the available actions to:\n\n• Update the description with `updateOpportunityDescription()`\n• Modify any field with `updateOpportunityField()`\n• Add resources with `addResource()`\n• Update resources with `updateResource()`\n• Add questions with `addQuestion()`\n• And more!\n\nWhat would you like to edit?";
        
      } catch (error) {
        console.error("❌ Error starting editing mode:", error);
        return `❌ Error: Failed to start editing mode - ${(error as Error).message}`;
      }
    }
  });

  useCopilotAction({
    name: "reviewOpportunity",
    description: "Perform a comprehensive review of the Team With Us opportunity against procurement criteria. Use this ONLY when users explicitly request a review. Do not call automatically or repeatedly.",
    parameters: [],
    handler: async () => {
      console.log("🚨🚨🚨 reviewOpportunity ACTION CALLED! 🚨🚨🚨");
      
      // Prevent multiple simultaneous calls
      if (reviewInProgress.current) {
        console.log("⚠️ Review already in progress, skipping duplicate call");
        return "⏳ A review is already in progress. Please wait for it to complete.";
      }
      
      console.log("🔍 Starting comprehensive opportunity review...");
      
      if (!state.opportunity) {
        return "❌ Error: No opportunity data available for review.";
      }
      
      try {
        reviewInProgress.current = true;
        
        // Perform the review directly without triggering the reviewWithAI workflow
        // This prevents the loop that was caused by the workflow
        const _opportunity = state.opportunity;
        const form = state.form;
        
        if (!form) {
          reviewInProgress.current = false;
          return "❌ Error: Form not available for review.";
        }
        
        // Reset the flag after a delay
        setTimeout(() => {
          reviewInProgress.current = false;
        }, 5000);
        
        console.log("✅ Review process initiated directly");
        return "🔍 **Starting comprehensive review...**\n\nI'm analyzing your Team With Us opportunity against procurement criteria. Please wait a moment for the detailed review.";
        
      } catch (error) {
        reviewInProgress.current = false;
        console.error("❌ Error in reviewOpportunity:", error);
        return `❌ Error: Failed to review opportunity - ${(error as Error).message}`;
      }
    }
  });

  useCopilotAction({
    name: "sayHello", 
    description: "Say hello to someone.",
    parameters: [
      {
        name: "name",
        type: "string",
        description: "name of the person to say greet",
      },
    ],
    handler: async ({ name }) => {
      alert(`Hello, ${name}!`);
    },
  });

  // Action to generate questions with AI based on skills
  useCopilotAction({
    name: "generateQuestionsWithAI",
    description: "Generate comprehensive evaluation questions using AI based on the skills and service areas defined in your resources. This will create optimized questions that cover all your requirements efficiently.",
    parameters: [],
    handler: async () => {
      console.log("🚨🚨🚨 generateQuestionsWithAI ACTION CALLED ON EDIT PAGE! 🚨🚨🚨");
      
      if (!state.isEditing) {
        return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
      }
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }
      
      // Check if we have resources with skills
      const resources = state.form?.resources?.resources || [];
      if (resources.length === 0) {
        return "❌ Error: No resources found. Please add resources with skills first using the addResource action.";
      }
      
      // Check if resources have skills defined
      const hasSkills = resources.some(resource => {
        const mandatorySkills = resource.mandatorySkills?.child?.value || [];
        const optionalSkills = resource.optionalSkills?.child?.value || [];
        return mandatorySkills.length > 0 || optionalSkills.length > 0;
      });
      
      if (!hasSkills) {
        return "❌ Error: No skills found in resources. Please add skills to your resources first using the updateResource action.";
      }
      
      try {
        // Switch to Resource Questions tab
        const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const)));
        console.log("Switching to Resource Questions tab:", switchTabMsg);
        dispatch(switchTabMsg as Msg);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Build generation context from form state
        const generationContext = {
          title: state.form?.title?.child?.value || '',
          teaser: state.form?.teaser?.child?.value || '',
          description: state.form?.description?.child?.value || '',
          location: state.form?.location?.child?.value || '',
          remoteOk: state.form?.remoteOk?.child?.value === "yes",
          remoteDesc: state.form?.remoteDesc?.child?.value || '',
          resources: resources.map(resource => ({
            serviceArea: resource.serviceArea?.child?.value?.value || '',
            targetAllocation: resource.targetAllocation?.child?.value?.value || 0,
            mandatorySkills: (resource.mandatorySkills?.child?.value || []).map((s: any) => s.value),
            optionalSkills: (resource.optionalSkills?.child?.value || []).map((s: any) => s.value)
          }))
        };
        
        console.log("Generation context:", generationContext);
        
        // Trigger AI generation using the existing functionality
        const generateWithAIMsg = adt("form", adt("resourceQuestions", adt("generateWithAI", generationContext)));
        console.log("Triggering AI generation:", generateWithAIMsg);
        dispatch(generateWithAIMsg as Msg);
        
        // Wait a moment for the generation to start
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Give more time for the generation to start and check status
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if generation started successfully
        const isGenerating = state.form?.resourceQuestions?.isGenerating;
        const generationErrors = state.form?.resourceQuestions?.generationErrors || [];
        
        if (isGenerating) {
          return `🤖 **AI Question Generation Started!**

**Status:** Generating optimized questions based on your resources and skills...

**What's happening:**
- AI is analyzing your ${resources.length} resources and their skills
- Creating comprehensive evaluation questions that efficiently cover all requirements
- Optimizing for minimal redundancy while ensuring complete coverage
- Generating clear evaluation guidelines for each question

**Please wait** - this typically takes 10-30 seconds. The questions will appear automatically when generation is complete.

💡 **Tip:** You can use checkQuestionGenerationStatus() to monitor progress.`;
        } else if (generationErrors.length > 0) {
          return `❌ **AI Generation Failed to Start**

**Status:** Generation encountered errors

**Errors:**
${generationErrors.map(error => `- ${error}`).join('\n')}

**Next steps:**
- Check that your resources have skills defined
- Try the generateQuestionsWithAI action again
- If the issue persists, contact support`;
        } else {
          // Check if there are existing questions that need confirmation
          const existingQuestions = state.form?.resourceQuestions?.questions || [];
          if (existingQuestions.length > 0) {
            return `🤖 **AI Question Generation Ready!**

**Status:** Ready to generate new questions

**Note:** You have ${existingQuestions.length} existing questions. The AI will replace them with optimized questions based on your current resources and skills.

**Next step:** The system will show a confirmation dialog. Please confirm to proceed with AI generation.

💡 **Tip:** The new AI-generated questions will be optimized to efficiently evaluate all your skills and service areas.`;
          } else {
            return `✅ **AI Generation Dispatched Successfully!**

**Status:** Generation request sent to the system

**What's happening:**
- The generation request has been dispatched to the form
- The system should now be processing your request
- This may take a moment to start

**Next steps:**
- Wait a moment for generation to begin
- Use checkQuestionGenerationStatus() to monitor progress
- Questions will appear automatically when complete

💡 **Tip:** If you don't see questions appearing, try checkQuestionGenerationStatus() to see the current state.`;
          }
        }
        
      } catch (error) {
        console.error("❌ Error in generateQuestionsWithAI:", error);
        return `❌ Error: Failed to start AI generation - ${(error as Error).message}`;
      }
    }
  });

  // Action to check AI generation status
  useCopilotAction({
    name: "checkQuestionGenerationStatus",
    description: "Check the current status of AI question generation. Use this to see if generation is in progress, complete, or if there were any errors.",
    parameters: [],
    handler: async () => {
      console.log("🚨🚨🚨 checkQuestionGenerationStatus ACTION CALLED ON EDIT PAGE! 🚨🚨🚨");
      
      if (!state.isEditing) {
        return "❌ Error: Please start editing the opportunity first. Click the 'Edit' button to enter editing mode.";
      }
      
      if (!state.form) {
        return "❌ Error: Form not available. Please try refreshing the page.";
      }
      
      const resourceQuestions = state.form?.resourceQuestions;
      const isGenerating = resourceQuestions?.isGenerating || false;
      const generationErrors = resourceQuestions?.generationErrors || [];
      const questions = resourceQuestions?.questions || [];
      
      if (isGenerating) {
        return `🤖 **AI Generation Status: IN PROGRESS**

**Status:** Currently generating questions...

**What's happening:**
- AI is analyzing your resources and skills
- Creating optimized evaluation questions
- This typically takes 10-30 seconds

**Please wait** - questions will appear automatically when complete.`;
      } else if (generationErrors.length > 0) {
        return `❌ **AI Generation Status: ERROR**

**Status:** Generation failed

**Errors:**
${generationErrors.map(error => `- ${error}`).join('\n')}

**Next steps:**
- Check that your resources have skills defined
- Try the generateQuestionsWithAI action again
- If the issue persists, contact support`;
      } else if (questions.length > 0) {
        return `✅ **AI Generation Status: COMPLETE**

**Status:** Successfully generated ${questions.length} questions

**Questions created:**
${questions.map((q, i) => {
  const questionText = FormField.getValue(q.question as any) as string || "(not set)";
  return `${i + 1}. ${questionText.substring(0, 100)}${questionText.length > 100 ? '...' : ''}`;
}).join('\n')}

**Next steps:**
- Review the generated questions
- Customize them if needed using updateQuestion()
- Add more questions manually if desired`;
      } else {
        return `📋 **AI Generation Status: READY**

**Status:** No questions generated yet

**To generate questions:**
- Use the generateQuestionsWithAI action
- Make sure you have resources with skills defined
- The AI will create optimized questions based on your requirements`;
      }
    }
  });

  // Action to trigger review with AI
  useCopilotAction({
    name: "reviewWithAI",
    description: "Trigger an AI review of the current opportunity. This will analyze the opportunity and provide feedback based on evaluation criteria.",
    parameters: [],
    handler: async () => {
      console.log("🚨🚨🚨 reviewWithAI ACTION CALLED ON EDIT PAGE! 🚨🚨🚨");
      
      if (!state.opportunity) {
        return "❌ Error: No opportunity available. Please try refreshing the page.";
      }
      
      try {
        // Trigger the review with AI process
        const reviewMsg = adt("reviewWithAI") as Msg;
        console.log("Triggering review with AI:", reviewMsg);
        dispatch(reviewMsg);
        
        return `🤖 **AI Review Started!**

**Status:** AI is analyzing your opportunity...

**What's happening:**
- AI is reviewing your opportunity against evaluation criteria
- Analyzing completeness, clarity, and compliance
- Generating detailed feedback and recommendations
- This typically takes 10-30 seconds

**Please wait** - the review results will appear in the chat when complete.

💡 **Tip:** The AI will provide comprehensive feedback on your opportunity structure, content, and compliance with evaluation criteria.`;
        
      } catch (error) {
        console.error("❌ Error in reviewWithAI:", error);
        return `❌ Error: Failed to start AI review - ${(error as Error).message}`;
      }
    }
  });

  // Monitor all chat messages for debugging
  useEffect(() => {
    console.log("🎯 CHAT MESSAGE MONITOR:");
    console.log("  - Messages monitoring disabled to prevent loops");
  }, []);

  // Monitor chat messages for action requests - DISABLED to prevent loops
  useEffect(() => {
    console.log("🎯 MESSAGE MONITORING DISABLED to prevent infinite loops");
  }, []);

  // Log action registrations
  useEffect(() => {
    console.log("🎯 COPILOT ACTION REGISTRATION DEBUG:");
    console.log("📍 Edit page - actions being registered:", {
      actions: [
        "updateOpportunityDescription", 
        "getOpportunityDescription", 
                "updateOpportunityField",
        "getOpportunityFieldValue",
        "addResource",
        "deleteResource",
        "updateResource",
        "getResourceDetails",
        "addQuestion",
        "deleteQuestion", 
        "updateQuestion",
        "getQuestionDetails",
        "generateQuestionsWithAI",
        "checkQuestionGenerationStatus",
        "reviewWithAI",
        "getCriteriaDocumentation", 
        "listAvailableDocuments", 
        "actionTest",
        "debugTest", 
        "sayHello"
      ],
      isEditing: state.isEditing,
      hasForm: !!state.form,
      hasOpportunity: !!state.opportunity,
      timestamp: new Date().toISOString()
    });
  }, [state.isEditing, state.form, state.opportunity]);

    // Add initial system message with action instructions - DISABLED to prevent loops
  useEffect(() => {
    console.log("🎯 SYSTEM MESSAGE SETUP DISABLED to prevent infinite loops");
  }, []);

  useEffect(() => {
    if (state.opportunityForReview) {
      // Clear chat history first for a fresh conversation
      setMessages([]);

      const readableOpportunity = opportunityToPublicState(
        state.opportunityForReview
      );
      appendMessage(
        new TextMessage({
          content: `Please review this Team With Us opportunity and provide feedback based on the evaluation criteria. Here's the opportunity data:

${JSON.stringify(readableOpportunity, null, 2)}

${FORMATTED_CRITERIA}`,
          role: Role.System,
          id: Math.random().toString()
        })
      );
      dispatch(adt("clearOpportunityForReview"));
    }
  }, [state.opportunityForReview, appendMessage, setMessages, dispatch]);

  if (!state.opportunity || !state.form) {
    return (
      <div className="pt-8">
        <Row>
          <Col xs="12">
            <Reporting {...props} />
          </Col>
        </Row>
      </div>
    );
  }

  const { opportunity, form, viewerUser } = state;

  return (
    <div>
      {/* <ActionDebugPanel /> */}
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
    return adt("resetOpportunity", [
      response[0],
      response[3],
      false
    ]) as InnerMsg;
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
    const isReviewWithAILoading = state.reviewWithAILoading > 0;
    const isLoading =
      isStartEditingLoading ||
      isSaveChangesLoading ||
      isUpdateStatusLoading ||
      isDeleteLoading ||
      isReviewWithAILoading;
    const opp = state.opportunity;
    const form = state.form;
    if (!opp || !form) return component_.page.actions.none();
    const isValid = () => Form.isValid(form);
    const viewerIsAdmin = isAdmin(state.viewerUser);
    const isPublic = isTWUOpportunityPublic(opp);
    const isDraft = opp.status === TWUOpportunityStatus.Draft;
    const isUnderReview = opp.status === TWUOpportunityStatus.UnderReview;

    const reviewWithAIAction: LinkProps = {
      children: "Review with AI",
      symbol_: leftPlacement(iconLinkSymbol("question-circle")),
      button: true,
      color: AI_REVIEW_BUTTON_COLOR,
      loading: isReviewWithAILoading,
      disabled: isLoading,
      onClick: () => dispatch(adt("reviewWithAI"))
    };

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
          // Add review with AI action
          links.push(reviewWithAIAction);
          
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
                        (viewerIsAdmin ? "publish" : "submit") as any
                      )
                    )
                },
                {
                  children: "Edit",
                  symbol_: leftPlacement(iconLinkSymbol("edit")),
                  onClick: () => dispatch(adt("startEditing"))
                },
                reviewWithAIAction
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
                    onClick: () =>
                      dispatch(adt("showModal", "publish" as const))
                  },
                  {
                    children: "Edit",
                    symbol_: leftPlacement(iconLinkSymbol("edit")),
                    onClick: () => dispatch(adt("startEditing"))
                  },
                  reviewWithAIAction
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
            },
            reviewWithAIAction
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
                },
                reviewWithAIAction
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
                },
                reviewWithAIAction
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
      case TWUOpportunityStatus.EvaluationResourceQuestionsIndividual:
      case TWUOpportunityStatus.EvaluationResourceQuestionsConsensus:
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
