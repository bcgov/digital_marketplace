import { component as component_, immutable } from "front-end/lib/framework";
import { CWUProposal } from "shared/lib/resources/proposal/code-with-us";
import { User } from "shared/lib/resources/user";
import React from "react";
import { AttachmentsView, ProponentView, ProposalView } from "./form";
import { Immutable } from "front-end/lib/framework";
import * as Form from "./form";
import * as TabbedFormReadonly from "front-end/lib/components/tabbed-form-readonly";
import ProposalViewWrapper from "./proposal-view-wrapper";

type TabId = "Proponent" | "Proposal" | "Attachments";

interface Props {
  proposal: CWUProposal;
  viewerUser: User;
  form: Immutable<Form.State> | null;
}

const TABS: TabId[] = ["Proponent", "Proposal", "Attachments"];

const ProposalFormReadOnly: component_.base.View<Props> = (props) => {
  const { proposal, viewerUser, form } = props;

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

  return (
    <ProposalViewWrapper proposal={proposal} viewerUser={viewerUser}>
      <ReadonlyComponent
        id="proposal-readonly"
        tabs={TABS}
        getTabLabel={getTabLabel}
        getTabContent={getTabContent}
        isTabValid={() => true}
        valid={true}
        state={immutable({})}
        dispatch={() => {}}
      />
    </ProposalViewWrapper>
  );
};

export default ProposalFormReadOnly;
