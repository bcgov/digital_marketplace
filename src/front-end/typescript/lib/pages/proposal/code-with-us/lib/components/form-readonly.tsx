import { component as component_, immutable } from "front-end/lib/framework";
import { CWUProposal } from "shared/lib/resources/proposal/code-with-us";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import { User } from "shared/lib/resources/user";
import React from "react";
import { AttachmentsView, ProponentView, ProposalView } from "./form";
import { Immutable } from "front-end/lib/framework";
import * as Form from "./form";
import * as TabbedFormReadonly from "front-end/lib/components/tabbed-form-readonly";
import ProposalViewWrapper from "./proposal-view-wrapper";
import { State } from "front-end/lib/pages/proposal/code-with-us/edit/tab/proposal";
import * as SubmitProposalTerms from "front-end/lib/components/submit-proposal-terms";

type TabId = "Proponent" | "Proposal" | "Attachments";

interface Props {
  proposal: CWUProposal;
  opportunity: CWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
}

const TABS: TabId[] = ["Proponent", "Proposal", "Attachments"];

const ProposalFormReadOnly: component_.base.View<Props> = (props) => {
  const { proposal, opportunity, viewerUser, form } = props;

  if (!form) {
    return null;
  }

  const getTabContent = (tabId: TabId) => {
    const viewProps = { dispatch: () => {}, state: form, disabled: true };
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

  // Create state object that matches the State interface expected by ProposalViewWrapper
  const wrapperState = immutable({
    // Tab.Params properties
    viewerUser,
    proposal,
    opportunity,
    affiliations: [],
    // State properties (readonly defaults)
    form: form || immutable({} as Form.State),
    isEditing: false,
    startEditingLoading: 0,
    saveChangesLoading: 0,
    saveChangesAndSubmitLoading: 0,
    submitLoading: 0,
    withdrawLoading: 0,
    deleteLoading: 0,
    showModal: null,
    submitTerms: immutable({} as SubmitProposalTerms.State)
  }) as component_.base.Immutable<State>;

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
