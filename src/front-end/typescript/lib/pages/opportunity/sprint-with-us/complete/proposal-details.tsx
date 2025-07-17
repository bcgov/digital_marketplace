import React from "react";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import * as ProposalForm from "front-end/lib/pages/proposal/sprint-with-us/lib/components/form";
import * as Team from "front-end/lib/pages/proposal/sprint-with-us/lib/components/team";
import * as ProposalTeamQuestionsTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab/team-questions";
import * as ProposalCodeChallengeTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab/code-challenge";
import * as ProposalTeamScenarioTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab/team-scenario";
import * as ProposalTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab/proposal";
import * as ProposalHistoryTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab/history";
import ProposalFormReadOnly from "front-end/lib/pages/proposal/sprint-with-us/lib/components/form-readonly";
import { OrganizationSlim } from "shared/lib/resources/organization";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import { SWUProposal } from "shared/lib/resources/proposal/sprint-with-us";
import { User } from "shared/lib/resources/user";
import { ADT, Id, adt } from "shared/lib/types";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import * as Tab from "front-end/lib/pages/proposal/sprint-with-us/view/tab";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import * as api from "front-end/lib/http/api";

export interface ProposalDetailState {
  opportunity: SWUOpportunity;
  formState: ProposalForm.State;
  teamQuestionsState: ProposalTeamQuestionsTab.State;
  teamQuestionsEvalState: ProposalTeamQuestionsTab.State;
  codeChallengeState: ProposalCodeChallengeTab.State;
  teamScenarioState: ProposalTeamScenarioTab.State;
  proposalTabState: ProposalTab.State;
  historyState: ProposalHistoryTab.State;
  panelEvaluations: SWUTeamQuestionResponseEvaluation[];
  consensusEvaluation: SWUTeamQuestionResponseEvaluation | null;
  evaluationsLoaded: boolean;
}

export interface State {
  detailStates: Record<Id, Immutable<ProposalDetailState>>;
}

export interface Params {
  opportunity: SWUOpportunity;
  proposals: SWUProposal[];
  viewerUser: User;
  organizations: OrganizationSlim[];
  evaluationContent: string;
  proposalAffiliations: Record<Id, AffiliationMember[]>;
  consensusEvaluations: SWUTeamQuestionResponseEvaluation[];
}

export type Msg =
  | ADT<"noop">
  | ADT<"onEvaluationsLoaded", [Id, SWUTeamQuestionResponseEvaluation[]]>;

const init: component_.base.Init<Params, State, Msg> = ({
  opportunity,
  proposals,
  viewerUser,
  organizations,
  evaluationContent,
  proposalAffiliations,
  consensusEvaluations
}) => {
  const detailStates: Record<Id, Immutable<ProposalDetailState>> = {};

  // Create commands to load individual panel evaluations for each proposal
  const evaluationCommands: component_.Cmd<Msg>[] = [];

  // Initialize component state for each proposal
  for (const proposal of proposals) {
    // Get the affiliations for this proposal's organization
    let affiliations: AffiliationMember[] = [];
    if (
      proposal.organization &&
      proposalAffiliations[proposal.organization.id]
    ) {
      affiliations = proposalAffiliations[proposal.organization.id];
    }

    // Initialize form state for this proposal
    const [formState, _formCmds] = ProposalForm.init({
      viewerUser: viewerUser,
      opportunity: opportunity,
      proposal,
      organizations: organizations,
      evaluationContent: evaluationContent
    });

    // Update the team state with affiliations after form init
    let updatedFormState = formState;
    if (proposal.organization) {
      const newTeam = Team.setAffiliations(
        formState.team,
        affiliations,
        proposal.organization.id
      );
      updatedFormState = {
        ...formState,
        team: newTeam
      };
    }

    // Find the consensus evaluation for this proposal
    const consensusEvaluation =
      consensusEvaluations.find(
        (evaluation) => evaluation.proposal === proposal.id
      ) || null;

    // Initialize tab components
    const [teamQuestionsState, _teamQuestionsCmds] =
      ProposalTeamQuestionsTab.component.init({
        proposal,
        opportunity: opportunity,
        viewerUser: viewerUser,
        evaluating: false,
        questionEvaluation: undefined,
        panelQuestionEvaluations: [],
        proposals: proposals
      });

    // Initialize team questions evaluation state (initially with empty evaluations)
    const [teamQuestionsEvalState, _teamQuestionsEvalCmds] =
      ProposalTeamQuestionsTab.component.init({
        proposal,
        opportunity: opportunity,
        viewerUser: viewerUser,
        evaluating: true,
        questionEvaluation: consensusEvaluation || undefined,
        panelQuestionEvaluations: [], // Will be populated when evaluations load
        proposals: proposals
      });

    const [codeChallengeState, _codeChallengeCmds] =
      ProposalCodeChallengeTab.component.init({
        proposal,
        opportunity: opportunity,
        viewerUser: viewerUser,
        evaluating: false,
        questionEvaluation: undefined,
        panelQuestionEvaluations: [],
        proposals: proposals
      });

    const [teamScenarioState, _teamScenarioCmds] =
      ProposalTeamScenarioTab.component.init({
        proposal,
        opportunity: opportunity,
        viewerUser: viewerUser,
        evaluating: false,
        questionEvaluation: undefined,
        panelQuestionEvaluations: [],
        proposals: proposals
      });

    // Initialize proposal tab state
    const [proposalTabState, _proposalTabCmds] = ProposalTab.component.init({
      proposal,
      opportunity: opportunity,
      viewerUser: viewerUser,
      evaluating: false,
      questionEvaluation: undefined,
      panelQuestionEvaluations: [],
      proposals: proposals
    } as Tab.Params);

    // Create a complete proposalTabState with the form correctly initialized
    const completeProposalTabState = {
      ...proposalTabState,
      organizations,
      evaluationContent,
      form: immutable(updatedFormState)
    };

    // Initialize history tab component
    const [historyState, _historyCmds] = ProposalHistoryTab.component.init({
      proposal,
      opportunity: opportunity,
      viewerUser: viewerUser,
      evaluating: false,
      panelQuestionEvaluations: [],
      proposals: proposals
    });

    // Add command to load individual panel evaluations for this proposal
    evaluationCommands.push(
      api.proposals.swu.teamQuestions.evaluations.readMany(proposal.id)(
        (
          response: api.ResponseValidation<
            SWUTeamQuestionResponseEvaluation[],
            string[]
          >
        ) => {
          const evaluations = api.isValid(response) ? response.value : [];
          return adt("onEvaluationsLoaded", [proposal.id, evaluations]) as Msg;
        }
      ) as component_.Cmd<Msg>
    );

    // Store the initialized states
    detailStates[proposal.id] = immutable({
      opportunity,
      formState: updatedFormState,
      teamQuestionsState,
      teamQuestionsEvalState,
      codeChallengeState,
      teamScenarioState,
      proposalTabState: completeProposalTabState,
      historyState,
      panelEvaluations: [],
      consensusEvaluation: consensusEvaluation,
      evaluationsLoaded: false
    });
  }

  return [{ detailStates }, evaluationCommands];
};

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  if (msg.tag === "onEvaluationsLoaded") {
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

    // Re-initialize the TeamQuestionsTab with the loaded evaluation data
    const [updatedTeamQuestionsEvalState, _] =
      ProposalTeamQuestionsTab.component.init({
        proposal: updatedDetailState.teamQuestionsEvalState.proposal,
        opportunity: updatedDetailState.opportunity,
        viewerUser: updatedDetailState.formState.viewerUser,
        evaluating: true,
        questionEvaluation: updatedDetailState.consensusEvaluation || undefined,
        panelQuestionEvaluations: evaluations,
        proposals: updatedDetailState.teamQuestionsEvalState.proposals
      });

    // Update the state with the new evaluation data
    const finalDetailState = updatedDetailState.set(
      "teamQuestionsEvalState",
      updatedTeamQuestionsEvalState
    );

    return [state.setIn(["detailStates", proposalId], finalDetailState), []];
  }
  return [state, []];
};

interface ProposalDetailProps {
  proposal: SWUProposal;
  state: Immutable<ProposalDetailState>;
  viewerUser: User;
}

const ProposalDetail: component_.base.View<ProposalDetailProps> = ({
  proposal,
  state,
  viewerUser
}) => {
  // Extract components into PascalCase aliases for JSX usage
  const ProposalTeamQuestionsTabComponent =
    ProposalTeamQuestionsTab.component.view;
  const ProposalCodeChallengeTabComponent =
    ProposalCodeChallengeTab.component.view;
  const ProposalTeamScenarioTabComponent =
    ProposalTeamScenarioTab.component.view;
  const ProposalHistoryTabComponent = ProposalHistoryTab.component.view;

  return (
    <div key={proposal.id} className="mb-5 pb-5 border-bottom">
      <ProposalFormReadOnly
        proposal={proposal}
        opportunity={state.opportunity}
        viewerUser={viewerUser}
        form={immutable(state.formState)}
      />

      <h3
        className="complete-report-section-header"
        style={{ marginBottom: "-37px", marginTop: "20px" }}>
        Proposal - {proposal.anonymousProponentName} - Team Questions
      </h3>
      <ProposalTeamQuestionsTabComponent
        state={immutable(state.teamQuestionsState)}
        dispatch={() => {}}
      />

      <hr></hr>
      <h3
        className="complete-report-section-header"
        style={{ marginBottom: "-37px", marginTop: "20px" }}>
        Proposal - {proposal.anonymousProponentName} - Team Questions (Eval)
      </h3>
      <ProposalTeamQuestionsTabComponent
        state={immutable(state.teamQuestionsEvalState)}
        dispatch={() => {}}
      />

      <hr></hr>
      <h3
        className="complete-report-section-header"
        style={{ marginBottom: "-37px", marginTop: "20px" }}>
        Proposal - {proposal.anonymousProponentName} - Code Challenge
      </h3>
      <ProposalCodeChallengeTabComponent
        state={immutable(state.codeChallengeState)}
        dispatch={() => {}}
      />

      <hr></hr>
      <h3
        className="complete-report-section-header"
        style={{ marginBottom: "-37px", marginTop: "20px" }}>
        Proposal - {proposal.anonymousProponentName} - Team Scenario
      </h3>
      <ProposalTeamScenarioTabComponent
        state={immutable(state.teamScenarioState)}
        dispatch={() => {}}
      />

      <hr></hr>
      <h3
        className="complete-report-section-header"
        style={{ marginBottom: "-37px", marginTop: "20px" }}>
        Proposal - {proposal.anonymousProponentName} - History
      </h3>
      <ProposalHistoryTabComponent
        state={immutable(state.historyState)}
        dispatch={() => {}}
      />
    </div>
  );
};

const view: component_.base.ComponentView<State, Msg> = ({ state }) => {
  const proposals = Object.keys(state.detailStates);

  if (proposals.length === 0) {
    return <div>No proposals available to display.</div>;
  }

  return (
    <div className="mt-5">
      {proposals
        .map((proposalId) => {
          const proposalState = state.detailStates[proposalId];
          const proposal = proposalState.formState.proposal;
          if (!proposal) return null;
          // Extract number from "Proponent X" format
          const proponentNum = parseInt(
            proposal.anonymousProponentName.split(" ")[1]
          );
          return { proposalId, proposalState, proposal, proponentNum };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .map((item, index) => {
          if (!item) return null;
          const { proposalId, proposalState, proposal } = item;
          return (
            <div key={proposalId}>
              <h3
                className={`mb-4 ${
                  index > 0 ? "complete-report-section-header" : ""
                }`}>
                Proposal - {proposal.anonymousProponentName}
              </h3>
              <ProposalDetail
                proposal={proposal}
                state={proposalState}
                viewerUser={proposalState.formState.viewerUser}
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
