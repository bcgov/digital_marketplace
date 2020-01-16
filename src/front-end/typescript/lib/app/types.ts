import * as Nav from 'front-end/lib/app/view/nav';
import { AppMsg, Immutable, PageModal } from 'front-end/lib/framework';
// Note(Jesse): @add_new_page_location
import * as CwuOpportunityCreate from 'front-end/lib/pages/cwu/opportunities/create';
import * as CwuOpportunityEdit   from 'front-end/lib/pages/cwu/opportunities/edit';
import * as CwuOpportunityView   from 'front-end/lib/pages/cwu/opportunities/view';
import * as CwuProposalCreate    from 'front-end/lib/pages/cwu/proposals/create';
import * as CwuProposalEdit      from 'front-end/lib/pages/cwu/proposals/edit';
import * as CwuProposalView      from 'front-end/lib/pages/cwu/proposals/view';
import * as CwuProposalList      from 'front-end/lib/pages/cwu/proposals/list';
import * as PageContent          from 'front-end/lib/pages/content';
import * as PageLanding          from 'front-end/lib/pages/landing';
import * as PageNotice           from 'front-end/lib/pages/notice';
import * as PageOpportunities    from 'front-end/lib/pages/opportunities';
import * as PageOrgCreate        from 'front-end/lib/pages/organization/create';
import * as PageOrgEdit          from 'front-end/lib/pages/organization/edit';
import * as PageOrgList          from 'front-end/lib/pages/organization/list';
import * as PageSignIn           from 'front-end/lib/pages/sign-in';
import * as PageSignOut          from 'front-end/lib/pages/sign-out';
import * as PageSignUpStepOne    from 'front-end/lib/pages/sign-up/step-one';
import * as PageSignUpStepTwo    from 'front-end/lib/pages/sign-up/step-two';
import * as PageUserList         from 'front-end/lib/pages/user/list';
import * as PageUserProfile      from 'front-end/lib/pages/user/profile';
import { includes }              from 'lodash';
import { Session }               from 'shared/lib/resources/session';
import { ADT }                   from 'shared/lib/types';

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
  | ADT<'cwuOpportunityCreate',  CwuOpportunityCreate.RouteParams>
  | ADT<'cwuOpportunityEdit',    CwuOpportunityEdit.RouteParams>
  | ADT<'cwuOpportunityView',    CwuOpportunityView.RouteParams>
  | ADT<'cwuProposalCreate',     CwuProposalCreate.RouteParams>
  | ADT<'cwuProposalEdit',       CwuProposalEdit.RouteParams>
  | ADT<'cwuProposalView',       CwuProposalView.RouteParams>
  | ADT<'cwuProposalList',       CwuProposalList.RouteParams>;

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
    cwuOpportunityCreate?: Immutable<CwuOpportunityCreate.State>;
    cwuOpportunityEdit?: Immutable<CwuOpportunityEdit.State>;
    cwuOpportunityView?: Immutable<CwuOpportunityView.State>;
    cwuProposalCreate?: Immutable<CwuProposalCreate.State>;
    cwuProposalEdit?: Immutable<CwuProposalEdit.State>;
    cwuProposalView?: Immutable<CwuProposalView.State>;
    cwuProposalList?: Immutable<CwuProposalList.State>;
  };
}

// Note(Jesse): @add_new_page_location
type InnerMsg
  = ADT<'noop'>
  | ADT<'closeModal'>
  | ADT<'nav',                   Nav.Msg>
  | ADT<'pageLanding',           PageLanding.Msg>
  | ADT<'pageOpportunities',     PageOpportunities.Msg>
  | ADT<'pageContent',           PageContent.Msg>
  | ADT<'pageSignIn',            PageSignIn.Msg>
  | ADT<'pageSignOut',           PageSignOut.Msg>
  | ADT<'pageSignUpStepOne',     PageSignUpStepOne.Msg>
  | ADT<'pageSignUpStepTwo',     PageSignUpStepTwo.Msg>
  | ADT<'pageNotice',            PageNotice.Msg>
  | ADT<'pageUserList',          PageUserList.Msg>
  | ADT<'pageUserProfile',       PageUserProfile.Msg>
  | ADT<'pageOrgCreate',         PageOrgCreate.Msg>
  | ADT<'pageOrgList',           PageOrgList.Msg>
  | ADT<'pageOrgEdit',           PageOrgEdit.Msg>
  | ADT<'cwuOpportunityCreate',  CwuOpportunityCreate.Msg>
  | ADT<'cwuOpportunityEdit',    CwuOpportunityEdit.Msg>
  | ADT<'cwuOpportunityView',    CwuOpportunityView.Msg>
  | ADT<'cwuProposalCreate',     CwuProposalCreate.Msg>
  | ADT<'cwuProposalEdit',       CwuProposalEdit.Msg>
  | ADT<'cwuProposalView',       CwuProposalView.Msg>
  | ADT<'cwuProposalList',       CwuProposalList.Msg>;


export type Msg = AppMsg<InnerMsg, Route>;
