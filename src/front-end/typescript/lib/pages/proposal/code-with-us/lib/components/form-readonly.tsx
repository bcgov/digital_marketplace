import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import { CWUProposal } from "shared/lib/resources/proposal/code-with-us";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import { User } from "shared/lib/resources/user";
import React from "react";
import { AttachmentsView, ProponentView, ProposalView } from "./form";
import * as Form from "./form";
import * as TabbedFormReadonly from "front-end/lib/components/tabbed-form-readonly";
import ProposalViewWrapper from "./proposal-view-wrapper";
import { State as WrapperState } from "front-end/lib/pages/proposal/code-with-us/edit/tab/proposal";
import * as SubmitProposalTerms from "front-end/lib/components/submit-proposal-terms";

type TabId = "Proponent" | "Proposal" | "Attachments";

interface Params {
  proposal: CWUProposal;
  opportunity: CWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
}

interface State {
  proposal: CWUProposal;
  opportunity: CWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
  expandedForm: Immutable<Form.State>;
  activeTab: TabId;
}

const TABS: TabId[] = ["Proponent", "Proposal", "Attachments"];

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

  // For CWU, we don't need to expand accordions like TWU, so just use the form as-is
  const expandedForm = form;

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
      case "Proponent":
        return <ProponentView {...viewProps} />;
      case "Proposal":
        return <ProposalView {...viewProps} />;
      case "Attachments":
        return <AttachmentsView {...viewProps} />;
    }
  };

  const getTabLabel = (tabId: TabId): string => tabId;

  const ReadonlyComponent = TabbedFormReadonly.view<TabId>();

  // Create state object that matches the WrapperState interface expected by ProposalViewWrapper
  const wrapperState = immutable({
    // Tab.Params properties
    viewerUser: state.viewerUser,
    proposal: state.proposal,
    opportunity: state.opportunity,
    affiliations: [],
    // State properties (readonly defaults)
    form: state.form,
    isEditing: false,
    startEditingLoading: 0,
    saveChangesLoading: 0,
    saveChangesAndSubmitLoading: 0,
    submitLoading: 0,
    withdrawLoading: 0,
    deleteLoading: 0,
    showModal: null,
    submitTerms: immutable({} as SubmitProposalTerms.State)
  }) as component_.base.Immutable<WrapperState>;

  return (
    <ProposalViewWrapper state={wrapperState} dispatch={() => {}}>
      <ReadonlyComponent
        id="proposal-readonly"
        tabs={TABS}
        getTabLabel={getTabLabel}
        getTabContent={getTabContent}
        isTabValid={() => true}
        valid={true}
        state={immutable({
          id: "cwu-proposal-readonly",
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
