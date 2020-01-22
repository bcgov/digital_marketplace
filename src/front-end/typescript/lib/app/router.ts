import { Route } from 'front-end/lib/app/types';
import * as UserSidebar from 'front-end/lib/components/sidebar/profile-org';
import { Router } from 'front-end/lib/framework';
import * as PageContent from 'front-end/lib/pages/content';
import * as PageNotice from 'front-end/lib/pages/notice';
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

const router: Router<Route> = {

  // Note(Jesse): @add_new_page_location

  routes: [

    {
      path: '/opportunities/code-with-us/create',
      makeRoute() {
        return {
          tag: 'cwuOpportunityCreate',
          value: null
        };
      }
    },
    {
      path: '/opportunities/code-with-us/:id/edit',
      makeRoute({params}) {
        return {
          tag: 'cwuOpportunityEdit',
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
          tag: 'cwuOpportunityView',
          value: {
            id: params.id || ''
          }
        };
      }
    },
    {
      path: '/proposals/code-with-us/create',
      makeRoute() {
        return {
          tag: 'cwuProposalCreate',
          value: null
        };
      }
    },
    {
      path: '/proposals/code-with-us/:id/edit',
      makeRoute({params}) {
        return {
          tag: 'cwuProposalEdit',
          value: {
            id: params.id || ''
          }
        };
      }
    },
    {
      path: '/proposals/code-with-us/:id',
      makeRoute({params}) {
        return {
          tag: 'cwuProposalView',
          value: {
            id: params.id || ''
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
            tab: UserSidebar.parseTabId(query.tab)
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
      makeRoute() {
        return {
          tag: 'signIn',
          value: null
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
      path: '*',
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
        return '/sign-in';
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
      case 'cwuOpportunityCreate':
        return '/opportunities/code-with-us/create';
      case 'cwuOpportunityEdit':
        return `/opportunities/code-with-us/${route.value.id}/edit`;
      case 'cwuOpportunityView':
        return `/opportunities/code-with-us/${route.value.id}/view`;
      case 'cwuProposalCreate':
        return '/proposals/code-with-us/create';
      case 'cwuProposalEdit':
        return `/proposals/code-with-us/${route.value.id}/edit`;
      case 'cwuProposalView':
        return `/proposals/code-with-us/${route.value.id}/view`;
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
