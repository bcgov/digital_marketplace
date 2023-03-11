import * as MenuSidebar from "front-end/lib/components/sidebar/menu";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import { component } from "front-end/lib/framework";
import * as ProposalTab from "front-end/lib/pages/proposal/team-with-us/edit/tab/proposal";
// import * as ScoresheetTab from "front-end/lib/pages/proposal/team-with-us/edit/tab/scoresheet";
import { routeDest } from "front-end/lib/views/link";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import { TWUProposal } from "shared/lib/resources/proposal/team-with-us";
import { User } from "shared/lib/resources/user";
import { adt } from "shared/lib/types";

// Parent page types & functions.

export type ParentState<K extends TabId> = TabbedPage.ParentState<Tabs, K>;

export type ParentInnerMsg<
  K extends TabId,
  InnerMsg
> = TabbedPage.ParentInnerMsg<Tabs, K, InnerMsg>;

export type ParentMsg<K extends TabId, InnerMsg> = TabbedPage.ParentMsg<
  Tabs,
  K,
  InnerMsg
>;

// Tab component types & functions.

export interface Params {
  proposal: TWUProposal;
  opportunity: TWUOpportunity;
  viewerUser: User;
}

export type InitResponse = null;

export type Component<State, Msg> = TabbedPage.TabComponent<
  Params,
  State,
  Msg,
  InitResponse
>;
export interface Tabs {
  proposal: TabbedPage.Tab<
    Params,
    ProposalTab.State,
    ProposalTab.InnerMsg,
    InitResponse
  >;
  // scoresheet: TabbedPage.Tab<
  //   Params,
  //   ScoresheetTab.State,
  //   ScoresheetTab.InnerMsg,
  //   InitResponse
  // >;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K>;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = (raw) => {
  switch (raw) {
    case "proposal":
      // case "scoresheet":
      return raw;
    default:
      return null;
  }
};

export function idToDefinition<K extends TabId>(
  id: K
): TabbedPage.TabDefinition<Tabs, K> {
  switch (id) {
    // case "scoresheet":
    //   return {
    //     component: ScoresheetTab.component,
    //     icon: "star-full",
    //     title: "Scoresheet"
    //   } as TabbedPage.TabDefinition<Tabs, K>;
    case "proposal":
    default:
      return {
        component: ProposalTab.component,
        icon: "comment-dollar",
        title: "Proposal"
      } as TabbedPage.TabDefinition<Tabs, K>;
  }
}

export function makeSidebarLink(
  tab: TabId,
  proposal: TWUProposal,
  activeTab: TabId
): MenuSidebar.SidebarItem {
  const { icon, title } = idToDefinition(tab);
  return adt("link", {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(
      adt("proposalTWUEdit", {
        proposalId: proposal.id,
        opportunityId: proposal.opportunity.id,
        tab
      })
    )
  });
}

export function makeSidebarState(
  activeTab: TabId,
  proposal: TWUProposal
): component.base.InitReturnValue<MenuSidebar.State, MenuSidebar.Msg> {
  return MenuSidebar.init({
    items: [
      adt("heading", "Proposal Management"),
      makeSidebarLink("proposal", proposal, activeTab),
      adt("heading", "Vendor Evaluation"),
      // makeSidebarLink("scoresheet", proposal, activeTab),
      adt("heading", "Need Help?"),
      adt("link", {
        icon: "external-link-alt",
        text: "Read Guide",
        active: false,
        newTab: true,
        dest: routeDest(adt("contentView", "team-with-us-proposal-guide"))
      })
    ]
  });
}
