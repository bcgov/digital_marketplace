import { TOAST_AUTO_DISMISS_DURATION } from "front-end/config";
import { makeStartLoading, makeStopLoading } from "front-end/lib";
import router from "front-end/lib/app/router";
import {
  isAllowedRouteForUsersWithUnacceptedTerms,
  Msg,
  InnerMsg,
  Route,
  State
} from "front-end/lib/app/types";
import * as Nav from "front-end/lib/app/view/nav";
import * as AcceptNewTerms from "front-end/lib/components/accept-new-app-terms";
import { immutable, Immutable, component } from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as PageContentCreate from "front-end/lib/pages/content/create";
import * as PageContentEdit from "front-end/lib/pages/content/edit";
import * as PageContentList from "front-end/lib/pages/content/list";
import * as PageContentView from "front-end/lib/pages/content/view";
import * as PageGuideView from "front-end/lib/pages/guide/view";
import * as PageDashboard from "front-end/lib/pages/dashboard";
import * as PageLanding from "front-end/lib/pages/landing";
import * as PageLearnMoreCWU from "front-end/lib/pages/learn-more/code-with-us";
import * as PageLearnMoreTWU from "front-end/lib/pages/learn-more/team-with-us";
import * as PageLearnMoreSWU from "front-end/lib/pages/learn-more/sprint-with-us";
import * as PageNotFound from "front-end/lib/pages/not-found";
import * as PageNotice from "front-end/lib/pages/notice";
import * as PageOpportunityCWUCreate from "front-end/lib/pages/opportunity/code-with-us/create";
import * as PageOpportunityCWUEdit from "front-end/lib/pages/opportunity/code-with-us/edit";
import * as PageOpportunityCWUView from "front-end/lib/pages/opportunity/code-with-us/view";
import * as PageOpportunityCreate from "front-end/lib/pages/opportunity/create";
import * as PageOpportunities from "front-end/lib/pages/opportunity/list";
import * as PageOpportunitySWUCreate from "front-end/lib/pages/opportunity/sprint-with-us/create";
import * as PageOpportunitySWUEdit from "front-end/lib/pages/opportunity/sprint-with-us/edit";
import * as PageOpportunitySWUView from "front-end/lib/pages/opportunity/sprint-with-us/view";
import * as PageOpportunityTWUCreate from "front-end/lib/pages/opportunity/team-with-us/create";
import * as PageOpportunityTWUEdit from "front-end/lib/pages/opportunity/team-with-us/edit";
import * as PageOpportunityTWUView from "front-end/lib/pages/opportunity/team-with-us/view";
import * as PageOrgCreate from "front-end/lib/pages/organization/create";
import * as PageOrgEdit from "front-end/lib/pages/organization/edit";
import * as PageOrgList from "front-end/lib/pages/organization/list";
import * as PageOrgSWUTerms from "front-end/lib/pages/organization/sprint-with-us-terms";
import * as PageOrgTWUTerms from "front-end/lib/pages/organization/team-with-us-terms";
import * as PageProposalCWUCreate from "front-end/lib/pages/proposal/code-with-us/create";
import * as PageProposalCWUEdit from "front-end/lib/pages/proposal/code-with-us/edit";
import * as PageProposalCWUExportAll from "front-end/lib/pages/proposal/code-with-us/export/all";
import * as PageProposalCWUExportOne from "front-end/lib/pages/proposal/code-with-us/export/one";
import * as PageProposalCWUView from "front-end/lib/pages/proposal/code-with-us/view";
import * as PageProposalList from "front-end/lib/pages/proposal/list";
import * as PageProposalSWUCreate from "front-end/lib/pages/proposal/sprint-with-us/create";
import * as PageProposalSWUEdit from "front-end/lib/pages/proposal/sprint-with-us/edit";
import * as PageProposalSWUExportAll from "front-end/lib/pages/proposal/sprint-with-us/export/all";
import * as PageProposalSWUExportOne from "front-end/lib/pages/proposal/sprint-with-us/export/one";
import * as PageProposalSWUView from "front-end/lib/pages/proposal/sprint-with-us/view";
import * as PageQuestionEvaluationIndividualSWUCreate from "front-end/lib/pages/evaluations/sprint-with-us/team-questions/create-individual";
import * as PageQuestionEvaluationIndividualSWUEdit from "front-end/lib/pages/evaluations/sprint-with-us/team-questions/edit-individual";
import * as PageQuestionEvaluationConsensusSWUCreate from "front-end/lib/pages/evaluations/sprint-with-us/team-questions/create-consensus";
import * as PageQuestionEvaluationConsensusSWUEdit from "front-end/lib/pages/evaluations/sprint-with-us/team-questions/edit-consensus";
import * as PageQuestionEvaluationIndividualTWUCreate from "front-end/lib/pages/evaluations/team-with-us/resource-questions/create-individual";
import * as PageQuestionEvaluationIndividualTWUEdit from "front-end/lib/pages/evaluations/team-with-us/resource-questions/edit-individual";
import * as PageQuestionEvaluationConsensusTWUCreate from "front-end/lib/pages/evaluations/team-with-us/resource-questions/create-consensus";
import * as PageQuestionEvaluationConsensusTWUEdit from "front-end/lib/pages/evaluations/team-with-us/resource-questions/edit-consensus";
import * as PageProposalTWUCreate from "front-end/lib/pages/proposal/team-with-us/create";
import * as PageProposalTWUView from "front-end/lib/pages/proposal/team-with-us/view";
import * as PageProposalTWUEdit from "front-end/lib/pages/proposal/team-with-us/edit";
import * as PageProposalTWUExportAll from "front-end/lib/pages/proposal/team-with-us/export/all";
import * as PageProposalTWUExportOne from "front-end/lib/pages/proposal/team-with-us/export/one";
import * as PageSignIn from "front-end/lib/pages/sign-in";
import * as PageSignOut from "front-end/lib/pages/sign-out";
import * as PageSignUpStepOne from "front-end/lib/pages/sign-up/step-one";
import * as PageSignUpStepTwo from "front-end/lib/pages/sign-up/step-two";
import * as PageUserList from "front-end/lib/pages/user/list";
import * as PageUserProfile from "front-end/lib/pages/user/profile";
import {
  CURRENT_SESSION_ID,
  hasAcceptedTermsOrIsAnonymous,
  Session
} from "shared/lib/resources/session";
import { adt, ADT, adtCurried } from "shared/lib/types";
import * as PageOpportunityCWUComplete from "front-end/lib/pages/opportunity/code-with-us/complete";
import * as PageOpportunityTWUComplete from "front-end/lib/pages/opportunity/team-with-us/complete";
import * as PageOpportunitySWUComplete from "front-end/lib/pages/opportunity/sprint-with-us/complete";

function setSession(
  state: Immutable<State>,
  validated: api.ResponseValidation<Session, string[]>
): Immutable<State> {
  return state.set("shared", {
    session: validated.tag === "valid" ? validated.value : null
  });
}

const startAcceptNewTermsLoading = makeStartLoading<State>(
  "acceptNewTermsLoading"
);
const stopAcceptNewTermsLoading = makeStopLoading<State>(
  "acceptNewTermsLoading"
);

/**
 * Initializing a page requires both state and route.
 * Gives precedence to app modals over page modals
 *
 * @param state - of type Immutable from immutable.js. New pages need to be added to State Interface.
 * @param route - the route.tag value used as the conditional in a switch/case statement to modify what app component is returned
 * @returns - base component with state, session (shared state), route, path + params, msg, metadata
 *
 * @see State in `src/front-end/typescript/lib/app/types.ts`
 */
function initPage(
  state: Immutable<State>,
  route: Route
): component.base.InitReturnValue<Immutable<State>, Msg> {
  const defaultPageInitParams = {
    state,
    routePath: router.routeToUrl(route),
    getSharedState(state: Immutable<State>) {
      return state.shared;
    },
    noopMsg: adt("noop") as Msg
  };

  switch (route.tag) {
    case "orgEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "orgEdit"],
        pageRouteParams: route.value,
        pageInit: PageOrgEdit.component.init,
        pageGetMetadata: PageOrgEdit.component.getMetadata,
        mapPageMsg(msg) {
          return adt("pageOrgEdit", msg);
        }
      });

    case "orgSWUTerms":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "orgSWUTerms"],
        pageRouteParams: route.value,
        pageInit: PageOrgSWUTerms.component.init,
        pageGetMetadata: PageOrgSWUTerms.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOrgSWUTerms", value);
        }
      });

    case "orgTWUTerms":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "orgTWUTerms"],
        pageRouteParams: route.value,
        pageInit: PageOrgTWUTerms.component.init,
        pageGetMetadata: PageOrgTWUTerms.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOrgTWUTerms", value);
        }
      });

    case "proposalSWUEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalSWUEdit"],
        pageRouteParams: route.value,
        pageInit: PageProposalSWUEdit.component.init,
        pageGetMetadata: PageProposalSWUEdit.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalSWUEdit", value) as Msg;
        }
      });
    case "proposalSWUCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalSWUCreate"],
        pageRouteParams: route.value,
        pageInit: PageProposalSWUCreate.component.init,
        pageGetMetadata: PageProposalSWUCreate.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalSWUCreate", value);
        }
      });
    case "proposalSWUView":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalSWUView"],
        pageRouteParams: route.value,
        pageInit: PageProposalSWUView.component.init,
        pageGetMetadata: PageProposalSWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalSWUView", value) as Msg;
        }
      });
    case "questionEvaluationIndividualSWUCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalSWUView"],
        pageRouteParams: route.value,
        pageInit: PageQuestionEvaluationIndividualSWUCreate.component.init,
        pageGetMetadata: PageProposalSWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalSWUView", value) as Msg;
        }
      });
    case "questionEvaluationIndividualSWUEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalSWUView"],
        pageRouteParams: route.value,
        pageInit: PageQuestionEvaluationIndividualSWUEdit.component.init,
        pageGetMetadata: PageProposalSWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalSWUView", value) as Msg;
        }
      });
    case "questionEvaluationConsensusSWUCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalSWUView"],
        pageRouteParams: route.value,
        pageInit: PageQuestionEvaluationConsensusSWUCreate.component.init,
        pageGetMetadata: PageProposalSWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalSWUView", value) as Msg;
        }
      });
    case "questionEvaluationConsensusSWUEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalSWUView"],
        pageRouteParams: route.value,
        pageInit: PageQuestionEvaluationConsensusSWUEdit.component.init,
        pageGetMetadata: PageProposalSWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalSWUView", value) as Msg;
        }
      });

    case "opportunitySWUEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "opportunitySWUEdit"],
        pageRouteParams: route.value,
        pageInit: PageOpportunitySWUEdit.component.init,
        pageGetMetadata: PageOpportunitySWUEdit.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunitySWUEdit", value) as Msg;
        }
      });
    case "opportunitySWUCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "opportunitySWUCreate"],
        pageRouteParams: route.value,
        pageInit: PageOpportunitySWUCreate.component.init,
        pageGetMetadata: PageOpportunitySWUCreate.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunitySWUCreate", value);
        }
      });
    case "opportunitySWUView":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "opportunitySWUView"],
        pageRouteParams: route.value,
        pageInit: PageOpportunitySWUView.component.init,
        pageGetMetadata: PageOpportunitySWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunitySWUView", value);
        }
      });
    case "opportunityTWUCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "opportunityTWUCreate"],
        pageRouteParams: route.value,
        pageInit: PageOpportunityTWUCreate.component.init,
        pageGetMetadata: PageOpportunityTWUCreate.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunityTWUCreate", value);
        }
      });
    case "opportunityTWUView":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "opportunityTWUView"],
        pageRouteParams: route.value,
        pageInit: PageOpportunityTWUView.component.init,
        pageGetMetadata: PageOpportunityTWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunityTWUView", value);
        }
      });
    case "opportunityTWUEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "opportunityTWUEdit"],
        pageRouteParams: route.value,
        pageInit: PageOpportunityTWUEdit.component.init,
        pageGetMetadata: PageOpportunityTWUEdit.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunityTWUEdit", value) as Msg;
        }
      });
    case "opportunityCWUCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "opportunityCWUCreate"],
        pageRouteParams: route.value,
        pageInit: PageOpportunityCWUCreate.component.init,
        pageGetMetadata: PageOpportunityCWUCreate.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunityCWUCreate", value);
        }
      });
    case "opportunityCWUEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "opportunityCWUEdit"],
        pageRouteParams: route.value,
        pageInit: PageOpportunityCWUEdit.component.init,
        pageGetMetadata: PageOpportunityCWUEdit.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunityCWUEdit", value) as Msg;
        }
      });
    case "opportunityCWUView":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "opportunityCWUView"],
        pageRouteParams: route.value,
        pageInit: PageOpportunityCWUView.component.init,
        pageGetMetadata: PageOpportunityCWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunityCWUView", value);
        }
      });

    case "proposalCWUCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalCWUCreate"],
        pageRouteParams: route.value,
        pageInit: PageProposalCWUCreate.component.init,
        pageGetMetadata: PageProposalCWUCreate.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalCWUCreate", value);
        }
      });
    case "proposalCWUEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalCWUEdit"],
        pageRouteParams: route.value,
        pageInit: PageProposalCWUEdit.component.init,
        pageGetMetadata: PageProposalCWUEdit.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalCWUEdit", value) as Msg;
        }
      });
    case "proposalCWUView":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalCWUView"],
        pageRouteParams: route.value,
        pageInit: PageProposalCWUView.component.init,
        pageGetMetadata: PageProposalCWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalCWUView", value) as Msg;
        }
      });
    case "proposalCWUExportOne":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalCWUExportOne"],
        pageRouteParams: route.value,
        pageInit: PageProposalCWUExportOne.component.init,
        pageGetMetadata: PageProposalCWUExportOne.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalCWUExportOne", value);
        }
      });
    case "proposalCWUExportAll":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalCWUExportAll"],
        pageRouteParams: route.value,
        pageInit: PageProposalCWUExportAll.component.init,
        pageGetMetadata: PageProposalCWUExportAll.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalCWUExportAll", value);
        }
      });
    case "proposalSWUExportOne":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalSWUExportOne"],
        pageRouteParams: route.value,
        pageInit: PageProposalSWUExportOne.component.init,
        pageGetMetadata: PageProposalSWUExportOne.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalSWUExportOne", value);
        }
      });
    case "proposalSWUExportAll":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalSWUExportAll"],
        pageRouteParams: route.value,
        pageInit: PageProposalSWUExportAll.component.init,
        pageGetMetadata: PageProposalSWUExportAll.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalSWUExportAll", value);
        }
      });
    case "proposalTWUExportOne":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalTWUExportOne"],
        pageRouteParams: route.value,
        pageInit: PageProposalTWUExportOne.component.init,
        pageGetMetadata: PageProposalTWUExportOne.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalTWUExportOne", value);
        }
      });
    case "proposalTWUExportAll":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalTWUExportAll"],
        pageRouteParams: route.value,
        pageInit: PageProposalTWUExportAll.component.init,
        pageGetMetadata: PageProposalTWUExportAll.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalTWUExportAll", value);
        }
      });
    case "proposalTWUCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalTWUCreate"],
        pageRouteParams: route.value,
        pageInit: PageProposalTWUCreate.component.init,
        pageGetMetadata: PageProposalTWUCreate.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalTWUCreate", value);
        }
      });
    case "proposalTWUEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalTWUEdit"],
        pageRouteParams: route.value,
        pageInit: PageProposalTWUEdit.component.init,
        pageGetMetadata: PageProposalTWUEdit.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalTWUEdit", value);
        }
      });
    case "proposalTWUView":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalTWUView"],
        pageRouteParams: route.value,
        pageInit: PageProposalTWUView.component.init,
        pageGetMetadata: PageProposalTWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalTWUView", value);
        }
      });
    case "questionEvaluationIndividualTWUCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalTWUView"],
        pageRouteParams: route.value,
        pageInit: PageQuestionEvaluationIndividualTWUCreate.component.init,
        pageGetMetadata: PageProposalTWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalTWUView", value) as Msg;
        }
      });
    case "questionEvaluationIndividualTWUEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalTWUView"],
        pageRouteParams: route.value,
        pageInit: PageQuestionEvaluationIndividualTWUEdit.component.init,
        pageGetMetadata: PageProposalTWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalTWUView", value) as Msg;
        }
      });
    case "questionEvaluationConsensusTWUCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalTWUView"],
        pageRouteParams: route.value,
        pageInit: PageQuestionEvaluationConsensusTWUCreate.component.init,
        pageGetMetadata: PageProposalTWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalTWUView", value) as Msg;
        }
      });
    case "questionEvaluationConsensusTWUEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalTWUView"],
        pageRouteParams: route.value,
        pageInit: PageQuestionEvaluationConsensusTWUEdit.component.init,
        pageGetMetadata: PageProposalTWUView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalTWUView", value) as Msg;
        }
      });
    case "proposalList":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "proposalList"],
        pageRouteParams: route.value,
        pageInit: PageProposalList.component.init,
        pageGetMetadata: PageProposalList.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageProposalList", value);
        }
      });

    case "orgCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "orgCreate"],
        pageRouteParams: route.value,
        pageInit: PageOrgCreate.component.init,
        pageGetMetadata: PageOrgCreate.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOrgCreate", value);
        }
      });

    case "orgList":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "orgList"],
        pageRouteParams: route.value,
        pageInit: PageOrgList.component.init,
        pageGetMetadata: PageOrgList.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOrgList", value);
        }
      });

    case "userProfile":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "userProfile"],
        pageRouteParams: route.value,
        pageInit: PageUserProfile.component.init,
        pageGetMetadata: PageUserProfile.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageUserProfile", value) as Msg;
        }
      });

    case "userList":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "userList"],
        pageRouteParams: route.value,
        pageInit: PageUserList.component.init,
        pageGetMetadata: PageUserList.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageUserList", value);
        }
      });

    case "landing":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "landing"],
        pageRouteParams: route.value,
        pageInit: PageLanding.component.init,
        pageGetMetadata: PageLanding.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageLanding", value);
        }
      });

    case "dashboard":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "dashboard"],
        pageRouteParams: route.value,
        pageInit: PageDashboard.component.init,
        pageGetMetadata: PageDashboard.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageDashboard", value);
        }
      });

    case "opportunities":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "opportunities"],
        pageRouteParams: route.value,
        pageInit: PageOpportunities.component.init,
        pageGetMetadata: PageOpportunities.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunities", value);
        }
      });

    case "opportunityCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "opportunityCreate"],
        pageRouteParams: route.value,
        pageInit: PageOpportunityCreate.component.init,
        pageGetMetadata: PageOpportunityCreate.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunityCreate", value);
        }
      });

    case "learnMoreCWU":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "learnMoreCWU"],
        pageRouteParams: route.value,
        pageInit: PageLearnMoreCWU.component.init,
        pageGetMetadata: PageLearnMoreCWU.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageLearnMoreCWU", value);
        }
      });

    case "learnMoreTWU":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "learnMoreTWU"],
        pageRouteParams: route.value,
        pageInit: PageLearnMoreTWU.component.init,
        pageGetMetadata: PageLearnMoreTWU.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageLearnMoreTWU", value);
        }
      });

    case "learnMoreSWU":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "learnMoreSWU"],
        pageRouteParams: route.value,
        pageInit: PageLearnMoreSWU.component.init,
        pageGetMetadata: PageLearnMoreSWU.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageLearnMoreSWU", value);
        }
      });

    case "cwuGuide":
    case "swuGuide":
    case "twuGuide":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "contentView"],
        pageRouteParams: route.value,
        pageInit: PageGuideView.init,
        pageGetMetadata: PageContentView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageContentView", value);
        }
      });

    case "contentView":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "contentView"],
        pageRouteParams: route.value,
        pageInit: PageContentView.component.init,
        pageGetMetadata: PageContentView.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageContentView", value);
        }
      });

    case "contentCreate":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "contentCreate"],
        pageRouteParams: route.value,
        pageInit: PageContentCreate.component.init,
        pageGetMetadata: PageContentCreate.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageContentCreate", value);
        }
      });

    case "contentEdit":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "contentEdit"],
        pageRouteParams: route.value,
        pageInit: PageContentEdit.component.init,
        pageGetMetadata: PageContentEdit.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageContentEdit", value);
        }
      });

    case "contentList":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "contentList"],
        pageRouteParams: route.value,
        pageInit: PageContentList.component.init,
        pageGetMetadata: PageContentList.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageContentList", value);
        }
      });

    case "signIn":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "signIn"],
        pageRouteParams: route.value,
        pageInit: PageSignIn.component.init,
        pageGetMetadata: PageSignIn.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageSignIn", value);
        }
      });

    case "signOut":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "signOut"],
        pageRouteParams: route.value,
        pageInit: PageSignOut.component.init,
        pageGetMetadata: PageSignOut.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageSignOut", value);
        }
      });

    case "signUpStepOne":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "signUpStepOne"],
        pageRouteParams: route.value,
        pageInit: PageSignUpStepOne.component.init,
        pageGetMetadata: PageSignUpStepOne.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageSignUpStepOne", value);
        }
      });

    case "signUpStepTwo":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "signUpStepTwo"],
        pageRouteParams: route.value,
        pageInit: PageSignUpStepTwo.component.init,
        pageGetMetadata: PageSignUpStepTwo.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageSignUpStepTwo", value);
        }
      });

    case "notice":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "notice"],
        pageRouteParams: route.value,
        pageInit: PageNotice.component.init,
        pageGetMetadata: PageNotice.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageNotice", value);
        }
      });

    case "notFound":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "notFound"],
        pageRouteParams: route.value,
        pageInit: PageNotFound.component.init,
        pageGetMetadata: PageNotFound.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageNotFound", value);
        }
      });

    case "swuOpportunityCompleteView":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "swuOpportunityCompleteView"],
        pageRouteParams: route.value,
        pageInit: PageOpportunitySWUComplete.component.init,
        pageGetMetadata: PageOpportunitySWUComplete.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunitySWUComplete", value);
        }
      });

    case "cwuOpportunityCompleteView":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "cwuOpportunityCompleteView"],
        pageRouteParams: route.value,
        pageInit: PageOpportunityCWUComplete.component.init,
        pageGetMetadata: PageOpportunityCWUComplete.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunityCWUComplete", value);
        }
      });

    case "twuOpportunityCompleteView":
      return component.app.initPage({
        ...defaultPageInitParams,
        pageStatePath: ["pages", "twuOpportunityCompleteView"],
        pageRouteParams: route.value,
        pageInit: PageOpportunityTWUComplete.component.init,
        pageGetMetadata: PageOpportunityTWUComplete.component.getMetadata,
        mapPageMsg(value) {
          return adt("pageOpportunityTWUComplete", value);
        }
      });
  }
}

const update: component.base.Update<State, Msg> = ({ state, msg }) => {
  const defaultPageUpdateParams = {
    state,
    noopMsg: adt("noop") as Msg
  };

  switch (msg.tag) {
    case "noop":
      return [state, []];

    // Route Transition: Step 1
    case "@incomingRoute": {
      return [
        state.set("incomingRoute", msg.value),
        [
          api.sessions.readOne<Msg>()(CURRENT_SESSION_ID, (response) =>
            adt("onSessionResponseDuringTransition", response)
          )
        ]
      ];
    }

    // Route Transition: Step 2
    case "onSessionResponseDuringTransition": {
      const response = msg.value;
      const incomingRoute: State["incomingRoute"] = state.incomingRoute;
      // Set the new session on state.
      state = setSession(state, response);
      // Override the incoming route if the user has not accepted terms.
      if (
        !hasAcceptedTermsOrIsAnonymous(state.shared.session) &&
        !isAllowedRouteForUsersWithUnacceptedTerms(
          incomingRoute?.route || state.activeRoute
        )
      ) {
        return [
          state,
          [
            component.cmd.dispatch(
              component.global.newRouteMsg(adt("signUpStepTwo" as const, null))
            )
          ]
        ];
      } else if (!incomingRoute) {
        // If messages have been dispatched out-of-order, then just cancel the route transition.
        return [state, []];
      } else {
        // Otherwise, continue with the existing incoming route.
        // Initialize the incoming page.
        return initPage(state, incomingRoute.route);
      }
    }

    case "onSessionResponse":
      return [setSession(state, msg.value), []];

    // Route Transition: Step 3
    case "@pageReady": {
      const incomingRoute: State["incomingRoute"] = state.incomingRoute;
      if (!incomingRoute) {
        return [state, []];
      } else {
        // Unset the previous page's state if moving to a different route.
        if (incomingRoute.route.tag !== state.activeRoute.tag) {
          state = state.setIn(["pages", state.activeRoute.tag], undefined);
        }
        return [
          state
            // Unset the app's incoming route.
            .set("incomingRoute", null)
            // Set the app's active route to the incoming route.
            .set("activeRoute", incomingRoute.route)
            // We switch this flag to true so the view function knows to display the page.
            .set("ready", true),
          [
            // Scroll to correct Y position.
            component.cmd.dispatch(
              adt("scrollTo", incomingRoute.routeScrollY) as Msg
            ),
            // Refresh the front-end's view of the current session again if the user has been signed out.
            ...(incomingRoute.route.tag === "signOut"
              ? [
                  api.sessions.readOne<Msg>()(CURRENT_SESSION_ID, (response) =>
                    adt("onSessionResponse", response)
                  )
                ]
              : [])
          ]
        ];
      }
    }

    case "scrollTo":
      return [
        state,
        [component.cmd.scrollTo(0, msg.value, adt("noop") as Msg)]
      ];

    case "@reload":
      return [
        state,
        [
          component.cmd.dispatch(
            adt("@incomingRoute", {
              route: state.activeRoute,
              routeScrollY: window.scrollY
            }) as Msg
          )
        ]
      ];

    case "@showToast":
      return [
        state.update("toasts", (ts) =>
          ts.concat([
            {
              ...msg.value,
              timestamp: Date.now()
            }
          ])
        ),
        [
          component.cmd.delayedDispatch(
            TOAST_AUTO_DISMISS_DURATION + 1,
            adt("dismissLapsedToasts") as Msg
          )
        ]
      ];

    case "dismissToast":
      return [
        state.update("toasts", (ts) => ts.filter((t, i) => i !== msg.value)),
        []
      ];

    case "dismissLapsedToasts": {
      const now = Date.now();
      // Auto-dismiss toasts
      return [
        state.update("toasts", (ts) =>
          ts.filter(
            ({ timestamp }) => timestamp + TOAST_AUTO_DISMISS_DURATION > now
          )
        ),
        []
      ];
    }

    case "showModal": {
      return [state.set("showModal", msg.value), []];
    }

    case "hideModal":
      return [state.set("showModal", null), []];

    case "acceptNewTerms":
      return component.base.updateChild({
        state,
        childStatePath: ["acceptNewTerms"],
        childUpdate: AcceptNewTerms.update,
        childMsg: msg.value,
        mapChildMsg:
          adtCurried<ADT<"acceptNewTerms", AcceptNewTerms.Msg>>(
            "acceptNewTerms"
          )
      });

    case "submitAcceptNewTerms":
      if (!state.shared.session?.user.id) {
        return [state, []];
      }
      return AcceptNewTerms.submitAcceptNewTerms({
        state,
        userId: state.shared.session.user.id,
        startLoading: startAcceptNewTermsLoading,
        onAcceptNewTermsResponse(response) {
          return adt("onAcceptNewTermsResponse", response);
        }
      });

    case "onAcceptNewTermsResponse": {
      const [acceptNewTermsState, acceptNewTermsCmds] = AcceptNewTerms.init({
        errors: [],
        child: {
          value: !!state.shared.session?.user.acceptedTermsAt,
          id: "global-accept-new-terms"
        }
      });
      state = state.merge({
        showModal: null,
        acceptNewTermsLoading: 0,
        acceptNewTerms: immutable(acceptNewTermsState)
      });
      const [newState, cmd] = AcceptNewTerms.onAcceptNewTermsResponse<
        State,
        InnerMsg
      >({
        state,
        stopLoading: stopAcceptNewTermsLoading,
        response: msg.value
      });
      return [
        newState,
        [
          ...cmd,
          ...component.cmd.mapMany(
            acceptNewTermsCmds,
            (msg) => adt("acceptNewTerms", msg) as Msg
          )
        ]
      ];
    }
    case "nav":
      return component.base.updateChild({
        state,
        childStatePath: ["nav"],
        childUpdate: Nav.update,
        childMsg: msg.value,
        mapChildMsg: adtCurried<ADT<"nav", Nav.Msg>>("nav")
      });

    case "pageOrgEdit":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageOrgEdit", value),
        pageStatePath: ["pages", "orgEdit"],
        pageUpdate: PageOrgEdit.component.update,
        pageGetMetadata: PageOrgEdit.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageOrgSWUTerms":
      return component.app.updatePage<
        State,
        Msg,
        PageOrgSWUTerms.State,
        PageOrgSWUTerms.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageOrgSWUTerms", value),
        pageStatePath: ["pages", "orgSWUTerms"],
        pageUpdate: PageOrgSWUTerms.component.update,
        pageGetMetadata: PageOrgSWUTerms.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageOrgTWUTerms":
      return component.app.updatePage<
        State,
        Msg,
        PageOrgTWUTerms.State,
        PageOrgTWUTerms.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageOrgTWUTerms", value),
        pageStatePath: ["pages", "orgTWUTerms"],
        pageUpdate: PageOrgTWUTerms.component.update,
        pageGetMetadata: PageOrgTWUTerms.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageProposalSWUCreate":
      return component.app.updatePage<
        State,
        Msg,
        PageProposalSWUCreate.State,
        PageProposalSWUCreate.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalSWUCreate" as const,
          value
        }),
        pageStatePath: ["pages", "proposalSWUCreate"],
        pageUpdate: PageProposalSWUCreate.component.update,
        pageGetMetadata: PageProposalSWUCreate.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalSWUEdit":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalSWUEdit" as const,
          value
        }),
        pageStatePath: ["pages", "proposalSWUEdit"],
        pageUpdate: PageProposalSWUEdit.component.update,
        pageGetMetadata: PageProposalSWUEdit.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalSWUView":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalSWUView" as const,
          value
        }),
        pageStatePath: ["pages", "proposalSWUView"],
        pageUpdate: PageProposalSWUView.component.update,
        pageGetMetadata: PageProposalSWUView.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageOpportunitySWUEdit":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageOpportunitySWUEdit" as const,
          value
        }),
        pageStatePath: ["pages", "opportunitySWUEdit"],
        pageUpdate: PageOpportunitySWUEdit.component.update,
        pageGetMetadata: PageOpportunitySWUEdit.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageOpportunitySWUCreate":
      return component.app.updatePage<
        State,
        Msg,
        PageOpportunitySWUCreate.State,
        PageOpportunitySWUCreate.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageOpportunitySWUCreate" as const,
          value
        }),
        pageStatePath: ["pages", "opportunitySWUCreate"],
        pageUpdate: PageOpportunitySWUCreate.component.update,
        pageGetMetadata: PageOpportunitySWUCreate.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageOpportunitySWUComplete":
      return component.app.updatePage<
        State,
        Msg,
        PageOpportunitySWUComplete.State,
        PageOpportunitySWUComplete.InnerMsg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageOpportunitySWUComplete" as const,
          value
        }),
        pageStatePath: ["pages", "swuOpportunityCompleteView"],
        pageUpdate: PageOpportunitySWUComplete.component.update,
        pageGetMetadata: PageOpportunitySWUComplete.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageOpportunityCWUComplete":
      return component.app.updatePage<
        State,
        Msg,
        PageOpportunityCWUComplete.State,
        PageOpportunityCWUComplete.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageOpportunityCWUComplete", value),
        pageStatePath: ["pages", "cwuOpportunityCompleteView"],
        pageUpdate: PageOpportunityCWUComplete.component.update,
        pageGetMetadata: PageOpportunityCWUComplete.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageOpportunityTWUComplete":
      return component.app.updatePage<
        State,
        Msg,
        PageOpportunityTWUComplete.State,
        PageOpportunityTWUComplete.InnerMsg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageOpportunityTWUComplete", value),
        pageStatePath: ["pages", "twuOpportunityCompleteView"],
        pageUpdate: PageOpportunityTWUComplete.component.update,
        pageGetMetadata: PageOpportunityTWUComplete.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageOpportunitySWUView":
      return component.app.updatePage<
        State,
        Msg,
        PageOpportunitySWUView.State,
        PageOpportunitySWUView.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageOpportunitySWUView" as const,
          value
        }),
        pageStatePath: ["pages", "opportunitySWUView"],
        pageUpdate: PageOpportunitySWUView.component.update,
        pageGetMetadata: PageOpportunitySWUView.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageOpportunityTWUCreate":
      return component.app.updatePage<
        State,
        Msg,
        PageOpportunityTWUCreate.State,
        PageOpportunityTWUCreate.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageOpportunityTWUCreate" as const,
          value
        }),
        pageStatePath: ["pages", "opportunityTWUCreate"],
        pageUpdate: PageOpportunityTWUCreate.component.update,
        pageGetMetadata: PageOpportunityTWUCreate.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageOpportunityTWUView":
      return component.app.updatePage<
        State,
        Msg,
        PageOpportunityTWUView.State,
        PageOpportunityTWUView.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageOpportunityTWUView" as const,
          value
        }),
        pageStatePath: ["pages", "opportunityTWUView"],
        pageUpdate: PageOpportunityTWUView.component.update,
        pageGetMetadata: PageOpportunityTWUView.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageOpportunityTWUEdit":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageOpportunityTWUEdit" as const,
          value
        }),
        pageStatePath: ["pages", "opportunityTWUEdit"],
        pageUpdate: PageOpportunityTWUEdit.component.update,
        pageGetMetadata: PageOpportunityTWUEdit.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageOpportunityCWUCreate":
      return component.app.updatePage<
        State,
        Msg,
        PageOpportunityCWUCreate.State,
        PageOpportunityCWUCreate.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageOpportunityCWUCreate" as const,
          value
        }),
        pageStatePath: ["pages", "opportunityCWUCreate"],
        pageUpdate: PageOpportunityCWUCreate.component.update,
        pageGetMetadata: PageOpportunityCWUCreate.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageOpportunityCWUEdit":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageOpportunityCWUEdit" as const,
          value
        }),
        pageStatePath: ["pages", "opportunityCWUEdit"],
        pageUpdate: PageOpportunityCWUEdit.component.update,
        pageGetMetadata: PageOpportunityCWUEdit.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageOpportunityCWUView":
      return component.app.updatePage<
        State,
        Msg,
        PageOpportunityCWUView.State,
        PageOpportunityCWUView.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageOpportunityCWUView", value),
        pageStatePath: ["pages", "opportunityCWUView"],
        pageUpdate: PageOpportunityCWUView.component.update,
        pageGetMetadata: PageOpportunityCWUView.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageProposalCWUCreate":
      return component.app.updatePage<
        State,
        Msg,
        PageProposalCWUCreate.State,
        PageProposalCWUCreate.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalCWUCreate" as const,
          value
        }),
        pageStatePath: ["pages", "proposalCWUCreate"],
        pageUpdate: PageProposalCWUCreate.component.update,
        pageGetMetadata: PageProposalCWUCreate.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalCWUEdit":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalCWUEdit" as const,
          value
        }),
        pageStatePath: ["pages", "proposalCWUEdit"],
        pageUpdate: PageProposalCWUEdit.component.update,
        pageGetMetadata: PageProposalCWUEdit.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalCWUView":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalCWUView" as const,
          value
        }),
        pageStatePath: ["pages", "proposalCWUView"],
        pageUpdate: PageProposalCWUView.component.update,
        pageGetMetadata: PageProposalCWUView.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageProposalCWUExportOne":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalCWUExportOne" as const,
          value
        }),
        pageStatePath: ["pages", "proposalCWUExportOne"],
        pageUpdate: PageProposalCWUExportOne.component.update,
        pageGetMetadata: PageProposalCWUExportOne.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalCWUExportAll":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalCWUExportAll" as const,
          value
        }),
        pageStatePath: ["pages", "proposalCWUExportAll"],
        pageUpdate: PageProposalCWUExportAll.component.update,
        pageGetMetadata: PageProposalCWUExportAll.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalSWUExportOne":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalSWUExportOne" as const,
          value
        }),
        pageStatePath: ["pages", "proposalSWUExportOne"],
        pageUpdate: PageProposalSWUExportOne.component.update,
        pageGetMetadata: PageProposalSWUExportOne.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalSWUExportAll":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageProposalSWUExportAll", value),
        pageStatePath: ["pages", "proposalSWUExportAll"],
        pageUpdate: PageProposalSWUExportAll.component.update,
        pageGetMetadata: PageProposalSWUExportAll.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalTWUExportOne":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalTWUExportOne" as const,
          value
        }),
        pageStatePath: ["pages", "proposalTWUExportOne"],
        pageUpdate: PageProposalTWUExportOne.component.update,
        pageGetMetadata: PageProposalTWUExportOne.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalTWUExportAll":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalTWUExportAll" as const,
          value
        }),
        pageStatePath: ["pages", "proposalTWUExportAll"],
        pageUpdate: PageProposalTWUExportAll.component.update,
        pageGetMetadata: PageProposalTWUExportAll.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalTWUCreate":
      return component.app.updatePage<
        State,
        Msg,
        PageProposalTWUCreate.State,
        PageProposalTWUCreate.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalTWUCreate" as const,
          value
        }),
        pageStatePath: ["pages", "proposalTWUCreate"],
        pageUpdate: PageProposalTWUCreate.component.update,
        pageGetMetadata: PageProposalTWUCreate.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalTWUEdit":
      return component.app.updatePage<
        State,
        Msg,
        PageProposalTWUEdit.State,
        PageProposalTWUEdit.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalTWUEdit" as const,
          value
        }),
        pageStatePath: ["pages", "proposalTWUEdit"],
        pageUpdate: PageProposalTWUEdit.component.update,
        pageGetMetadata: PageProposalTWUEdit.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalTWUView":
      return component.app.updatePage<
        State,
        Msg,
        PageProposalTWUView.State,
        PageProposalTWUView.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => ({
          tag: "pageProposalTWUView" as const,
          value
        }),
        pageStatePath: ["pages", "proposalTWUView"],
        pageUpdate: PageProposalTWUView.component.update,
        pageGetMetadata: PageProposalTWUView.component.getMetadata,
        pageMsg: msg.value
      });
    case "pageProposalList":
      return component.app.updatePage<
        State,
        Msg,
        PageProposalList.State,
        PageProposalList.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageProposalList", value),
        pageStatePath: ["pages", "proposalList"],
        pageUpdate: PageProposalList.component.update,
        pageGetMetadata: PageProposalList.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageOrgCreate":
      return component.app.updatePage<
        State,
        Msg,
        PageOrgCreate.State,
        PageOrgCreate.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageOrgCreate", value),
        pageStatePath: ["pages", "orgCreate"],
        pageUpdate: PageOrgCreate.component.update,
        pageGetMetadata: PageOrgCreate.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageOrgList":
      return component.app.updatePage<
        State,
        Msg,
        PageOrgList.State,
        PageOrgList.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageOrgList", value),
        pageStatePath: ["pages", "orgList"],
        pageUpdate: PageOrgList.component.update,
        pageGetMetadata: PageOrgList.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageUserProfile":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageUserProfile", value),
        pageStatePath: ["pages", "userProfile"],
        pageUpdate: PageUserProfile.component.update,
        pageGetMetadata: PageUserProfile.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageUserList":
      return component.app.updatePage<
        State,
        Msg,
        PageUserList.State,
        PageUserList.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageUserList", value),
        pageStatePath: ["pages", "userList"],
        pageUpdate: PageUserList.component.update,
        pageGetMetadata: PageUserList.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageSignOut":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageSignOut", value),
        pageStatePath: ["pages", "signOut"],
        pageUpdate: PageSignOut.component.update,
        pageGetMetadata: PageSignOut.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageSignUpStepOne":
      return component.app.updatePage<
        State,
        Msg,
        PageSignUpStepOne.State,
        PageSignUpStepOne.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageSignUpStepOne", value),
        pageStatePath: ["pages", "signUpStepOne"],
        pageUpdate: PageSignUpStepOne.component.update,
        pageGetMetadata: PageSignUpStepOne.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageSignUpStepTwo":
      return component.app.updatePage<
        State,
        Msg,
        PageSignUpStepTwo.State,
        PageSignUpStepTwo.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageSignUpStepTwo", value),
        pageStatePath: ["pages", "signUpStepTwo"],
        pageUpdate: PageSignUpStepTwo.component.update,
        pageGetMetadata: PageSignUpStepTwo.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageSignIn":
      return component.app.updatePage<
        State,
        Msg,
        PageSignIn.State,
        PageSignIn.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageSignIn", value),
        pageStatePath: ["pages", "signIn"],
        pageUpdate: PageSignIn.component.update,
        pageGetMetadata: PageSignIn.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageLanding":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageLanding", value),
        pageStatePath: ["pages", "landing"],
        pageUpdate: PageLanding.component.update,
        pageGetMetadata: PageLanding.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageDashboard":
      return component.app.updatePage<
        State,
        Msg,
        PageDashboard.State,
        PageDashboard.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageDashboard", value),
        pageStatePath: ["pages", "dashboard"],
        pageUpdate: PageDashboard.component.update,
        pageGetMetadata: PageDashboard.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageOpportunities":
      return component.app.updatePage<
        State,
        Msg,
        PageOpportunities.State,
        PageOpportunities.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageOpportunities", value),
        pageStatePath: ["pages", "opportunities"],
        pageUpdate: PageOpportunities.component.update,
        pageGetMetadata: PageOpportunities.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageOpportunityCreate":
      return component.app.updatePage<
        State,
        Msg,
        PageOpportunityCreate.State,
        PageOpportunityCreate.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageOpportunityCreate", value),
        pageStatePath: ["pages", "opportunityCreate"],
        pageUpdate: PageOpportunityCreate.component.update,
        pageGetMetadata: PageOpportunityCreate.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageLearnMoreCWU":
      return component.app.updatePage<
        State,
        Msg,
        PageLearnMoreCWU.State,
        PageLearnMoreCWU.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageLearnMoreCWU", value),
        pageStatePath: ["pages", "learnMoreCWU"],
        pageUpdate: PageLearnMoreCWU.component.update,
        pageGetMetadata: PageLearnMoreCWU.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageLearnMoreTWU":
      return component.app.updatePage<
        State,
        Msg,
        PageLearnMoreTWU.State,
        PageLearnMoreTWU.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageLearnMoreTWU", value),
        pageStatePath: ["pages", "learnMoreTWU"],
        pageUpdate: PageLearnMoreTWU.component.update,
        pageGetMetadata: PageLearnMoreTWU.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageLearnMoreSWU":
      return component.app.updatePage<
        State,
        Msg,
        PageLearnMoreSWU.State,
        PageLearnMoreSWU.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageLearnMoreSWU", value),
        pageStatePath: ["pages", "learnMoreSWU"],
        pageUpdate: PageLearnMoreSWU.component.update,
        pageGetMetadata: PageLearnMoreSWU.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageContentView":
      return component.app.updatePage<
        State,
        Msg,
        PageContentView.State,
        PageContentView.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageContentView", value),
        pageStatePath: ["pages", "contentView"],
        pageUpdate: PageContentView.component.update,
        pageGetMetadata: PageContentView.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageContentCreate":
      return component.app.updatePage<
        State,
        Msg,
        PageContentCreate.State,
        PageContentCreate.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageContentCreate", value),
        pageStatePath: ["pages", "contentCreate"],
        pageUpdate: PageContentCreate.component.update,
        pageGetMetadata: PageContentCreate.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageContentEdit":
      return component.app.updatePage<
        State,
        Msg,
        PageContentEdit.State,
        PageContentEdit.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageContentEdit", value),
        pageStatePath: ["pages", "contentEdit"],
        pageUpdate: PageContentEdit.component.update,
        pageGetMetadata: PageContentEdit.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageContentList":
      return component.app.updatePage({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageContentList", value),
        pageStatePath: ["pages", "contentList"],
        pageUpdate: PageContentList.component.update,
        pageGetMetadata: PageContentList.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageNotice":
      return component.app.updatePage<
        State,
        Msg,
        PageNotice.State,
        PageNotice.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageNotice", value),
        pageStatePath: ["pages", "notice"],
        pageUpdate: PageNotice.component.update,
        pageGetMetadata: PageNotice.component.getMetadata,
        pageMsg: msg.value
      });

    case "pageNotFound":
      return component.app.updatePage<
        State,
        Msg,
        PageNotFound.State,
        PageNotFound.Msg,
        Route
      >({
        ...defaultPageUpdateParams,
        mapPageMsg: (value) => adt("pageNotFound", value),
        pageStatePath: ["pages", "notFound"],
        pageUpdate: PageNotFound.component.update,
        pageGetMetadata: PageNotFound.component.getMetadata,
        pageMsg: msg.value
      });

    // Handle these framework Msgs so we get compile-time guarantees
    // that all of our possible Msgs have been handled.
    case "@newUrl":
    case "@replaceUrl":
    case "@newRoute":
    case "@replaceRoute":
      return [state, []];
  }
};

export default update;
