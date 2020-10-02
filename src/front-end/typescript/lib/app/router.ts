import { prefixPath } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import * as Router from 'front-end/lib/framework/router';
import * as PageContent from 'front-end/lib/pages/content';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as CWUOpportunityEditTab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import * as SWUOpportunityEditTab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab';
import * as OrganizationEditTab from 'front-end/lib/pages/organization/edit/tab';
import * as CWUProposalEditTab from 'front-end/lib/pages/proposal/code-with-us/edit/tab';
import * as CWUProposalViewTab from 'front-end/lib/pages/proposal/code-with-us/view/tab';
import * as SWUProposalEditTab from 'front-end/lib/pages/proposal/sprint-with-us/edit/tab';
import * as SWUProposalViewTab from 'front-end/lib/pages/proposal/sprint-with-us/view/tab';
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

  routes: [
    {
      path: prefixPath('/opportunities/create'),
      makeRoute() {
        return {
          tag: 'opportunityCreate',
          value: null
        };
      }
    },
    {
      path: prefixPath('/opportunities/sprint-with-us/create'),
      makeRoute() {
        return {
          tag: 'opportunitySWUCreate',
          value: null
        };
      }
    },
    {
      path: prefixPath('/opportunities/sprint-with-us/:opportunityId'),
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
      path: prefixPath('/opportunities/sprint-with-us/:opportunityId/edit'),
      makeRoute({ params, query }) {
        return {
          tag: 'opportunitySWUEdit',
          value: {
            opportunityId: params.opportunityId || '',
            tab: SWUOpportunityEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },

    {
      path: prefixPath('/opportunities/sprint-with-us/:opportunityId/proposals/create'),
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
      path: prefixPath('/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId/edit'),
      makeRoute({ params, query }) {
        return {
          tag: 'proposalSWUEdit',
          value: {
            proposalId: params.proposalId || '',
            opportunityId: params.opportunityId || '',
            tab: SWUProposalEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    // This route needs to be matched before `proposalSWUView`,
    // otherwise "export" gets parsed as a `proposalId`.
    {
      path: prefixPath('/opportunities/sprint-with-us/:opportunityId/proposals/export'),
      makeRoute({ params, query }) {
        return {
          tag: 'proposalSWUExportAll',
          value: {
            opportunityId: params.opportunityId || '',
            anonymous: query.anonymous === 'true'
          }
        };
      }
    },
    {
      path: prefixPath('/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId'),
      makeRoute({ params, query }) {
        return {
          tag: 'proposalSWUView',
          value: {
            proposalId: params.proposalId || '',
            opportunityId: params.opportunityId || '',
            tab: SWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath('/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId/export'),
      makeRoute({ params, query }) {
        return {
          tag: 'proposalSWUExportOne',
          value: {
            proposalId: params.proposalId || '',
            opportunityId: params.opportunityId || ''
          }
        };
      }
    },
    {
      path: prefixPath('/opportunities/code-with-us/create'),
      makeRoute() {
        return {
          tag: 'opportunityCWUCreate',
          value: null
        };
      }
    },
    {
      path: prefixPath('/opportunities/code-with-us/:opportunityId/edit'),
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
      path: prefixPath('/opportunities/code-with-us/:opportunityId'),
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
      path: prefixPath('/opportunities/code-with-us/:opportunityId/proposals/create'),
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
      path: prefixPath('/opportunities/code-with-us/:opportunityId/proposals/:proposalId/edit'),
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
      path: prefixPath('/opportunities/code-with-us/:opportunityId/proposals/export'),
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
      path: prefixPath('/opportunities/code-with-us/:opportunityId/proposals/:proposalId'),
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
      path: prefixPath('/opportunities/code-with-us/:opportunityId/proposals/:proposalId/export'),
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
      path: prefixPath('/proposals'),
      makeRoute() {
        return {
          tag: 'proposalList',
          value: null
        };
      }
    },
    {
      path: prefixPath('/organizations'),
      makeRoute() {
        return {
          tag: 'orgList',
          value: null
        };
      }
    },
    {
      path: prefixPath('/organizations/create'),
      makeRoute() {
        return {
          tag: 'orgCreate',
          value: null
        };
      }
    },
    {
      path: prefixPath('/organizations/:id/edit'),
      makeRoute({ params, query }) {
        return {
          tag: 'orgEdit',
          value: {
            orgId: params.id || '',
            tab: OrganizationEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath('/organizations/:id/sprint-with-us-terms-and-conditions'),
      makeRoute({ params, query }) {
        return {
          tag: 'orgSWUTerms',
          value: {
            orgId: params.id || ''
          }
        };
      }
    },
    {
      path: prefixPath('/users/:id'),
      makeRoute({ params, query }) {
        const affiliationId = getString(query, 'invitationAffiliationId') || undefined;
        const response = UserProfileTab.parseInvitationResponseParam(getString(query, 'invitationResponse')) || undefined;
        return {
          tag: 'userProfile',
          value: {
            userId: params.id || '',
            tab: UserProfileTab.parseTabId(query.tab) || undefined,
            invitation: affiliationId && response
              ? { affiliationId, response }
              : undefined
          }
        };
      }
    },
    {
      path: prefixPath('/users'),
      makeRoute() {
        return {
          tag: 'userList',
          value: null
        };
      }
    },
    {
      path: prefixPath('/'),
      makeRoute() {
        return {
          tag: 'landing',
          value: null
        };
      }
    },
    {
      path: prefixPath('/dashboard'),
      makeRoute() {
        return {
          tag: 'dashboard',
          value: null
        };
      }
    },
    {
      path: prefixPath('/learn-more/code-with-us'),
      makeRoute() {
        return {
          tag: 'learnMoreCWU',
          value: null
        };
      }
    },
    {
      path: prefixPath('/learn-more/sprint-with-us'),
      makeRoute() {
        return {
          tag: 'learnMoreSWU',
          value: null
        };
      }
    },
    {
      path: prefixPath('/opportunities'),
      makeRoute() {
        return {
          tag: 'opportunities',
          value: null
        };
      }
    },
    {
      path: prefixPath('/content/:contentId'),
      makeRoute({ params }) {
        return {
          tag: 'content',
          value: PageContent.parseContentId(params.contentId)
        };
      }
    },
    {
      path: prefixPath('/sign-in'),
      makeRoute({ query }) {
        return {
          tag: 'signIn',
          value: { redirectOnSuccess: getString(query, 'redirectOnSuccess') || undefined }
        };
      }
    },
    {
      path: prefixPath('/sign-out'),
      makeRoute() {
        return {
          tag: 'signOut',
          value: null
        };
      }
    },
    {
      path: prefixPath('/sign-up'),
      makeRoute({ query }) {
        return {
          tag: 'signUpStepOne',
          value: { redirectOnSuccess: getString(query, 'redirectOnSuccess') || undefined }
        };
      }
    },
    {
      path: prefixPath('/sign-up/complete'),
      makeRoute() {
        return {
          tag: 'signUpStepTwo',
          value: null
        };
      }
    },

    {
      path: prefixPath('/notice/:noticeId'),
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

  routeToUrl(route) {
    switch (route.tag) {
      case 'landing':
        return prefixPath('/');
      case 'dashboard':
        return prefixPath('/dashboard');
      case 'opportunities':
        return prefixPath('/opportunities');
      case 'opportunityCreate':
        return prefixPath('/opportunities/create');
      case 'learnMoreCWU':
        return prefixPath('/learn-more/code-with-us');
      case 'learnMoreSWU':
        return prefixPath('/learn-more/sprint-with-us');
      case 'content':
        return prefixPath(`/content/${route.value}`);
      case 'signIn':
        return prefixPath(`/sign-in${route.value.redirectOnSuccess ? `?redirectOnSuccess=${window.encodeURIComponent(route.value.redirectOnSuccess)}` : ''}`);
      case 'signOut':
        return prefixPath('/sign-out');
      case 'signUpStepOne':
        return prefixPath(`/sign-up${route.value.redirectOnSuccess ? `?redirectOnSuccess=${window.encodeURIComponent(route.value.redirectOnSuccess)}` : ''}`);
      case 'signUpStepTwo':
        return prefixPath(`/sign-up/complete`);
      case 'userProfile': {
        const query: string[] = [];
        if (route.value.tab) { query.push(`tab=${route.value.tab}`); }
        if (route.value.invitation) {
          query.push(`invitationAffiliationId=${route.value.invitation.affiliationId}`);
          query.push(`invitationResponse=${route.value.invitation.response}`);
        }
        let qs = '';
        if (query.length) {
          qs = `?${query.join('&')}`;
        }
        return prefixPath(`/users/${route.value.userId}${qs}`);
      }
      case 'userList':
        return prefixPath('/users');
      case 'orgList':
        return prefixPath('/organizations');
      case 'orgEdit':
        return prefixPath(`/organizations/${route.value.orgId}/edit${route.value.tab ? `?tab=${route.value.tab}` : ''}`);
      case 'orgSWUTerms':
        return prefixPath(`/organizations/${route.value.orgId}/sprint-with-us-terms-and-conditions`);
      case 'orgCreate':
        return prefixPath('/organizations/create');
      case 'proposalSWUCreate':
        return prefixPath(`/opportunities/sprint-with-us/${route.value.opportunityId}/proposals/create`);
      case 'proposalSWUEdit':
        return prefixPath(`/opportunities/sprint-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}/edit${route.value.tab ? `?tab=${route.value.tab}` : ''}`);
      case 'proposalSWUView':
        return prefixPath(`/opportunities/sprint-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}${route.value.tab ? `?tab=${route.value.tab}` : ''}`);
      case 'proposalSWUExportOne':
        return prefixPath(`/opportunities/sprint-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}/export`);
      case 'proposalSWUExportAll':
        return prefixPath(`/opportunities/sprint-with-us/${route.value.opportunityId}/proposals/export/${route.value.anonymous ? `?anonymous=${route.value.anonymous}` : ''}`);
      case 'opportunitySWUCreate':
        return prefixPath('/opportunities/sprint-with-us/create');
      case 'opportunitySWUEdit':
        return prefixPath(`/opportunities/sprint-with-us/${route.value.opportunityId}/edit${route.value.tab ? `?tab=${route.value.tab}` : ''}`);
      case 'opportunitySWUView':
        return prefixPath(`/opportunities/sprint-with-us/${route.value.opportunityId}`);
      case 'opportunityCWUCreate':
        return prefixPath('/opportunities/code-with-us/create');
      case 'opportunityCWUEdit':
        return prefixPath(`/opportunities/code-with-us/${route.value.opportunityId}/edit${route.value.tab ? `?tab=${route.value.tab}` : ''}`);
      case 'opportunityCWUView':
        return prefixPath(`/opportunities/code-with-us/${route.value.opportunityId}`);
      case 'proposalCWUCreate':
        return prefixPath(`/opportunities/code-with-us/${route.value.opportunityId}/proposals/create`);
      case 'proposalCWUEdit':
        return prefixPath(`/opportunities/code-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}/edit${route.value.tab ? `?tab=${route.value.tab}` : ''}`);
      case 'proposalCWUView':
        return prefixPath(`/opportunities/code-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}${route.value.tab ? `?tab=${route.value.tab}` : ''}`);
      case 'proposalCWUExportOne':
        return prefixPath(`/opportunities/code-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}/export`);
      case 'proposalCWUExportAll':
        return prefixPath(`/opportunities/code-with-us/${route.value.opportunityId}/proposals/export`);
      case 'proposalList':
        return prefixPath('/proposals');
      case 'notice':
        return (() => {
          switch (route.value.tag) {
            case 'deactivatedOwnAccount':
            case 'authFailure':
              return prefixPath(`/notice/${route.value.tag}`);
          }
        })();
      case 'notFound':
        return route.value.path || prefixPath('/not-found');
    }
  }

};

export default router;
