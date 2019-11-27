import { AppMsg, Immutable, PageModal } from 'front-end/lib/framework';
import * as PageHello from 'front-end/lib/pages/hello';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as PageSignOut from 'front-end/lib/pages/sign-out';
import { Session } from 'shared/lib/resources/session';
import { ADT } from 'shared/lib/types';

export type Route
  = ADT<'hello', PageHello.RouteParams>
  | ADT<'signOut', PageSignOut.RouteParams>
  | ADT<'notice', PageNotice.RouteParams>;

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
  pages: {
    hello?: Immutable<PageHello.State>;
    signOut?: Immutable<PageSignOut.State>;
    notice?: Immutable<PageNotice.State>;
  };
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'toggleIsNavOpen', boolean | undefined>
  | ADT<'closeModal'>
  | ADT<'pageHello', PageHello.Msg>
  | ADT<'pageSignOut', PageSignOut.Msg>
  | ADT<'pageNotice', PageNotice.Msg>;

export type Msg = AppMsg<InnerMsg, Route>;
