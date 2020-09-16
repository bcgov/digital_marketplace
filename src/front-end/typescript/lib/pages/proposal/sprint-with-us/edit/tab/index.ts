import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import { immutable, Immutable } from 'front-end/lib/framework';
import * as ProposalTab from 'front-end/lib/pages/proposal/sprint-with-us/edit/tab/proposal';
import * as ScoresheetTab from 'front-end/lib/pages/proposal/sprint-with-us/edit/tab/scoresheet';
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
  scoresheet: TabbedPage.Tab<Params, ScoresheetTab.State, ScoresheetTab.InnerMsg>;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K>;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = raw => {
  switch (raw) {
    case 'proposal':
    case 'scoresheet':
      return raw;
    default:
      return null;
  }
};

export function idToDefinition<K extends TabId>(id: K): TabbedPage.TabDefinition<Tabs, K> {
  switch (id) {
    case 'scoresheet':
      return {
        component: ScoresheetTab.component,
        icon: 'star-full',
        title: 'Scoresheet'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'proposal':
    default:
      return {
        component: ProposalTab.component,
        icon: 'comment-dollar',
        title: 'Proposal'
      } as TabbedPage.TabDefinition<Tabs, K>;
  }
}

export function makeSidebarLink(tab: TabId, proposal: SWUProposal, activeTab: TabId): MenuSidebar.SidebarItem {
  const { icon, title } = idToDefinition(tab);
  return adt('link', {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt('proposalSWUEdit', {
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
      makeSidebarLink('scoresheet', proposal, activeTab),
      adt('link', {
        icon: 'external-link',
        text: 'Read Guide',
        active: false,
        newTab: true,
        dest: routeDest(adt('content', 'sprint-with-us-proposal-guide'))
      })
    ]
  }));
}
