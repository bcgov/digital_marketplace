import { Route } from 'front-end/lib/app/types';
import * as Router from 'front-end/lib/framework/router';
import * as PageContent from 'front-end/lib/pages/content';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as CWUOpportunityEditTab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import * as OrganizationTab from 'front-end/lib/pages/organization/lib/components/tab';
import * as CWUProposalEditTab from 'front-end/lib/pages/proposal/code-with-us/edit/tab';
import * as CWUProposalViewTab from 'front-end/lib/pages/proposal/code-with-us/view/tab';
import * as UserProfileTab from 'front-end/lib/pages/user/profile/tab';
import { getString } from 'shared/lib';
import { adt } from 'shared/lib/types';

export function pushState(route: Route) {
  if (window.history && window.history.pushState) {
    const path = router.routeToUrl(route);
    window.history.pushState({ path }, '', path);
  }
}

export function replaceState(route: Route) {
  if (window.history && window.history.replaceState) {
    const path = router.routeToUrl(route);
    window.history.replaceState({ path }, '', path);
  }
}

export function redirect(path: string) {
  window.location.href = `${window.location.origin}/${path}`;
}

export function back() {
  if (window.history && window.history.back) {
    window.history.back();
  }
}

const router: Router.Router<Route> = {

  // Note(Jesse): @add_new_page_location

  routes: [
    {
      path: '/opportunities/sprint-with-us/create',
      makeRoute() {
        return {
          tag: 'opportunitySWUCreate',
          value: null
        };
      }
    },
    {
      path: '/opportunities/sprint-with-us/:opportunityId',
      makeRoute({params}) {
        return {
          tag: 'opportunitySWUView',
          value: {
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },
    {
      path: '/opportunities/sprint-with-us/:opportunityId/edit',
      makeRoute({ params }) {
        return {
          tag: 'opportunitySWUEdit',
          value: {
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },

    {
      path: '/opportunities/sprint-with-us/:opportunityId/proposals/create',
      makeRoute({ params }) {
        return {
          tag: 'proposalSWUCreate',
          value: {
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },
    {
      path: '/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId/edit',
      makeRoute({params}) {
        return {
          tag: 'proposalSWUEdit',
          value: {
            proposalId: params.proposalId || '',
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },
    {
      path: '/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId',
      makeRoute({ params }) {
        return {
          tag: 'proposalSWUView',
          value: {
            proposalId: params.proposalId || '',
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },

    {
      path: '/opportunities/code-with-us/create',
      makeRoute() {
        return {
          tag: 'opportunityCWUCreate',
          value: null
        };
      }
    },
    {
      path: '/opportunities/code-with-us/:opportunityId/edit',
      makeRoute({ params, query }) {
        return {
          tag: 'opportunityCWUEdit',
          value: {
            opportunityId: params.opportunityId || '',
            tab: CWUOpportunityEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: '/opportunities/code-with-us/:opportunityId',
      makeRoute({params}) {
        return {
          tag: 'opportunityCWUView',
          value: {
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },

    {
      path: '/opportunities/code-with-us/:opportunityId/proposals/create',
      makeRoute({ params }) {
        return {
          tag: 'proposalCWUCreate',
          value: {
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },
    {
      path: '/opportunities/code-with-us/:opportunityId/proposals/:proposalId/edit',
      makeRoute({ params, query }) {
        return {
          tag: 'proposalCWUEdit',
          value: {
            proposalId: params.proposalId || '',
            opportunityId: params.opportunityId || '',
            tab: CWUProposalEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    // This route needs to be matched before `proposalCWUView`,
    // otherwise "export" gets parsed as a `proposalId`.
    {
      path: '/opportunities/code-with-us/:opportunityId/proposals/export',
      makeRoute({ params, query }) {
        return {
          tag: 'proposalCWUExportAll',
          value: {
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },
    {
      path: '/opportunities/code-with-us/:opportunityId/proposals/:proposalId',
      makeRoute({ params, query }) {
        return {
          tag: 'proposalCWUView',
          value: {
            proposalId: params.proposalId || '',
            opportunityId: params.opportunityId || '',
            tab: CWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: '/opportunities/code-with-us/:opportunityId/proposals/:proposalId/export',
      makeRoute({ params, query }) {
        return {
          tag: 'proposalCWUExportOne',
          value: {
            proposalId: params.proposalId || '',
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },

    {
      path: '/proposals',
      makeRoute() {
        return {
          tag: 'proposalList',
          value: null
        };
      }
    },
    {
      path: '/organizations',
      makeRoute() {
        return {
          tag: 'orgList',
          value: null
        };
      }
    },
    {
      path: '/organizations/create',
      makeRoute() {
        return {
          tag: 'orgCreate',
          value: null
        };
      }
    },
    {
      path: '/organizations/:id/edit',
      makeRoute({ params, query }) {
        return {
          tag: 'orgEdit',
          value: {
            orgId: params.id || ''
          }
        };
      }
    },
    {
      path: '/organizations/:id',
      makeRoute({ params, query }) {
        return {
          tag: 'orgView',
          value: {
            orgId: params.id || '',
            tab: OrganizationTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: '/users/:id',
      makeRoute({ params, query }) {
        return {
          tag: 'userProfile',
          value: {
            userId: params.id || '',
            tab: UserProfileTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: '/users',
      makeRoute() {
        return {
          tag: 'userList',
          value: null
        };
      }
    },
    {
      path: '/',
      makeRoute() {
        return {
          tag: 'landing',
          value: null
        };
      }
    },
    {
      path: '/opportunities',
      makeRoute() {
        return {
          tag: 'opportunities',
          value: null
        };
      }
    },
    {
      path: '/content/:contentId',
      makeRoute({ params }) {
        return {
          tag: 'content',
          value: PageContent.parseContentId(params.contentId)
        };
      }
    },
    {
      path: '/sign-in',
      makeRoute({query}) {
        return {
          tag: 'signIn',
          value: { redirectOnSuccess: getString(query, 'redirectOnSuccess') || undefined }
        };
      }
    },
    {
      path: '/sign-out',
      makeRoute() {
        return {
          tag: 'signOut',
          value: null
        };
      }
    },
    {
      path: '/sign-up',
      makeRoute() {
        return {
          tag: 'signUpStepOne',
          value: null
        };
      }
    },
    {
      path: '/sign-up/complete',
      makeRoute() {
        return {
          tag: 'signUpStepTwo',
          value: null
        };
      }
    },

    {
      path: '/notice/:noticeId',
      makeRoute({ path, params, query }) {
        const noticeId = PageNotice.parseNoticeId(params.noticeId, query);
        return noticeId ? adt('notice', noticeId) : adt('notFound', { path });
      }
    },
    {
      path: '(.*)',
      makeRoute({ path }) {
        return adt('notFound', { path });
      }
    }
  ],

  // Note(Jesse): @add_new_page_location

  routeToUrl(route) {
    switch (route.tag) {
      case 'landing':
        return '/';
      case 'opportunities':
        return '/opportunities';
      case 'content':
        return `/content/${route.value}`;
      case 'signIn':
        return `/sign-in${route.value.redirectOnSuccess ? `?redirectOnSuccess=${window.encodeURIComponent(route.value.redirectOnSuccess)}` : ''}`;
      case 'signOut':
        return '/sign-out';
      case 'signUpStepOne':
        return `/sign-up`;
      case 'signUpStepTwo':
        return `/sign-up/complete`;
      case 'userProfile':
        return `/users/${route.value.userId}${route.value.tab ? `?tab=${route.value.tab}` : ''}`;
      case 'userList':
        return '/users';

      case 'orgList':
        return '/organizations';
      case 'orgEdit':
        return `/organizations/${route.value.orgId}/edit`;
      case 'orgCreate':
        return '/organizations/create';
      case 'orgView':
        return `/organizations/${route.value.orgId}${route.value.tab ? `?tab=${route.value.tab}` : ''}`;

      case 'proposalSWUCreate':
        return `/opportunities/sprint-with-us/${route.value.opportunityId}/proposals/create`;
      case 'proposalSWUEdit':
        return `/opportunities/sprint-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}/edit`;
      case 'proposalSWUView':
        return `/opportunities/sprint-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}`;

      case 'opportunitySWUCreate':
        return '/opportunities/sprint-with-us/create';
      case 'opportunitySWUEdit':
        return `/opportunities/sprint-with-us/${route.value.opportunityId}/edit`;
      case 'opportunitySWUView':
        return `/opportunities/sprint-with-us/${route.value.opportunityId}`;

      case 'opportunityCWUCreate':
        return '/opportunities/code-with-us/create';
      case 'opportunityCWUEdit':
        return `/opportunities/code-with-us/${route.value.opportunityId}/edit${route.value.tab ? `?tab=${route.value.tab}` : ''}`;
      case 'opportunityCWUView':
        return `/opportunities/code-with-us/${route.value.opportunityId}`;

      case 'proposalCWUCreate':
        return `/opportunities/code-with-us/${route.value.opportunityId}/proposals/create`;
      case 'proposalCWUEdit':
        return `/opportunities/code-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}/edit${route.value.tab ? `?tab=${route.value.tab}` : ''}`;

      case 'proposalCWUView':
        return `/opportunities/code-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}${route.value.tab ? `?tab=${route.value.tab}` : ''}`;
      case 'proposalCWUExportOne':
        return `/opportunities/code-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}/export`;
      case 'proposalCWUExportAll':
        return `/opportunities/code-with-us/${route.value.opportunityId}/proposals/export`;

      case 'proposalList':
        return '/proposals';
      case 'notice':
        return (() => {
          switch (route.value.tag) {
            case 'deactivatedOwnAccount':
            case 'authFailure':
              return `/notice/${route.value.tag}`;
          }
        })();
      case 'notFound':
        return route.value.path || '/not-found';
    }
  }

};

export default router;
