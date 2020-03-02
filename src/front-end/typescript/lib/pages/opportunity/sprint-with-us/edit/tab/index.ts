import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import { immutable, Immutable } from 'front-end/lib/framework';

// TODO(Jesse): Copy these to the sprint-with-us folder!
import * as HistoryTab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab/history';
import * as OpportunityTab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab/opportunity';
import * as ProposalsTab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab/proposals';
import * as SummaryTab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab/summary';

import { routeDest } from 'front-end/lib/views/link';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { User } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';

// Parent page types & functions.

export type ParentState<K extends TabId> = TabbedPage.ParentState<Tabs, K>;

export type ParentMsg<K extends TabId, InnerMsg> = TabbedPage.ParentMsg<Tabs, K, InnerMsg>;

// Tab component types & functions.

export interface Params {
  opportunity: CWUOpportunity;
  viewerUser: User;
}

export type Component<State, Msg> = TabbedPage.TabComponent<Params, State, Msg>;

export interface Tabs {
};

export interface Tabs {
  summary: TabbedPage.Tab<Params, SummaryTab.State, SummaryTab.InnerMsg>;
  opportunity: TabbedPage.Tab<Params, OpportunityTab.State, OpportunityTab.InnerMsg>;
  proposals: TabbedPage.Tab<Params, ProposalsTab.State, ProposalsTab.InnerMsg>;
  history: TabbedPage.Tab<Params, HistoryTab.State, HistoryTab.InnerMsg>;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K>;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = raw => {
  switch (raw) {
    case 'summary':
    case 'opportunity':
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

export function makeSidebarLink(tab: TabId, opportunityId: Id, activeTab: TabId): MenuSidebar.SidebarLink {
  const { icon, title } = idToDefinition(tab);
  return {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt('opportunityCWUEdit', { opportunityId, tab }))
  };
}

export async function makeSidebarState(opportunityId: Id, activeTab: TabId): Promise<Immutable<MenuSidebar.State>> {
  return immutable(await MenuSidebar.init({
    links: [
      makeSidebarLink('summary', opportunityId, activeTab),
      makeSidebarLink('opportunity', opportunityId, activeTab),
      makeSidebarLink('proposals', opportunityId, activeTab),
      makeSidebarLink('history', opportunityId, activeTab),
      {
        icon: 'external-link',
        text: 'Read Guide',
        active: false,
        newTab: true,
        dest: routeDest(adt('content', 'code-with-us-opportunity-guide'))
      }
    ]
  }));
}
