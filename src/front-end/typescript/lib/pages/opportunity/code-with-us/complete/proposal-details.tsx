import { AffiliationSlim } from "shared/lib/resources/affiliation";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import {
  CWUProposal,
  CWUProponent
} from "shared/lib/resources/proposal/code-with-us";
import { User } from "shared/lib/resources/user";
import { ADT, Id, adt } from "shared/lib/types";
import React from "react";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import * as ProposalForm from "front-end/lib/pages/proposal/code-with-us/lib/components/form";
import * as ProposalTab from "front-end/lib/pages/proposal/code-with-us/view/tab/proposal";
import * as ProposalHistoryTab from "front-end/lib/pages/proposal/code-with-us/view/tab/history";
import * as History from "front-end/lib/components/table/history";
import { getHistoryItems } from "front-end/lib/pages/proposal/code-with-us/view/tab/history";
import ProposalFormReadOnly from "front-end/lib/pages/proposal/code-with-us/lib/components/form-readonly";

export interface ProposalDetailState {
  opportunity: CWUOpportunity;
  formState: Immutable<ProposalForm.State>;
  proposalTabState: Immutable<ProposalTab.State>;
  historyState: Immutable<ProposalHistoryTab.State>;
}

export interface State {
  detailStates: Record<Id, Immutable<ProposalDetailState>>;
}

export interface Params {
  opportunity: CWUOpportunity;
  proposals: CWUProposal[];
  viewerUser: User;
}

export type Msg = ADT<"noop">;

const init: component_.base.Init<Params, State, Msg> = ({
  opportunity,
  proposals,
  viewerUser
}) => {
  const detailStates: Record<Id, Immutable<ProposalDetailState>> = {};

  for (const proposal of proposals) {
    // Generate unique ID prefixes for form elements
    const uniqueIdPrefix = `proposal-${proposal.id}`;

    const [formState, _formCmds] = ProposalForm.init({
      viewerUser: viewerUser,
      opportunity: opportunity,
      proposal: proposal,
      affiliations: [] as unknown as AffiliationSlim[],
      canRemoveExistingAttachments: false,
      idPrefix: uniqueIdPrefix // Pass unique ID prefix to form
    });

    const [proposalTabState, _proposalTabCmds] = ProposalTab.component.init({
      viewerUser: viewerUser
    });

    const completeProposalTabState: ProposalTab.State = {
      ...proposalTabState,
      proposal: proposal,
      opportunity: opportunity,
      viewerUser: viewerUser,
      form: immutable(formState)
    };

    const [historyState, _historyCmds] = ProposalHistoryTab.component.init({
      viewerUser: viewerUser
    });

    // Initialize the history state properly
    const [historyTableState, _historyTableCmds] = History.init({
      idNamespace: `cwu-proposal-history-${proposal.id}`,
      items: getHistoryItems(proposal, viewerUser.type),
      viewerUser: viewerUser
    });

    // Create a complete history state with the proposal and history table
    const completeHistoryState: ProposalHistoryTab.State = {
      ...historyState,
      proposal: proposal,
      viewerUser: viewerUser,
      history: immutable(historyTableState)
    };

    detailStates[proposal.id] = immutable({
      opportunity,
      formState: immutable(formState),
      proposalTabState: immutable(completeProposalTabState),
      historyState: immutable(completeHistoryState)
    });
  }

  return [{ detailStates }, []];
};

const update: component_.base.Update<State, Msg> = ({ state }) => {
  return [state, []];
};

interface ProposalDetailProps {
  proposal: CWUProposal;
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
  // Extract components into PascalCase aliases for JSX usage
  const ProposalHistoryTabComponent = ProposalHistoryTab.component.view;

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
        Proposal - {getProponentName(proposal.proponent)} - History
      </h3>
      <ProposalHistoryTabComponent
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
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => a.proposal.id.localeCompare(b.proposal.id))
        .map((item, index) => {
          if (!item) return null;
          const { proposalId, proposalState, proposal } = item;
          return (
            <div key={proposalId}>
              <h3
                className={`mb-4 ${
                  index > 0 ? "complete-report-section-header" : ""
                }`}>
                Proposal - {proposal.proponent.value.legalName}
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

function getProponentName(proponent: CWUProponent): string {
  return proponent.value.legalName;
}

export const component = {
  init,
  update,
  view
};
