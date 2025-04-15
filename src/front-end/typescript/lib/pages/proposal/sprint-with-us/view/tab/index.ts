import * as MenuSidebar from "front-end/lib/components/sidebar/menu";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import { component } from "front-end/lib/framework";
import * as CodeChallengeTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab/code-challenge";
import * as HistoryTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab/history";
import * as ProposalTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab/proposal";
import * as TeamQuestionsTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab/team-questions";
import * as TeamScenarioTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab/team-scenario";
import { routeDest } from "front-end/lib/views/link";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import { SWUProposal } from "shared/lib/resources/proposal/sprint-with-us";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
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
  proposal: SWUProposal;
  opportunity: SWUOpportunity;
  viewerUser: User;
  evaluating: boolean;
  questionEvaluation?: SWUTeamQuestionResponseEvaluation;
  panelQuestionEvaluations: SWUTeamQuestionResponseEvaluation[];
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
  teamQuestions: TabbedPage.Tab<
    Params,
    TeamQuestionsTab.State,
    TeamQuestionsTab.InnerMsg,
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
    case "proposal":
    case "teamQuestions":
    case "codeChallenge":
    case "teamScenario":
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
    case "history":
      return {
        component: HistoryTab.component,
        icon: "history",
        title: "Proposal History"
      } as TabbedPage.TabDefinition<Tabs, K>;
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
  proposal: SWUProposal,
  activeTab: TabId
): MenuSidebar.SidebarItem {
  const { icon, title } = idToDefinition(tab);
  return adt("link", {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(
      adt("proposalSWUView", {
        proposalId: proposal.id,
        opportunityId: proposal.opportunity.id,
        tab
      })
    )
  });
}

export function makeSidebarState(
  activeTab: TabId,
  proposal: SWUProposal,
  teamQuestionsTab: "consensus" | "overview" | "teamQuestions"
): component.base.InitReturnValue<MenuSidebar.State, MenuSidebar.Msg> {
  return MenuSidebar.init({
    backLink: {
      text: "Back to Opportunity",
      route: adt("opportunitySWUEdit", {
        opportunityId: proposal.opportunity.id,
        tab: (() => {
          switch (activeTab) {
            case "codeChallenge":
              return "codeChallenge" as const;
            case "teamScenario":
              return "teamScenario" as const;
            case "teamQuestions":
              return teamQuestionsTab;
            case "proposal":
            case "history":
            default:
              return "proposals" as const;
          }
        })()
      })
    },
    items: [
      adt("heading", "Vendor Proposal"),
      makeSidebarLink("proposal", proposal, activeTab),
      adt("heading", "Vendor Evaluation"),
      makeSidebarLink("teamQuestions", proposal, activeTab),
      makeSidebarLink("codeChallenge", proposal, activeTab),
      makeSidebarLink("teamScenario", proposal, activeTab),
      adt("heading", "Management"),
      makeSidebarLink("history", proposal, activeTab)
    ]
  });
}

export function shouldLoadEvaluationsForTab(tabId: TabId): boolean {
  const evaluationTabs: TabId[] = ["teamQuestions"];
  return evaluationTabs.includes(tabId);
}
