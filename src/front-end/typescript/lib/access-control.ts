import { Route, SharedState } from "front-end/lib/app/types";
import { component } from "front-end/lib/framework";
import { includes } from "lodash";
import { User, UserType } from "shared/lib/resources/user";

export interface AccessControlParams<
  RouteParams,
  PageState,
  PageMsg,
  SuccessSharedState = SharedState,
  FailSharedState = SharedState
> {
  success: component.page.Init<
    RouteParams,
    SuccessSharedState,
    PageState,
    PageMsg,
    Route
  >;
  fail: component.page.Init<
    RouteParams,
    FailSharedState,
    PageState,
    PageMsg,
    Route
  >;
}

export interface SharedStateWithGuaranteedSessionUser {
  sessionUser: User;
  original: SharedState;
}

export function isSignedOut<RouteParams, PageState, PageMsg>(
  params: AccessControlParams<
    RouteParams,
    PageState,
    PageMsg,
    SharedState,
    SharedStateWithGuaranteedSessionUser
  >
): component.page.Init<RouteParams, SharedState, PageState, PageMsg, Route> {
  return (initParams) => {
    const { shared } = initParams;
    if (!shared.session) {
      return params.success(initParams);
    } else {
      return params.fail({
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
    PageMsg,
    SharedStateWithGuaranteedSessionUser
  >
): component.page.Init<RouteParams, SharedState, PageState, PageMsg, Route> {
  return (initParams) => {
    const { shared } = initParams;
    if (shared.session) {
      return params.success({
        ...initParams,
        shared: {
          sessionUser: shared.session.user,
          original: initParams.shared
        }
      });
    } else {
      return params.fail(initParams);
    }
  };
}

interface IsUserTypeParams<RouteParams, PageState, PageMsg>
  extends AccessControlParams<
    RouteParams,
    PageState,
    PageMsg,
    SharedStateWithGuaranteedSessionUser
  > {
  userType: UserType[];
}

export function isUserType<RouteParams, PageState, PageMsg>(
  params: IsUserTypeParams<RouteParams, PageState, PageMsg>
): component.page.Init<RouteParams, SharedState, PageState, PageMsg, Route> {
  return (initParams) => {
    const { shared } = initParams;
    if (shared.session && includes(params.userType, shared.session.user.type)) {
      return params.success({
        ...initParams,
        shared: {
          sessionUser: shared.session.user,
          original: initParams.shared
        }
      });
    } else {
      return params.fail(initParams);
    }
  };
}
