import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import {
  TWUProposal,
  getTWUProponentName
} from "shared/lib/resources/proposal/team-with-us";
import { User } from "shared/lib/resources/user";
import { ADT, Id, adt } from "shared/lib/types";
import React from "react";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import * as ProposalForm from "front-end/lib/pages/proposal/team-with-us/lib/components/form";
import * as ProposalTab from "front-end/lib/pages/proposal/team-with-us/view/tab/proposal";
import * as ProposalHistoryTab from "front-end/lib/pages/proposal/team-with-us/view/tab/history";
import * as ResourceQuestionsTab from "front-end/lib/pages/proposal/team-with-us/view/tab/resource-questions";
import * as ChallengeTab from "front-end/lib/pages/proposal/team-with-us/view/tab/challenge";
import * as History from "front-end/lib/components/table/history";
import ProposalFormReadOnly from "front-end/lib/pages/proposal/team-with-us/lib/components/form-readonly";
import { getHistoryItems } from "front-end/lib/pages/proposal/team-with-us/view/tab/history";
import { TWUResourceQuestionResponseEvaluation } from "shared/lib/resources/evaluations/team-with-us/resource-questions";
import * as api from "front-end/lib/http/api";

export interface ProposalDetailState {
  opportunity: TWUOpportunity;
  formState: Immutable<ProposalForm.State>;
  proposalTabState: Immutable<ProposalTab.State>;
  resourceQuestionsState: Immutable<ResourceQuestionsTab.State>;
  resourceQuestionsEvalState: Immutable<ResourceQuestionsTab.State>;
  challengeState: Immutable<ChallengeTab.State>;
  historyState: Immutable<ProposalHistoryTab.State>;
  panelEvaluations: TWUResourceQuestionResponseEvaluation[];
  consensusEvaluation: TWUResourceQuestionResponseEvaluation | null;
  evaluationsLoaded: boolean;
}

export interface State {
  detailStates: Record<Id, Immutable<ProposalDetailState>>;
}

export interface Params {
  opportunity: TWUOpportunity;
  proposals: TWUProposal[];
  viewerUser: User;
  consensusEvaluations: TWUResourceQuestionResponseEvaluation[];
}

export type Msg =
  | ADT<"noop">
  | ADT<"onEvaluationsLoaded", [Id, TWUResourceQuestionResponseEvaluation[]]>;

const init: component_.base.Init<Params, State, Msg> = ({
  opportunity,
  proposals,
  viewerUser,
  consensusEvaluations
}) => {
  const detailStates: Record<Id, Immutable<ProposalDetailState>> = {};

  // Create commands to load individual panel evaluations for each proposal
  const evaluationCommands: component_.Cmd<Msg>[] = [];

  for (const proposal of proposals) {
    const [formState, _formCmds] = ProposalForm.init({
      viewerUser: viewerUser,
      opportunity: opportunity,
      proposal: proposal,
      organizations: [],
      evaluationContent: ""
    });

    const [proposalTabState, _proposalTabCmds] = ProposalTab.component.init({
      viewerUser: viewerUser,
      proposal,
      opportunity,
      evaluating: false,
      panelQuestionEvaluations: [],
      proposals: proposals
    });

    const [resourceQuestionsState, _resourceQuestionsCmds] =
      ResourceQuestionsTab.component.init({
        viewerUser: viewerUser,
        proposal,
        opportunity,
        evaluating: false,
        panelQuestionEvaluations: [],
        proposals: proposals
      });

    // Initialize ResourceQuestionsTab for evaluation view - will be updated with real data when loaded
    const [resourceQuestionsEvalState, _resourceQuestionsEvalCmds] =
      ResourceQuestionsTab.component.init({
        viewerUser: viewerUser,
        proposal,
        opportunity,
        evaluating: true,
        panelQuestionEvaluations: [], // Will be populated with real data when evaluations load
        proposals: proposals
      });

    const [challengeState, _challengeCmds] = ChallengeTab.component.init({
      viewerUser: viewerUser,
      proposal,
      opportunity,
      evaluating: false,
      panelQuestionEvaluations: [],
      proposals: proposals
    });

    const completeProposalTabState: ProposalTab.State = {
      ...proposalTabState,
      form: immutable(formState)
    };

    const [historyState, _historyCmds] = ProposalHistoryTab.component.init({
      viewerUser: viewerUser,
      proposal,
      opportunity,
      evaluating: false,
      panelQuestionEvaluations: [],
      proposals: proposals
    });

    // Initialize the history state properly
    const [historyTableState, _historyTableCmds] = History.init({
      idNamespace: `twu-proposal-history-${proposal.id}`,
      items: getHistoryItems(proposal, viewerUser.type),
      viewerUser: viewerUser
    });

    // Create a complete history state with the history table
    const completeHistoryState: ProposalHistoryTab.State = {
      ...historyState,
      history: immutable(historyTableState)
    };

    // Find the consensus evaluation for this proposal
    const consensusEvaluation =
      consensusEvaluations.find(
        (evaluation) => evaluation.proposal === proposal.id
      ) || null;

    detailStates[proposal.id] = immutable({
      opportunity,
      formState: immutable(formState),
      proposalTabState: immutable(completeProposalTabState),
      resourceQuestionsState: immutable(resourceQuestionsState),
      resourceQuestionsEvalState: immutable(resourceQuestionsEvalState),
      challengeState: immutable(challengeState),
      historyState: immutable(completeHistoryState),
      panelEvaluations: [],
      consensusEvaluation,
      evaluationsLoaded: false
    });

    // Add command to load individual panel evaluations for this proposal
    evaluationCommands.push(
      api.proposals.twu.resourceQuestions.evaluations.readMany(proposal.id)(
        (
          response: api.ResponseValidation<
            TWUResourceQuestionResponseEvaluation[],
            string[]
          >
        ) => {
          const evaluations = api.isValid(response) ? response.value : [];
          return adt("onEvaluationsLoaded", [proposal.id, evaluations]);
        }
      ) as component_.Cmd<Msg>
    );
  }

  return [{ detailStates }, evaluationCommands];
};

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "onEvaluationsLoaded": {
      const [proposalId, evaluations] = msg.value;
      const currentDetailState = state.detailStates[proposalId];

      if (!currentDetailState) {
        return [state, []];
      }

      // Update the detail state with the loaded evaluations
      const updatedDetailState = currentDetailState.merge({
        panelEvaluations: evaluations,
        evaluationsLoaded: true
      });

      // Re-initialize the ResourceQuestionsTab with the loaded evaluation data
      const [updatedResourceQuestionsEvalState, _] =
        ResourceQuestionsTab.component.init({
          viewerUser: updatedDetailState.formState.viewerUser,
          proposal: updatedDetailState.resourceQuestionsEvalState.proposal,
          opportunity: updatedDetailState.opportunity,
          evaluating: true,
          panelQuestionEvaluations: evaluations,
          questionEvaluation:
            updatedDetailState.consensusEvaluation || undefined,
          proposals: updatedDetailState.resourceQuestionsEvalState.proposals
        });

      const finalDetailState = updatedDetailState.set(
        "resourceQuestionsEvalState",
        immutable(updatedResourceQuestionsEvalState)
      );

      // Update the state with the new detail state
      const updatedState = state.setIn(
        ["detailStates", proposalId],
        finalDetailState
      );

      return [updatedState, []];
    }
    case "noop":
      return [state, []];
    default:
      return [state, []];
  }
};

interface ProposalDetailProps {
  proposal: TWUProposal;
  state: Immutable<ProposalDetailState>;
  viewerUser: User;
  dispatch: component_.base.Dispatch<Msg>;
}

const ProposalDetail: component_.base.View<ProposalDetailProps> = ({
  proposal,
  state,
  viewerUser,
  dispatch
}) => {
  return (
    <div key={proposal.id} className="mb-5 pb-5 border-bottom">
      <ProposalFormReadOnly
        proposal={proposal}
        opportunity={state.opportunity}
        viewerUser={viewerUser}
        form={state.formState}
      />

      <hr></hr>
      <h3 className="complete-report-section-header">
        Proposal - {getTWUProponentName(proposal)} - Resource Questions
      </h3>
      <ResourceQuestionsTab.component.view
        state={state.resourceQuestionsState}
        dispatch={() => dispatch(adt("noop"))}
      />

      <hr></hr>
      <h3 className="complete-report-section-header">
        Proposal - {getTWUProponentName(proposal)} - Resource Questions (Eval)
      </h3>
      <ResourceQuestionsTab.component.view
        state={state.resourceQuestionsEvalState}
        dispatch={() => dispatch(adt("noop"))}
      />

      <hr></hr>
      <h3 className="complete-report-section-header">
        Proposal - {getTWUProponentName(proposal)} - Interview/Challenge
      </h3>
      <ChallengeTab.component.view
        state={state.challengeState}
        dispatch={() => dispatch(adt("noop"))}
      />

      <hr></hr>
      <h3 className="complete-report-section-header">
        Proposal - {getTWUProponentName(proposal)} - History
      </h3>
      <ProposalHistoryTab.component.view
        state={state.historyState}
        dispatch={() => dispatch(adt("noop"))}
      />
    </div>
  );
};

const view: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  const proposals = Object.keys(state.detailStates).sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );
  if (proposals.length === 0) {
    return <div>No proposals available to display.</div>;
  }

  return (
    <div className="mt-5">
      {proposals
        .map((proposalId) => {
          const proposalState = state.detailStates[proposalId];
          const proposal = proposalState?.proposalTabState.proposal;
          if (!proposal) return null;
          return { proposalId, proposalState, proposal };
        })
        .filter((x) => x !== null)
        .sort((a, b) => a!.proposal.id.localeCompare(b!.proposal.id))
        .map((item, index) => {
          if (!item) return null;
          const { proposalId, proposalState, proposal } = item;
          return (
            <div key={proposalId}>
              <h3
                className={`mb-4 ${
                  index > 0 ? "complete-report-section-header" : ""
                }`}>
                Proposal - {getTWUProponentName(proposal)}
              </h3>
              <ProposalDetail
                proposal={proposal}
                state={proposalState}
                viewerUser={proposalState.formState.viewerUser}
                dispatch={dispatch}
              />
            </div>
          );
        })}
    </div>
  );
};

export const component = {
  init,
  update,
  view
};
