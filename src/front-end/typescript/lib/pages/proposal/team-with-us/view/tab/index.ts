import * as MenuSidebar from "front-end/lib/components/sidebar/menu";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import { component } from "front-end/lib/framework";
// import * as ChallengeTab from "front-end/lib/pages/proposal/team-with-us/view/tab/code-challenge";
// import * as HistoryTab from "front-end/lib/pages/proposal/team-with-us/view/tab/history";
import * as ProposalTab from "front-end/lib/pages/proposal/team-with-us/view/tab/proposal";
import * as ResourceQuestionsTab from "front-end/lib/pages/proposal/team-with-us/view/tab/resource-questions";
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
  resourceQuestions: TabbedPage.Tab<
    Params,
    ResourceQuestionsTab.State,
    ResourceQuestionsTab.InnerMsg,
    InitResponse
  >;
  // challenge: TabbedPage.Tab<
  //   Params,
  //   ChallengeTab.State,
  //   ChallengeTab.InnerMsg,
  //   InitResponse
  // >;
  // history: TabbedPage.Tab<
  //   Params,
  //   HistoryTab.State,
  //   HistoryTab.InnerMsg,
  //   InitResponse
  // >;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K>;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = (raw) => {
  switch (raw) {
    case "proposal":
    case "resourceQuestions":
      // case "challenge":
      // case "history":
      return raw;
    default:
      return null;
  }
};

export function idToDefinition<K extends TabId>(
  id: K
): TabbedPage.TabDefinition<Tabs, K> {
  switch (id) {
    case "resourceQuestions":
      return {
        component: ResourceQuestionsTab.component,
        icon: "comments-alt",
        title: "Resource Questions"
      } as TabbedPage.TabDefinition<Tabs, K>;
    // case "challenge":
    //   return {
    //     component: ChallengeTab.component,
    //     icon: "code",
    //     title: "Challenge"
    //   } as TabbedPage.TabDefinition<Tabs, K>;
    // case "history":
    //   return {
    //     component: HistoryTab.component,
    //     icon: "history",
    //     title: "Proposal History"
    //   } as TabbedPage.TabDefinition<Tabs, K>;
    case "proposal":
    default:
      return {
        component: ProposalTab.component,
        icon: "comment-dollar",
        title: "Proposal Details"
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
      adt("proposalTWUView", {
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
    // backLink: {
    //   text: "Back to Opportunity",
    //   route: adt("opportunityTWUEdit", {
    //     opportunityId: proposal.opportunity.id,
    //     tab: (() => {
    //       switch (activeTab) {
    //         // case "challenge":
    //         //   return "challenge" as const;
    //         // case "resourceQuestions":
    //         //   return "resourceQuestions" as const;
    //         case "proposal":
    //           // TODO - remove break
    //           break;
    //         // case "history":
    //         default:
    //           return "proposals" as const;
    //       }
    //     })()
    //   })
    // },
    items: [
      adt("heading", "Vendor Proposal"),
      makeSidebarLink("proposal", proposal, activeTab),
      adt("heading", "Vendor Evaluation"),
      makeSidebarLink("resourceQuestions", proposal, activeTab),
      // makeSidebarLink("challenge", proposal, activeTab),
      adt("heading", "Management")
      // makeSidebarLink("history", proposal, activeTab)
    ]
  });
}
