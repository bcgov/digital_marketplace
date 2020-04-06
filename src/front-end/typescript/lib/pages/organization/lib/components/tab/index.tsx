import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import * as OrganizationTab from 'front-end/lib/pages/organization/lib/components/tab/organizations';
import * as QualificationTab from 'front-end/lib/pages/organization/lib/components/tab/qualifications';
import * as TeamTab from 'front-end/lib/pages/organization/lib/components/tab/team';

export type TabId = TabbedPage.TabId<Tabs>;

type Params = {};

export interface Tabs {
  organization: TabbedPage.Tab<Params, OrganizationTab.State, OrganizationTab.InnerMsg>;
  team: TabbedPage.Tab<Params, TeamTab.State, TeamTab.InnerMsg>;
  qualification: TabbedPage.Tab<Params, QualificationTab.State, QualificationTab.InnerMsg>;
}

export const parseTabId: TabbedPage.ParseTabId<Tabs> = raw => {
  switch (raw) {
    case 'team':
    case 'qualification':
    case 'organization':
      return raw;
    default:
      return null;
  }
};
