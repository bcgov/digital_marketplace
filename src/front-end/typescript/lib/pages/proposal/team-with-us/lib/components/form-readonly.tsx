import { component as component_, immutable } from "front-end/lib/framework";
import { TWUProposal } from "shared/lib/resources/proposal/team-with-us";
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

type TabId = "Evaluation" | "Team Members" | "Questions" | "Review Proposal";

interface Props {
  proposal: TWUProposal;
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
  const { proposal, viewerUser, form } = props;

  if (!form) {
    return null;
  }

  const getTabContent = (tabId: TabId) => {
    const viewProps = { dispatch: () => {}, state: form, disabled: true };
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

  return (
    <ProposalViewWrapper proposal={proposal} viewerUser={viewerUser}>
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
