import {
  EMPTY_STRING,
  SWU_PROPOSAL_EVALUATION_CONTENT_ID
} from "front-end/config";
import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as FormField from "front-end/lib/components/form-field";
import * as LongText from "front-end/lib/components/form-field/long-text";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Form from "front-end/lib/pages/proposal/sprint-with-us/lib/components/form";
import * as toasts from "front-end/lib/pages/proposal/sprint-with-us/lib/toasts";
import ViewTabHeader from "front-end/lib/pages/proposal/sprint-with-us/lib/views/view-tab-header";
import * as Tab from "front-end/lib/pages/proposal/sprint-with-us/view/tab";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  rightPlacement,
  routeDest
} from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import { formatAmount } from "shared/lib";
import { hasSWUOpportunityPassedCodeChallenge } from "shared/lib/resources/opportunity/sprint-with-us";
import { OrganizationSlim } from "shared/lib/resources/organization";
import {
  NUM_SCORE_DECIMALS,
  SWUProposal,
  SWUProposalStatus,
  UpdateValidationErrors
} from "shared/lib/resources/proposal/sprint-with-us";
import { adt, ADT } from "shared/lib/types";
import { validateDisqualificationReason } from "shared/lib/validation/proposal/sprint-with-us";

type ModalId = "disqualify" | "award";

export interface State extends Tab.Params {
  organizations: OrganizationSlim[] | null;
  evaluationContent: string | null;
  disqualifyLoading: number;
  awardLoading: number;
  showModal: ModalId | null;
  form: Immutable<Form.State> | null;
  disqualificationReason: Immutable<LongText.State>;
}

export type InnerMsg =
  | ADT<"noop">
  | ADT<"onInitResponse", [OrganizationSlim[], string]>
  | ADT<"hideModal">
  | ADT<"showModal", ModalId>
  | ADT<"form", Form.Msg>
  | ADT<"disqualificationReasonMsg", LongText.Msg>
  | ADT<"disqualify">
  | ADT<
      "onDisqualifyResponse",
      api.ResponseValidation<SWUProposal, UpdateValidationErrors>
    >
  | ADT<"award">
  | ADT<
      "onAwardResponse",
      api.ResponseValidation<SWUProposal, UpdateValidationErrors>
    >;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [disqualificationReasonState, disqualificationReasonCmds] =
    LongText.init({
      errors: [],
      validate: validateDisqualificationReason,
      child: {
        value: "",
        id: "swu-proposal-disqualification-reason"
      }
    });
  return [
    {
      ...params,
      organizations: null,
      evaluationContent: null,
      disqualifyLoading: 0,
      awardLoading: 0,
      showModal: null,
      form: null,
      disqualificationReason: immutable(disqualificationReasonState)
    },
    [
      ...component_.cmd.mapMany(
        disqualificationReasonCmds,
        (msg) => adt("disqualificationReasonMsg", msg) as Msg
      ),
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

const startDisqualifyLoading = makeStartLoading<State>("disqualifyLoading");
const stopDisqualifyLoading = makeStopLoading<State>("disqualifyLoading");
const startAwardLoading = makeStartLoading<State>("awardLoading");
const stopAwardLoading = makeStopLoading<State>("awardLoading");

function resetProposal(
  state: Immutable<State>,
  proposal: SWUProposal
): component_.base.UpdateReturnValue<State, Msg> {
  const organizations = state.organizations;
  const evaluationContent = state.evaluationContent;
  if (!organizations || !evaluationContent) return [state, []];
  state = state.set("proposal", proposal);
  const [formState, formCmds] = Form.init({
    viewerUser: state.viewerUser,
    opportunity: state.opportunity,
    proposal: state.proposal,
    organizations,
    evaluationContent,
    activeTab: state.form ? Form.getActiveTab(state.form) : undefined
  });
  return [
    state.set("form", immutable(formState)),
    component_.cmd.mapMany(formCmds, (msg) => adt("form", msg))
  ];
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
          .set("form", immutable(formState))
          .set("organizations", organizations)
          .set("evaluationContent", evaluationContent),
        [
          ...component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg),
          component_.cmd.dispatch(component_.page.readyMsg())
        ]
      ];
    }
    case "showModal":
      return [state.set("showModal", msg.value), []];
    case "hideModal":
      if (state.disqualifyLoading > 0) {
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
    case "disqualificationReasonMsg":
      return component_.base.updateChild({
        state,
        childStatePath: ["disqualificationReason"],
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("disqualificationReasonMsg", value)
      });
    case "disqualify": {
      const proposal = state.proposal;
      const reason: LongText.Value = FormField.getValue(
        state.disqualificationReason
      );
      return [
        startDisqualifyLoading(state),
        [
          api.proposals.swu.update<Msg>()(
            proposal.id,
            adt("disqualify", reason),
            (response) => adt("onDisqualifyResponse", response)
          )
        ]
      ];
    }
    case "onDisqualifyResponse": {
      state = stopDisqualifyLoading(state);
      const result = msg.value;
      switch (result.tag) {
        case "valid": {
          const [newState, cmds] = resetProposal(state, result.value);
          return [
            newState.set("showModal", null).set("proposal", result.value),
            [
              ...cmds,
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "success",
                    toasts.statusChanged.success(SWUProposalStatus.Disqualified)
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
                    toasts.statusChanged.error(SWUProposalStatus.Disqualified)
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
                    toasts.statusChanged.error(SWUProposalStatus.Disqualified)
                  )
                )
              )
            ]
          ];
      }
    }
    case "award": {
      const proposal = state.proposal;
      return [
        startAwardLoading(state).set("showModal", null),
        [
          api.proposals.swu.update<Msg>()(
            proposal.id,
            adt("award", ""),
            (response) => adt("onAwardResponse", response)
          )
        ]
      ];
    }
    case "onAwardResponse": {
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
      const [newState, cmds] = resetProposal(state, result.value);
      return [
        newState.set("proposal", result.value),
        [
          ...cmds,
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
  const reportCards: Array<ReportCard | null> = [
    {
      icon: "star-full",
      iconColor: "c-report-card-icon-highlight",
      name: "Total Score",
      value: proposal.totalScore
        ? `${proposal.totalScore.toFixed(NUM_SCORE_DECIMALS)}%`
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
  const form = state.form;
  if (!form) return null;
  const show = hasSWUOpportunityPassedCodeChallenge(state.opportunity);
  return (
    <div>
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      {show ? (
        <Row>
          <Col xs="12">
            <Link
              newTab
              color="info"
              className="mt-3"
              dest={routeDest(
                adt("proposalSWUExportOne", {
                  opportunityId: state.proposal.opportunity.id,
                  proposalId: state.proposal.id
                })
              )}
              symbol_={rightPlacement(iconLinkSymbol("file-export"))}>
              Export Proposal
            </Link>
          </Col>
        </Row>
      ) : null}
      {show ? <Reporting {...props} /> : null}
      <Row className="mt-5">
        <Col xs="12">
          {show ? (
            <Form.view
              disabled
              state={form}
              dispatch={component_.base.mapDispatch(dispatch, (v) =>
                adt("form" as const, v)
              )}
            />
          ) : (
            <div className="pt-5 border-top">
              This proposal{"'"}s details will be available once the opportunity
              reaches the Code Challenge.
            </div>
          )}
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

  getModal: (state) => {
    const form = state.form;
    if (!form) return component_.page.modal.hide();
    const formModal = component_.page.modal.map(
      Form.getModal(form),
      (msg) => adt("form", msg) as Msg
    );
    if (formModal.tag !== "hide") {
      return formModal;
    }
    const isDisqualifyLoading = state.disqualifyLoading > 0;
    switch (state.showModal) {
      case "award":
        return component_.page.modal.show({
          title: "Award Sprint With Us Opportunity?",
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
            "Are you sure you want to award this opportunity to this proponent? Once awarded, all of this opportunity's subscribers and proponents will be notified accordingly."
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
                the Sprint With Us opportunity.
              </p>
              <LongText.view
                extraChildProps={{
                  style: { height: "180px" }
                }}
                disabled={isDisqualifyLoading}
                help="Provide a reason for the disqualification of the proponent. This reason will not be shared with the disqualified proponent and is for record-keeping purposes only."
                required
                label="Reason"
                placeholder="Reason"
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
    const propStatus = proposal.status;
    const opportunity = state.opportunity;
    const isProcessing = opportunity?.status === "PROCESSING";

    switch (propStatus) {
      case SWUProposalStatus.UnderReviewTeamQuestions:
      case SWUProposalStatus.UnderReviewCodeChallenge:
      case SWUProposalStatus.UnderReviewTeamScenario:
      case SWUProposalStatus.DeprecatedEvaluatedTeamQuestions:
      case SWUProposalStatus.EvaluatedCodeChallenge:
        return component_.page.actions.links([
          {
            children: "Disqualify",
            symbol_: leftPlacement(iconLinkSymbol("user-slash")),
            button: true,
            outline: true,
            color: "c-nav-fg-alt",
            onClick: () => dispatch(adt("showModal", "disqualify" as const))
          }
        ]);
      case SWUProposalStatus.EvaluatedTeamScenario:
        return component_.page.actions.links([
          {
            children: "Award",
            symbol_: leftPlacement(iconLinkSymbol("award")),
            button: true,
            color: "primary",
            disabled: !isProcessing,
            onClick: () => dispatch(adt("showModal", "award" as const))
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
      case SWUProposalStatus.NotAwarded:
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
      case SWUProposalStatus.Draft:
      case SWUProposalStatus.Submitted:
      case SWUProposalStatus.Withdrawn:
      case SWUProposalStatus.Awarded:
      case SWUProposalStatus.Disqualified:
        return component_.page.actions.none();
    }
  }
};
