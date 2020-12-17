import * as Nav from 'front-end/lib/app/view/nav';
import * as AcceptNewTerms from 'front-end/lib/components/accept-new-app-terms';
import { AppMsg, Immutable, Toast } from 'front-end/lib/framework';
import * as PageContentCreate from 'front-end/lib/pages/content/create';
import * as PageContentEdit from 'front-end/lib/pages/content/edit';
import * as PageContentList from 'front-end/lib/pages/content/list';
import * as PageContentView from 'front-end/lib/pages/content/view';
import * as PageDashboard from 'front-end/lib/pages/dashboard';
import * as PageLanding from 'front-end/lib/pages/landing';
import * as PageLearnMoreCWU from 'front-end/lib/pages/learn-more/code-with-us';
import * as PageLearnMoreSWU from 'front-end/lib/pages/learn-more/sprint-with-us';
import * as PageNotFound from 'front-end/lib/pages/not-found';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as PageOpportunityCWUCreate from 'front-end/lib/pages/opportunity/code-with-us/create';
import * as PageOpportunityCWUEdit from 'front-end/lib/pages/opportunity/code-with-us/edit';
import * as PageOpportunityCWUView from 'front-end/lib/pages/opportunity/code-with-us/view';
import * as PageOpportunityCreate from 'front-end/lib/pages/opportunity/create';
import * as PageOpportunities from 'front-end/lib/pages/opportunity/list';
import * as PageOpportunitySWUCreate from 'front-end/lib/pages/opportunity/sprint-with-us/create';
import * as PageOpportunitySWUEdit from 'front-end/lib/pages/opportunity/sprint-with-us/edit';
import * as PageOpportunitySWUView from 'front-end/lib/pages/opportunity/sprint-with-us/view';
import * as PageOrgCreate from 'front-end/lib/pages/organization/create';
import * as PageOrgEdit from 'front-end/lib/pages/organization/edit';
import * as PageOrgList from 'front-end/lib/pages/organization/list';
import * as PageOrgSWUTerms from 'front-end/lib/pages/organization/sprint-with-us-terms';
import * as PageProposalCWUCreate from 'front-end/lib/pages/proposal/code-with-us/create';
import * as PageProposalCWUEdit from 'front-end/lib/pages/proposal/code-with-us/edit';
import * as PageProposalCWUExportAll from 'front-end/lib/pages/proposal/code-with-us/export/all';
import * as PageProposalCWUExportOne from 'front-end/lib/pages/proposal/code-with-us/export/one';
import * as PageProposalCWUView from 'front-end/lib/pages/proposal/code-with-us/view';
import * as PageProposalList from 'front-end/lib/pages/proposal/list';
import * as PageProposalSWUCreate from 'front-end/lib/pages/proposal/sprint-with-us/create';
import * as PageProposalSWUEdit from 'front-end/lib/pages/proposal/sprint-with-us/edit';
import * as PageProposalSWUExportAll from 'front-end/lib/pages/proposal/sprint-with-us/export/all';
import * as PageProposalSWUExportOne from 'front-end/lib/pages/proposal/sprint-with-us/export/one';
import * as PageProposalSWUView from 'front-end/lib/pages/proposal/sprint-with-us/view';
import * as PageSignIn from 'front-end/lib/pages/sign-in';
import * as PageSignOut from 'front-end/lib/pages/sign-out';
import * as PageSignUpStepOne from 'front-end/lib/pages/sign-up/step-one';
import * as PageSignUpStepTwo from 'front-end/lib/pages/sign-up/step-two';
import * as PageUserList from 'front-end/lib/pages/user/list';
import * as PageUserProfile from 'front-end/lib/pages/user/profile';
import { includes } from 'lodash';
import { Session } from 'shared/lib/resources/session';
import { ADT } from 'shared/lib/types';

export type Route
  = ADT<'landing',              PageLanding.RouteParams>
  | ADT<'dashboard',            PageDashboard.RouteParams>
  | ADT<'opportunities',        PageOpportunities.RouteParams>
  | ADT<'opportunityCreate',    PageOpportunityCreate.RouteParams>
  | ADT<'learnMoreCWU',         PageLearnMoreCWU.RouteParams>
  | ADT<'learnMoreSWU',         PageLearnMoreSWU.RouteParams>
  | ADT<'contentView',          PageContentView.RouteParams>
  | ADT<'contentCreate',        PageContentCreate.RouteParams>
  | ADT<'contentEdit',          PageContentEdit.RouteParams>
  | ADT<'contentList',          PageContentList.RouteParams>
  | ADT<'signOut',              PageSignOut.RouteParams>
  | ADT<'signIn',               PageSignIn.RouteParams>
  | ADT<'signUpStepOne',        PageSignUpStepOne.RouteParams>
  | ADT<'signUpStepTwo',        PageSignUpStepTwo.RouteParams>
  | ADT<'notice',               PageNotice.RouteParams>
  | ADT<'notFound',             PageNotFound.RouteParams>
  | ADT<'userList',             PageUserList.RouteParams>
  | ADT<'userProfile',          PageUserProfile.RouteParams>
  | ADT<'orgCreate',            PageOrgCreate.RouteParams>
  | ADT<'orgList',              PageOrgList.RouteParams>
  | ADT<'orgEdit',              PageOrgEdit.RouteParams>
  | ADT<'orgSWUTerms',          PageOrgSWUTerms.RouteParams>
  | ADT<'proposalSWUCreate',    PageProposalSWUCreate.RouteParams>
  | ADT<'proposalSWUEdit',      PageProposalSWUEdit.RouteParams>
  | ADT<'proposalSWUView',      PageProposalSWUView.RouteParams>
  | ADT<'proposalSWUExportOne', PageProposalSWUExportOne.RouteParams>
  | ADT<'proposalSWUExportAll', PageProposalSWUExportAll.RouteParams>
  | ADT<'opportunitySWUCreate', PageOpportunitySWUCreate.RouteParams>
  | ADT<'opportunitySWUEdit',   PageOpportunitySWUEdit.RouteParams>
  | ADT<'opportunitySWUView',   PageOpportunitySWUView.RouteParams>
  | ADT<'opportunityCWUCreate', PageOpportunityCWUCreate.RouteParams>
  | ADT<'opportunityCWUEdit',   PageOpportunityCWUEdit.RouteParams>
  | ADT<'opportunityCWUView',   PageOpportunityCWUView.RouteParams>
  | ADT<'proposalCWUCreate',    PageProposalCWUCreate.RouteParams>
  | ADT<'proposalCWUEdit',      PageProposalCWUEdit.RouteParams>
  | ADT<'proposalCWUView',      PageProposalCWUView.RouteParams>
  | ADT<'proposalCWUExportOne', PageProposalCWUExportOne.RouteParams>
  | ADT<'proposalCWUExportAll', PageProposalCWUExportAll.RouteParams>
  | ADT<'proposalList',         PageProposalList.RouteParams>;

const routesAllowedForUsersWithUnacceptedTerms: Array<Route['tag']> = [
  'signUpStepTwo',
  'contentView',
  'learnMoreCWU',
  'learnMoreSWU',
  'signOut'
];

export function isAllowedRouteForUsersWithUnacceptedTerms(route: Route): boolean {
  return includes(routesAllowedForUsersWithUnacceptedTerms, route.tag);
}

export interface SharedState {
  session: Session;
}

export type ModalId = 'acceptNewTerms';

export interface State {
  //App Internal State
  ready: boolean;
  transitionLoading: number;
  activeRoute: Route;
  //Toasts
  toasts: Array<Toast & { timestamp: number; }>;
  //Modals
  showModal: ModalId | null;
  acceptNewTerms: Immutable<AcceptNewTerms.State>;
  acceptNewTermsLoading: number;
  //Shared State
  shared: SharedState;
  //Layout
  nav: Immutable<Nav.State>;
  //Pages
  pages: {
    landing?: Immutable<PageLanding.State>;
    dashboard?: Immutable<PageDashboard.State>;
    opportunities?: Immutable<PageOpportunities.State>;
    opportunityCreate?: Immutable<PageOpportunityCreate.State>;
    learnMoreCWU?: Immutable<PageLearnMoreCWU.State>;
    learnMoreSWU?: Immutable<PageLearnMoreSWU.State>;
    contentView?: Immutable<PageContentView.State>;
    contentCreate?: Immutable<PageContentCreate.State>;
    contentEdit?: Immutable<PageContentEdit.State>;
    contentList?: Immutable<PageContentList.State>;
    signOut?: Immutable<PageSignOut.State>;
    signUpStepOne?: Immutable<PageSignUpStepOne.State>;
    signUpStepTwo?: Immutable<PageSignUpStepTwo.State>;
    signIn?: Immutable<PageSignIn.State>;
    notice?: Immutable<PageNotice.State>;
    notFound?: Immutable<PageNotFound.State>;
    userList?: Immutable<PageUserList.State>;
    userProfile?: Immutable<PageUserProfile.State>;
    orgCreate?: Immutable<PageOrgCreate.State>;
    orgList?: Immutable<PageOrgList.State>;
    orgEdit?: Immutable<PageOrgEdit.State>;
    orgSWUTerms?: Immutable<PageOrgSWUTerms.State>;
    proposalSWUCreate?: Immutable<PageProposalSWUCreate.State>;
    proposalSWUEdit?: Immutable<PageProposalSWUEdit.State>;
    proposalSWUView?: Immutable<PageProposalSWUView.State>;
    proposalSWUExportOne?: Immutable<PageProposalSWUExportOne.State>;
    proposalSWUExportAll?: Immutable<PageProposalSWUExportAll.State>;
    opportunitySWUCreate?: Immutable<PageOpportunitySWUCreate.State>;
    opportunitySWUEdit?: Immutable<PageOpportunitySWUEdit.State>;
    opportunitySWUView?: Immutable<PageOpportunitySWUView.State>;
    opportunityCWUCreate?: Immutable<PageOpportunityCWUCreate.State>;
    opportunityCWUEdit?: Immutable<PageOpportunityCWUEdit.State>;
    opportunityCWUView?: Immutable<PageOpportunityCWUView.State>;
    proposalCWUCreate?: Immutable<PageProposalCWUCreate.State>;
    proposalCWUEdit?: Immutable<PageProposalCWUEdit.State>;
    proposalCWUView?: Immutable<PageProposalCWUView.State>;
    proposalCWUExportOne?: Immutable<PageProposalCWUExportOne.State>;
    proposalCWUExportAll?: Immutable<PageProposalCWUExportAll.State>;
    proposalList?: Immutable<PageProposalList.State>;
  };
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'scrollTo',                 number> //Y position
  | ADT<'dismissToast',             number>
  | ADT<'dismissLapsedToasts'>
  | ADT<'showModal',                ModalId>
  | ADT<'hideModal'>
  | ADT<'acceptNewTerms',           AcceptNewTerms.Msg>
  | ADT<'submitAcceptNewTerms'>
  | ADT<'nav',                      Nav.Msg>
  | ADT<'pageLanding',              PageLanding.Msg>
  | ADT<'pageDashboard',            PageDashboard.Msg>
  | ADT<'pageOpportunities',        PageOpportunities.Msg>
  | ADT<'pageOpportunityCreate',    PageOpportunityCreate.Msg>
  | ADT<'pageLearnMoreCWU',         PageLearnMoreCWU.Msg>
  | ADT<'pageLearnMoreSWU',         PageLearnMoreSWU.Msg>
  | ADT<'pageContentView',          PageContentView.Msg>
  | ADT<'pageContentCreate',        PageContentCreate.Msg>
  | ADT<'pageContentEdit',          PageContentEdit.Msg>
  | ADT<'pageContentList',          PageContentList.Msg>
  | ADT<'pageSignIn',               PageSignIn.Msg>
  | ADT<'pageSignOut',              PageSignOut.Msg>
  | ADT<'pageSignUpStepOne',        PageSignUpStepOne.Msg>
  | ADT<'pageSignUpStepTwo',        PageSignUpStepTwo.Msg>
  | ADT<'pageNotice',               PageNotice.Msg>
  | ADT<'pageNotFound',             PageNotFound.Msg>
  | ADT<'pageUserList',             PageUserList.Msg>
  | ADT<'pageUserProfile',          PageUserProfile.Msg>
  | ADT<'pageOrgCreate',            PageOrgCreate.Msg>
  | ADT<'pageOrgList',              PageOrgList.Msg>
  | ADT<'pageOrgEdit',              PageOrgEdit.Msg>
  | ADT<'pageOrgSWUTerms',          PageOrgSWUTerms.Msg>
  | ADT<'pageProposalSWUCreate',    PageProposalSWUCreate.Msg>
  | ADT<'pageProposalSWUEdit',      PageProposalSWUEdit.Msg>
  | ADT<'pageProposalSWUView',      PageProposalSWUView.Msg>
  | ADT<'pageProposalSWUExportOne', PageProposalSWUExportOne.Msg>
  | ADT<'pageProposalSWUExportAll', PageProposalSWUExportAll.Msg>
  | ADT<'pageOpportunitySWUCreate', PageOpportunitySWUCreate.Msg>
  | ADT<'pageOpportunitySWUEdit',   PageOpportunitySWUEdit.Msg>
  | ADT<'pageOpportunitySWUView',   PageOpportunitySWUView.Msg>
  | ADT<'pageOpportunityCWUCreate', PageOpportunityCWUCreate.Msg>
  | ADT<'pageOpportunityCWUEdit',   PageOpportunityCWUEdit.Msg>
  | ADT<'pageOpportunityCWUView',   PageOpportunityCWUView.Msg>
  | ADT<'pageProposalCWUCreate',    PageProposalCWUCreate.Msg>
  | ADT<'pageProposalCWUEdit',      PageProposalCWUEdit.Msg>
  | ADT<'pageProposalCWUView',      PageProposalCWUView.Msg>
  | ADT<'pageProposalCWUExportOne', PageProposalCWUExportOne.Msg>
  | ADT<'pageProposalCWUExportAll', PageProposalCWUExportAll.Msg>
  | ADT<'pageProposalList',         PageProposalList.Msg>;

export type Msg = AppMsg<InnerMsg, Route>;
