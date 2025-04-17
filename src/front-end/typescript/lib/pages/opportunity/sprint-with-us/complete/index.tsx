import { makePageMetadata, updateValid, viewValid } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Form from "front-end/lib/pages/opportunity/sprint-with-us/lib/components/form";
import * as AddendaTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/addenda";
import * as HistoryTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/history";
import * as ProposalsTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/proposals";
import * as InstructionsTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/instructions";
import * as OverviewTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/overview";
import * as TeamQuestionsTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/team-questions";
import * as ConsensusTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/consensus";
import * as CodeChallengeTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/code-challenge";
import * as TeamScenarioTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/team-scenario";
import React from "react";
import { Col, Row } from "reactstrap";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import EditTabHeader from "front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import { invalid, valid } from "shared/lib/http";
import { Validation } from "shared/lib/validation";
import { SWUProposalSlim } from "shared/lib/resources/proposal/sprint-with-us";

export interface RouteParams {
  opportunityId: Id;
}

export interface ValidState {
  opportunity: SWUOpportunity | null;
  viewerUser: User;
  notFound: boolean;
  loading: boolean;
  form: Immutable<Form.State>;
  addendaState: Immutable<AddendaTab.State>;
  historyState: Immutable<HistoryTab.State>;
  proposalsState: Immutable<ProposalsTab.State>;
  instructionsState: Immutable<InstructionsTab.State>;
  overviewState: Immutable<OverviewTab.State>;
  teamQuestionsState: Immutable<TeamQuestionsTab.State>;
  consensusState: Immutable<ConsensusTab.State>;
  codeChallengeState: Immutable<CodeChallengeTab.State>;
  teamScenarioState: Immutable<TeamScenarioTab.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg =
  | ADT<"onInitResponse", api.ResponseValidation<SWUOpportunity, string[]>>
  | ADT<"addenda", AddendaTab.InnerMsg>
  | ADT<"history", HistoryTab.InnerMsg>
  | ADT<"proposals", ProposalsTab.InnerMsg>
  | ADT<"instructions", InstructionsTab.InnerMsg>
  | ADT<"overview", OverviewTab.InnerMsg>
  | ADT<"teamQuestions", TeamQuestionsTab.InnerMsg>
  | ADT<"consensus", ConsensusTab.InnerMsg>
  | ADT<"codeChallenge", CodeChallengeTab.InnerMsg>
  | ADT<"teamScenario", TeamScenarioTab.InnerMsg>
  | ADT<
      "onProposalsAndEvaluationsReceived",
      [SWUProposalSlim[], SWUTeamQuestionResponseEvaluation[]]
    >;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType({
  userType: [UserType.Admin],
  success({ routeParams, shared }) {
    const [formState, _formCmds] = Form.init({
      viewerUser: shared.sessionUser,
      canRemoveExistingAttachments: false
    });

    // Initialize the basic addenda tab state structure
    const [addendaInitState, _addendaCmds] = AddendaTab.component.init({
      viewerUser: shared.sessionUser
    });

    // Initialize the history tab state structure
    const [historyInitState, _historyCmds] = HistoryTab.component.init({
      viewerUser: shared.sessionUser
    });

    // Initialize the proposals tab state structure
    const [proposalsInitState, _proposalsCmds] = ProposalsTab.component.init({
      viewerUser: shared.sessionUser
    });

    // Initialize the instructions tab state structure
    const [instructionsInitState, _instructionsCmds] =
      InstructionsTab.component.init({
        viewerUser: shared.sessionUser
      });

    // Initialize the overview tab state structure
    const [overviewInitState, _overviewCmds] = OverviewTab.component.init({
      viewerUser: shared.sessionUser
    });

    // Initialize the team questions tab state structure
    const [teamQuestionsInitState, _teamQuestionsCmds] =
      TeamQuestionsTab.component.init({
        viewerUser: shared.sessionUser
      });

    // Initialize the consensus tab state structure
    const [consensusInitState, _consensusCmds] = ConsensusTab.component.init({
      viewerUser: shared.sessionUser
    });

    // Initialize the code challenge tab state structure
    const [codeChallengeInitState, _codeChallengeCmds] =
      CodeChallengeTab.component.init({
        viewerUser: shared.sessionUser
      });

    // Initialize the team scenario tab state structure
    const [teamScenarioInitState, _teamScenarioCmds] =
      TeamScenarioTab.component.init({
        viewerUser: shared.sessionUser
      });

    return [
      valid(
        immutable({
          opportunity: null,
          viewerUser: shared.sessionUser,
          notFound: false,
          loading: true,
          form: immutable(formState),
          addendaState: immutable(addendaInitState),
          historyState: immutable(historyInitState),
          proposalsState: immutable(proposalsInitState),
          instructionsState: immutable(instructionsInitState),
          overviewState: immutable(overviewInitState),
          teamQuestionsState: immutable(teamQuestionsInitState),
          consensusState: immutable(consensusInitState),
          codeChallengeState: immutable(codeChallengeInitState),
          teamScenarioState: immutable(teamScenarioInitState)
        })
      ),
      [
        api.opportunities.swu.readOne()(routeParams.opportunityId, (response) =>
          adt("onInitResponse", response)
        )
      ] as component_.Cmd<Msg>[]
    ];
  },
  fail({ routePath, shared }) {
    return [
      invalid(null) as any,
      [
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            shared.session
              ? adt("notFound" as const, { path: routePath })
              : adt("signIn" as const, { redirectOnSuccess: routePath })
          )
        )
      ] as component_.Cmd<Msg>[]
    ];
  }
});

const update: component_.page.Update<State, InnerMsg, Route> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "onInitResponse": {
        const response = msg.value;
        switch (response.tag) {
          case "valid": {
            const opportunity = response.value;

            // Initialize the form with the opportunity data
            const [formState, _formCmds] = Form.init({
              opportunity,
              viewerUser: state.viewerUser,
              canRemoveExistingAttachments: false
            });

            // Create initialization messages for other tabs
            const addendaOnInitMsg = AddendaTab.component.onInitResponse([
              opportunity,
              [] as SWUProposalSlim[],
              [] as SWUTeamQuestionResponseEvaluation[]
            ]);

            const historyOnInitMsg = HistoryTab.component.onInitResponse([
              opportunity,
              [] as SWUProposalSlim[],
              [] as SWUTeamQuestionResponseEvaluation[]
            ]);

            const instructionsOnInitMsg =
              InstructionsTab.component.onInitResponse([
                opportunity,
                [] as SWUProposalSlim[],
                [] as SWUTeamQuestionResponseEvaluation[]
              ]);

            return [
              state.merge({
                opportunity,
                loading: false,
                form: immutable(formState)
              }),
              [
                component_.cmd.dispatch(adt("addenda", addendaOnInitMsg)),
                component_.cmd.dispatch(adt("history", historyOnInitMsg)),
                component_.cmd.dispatch(
                  adt("instructions", instructionsOnInitMsg)
                ),
                component_.cmd.dispatch(component_.page.readyMsg()),
                component_.cmd.join(
                  api.proposals.swu.readMany(opportunity.id)((response) =>
                    api.getValidValue(response, [])
                  ),
                  api.opportunities.swu.teamQuestions.evaluations.readMany(
                    opportunity.id
                  )((response) => api.getValidValue(response, [])),
                  (proposals, evaluations) => {
                    return adt("onProposalsAndEvaluationsReceived", [
                      proposals,
                      evaluations
                    ]) as Msg;
                  }
                ) as component_.Cmd<Msg>
              ]
            ];
          }
          case "invalid": {
            return [
              { ...state, notFound: true, loading: false },
              [
                component_.cmd.dispatch(
                  component_.global.replaceRouteMsg(
                    adt("notFound" as const, { path: "" })
                  )
                )
              ]
            ];
          }
          default: {
            return [state, []];
          }
        }
        // This line is never reached because all cases in the inner switch return
        // But adding it makes the linter happy
        break;
      }
      case "onProposalsAndEvaluationsReceived": {
        console.log("onProposalsAndEvaluationsReceived", msg.value);
        const [proposals, evaluations] = msg.value;
        return [
          state,
          [
            component_.cmd.dispatch(
              adt(
                "proposals",
                ProposalsTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposals as SWUProposalSlim[],
                  [] as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            component_.cmd.dispatch(
              adt(
                "overview",
                OverviewTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposals as SWUProposalSlim[],
                  evaluations as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            component_.cmd.dispatch(
              adt(
                "teamQuestions",
                TeamQuestionsTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposals as SWUProposalSlim[],
                  [] as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            component_.cmd.dispatch(
              adt(
                "consensus",
                ConsensusTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposals as SWUProposalSlim[],
                  evaluations as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            component_.cmd.dispatch(
              adt(
                "codeChallenge",
                CodeChallengeTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposals as SWUProposalSlim[],
                  [] as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            component_.cmd.dispatch(
              adt(
                "teamScenario",
                TeamScenarioTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposals as SWUProposalSlim[],
                  [] as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>
          ]
        ];
      }
      case "addenda":
        return component_.base.updateChild({
          state,
          childStatePath: ["addendaState"],
          childUpdate: AddendaTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: AddendaTab.InnerMsg) => adt("addenda", value)
        });
      case "history":
        return component_.base.updateChild({
          state,
          childStatePath: ["historyState"],
          childUpdate: HistoryTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: HistoryTab.InnerMsg) => adt("history", value)
        });
      case "proposals":
        console.log("proposals", msg.value);
        return component_.base.updateChild({
          state,
          childStatePath: ["proposalsState"],
          childUpdate: ProposalsTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: ProposalsTab.InnerMsg) => adt("proposals", value)
        });
      case "instructions":
        return component_.base.updateChild({
          state,
          childStatePath: ["instructionsState"],
          childUpdate: InstructionsTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: InstructionsTab.InnerMsg) =>
            adt("instructions", value)
        });
      case "overview":
        return component_.base.updateChild({
          state,
          childStatePath: ["overviewState"],
          childUpdate: OverviewTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: OverviewTab.InnerMsg) => adt("overview", value)
        });
      case "teamQuestions":
        return component_.base.updateChild({
          state,
          childStatePath: ["teamQuestionsState"],
          childUpdate: TeamQuestionsTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: TeamQuestionsTab.InnerMsg) =>
            adt("teamQuestions", value)
        });
      case "consensus":
        return component_.base.updateChild({
          state,
          childStatePath: ["consensusState"],
          childUpdate: ConsensusTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: ConsensusTab.InnerMsg) => adt("consensus", value)
        });
      case "codeChallenge":
        return component_.base.updateChild({
          state,
          childStatePath: ["codeChallengeState"],
          childUpdate: CodeChallengeTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: CodeChallengeTab.InnerMsg) =>
            adt("codeChallenge", value)
        });
      case "teamScenario":
        return component_.base.updateChild({
          state,
          childStatePath: ["teamScenarioState"],
          childUpdate: TeamScenarioTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: TeamScenarioTab.InnerMsg) =>
            adt("teamScenario", value)
        });
      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state }) => {
    if (state.notFound) {
      return <div>Opportunity not found.</div>;
    }

    if (
      state.loading ||
      !state.opportunity ||
      !state.form ||
      !state.viewerUser ||
      !state.addendaState ||
      !state.historyState ||
      !state.proposalsState ||
      !state.instructionsState ||
      !state.overviewState ||
      !state.teamQuestionsState ||
      !state.consensusState ||
      !state.codeChallengeState ||
      !state.teamScenarioState
    ) {
      return <div>Loading...</div>;
    }

    return (
      <div>
        <EditTabHeader
          opportunity={state.opportunity}
          viewerUser={state.viewerUser}
        />
        <Row className="mt-5">
          <Col xs="12">
            <Form.view
              disabled={true} // View mode only
              showAllTabs={true} // Display all tabs vertically
              expandAccordions={true} // Expand all accordions for better viewing
              state={state.form}
              dispatch={() => {}} // Empty dispatch as we're just viewing
            />
          </Col>
        </Row>

        <div className="mt-5 pt-5 border-top">
          <AddendaTab.component.view
            state={state.addendaState}
            dispatch={() => {}}
          />
        </div>

        <div className="mt-5 pt-5 border-top">
          <Row>
            <Col xs="12">
              <h3 className="mb-4">History</h3>
              <HistoryTab.component.view
                state={state.historyState}
                dispatch={() => {}}
              />
            </Col>
          </Row>
        </div>

        <div className="mt-5 pt-5 border-top">
          <Row>
            <Col xs="12">
              <h3 className="mb-4">Proposals</h3>
              <ProposalsTab.component.view
                state={state.proposalsState}
                dispatch={() => {}}
              />
            </Col>
          </Row>
        </div>

        <div className="mt-5 pt-5 border-top">
          <Row>
            <Col xs="12">
              <h3 className="mb-4">Instructions</h3>
              <InstructionsTab.component.view
                state={state.instructionsState}
                dispatch={() => {}}
              />
            </Col>
          </Row>
        </div>

        <div className="mt-5 pt-5 border-top">
          <Row>
            <Col xs="12">
              <h3 className="mb-4">Overview</h3>
              <OverviewTab.component.view
                state={state.overviewState}
                dispatch={() => {}}
              />
            </Col>
          </Row>
        </div>

        <div className="mt-5 pt-5 border-top">
          <Row>
            <Col xs="12">
              <h3 className="mb-4">Team Questions</h3>
              <TeamQuestionsTab.component.view
                state={state.teamQuestionsState}
                dispatch={() => {}}
              />
            </Col>
          </Row>
        </div>

        <div className="mt-5 pt-5 border-top">
          <Row>
            <Col xs="12">
              <h3 className="mb-4">Team Questions Consensus</h3>
              <ConsensusTab.component.view
                state={state.consensusState}
                dispatch={() => {}}
              />
            </Col>
          </Row>
        </div>

        <div className="mt-5 pt-5 border-top">
          <Row>
            <Col xs="12">
              <h3 className="mb-4">Code Challenge</h3>
              <CodeChallengeTab.component.view
                state={state.codeChallengeState}
                dispatch={() => {}}
              />
            </Col>
          </Row>
        </div>

        <div className="mt-5 pt-5 border-top">
          <Row>
            <Col xs="12">
              <h3 className="mb-4">Team Scenario</h3>
              <TeamScenarioTab.component.view
                state={state.teamScenarioState}
                dispatch={() => {}}
              />
            </Col>
          </Row>
        </div>
      </div>
    );
  }
);

export const component: component_.page.Component<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = {
  init,
  update,
  view,
  getMetadata: (_state) => {
    return makePageMetadata(`Complete Competition`);
  }
};
