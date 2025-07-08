import { component as component_, immutable } from "front-end/lib/framework";
import { SWUProposal } from "shared/lib/resources/proposal/sprint-with-us";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import { User } from "shared/lib/resources/user";
import React from "react";
import {
  EvaluationView,
  TeamView,
  PricingView,
  TeamQuestionsView,
  ReferencesView,
  ReviewProposalView
} from "./form";
import { Immutable } from "front-end/lib/framework";
import * as Form from "./form";
import * as TabbedFormReadonly from "front-end/lib/components/tabbed-form-readonly";
import ProposalViewWrapper from "./proposal-view-wrapper";
import { State as WrapperState } from "front-end/lib/pages/proposal/sprint-with-us/edit/tab/proposal";
import * as SubmitProposalTerms from "front-end/lib/components/submit-proposal-terms";

type TabId =
  | "Evaluation"
  | "Team"
  | "Pricing"
  | "Team Questions"
  | "References"
  | "Review Proposal";

interface Params {
  proposal: SWUProposal;
  opportunity: SWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
}

interface State {
  proposal: SWUProposal;
  opportunity: SWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
  expandedForm: Immutable<Form.State>;
  activeTab: TabId;
}

const TABS: TabId[] = [
  "Evaluation",
  "Team",
  "Pricing",
  "Team Questions",
  "References",
  "Review Proposal"
];

const init: component_.base.Init<Params, State, never> = (params) => {
  const { proposal, opportunity, viewerUser, form } = params;

  // If form is null, we can't proceed - return early state
  if (!form) {
    // Create a default empty form state to avoid null
    const defaultForm = immutable({} as Form.State);
    const state: State = {
      proposal,
      opportunity,
      viewerUser,
      form: null,
      expandedForm: defaultForm,
      activeTab: TABS[0]
    };
    return [state, []];
  }

  // Create expanded form state for readonly view
  let expandedForm = form;

  try {
    // Expand Team Questions accordions following immutable update pattern
    expandedForm = expandedForm.update("teamQuestions", (teamQuestions) => {
      return teamQuestions.update("responses", (responses) =>
        responses.map((response) => ({
          ...response,
          isAccordianOpen: true
        }))
      );
    });

    // Expand Team phase accordions following immutable update pattern
    expandedForm = expandedForm.update("team", (team) => {
      return team
        .update("inceptionPhase", (phase) => phase.set("isAccordionOpen", true))
        .update("prototypePhase", (phase) => phase.set("isAccordionOpen", true))
        .update("implementationPhase", (phase) =>
          phase.set("isAccordionOpen", true)
        );
    });
  } catch (error) {
    // Log error but continue with original form
    console.error("Error updating form with expanded accordions:", error);
    expandedForm = form;
  }

  const state: State = {
    proposal,
    opportunity,
    viewerUser,
    form,
    expandedForm,
    activeTab: TABS[0]
  };

  return [state, []];
};

const view: component_.base.ComponentView<State, never> = ({ state }) => {
  if (!state.form) {
    return null;
  }

  const getTabContent = (tabId: TabId) => {
    const viewProps = {
      dispatch: () => {}, // Empty dispatch for readonly view
      state: state.expandedForm, // Now guaranteed to be non-null
      disabled: true
    };
    switch (tabId) {
      case "Evaluation":
        return <EvaluationView {...viewProps} />;
      case "Team":
        return <TeamView {...viewProps} />;
      case "Pricing":
        return <PricingView {...viewProps} />;
      case "Team Questions":
        return <TeamQuestionsView {...viewProps} />;
      case "References":
        return <ReferencesView {...viewProps} />;
      case "Review Proposal":
        return <ReviewProposalView {...viewProps} />;
    }
  };

  const getTabLabel = (tabId: TabId): string => tabId;

  const ReadonlyComponent = TabbedFormReadonly.view<TabId>();

  // Create state object that matches the WrapperState interface expected by ProposalViewWrapper
  const wrapperState = immutable({
    // Tab.Params properties
    proposal: state.proposal,
    opportunity: state.opportunity,
    viewerUser: state.viewerUser,
    organizations: [],
    evaluationContent: "",
    // State properties (readonly defaults)
    isEditing: false,
    startEditingLoading: 0,
    saveChangesLoading: 0,
    saveChangesAndSubmitLoading: 0,
    submitLoading: 0,
    withdrawLoading: 0,
    deleteLoading: 0,
    showModal: null,
    form: state.form,
    submitTerms: immutable({} as SubmitProposalTerms.State)
  }) as component_.base.Immutable<WrapperState>;

  return (
    <ProposalViewWrapper state={wrapperState} dispatch={() => {}}>
      <ReadonlyComponent
        id="swu-proposal-readonly"
        tabs={TABS}
        getTabLabel={getTabLabel}
        getTabContent={getTabContent}
        isTabValid={() => true}
        valid={true}
        state={immutable({
          id: "swu-proposal-readonly",
          isDropdownOpen: false,
          activeTab: state.activeTab,
          tabs: TABS
        })}
        dispatch={() => {}}
        children={null}
      />
    </ProposalViewWrapper>
  );
};

// Create a React component that can be used directly in JSX
const ProposalFormReadOnly: component_.base.View<Params> = (params) => {
  const [state] = init(params);
  return view({
    state: immutable(state) as component_.base.Immutable<State>,
    dispatch: () => {}
  });
};

export default ProposalFormReadOnly;
