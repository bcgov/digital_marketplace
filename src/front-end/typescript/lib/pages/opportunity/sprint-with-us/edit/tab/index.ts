import * as MenuSidebar from "front-end/lib/components/sidebar/menu";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import { component } from "front-end/lib/framework";
import * as AddendaTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/addenda";
import * as CodeChallengeTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/code-challenge";
import * as HistoryTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/history";
import * as OpportunityTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/opportunity";
import * as ProposalsTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/proposals";
import * as SummaryTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/summary";
import * as TeamQuestionsTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/team-questions";
import * as TeamScenarioTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/team-scenario";
import { routeDest } from "front-end/lib/views/link";
import {
  canAddAddendumToSWUOpportunity,
  SWUEvaluationCommitteeMember,
  SWUOpportunity
} from "shared/lib/resources/opportunity/sprint-with-us";
import { User } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import { SWUProposalSlim } from "shared/lib/resources/proposal/sprint-with-us";
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
}

export type InitResponse = [SWUOpportunity, SWUProposalSlim[]];

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
  teamQuestions: TabbedPage.Tab<
    Params,
    TeamQuestionsTab.State,
    TeamQuestionsTab.InnerMsg,
    InitResponse
  >;
  history: TabbedPage.Tab<
    Params,
    HistoryTab.State,
    HistoryTab.InnerMsg,
    InitResponse
  >;
  codeChallenge: TabbedPage.Tab<
    Params,
    CodeChallengeTab.State,
    CodeChallengeTab.InnerMsg,
    InitResponse
  >;
  teamScenario: TabbedPage.Tab<
    Params,
    TeamScenarioTab.State,
    TeamScenarioTab.InnerMsg,
    InitResponse
  >;
  proposals: TabbedPage.Tab<
    Params,
    ProposalsTab.State,
    ProposalsTab.InnerMsg,
    InitResponse
  >;
  instructions: TabbedPage.Tab<
    Params,
    SummaryTab.State,
    SummaryTab.InnerMsg,
    InitResponse
  >;
  overview: TabbedPage.Tab<
    Params,
    SummaryTab.State,
    SummaryTab.InnerMsg,
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
    case "teamQuestions":
    case "codeChallenge":
    case "teamScenario":
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
    case "teamQuestions":
      return {
        component: TeamQuestionsTab.component,
        icon: "comments-alt",
        title: "Team Questions"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "codeChallenge":
      return {
        component: CodeChallengeTab.component,
        icon: "code",
        title: "Code Challenge"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "teamScenario":
      return {
        component: TeamScenarioTab.component,
        icon: "users-class",
        title: "Team Scenario"
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
    case "instructions":
      return {
        // TODO: Create tab
        component: SummaryTab.component,
        icon: "hand-point-up",
        title: "Instructions"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "overview":
      return {
        // TODO: Create tab
        component: SummaryTab.component,
        icon: "list-check",
        title: "Overview"
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
    dest: routeDest(adt("opportunitySWUEdit", { opportunityId, tab }))
  });
}

export function makeSidebarState(
  activeTab: TabId,
  opportunity?: SWUOpportunity,
  evaluationCommitteeMember?: SWUEvaluationCommitteeMember
): component.base.InitReturnValue<MenuSidebar.State, MenuSidebar.Msg> {
  const isEvaluator = Boolean(evaluationCommitteeMember?.evaluator);
  return MenuSidebar.init({
    items: opportunity
      ? [
          adt("heading", "Summary"),
          makeSidebarLink("summary", opportunity.id, activeTab),
          adt("heading", "Opportunity Management"),
          makeSidebarLink("opportunity", opportunity.id, activeTab),
          //Only show Addenda sidebar link if opportunity can have addenda.
          ...(canAddAddendumToSWUOpportunity(opportunity)
            ? [makeSidebarLink("addenda", opportunity.id, activeTab)]
            : []),
          makeSidebarLink("history", opportunity.id, activeTab),
          adt("heading", "Opportunity Evaluation"),
          ...(isEvaluator
            ? [
                makeSidebarLink("instructions", opportunity.id, activeTab),
                makeSidebarLink("overview", opportunity.id, activeTab)
              ]
            : [makeSidebarLink("proposals", opportunity.id, activeTab)]),
          makeSidebarLink("teamQuestions", opportunity.id, activeTab),
          ...(isEvaluator
            ? []
            : [
                makeSidebarLink("codeChallenge", opportunity.id, activeTab),
                makeSidebarLink("teamScenario", opportunity.id, activeTab)
              ]),
          adt("heading", "Need Help?"),
          adt("link", {
            icon: "external-link-alt",
            text: "Read Guide",
            active: false,
            newTab: true,
            dest: routeDest(
              adt("swuGuide", {
                guideAudience: GUIDE_AUDIENCE.Ministry
              })
            )
          })
        ]
      : []
  });
}

export function shouldLoadProposalsForTab(tabId: TabId): boolean {
  const proposalTabs: TabId[] = [
    "proposals",
    "teamQuestions",
    "codeChallenge",
    "teamScenario"
  ];
  return proposalTabs.includes(tabId);
}
