import { Route } from 'front-end/lib/app/types';
import * as Router from 'front-end/lib/framework/router';
import * as PageContent from 'front-end/lib/pages/content';
import * as PageNotice from 'front-end/lib/pages/notice';
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
      path: '/opportunities/code-with-us/create',
      makeRoute() {
        return {
          tag: 'opportunityCwuCreate',
          value: null
        };
      }
    },
    {
      path: '/opportunities/code-with-us/:id/edit',
      makeRoute({params}) {
        return {
          tag: 'opportunityCwuEdit',
          value: {
            id: params.id || ''
          }
        };
      }
    },
    {
      path: '/opportunities/code-with-us/:id',
      makeRoute({params}) {
        return {
          tag: 'opportunityCwuView',
          value: {
            id: params.id || ''
          }
        };
      }
    },
    {
      path: '/opportunities/code-with-us/:opportunityId/proposals/create',
      makeRoute({ params }) {
        return {
          tag: 'proposalCwuCreate',
          value: {
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },
    {
      path: '/opportunities/code-with-us/:opportunityId/proposals/:proposalId/edit',
      makeRoute({params}) {
        return {
          tag: 'proposalCwuEdit',
          value: {
            proposalId: params.proposalId || '',
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },
    {
      path: '/opportunities/code-with-us/:opportunityId/proposals/:proposalId',
      makeRoute({ params }) {
        return {
          tag: 'proposalCwuView',
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
      makeRoute({ params, query }) {
        return {
          tag: 'notice',
          value: PageNotice.parseNoticeId(params.noticeId, query)
        };
      }
    },
    {
      path: '(.*)',
      makeRoute() {
        return {
          tag: 'notice',
          value: adt('notFound')
        };
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
      case 'opportunityCwuCreate':
        return '/opportunities/code-with-us/create';
      case 'opportunityCwuEdit':
        return `/opportunities/code-with-us/${route.value.id}/edit`;
      case 'opportunityCwuView':
        return `/opportunities/code-with-us/${route.value.id}/view`;
      case 'proposalCwuCreate':
        return `/opportunities/code-with-us/${route.value.opportunityId}/proposals/create`;
      case 'proposalCwuEdit':
        return `/opportunities/code-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}/edit`;
      case 'proposalCwuView':
        return `/opportunities/code-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}`;
      case 'proposalList':
        return '/proposals';
      case 'notice':
        return (() => {
          switch (route.value.tag) {
            case 'notFound':
            case 'deactivatedOwnAccount':
            case 'authFailure':
              return `/notice/${route.value.tag}`;
          }
        })();
    }
  }

};

export default router;
