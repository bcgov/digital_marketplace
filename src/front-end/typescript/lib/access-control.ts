import { Route, SharedState } from "front-end/lib/app/types";
import { GlobalComponentMsg, PageInit } from "front-end/lib/framework";
import { includes } from "lodash";
import { User, UserType } from "shared/lib/resources/user";

export interface AccessControlParams<
  RouteParams,
  PageState,
  PageMsg,
  SuccessSharedState = SharedState,
  FailSharedState = SharedState
> {
  success: PageInit<RouteParams, SuccessSharedState, PageState, PageMsg>;
  fail: PageInit<RouteParams, FailSharedState, PageState, PageMsg>;
}

export interface SharedStateWithGuaranteedSessionUser {
  sessionUser: User;
  original: SharedState;
}

export function isSignedOut<RouteParams, PageState, PageMsg>(
  params: AccessControlParams<
    RouteParams,
    PageState,
    GlobalComponentMsg<PageMsg, Route>,
    SharedState,
    SharedStateWithGuaranteedSessionUser
  >
): PageInit<
  RouteParams,
  SharedState,
  PageState,
  GlobalComponentMsg<PageMsg, Route>
> {
  return async (initParams) => {
    const { shared } = initParams;
    if (!shared.session) {
      return await params.success(initParams);
    } else {
      return await params.fail({
        ...initParams,
        shared: {
          sessionUser: shared.session.user,
          original: initParams.shared
        }
      });
    }
  };
}

export function isSignedIn<RouteParams, PageState, PageMsg>(
  params: AccessControlParams<
    RouteParams,
    PageState,
    GlobalComponentMsg<PageMsg, Route>,
    SharedStateWithGuaranteedSessionUser
  >
): PageInit<
  RouteParams,
  SharedState,
  PageState,
  GlobalComponentMsg<PageMsg, Route>
> {
  return async (initParams) => {
    const { shared } = initParams;
    if (shared.session) {
      return await params.success({
        ...initParams,
        shared: {
          sessionUser: shared.session.user,
          original: initParams.shared
        }
      });
    } else {
      return await params.fail(initParams);
    }
  };
}

interface IsUserTypeParams<RouteParams, PageState, PageMsg>
  extends AccessControlParams<
    RouteParams,
    PageState,
    GlobalComponentMsg<PageMsg, Route>,
    SharedStateWithGuaranteedSessionUser
  > {
  userType: UserType[];
}

export function isUserType<RouteParams, PageState, PageMsg>(
  params: IsUserTypeParams<RouteParams, PageState, PageMsg>
): PageInit<
  RouteParams,
  SharedState,
  PageState,
  GlobalComponentMsg<PageMsg, Route>
> {
  return async (initParams) => {
    const { shared } = initParams;
    if (shared.session && includes(params.userType, shared.session.user.type)) {
      return await params.success({
        ...initParams,
        shared: {
          sessionUser: shared.session.user,
          original: initParams.shared
        }
      });
    } else {
      return await params.fail(initParams);
    }
  };
}
