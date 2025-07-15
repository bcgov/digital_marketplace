import { EMPTY_STRING } from "front-end/config";
import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as FormField from "front-end/lib/components/form-field";
import * as LongText from "front-end/lib/components/form-field/long-text";
import * as NumberField from "front-end/lib/components/form-field/number";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/proposal/code-with-us/view/tab";
import * as Form from "front-end/lib/pages/proposal/code-with-us/lib/components/form";
import * as toasts from "front-end/lib/pages/proposal/code-with-us/lib/toasts";
import ViewTabHeader from "front-end/lib/pages/proposal/code-with-us/lib/views/view-tab-header";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import { formatAmount } from "shared/lib";
import {
  CWUOpportunity,
  CWUOpportunityStatus
} from "shared/lib/resources/opportunity/code-with-us";
import {
  CWUProposal,
  CWUProposalStatus,
  NUM_SCORE_DECIMALS,
  UpdateValidationErrors
} from "shared/lib/resources/proposal/code-with-us";
import { User } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { invalid } from "shared/lib/validation";
import {
  validateDisqualificationReason,
  validateScore
} from "shared/lib/validation/proposal/code-with-us";

type ModalId = "score" | "disqualify" | "award";

export interface State extends Tab.Params {
  proposal: CWUProposal | null;
  opportunity: CWUOpportunity | null;
  form: Immutable<Form.State> | null;
  scoreLoading: number;
  disqualifyLoading: number;
  awardLoading: number;
  showModal: ModalId | null;
  score: Immutable<NumberField.State>;
  disqualificationReason: Immutable<LongText.State>;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"hideModal">
  | ADT<"showModal", ModalId>
  | ADT<"form", Form.Msg>
  | ADT<"scoreMsg", NumberField.Msg>
  | ADT<"disqualificationReasonMsg", LongText.Msg>
  | ADT<"submitScore">
  | ADT<
      "onSubmitScoreResponse",
      api.ResponseValidation<CWUProposal, UpdateValidationErrors>
    >
  | ADT<"disqualify">
  | ADT<
      "onDisqualifyResponse",
      api.ResponseValidation<CWUProposal, UpdateValidationErrors>
    >
  | ADT<"award">
  | ADT<
      "onAwardResponse",
      api.ResponseValidation<CWUProposal, UpdateValidationErrors>
    >;

export type Msg = component_.page.Msg<InnerMsg, Route>;

function initForm(
  opportunity: CWUOpportunity,
  proposal: CWUProposal,
  viewerUser: User
): [Immutable<Form.State>, component_.Cmd<Form.Msg>[]] {
  const [formState, formCmds] = Form.init({
    viewerUser,
    opportunity,
    proposal,
    affiliations: [],
    canRemoveExistingAttachments: false
  });
  const immutableFormState = immutable(formState);
  return [immutableFormState, formCmds];
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [scoreState, scoreCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid score."]);
      }
      return validateScore(v);
    },
    child: {
      value: null,
      id: "cwu-proposal-score",
      min: 1,
      max: 100,
      step: 0.01
    }
  });
  const [disqualificationReasonState, disqualificationReasonCmds] =
    LongText.init({
      errors: [],
      validate: validateDisqualificationReason,
      child: {
        value: "",
        id: "cwu-proposal-disqualification-reason"
      }
    });
  return [
    {
      ...params,
      proposal: null,
      opportunity: null,
      form: null,
      scoreLoading: 0,
      disqualifyLoading: 0,
      awardLoading: 0,
      showModal: null,
      score: immutable(scoreState),
      disqualificationReason: immutable(disqualificationReasonState)
    },
    [
      ...component_.cmd.mapMany(
        scoreCmds,
        (msg) => adt("scoreMsg", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        disqualificationReasonCmds,
        (msg) => adt("disqualificationReasonMsg", msg) as Msg
      )
    ]
  ];
};

const startScoreLoading = makeStartLoading<State>("scoreLoading");
const stopScoreLoading = makeStopLoading<State>("scoreLoading");
const startDisqualifyLoading = makeStartLoading<State>("disqualifyLoading");
const stopDisqualifyLoading = makeStopLoading<State>("disqualifyLoading");
const startAwardLoading = makeStartLoading<State>("awardLoading");
const stopAwardLoading = makeStopLoading<State>("awardLoading");

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const [proposal, opportunity] = msg.value;
      const [formState, formCmds] = initForm(
        opportunity,
        proposal,
        state.viewerUser
      );
      return [
        state
          .set("proposal", proposal)
          .set("opportunity", opportunity)
          .set("form", formState)
          .update("score", (s) =>
            FormField.setValue(
              s,
              proposal.score === undefined
                ? FormField.getValue(s)
                : proposal.score
            )
          ),
        [
          ...component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg),
          component_.cmd.dispatch(component_.page.readyMsg())
        ]
      ];
    }
    case "showModal":
      return [state.set("showModal", msg.value), []];
    case "hideModal":
      if (state.scoreLoading > 0 || state.disqualifyLoading > 0) {
        // Do nothing if the score or disqualify modals are loading.
        return [state, []];
      }
      return [state.set("showModal", null), []];
    case "form":
      return component_.base.updateChild({
        state,
        childStatePath: ["form"],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("form", value)
      });
    case "scoreMsg":
      return component_.base.updateChild({
        state,
        childStatePath: ["score"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("scoreMsg", value)
      });
    case "disqualificationReasonMsg":
      return component_.base.updateChild({
        state,
        childStatePath: ["disqualificationReason"],
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("disqualificationReasonMsg", value)
      });
    case "submitScore": {
      const score: NumberField.Value = FormField.getValue(state.score);
      const proposal = state.proposal;
      if (!proposal || score === null) {
        return [state, []];
      }
      return [
        startScoreLoading(state),
        [
          api.proposals.cwu.update<Msg>()(
            proposal.id,
            adt("score", score),
            (response) => adt("onSubmitScoreResponse", response)
          )
        ]
      ];
    }
    case "onSubmitScoreResponse": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = stopScoreLoading(state);
      const result = msg.value;
      switch (result.tag) {
        case "valid": {
          const [formState, formCmds] = initForm(
            opportunity,
            result.value,
            state.viewerUser
          );
          return [
            state
              .set("form", formState)
              .set("showModal", null)
              .set("proposal", result.value),
            [
              ...component_.cmd.mapMany(
                formCmds,
                (msg) => adt("form", msg) as Msg
              ),
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "success",
                    toasts.statusChanged.success(CWUProposalStatus.Evaluated)
                  )
                )
              )
            ]
          ];
        }
        case "invalid":
          return [
            state.update("score", (s) => {
              if (result.value.proposal?.tag !== "score") {
                return s;
              }
              return FormField.setErrors(s, result.value.proposal.value);
            }),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "error",
                    toasts.statusChanged.error(CWUProposalStatus.Evaluated)
                  )
                )
              )
            ]
          ];
        case "unhandled":
        default:
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "error",
                    toasts.statusChanged.error(CWUProposalStatus.Evaluated)
                  )
                )
              )
            ]
          ];
      }
    }
    case "disqualify": {
      const proposal = state.proposal;
      if (!proposal) return [state, []];
      const reason: LongText.Value = FormField.getValue(
        state.disqualificationReason
      );
      return [
        startDisqualifyLoading(state),
        [
          api.proposals.cwu.update<Msg>()(
            proposal.id,
            adt("disqualify", reason),
            (response) => adt("onDisqualifyResponse", response)
          )
        ]
      ];
    }
    case "onDisqualifyResponse": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = stopDisqualifyLoading(state);
      const result = msg.value;
      switch (result.tag) {
        case "valid": {
          const [formState, formCmds] = initForm(
            opportunity,
            result.value,
            state.viewerUser
          );
          return [
            state
              .set("form", formState)
              .set("showModal", null)
              .set("proposal", result.value),
            [
              ...component_.cmd.mapMany(
                formCmds,
                (msg) => adt("form", msg) as Msg
              ),
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "success",
                    toasts.statusChanged.success(CWUProposalStatus.Disqualified)
                  )
                )
              )
            ]
          ];
        }
        case "invalid":
          return [
            state.update("disqualificationReason", (s) => {
              if (result.value.proposal?.tag !== "disqualify") {
                return s;
              }
              return FormField.setErrors(s, result.value.proposal.value);
            }),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "error",
                    toasts.statusChanged.error(CWUProposalStatus.Disqualified)
                  )
                )
              )
            ]
          ];
        case "unhandled":
        default:
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "error",
                    toasts.statusChanged.error(CWUProposalStatus.Disqualified)
                  )
                )
              )
            ]
          ];
      }
    }
    case "award": {
      const proposal = state.proposal;
      if (!proposal) return [state, []];
      return [
        startAwardLoading(state).set("showModal", null),
        [
          api.proposals.cwu.update<Msg>()(
            proposal.id,
            adt("award", ""),
            (response) => adt("onAwardResponse", response)
          )
        ]
      ];
    }
    case "onAwardResponse": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      const result = msg.value;
      state = stopAwardLoading(state);
      if (!api.isValid(result)) {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(adt("error", toasts.awarded.error))
            )
          ]
        ];
      }
      const [formState, formCmds] = initForm(
        opportunity,
        result.value,
        state.viewerUser
      );
      return [
        state.set("form", formState).set("proposal", result.value),
        [
          ...component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg),
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt("success", toasts.awarded.success)
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
  const reportCards: ReportCard[] = [
    {
      icon: "star-full",
      iconColor: "c-report-card-icon-highlight",
      name: "Total Score",
      value: proposal.score
        ? `${proposal.score.toFixed(NUM_SCORE_DECIMALS)}%`
        : EMPTY_STRING
    },
    {
      icon: "trophy",
      iconColor: "c-report-card-icon-highlight",
      name: "Ranking",
      value: proposal.rank
        ? formatAmount(proposal.rank, undefined, true)
        : EMPTY_STRING
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
  const proposal = state.proposal;
  const form = state.form;
  if (!proposal || !form) return null;
  return (
    <div>
      <ViewTabHeader proposal={proposal} viewerUser={state.viewerUser} />
      <Reporting {...props} />
      <Row className="mt-5">
        <Col xs="12">
          <Form.view
            disabled
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
    const isScoreLoading = state.scoreLoading > 0;
    const isDisqualifyLoading = state.disqualifyLoading > 0;
    switch (state.showModal) {
      case "award":
        return component_.page.modal.show({
          title: "Award Code With Us Opportunity?",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Award Opportunity",
              icon: "award",
              color: "primary",
              button: true,
              msg: adt("award")
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ],
          body: () =>
            "Are you sure you want to award this opportunity to this vendor? Once awarded, all of this opportunity's subscribers and vendors with submitted proposals will be notified accordingly."
        });
      case "score":
        return component_.page.modal.show({
          title: "Enter Score",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Submit Score",
              icon: "star-full",
              color: "primary",
              button: true,
              loading: isScoreLoading,
              disabled: isScoreLoading || !FormField.isValid(state.score),
              msg: adt("submitScore")
            },
            {
              text: "Cancel",
              color: "secondary",
              disabled: isScoreLoading,
              msg: adt("hideModal")
            }
          ],
          body: (dispatch) => (
            <div>
              <p>
                Provide a total score for the Vendor{"'"}s Code With Us
                proposal.
              </p>
              <NumberField.view
                extraChildProps={{ suffix: "%" }}
                required
                disabled={isScoreLoading}
                label="Total Score"
                placeholder="e.g. 75%"
                help="Enter a score for the proponent’s proposal as a percentage (up to two decimal places)."
                dispatch={component_.base.mapDispatch(dispatch, (v) =>
                  adt("scoreMsg" as const, v)
                )}
                state={state.score}
              />
            </div>
          )
        });
      case "disqualify":
        return component_.page.modal.show({
          title: "Disqualification Reason",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Disqualify",
              icon: "user-slash",
              color: "danger",
              button: true,
              loading: isDisqualifyLoading,
              disabled:
                isDisqualifyLoading ||
                !FormField.isValid(state.disqualificationReason),
              msg: adt("disqualify")
            },
            {
              text: "Cancel",
              color: "secondary",
              disabled: isDisqualifyLoading,
              msg: adt("hideModal")
            }
          ],
          body: (dispatch) => (
            <div>
              <p>
                Provide the reason why this Vendor has been disqualified from
                the Code With Us opportunity.
              </p>
              <LongText.view
                extraChildProps={{
                  style: { height: "180px" }
                }}
                disabled={isDisqualifyLoading}
                required
                label="Reason"
                placeholder="Reason"
                help="Provide a reason for the disqualification of the proponent. This reason will not be shared with the disqualified proponent and is for record-keeping purposes only."
                dispatch={component_.base.mapDispatch(dispatch, (v) =>
                  adt("disqualificationReasonMsg" as const, v)
                )}
                state={state.disqualificationReason}
              />
            </div>
          )
        });
      case null:
        return component_.page.modal.hide();
    }
  },

  getActions: ({ state, dispatch }) => {
    const proposal = state.proposal;
    if (!proposal) return component_.page.actions.none();
    const propStatus = proposal.status;
    const opportunity = state.opportunity;
    if (!opportunity) return component_.page.actions.none();
    const isProcessing = opportunity.status === CWUOpportunityStatus.Processing;

    switch (propStatus) {
      case CWUProposalStatus.UnderReview:
        return component_.page.actions.links([
          {
            children: "Enter Score",
            symbol_: leftPlacement(iconLinkSymbol("star-full")),
            button: true,
            color: "primary",
            onClick: () => dispatch(adt("showModal", "score" as const))
          },
          {
            children: "Disqualify",
            symbol_: leftPlacement(iconLinkSymbol("user-slash")),
            button: true,
            outline: true,
            color: "c-nav-fg-alt",
            onClick: () => dispatch(adt("showModal", "disqualify" as const))
          }
        ]);
      case CWUProposalStatus.Evaluated:
        return component_.page.actions.dropdown({
          text: "Actions",
          loading: false,
          linkGroups: [
            {
              links: [
                {
                  children: "Award",
                  symbol_: leftPlacement(iconLinkSymbol("award")),
                  disabled: !isProcessing,
                  onClick: () => dispatch(adt("showModal", "award" as const))
                },
                {
                  children: "Edit Score",
                  symbol_: leftPlacement(iconLinkSymbol("star-full")),
                  onClick: () => dispatch(adt("showModal", "score" as const))
                }
              ]
            },
            {
              links: [
                {
                  children: "Disqualify",
                  symbol_: leftPlacement(iconLinkSymbol("user-slash")),
                  onClick: () =>
                    dispatch(adt("showModal", "disqualify" as const))
                }
              ]
            }
          ]
        });
      case CWUProposalStatus.NotAwarded:
        return component_.page.actions.links([
          {
            children: "Award",
            symbol_: leftPlacement(iconLinkSymbol("award")),
            button: true,
            color: "primary",
            disabled: !isProcessing,
            onClick: () => dispatch(adt("showModal", "award" as const))
          }
        ]);
      default:
        return component_.page.actions.none();
    }
  }
};
