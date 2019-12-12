import { Route } from 'front-end/lib/app/types';
import { Router } from 'front-end/lib/framework';

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

  routes: [
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
      makeRoute({ params }) {
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
      makeRoute({ params }) {
        return {
          tag: 'userProfile',
          value: {
            userId: params.id || ''
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
      path: '/sign-in',
      makeRoute() {
        return {
          tag: 'signIn',
          value: {provider: null} // TODO(Jesse) How do we get this from the query string?
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
      path: '/notice/auth-failure',
      makeRoute() {
        return {
          tag: 'notice',
          value: {
            noticeId: {
              tag: 'authFailure',
              value: undefined
            }
          }
        };
      }
    },
    {
      path: '*',
      makeRoute() {
        return {
          tag: 'notice',
          value: {
            noticeId: {
              tag: 'notFound',
              value: undefined
            }
          }
        };
      }
    }
  ],

  routeToUrl(route) {
    switch (route.tag) {
      case 'landing':
        return '/';
      case 'signIn':
        return '/sign-in';
      case 'signOut':
        return '/sign-out';
      case 'signUpStepOne':
        return `/sign-up`;
      case 'signUpStepTwo':
        return `/sign-up/complete`;
      case 'userProfile':
        return `/users/${route.value.userId}/profile`;
      case 'userList':
        return '/users';
      case 'orgList':
        return '/organizations';
      case 'orgEdit':
        return `/organizations/${route.value.orgId}/edit`;
      case 'orgCreate':
        return '/organizations/create';
      case 'notice':
        return (() => {
          switch (route.value.noticeId.tag) {
            case 'notFound':
              return '/not-found';
            case 'authFailure':
              return '/notice/auth-failure';
          }
        })();
    }
  }

};

export default router;
