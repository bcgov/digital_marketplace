import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import { TWUProposal } from "shared/lib/resources/proposal/team-with-us";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import { User } from "shared/lib/resources/user";
import React from "react";
import {
  EvaluationView,
  OrganizationView,
  ResourceQuestionsView,
  ReviewProposalView
} from "./form";
import * as Form from "./form";
import * as TabbedFormReadonly from "front-end/lib/components/tabbed-form-readonly";
import ProposalViewWrapper from "./proposal-view-wrapper";
import { State as WrapperState } from "front-end/lib/pages/proposal/team-with-us/edit/tab/proposal";
import * as SubmitProposalTerms from "front-end/lib/components/submit-proposal-terms";

type TabId = "Evaluation" | "Team Members" | "Questions" | "Review Proposal";

interface Params {
  proposal: TWUProposal;
  opportunity: TWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
}

interface State {
  proposal: TWUProposal;
  opportunity: TWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
  expandedForm: Immutable<Form.State>;
  activeTab: TabId;
}

const TABS: TabId[] = [
  "Evaluation",
  "Team Members",
  "Questions",
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
  let expandedForm: typeof form;

  try {
    // Expand Resource Questions accordions following immutable update pattern
    expandedForm = form.update("resourceQuestions", (resourceQuestions) => {
      return resourceQuestions.update("responses", (responses) =>
        responses.map((response) => ({
          ...response,
          isAccordianOpen: true
        }))
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
      case "Team Members":
        return <OrganizationView {...viewProps} />;
      case "Questions":
        return <ResourceQuestionsView {...viewProps} />;
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
    // State properties (readonly defaults)
    organizations: [],
    evaluationContent: "",
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
        id="twu-proposal-readonly"
        tabs={TABS}
        getTabLabel={getTabLabel}
        getTabContent={getTabContent}
        isTabValid={() => true}
        valid={true}
        state={immutable({
          id: "twu-proposal-readonly",
          isDropdownOpen: false,
          activeTab: state.activeTab,
          tabs: TABS
        })}
        dispatch={() => {}}
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
