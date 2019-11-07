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

const router: Router<Route> = {

  routes: [
    {
      path: '/',
      makeRoute() {
        return {
          tag: 'bookList',
          value: null
        };
      }
    },
    {
      path: '/books/create',
      makeRoute() {
        return {
          tag: 'bookCreate',
          value: null
        };
      }
    },
    {
      path: '/books',
      makeRoute() {
        return {
          tag: 'bookList',
          value: null
        };
      }
    },
    {
      path: '/genres',
      makeRoute() {
        return {
          tag: 'genreList',
          value: null
        };
      }
    },
    {
      path: '/authors/create',
      makeRoute() {
        return {
          tag: 'authorCreate',
          value: null
        };
      }
    },
    {
      path: '/authors',
      makeRoute() {
        return {
          tag: 'authorList',
          value: null
        };
      }
    },
    {
      path: '/librarian-sign-in',
      makeRoute() {
        return {
          tag: 'librarianSignIn',
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
      path: '/notice/new-author',
      makeRoute() {
        return {
          tag: 'notice',
          value: {
            noticeId: {
              tag: 'newAuthor',
              value: undefined
            }
          }
        };
      }
    },
    {
      path: '/notice/new-book',
      makeRoute() {
        return {
          tag: 'notice',
          value: {
            noticeId: {
              tag: 'newBook',
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
      case 'bookCreate':
        return '/books/create';
      case 'bookList':
        return '/books';
      case 'genreList':
        return '/genres';
      case 'authorCreate':
        return '/authors/create';
      case 'authorList':
        return '/authors';
      case 'librarianSignIn':
        return '/librarian-sign-in';
      case 'signOut':
        return '/sign-out';
      case 'notice':
        return (() => {
          switch (route.value.noticeId.tag) {
            case 'notFound':
              return '/not-found';
            case 'authFailure':
              return '/notice/auth-failure';
            case 'newAuthor':
              return '/notice/new-author';
            case 'newBook':
              return '/notice/new-book';
          }
        })();
    }
  }

};

export default router;
