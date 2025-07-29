import { prefixPath } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import { component, router as router_ } from "front-end/lib/framework";
import * as PageNotice from "front-end/lib/pages/notice";
import * as PageGuide from "front-end/lib/pages/guide/view";
import * as CWUOpportunityEditTab from "front-end/lib/pages/opportunity/code-with-us/edit/tab";
import * as SWUOpportunityEditTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab";
import * as TWUOpportunityEditTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab";
import * as OrganizationEditTab from "front-end/lib/pages/organization/edit/tab";
import * as CWUProposalEditTab from "front-end/lib/pages/proposal/code-with-us/edit/tab";
import * as CWUProposalViewTab from "front-end/lib/pages/proposal/code-with-us/view/tab";
import * as TWUProposalViewTab from "front-end/lib/pages/proposal/team-with-us/view/tab";
import * as SWUProposalEditTab from "front-end/lib/pages/proposal/sprint-with-us/edit/tab";
import * as SWUProposalViewTab from "front-end/lib/pages/proposal/sprint-with-us/view/tab";
import * as TWUProposalEditTab from "front-end/lib/pages/proposal/team-with-us/edit/tab";
import * as UserProfileTab from "front-end/lib/pages/user/profile/tab";
import { getString } from "shared/lib";
import { adt } from "shared/lib/types";

export function pushState<Msg>(route: Route, msg: Msg): component.Cmd<Msg> {
  return component.cmd.pushUrlState(router.routeToUrl(route), msg);
}

export function replaceState<Msg>(route: Route, msg: Msg): component.Cmd<Msg> {
  return component.cmd.replaceUrlState(router.routeToUrl(route), msg);
}

/**
 * An array of route objects defined by an initial path, tag and value
 *
 * @typeParam Route - new routes below must be defined explicitly as an ADT in `type Route`
 * @see {@link Route} in `src/front-end/typescript/lib/app/types.ts`
 */
const router: router_.Router<Route> = {
  routes: [
    {
      path: prefixPath("/opportunities/create"),
      makeRoute() {
        return {
          tag: "opportunityCreate",
          value: null
        };
      }
    },
    {
      path: prefixPath("/opportunities/sprint-with-us/create"),
      makeRoute() {
        return {
          tag: "opportunitySWUCreate",
          value: null
        };
      }
    },
    {
      path: prefixPath("/opportunities/sprint-with-us/:opportunityId"),
      makeRoute({ params }) {
        return {
          tag: "opportunitySWUView",
          value: {
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath("/opportunities/sprint-with-us/:opportunityId/edit"),
      makeRoute({ params, query }) {
        return {
          tag: "opportunitySWUEdit",
          value: {
            opportunityId: params.opportunityId || "",
            tab: SWUOpportunityEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/sprint-with-us/:opportunityId/proposals/create"
      ),
      makeRoute({ params }) {
        return {
          tag: "proposalSWUCreate",
          value: {
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId/edit"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "proposalSWUEdit",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            tab: SWUProposalEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    // This route needs to be matched before `proposalSWUView`,
    // otherwise "export" gets parsed as a `proposalId`.
    {
      path: prefixPath(
        "/opportunities/sprint-with-us/:opportunityId/proposals/export"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "proposalSWUExportAll",
          value: {
            opportunityId: params.opportunityId || "",
            anonymous: query.anonymous === "true"
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "proposalSWUView",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            tab: SWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId/team-questions/evaluations/create"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "questionEvaluationIndividualSWUCreate",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            tab: SWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId/team-questions/evaluations/:userId/edit"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "questionEvaluationIndividualSWUEdit",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            userId: params.userId || "",
            tab: SWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId/team-questions/consensus/create"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "questionEvaluationConsensusSWUCreate",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            tab: SWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId/team-questions/consensus/:userId/edit"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "questionEvaluationConsensusSWUEdit",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            userId: params.userId || "",
            tab: SWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/sprint-with-us/:opportunityId/proposals/:proposalId/export"
      ),
      makeRoute({ params }) {
        return {
          tag: "proposalSWUExportOne",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath("/opportunities/code-with-us/create"),
      makeRoute() {
        return {
          tag: "opportunityCWUCreate",
          value: null
        };
      }
    },
    {
      path: prefixPath("/opportunities/code-with-us/:opportunityId/edit"),
      makeRoute({ params, query }) {
        return {
          tag: "opportunityCWUEdit",
          value: {
            opportunityId: params.opportunityId || "",
            tab: CWUOpportunityEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath("/opportunities/code-with-us/:opportunityId"),
      makeRoute({ params }) {
        return {
          tag: "opportunityCWUView",
          value: {
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/code-with-us/:opportunityId/proposals/create"
      ),
      makeRoute({ params }) {
        return {
          tag: "proposalCWUCreate",
          value: {
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/code-with-us/:opportunityId/proposals/:proposalId/edit"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "proposalCWUEdit",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            tab: CWUProposalEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    // This route needs to be matched before `proposalCWUView`,
    // otherwise "export" gets parsed as a `proposalId`.
    {
      path: prefixPath(
        "/opportunities/code-with-us/:opportunityId/proposals/export"
      ),
      makeRoute({ params }) {
        return {
          tag: "proposalCWUExportAll",
          value: {
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/code-with-us/:opportunityId/proposals/:proposalId"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "proposalCWUView",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            tab: CWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/code-with-us/:opportunityId/proposals/:proposalId/export"
      ),
      makeRoute({ params }) {
        return {
          tag: "proposalCWUExportOne",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath("/opportunities/team-with-us/create"),
      makeRoute() {
        return {
          tag: "opportunityTWUCreate",
          value: null
        };
      }
    },
    {
      path: prefixPath("/opportunities/team-with-us/:opportunityId/edit"),
      makeRoute({ params, query }) {
        return {
          tag: "opportunityTWUEdit",
          value: {
            opportunityId: params.opportunityId || "",
            tab: TWUOpportunityEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    // This route needs to be matched before `proposalTWUView`,
    // otherwise "export" gets parsed as a `proposalId`.
    {
      path: prefixPath(
        "/opportunities/team-with-us/:opportunityId/proposals/export"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "proposalTWUExportAll",
          value: {
            opportunityId: params.opportunityId || "",
            anonymous: query.anonymous === "true"
          }
        };
      }
    },
    {
      path: prefixPath("/opportunities/team-with-us/:opportunityId"),
      makeRoute({ params }) {
        return {
          tag: "opportunityTWUView",
          value: {
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/team-with-us/:opportunityId/proposals/create"
      ),
      makeRoute({ params }) {
        return {
          tag: "proposalTWUCreate",
          value: {
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/team-with-us/:opportunityId/proposals/:proposalId/edit"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "proposalTWUEdit",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            tab: TWUProposalEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/team-with-us/:opportunityId/proposals/:proposalId"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "proposalTWUView",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            tab: TWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/team-with-us/:opportunityId/proposals/:proposalId/resource-questions/evaluations/create"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "questionEvaluationIndividualTWUCreate",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            tab: TWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/team-with-us/:opportunityId/proposals/:proposalId/resource-questions/evaluations/:userId/edit"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "questionEvaluationIndividualTWUEdit",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            userId: params.userId || "",
            tab: TWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/team-with-us/:opportunityId/proposals/:proposalId/resource-questions/consensus/create"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "questionEvaluationConsensusTWUCreate",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            tab: TWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/team-with-us/:opportunityId/proposals/:proposalId/resource-questions/consensus/:userId/edit"
      ),
      makeRoute({ params, query }) {
        return {
          tag: "questionEvaluationConsensusTWUEdit",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || "",
            userId: params.userId || "",
            tab: TWUProposalViewTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/opportunities/team-with-us/:opportunityId/proposals/:proposalId/export"
      ),
      makeRoute({ params }) {
        return {
          tag: "proposalTWUExportOne",
          value: {
            proposalId: params.proposalId || "",
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath("/proposals"),
      makeRoute() {
        return {
          tag: "proposalList",
          value: null
        };
      }
    },
    {
      path: prefixPath("/organizations"),
      makeRoute({ query }) {
        return {
          tag: "orgList",
          value: {
            page: parseInt(getString(query, "page"), 10) || undefined
          }
        };
      }
    },
    {
      path: prefixPath("/organizations/create"),
      makeRoute() {
        return {
          tag: "orgCreate",
          value: null
        };
      }
    },
    {
      path: prefixPath("/organizations/:id/edit"),
      makeRoute({ params, query }) {
        return {
          tag: "orgEdit",
          value: {
            orgId: params.id || "",
            tab: OrganizationEditTab.parseTabId(query.tab) || undefined
          }
        };
      }
    },
    {
      path: prefixPath(
        "/organizations/:id/sprint-with-us-terms-and-conditions"
      ),
      makeRoute({ params }) {
        return {
          tag: "orgSWUTerms",
          value: {
            orgId: params.id || ""
          }
        };
      }
    },
    {
      path: prefixPath("/organizations/:id/team-with-us-terms-and-conditions"),
      makeRoute({ params }) {
        return adt("orgTWUTerms", {
          orgId: params.id || ""
        });
      }
    },
    {
      path: prefixPath("/users/:id"),
      makeRoute({ params, query }) {
        const affiliationId =
          getString(query, "invitationAffiliationId") || undefined;
        const response =
          UserProfileTab.parseInvitationResponseParam(
            getString(query, "invitationResponse")
          ) || undefined;
        return {
          tag: "userProfile",
          value: {
            userId: params.id || "",
            tab: UserProfileTab.parseTabId(query.tab) || undefined,
            invitation:
              affiliationId && response
                ? { affiliationId, response }
                : undefined,
            ...("unsubscribe" in query && { unsubscribe: true })
          }
        };
      }
    },
    {
      path: prefixPath("/users"),
      makeRoute() {
        return {
          tag: "userList",
          value: null
        };
      }
    },
    {
      path: prefixPath("/"),
      makeRoute() {
        return {
          tag: "landing",
          value: null
        };
      }
    },
    {
      path: prefixPath("/dashboard"),
      makeRoute() {
        return {
          tag: "dashboard",
          value: null
        };
      }
    },
    {
      path: prefixPath("/learn-more/code-with-us"),
      makeRoute() {
        return {
          tag: "learnMoreCWU",
          value: null
        };
      }
    },
    {
      path: prefixPath("/learn-more/team-with-us"),
      makeRoute() {
        return {
          tag: "learnMoreTWU",
          value: null
        };
      }
    },
    {
      path: prefixPath("/learn-more/sprint-with-us"),
      makeRoute() {
        return {
          tag: "learnMoreSWU",
          value: null
        };
      }
    },
    {
      path: prefixPath("/opportunities"),
      makeRoute() {
        return {
          tag: "opportunities",
          value: null
        };
      }
    },
    {
      path: prefixPath("/content"),
      makeRoute() {
        return adt("contentList", null);
      }
    },
    {
      path: prefixPath("/content/create"),
      makeRoute() {
        return adt("contentCreate", null);
      }
    },
    {
      path: prefixPath("/content/:contentId/edit"),
      makeRoute({ params }) {
        return adt("contentEdit", getString(params, "contentId"));
      }
    },
    {
      path: prefixPath("/content/:contentId"),
      makeRoute({ params }) {
        return adt("contentView", getString(params, "contentId"));
      }
    },
    {
      path: prefixPath("/sign-in"),
      makeRoute({ query }) {
        return {
          tag: "signIn",
          value: {
            redirectOnSuccess:
              getString(query, "redirectOnSuccess") || undefined
          }
        };
      }
    },
    {
      path: prefixPath("/sign-out"),
      makeRoute() {
        return {
          tag: "signOut",
          value: null
        };
      }
    },
    {
      path: prefixPath("/sign-up"),
      makeRoute({ query }) {
        return {
          tag: "signUpStepOne",
          value: {
            redirectOnSuccess:
              getString(query, "redirectOnSuccess") || undefined
          }
        };
      }
    },
    {
      path: prefixPath("/sign-up/complete"),
      makeRoute() {
        return {
          tag: "signUpStepTwo",
          value: null
        };
      }
    },

    {
      path: prefixPath("/notice/:noticeId"),
      makeRoute({ path, params }) {
        const noticeId = PageNotice.parseNoticeId(params.noticeId);
        return noticeId ? adt("notice", noticeId) : adt("notFound", { path });
      }
    },
    {
      path: prefixPath("/cwu/:guideAudience"),
      makeRoute({ path, params }) {
        return PageGuide.isGuideAudience(params.guideAudience)
          ? adt("cwuGuide", { guideAudience: params.guideAudience })
          : adt("notFound", { path });
      }
    },
    {
      path: prefixPath("/swu/:guideAudience"),
      makeRoute({ path, params }) {
        return PageGuide.isGuideAudience(params.guideAudience)
          ? adt("swuGuide", { guideAudience: params.guideAudience })
          : adt("notFound", { path });
      }
    },
    {
      path: prefixPath("/twu/:guideAudience"),
      makeRoute({ path, params }) {
        return PageGuide.isGuideAudience(params.guideAudience)
          ? adt("twuGuide", { guideAudience: params.guideAudience })
          : adt("notFound", { path });
      }
    },
    {
      path: prefixPath("/opportunities/sprint-with-us/:opportunityId/complete"),
      makeRoute({ params }) {
        return {
          tag: "swuOpportunityCompleteView",
          value: {
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath("/opportunities/code-with-us/:opportunityId/complete"),
      makeRoute({ params }) {
        return {
          tag: "cwuOpportunityCompleteView",
          value: {
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: prefixPath("/opportunities/team-with-us/:opportunityId/complete"),
      makeRoute({ params }) {
        return {
          tag: "twuOpportunityCompleteView",
          value: {
            opportunityId: params.opportunityId || ""
          }
        };
      }
    },
    {
      path: "*path",
      makeRoute({ path }) {
        return adt("notFound", { path });
      }
    }
  ],

  routeToUrl(route) {
    switch (route.tag) {
      case "landing":
        return prefixPath("/");
      case "dashboard":
        return prefixPath("/dashboard");
      case "opportunities":
        return prefixPath("/opportunities");
      case "opportunityCreate":
        return prefixPath("/opportunities/create");
      case "learnMoreCWU":
        return prefixPath("/learn-more/code-with-us");
      case "learnMoreTWU":
        return prefixPath("/learn-more/team-with-us");
      case "learnMoreSWU":
        return prefixPath("/learn-more/sprint-with-us");
      case "contentList":
        return prefixPath("/content");
      case "contentCreate":
        return prefixPath("/content/create");
      case "contentEdit":
        return prefixPath(`/content/${route.value}/edit`);
      case "contentView":
        return prefixPath(`/content/${route.value}`);
      case "signIn":
        return prefixPath(
          `/sign-in${
            route.value.redirectOnSuccess
              ? `?redirectOnSuccess=${window.encodeURIComponent(
                  route.value.redirectOnSuccess
                )}`
              : ""
          }`
        );
      case "signOut":
        return prefixPath("/sign-out");
      case "signUpStepOne":
        return prefixPath(
          `/sign-up${
            route.value.redirectOnSuccess
              ? `?redirectOnSuccess=${window.encodeURIComponent(
                  route.value.redirectOnSuccess
                )}`
              : ""
          }`
        );
      case "signUpStepTwo":
        return prefixPath(`/sign-up/complete`);
      case "userProfile": {
        const query: string[] = [];
        if (route.value.tab) {
          query.push(`tab=${route.value.tab}`);
        }
        if (route.value.invitation) {
          query.push(
            `invitationAffiliationId=${route.value.invitation.affiliationId}`
          );
          query.push(`invitationResponse=${route.value.invitation.response}`);
        }
        if (route.value.unsubscribe) {
          query.push("unsubscribe");
        }
        let qs = "";
        if (query.length) {
          qs = `?${query.join("&")}`;
        }
        return prefixPath(`/users/${route.value.userId}${qs}`);
      }
      case "userList":
        return prefixPath("/users");
      case "orgList":
        return prefixPath(
          `/organizations${
            route.value.page
              ? `?page=${window.encodeURIComponent(route.value.page)}`
              : ""
          }`
        );
      case "orgEdit":
        return prefixPath(
          `/organizations/${route.value.orgId}/edit${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "orgSWUTerms":
        return prefixPath(
          `/organizations/${route.value.orgId}/sprint-with-us-terms-and-conditions`
        );
      case "orgTWUTerms":
        return prefixPath(
          `/organizations/${route.value.orgId}/team-with-us-terms-and-conditions`
        );
      case "orgCreate":
        return prefixPath("/organizations/create");
      case "proposalSWUCreate":
        return prefixPath(
          `/opportunities/sprint-with-us/${route.value.opportunityId}/proposals/create`
        );
      case "proposalSWUEdit":
        return prefixPath(
          `/opportunities/sprint-with-us/${
            route.value.opportunityId
          }/proposals/${route.value.proposalId}/edit${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "proposalSWUView":
        return prefixPath(
          `/opportunities/sprint-with-us/${
            route.value.opportunityId
          }/proposals/${route.value.proposalId}${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "questionEvaluationIndividualSWUCreate":
        return prefixPath(
          `/opportunities/sprint-with-us/${
            route.value.opportunityId
          }/proposals/${
            route.value.proposalId
          }/team-questions/evaluations/create${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "questionEvaluationIndividualSWUEdit":
        return prefixPath(
          `/opportunities/sprint-with-us/${
            route.value.opportunityId
          }/proposals/${route.value.proposalId}/team-questions/evaluations/${
            route.value.userId
          }/edit${route.value.tab ? `?tab=${route.value.tab}` : ""}`
        );
      case "questionEvaluationConsensusSWUCreate":
        return prefixPath(
          `/opportunities/sprint-with-us/${
            route.value.opportunityId
          }/proposals/${
            route.value.proposalId
          }/team-questions/consensus/create${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "questionEvaluationConsensusSWUEdit":
        return prefixPath(
          `/opportunities/sprint-with-us/${
            route.value.opportunityId
          }/proposals/${route.value.proposalId}/team-questions/consensus/${
            route.value.userId
          }/edit${route.value.tab ? `?tab=${route.value.tab}` : ""}`
        );
      case "proposalSWUExportOne":
        return prefixPath(
          `/opportunities/sprint-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}/export`
        );
      case "proposalSWUExportAll":
        return prefixPath(
          `/opportunities/sprint-with-us/${
            route.value.opportunityId
          }/proposals/export/${
            route.value.anonymous ? `?anonymous=${route.value.anonymous}` : ""
          }`
        );
      case "opportunitySWUCreate":
        return prefixPath("/opportunities/sprint-with-us/create");
      case "opportunitySWUEdit":
        return prefixPath(
          `/opportunities/sprint-with-us/${route.value.opportunityId}/edit${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "opportunitySWUView":
        return prefixPath(
          `/opportunities/sprint-with-us/${route.value.opportunityId}`
        );
      case "opportunityTWUCreate":
        return prefixPath("/opportunities/team-with-us/create");
      case "opportunityTWUEdit":
        return prefixPath(
          `/opportunities/team-with-us/${route.value.opportunityId}/edit${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "opportunityTWUView":
        return prefixPath(
          `/opportunities/team-with-us/${route.value.opportunityId}`
        );
      case "proposalTWUExportOne":
        return prefixPath(
          `/opportunities/team-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}/export`
        );
      case "proposalTWUExportAll":
        return prefixPath(
          `/opportunities/team-with-us/${
            route.value.opportunityId
          }/proposals/export/${
            route.value.anonymous ? `?anonymous=${route.value.anonymous}` : ""
          }`
        );
      case "proposalTWUCreate":
        return prefixPath(
          `/opportunities/team-with-us/${route.value.opportunityId}/proposals/create`
        );
      case "proposalTWUEdit":
        return prefixPath(
          `/opportunities/team-with-us/${route.value.opportunityId}/proposals/${
            route.value.proposalId
          }/edit${route.value.tab ? `?tab=${route.value.tab}` : ""}`
        );
      case "proposalTWUView":
        return prefixPath(
          `/opportunities/team-with-us/${route.value.opportunityId}/proposals/${
            route.value.proposalId
          }${route.value.tab ? `?tab=${route.value.tab}` : ""}`
        );
      case "questionEvaluationIndividualTWUCreate":
        return prefixPath(
          `/opportunities/team-with-us/${route.value.opportunityId}/proposals/${
            route.value.proposalId
          }/resource-questions/evaluations/create${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "questionEvaluationIndividualTWUEdit":
        return prefixPath(
          `/opportunities/team-with-us/${route.value.opportunityId}/proposals/${
            route.value.proposalId
          }/resource-questions/evaluations/${route.value.userId}/edit${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "questionEvaluationConsensusTWUCreate":
        return prefixPath(
          `/opportunities/team-with-us/${route.value.opportunityId}/proposals/${
            route.value.proposalId
          }/resource-questions/consensus/create${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "questionEvaluationConsensusTWUEdit":
        return prefixPath(
          `/opportunities/team-with-us/${route.value.opportunityId}/proposals/${
            route.value.proposalId
          }/resource-questions/consensus/${route.value.userId}/edit${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "opportunityCWUCreate":
        return prefixPath("/opportunities/code-with-us/create");
      case "opportunityCWUEdit":
        return prefixPath(
          `/opportunities/code-with-us/${route.value.opportunityId}/edit${
            route.value.tab ? `?tab=${route.value.tab}` : ""
          }`
        );
      case "opportunityCWUView":
        return prefixPath(
          `/opportunities/code-with-us/${route.value.opportunityId}`
        );
      case "proposalCWUCreate":
        return prefixPath(
          `/opportunities/code-with-us/${route.value.opportunityId}/proposals/create`
        );
      case "proposalCWUEdit":
        return prefixPath(
          `/opportunities/code-with-us/${route.value.opportunityId}/proposals/${
            route.value.proposalId
          }/edit${route.value.tab ? `?tab=${route.value.tab}` : ""}`
        );
      case "proposalCWUView":
        return prefixPath(
          `/opportunities/code-with-us/${route.value.opportunityId}/proposals/${
            route.value.proposalId
          }${route.value.tab ? `?tab=${route.value.tab}` : ""}`
        );
      case "proposalCWUExportOne":
        return prefixPath(
          `/opportunities/code-with-us/${route.value.opportunityId}/proposals/${route.value.proposalId}/export`
        );
      case "proposalCWUExportAll":
        return prefixPath(
          `/opportunities/code-with-us/${route.value.opportunityId}/proposals/export`
        );
      case "proposalList":
        return prefixPath("/proposals");
      case "notice":
        return (() => {
          switch (route.value.tag) {
            case "deactivatedOwnAccount":
            case "authFailure":
              return prefixPath(`/notice/${route.value.tag}`);
          }
        })();
      case "cwuGuide":
        return prefixPath(`/cwu/${route.value.guideAudience}`);
      case "swuGuide":
        return prefixPath(`/swu/${route.value.guideAudience}`);
      case "twuGuide":
        return prefixPath(`/twu/${route.value.guideAudience}`);
      case "swuOpportunityCompleteView":
        return prefixPath(
          `/opportunities/sprint-with-us/${route.value.opportunityId}/complete`
        );
      case "cwuOpportunityCompleteView":
        return prefixPath(
          `/opportunities/code-with-us/${route.value.opportunityId}/complete`
        );
      case "twuOpportunityCompleteView":
        return prefixPath(
          `/opportunities/team-with-us/${route.value.opportunityId}/complete`
        );
      case "notFound":
        return route.value.path || prefixPath("/not-found");
    }
  }
};

export default router;
