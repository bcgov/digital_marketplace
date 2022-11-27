import { EMPTY_STRING } from "front-end/config";
import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as SubmitProposalTerms from "front-end/lib/components/submit-proposal-terms";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/proposal/code-with-us/edit/tab";
import * as Form from "front-end/lib/pages/proposal/code-with-us/lib/components/form";
import * as toasts from "front-end/lib/pages/proposal/code-with-us/lib/toasts";
import EditTabHeader from "front-end/lib/pages/proposal/code-with-us/lib/views/edit-tab-header";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import { compact } from "lodash";
import React from "react";
import { Col, Row } from "reactstrap";
import { formatAmount, formatDateAtTime } from "shared/lib";
import { AffiliationSlim } from "shared/lib/resources/affiliation";
import {
  CWUOpportunity,
  isCWUOpportunityAcceptingProposals
} from "shared/lib/resources/opportunity/code-with-us";
import {
  CWUProposal,
  CWUProposalStatus
} from "shared/lib/resources/proposal/code-with-us";
import { isVendor, User } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { isInvalid } from "shared/lib/validation";

type ModalId =
  | "submit"
  | "submitChanges"
  | "saveChangesAndSubmit"
  | "withdrawBeforeDeadline"
  | "withdrawAfterDeadline"
  | "delete";

export interface State extends Tab.Params {
  proposal: CWUProposal | null;
  opportunity: CWUOpportunity | null;
  affiliations: AffiliationSlim[];
  form: Immutable<Form.State> | null;
  isEditing: boolean;
  startEditingLoading: number;
  saveChangesLoading: number;
  saveChangesAndSubmitLoading: number;
  submitLoading: number;
  withdrawLoading: number;
  deleteLoading: number;
  showModal: ModalId | null;
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
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"hideModal">
  | ADT<"showModal", ModalId>
  | ADT<"form", Form.Msg>
  | ADT<"submitTerms", SubmitProposalTerms.Msg>
  | ADT<"startEditing">
  | ADT<
      "onStartEditingResponse",
      [
        api.ResponseValidation<CWUProposal, string[]>,
        api.ResponseValidation<AffiliationSlim[], string[]>
      ]
    >
  | ADT<"cancelEditing">
  | ADT<"saveChanges">
  | ADT<"onSaveChangesAcceptTermsResponse", boolean>
  | ADT<"onSaveChangesPersistResponse", Form.PersistResult>
  | ADT<"saveChangesAndSubmit">
  | ADT<"onSaveChangesAndSubmitAcceptTermsResponse", boolean>
  | ADT<"onSaveChangesAndSubmitPersistResponse", Form.PersistResult>
  | ADT<
      "onSaveChangesAndSubmitSubmitResponse",
      api.ResponseValidation<CWUProposal, string[]>
    >
  | ADT<"submit">
  | ADT<"onSubmitAcceptTermsResponse", boolean>
  | ADT<"onSubmitSubmitResponse", api.ResponseValidation<CWUProposal, string[]>>
  | ADT<"withdraw">
  | ADT<"onWithdrawResponse", api.ResponseValidation<CWUProposal, string[]>>
  | ADT<"delete">
  | ADT<"onDeleteResponse", api.ResponseValidation<CWUProposal, string[]>>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

function initForm(
  opportunity: CWUOpportunity,
  affiliations: AffiliationSlim[],
  proposal: CWUProposal,
  viewerUser: User,
  activeTab?: Form.TabId,
  validate = false
): [Immutable<Form.State>, component_.Cmd<Form.Msg>[]] {
  const [formState, formCmds] = Form.init({
    viewerUser,
    opportunity,
    proposal,
    affiliations,
    activeTab,
    canRemoveExistingAttachments:
      proposal.status === CWUProposalStatus.Draft ||
      (proposal.status === CWUProposalStatus.Submitted &&
        isCWUOpportunityAcceptingProposals(opportunity))
  });
  let immutableFormState = immutable(formState);
  if (validate) {
    immutableFormState = Form.validate(immutableFormState);
  }
  return [immutableFormState, formCmds];
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [submitTermsState, submitTermsCmds] = SubmitProposalTerms.init({
    proposal: {
      errors: [],
      child: {
        value: false,
        id: "edit-cwu-proposal-submit-terms-proposal"
      }
    },
    app: {
      errors: [],
      child: {
        value: false,
        id: "edit-cwu-proposal-submit-terms-app"
      }
    }
  });
  return [
    {
      ...params,
      proposal: null,
      opportunity: null,
      affiliations: [],
      form: null,
      isEditing: false,
      startEditingLoading: 0,
      saveChangesLoading: 0,
      saveChangesAndSubmitLoading: 0,
      submitLoading: 0,
      withdrawLoading: 0,
      deleteLoading: 0,
      showModal: null,
      submitTerms: immutable(submitTermsState)
    },
    component_.cmd.mapMany(
      submitTermsCmds,
      (msg) => adt("submitTerms", msg) as Msg
    )
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
  proposal: CWUProposal
): component_.base.UpdateReturnValue<State, Msg> {
  const opportunity = state.opportunity;
  if (!opportunity) return [state, []];
  const [formState, formCmds] = initForm(
    opportunity,
    state.affiliations,
    proposal,
    state.viewerUser,
    state.form ? Form.getActiveTab(state.form) : undefined
  );
  return [
    state.set("form", formState).set("proposal", proposal),
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

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const [proposal, opportunity, affiliations] = msg.value;
      const [formState, formCmds] = initForm(
        opportunity,
        affiliations,
        proposal,
        state.viewerUser
      );
      return [
        state
          .set("proposal", proposal)
          .set("opportunity", opportunity)
          .set("affiliations", affiliations)
          .set("form", formState),
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
      if (!proposal) return [state, []];
      return [
        startStartEditingLoading(state),
        [
          component_.cmd.join(
            api.proposals.cwu.readOne(proposal.opportunity.id)(
              proposal.id,
              (response) => response
            ),
            api.affiliations.readMany((response) => response),
            (proposalResponse, affiliationsResponse) =>
              adt("onStartEditingResponse", [
                proposalResponse,
                affiliationsResponse
              ])
          ) as component_.Cmd<Msg>
        ]
      ];
    }
    case "onStartEditingResponse": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      const [proposalResult, affiliationsResult] = msg.value;
      state = stopStartEditingLoading(state);
      if (!api.isValid(proposalResult) || !api.isValid(affiliationsResult)) {
        return [state, []];
      }
      const [formState, formCmds] = initForm(
        opportunity,
        affiliationsResult.value,
        proposalResult.value,
        state.viewerUser,
        state.form ? Form.getActiveTab(state.form) : undefined,
        proposalResult.value.status === CWUProposalStatus.Draft
      );
      return [
        state
          .set("isEditing", true)
          .set("form", formState)
          .set("affiliations", affiliationsResult.value)
          .set("proposal", proposalResult.value),
        component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg)
      ];
    }
    case "cancelEditing": {
      const proposal = state.proposal;
      if (!proposal) return [state, []];
      state = state.set("isEditing", false);
      return resetProposal(state, proposal);
    }
    case "saveChanges": {
      const proposal = state.proposal;
      if (!proposal) return [state, []];
      state = hideModal(state);
      const isSave =
        proposal.status === CWUProposalStatus.Draft ||
        proposal.status === CWUProposalStatus.Withdrawn;
      return [
        startSaveChangesLoading(state),
        [
          !isSave && isVendor(state.viewerUser)
            ? (api.users.update(
                state.viewerUser.id,
                adt("acceptTerms"),
                (response) =>
                  adt("onSaveChangesAcceptTermsResponse", api.isValid(response))
              ) as component_.Cmd<Msg>)
            : component_.cmd.dispatch(
                adt("onSaveChangesAcceptTermsResponse", true)
              )
        ]
      ];
    }
    case "onSaveChangesAcceptTermsResponse": {
      const proposal = state.proposal;
      const form = state.form;
      if (!proposal || !form) return [state, []];
      const isSave =
        proposal.status === CWUProposalStatus.Draft ||
        proposal.status === CWUProposalStatus.Withdrawn;
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
        proposal.status === CWUProposalStatus.Draft ||
        proposal.status === CWUProposalStatus.Withdrawn;
      if (isInvalid(result)) {
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
      const newProposal = result.value[2];
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
            ? (api.users.update(
                state.viewerUser.id,
                adt("acceptTerms"),
                (response) =>
                  adt(
                    "onSaveChangesAndSubmitAcceptTermsResponse",
                    api.isValid(response)
                  )
              ) as component_.Cmd<Msg>)
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
      if (isInvalid(result)) {
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
      const newProposal = result.value[2];
      state = state.set("isEditing", false);
      const [newState, cmds] = resetProposal(state, newProposal);
      return [
        newState,
        [
          ...cmds,
          api.proposals.cwu.update(
            newProposal.id,
            adt("submit", ""),
            (response) => adt("onSaveChangesAndSubmitSubmitResponse", response)
          ) as component_.Cmd<Msg>
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
            ? (api.users.update(
                state.viewerUser.id,
                adt("acceptTerms"),
                (response) =>
                  adt("onSubmitAcceptTermsResponse", api.isValid(response))
              ) as component_.Cmd<Msg>)
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
              api.proposals.cwu.update(
                proposal.id,
                adt("submit", ""),
                (response) => adt("onSubmitSubmitResponse", response)
              ) as component_.Cmd<Msg>
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
          api.proposals.cwu.update(
            proposal.id,
            adt("withdraw", ""),
            (response) => adt("onWithdrawResponse", response)
          ) as component_.Cmd<Msg>
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
                  toasts.statusChanged.error(CWUProposalStatus.Withdrawn)
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
                toasts.statusChanged.success(CWUProposalStatus.Withdrawn)
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
          api.proposals.cwu.delete_(proposal.id, (response) =>
            adt("onDeleteResponse", response)
          ) as component_.Cmd<Msg>
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
              adt("opportunityCWUView" as const, {
                opportunityId: opportunity.id
              })
            )
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
  if (!proposal) return null;
  const showScoreAndRanking =
    proposal.status === CWUProposalStatus.Awarded ||
    proposal.status === CWUProposalStatus.NotAwarded;
  const reportCards: Array<ReportCard | null> = [
    {
      icon: "alarm-clock",
      name: "Proposals Due",
      value: formatDateAtTime(proposal.opportunity.proposalDeadline, true)
    },
    showScoreAndRanking
      ? {
          icon: "star-full",
          iconColor: "c-report-card-icon-highlight",
          name: "Total Score",
          value: proposal.score ? `${proposal.score}%` : EMPTY_STRING
        }
      : null,
    showScoreAndRanking
      ? {
          icon: "trophy",
          iconColor: "c-report-card-icon-highlight",
          name: "Ranking",
          value: proposal.rank
            ? formatAmount(proposal.rank, undefined, true)
            : EMPTY_STRING
        }
      : null
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
  const proposal = state.proposal;
  const form = state.form;
  if (!proposal || !form) return null;
  return (
    <div>
      <EditTabHeader proposal={proposal} viewerUser={state.viewerUser} />
      <Reporting {...props} />
      <Row className="mt-5">
        <Col xs="12">
          <Form.view
            disabled={!state.isEditing || isLoading(state)}
            state={form}
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

  onInitResponse(response) {
    return adt("onInitResponse", response) as InnerMsg;
  },

  getModal: (state) => {
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
              opportunityType="Code With Us"
              action="submitting"
              termsTitle="Code With Us Terms & Conditions"
              termsRoute={adt(
                "contentView",
                "code-with-us-terms-and-conditions"
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
              opportunityType="Code With Us"
              action="submitting changes to"
              termsTitle="Code With Us Terms & Conditions"
              termsRoute={adt(
                "contentView",
                "code-with-us-terms-and-conditions"
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
          title: "Withdraw Code With Us Proposal?",
          body: () =>
            "Are you sure you want to withdraw your Code With Us proposal? You will still be able to resubmit your proposal prior to the opportunity's proposal deadline.",
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
          title: "Withdraw Code With Us Proposal?",
          body: () =>
            "Are you sure you want to withdraw your Code With Us proposal? Your proposal will no longer be considered for this opportunity.",
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
          title: "Delete Code With Us Proposal?",
          body: () =>
            "Are you sure you want to delete your Code With Us proposal? You will not be able to recover the proposal once it has been deleted.",
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
      case null:
        return component_.page.modal.hide();
    }
  },

  getActions: ({ state, dispatch }) => {
    const proposal = state.proposal;
    const opportunity = state.opportunity;
    const form = state.form;
    if (!proposal || !opportunity || !form)
      return component_.page.actions.none();
    const propStatus = proposal.status;
    const isStartEditingLoading = state.startEditingLoading > 0;
    const isSaveChangesLoading = state.saveChangesLoading > 0;
    const isSaveChangesAndSubmitLoading = state.saveChangesAndSubmitLoading > 0;
    const isSubmitLoading = state.submitLoading > 0;
    const isWithdrawLoading = state.withdrawLoading > 0;
    const isDeleteLoading = state.deleteLoading > 0;
    const isValid = () => Form.isValid(form);
    const disabled = isLoading(state);
    const isDraft = propStatus === CWUProposalStatus.Draft;
    const isWithdrawn = propStatus === CWUProposalStatus.Withdrawn;
    const isAcceptingProposals =
      isCWUOpportunityAcceptingProposals(opportunity);
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
      case CWUProposalStatus.Draft:
        if (isAcceptingProposals) {
          return component_.page.actions.dropdown({
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
      case CWUProposalStatus.Submitted:
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
        ]);
      case CWUProposalStatus.UnderReview:
      case CWUProposalStatus.Evaluated:
      case CWUProposalStatus.Awarded:
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
      case CWUProposalStatus.Withdrawn:
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
