import { AppMsg, Immutable, PageModal } from 'front-end/lib/framework';

// Note(Jesse): @add_new_page_location
import * as PageHello from 'front-end/lib/pages/hello';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as PageOrgEdit from 'front-end/lib/pages/org/edit';
import * as PageOrgView from 'front-end/lib/pages/org/view';
import * as PageSignIn from 'front-end/lib/pages/sign-in';
import * as PageSignOut from 'front-end/lib/pages/sign-out';
import * as PageSignUpStepTwo from 'front-end/lib/pages/sign-up/step-two';
import * as PageUserEdit from 'front-end/lib/pages/user/edit';
import * as PageUserList from 'front-end/lib/pages/user/list';
import * as PageUserView from 'front-end/lib/pages/user/view';
import { Session } from 'shared/lib/resources/session';
import { ADT } from 'shared/lib/types';

// Note(Jesse): @add_new_page_location
export type Route
  = ADT<'hello',     PageHello.RouteParams>
  | ADT<'signOut',   PageSignOut.RouteParams>
  | ADT<'signIn',    PageSignIn.RouteParams>
  | ADT<'signUpStepTwo', PageSignUpStepTwo.RouteParams>
  | ADT<'notice',    PageNotice.RouteParams>
  | ADT<'userList',  PageUserList.RouteParams>
  | ADT<'userView',  PageUserView.RouteParams>
  | ADT<'userEdit',  PageUserEdit.RouteParams>
  | ADT<'orgView',   PageOrgView.RouteParams>
  | ADT<'orgEdit',   PageOrgEdit.RouteParams>;

export interface SharedState {
  session?: Session;
}

export interface State {
  ready: boolean;
  transitionLoading: number;
  isNavOpen: boolean;
  modal: {
    open: boolean;
    content: PageModal<Msg>;
  };
  shared: SharedState;
  activeRoute: Route;

  // Note(Jesse): @add_new_page_location
  pages: {
    hello?: Immutable<PageHello.State>;
    signOut?: Immutable<PageSignOut.State>;
    signUpStepTwo?: Immutable<PageSignUpStepTwo.State>;
    signIn?: Immutable<PageSignIn.State>;
    notice?: Immutable<PageNotice.State>;
    userList?: Immutable<PageUserList.State>;
    userView?: Immutable<PageUserView.State>;
    userEdit?: Immutable<PageUserEdit.State>;
    orgView?: Immutable<PageOrgView.State>;
    orgEdit?: Immutable<PageOrgEdit.State>;
  };
}

// Note(Jesse): @add_new_page_location
type InnerMsg
  = ADT<'noop'>
  | ADT<'toggleIsNavOpen', boolean | undefined>
  | ADT<'closeModal'>
  | ADT<'pageHello', PageHello.Msg>
  | ADT<'pageSignIn', PageSignIn.Msg>
  | ADT<'pageSignOut', PageSignOut.Msg>
  | ADT<'pageSignUpStepTwo', PageSignUpStepTwo.Msg>
  | ADT<'pageNotice', PageNotice.Msg>
  | ADT<'pageUserList', PageUserList.Msg>
  | ADT<'pageUserView', PageUserView.Msg>
  | ADT<'pageUserEdit', PageUserEdit.Msg>
  | ADT<'pageOrgView', PageOrgView.Msg>
  | ADT<'pageOrgEdit', PageOrgEdit.Msg>;

export type Msg = AppMsg<InnerMsg, Route>;
