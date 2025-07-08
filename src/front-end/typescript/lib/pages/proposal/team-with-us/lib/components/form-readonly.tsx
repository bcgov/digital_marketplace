import { component as component_, immutable } from "front-end/lib/framework";
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
import { Immutable } from "front-end/lib/framework";
import * as Form from "./form";
import * as TabbedFormReadonly from "front-end/lib/components/tabbed-form-readonly";
import ProposalViewWrapper from "./proposal-view-wrapper";
import { State } from "front-end/lib/pages/proposal/team-with-us/edit/tab/proposal";
import * as SubmitProposalTerms from "front-end/lib/components/submit-proposal-terms";

type TabId = "Evaluation" | "Team Members" | "Questions" | "Review Proposal";

interface Props {
  proposal: TWUProposal;
  opportunity: TWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
}

const TABS: TabId[] = [
  "Evaluation",
  "Team Members",
  "Questions",
  "Review Proposal"
];

const ProposalFormReadOnly: component_.base.View<Props> = (props) => {
  const { proposal, opportunity, viewerUser, form } = props;

  if (!form) {
    return null;
  }

  // Create a modified form state with all accordions expanded for readonly view
  let formWithExpandedAccordions = form;

  try {
    // Expand Resource Questions accordions
    formWithExpandedAccordions = formWithExpandedAccordions.update(
      "resourceQuestions",
      (resourceQuestions) => {
        return resourceQuestions.update("responses", (responses) =>
          responses.map((response) => ({
            ...response,
            isAccordianOpen: true
          }))
        );
      }
    );
  } catch (error) {
    console.error("Error updating form with expanded accordions:", error);
  }

  const getTabContent = (tabId: TabId) => {
    const viewProps = {
      dispatch: () => {},
      state: formWithExpandedAccordions,
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

  // Create state object that matches the State interface expected by ProposalViewWrapper
  const wrapperState = immutable({
    // Tab.Params properties
    proposal,
    opportunity,
    viewerUser,
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
    form: form || immutable({} as Form.State),
    submitTerms: immutable({} as SubmitProposalTerms.State)
  }) as component_.base.Immutable<State>;

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
          activeTab: TABS[0],
          tabs: TABS
        })}
        dispatch={() => {}}
        children={null}
      />
    </ProposalViewWrapper>
  );
};

export default ProposalFormReadOnly;
