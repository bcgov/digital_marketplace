import * as MenuSidebar from "front-end/lib/components/sidebar/menu";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import { component } from "front-end/lib/framework";
import * as OrganizationTab from "front-end/lib/pages/organization/edit/tab/organization";
import * as QualificationTab from "front-end/lib/pages/organization/edit/tab/swu-qualification";
import * as TWUQualificationTab from "front-end/lib/pages/organization/edit/tab/twu-qualification";
import * as TeamTab from "front-end/lib/pages/organization/edit/tab/team";
import { routeDest } from "front-end/lib/views/link";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import { Organization } from "shared/lib/resources/organization";
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
  organization: Organization;
  swuQualified: boolean;
  twuQualified: boolean;
  affiliations: AffiliationMember[];
  viewerUser: User;
}

export type InitResponse = null;

export type Component<State, Msg> = TabbedPage.TabComponent<
  Params,
  State,
  Msg,
  InitResponse
>;

export interface Tabs {
  organization: TabbedPage.Tab<
    Params,
    OrganizationTab.State,
    OrganizationTab.InnerMsg,
    InitResponse
  >;
  team: TabbedPage.Tab<Params, TeamTab.State, TeamTab.InnerMsg, InitResponse>;
  swuQualification: TabbedPage.Tab<
    Params,
    QualificationTab.State,
    QualificationTab.InnerMsg,
    InitResponse
  >;
  twuQualification: TabbedPage.Tab<
    Params,
    TWUQualificationTab.State,
    TWUQualificationTab.InnerMsg,
    InitResponse
  >;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K> & Params;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = (raw) => {
  switch (raw) {
    case "organization":
    case "team":
    case "swuQualification":
    case "twuQualification":
      return raw;
    default:
      return null;
  }
};

export function idToDefinition<K extends TabId>(
  id: K
): TabbedPage.TabDefinition<Tabs, K> {
  switch (id) {
    case "team":
      return {
        component: TeamTab.component,
        icon: "users",
        title: "Team"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "swuQualification":
      return {
        component: QualificationTab.component,
        icon: "shield",
        title: "SWU Qualification"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "twuQualification":
      return {
        component: TWUQualificationTab.component,
        icon: "shield",
        title: "TWU Qualification"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "organization":
    default:
      return {
        component: OrganizationTab.component,
        icon: "building",
        title: "Organization"
      } as TabbedPage.TabDefinition<Tabs, K>;
  }
}

export function makeSidebarLink(
  tab: TabId,
  organization: Organization,
  activeTab: TabId
): MenuSidebar.SidebarItem {
  const { icon, title } = idToDefinition(tab);
  return adt("link", {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt("orgEdit", { orgId: organization.id, tab }))
  });
}

export function makeSidebarState(
  activeTab: TabId,
  organization: Organization
): component.base.InitReturnValue<MenuSidebar.State, MenuSidebar.Msg> {
  return MenuSidebar.init({
    items: [
      makeSidebarLink("organization", organization, activeTab),
      makeSidebarLink("team", organization, activeTab),
      makeSidebarLink("swuQualification", organization, activeTab),
      makeSidebarLink("twuQualification", organization, activeTab)
    ]
  });
}
