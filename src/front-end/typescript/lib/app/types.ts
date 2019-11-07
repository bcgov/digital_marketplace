import { AppMsg, Immutable, PageModal } from 'front-end/lib/framework';
import * as PageAuthorCreate from 'front-end/lib/pages/author/create';
import * as PageAuthorList from 'front-end/lib/pages/author/list';
import * as PageBookCreate from 'front-end/lib/pages/book/create';
import * as PageBookList from 'front-end/lib/pages/book/list';
import * as PageGenreList from 'front-end/lib/pages/genre/list';
import * as PageLibrarianSignIn from 'front-end/lib/pages/librarian-sign-in';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as PageSignOut from 'front-end/lib/pages/sign-out';
import { ADT, Session } from 'shared/lib/types';

export type Route
  = ADT<'bookCreate', PageBookCreate.RouteParams>
  | ADT<'bookList', PageBookList.RouteParams>
  | ADT<'genreList', PageGenreList.RouteParams>
  | ADT<'authorCreate', PageAuthorCreate.RouteParams>
  | ADT<'authorList', PageAuthorList.RouteParams>
  | ADT<'librarianSignIn', PageLibrarianSignIn.RouteParams>
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
  },
  shared: SharedState;
  activeRoute: Route;
  pages: {
    bookCreate?: Immutable<PageBookCreate.State>;
    bookList?: Immutable<PageBookList.State>;
    genreList?: Immutable<PageGenreList.State>;
    authorCreate?: Immutable<PageAuthorCreate.State>;
    authorList?: Immutable<PageAuthorList.State>;
    librarianSignIn?: Immutable<PageLibrarianSignIn.State>;
    signOut?: Immutable<PageSignOut.State>;
    notice?: Immutable<PageNotice.State>;
  };
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'toggleIsNavOpen', boolean | undefined>
  | ADT<'closeModal'>
  | ADT<'pageBookCreate', PageBookCreate.Msg>
  | ADT<'pageBookList', PageBookList.Msg>
  | ADT<'pageGenreList', PageGenreList.Msg>
  | ADT<'pageAuthorCreate', PageAuthorCreate.Msg>
  | ADT<'pageAuthorList', PageAuthorList.Msg>
  | ADT<'pageLibrarianSignIn', PageLibrarianSignIn.Msg>
  | ADT<'pageSignOut', PageSignOut.Msg>
  | ADT<'pageNotice', PageNotice.Msg>;

export type Msg = AppMsg<InnerMsg, Route>;
