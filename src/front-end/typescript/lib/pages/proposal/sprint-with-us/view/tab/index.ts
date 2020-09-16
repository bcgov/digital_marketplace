import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import { immutable, Immutable } from 'front-end/lib/framework';
import * as CodeChallengeTab from 'front-end/lib/pages/proposal/sprint-with-us/view/tab/code-challenge';
import * as HistoryTab from 'front-end/lib/pages/proposal/sprint-with-us/view/tab/history';
import * as ProposalTab from 'front-end/lib/pages/proposal/sprint-with-us/view/tab/proposal';
import * as TeamQuestionsTab from 'front-end/lib/pages/proposal/sprint-with-us/view/tab/team-questions';
import * as TeamScenarioTab from 'front-end/lib/pages/proposal/sprint-with-us/view/tab/team-scenario';
import { routeDest } from 'front-end/lib/views/link';
import { SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { SWUProposal } from 'shared/lib/resources/proposal/sprint-with-us';
import { User } from 'shared/lib/resources/user';
import { adt } from 'shared/lib/types';

// Parent page types & functions.

export type ParentState<K extends TabId> = TabbedPage.ParentState<Tabs, K>;

export type ParentMsg<K extends TabId, InnerMsg> = TabbedPage.ParentMsg<Tabs, K, InnerMsg>;

// Tab component types & functions.

export interface Params {
  proposal: SWUProposal;
  opportunity: SWUOpportunity;
  viewerUser: User;
}

export type Component<State, Msg> = TabbedPage.TabComponent<Params, State, Msg>;

export interface Tabs {
  proposal: TabbedPage.Tab<Params, ProposalTab.State, ProposalTab.InnerMsg>;
  teamQuestions: TabbedPage.Tab<Params, TeamQuestionsTab.State, TeamQuestionsTab.InnerMsg>;
  codeChallenge: TabbedPage.Tab<Params, CodeChallengeTab.State, CodeChallengeTab.InnerMsg>;
  teamScenario: TabbedPage.Tab<Params, TeamScenarioTab.State, TeamScenarioTab.InnerMsg>;
  history: TabbedPage.Tab<Params, HistoryTab.State, HistoryTab.InnerMsg>;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K>;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = raw => {
  switch (raw) {
    case 'proposal':
    case 'teamQuestions':
    case 'codeChallenge':
    case 'teamScenario':
    case 'history':
      return raw;
    default:
      return null;
  }
};

export function idToDefinition<K extends TabId>(id: K): TabbedPage.TabDefinition<Tabs, K> {
  switch (id) {
    case 'teamQuestions':
      return {
        component: TeamQuestionsTab.component,
        icon: 'comments',
        title: 'Team Questions'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'codeChallenge':
      return {
        component: CodeChallengeTab.component,
        icon: 'code-outline',
        title: 'Code Challenge'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'teamScenario':
      return {
        component: TeamScenarioTab.component,
        icon: 'users-class',
        title: 'Team Scenario'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'history':
      return {
        component: HistoryTab.component,
        icon: 'history',
        title: 'Proposal History'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'proposal':
    default:
      return {
        component: ProposalTab.component,
        icon: 'comment-dollar',
        title: 'Proposal Details'
      } as TabbedPage.TabDefinition<Tabs, K>;
  }
}

export function makeSidebarLink(tab: TabId, proposal: SWUProposal, activeTab: TabId): MenuSidebar.SidebarItem {
  const { icon, title } = idToDefinition(tab);
  return adt('link', {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt('proposalSWUView', {
      proposalId: proposal.id,
      opportunityId: proposal.opportunity.id,
      tab
    }))
  });
}

export async function makeSidebarState(proposal: SWUProposal, activeTab: TabId): Promise<Immutable<MenuSidebar.State>> {
  return immutable(await MenuSidebar.init({
    items: [
      makeSidebarLink('proposal', proposal, activeTab),
      makeSidebarLink('teamQuestions', proposal, activeTab),
      makeSidebarLink('codeChallenge', proposal, activeTab),
      makeSidebarLink('teamScenario', proposal, activeTab),
      makeSidebarLink('history', proposal, activeTab)
    ]
  }));
}
