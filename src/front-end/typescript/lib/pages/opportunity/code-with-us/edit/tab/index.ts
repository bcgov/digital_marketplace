import * as MenuSidebar from "front-end/lib/components/sidebar/menu";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import { component } from "front-end/lib/framework";
import * as AddendaTab from "front-end/lib/pages/opportunity/code-with-us/edit/tab/addenda";
import * as HistoryTab from "front-end/lib/pages/opportunity/code-with-us/edit/tab/history";
import * as OpportunityTab from "front-end/lib/pages/opportunity/code-with-us/edit/tab/opportunity";
import * as ProposalsTab from "front-end/lib/pages/opportunity/code-with-us/edit/tab/proposals";
import * as SummaryTab from "front-end/lib/pages/opportunity/code-with-us/edit/tab/summary";
import { routeDest } from "front-end/lib/views/link";
import {
  canAddAddendumToCWUOpportunity,
  CWUOpportunity
} from "shared/lib/resources/opportunity/code-with-us";
import { User } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import { CWUProposalSlim } from "shared/lib/resources/proposal/code-with-us";
import { GUIDE_AUDIENCE } from "front-end/lib/pages/guide/view";

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
  showAllTabs?: boolean;
}

export type InitResponse = [CWUOpportunity, CWUProposalSlim[]];

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
  proposals: TabbedPage.Tab<
    Params,
    ProposalsTab.State,
    ProposalsTab.InnerMsg,
    InitResponse
  >;
  history: TabbedPage.Tab<
    Params,
    HistoryTab.State,
    HistoryTab.InnerMsg,
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
    case "proposals":
    case "history":
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
    dest: routeDest(adt("opportunityCWUEdit", { opportunityId, tab }))
  });
}

export function makeSidebarState(
  activeTab: TabId,
  opportunity?: CWUOpportunity
): component.base.InitReturnValue<MenuSidebar.State, MenuSidebar.Msg> {
  return MenuSidebar.init({
    items: opportunity
      ? [
          adt("heading", "Summary"),
          makeSidebarLink("summary", opportunity.id, activeTab),
          adt("heading", "Opportunity Management"),
          makeSidebarLink("opportunity", opportunity.id, activeTab),
          //Only show Addenda sidebar link if opportunity can have addenda.
          ...(canAddAddendumToCWUOpportunity(opportunity)
            ? [makeSidebarLink("addenda", opportunity.id, activeTab)]
            : []),
          makeSidebarLink("history", opportunity.id, activeTab),
          adt("heading", "Opportunity Evaluation"),
          makeSidebarLink("proposals", opportunity.id, activeTab),
          adt("heading", "Need Help?"),
          adt("link", {
            icon: "external-link-alt",
            text: "Read Guide",
            active: false,
            newTab: true,
            dest: routeDest(
              adt("cwuGuide", {
                guideAudience: GUIDE_AUDIENCE.Ministry
              })
            )
          })
        ]
      : []
  });
}
