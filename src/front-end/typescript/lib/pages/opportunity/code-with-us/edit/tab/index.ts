import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { ParseTabId, Tab, TabComponent, TabDefinition, TabId as TabId_, TabMsg as TabMsg_, TabState as TabState_ } from 'front-end/lib/components/sidebar/menu/tabbed-page';
import { immutable, Immutable } from 'front-end/lib/framework';
import * as HistoryTab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab/history';
import * as OpportunityTab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab/opportunity';
import * as ProposalsTab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab/proposals';
import * as SummaryTab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab/summary';
import { routeDest } from 'front-end/lib/views/link';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { adt, Id } from 'shared/lib/types';

export interface Params {
  opportunity: CWUOpportunity;
}

export type Component<State, Msg> = TabComponent<Params, State, Msg>;

export interface Tabs {
  summary: Tab<Params, SummaryTab.State, SummaryTab.InnerMsg>;
  opportunity: Tab<Params, OpportunityTab.State, OpportunityTab.InnerMsg>;
  proposals: Tab<Params, ProposalsTab.State, ProposalsTab.InnerMsg>;
  history: Tab<Params, HistoryTab.State, HistoryTab.InnerMsg>;
}

export type TabId = TabId_<Tabs>;

export type TabState<K extends TabId> = TabState_<Tabs, K>;

export type TabMsg<K extends TabId> = TabMsg_<Tabs, K>;

export const parseTabId: ParseTabId<Tabs> = raw => {
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

export function idToDefinition<K extends TabId>(id: K): TabDefinition<Tabs, K> {
  switch (id) {
    case 'opportunity':
      return {
        component: OpportunityTab.component,
        icon: 'file-code',
        title: 'Opportunity'
      } as TabDefinition<Tabs, K>;
    case 'proposals':
      return {
        component: ProposalsTab.component,
        icon: 'comment-dollar',
        title: 'Proposals'
      } as TabDefinition<Tabs, K>;
    case 'history':
      return {
        component: HistoryTab.component,
        icon: 'history',
        title: 'History'
      } as TabDefinition<Tabs, K>;
    case 'summary':
    default:
      return {
        component: SummaryTab.component,
        icon: 'clipboard-list',
        title: 'Summary'
      } as TabDefinition<Tabs, K>;
  }
}

export function makeSidebarLink(tab: TabId, opportunityId: Id, activeTab: TabId): MenuSidebar.SidebarLink {
  const { icon, title } = idToDefinition(tab);
  return {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt('opportunityCwuEdit', { opportunityId, tab }))
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
        dest: routeDest(adt('content', 'code-with-us-opportunity-guide'))
      }
    ]
  }));
}
