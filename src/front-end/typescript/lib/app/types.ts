import { AppMsg, Immutable, PageModal } from 'front-end/lib/framework';

// Note(Jesse): @add_new_page_location
import * as PageUserList from 'front-end/lib/pages/user/list';
import * as PageHello from 'front-end/lib/pages/hello';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as PageSignIn from 'front-end/lib/pages/sign-in';
import * as PageSignOut from 'front-end/lib/pages/sign-out';
import { Session } from 'shared/lib/resources/session';
import { ADT } from 'shared/lib/types';

// Note(Jesse): @add_new_page_location
export type Route
  = ADT<'hello',     PageHello.RouteParams>
  | ADT<'signIn',    PageSignIn.RouteParams>
  | ADT<'signOut',   PageSignOut.RouteParams>
  | ADT<'notice',    PageNotice.RouteParams>
  | ADT<'userList',  PageUserList.RouteParams>
  ;

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
    signIn?: Immutable<PageSignIn.State>;
    notice?: Immutable<PageNotice.State>;
    userList?: Immutable<PageUserList.State>;
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
  | ADT<'pageNotice', PageNotice.Msg>
  | ADT<'pageUserList', PageUserList.Msg>
  ;

export type Msg = AppMsg<InnerMsg, Route>;
