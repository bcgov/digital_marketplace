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
import * as SummaryTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/summary";
import * as OpportunityTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/opportunity";
import React from "react";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import { invalid, valid, isValid } from "shared/lib/http";
import { Validation } from "shared/lib/validation";
import {
  SWUProposalSlim,
  SWUProposal
} from "shared/lib/resources/proposal/sprint-with-us";
import { OrganizationSlim } from "shared/lib/resources/organization";
import { SWU_PROPOSAL_EVALUATION_CONTENT_ID } from "front-end/config";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import * as OpportunityView from "../view";
import * as ProposalDetailsSection from "./proposal-details";
import EditTabHeader from "../lib/views/edit-tab-header";
import * as ProposalTeamQuestionsTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab/team-questions";
// @ts-ignore - OpportunityViewTabInfo may not be exported if not used elsewhere yet
import { OpportunityViewTabInfo } from "../view"; // Import the type for tabs

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
  summaryState: Immutable<SummaryTab.State>;
  opportunityState: Immutable<OpportunityTab.State>;
  proposals: SWUProposal[];
  organizations: OrganizationSlim[];
  evaluationContent: string;
  proposalAffiliations: Record<Id, AffiliationMember[]>;
  proposalDetailsState: Immutable<ProposalDetailsSection.State>;
  individualEvaluationStates: Record<
    string,
    Immutable<ProposalTeamQuestionsTab.State>
  >;
  opportunityViewState: Immutable<OpportunityView.State>;
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
  | ADT<"summary", SummaryTab.InnerMsg>
  | ADT<"proposalDetails", ProposalDetailsSection.Msg>
  | ADT<"opportunityView", OpportunityView.InnerMsg>
  | ADT<
      "onProposalsAndEvaluationsReceived",
      [SWUProposalSlim[], SWUTeamQuestionResponseEvaluation[]]
    >
  | ADT<"onProposalDetailResponse", SWUProposal>
  | ADT<"onEvaluationContentResponse", string>
  | ADT<"onAffiliationsResponse", [Id, AffiliationMember[]]>;

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
      viewerUser: shared.sessionUser,
      proposalSortOrder: "completePage"
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
        viewerUser: shared.sessionUser,
        proposalSortOrder: "completePage"
      });

    // Initialize the consensus tab state structure
    const [consensusInitState, _consensusCmds] = ConsensusTab.component.init({
      viewerUser: shared.sessionUser
    });

    // Initialize the code challenge tab state structure
    const [codeChallengeInitState, _codeChallengeCmds] =
      CodeChallengeTab.component.init({
        viewerUser: shared.sessionUser,
        proposalSortOrder: "completePage"
      });

    // Initialize the team scenario tab state structure
    const [teamScenarioInitState, _teamScenarioCmds] =
      TeamScenarioTab.component.init({
        viewerUser: shared.sessionUser,
        proposalSortOrder: "completePage"
      });

    // Initialize the summary tab state structure
    const [summaryInitState, _summaryCmds] = SummaryTab.component.init({
      viewerUser: shared.sessionUser
    });

    // Initialize the opportunity tab state structure
    const [opportunityInitState, _opportunityCmds] =
      OpportunityTab.component.init({
        viewerUser: shared.sessionUser,
        showAllTabs: true,
        expandAccordions: true
      });

    // Initialize the OpportunityView component state
    const [opportunityViewState, _opportunityViewCmds] =
      OpportunityView.component.init({
        routeParams,
        shared: shared as unknown as SharedState,
        routePath: "" // Provide an empty routePath initially, will be updated later if needed
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
          teamScenarioState: immutable(teamScenarioInitState),
          summaryState: immutable(summaryInitState),
          opportunityState: immutable(opportunityInitState),
          proposals: [],
          organizations: [],
          evaluationContent: "",
          proposalAffiliations: {},
          proposalDetailsState: immutable({ detailStates: {} }),
          individualEvaluationStates: {},
          opportunityViewState: opportunityViewState
        })
      ),
      [
        api.opportunities.swu.readOne()(routeParams.opportunityId, (response) =>
          adt("onInitResponse", response)
        ),
        // Map OpportunityView commands
        ..._opportunityViewCmds.map((cmd) =>
          component_.cmd.map(cmd, (msg) => adt("opportunityView", msg))
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

            // Initialize the opportunity tab state with the opportunity
            const [opportunityState, _oppCmds] = OpportunityTab.component.init({
              viewerUser: state.viewerUser
            });
            const updatedOpportunityState = {
              ...opportunityState,
              opportunity
            };
            const [oppFormState, _oppFormCmds] = Form.init({
              opportunity,
              viewerUser: state.viewerUser,
              canRemoveExistingAttachments: false
            });
            updatedOpportunityState.form = immutable(oppFormState);

            const newState = state.merge({
              opportunity,
              loading: false,
              form: immutable(formState),
              opportunityState: immutable(updatedOpportunityState)
            });

            return [
              newState,
              [
                // Commands for other tabs
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
                    opportunity.id,
                    false
                  )((response) => api.getValidValue(response, [])),
                  (proposals, evaluations) => {
                    return adt("onProposalsAndEvaluationsReceived", [
                      proposals,
                      evaluations
                    ]) as Msg;
                  }
                ) as component_.Cmd<Msg>,
                api.content.readOne()(
                  SWU_PROPOSAL_EVALUATION_CONTENT_ID,
                  (response) =>
                    adt(
                      "onEvaluationContentResponse",
                      api.isValid(response) ? response.value.body : ""
                    )
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
        break;
      }
      case "onProposalsAndEvaluationsReceived": {
        const [proposalSlims, evaluations] = msg.value;
        // Create a cmd to fetch the full details of each proposal
        const proposalCmds = proposalSlims.map((slim) => {
          return api.proposals.swu.readOne(state.opportunity?.id as Id)(
            slim.id,
            (response) => {
              if (api.isValid(response)) {
                return adt("onProposalDetailResponse", response.value);
              }
              return adt("noop") as any;
            }
          ) as component_.Cmd<Msg>;
        });

        return [
          state,
          [
            component_.cmd.dispatch(
              adt(
                "proposals",
                ProposalsTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposalSlims as SWUProposalSlim[],
                  [] as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            component_.cmd.dispatch(
              adt(
                "overview",
                OverviewTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposalSlims as SWUProposalSlim[],
                  evaluations as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            component_.cmd.dispatch(
              adt(
                "teamQuestions",
                TeamQuestionsTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposalSlims as SWUProposalSlim[],
                  [] as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            component_.cmd.dispatch(
              adt(
                "consensus",
                ConsensusTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposalSlims as SWUProposalSlim[],
                  evaluations as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            component_.cmd.dispatch(
              adt(
                "codeChallenge",
                CodeChallengeTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposalSlims as SWUProposalSlim[],
                  [] as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            component_.cmd.dispatch(
              adt(
                "teamScenario",
                TeamScenarioTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposalSlims as SWUProposalSlim[],
                  [] as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            component_.cmd.dispatch(
              adt(
                "summary",
                SummaryTab.component.onInitResponse([
                  state.opportunity as SWUOpportunity,
                  proposalSlims as SWUProposalSlim[],
                  [] as SWUTeamQuestionResponseEvaluation[]
                ])
              )
            ) as component_.Cmd<Msg>,
            ...proposalCmds
          ]
        ];
      }
      case "onProposalDetailResponse": {
        const proposal = msg.value;
        let updatedState = state.update("proposals", (proposals) => [
          ...proposals,
          proposal
        ]);

        // Create a cmd to fetch affiliations for each proposal's organization
        const cmds: component_.Cmd<Msg>[] = [];
        if (proposal.organization) {
          cmds.push(
            api.affiliations.readManyForOrganization(proposal.organization.id)(
              (response) => {
                if (api.isValid(response)) {
                  return adt("onAffiliationsResponse", [
                    proposal.organization!.id,
                    response.value
                  ]);
                }
                return adt("noop") as any;
              }
            ) as component_.Cmd<Msg>
          );
        }

        // Check if all proposals have been loaded and evaluations are present
        const expectedProposalCount = state.proposalsState.proposals.length;
        const loadedProposalCount = updatedState.proposals.length;
        const allProposalsLoaded =
          loadedProposalCount === expectedProposalCount;
        const evaluationsPresent = state.overviewState.evaluations.length > 0;
        const opportunityPresent = !!updatedState.opportunity;

        let proposalDetailsCmds: component_.Cmd<Msg>[] = [];
        if (allProposalsLoaded && opportunityPresent) {
          // Initialize the proposal details component
          const currentOpportunity = updatedState.opportunity;
          if (!currentOpportunity) return [updatedState, cmds];

          const [proposalDetailsState, initialProposalDetailsCmds] =
            ProposalDetailsSection.component.init({
              opportunity: currentOpportunity,
              proposals: updatedState.proposals,
              viewerUser: updatedState.viewerUser,
              organizations: updatedState.organizations,
              evaluationContent: updatedState.evaluationContent,
              proposalAffiliations: updatedState.proposalAffiliations
            });

          // Map the commands from the proposal details component
          proposalDetailsCmds = initialProposalDetailsCmds.map((cmd) =>
            component_.cmd.map(
              cmd,
              (msg: ProposalDetailsSection.Msg) =>
                adt("proposalDetails", msg) as InnerMsg
            )
          );
          updatedState = updatedState.set(
            "proposalDetailsState",
            immutable(proposalDetailsState)
          );

          // Compute individual evaluation states if evaluations are present
          if (evaluationsPresent) {
            // Ensure the type matches the updated ValidState
            const individualEvaluationStates: Record<
              string,
              Immutable<ProposalTeamQuestionsTab.State>
            > = {};
            updatedState.overviewState.evaluations.forEach((evaluation) => {
              if (!evaluation || !evaluation.proposal) return;
              const relatedProposal = updatedState.proposals.find(
                (p) => p.id === evaluation.proposal.id
              );
              if (!relatedProposal) return;

              // Use composite key here
              const key = `${evaluation.evaluationPanelMember.user.id}-${evaluation.proposal.id}`;
              individualEvaluationStates[key] = immutable({
                opportunity: currentOpportunity,
                proposal: relatedProposal,
                viewerUser: updatedState.viewerUser,
                evaluating: true,
                questionEvaluation: evaluation,
                panelQuestionEvaluations: [],
                evaluationScores: evaluation.scores.map(
                  (score, _i) =>
                    ({
                      score: immutable({
                        child: {
                          value: score.score,
                          id: `evaluation-${key}-score-${score.order}`
                        },
                        errors: []
                      }),
                      notes: immutable({
                        child: {
                          value: score.notes,
                          id: `evaluation-${key}-notes-${score.order}`
                        },
                        errors: []
                      })
                    } as any)
                ),
                openAccordions: new Set(
                  Array.from({ length: evaluation.scores.length }, (_, i) => i)
                ),
                isEditing: false,
                startEditingLoading: 0,
                saveLoading: 0,
                screenToFromLoading: 0,
                showModal: null
              });
            });
            updatedState = updatedState.set(
              "individualEvaluationStates",
              individualEvaluationStates
            );
          }
        }

        return [updatedState, [...cmds, ...proposalDetailsCmds]];
      }
      case "onAffiliationsResponse": {
        const [organizationId, affiliations] = msg.value;
        let updatedState = state.update("proposalAffiliations", (current) => ({
          ...current,
          [organizationId]: affiliations
        }));

        // Re-check if all data is now available to compute individual evaluation states
        const proposalsWithOrgs = updatedState.proposals.filter(
          (p) => p.organization
        );
        const haveAllAffiliations = proposalsWithOrgs.every(
          (p) =>
            p.organization &&
            updatedState.proposalAffiliations[p.organization.id] !== undefined
        );
        const allProposalsLoaded =
          updatedState.proposals.length ===
          state.proposalsState.proposals.length;
        const opportunityPresent = !!updatedState.opportunity;

        let proposalDetailsCmds: component_.Cmd<Msg>[] = [];
        if (haveAllAffiliations && allProposalsLoaded && opportunityPresent) {
          // Initialize or re-initialize proposal details if needed
          const currentOpportunity = updatedState.opportunity;
          if (!currentOpportunity) return [updatedState, proposalDetailsCmds];

          const [proposalDetailsState, initialProposalDetailsCmds] =
            ProposalDetailsSection.component.init({
              opportunity: currentOpportunity,
              proposals: updatedState.proposals,
              viewerUser: updatedState.viewerUser,
              organizations: updatedState.organizations,
              evaluationContent: updatedState.evaluationContent,
              proposalAffiliations: updatedState.proposalAffiliations
            });
          proposalDetailsCmds = initialProposalDetailsCmds.map((cmd) =>
            component_.cmd.map(
              cmd,
              (msg: ProposalDetailsSection.Msg) =>
                adt("proposalDetails", msg) as InnerMsg
            )
          );
          updatedState = updatedState.set(
            "proposalDetailsState",
            immutable(proposalDetailsState)
          );
        }

        return [updatedState, proposalDetailsCmds];
      }
      case "onEvaluationContentResponse": {
        return [state.set("evaluationContent", msg.value), []];
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
      case "summary":
        return component_.base.updateChild({
          state,
          childStatePath: ["summaryState"],
          childUpdate: SummaryTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: SummaryTab.InnerMsg) => adt("summary", value)
        });
      case "proposalDetails":
        return component_.base.updateChild({
          state,
          childStatePath: ["proposalDetailsState"],
          childUpdate: ProposalDetailsSection.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: ProposalDetailsSection.Msg) =>
            adt("proposalDetails", value)
        });
      case "opportunityView": {
        // This doesn't work because the we are trying to render a page component inside a page component
        // It uses State = Validation<Immutable.., and it fails when running updateValid state.set function
        //  const updateChildResult= component_.base.updateChild({
        //    state,
        //    childStatePath: ["opportunityViewState"],
        //    childUpdate: OpportunityView.component.update,
        //    childMsg: msg.value,
        //    mapChildMsg: (value: OpportunityView.InnerMsg) => adt("opportunityView", value)
        //  });
        //  console.log('updateChildResult', updateChildResult);
        //  return updateChildResult as any;

        const opportunityViewMsg = msg.value;
        console.log("opportunityView msg.value", opportunityViewMsg);

        // We only need to handle the initial loading via onInitResponse.

        // Update the base opportunityViewState when its init completes
        // Check the tag on the InnerMsg first
        if (opportunityViewMsg.tag === "onInitResponse") {
          // msg.value is the array payload for onInitResponse
          const responsePayload = opportunityViewMsg.value;
          const cmds: component_.Cmd<Msg>[] = [];

          const [
            routePath,
            opportunityResponse,
            proposalResponse,
            contentResponse,
            isQualified
          ] = responsePayload; // Destructure the array payload

          // Ensure opportunityResponse (the second element) is valid
          if (opportunityResponse.tag !== "valid") {
            // Handle invalid opportunity response if necessary
            console.error(
              "OpportunityView initialization failed: Invalid opportunity response",
              opportunityResponse.value
            );
            return [state, []]; // Or dispatch an error message
          }

          // Construct the inner state for OpportunityView
          const newInnerState = immutable({
            routePath,
            opportunity: opportunityResponse.value, // Use the valid opportunity
            existingProposal: proposalResponse,
            scopeContent:
              contentResponse.tag === "valid" ? contentResponse.value.body : "", // Handle content response validity
            isQualified: isQualified,
            viewerUser: state.viewerUser,
            activeInfoTab: "details" // Default active tab remains "details" for the base state
          });

          // Wrap the inner state in a valid Validation object
          const newOpportunityViewState = valid(
            newInnerState
          ) as Immutable<OpportunityView.State>;
          const updatedState = state.set(
            "opportunityViewState",
            newOpportunityViewState
          );
          return [updatedState, cmds];
        }

        // If the message is not onInitResponse, just return the current state and no commands
        return [state, []];
      }
      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state, dispatch }) => {
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
      !state.teamScenarioState ||
      !state.summaryState ||
      !state.opportunityState ||
      !state.proposalDetailsState ||
      !state.opportunityViewState
    ) {
      return <div>Loading...</div>;
    }

    // Function to create a view state with a specific active tab
    const createOpportunityViewState = (
      activeTab: OpportunityViewTabInfo
    ): Immutable<OpportunityView.State> | null => {
      if (isValid(state.opportunityViewState)) {
        const baseInnerState = state.opportunityViewState.value;
        const modifiedInnerState = baseInnerState.set(
          "activeInfoTab",
          activeTab
        );
        return valid(modifiedInnerState) as Immutable<OpportunityView.State>;
      }
      return null;
    };

    const opportunityViewStates = {
      details: createOpportunityViewState("details"),
      scope: createOpportunityViewState("scope"),
      attachments: createOpportunityViewState("attachments"),
      addenda: createOpportunityViewState("addenda")
    };

    return (
      <div className="opportunity-complete-page">
        {/* Render the OpportunityView component multiple times */}
        {opportunityViewStates.details ? (
          <>
            <h2>1. Public View - Opportunity Details</h2>
            <OpportunityView.component.view
              state={opportunityViewStates.details}
              dispatch={() => {}} // Dispatch is no-op for these read-only views
            />
            <hr />
          </>
        ) : (
          <div>Loading Opportunity Details View...</div>
        )}

        {opportunityViewStates.scope ? (
          <>
            <h2
              className="complete-report-section-header"
              style={{ marginBottom: "-37px" }}>
              2. Public View - Opportunity Scope
            </h2>
            <OpportunityView.component.view
              state={opportunityViewStates.scope}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Opportunity Scope View...</div>
        )}

        {opportunityViewStates.attachments ? (
          <>
            <h2
              className="complete-report-section-header"
              style={{ marginBottom: "-37px" }}>
              3. Public View - Opportunity Attachments
            </h2>
            <OpportunityView.component.view
              state={opportunityViewStates.attachments}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Opportunity Attachments View...</div>
        )}

        {opportunityViewStates.addenda ? (
          <>
            <h2
              className="complete-report-section-header"
              style={{ marginBottom: "-37px" }}>
              4. Public View - Opportunity Addenda
            </h2>
            <OpportunityView.component.view
              state={opportunityViewStates.addenda}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Opportunity Addenda View...</div>
        )}

        <h2 className="complete-report-section-header">
          5. Admin View - Opportunity Summary
        </h2>

        <div className="opportunity-complete-page-header">
          <EditTabHeader
            opportunity={state.opportunity}
            viewerUser={state.viewerUser}
          />
        </div>

        <SummaryTab.component.view
          state={state.summaryState}
          dispatch={() => {}}
        />

        <hr></hr>

        <h2 className="complete-report-section-header">
          6. Admin View - Opportunity Details
        </h2>
        <OpportunityTab.component.view
          state={state.opportunityState}
          dispatch={() => {}}
          showAllTabs={true}
          expandAccordions={true}
          {...({} as any)}
        />

        <hr></hr>

        <h2 className="complete-report-section-header">
          7. Admin View - Opportunity Addenda
        </h2>
        <AddendaTab.component.view
          state={state.addendaState}
          dispatch={() => {}}
        />

        <hr></hr>

        <h2 className="complete-report-section-header">
          8. Admin View - Opportunity History
        </h2>
        <HistoryTab.component.view
          state={state.historyState}
          dispatch={() => {}}
        />

        <hr></hr>

        <h2 className="complete-report-section-header">
          9. Admin View - Proposals
        </h2>
        <ProposalsTab.component.view
          state={state.proposalsState}
          dispatch={() => {}}
        />

        <hr></hr>

        <h2 className="complete-report-section-header">
          10. Admin View - Instructions
        </h2>
        <InstructionsTab.component.view
          state={state.instructionsState}
          dispatch={() => {}}
        />

        <hr></hr>

        <h2 className="complete-report-section-header">
          11. Admin View - Team Questions Overview
        </h2>
        <OverviewTab.component.view
          state={state.overviewState}
          dispatch={() => {}}
        />

        <hr></hr>

        {/* Render individual evaluations for team questions */}
        {Object.keys(state.individualEvaluationStates).length > 0 && (
          <>
            <h2
              className="complete-report-section-header"
              style={{ marginBottom: "20px" }}>
              12. Admin View - Team Question Evaluations
            </h2>
            {state.overviewState.evaluations.map((evaluation, i) => {
              // Use composite key here for retrieval
              const key = `${evaluation.evaluationPanelMember.user.id}-${evaluation.proposal.id}`;
              const evalState = state.individualEvaluationStates[key];
              if (!evalState) return null;

              return (
                <div
                  key={`team-question-evaluation-${key}-${i}`}
                  className="mb-5">
                  <h3 style={{ marginBottom: "-40px" }}>
                    Evaluator: {evaluation.evaluationPanelMember.user.name}
                  </h3>
                  {ProposalTeamQuestionsTab.component.view({
                    state: evalState,
                    dispatch: () => {}
                  })}
                </div>
              );
            })}
            <hr></hr>
          </>
        )}

        <h2 className="complete-report-section-header">
          13. Admin View - Team Questions
        </h2>
        <TeamQuestionsTab.component.view
          state={state.teamQuestionsState}
          dispatch={() => {}}
        />

        <hr></hr>

        <h2 className="complete-report-section-header">
          14. Admin View - Consensus
        </h2>
        <ConsensusTab.component.view
          state={state.consensusState}
          dispatch={() => {}}
        />

        <hr></hr>

        <h2 className="complete-report-section-header">
          15. Admin View - Code Challenge
        </h2>
        <CodeChallengeTab.component.view
          state={state.codeChallengeState}
          dispatch={() => {}}
        />

        <hr></hr>

        <h2 className="complete-report-section-header">
          16. Admin View - Team Scenario
        </h2>
        <TeamScenarioTab.component.view
          state={state.teamScenarioState}
          dispatch={() => {}}
        />

        <hr></hr>

        <h2 className="complete-report-section-header">
          17. Admin View - Proposal Details
        </h2>
        <ProposalDetailsSection.component.view
          state={state.proposalDetailsState}
          dispatch={(msg) => dispatch(adt("proposalDetails", msg) as Msg)}
        />
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
