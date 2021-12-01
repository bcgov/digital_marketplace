import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import { immutable, Immutable } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as OrganizationTab from 'front-end/lib/pages/organization/edit/tab/organization';
import * as QualificationTab from 'front-end/lib/pages/organization/edit/tab/qualification';
import * as TeamTab from 'front-end/lib/pages/organization/edit/tab/team';
import { routeDest } from 'front-end/lib/views/link';
import { AffiliationMember } from 'shared/lib/resources/affiliation';
import { doesOrganizationMeetSWUQualification, Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';

// Parent page types & functions.

export type ParentState<K extends TabId> = TabbedPage.ParentState<Tabs, K>;

export type ParentMsg<K extends TabId, InnerMsg> = TabbedPage.ParentMsg<Tabs, K, InnerMsg>;

// Tab component types & functions.

export interface Params {
  organization: Organization;
  swuQualified: boolean;
  affiliations: AffiliationMember[];
  viewerUser: User;
}

export type Component<State extends object, Msg> = TabbedPage.TabComponent<Params, State, Msg>;

export interface Tabs {
  organization: TabbedPage.Tab<Params, OrganizationTab.State, OrganizationTab.InnerMsg>;
  team: TabbedPage.Tab<Params, TeamTab.State, TeamTab.InnerMsg>;
  qualification: TabbedPage.Tab<Params, QualificationTab.State, QualificationTab.InnerMsg>;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K> & Params;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = raw => {
  switch (raw) {
    case 'organization':
    case 'team':
    case 'qualification':
      return raw;
    default:
      return null;
  }
};

export function idToDefinition<K extends TabId>(id: K, organization: Organization): TabbedPage.TabDefinition<Tabs, K> {
  switch (id) {
    case 'team':
      return {
        component: TeamTab.component,
        icon: 'users',
        title: 'Team'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'qualification':
      return {
        component: QualificationTab.component,
        icon: 'shield',
        title: 'SWU Qualification'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'organization':
    default:
      return {
        component: OrganizationTab.component,
        icon: 'building',
        title: organization.legalName || 'Organization'
      } as TabbedPage.TabDefinition<Tabs, K>;
  }
}

export function makeSidebarLink(tab: TabId, organization: Organization, activeTab: TabId): MenuSidebar.SidebarItem {
  const { icon, title } = idToDefinition(tab, organization);
  return adt('link', {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt('orgEdit', { orgId: organization.id, tab }))
  });
}

export async function makeSidebarState(organization: Organization, activeTab: TabId): Promise<Immutable<MenuSidebar.State>> {
  return immutable(await MenuSidebar.init({
    items: [
      makeSidebarLink('organization', organization, activeTab),
      makeSidebarLink('team', organization, activeTab),
      makeSidebarLink('qualification', organization, activeTab)
    ]
  }));
}

export async function initParams(orgId: Id, viewerUser: User): Promise<Params | null> {
  const organizationResult = await api.organizations.readOne(orgId);
  if (!api.isValid(organizationResult)) {
    return null;
  }
  const organization = organizationResult.value;
  const swuQualified = doesOrganizationMeetSWUQualification(organization);
  const affiliationsResult = await api.affiliations.readManyForOrganization(organization.id);
  if (!api.isValid(affiliationsResult)) {
    return null;
  }
  return {
    organization,
    swuQualified,
    viewerUser,
    affiliations: affiliationsResult.value
  };
}
