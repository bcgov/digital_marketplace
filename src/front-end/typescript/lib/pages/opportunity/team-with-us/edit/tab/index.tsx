import * as MenuSidebar from "front-end/lib/components/sidebar/menu";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import { component } from "front-end/lib/framework";
import * as AddendaTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/addenda";
// import * as ChallengeTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/code-challenge";
import * as HistoryTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/history";
import * as OpportunityTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/opportunity";
import * as ProposalsTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/proposals";
import * as SummaryTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/summary";
// import * as TeamQuestionsTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/team-questions";
import { routeDest } from "front-end/lib/views/link";
import {
  canAddAddendumToTWUOpportunity,
  TWUOpportunity
} from "shared/lib/resources/opportunity/team-with-us";
import { User } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import { TWUProposalSlim } from "shared/lib/resources/proposal/team-with-us";

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
  viewerUser: User;
}

export type InitResponse = [TWUOpportunity, TWUProposalSlim[]];

export type Component<State, Msg> = TabbedPage.TabComponent<
  Params,
  State,
  Msg,
  InitResponse
>;

export interface Tabs {
  summary: TabbedPage.Tab<
    Params,
    SummaryTab.State,
    SummaryTab.InnerMsg,
    InitResponse
  >;
  opportunity: TabbedPage.Tab<
    Params,
    OpportunityTab.State,
    OpportunityTab.InnerMsg,
    InitResponse
  >;
  addenda: TabbedPage.Tab<
    Params,
    AddendaTab.State,
    AddendaTab.InnerMsg,
    InitResponse
  >;
  //   resourceQuestions: TabbedPage.Tab<
  //     Params,
  //     TeamQuestionsTab.State,
  //     TeamQuestionsTab.InnerMsg,
  //     InitResponse
  //   >;
  history: TabbedPage.Tab<
    Params,
    HistoryTab.State,
    HistoryTab.InnerMsg,
    InitResponse
  >;
  //   challenge: TabbedPage.Tab<
  //     Params,
  //     ChallengeTab.State,
  //     ChallengeTab.InnerMsg,
  //     InitResponse
  //   >;
  proposals: TabbedPage.Tab<
    Params,
    ProposalsTab.State,
    ProposalsTab.InnerMsg,
    InitResponse
  >;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K>;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = (raw) => {
  switch (raw) {
    case "summary":
    case "opportunity":
    case "addenda":
    case "history":
      // case "resourceQuestions":
      // case "challenge":
      // case "proposals":
      return raw;
    default:
      return null;
  }
};

export function idToDefinition<K extends TabId>(
  id: K
): TabbedPage.TabDefinition<Tabs, K> {
  switch (id) {
    case "opportunity":
      return {
        component: OpportunityTab.component,
        icon: "file-code",
        title: "Opportunity"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "addenda":
      return {
        component: AddendaTab.component,
        icon: "file-plus",
        title: "Addenda"
      } as TabbedPage.TabDefinition<Tabs, K>;
    // case "resourceQuestions":
    //   return {
    //     component: TeamQuestionsTab.component,
    //     icon: "comments-alt",
    //     title: "Team Questions"
    //   } as TabbedPage.TabDefinition<Tabs, K>;
    // case "challenge":
    //   return {
    //     component: ChallengeTab.component,
    //     icon: "code",
    //     title: "Code Challenge"
    //   } as TabbedPage.TabDefinition<Tabs, K>;
    case "proposals":
      return {
        component: ProposalsTab.component,
        icon: "comment-dollar",
        title: "Proposals"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "history":
      return {
        component: HistoryTab.component,
        icon: "history",
        title: "History"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "summary":
    default:
      return {
        component: SummaryTab.component,
        icon: "clipboard-list",
        title: "Summary"
      } as TabbedPage.TabDefinition<Tabs, K>;
  }
}

export function makeSidebarLink(
  tab: TabId,
  opportunityId: Id,
  activeTab: TabId
): MenuSidebar.SidebarItem {
  const { icon, title } = idToDefinition(tab);
  return adt("link", {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt("opportunityTWUEdit", { opportunityId, tab }))
  });
}

export function makeSidebarState(
  activeTab: TabId,
  opportunity?: TWUOpportunity
): component.base.InitReturnValue<MenuSidebar.State, MenuSidebar.Msg> {
  return MenuSidebar.init({
    items: opportunity
      ? [
          adt("heading", "Summary"),
          makeSidebarLink("summary", opportunity.id, activeTab),
          adt("heading", "Opportunity Management"),
          makeSidebarLink("opportunity", opportunity.id, activeTab),
          //Only show Addenda sidebar link if opportunity can have addenda.
          ...(canAddAddendumToTWUOpportunity(opportunity)
            ? [makeSidebarLink("addenda", opportunity.id, activeTab)]
            : []),
          makeSidebarLink("history", opportunity.id, activeTab),
          adt("heading", "Opportunity Evaluation"),
          // //   makeSidebarLink("proposals", opportunity.id, activeTab),
          //   makeSidebarLink("resourceQuestions", opportunity.id, activeTab),
          //   makeSidebarLink("challenge", opportunity.id, activeTab),
          adt("heading", "Need Help?"),
          adt("link", {
            icon: "external-link-alt",
            text: "Read Guide",
            active: false,
            newTab: true,
            dest: routeDest(
              adt("contentView", "team-with-us-opportunity-guide")
            )
          })
        ]
      : []
  });
}

export function shouldLoadProposalsForTab(tabId: TabId): boolean {
  // const proposalTabs: TabId[] = ["proposals", "resourceQuestions", "challenge"];
  const proposalTabs: TabId[] = ["proposals"];
  return proposalTabs.includes(tabId);
}
