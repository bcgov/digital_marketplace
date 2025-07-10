import { makePageMetadata, updateValid, viewValid } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Form from "front-end/lib/pages/opportunity/team-with-us/lib/components/form";
import * as AddendaTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/addenda";
import * as HistoryTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/history";
import * as ProposalsTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/proposals";
import * as SummaryTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/summary";
import * as OpportunityTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/opportunity";
import * as EvaluationPanelTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/evaluation-panel";
import * as ResourceQuestionsTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/resource-questions";
import * as ConsensusTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/consensus";
import * as ChallengeTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/challenge";
import React from "react";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid } from "shared/lib/http";
import { Validation } from "shared/lib/validation";
import {
  TWUProposalSlim,
  TWUProposal,
  compareTWUProposalsForPublicSector
} from "shared/lib/resources/proposal/team-with-us";
import { OrganizationSlim } from "shared/lib/resources/organization";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import { TWUResourceQuestionResponseEvaluation } from "shared/lib/resources/evaluations/team-with-us/resource-questions";
import * as OpportunityView from "../view";
import EditTabHeader from "../lib/views/edit-tab-header";
import * as ProposalDetailsSection from "./proposal-details";
import OpportunityReadOnly from "../edit/tab/opportunity-readonly";
import { ViewAlerts } from "front-end/lib/app/view/page";

export interface RouteParams {
  opportunityId: Id;
}

export interface ValidState {
  opportunity: TWUOpportunity | null;
  viewerUser: User;
  notFound: boolean;
  loading: boolean;
  form: Immutable<Form.State>;
  addendaState: Immutable<AddendaTab.State>;
  historyState: Immutable<HistoryTab.State>;
  proposalsState: Immutable<ProposalsTab.State>;
  summaryState: Immutable<SummaryTab.State>;
  opportunityState: Immutable<OpportunityTab.State>;
  evaluationPanelState: Immutable<EvaluationPanelTab.State>;
  resourceQuestionsState: Immutable<ResourceQuestionsTab.State>;
  consensusState: Immutable<ConsensusTab.State>;
  challengeState: Immutable<ChallengeTab.State>;
  proposals: TWUProposal[];
  organizations: OrganizationSlim[];
  proposalAffiliations: Record<Id, AffiliationMember[]>;
  opportunityViewState: Immutable<OpportunityView.State>;
  proposalDetailsState: Immutable<ProposalDetailsSection.State>;
  consensusEvaluations: TWUResourceQuestionResponseEvaluation[];
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg =
  | ADT<"onInitResponse", api.ResponseValidation<TWUOpportunity, string[]>>
  | ADT<"addenda", AddendaTab.InnerMsg>
  | ADT<"history", HistoryTab.InnerMsg>
  | ADT<"proposals", ProposalsTab.InnerMsg>
  | ADT<"summary", SummaryTab.InnerMsg>
  | ADT<"opportunityTab", OpportunityTab.InnerMsg>
  | ADT<"opportunityView", OpportunityView.InnerMsg>
  | ADT<"evaluationPanel", EvaluationPanelTab.InnerMsg>
  | ADT<"resourceQuestions", ResourceQuestionsTab.InnerMsg>
  | ADT<"consensus", ConsensusTab.InnerMsg>
  | ADT<"challenge", ChallengeTab.InnerMsg>
  | ADT<"onProposalDetailResponse", TWUProposal>
  | ADT<"onAffiliationsResponse", [Id, AffiliationMember[]]>
  | ADT<"proposalDetails", ProposalDetailsSection.Msg>
  | ADT<
      "onProposalsAndConsensusesReceived",
      [TWUProposalSlim[], TWUResourceQuestionResponseEvaluation[]]
    >
  | ADT<"noop">;

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
    const adminUser = shared.sessionUser;

    const [formState] = Form.init({
      viewerUser: adminUser,
      canRemoveExistingAttachments: false,
      users: []
    });

    const [addendaInitState] = AddendaTab.component.init({
      viewerUser: adminUser
    });

    const [historyInitState] = HistoryTab.component.init({
      viewerUser: adminUser
    });

    const [evaluationPanelInitState] = EvaluationPanelTab.component.init({
      viewerUser: adminUser
    });

    const [proposalsInitState] = ProposalsTab.component.init({
      viewerUser: adminUser
    });

    const [resourceQuestionsInitState] = ResourceQuestionsTab.component.init({
      viewerUser: adminUser
    });

    const [consensusInitState] = ConsensusTab.component.init({
      viewerUser: adminUser
    });

    const [challengeInitState] = ChallengeTab.component.init({
      viewerUser: adminUser
    });

    const [summaryInitState] = SummaryTab.component.init({
      viewerUser: adminUser
    });

    const [opportunityViewState, initialOpportunityViewCmds] =
      OpportunityView.component.init({
        routeParams,
        shared: shared as unknown as SharedState,
        routePath: ""
      });

    const mappedOpportunityViewCmds = initialOpportunityViewCmds.map((cmd) =>
      component_.cmd.map(
        cmd as component_.Cmd<OpportunityView.InnerMsg>,
        (msg) => adt("opportunityView" as const, msg) as InnerMsg
      )
    );

    const pageCommands = [
      api.opportunities.twu.readOne()(routeParams.opportunityId, (response) =>
        adt("onInitResponse", response)
      )
    ];

    return [
      valid(
        immutable({
          opportunity: null,
          viewerUser: adminUser,
          notFound: false,
          loading: true,
          form: immutable(formState),
          addendaState: immutable(addendaInitState),
          historyState: immutable(historyInitState),
          proposalsState: immutable(proposalsInitState),
          summaryState: immutable(summaryInitState),
          opportunityState: immutable({
            viewerUser: shared.sessionUser,
            opportunity: null,
            form: null,
            showModal: null,
            startEditingLoading: 0,
            saveChangesLoading: 0,
            saveChangesAndUpdateStatusLoading: 0,
            updateStatusLoading: 0,
            deleteLoading: 0,
            isEditing: false
          }),
          evaluationPanelState: immutable(evaluationPanelInitState),
          resourceQuestionsState: immutable(resourceQuestionsInitState),
          consensusState: immutable(consensusInitState),
          challengeState: immutable(challengeInitState),
          proposals: [],
          organizations: [],
          proposalAffiliations: {},
          opportunityViewState: immutable(opportunityViewState),
          proposalDetailsState: immutable({ detailStates: {} }),
          consensusEvaluations: []
        })
      ),
      [...pageCommands, ...mappedOpportunityViewCmds] as component_.Cmd<Msg>[]
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
    const maybeInitProposalDetails = (
      currentState: Immutable<ValidState>
    ): [Immutable<ValidState>, component_.Cmd<Msg>[]] => {
      const expectedProposalCount =
        currentState.proposalsState.proposals.length;
      const allProposalsLoaded =
        currentState.proposals.length === expectedProposalCount &&
        expectedProposalCount > 0;
      const opportunityPresent = !!currentState.opportunity;

      if (
        allProposalsLoaded &&
        opportunityPresent &&
        Object.keys(currentState.proposalDetailsState.detailStates).length === 0
      ) {
        const currentOpportunity = currentState.opportunity;
        if (!currentOpportunity) return [currentState, []];

        // Sort the proposals before passing to ProposalDetailsComponent
        const sortedProposals = [...currentState.proposals].sort((a, b) =>
          compareTWUProposalsForPublicSector(a, b, "totalScore")
        );

        const [proposalDetailsState, initialProposalDetailsCmds] =
          ProposalDetailsSection.component.init({
            opportunity: currentOpportunity,
            proposals: sortedProposals,
            viewerUser: currentState.viewerUser,
            consensusEvaluations: currentState.consensusEvaluations
          });

        const proposalDetailsCmds: component_.Cmd<Msg>[] =
          initialProposalDetailsCmds.map((cmd) =>
            component_.cmd.map(
              cmd,
              (pdMsg: ProposalDetailsSection.Msg) =>
                adt("proposalDetails", pdMsg) as Msg
            )
          );

        const newState = currentState.set(
          "proposalDetailsState",
          immutable(proposalDetailsState)
        );
        return [newState, proposalDetailsCmds];
      }
      return [currentState, []];
    };

    switch (msg.tag) {
      case "onInitResponse": {
        const response = msg.value;
        if (response.tag === "invalid") {
          return [
            state.set("notFound", true).set("loading", false),
            [
              component_.cmd.dispatch(
                component_.global.replaceRouteMsg(
                  adt("notFound" as const, { path: "" })
                )
              )
            ]
          ];
        }

        const opportunity = response.value;
        if (!opportunity) {
          return [state.set("loading", false), []];
        }

        const finalOpportunityState = state.opportunityState.set(
          "opportunity",
          opportunity
        );

        // Create init messages for tabs that need the opportunity data
        const addendaOnInitMsg = AddendaTab.component.onInitResponse([
          opportunity,
          [] as TWUProposalSlim[],
          [],
          []
        ]);

        const historyOnInitMsg = HistoryTab.component.onInitResponse([
          opportunity,
          [] as TWUProposalSlim[],
          [],
          []
        ]);

        const evaluationPanelOnInitMsg =
          EvaluationPanelTab.component.onInitResponse([
            opportunity,
            [] as TWUProposalSlim[],
            [],
            []
          ]);

        const resourceQuestionsOnInitMsg =
          ResourceQuestionsTab.component.onInitResponse([
            opportunity,
            [] as TWUProposalSlim[],
            [],
            []
          ]);

        const consensusOnInitMsg = ConsensusTab.component.onInitResponse([
          opportunity,
          [] as TWUProposalSlim[],
          [],
          []
        ]);

        const challengeOnInitMsg = ChallengeTab.component.onInitResponse([
          opportunity,
          [] as TWUProposalSlim[],
          [],
          []
        ]);

        const oppTabOnInitMsg = OpportunityTab.component.onInitResponse([
          opportunity,
          [] as TWUProposalSlim[],
          [],
          []
        ]);

        // Update the state with the opportunity
        const newState = state.merge({
          opportunity,
          loading: false,
          opportunityState: finalOpportunityState
        });

        // Collect all commands
        const commands = [
          component_.cmd.dispatch(adt("addenda", addendaOnInitMsg)),
          component_.cmd.dispatch(adt("history", historyOnInitMsg)),
          component_.cmd.dispatch(adt("opportunityTab", oppTabOnInitMsg)),
          component_.cmd.dispatch(
            adt("evaluationPanel", evaluationPanelOnInitMsg)
          ),
          component_.cmd.dispatch(
            adt("resourceQuestions", resourceQuestionsOnInitMsg)
          ),
          component_.cmd.dispatch(adt("consensus", consensusOnInitMsg)),
          component_.cmd.dispatch(adt("challenge", challengeOnInitMsg)),
          component_.cmd.dispatch(component_.page.readyMsg()),
          component_.cmd.join(
            api.proposals.twu.readMany(opportunity.id)((response) =>
              api.getValidValue(response, [])
            ),
            api.opportunities.twu.resourceQuestions.consensuses.readMany(
              opportunity.id
            )((response) => api.getValidValue(response, [])),
            (proposals, consensuses) => {
              return adt("onProposalsAndConsensusesReceived", [
                proposals,
                consensuses
              ]) as Msg;
            }
          )
        ];

        return [newState, commands] as [
          Immutable<ValidState>,
          component_.Cmd<Msg>[]
        ];
      }

      case "onProposalsAndConsensusesReceived": {
        const [proposalSlims, consensuses] = msg.value;
        if (!state.opportunity) return [state, []];

        // Sort proposals using the same logic as the ProposalsTab component
        const sortedProposalSlims = [...proposalSlims].sort((a, b) =>
          compareTWUProposalsForPublicSector(a, b, "totalScore")
        );
        // Store consensus evaluations in state
        const updatedState = state.set("consensusEvaluations", consensuses);

        // Each component gets its own copy of the sorted array to prevent mutation
        const proposalsOnInitMsg = ProposalsTab.component.onInitResponse([
          updatedState.opportunity!,
          [...sortedProposalSlims], // Create a copy for ProposalsTab
          [],
          []
        ]);
        const summaryOnInitMsg = SummaryTab.component.onInitResponse([
          updatedState.opportunity!,
          [...sortedProposalSlims], // Create a copy for SummaryTab
          [],
          []
        ]);

        const resourceQuestionsOnInitMsg =
          ResourceQuestionsTab.component.onInitResponse([
            updatedState.opportunity!,
            [...sortedProposalSlims], // Create a copy for ResourceQuestionsTab
            [],
            []
          ]);

        const consensusOnInitMsg = ConsensusTab.component.onInitResponse([
          updatedState.opportunity!,
          [...sortedProposalSlims], // Create a copy for ConsensusTab
          consensuses,
          []
        ]);

        const challengeOnInitMsg = ChallengeTab.component.onInitResponse([
          updatedState.opportunity!,
          [...sortedProposalSlims], // Create a copy for ChallengeTab
          [],
          []
        ]);

        const proposalCmds = sortedProposalSlims.map((slim) =>
          api.proposals.twu.readOne(updatedState.opportunity!.id)(
            slim.id,
            (response) => {
              return api.isValid(response)
                ? adt("onProposalDetailResponse", response.value)
                : adt("noop");
            }
          )
        );

        const commands = [
          component_.cmd.dispatch(adt("proposals", proposalsOnInitMsg)),
          component_.cmd.dispatch(adt("summary", summaryOnInitMsg)),
          component_.cmd.dispatch(
            adt("resourceQuestions", resourceQuestionsOnInitMsg)
          ),
          component_.cmd.dispatch(adt("consensus", consensusOnInitMsg)),
          component_.cmd.dispatch(adt("challenge", challengeOnInitMsg)),
          ...proposalCmds
        ];

        return [updatedState, commands] as [
          Immutable<ValidState>,
          component_.Cmd<Msg>[]
        ];
      }

      case "onProposalDetailResponse": {
        const proposal = msg.value;
        const updatedState = state.update("proposals", (ps) => [
          ...ps,
          proposal
        ]);

        const orgCommands: component_.Cmd<Msg>[] = [];
        const [finalState, initCmds] = maybeInitProposalDetails(updatedState);

        return [finalState, [...orgCommands, ...initCmds]] as [
          Immutable<ValidState>,
          component_.Cmd<Msg>[]
        ];
      }

      case "addenda":
        return component_.base.updateChild({
          state,
          childStatePath: ["addendaState"],
          childUpdate: AddendaTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("addenda", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;

      case "history":
        return component_.base.updateChild({
          state,
          childStatePath: ["historyState"],
          childUpdate: HistoryTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("history", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;

      case "evaluationPanel":
        return component_.base.updateChild({
          state,
          childStatePath: ["evaluationPanelState"],
          childUpdate: EvaluationPanelTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("evaluationPanel", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;

      case "resourceQuestions":
        return component_.base.updateChild({
          state,
          childStatePath: ["resourceQuestionsState"],
          childUpdate: ResourceQuestionsTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("resourceQuestions", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;

      case "consensus":
        return component_.base.updateChild({
          state,
          childStatePath: ["consensusState"],
          childUpdate: ConsensusTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("consensus", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;

      case "challenge":
        return component_.base.updateChild({
          state,
          childStatePath: ["challengeState"],
          childUpdate: ChallengeTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("challenge", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;

      case "proposals":
        return component_.base.updateChild({
          state,
          childStatePath: ["proposalsState"],
          childUpdate: ProposalsTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("proposals", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;

      case "summary":
        return component_.base.updateChild({
          state,
          childStatePath: ["summaryState"],
          childUpdate: SummaryTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("summary", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;

      case "opportunityTab":
        return component_.base.updateChild({
          state,
          childStatePath: ["opportunityState"],
          childUpdate: OpportunityTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("opportunityTab", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;

      case "proposalDetails":
        return component_.base.updateChild({
          state,
          childStatePath: ["proposalDetailsState"],
          childUpdate: ProposalDetailsSection.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: ProposalDetailsSection.Msg) =>
            adt("proposalDetails", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;

      case "opportunityView": {
        const opportunityViewMsg = msg.value;
        if (opportunityViewMsg.tag === "onInitResponse") {
          const responsePayload = opportunityViewMsg.value;

          const [
            routePath,
            opportunityResponse,
            proposalResponse,
            contentResponse
          ] = responsePayload;

          if (opportunityResponse.tag !== "valid") {
            console.error(
              "OpportunityView initialization failed: Invalid opportunity response",
              opportunityResponse.value
            );
            return [state, []];
          }

          const newInnerState: OpportunityView.State = {
            routePath,
            opportunity: opportunityResponse.value,
            existingProposal: proposalResponse,
            competitionRulesContent:
              contentResponse.tag === "valid" ? contentResponse.value.body : "",
            viewerUser: state.viewerUser,
            activeInfoTab: "details",
            toggleWatchLoading: 0,
            qualification: "notQualified",
            table: state.opportunityViewState.table
          };

          const updatedState = state.set(
            "opportunityViewState",
            immutable(newInnerState)
          );
          return [updatedState, []];
        }
        return [state, []];
      }

      case "noop":
        return [state, []];

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
      !state.opportunityViewState ||
      !state.addendaState ||
      !state.historyState ||
      !state.proposalsState ||
      !state.summaryState ||
      !state.opportunityState ||
      !state.proposalDetailsState ||
      !state.evaluationPanelState ||
      !state.resourceQuestionsState ||
      !state.consensusState ||
      !state.challengeState
    ) {
      return <div>Loading...</div>;
    }

    // Extract components into PascalCase aliases for JSX usage
    const OpportunityViewComponent = OpportunityView.component.view;
    const SummaryTabComponent = SummaryTab.component.view;
    const EvaluationPanelTabComponent = EvaluationPanelTab.component.view;
    const AddendaTabComponent = AddendaTab.component.view;
    const HistoryTabComponent = HistoryTab.component.view;
    const ProposalsTabComponent = ProposalsTab.component.view;
    const ResourceQuestionsTabComponent = ResourceQuestionsTab.component.view;
    const ConsensusTabComponent = ConsensusTab.component.view;
    const ChallengeTabComponent = ChallengeTab.component.view;
    const ProposalDetailsComponent = ProposalDetailsSection.component.view;

    const createOpportunityViewState = (
      activeTab: OpportunityView.State["activeInfoTab"]
    ): Immutable<OpportunityView.State> | null => {
      return state.opportunityViewState.set("activeInfoTab", activeTab);
    };

    const opportunityViewStates = {
      details: createOpportunityViewState("details"),
      attachments: createOpportunityViewState("attachments"),
      addenda: createOpportunityViewState("addenda"),
      competitionRules: createOpportunityViewState("competitionRules")
    };

    let sectionCounter = 1;

    // Use the existing getAlerts function from OpportunityView
    const opportunityViewAlerts = OpportunityView.component.getAlerts
      ? OpportunityView.component.getAlerts(state.opportunityViewState)
      : component_.page.alerts.empty();

    // Cast the alerts for display only (we don't need the dispatch functionality)
    const alerts = opportunityViewAlerts as component_.page.Alerts<Msg>;

    return (
      <div className="opportunity-complete-page">
        {opportunityViewStates.details ? (
          <>
            <h2>{sectionCounter++}. Public View - Opportunity Details</h2>
            <ViewAlerts alerts={alerts} dispatch={dispatch} />
            <OpportunityViewComponent
              state={opportunityViewStates.details}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Opportunity Details View...</div>
        )}

        {opportunityViewStates.competitionRules ? (
          <>
            <h2 className="complete-report-section-header">
              {sectionCounter++}. Public View - Competition Rules
            </h2>
            <OpportunityViewComponent
              state={opportunityViewStates.competitionRules}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Competition Rules View...</div>
        )}

        {opportunityViewStates.attachments ? (
          <>
            <h2 className="complete-report-section-header">
              {sectionCounter++}. Public View - Opportunity Attachments
            </h2>
            <OpportunityViewComponent
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
            <h2 className="complete-report-section-header">
              {sectionCounter++}. Public View - Opportunity Addenda
            </h2>
            <OpportunityViewComponent
              state={opportunityViewStates.addenda}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Opportunity Addenda View...</div>
        )}

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Opportunity Summary
        </h2>
        <div className="opportunity-complete-page-header">
          <EditTabHeader
            opportunity={state.opportunity}
            viewerUser={state.viewerUser}
          />
        </div>
        <SummaryTabComponent state={state.summaryState} dispatch={() => {}} />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Opportunity Details
        </h2>
        <OpportunityReadOnly
          opportunity={state.opportunity}
          viewerUser={state.viewerUser}
          form={state.opportunityState.form}
        />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Evaluation Panel
        </h2>
        <EvaluationPanelTabComponent
          state={state.evaluationPanelState}
          dispatch={() => {}}
        />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Opportunity Addenda
        </h2>
        <AddendaTabComponent state={state.addendaState} dispatch={() => {}} />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Opportunity History
        </h2>
        <HistoryTabComponent state={state.historyState} dispatch={() => {}} />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Proposals
        </h2>
        <ProposalsTabComponent
          state={state.proposalsState}
          dispatch={() => {}}
        />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Resource Questions
        </h2>
        <ResourceQuestionsTabComponent
          state={state.resourceQuestionsState}
          dispatch={() => {}}
        />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Consensus
        </h2>
        <ConsensusTabComponent
          state={state.consensusState}
          dispatch={() => {}}
        />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Interview & Challenge
        </h2>
        <ChallengeTabComponent
          state={state.challengeState}
          dispatch={() => {}}
        />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Proposal Details
        </h2>
        <ProposalDetailsComponent
          state={state.proposalDetailsState}
          dispatch={(msg: ProposalDetailsSection.Msg) =>
            dispatch(adt("proposalDetails", msg) as Msg)
          }
        />
        <hr />
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
