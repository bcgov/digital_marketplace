import {
  PROPOSAL_POLL_DURATION,
  SWU_PROPOSAL_EVALUATION_CONTENT_ID
} from "front-end/config";
import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as SubmitProposalTerms from "front-end/lib/components/submit-proposal-terms";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/proposal/sprint-with-us/edit/tab";
import * as Form from "front-end/lib/pages/proposal/sprint-with-us/lib/components/form";
import * as toasts from "front-end/lib/pages/proposal/sprint-with-us/lib/toasts";
import EditTabHeader from "front-end/lib/pages/proposal/sprint-with-us/lib/views/edit-tab-header";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import { compact } from "lodash";
import React from "react";
import { Col, Row } from "reactstrap";
import { formatAmount, formatDateAtTime } from "shared/lib";
import { isSWUOpportunityAcceptingProposals } from "shared/lib/resources/opportunity/sprint-with-us";
import { OrganizationSlim } from "shared/lib/resources/organization";
import {
  DeleteValidationErrors,
  SWUProposal,
  swuProposalNumTeamMembers,
  SWUProposalStatus,
  swuProposalTotalProposedCost,
  UpdateValidationErrors
} from "shared/lib/resources/proposal/sprint-with-us";
import { isVendor } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { isInvalid } from "shared/lib/validation";

type ModalId =
  | "submit"
  | "submitChanges"
  | "saveChangesAndSubmit"
  | "withdrawBeforeDeadline"
  | "withdrawAfterDeadline"
  | "delete"
  | "orgProposalChangeDetected";

export interface State extends Tab.Params {
  organizations: OrganizationSlim[];
  evaluationContent: string;
  isEditing: boolean;
  startEditingLoading: number;
  saveChangesLoading: number;
  saveChangesAndSubmitLoading: number;
  submitLoading: number;
  withdrawLoading: number;
  deleteLoading: number;
  showModal: ModalId | null;
  form: Immutable<Form.State>;
  submitTerms: Immutable<SubmitProposalTerms.State>;
}

function isLoading(state: Immutable<State>): boolean {
  return (
    state.startEditingLoading > 0 ||
    state.saveChangesLoading > 0 ||
    state.saveChangesAndSubmitLoading > 0 ||
    state.submitLoading > 0 ||
    state.withdrawLoading > 0 ||
    state.deleteLoading > 0
  );
}

export type InnerMsg =
  | ADT<"noop">
  | ADT<"onInitResponse", [OrganizationSlim[], string]>
  | ADT<"hideModal">
  | ADT<"showModal", ModalId>
  | ADT<"form", Form.Msg>
  | ADT<"submitTerms", SubmitProposalTerms.Msg>
  | ADT<"startEditing">
  | ADT<"onStartEditingResponse", api.ResponseValidation<SWUProposal, string[]>>
  | ADT<"cancelEditing">
  | ADT<"saveChanges">
  | ADT<"onSaveChangesAcceptTermsResponse", boolean>
  | ADT<"onSaveChangesPersistResponse", Form.PersistResult>
  | ADT<"saveChangesAndSubmit">
  | ADT<"onSaveChangesAndSubmitAcceptTermsResponse", boolean>
  | ADT<"onSaveChangesAndSubmitPersistResponse", Form.PersistResult>
  | ADT<
      "onSaveChangesAndSubmitSubmitResponse",
      api.ResponseValidation<SWUProposal, UpdateValidationErrors>
    >
  | ADT<"submit">
  | ADT<"onSubmitAcceptTermsResponse", boolean>
  | ADT<
      "onSubmitSubmitResponse",
      api.ResponseValidation<SWUProposal, UpdateValidationErrors>
    >
  | ADT<"withdraw">
  | ADT<
      "onWithdrawResponse",
      api.ResponseValidation<SWUProposal, UpdateValidationErrors>
    >
  | ADT<"delete">
  | ADT<
      "onDeleteResponse",
      api.ResponseValidation<SWUProposal, DeleteValidationErrors>
    >
  | ADT<"checkStatus">
  | ADT<"onCheckStatusResponse", api.ResponseValidation<SWUProposal, string[]>>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const { opportunity, proposal, viewerUser } = params;
  const [formState, formCmds] = Form.init({
    viewerUser,
    opportunity,
    proposal,
    organizations: [],
    evaluationContent: ""
  });
  const [submitTermsState, submitTermsCmds] = SubmitProposalTerms.init({
    proposal: {
      errors: [],
      child: {
        value: false,
        id: "edit-swu-proposal-submit-terms-proposal"
      }
    },
    app: {
      errors: [],
      child: {
        value: false,
        id: "edit-swu-proposal-submit-terms-app"
      }
    }
  });
  return [
    {
      ...params,
      organizations: [],
      evaluationContent: "",
      isEditing: false,
      startEditingLoading: 0,
      saveChangesLoading: 0,
      saveChangesAndSubmitLoading: 0,
      submitLoading: 0,
      withdrawLoading: 0,
      deleteLoading: 0,
      showModal: null,
      form: immutable(formState),
      submitTerms: immutable(submitTermsState)
    },
    [
      ...component_.cmd.mapMany(
        submitTermsCmds,
        (msg) => adt("submitTerms", msg) as Msg
      ),
      ...component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg),
      component_.cmd.join(
        api.organizations.owned.readMany()((response) =>
          api.getValidValue(response, [])
        ),
        api.content.readOne()(SWU_PROPOSAL_EVALUATION_CONTENT_ID, (response) =>
          api.isValid(response) ? response.value.body : ""
        ),
        (organizations, evalContent) =>
          adt("onInitResponse", [organizations, evalContent]) as Msg
      )
    ]
  ];
};

const startStartEditingLoading = makeStartLoading<State>("startEditingLoading");
const stopStartEditingLoading = makeStopLoading<State>("startEditingLoading");
const startSaveChangesLoading = makeStartLoading<State>("saveChangesLoading");
const stopSaveChangesLoading = makeStopLoading<State>("saveChangesLoading");
const startSaveChangesAndSubmitLoading = makeStartLoading<State>(
  "saveChangesAndSubmitLoading"
);
const stopSaveChangesAndSubmitLoading = makeStopLoading<State>(
  "saveChangesAndSubmitLoading"
);
const startSubmitLoading = makeStartLoading<State>("submitLoading");
const stopSubmitLoading = makeStopLoading<State>("submitLoading");
const startWithdrawLoading = makeStartLoading<State>("withdrawLoading");
const stopWithdrawLoading = makeStopLoading<State>("withdrawLoading");
const startDeleteLoading = makeStartLoading<State>("deleteLoading");
const stopDeleteLoading = makeStopLoading<State>("deleteLoading");

function resetProposal(
  state: Immutable<State>,
  proposal: SWUProposal,
  validate = false
): component_.base.UpdateReturnValue<State, Msg> {
  state = state.set("proposal", proposal);
  const [formState, formCmds] = Form.init({
    viewerUser: state.viewerUser,
    opportunity: state.opportunity,
    proposal: state.proposal,
    organizations: state.organizations,
    evaluationContent: state.evaluationContent,
    activeTab: state.form ? Form.getActiveTab(state.form) : undefined
  });
  let immutableFormState = immutable(formState);
  if (validate) {
    immutableFormState = Form.validate(immutableFormState);
  }
  return [
    state.set("form", immutableFormState),
    component_.cmd.mapMany(formCmds, (msg) => adt("form", msg))
  ];
}

function hideModal(state: Immutable<State>): Immutable<State> {
  return state
    .set("showModal", null)
    .update("submitTerms", (s) =>
      SubmitProposalTerms.setProposalCheckbox(s, false)
    )
    .update("submitTerms", (s) => SubmitProposalTerms.setAppCheckbox(s, false));
}

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const [organizations, evaluationContent] = msg.value;
      const [formState, formCmds] = Form.init({
        viewerUser: state.viewerUser,
        opportunity: state.opportunity,
        proposal: state.proposal,
        organizations,
        evaluationContent
      });
      return [
        state
          .set("organizations", organizations)
          .set("evaluationContent", evaluationContent)
          .set("form", immutable(formState)),
        [
          ...component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg),
          component_.cmd.dispatch(component_.page.readyMsg())
        ]
      ];
    }

    case "showModal":
      return [state.set("showModal", msg.value), []];
    case "hideModal":
      return [hideModal(state), []];
    case "form":
      return component_.base.updateChild({
        state,
        childStatePath: ["form"],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("form", value)
      });
    case "submitTerms":
      return component_.base.updateChild({
        state,
        childStatePath: ["submitTerms"],
        childUpdate: SubmitProposalTerms.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("submitTerms", value)
      });
    case "startEditing": {
      const proposal = state.proposal;
      return [
        startStartEditingLoading(state),
        [
          api.proposals.swu.readOne<Msg>(proposal.opportunity.id)(
            proposal.id,
            (response) => adt("onStartEditingResponse", response)
          )
        ]
      ];
    }
    case "onStartEditingResponse": {
      const result = msg.value;
      state = stopStartEditingLoading(state);
      if (!api.isValid(result)) {
        return [state, []];
      }
      const [newState, cmds] = resetProposal(
        state,
        result.value,
        result.value.status === SWUProposalStatus.Draft
      );
      return [
        newState.set("isEditing", true),
        [...cmds, component_.cmd.dispatch(adt("checkStatus") as Msg)]
      ];
    }
    case "cancelEditing": {
      const [newState, cmds] = resetProposal(state, state.proposal);
      return [newState.set("isEditing", false), cmds];
    }
    case "saveChanges": {
      const proposal = state.proposal;
      state = hideModal(state);
      const isSave =
        proposal.status === SWUProposalStatus.Draft ||
        proposal.status === SWUProposalStatus.Withdrawn;
      return [
        startSaveChangesLoading(state),
        [
          !isSave && isVendor(state.viewerUser)
            ? api.users.update<Msg>()(
                state.viewerUser.id,
                adt("acceptTerms"),
                (response) =>
                  adt("onSaveChangesAcceptTermsResponse", api.isValid(response))
              )
            : component_.cmd.dispatch(
                adt("onSaveChangesAcceptTermsResponse", true)
              )
        ]
      ];
    }
    case "onSaveChangesAcceptTermsResponse": {
      const proposal = state.proposal;
      const form = state.form;
      const isSave =
        proposal.status === SWUProposalStatus.Draft ||
        proposal.status === SWUProposalStatus.Withdrawn;
      const acceptedTerms = msg.value;
      return acceptedTerms
        ? [
            state,
            [
              component_.cmd.map(
                Form.persist(form, adt("update", proposal.id)),
                (result) => adt("onSaveChangesPersistResponse", result)
              )
            ]
          ]
        : [
            stopSaveChangesLoading(state),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "error",
                    isSave
                      ? toasts.changesSaved.error
                      : toasts.changesSubmitted.error
                  )
                )
              )
            ]
          ];
    }
    case "onSaveChangesPersistResponse": {
      const proposal = state.proposal;
      if (!proposal) return [state, []];
      const result = msg.value;
      state = stopSaveChangesLoading(state);
      const isSave =
        proposal.status === SWUProposalStatus.Draft ||
        proposal.status === SWUProposalStatus.Withdrawn;
      if (isInvalid<Immutable<Form.State>>(result)) {
        return [
          state.set("form", result.value),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt(
                  "error",
                  isSave
                    ? toasts.changesSaved.error
                    : toasts.changesSubmitted.error
                )
              )
            )
          ]
        ];
      }
      const newProposal = result.value[1];
      state = state.set("isEditing", false);
      const [newState, cmds] = resetProposal(state, newProposal);
      return [
        newState,
        [
          ...cmds,
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt(
                "success",
                isSave
                  ? toasts.changesSaved.success
                  : toasts.changesSubmitted.success
              )
            )
          )
        ]
      ];
    }
    case "saveChangesAndSubmit": {
      const proposal = state.proposal;
      if (!proposal) return [state, []];
      state = hideModal(state);
      return [
        startSaveChangesAndSubmitLoading(state),
        [
          isVendor(state.viewerUser)
            ? api.users.update<Msg>()(
                state.viewerUser.id,
                adt("acceptTerms"),
                (response) =>
                  adt(
                    "onSaveChangesAndSubmitAcceptTermsResponse",
                    api.isValid(response)
                  )
              )
            : component_.cmd.dispatch(
                adt("onSaveChangesAndSubmitAcceptTermsResponse", true)
              )
        ]
      ];
    }
    case "onSaveChangesAndSubmitAcceptTermsResponse": {
      const proposal = state.proposal;
      const form = state.form;
      if (!proposal || !form) return [state, []];
      const acceptedTerms = msg.value;
      return acceptedTerms
        ? [
            state,
            [
              component_.cmd.map(
                Form.persist(form, adt("update", proposal.id)),
                (result) => adt("onSaveChangesAndSubmitPersistResponse", result)
              )
            ]
          ]
        : [
            stopSaveChangesAndSubmitLoading(state),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.submitted.error)
                )
              )
            ]
          ];
    }
    case "onSaveChangesAndSubmitPersistResponse": {
      const proposal = state.proposal;
      if (!proposal) return [state, []];
      const result = msg.value;
      if (isInvalid<Immutable<Form.State>>(result)) {
        return [
          stopSaveChangesAndSubmitLoading(state).set("form", result.value),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("error", toasts.submitted.error)
              )
            )
          ]
        ];
      }
      const newProposal = result.value[1];
      state = state.set("isEditing", false);
      const [newState, cmds] = resetProposal(state, newProposal);
      return [
        newState,
        [
          ...cmds,
          api.proposals.swu.update<Msg>()(
            newProposal.id,
            adt("submit", ""),
            (response) => adt("onSaveChangesAndSubmitSubmitResponse", response)
          )
        ]
      ];
    }
    case "onSaveChangesAndSubmitSubmitResponse": {
      state = stopSaveChangesAndSubmitLoading(state);
      const result = msg.value;
      if (!api.isValid(result)) {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("error", toasts.submitted.error)
              )
            )
          ]
        ];
      }
      const newProposal = result.value;
      state = state.set("isEditing", false);
      const [newState, cmds] = resetProposal(state, newProposal);
      return [
        newState,
        [
          ...cmds,
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt("success", toasts.submitted.success)
            )
          )
        ]
      ];
    }
    case "submit": {
      const proposal = state.proposal;
      if (!proposal) return [state, []];
      state = hideModal(state);
      return [
        startSubmitLoading(state),
        [
          isVendor(state.viewerUser)
            ? api.users.update<Msg>()(
                state.viewerUser.id,
                adt("acceptTerms"),
                (response) =>
                  adt("onSubmitAcceptTermsResponse", api.isValid(response))
              )
            : component_.cmd.dispatch(adt("onSubmitAcceptTermsResponse", true))
        ]
      ];
    }
    case "onSubmitAcceptTermsResponse": {
      const proposal = state.proposal;
      const form = state.form;
      if (!proposal || !form) return [state, []];
      const acceptedTerms = msg.value;
      return acceptedTerms
        ? [
            state,
            [
              api.proposals.swu.update<Msg>()(
                proposal.id,
                adt("submit", ""),
                (response) => adt("onSubmitSubmitResponse", response)
              )
            ]
          ]
        : [
            stopSubmitLoading(state),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.submitted.error)
                )
              )
            ]
          ];
    }
    case "onSubmitSubmitResponse": {
      state = stopSubmitLoading(state);
      const result = msg.value;
      if (!api.isValid(result)) {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("error", toasts.submitted.error)
              )
            )
          ]
        ];
      }
      const newProposal = result.value;
      const [newState, cmds] = resetProposal(state, newProposal);
      return [
        newState,
        [
          ...cmds,
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt("success", toasts.submitted.success)
            )
          )
        ]
      ];
    }
    case "withdraw": {
      const proposal = state.proposal;
      if (!proposal) return [state, []];
      state = hideModal(state);
      return [
        startWithdrawLoading(state),
        [
          api.proposals.swu.update<Msg>()(
            proposal.id,
            adt("withdraw", ""),
            (response) => adt("onWithdrawResponse", response)
          )
        ]
      ];
    }
    case "onWithdrawResponse": {
      state = stopWithdrawLoading(state);
      const result = msg.value;
      if (!api.isValid(result)) {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt(
                  "error",
                  toasts.statusChanged.error(SWUProposalStatus.Withdrawn)
                )
              )
            )
          ]
        ];
      }
      const newProposal = result.value;
      const [newState, cmds] = resetProposal(state, newProposal);
      return [
        newState,
        [
          ...cmds,
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt(
                "success",
                toasts.statusChanged.success(SWUProposalStatus.Withdrawn)
              )
            )
          )
        ]
      ];
    }
    case "delete": {
      const proposal = state.proposal;
      if (!proposal) return [state, []];
      state = hideModal(state);
      return [
        startDeleteLoading(state),
        [
          api.proposals.swu.delete_<Msg>()(proposal.id, (response) =>
            adt("onDeleteResponse", response)
          )
        ]
      ];
    }
    case "onDeleteResponse": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = stopDeleteLoading(state);
      const result = msg.value;
      if (!api.isValid(result)) {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(adt("error", toasts.deleted.error))
            )
          ]
        ];
      }
      return [
        state,
        [
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt("success", toasts.deleted.success)
            )
          ),
          component_.cmd.dispatch(
            component_.global.replaceRouteMsg(
              adt("opportunitySWUView" as const, {
                opportunityId: opportunity.id
              })
            )
          )
        ]
      ];
    }
    case "checkStatus": {
      return [
        state,
        state.isEditing
          ? [
              api.proposals.swu.readOne<Msg>(state.proposal.opportunity.id)(
                state.proposal.id,
                (result) => adt("onCheckStatusResponse", result)
              )
            ]
          : []
      ];
    }
    case "onCheckStatusResponse": {
      const incomingProposal = api.getValidValue(msg.value, null);
      if (!incomingProposal) {
        return [state, []];
      }

      if (incomingProposal.updatedAt > state.proposal.updatedAt) {
        return [
          state,
          [
            component_.cmd.dispatch(
              adt("showModal", "orgProposalChangeDetected" as const) as Msg
            )
          ]
        ];
      }

      return [
        state,
        [
          component_.cmd.delayedDispatch(
            PROPOSAL_POLL_DURATION,
            adt("checkStatus") as Msg
          )
        ]
      ];
    }
    default:
      return [state, []];
  }
};

const Reporting: component_.base.ComponentView<State, Msg> = ({ state }) => {
  const proposal = state.proposal;
  const numTeamMembers = swuProposalNumTeamMembers(proposal);
  const totalProposedCost = swuProposalTotalProposedCost(proposal);
  const reportCards: Array<ReportCard | null> = [
    {
      icon: "alarm-clock",
      name: "Proposals Deadline",
      value: formatDateAtTime(proposal.opportunity.proposalDeadline, true)
    },
    {
      icon: "users",
      name: `Team Member${numTeamMembers === 1 ? "" : "s"}`,
      value: String(numTeamMembers)
    },
    {
      icon: "badge-dollar",
      name: "Proposed Cost",
      value: formatAmount(totalProposedCost, "$")
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

const view: component_.base.ComponentView<State, Msg> = (props) => {
  const { state, dispatch } = props;
  return (
    <div>
      <EditTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      <Reporting {...props} />
      <Row className="mt-5">
        <Col xs="12">
          <Form.view
            disabled={!state.isEditing || isLoading(state)}
            state={state.form}
            dispatch={component_.base.mapDispatch(dispatch, (v) =>
              adt("form" as const, v)
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

  onInitResponse() {
    return adt("noop");
  },

  getAlerts: (state) => {
    return Form.getAlerts(state.form);
  },

  getModal: (state) => {
    const formModal = component_.page.modal.map(
      Form.getModal(state.form),
      (msg) => adt("form", msg) as Msg
    );
    if (formModal.tag !== "hide") {
      return formModal;
    }
    const hasAcceptedTerms =
      SubmitProposalTerms.getProposalCheckbox(state.submitTerms) &&
      SubmitProposalTerms.getAppCheckbox(state.submitTerms);

    switch (state.showModal) {
      case "submit":
      case "saveChangesAndSubmit":
        return component_.page.modal.show({
          title: "Review Terms and Conditions",
          body: (dispatch) => (
            <SubmitProposalTerms.view
              opportunityType="Sprint With Us"
              action="submitting"
              termsTitle="Sprint With Us Terms & Conditions"
              termsRoute={adt(
                "contentView",
                "sprint-with-us-terms-and-conditions"
              )}
              state={state.submitTerms}
              dispatch={component_.base.mapDispatch(
                dispatch,
                (msg) => adt("submitTerms", msg) as Msg
              )}
            />
          ),
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Submit Proposal",
              icon: "paper-plane",
              color: "primary",
              msg:
                state.showModal === "submit"
                  ? adt("submit")
                  : adt("saveChangesAndSubmit"),
              button: true,
              disabled: !hasAcceptedTerms
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      case "submitChanges":
        return component_.page.modal.show({
          title: "Review Terms and Conditions",
          body: (dispatch) => (
            <SubmitProposalTerms.view
              opportunityType="Sprint With Us"
              action="submitting changes to"
              termsTitle="Sprint With Us Terms & Conditions"
              termsRoute={adt(
                "contentView",
                "sprint-with-us-terms-and-conditions"
              )}
              state={state.submitTerms}
              dispatch={component_.base.mapDispatch(
                dispatch,
                (msg) => adt("submitTerms", msg) as Msg
              )}
            />
          ),
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Submit Changes",
              icon: "paper-plane",
              color: "primary",
              msg: adt("saveChanges"),
              button: true,
              disabled: !hasAcceptedTerms
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      case "withdrawBeforeDeadline":
        return component_.page.modal.show({
          title: "Withdraw Sprint With Us Proposal?",
          body: () =>
            "Are you sure you want to withdraw your Sprint With Us proposal? You will still be able to resubmit your proposal prior to the opportunity's proposal deadline.",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Withdraw Proposal",
              icon: "ban",
              color: "danger",
              msg: adt("withdraw"),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      case "withdrawAfterDeadline":
        return component_.page.modal.show({
          title: "Withdraw Sprint With Us Proposal?",
          body: () =>
            "Are you sure you want to withdraw your Sprint With Us proposal? You will no longer be considered for this opportunity.",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Withdraw Proposal",
              icon: "ban",
              color: "danger",
              msg: adt("withdraw"),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      case "delete":
        return component_.page.modal.show({
          title: "Delete Sprint With Us Proposal?",
          body: () =>
            "Are you sure you want to delete your Sprint With Us proposal? You will not be able to recover the proposal once it has been deleted.",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Delete Proposal",
              icon: "trash",
              color: "danger",
              msg: adt("delete"),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      case "orgProposalChangeDetected":
        return component_.page.modal.show({
          title: "Proposal Changes Detected",
          body: () => (
            <>
              <p>
                Someone else in your organization has submitted changes to this
                proposal since you started editing it.
              </p>
              <p>Your options are:</p>
              <ol>
                <li>
                  Save your changes to a document offline, cancel editing, and
                  re-enter your changes.
                </li>
                <li>
                  Keep working, and when you submit, your version{" "}
                  <strong>will</strong> overwrite the previously submitted
                  changes.
                </li>
              </ol>
            </>
          ),
          onCloseMsg: adt("hideModal") as Msg,
          actions: []
        });
      case null:
        return component_.page.modal.hide();
    }
  },

  getActions: ({ state, dispatch }) => {
    const proposal = state.proposal;
    const propStatus = proposal.status;
    const isStartEditingLoading = state.startEditingLoading > 0;
    const isSaveChangesLoading = state.saveChangesLoading > 0;
    const isSaveChangesAndSubmitLoading = state.saveChangesAndSubmitLoading > 0;
    const isSubmitLoading = state.submitLoading > 0;
    const isWithdrawLoading = state.withdrawLoading > 0;
    const isDeleteLoading = state.deleteLoading > 0;
    const isValid = () => Form.isValid(state.form);
    const disabled = isLoading(state);
    const isDraft = propStatus === SWUProposalStatus.Draft;
    const isWithdrawn = propStatus === SWUProposalStatus.Withdrawn;
    const isAcceptingProposals = isSWUOpportunityAcceptingProposals(
      state.opportunity
    );
    if (state.isEditing) {
      const separateSubmitButton =
        (isDraft || isWithdrawn) && isAcceptingProposals;
      return component_.page.actions.links(
        compact([
          // Submit Changes
          separateSubmitButton
            ? {
                children: "Submit Proposal",
                symbol_: leftPlacement(iconLinkSymbol("paper-plane")),
                button: true,
                loading: isSaveChangesAndSubmitLoading,
                disabled: disabled || !isValid(),
                color: "primary",
                onClick: () =>
                  dispatch(adt("showModal", "saveChangesAndSubmit" as const))
              }
            : null,
          // Save Changes
          {
            children: separateSubmitButton ? "Save Changes" : "Submit Changes",
            disabled:
              disabled ||
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
                separateSubmitButton
                  ? adt("saveChanges")
                  : adt("showModal", "submitChanges" as const)
              ),
            button: true,
            loading: isSaveChangesLoading,
            symbol_: leftPlacement(
              iconLinkSymbol(separateSubmitButton ? "save" : "paper-plane")
            ),
            color: separateSubmitButton ? "success" : "primary"
          },
          // Cancel
          {
            children: "Cancel",
            disabled,
            onClick: () => dispatch(adt("cancelEditing")),
            color: "c-nav-fg-alt"
          }
        ])
      ) as component_.page.Actions;
    }
    switch (propStatus) {
      case SWUProposalStatus.Draft:
        if (isAcceptingProposals) {
          return adt("dropdown", {
            text: "Actions",
            loading:
              isSubmitLoading || isStartEditingLoading || isDeleteLoading,
            linkGroups: [
              {
                links: [
                  {
                    children: "Submit",
                    symbol_: leftPlacement(iconLinkSymbol("paper-plane")),
                    disabled: !isValid(),
                    onClick: () => dispatch(adt("showModal", "submit" as const))
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
              button: true,
              outline: true,
              color: "c-nav-fg-alt",
              children: "Delete",
              symbol_: leftPlacement(iconLinkSymbol("trash")),
              onClick: () => dispatch(adt("showModal", "delete" as const))
            }
          ]);
        }
      case SWUProposalStatus.Submitted:
        return component_.page.actions.links([
          ...(isAcceptingProposals
            ? [
                {
                  children: "Edit",
                  symbol_: leftPlacement(iconLinkSymbol("edit")),
                  button: true,
                  color: "primary" as const,
                  disabled,
                  loading: isStartEditingLoading,
                  onClick: () => dispatch(adt("startEditing"))
                }
              ]
            : []),
          {
            children: "Withdraw",
            symbol_: leftPlacement(iconLinkSymbol("ban")),
            button: true,
            outline: true,
            color: "c-nav-fg-alt",
            disabled,
            loading: isWithdrawLoading,
            onClick: () =>
              dispatch(
                adt(
                  "showModal",
                  isAcceptingProposals
                    ? ("withdrawBeforeDeadline" as const)
                    : ("withdrawAfterDeadline" as const)
                )
              )
          }
        ]) as component_.page.Actions;
      case SWUProposalStatus.UnderReviewTeamQuestions:
      case SWUProposalStatus.UnderReviewCodeChallenge:
      case SWUProposalStatus.UnderReviewTeamScenario:
      case SWUProposalStatus.EvaluatedTeamQuestions:
      case SWUProposalStatus.EvaluatedCodeChallenge:
      case SWUProposalStatus.EvaluatedTeamScenario:
      case SWUProposalStatus.Awarded:
        return component_.page.actions.links([
          {
            children: "Withdraw",
            symbol_: leftPlacement(iconLinkSymbol("ban")),
            button: true,
            outline: true,
            color: "c-nav-fg-alt",
            disabled,
            loading: isWithdrawLoading,
            onClick: () =>
              dispatch(adt("showModal", "withdrawAfterDeadline" as const))
          }
        ]);
      case SWUProposalStatus.Withdrawn:
        if (isAcceptingProposals) {
          return component_.page.actions.links([
            {
              children: "Submit",
              symbol_: leftPlacement(iconLinkSymbol("paper-plane")),
              loading: isSubmitLoading,
              disabled,
              button: true,
              color: "primary",
              onClick: () => dispatch(adt("showModal", "submit" as const))
            },
            {
              children: "Edit",
              symbol_: leftPlacement(iconLinkSymbol("edit")),
              button: true,
              color: "info",
              disabled,
              loading: isStartEditingLoading,
              onClick: () => dispatch(adt("startEditing"))
            }
          ]);
        } else {
          return component_.page.actions.none();
        }
      default:
        return component_.page.actions.none();
    }
  }
};
