import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import { immutable, Immutable } from 'front-end/lib/framework';
import * as CodeChallengeTab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab/code-challenge';
import * as HistoryTab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab/history';
import * as OpportunityTab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab/opportunity';
import * as ProposalsTab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab/proposals';
import * as SummaryTab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab/summary';
import * as TeamQuestionsTab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab/team-questions';
import * as TeamScenarioTab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab/team-scenario';
import { routeDest } from 'front-end/lib/views/link';
import { SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { User } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';

// Parent page types & functions.

export type ParentState<K extends TabId> = TabbedPage.ParentState<Tabs, K>;

export type ParentMsg<K extends TabId, InnerMsg> = TabbedPage.ParentMsg<Tabs, K, InnerMsg>;

// Tab component types & functions.

export interface Params {
  opportunity: SWUOpportunity;
  viewerUser: User;
}

export type Component<State, Msg> = TabbedPage.TabComponent<Params, State, Msg>;

export interface Tabs {
  summary: TabbedPage.Tab<Params, SummaryTab.State, SummaryTab.InnerMsg>;
  opportunity: TabbedPage.Tab<Params, OpportunityTab.State, OpportunityTab.InnerMsg>;
  teamQuestions: TabbedPage.Tab<Params, TeamQuestionsTab.State, TeamQuestionsTab.InnerMsg>;
  history: TabbedPage.Tab<Params, HistoryTab.State, HistoryTab.InnerMsg>;
  codeChallenge: TabbedPage.Tab<Params, CodeChallengeTab.State, CodeChallengeTab.InnerMsg>;
  teamScenario: TabbedPage.Tab<Params, TeamScenarioTab.State, TeamScenarioTab.InnerMsg>;
  proposals: TabbedPage.Tab<Params, ProposalsTab.State, ProposalsTab.InnerMsg>;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K>;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = raw => {
  switch (raw) {
    case 'summary':
    case 'opportunity':
    case 'teamQuestions':
    case 'codeChallenge':
    case 'teamScenario':
    case 'proposals':
    case 'history':
      return raw;
    default:
      return null;
  }
};

export function idToDefinition<K extends TabId>(id: K): TabbedPage.TabDefinition<Tabs, K> {
  switch (id) {
    case 'opportunity':
      return {
        component: OpportunityTab.component,
        icon: 'file-code',
        title: 'Opportunity'
      } as TabbedPage.TabDefinition<Tabs, K>;
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
    case 'proposals':
      return {
        component: ProposalsTab.component,
        icon: 'comment-dollar',
        title: 'Proposals'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'history':
      return {
        component: HistoryTab.component,
        icon: 'history',
        title: 'History'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'summary':
    default:
      return {
        component: SummaryTab.component,
        icon: 'clipboard-list',
        title: 'Summary'
      } as TabbedPage.TabDefinition<Tabs, K>;
  }
}

export function makeSidebarLink(tab: TabId, opportunityId: Id, activeTab: TabId): MenuSidebar.SidebarItem {
  const { icon, title } = idToDefinition(tab);
  return adt('link', {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt('opportunitySWUEdit', { opportunityId, tab }))
  });
}

export async function makeSidebarState(opportunityId: Id, activeTab: TabId): Promise<Immutable<MenuSidebar.State>> {
  return immutable(await MenuSidebar.init({
    items: [
      adt('heading', 'Summary'),
      makeSidebarLink('summary',       opportunityId,  activeTab),
      adt('heading', 'Opportunity Management'),
      makeSidebarLink('opportunity',   opportunityId,  activeTab),
      makeSidebarLink('history',       opportunityId,  activeTab),
      adt('heading', 'Opportunity Evaluation'),
      makeSidebarLink('proposals',     opportunityId,  activeTab),
      makeSidebarLink('teamQuestions', opportunityId,  activeTab),
      makeSidebarLink('codeChallenge', opportunityId,  activeTab),
      makeSidebarLink('teamScenario',  opportunityId,  activeTab),
      adt('heading', 'Need Help?'),
      adt('link', {
        icon: 'external-link',
        text: 'Read Guide',
        active: false,
        newTab: true,
        dest: routeDest(adt('content', 'sprint-with-us-opportunity-guide'))
      })
    ]
  }));
}
