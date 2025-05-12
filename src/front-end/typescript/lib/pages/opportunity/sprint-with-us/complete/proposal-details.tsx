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
import { OrganizationSlim } from "shared/lib/resources/organization";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import { SWUProposal } from "shared/lib/resources/proposal/sprint-with-us";
import { User } from "shared/lib/resources/user";
import { ADT, Id } from "shared/lib/types";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import ViewTabHeader from "front-end/lib/pages/proposal/sprint-with-us/lib/views/view-tab-header";

export interface ProposalDetailState {
  formState: ProposalForm.State;
  teamQuestionsState: ProposalTeamQuestionsTab.State;
  codeChallengeState: ProposalCodeChallengeTab.State;
  teamScenarioState: ProposalTeamScenarioTab.State;
  proposalTabState: ProposalTab.State;
  historyState: ProposalHistoryTab.State;
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
}

export type Msg = ADT<"noop">;

const init: component_.base.Init<Params, State, Msg> = ({
  opportunity,
  proposals,
  viewerUser,
  organizations,
  evaluationContent,
  proposalAffiliations
}) => {
  const detailStates: Record<Id, Immutable<ProposalDetailState>> = {};

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
      evaluationContent: evaluationContent,
      showAllTabs: true
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
      proposals: proposals,
      showAllTabs: true,
      expandAccordions: true
    } as ProposalTab.Params);

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

    // Store the initialized states
    detailStates[proposal.id] = immutable({
      formState: updatedFormState,
      teamQuestionsState,
      codeChallengeState,
      teamScenarioState,
      proposalTabState: completeProposalTabState,
      historyState
    });
  }

  return [{ detailStates }, []];
};

const update: component_.base.Update<State, Msg> = ({ state }) => {
  return [state, []];
};

interface ProposalDetailProps {
  proposal: SWUProposal;
  state: Immutable<ProposalDetailState>;
  viewerUser: User;
}

const ProposalDetail: component_.base.View<ProposalDetailProps> = ({
  proposal,
  state
}) => {
  return (
    <div key={proposal.id} className="mb-5 pb-5 border-bottom">
      <div className="proposal-complete-page-header">
        <ViewTabHeader
          proposal={proposal}
          viewerUser={state.formState.viewerUser}
        />
      </div>

      <ProposalTab.component.view
        state={immutable(state.proposalTabState)}
        dispatch={() => {}}
      />

      <h3
        className="complete-report-section-header"
        style={{ marginBottom: "-37px", marginTop: "20px" }}>
        Proposal - {proposal.anonymousProponentName} - Team Questions
      </h3>
      <ProposalTeamQuestionsTab.component.view
        state={immutable(state.teamQuestionsState)}
        dispatch={() => {}}
      />

      <hr></hr>
      <h3
        className="complete-report-section-header"
        style={{ marginBottom: "-37px", marginTop: "20px" }}>
        Proposal - {proposal.anonymousProponentName} - Code Challenge
      </h3>
      <ProposalCodeChallengeTab.component.view
        state={immutable(state.codeChallengeState)}
        dispatch={() => {}}
      />

      <hr></hr>
      <h3
        className="complete-report-section-header"
        style={{ marginBottom: "-37px", marginTop: "20px" }}>
        Proposal - {proposal.anonymousProponentName} - Team Scenario
      </h3>
      <ProposalTeamScenarioTab.component.view
        state={immutable(state.teamScenarioState)}
        dispatch={() => {}}
      />

      <hr></hr>
      <h3
        className="complete-report-section-header"
        style={{ marginBottom: "-37px", marginTop: "20px" }}>
        Proposal - {proposal.anonymousProponentName} - History
      </h3>
      <ProposalHistoryTab.component.view
        state={immutable(state.historyState)}
        dispatch={() => {}}
      />
    </div>
  );
};

const view: component_.base.View<
  component_.base.ComponentViewProps<State, Msg>
> = ({ state }) => {
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
          const proposal = proposalState?.formState.proposal;
          if (!proposal) return null;
          // Extract number from "Proponent X" format
          const proponentNum = parseInt(
            proposal.anonymousProponentName.split(" ")[1]
          );
          return { proposalId, proposalState, proposal, proponentNum };
        })
        .filter((x) => x !== null)
        .sort((a, b) => a!.proponentNum - b!.proponentNum)
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
