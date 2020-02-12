import * as Nav from 'front-end/lib/app/view/nav';
import { AppMsg, Immutable, PageModal } from 'front-end/lib/framework';
import * as PageContent from 'front-end/lib/pages/content';
import * as PageLanding from 'front-end/lib/pages/landing';
import * as PageNotice from 'front-end/lib/pages/notice';
// Note(Jesse): @add_new_page_location
import * as PageOpportunityCWUCreate from 'front-end/lib/pages/opportunity/code-with-us/create';
import * as PageOpportunityCWUEdit from 'front-end/lib/pages/opportunity/code-with-us/edit';
import * as PageOpportunityCWUView from 'front-end/lib/pages/opportunity/code-with-us/view';
import * as PageOpportunities from 'front-end/lib/pages/opportunity/list';
import * as PageOrgCreate from 'front-end/lib/pages/organization/create';
import * as PageOrgEdit from 'front-end/lib/pages/organization/edit';
import * as PageOrgList from 'front-end/lib/pages/organization/list';
import * as PageProposalCWUCreate from 'front-end/lib/pages/proposal/code-with-us/create';
import * as PageProposalCWUEdit from 'front-end/lib/pages/proposal/code-with-us/edit';
import * as PageProposalCWUView from 'front-end/lib/pages/proposal/code-with-us/view';
import * as PageProposalList from 'front-end/lib/pages/proposal/list';
import * as PageSignIn from 'front-end/lib/pages/sign-in';
import * as PageSignOut from 'front-end/lib/pages/sign-out';
import * as PageSignUpStepOne from 'front-end/lib/pages/sign-up/step-one';
import * as PageSignUpStepTwo from 'front-end/lib/pages/sign-up/step-two';
import * as PageUserList from 'front-end/lib/pages/user/list';
import * as PageUserProfile from 'front-end/lib/pages/user/profile';
import { includes } from 'lodash';
import { Session } from 'shared/lib/resources/session';
import { ADT } from 'shared/lib/types';

// Note(Jesse): @add_new_page_location
export type Route
  = ADT<'landing',               PageLanding.RouteParams>
  | ADT<'opportunities',         PageOpportunities.RouteParams>
  | ADT<'content',               PageContent.RouteParams>
  | ADT<'signOut',               PageSignOut.RouteParams>
  | ADT<'signIn',                PageSignIn.RouteParams>
  | ADT<'signUpStepOne',         PageSignUpStepOne.RouteParams>
  | ADT<'signUpStepTwo',         PageSignUpStepTwo.RouteParams>
  | ADT<'notice',                PageNotice.RouteParams>
  | ADT<'userList',              PageUserList.RouteParams>
  | ADT<'userProfile',           PageUserProfile.RouteParams>
  | ADT<'orgCreate',             PageOrgCreate.RouteParams>
  | ADT<'orgList',               PageOrgList.RouteParams>
  | ADT<'orgEdit',               PageOrgEdit.RouteParams>
  | ADT<'opportunityCWUCreate',  PageOpportunityCWUCreate.RouteParams>
  | ADT<'opportunityCWUEdit',    PageOpportunityCWUEdit.RouteParams>
  | ADT<'opportunityCWUView',    PageOpportunityCWUView.RouteParams>
  | ADT<'proposalCWUCreate',     PageProposalCWUCreate.RouteParams>
  | ADT<'proposalCWUEdit',       PageProposalCWUEdit.RouteParams>
  | ADT<'proposalCWUView',       PageProposalCWUView.RouteParams>
  | ADT<'proposalList',          PageProposalList.RouteParams>
  ;

const routesAllowedForUsersWithUnacceptedTerms: Array<Route['tag']> = [
  'signUpStepTwo',
  'content',
  'signOut'
];

export function isAllowedRouteForUsersWithUnacceptedTerms(route: Route): boolean {
  return includes(routesAllowedForUsersWithUnacceptedTerms, route.tag);
}

export interface SharedState {
  session?: Session;
}

export interface State {
  ready: boolean;
  transitionLoading: number;
  modal: {
    open: boolean;
    content: PageModal<Msg>;
  };
  shared: SharedState;
  activeRoute: Route;
  nav: Immutable<Nav.State>;

// Note(Jesse): @add_new_page_location
  pages: {
    landing?: Immutable<PageLanding.State>;
    opportunities?: Immutable<PageOpportunities.State>;
    content?: Immutable<PageContent.State>;
    signOut?: Immutable<PageSignOut.State>;
    signUpStepOne?: Immutable<PageSignUpStepOne.State>;
    signUpStepTwo?: Immutable<PageSignUpStepTwo.State>;
    signIn?: Immutable<PageSignIn.State>;
    notice?: Immutable<PageNotice.State>;
    userList?: Immutable<PageUserList.State>;
    userProfile?: Immutable<PageUserProfile.State>;
    orgCreate?: Immutable<PageOrgCreate.State>;
    orgList?: Immutable<PageOrgList.State>;
    orgEdit?: Immutable<PageOrgEdit.State>;
    opportunityCWUCreate?: Immutable<PageOpportunityCWUCreate.State>;
    opportunityCWUEdit?: Immutable<PageOpportunityCWUEdit.State>;
    opportunityCWUView?: Immutable<PageOpportunityCWUView.State>;
    proposalCWUCreate?: Immutable<PageProposalCWUCreate.State>;
    proposalCWUEdit?: Immutable<PageProposalCWUEdit.State>;
    proposalCWUView?: Immutable<PageProposalCWUView.State>;
    proposalList?: Immutable<PageProposalList.State>;
  };
}

// Note(Jesse): @add_new_page_location
type InnerMsg
  = ADT<'noop'>
  | ADT<'closeModal'>
  | ADT<'nav',                      Nav.Msg>
  | ADT<'pageLanding',              PageLanding.Msg>
  | ADT<'pageOpportunities',        PageOpportunities.Msg>
  | ADT<'pageContent',              PageContent.Msg>
  | ADT<'pageSignIn',               PageSignIn.Msg>
  | ADT<'pageSignOut',              PageSignOut.Msg>
  | ADT<'pageSignUpStepOne',        PageSignUpStepOne.Msg>
  | ADT<'pageSignUpStepTwo',        PageSignUpStepTwo.Msg>
  | ADT<'pageNotice',               PageNotice.Msg>
  | ADT<'pageUserList',             PageUserList.Msg>
  | ADT<'pageUserProfile',          PageUserProfile.Msg>
  | ADT<'pageOrgCreate',            PageOrgCreate.Msg>
  | ADT<'pageOrgList',              PageOrgList.Msg>
  | ADT<'pageOrgEdit',              PageOrgEdit.Msg>
  | ADT<'pageOpportunityCWUCreate', PageOpportunityCWUCreate.Msg>
  | ADT<'pageOpportunityCWUEdit',   PageOpportunityCWUEdit.Msg>
  | ADT<'pageOpportunityCWUView',   PageOpportunityCWUView.Msg>
  | ADT<'pageProposalCWUCreate',    PageProposalCWUCreate.Msg>
  | ADT<'pageProposalCWUEdit',      PageProposalCWUEdit.Msg>
  | ADT<'pageProposalCWUView',      PageProposalCWUView.Msg>
  | ADT<'pageProposalList',         PageProposalList.Msg>;

export type Msg = AppMsg<InnerMsg, Route>;
