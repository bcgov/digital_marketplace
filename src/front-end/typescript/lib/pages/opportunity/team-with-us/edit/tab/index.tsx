import * as MenuSidebar from "front-end/lib/components/sidebar/menu";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import { component } from "front-end/lib/framework";
import * as AddendaTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/addenda";
import * as ChallengeTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/challenge";
import * as HistoryTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/history";
import * as OpportunityTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/opportunity";
import * as EvaluationPanelTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/evaluation-panel";
import * as EvaluationTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/evaluation";
import * as ConsensusTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/consensus";
import * as ProposalsTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/proposals";
import * as SummaryTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/summary";
import * as ResourceQuestionsTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/resource-questions";
import * as InstructionsTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/instructions";
import { routeDest } from "front-end/lib/views/link";
import {
  canAddAddendumToTWUOpportunity,
  TWUOpportunity
} from "shared/lib/resources/opportunity/team-with-us";
import { User } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import { TWUProposalSlim } from "shared/lib/resources/proposal/team-with-us";
import { GUIDE_AUDIENCE } from "front-end/lib/pages/guide/view";
import { TWUResourceQuestionResponseEvaluation } from "shared/lib/resources/evaluations/team-with-us/resource-questions";

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

export type TabPermissions = {
  isOpportunityOwnerOrAdmin: boolean;
  isEvaluator: boolean;
  isChair: boolean;
};

export type InitResponse = [
  TWUOpportunity,
  TWUProposalSlim[],
  TWUResourceQuestionResponseEvaluation[],
  User[]
];

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
  evaluationPanel: TabbedPage.Tab<
    Params,
    EvaluationPanelTab.State,
    EvaluationPanelTab.InnerMsg,
    InitResponse
  >;
  addenda: TabbedPage.Tab<
    Params,
    AddendaTab.State,
    AddendaTab.InnerMsg,
    InitResponse
  >;
  resourceQuestions: TabbedPage.Tab<
    Params,
    ResourceQuestionsTab.State,
    ResourceQuestionsTab.InnerMsg,
    InitResponse
  >;
  history: TabbedPage.Tab<
    Params,
    HistoryTab.State,
    HistoryTab.InnerMsg,
    InitResponse
  >;
  challenge: TabbedPage.Tab<
    Params,
    ChallengeTab.State,
    ChallengeTab.InnerMsg,
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
    InstructionsTab.State,
    InstructionsTab.InnerMsg,
    InitResponse
  >;
  evaluation: TabbedPage.Tab<
    Params,
    EvaluationTab.State,
    EvaluationTab.InnerMsg,
    InitResponse
  >;
  consensus: TabbedPage.Tab<
    Params,
    ConsensusTab.State,
    ConsensusTab.InnerMsg,
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
    case "proposals":
    case "resourceQuestions":
    case "challenge":
    case "instructions":
    case "evaluation":
    case "consensus":
    case "evaluationPanel":
      return raw;
    default:
      return null;
  }
};

export function canGovUserViewTab(tab: TabId, tabPermissions: TabPermissions) {
  const { isOpportunityOwnerOrAdmin, isEvaluator, isChair } = tabPermissions;
  switch (tab) {
    case "summary":
    case "opportunity":
    case "addenda":
    case "history":
      return true;
    case "resourceQuestions":
    case "challenge":
    case "proposals":
    case "evaluationPanel":
      return isOpportunityOwnerOrAdmin;
    case "instructions":
    case "evaluation":
      return isEvaluator;
    case "consensus":
      return isChair || isOpportunityOwnerOrAdmin;
  }
}

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
    case "evaluationPanel":
      return {
        component: EvaluationPanelTab.component,
        icon: "users",
        title: "Evaluation Panel"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "addenda":
      return {
        component: AddendaTab.component,
        icon: "file-plus",
        title: "Addenda"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "resourceQuestions":
      return {
        component: ResourceQuestionsTab.component,
        icon: "comments-alt",
        title: "Resource Questions"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "challenge":
      return {
        component: ChallengeTab.component,
        icon: "code",
        title: "Interview/Challenge"
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
        component: InstructionsTab.component,
        icon: "hand-point-up",
        title: "Instructions"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "evaluation":
      return {
        component: EvaluationTab.component,
        icon: "list-check",
        title: "Evaluation"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "consensus":
      return {
        component: ConsensusTab.component,
        icon: "check-double",
        title: "Consensus"
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
  tabPermissions: TabPermissions,
  opportunity?: TWUOpportunity
): component.base.InitReturnValue<MenuSidebar.State, MenuSidebar.Msg> {
  if (!opportunity) {
    return MenuSidebar.init({ items: [] });
  }
  const canGovUserViewTabs = (...tabIds: TabId[]) =>
    tabIds.some((tabId) => canGovUserViewTab(tabId, tabPermissions));
  return MenuSidebar.init({
    items: opportunity
      ? [
          adt("heading", "Summary"),
          makeSidebarLink("summary", opportunity.id, activeTab),
          adt("heading", "Opportunity Management"),
          makeSidebarLink("opportunity", opportunity.id, activeTab),
          ...(canGovUserViewTabs("evaluationPanel")
            ? [makeSidebarLink("evaluationPanel", opportunity.id, activeTab)]
            : []),
          //Only show Addenda sidebar link if opportunity can have addenda.
          ...(canAddAddendumToTWUOpportunity(opportunity)
            ? [makeSidebarLink("addenda", opportunity.id, activeTab)]
            : []),
          makeSidebarLink("history", opportunity.id, activeTab),
          adt("heading", "Opportunity Evaluation"),
          ...(canGovUserViewTabs("proposals")
            ? [makeSidebarLink("proposals", opportunity.id, activeTab)]
            : []),
          ...(canGovUserViewTabs("instructions", "evaluation")
            ? [
                makeSidebarLink("instructions", opportunity.id, activeTab),
                makeSidebarLink("evaluation", opportunity.id, activeTab)
              ]
            : []),
          ...(canGovUserViewTabs("resourceQuestions")
            ? [makeSidebarLink("resourceQuestions", opportunity.id, activeTab)]
            : []),
          ...(canGovUserViewTabs("consensus")
            ? [makeSidebarLink("consensus", opportunity.id, activeTab)]
            : []),
          ...(canGovUserViewTabs("challenge")
            ? [makeSidebarLink("challenge", opportunity.id, activeTab)]
            : []),
          adt("heading", "Need Help?"),
          adt("link", {
            icon: "external-link-alt",
            text: "Read Guide",
            active: false,
            newTab: true,
            dest: routeDest(
              adt("twuGuide", {
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
    "evaluation",
    "consensus",
    "proposals",
    "resourceQuestions",
    "challenge"
  ];
  return proposalTabs.includes(tabId);
}

export function shouldLoadEvaluationsForTab(tabId: TabId): boolean {
  const evaluationTabs: TabId[] = ["evaluation", "consensus"];
  return evaluationTabs.includes(tabId);
}

export function shouldLoadUsersForTab(tabId: TabId): boolean {
  return tabId === "evaluationPanel";
}
