import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import { immutable, Immutable } from 'front-end/lib/framework';
import * as ProposalTab from 'front-end/lib/pages/proposal/code-with-us/edit/tab/proposal';
import { routeDest } from 'front-end/lib/views/link';
import { CWUProposal } from 'shared/lib/resources/proposal/code-with-us';
import { User } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';

// Parent page types & functions.

export type ParentState<K extends TabId> = TabbedPage.ParentState<Tabs, K>;

export type ParentMsg<K extends TabId, InnerMsg> = TabbedPage.ParentMsg<Tabs, K, InnerMsg>;

// Tab component types & functions.

export interface Params {
  proposal: CWUProposal;
  viewerUser: User;
}

export type Component<State extends object, Msg> = TabbedPage.TabComponent<Params, State, Msg>;

export interface Tabs {
  proposal: TabbedPage.Tab<Params, ProposalTab.State, ProposalTab.InnerMsg>;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K>;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = raw => {
  switch (raw) {
    case 'proposal':
      return raw;
    default:
      return null;
  }
};

export function idToDefinition<K extends TabId>(id: K): TabbedPage.TabDefinition<Tabs, K> {
  switch (id) {
    case 'proposal':
    default:
      return {
        component: ProposalTab.component,
        icon: 'comment-dollar',
        title: 'Proposal'
      } as TabbedPage.TabDefinition<Tabs, K>;
  }
}

export function makeSidebarLink(tab: TabId, proposalId: Id, opportunityId: Id, activeTab: TabId): MenuSidebar.SidebarItem {
  const { icon, title } = idToDefinition(tab);
  return adt('link', {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt('proposalCWUEdit', { proposalId, opportunityId, tab }))
  });
}

export async function makeSidebarState(proposalId: Id, opportunityId: Id, activeTab: TabId): Promise<Immutable<MenuSidebar.State>> {
  return immutable(await MenuSidebar.init({
    items: [
      adt('heading', 'Proposal Management'),
      makeSidebarLink('proposal', proposalId, opportunityId, activeTab),
      adt('heading', 'Need Help?'),
      adt('link', {
        icon: 'external-link-alt',
        text: 'Read Guide',
        active: false,
        newTab: true,
        dest: routeDest(adt('contentView', 'code-with-us-proposal-guide'))
      })
    ]
  }));
}
