import { ComponentView, emptyPageAlerts, emptyPageBreadcrumbs, Immutable, PageGetAlerts, PageGetBreadcrumbs, PageGetContextualActions, PageGetMetadata, PageGetModal, PageMetadata, PageSidebar, Update } from 'front-end/lib/framework';
import { UserType, userTypeToKeycloakIdentityProvider } from 'shared/lib/resources/user';
import { getValidValue, isInvalid, mapValid, Validation } from 'shared/lib/validation';

export type WithState<State, OtherArgs extends unknown[] = [], Result = Immutable<State>> = (state: Immutable<State>, ...otherArgs: OtherArgs) => Result;

export type AsyncWithState<State, OtherArgs extends unknown[] = [], Result = Immutable<State>> = WithState<State, OtherArgs, Promise<Result>>;

export function makeStartLoading<State>(key: keyof State): WithState<State> {
  return state => {
    const value = state.get(key);
    if (typeof value === 'number') {
      // Need to setIn to circumvent type system's lack of support
      // for recursive types.
      return state.setIn([key], value + 1);
    } else {
      return state;
    }
  };
}

export function makeStopLoading<State>(key: keyof State): WithState<State> {
  return state => {
    const value = state.get(key);
    if (typeof value === 'number') {
      // Need to setIn to circumvent type system's lack of support
      // for recursive types.
      return state.setIn([key], Math.max(0, value - 1));
    } else {
      return state;
    }
  };
}

export type ValidatedState<ValidState> = Validation<Immutable<ValidState>, null>;

export function withValid<ValidState, Result>(fn: WithState<ValidState, [], Result>, defaultResult: Result): WithState<ValidatedState<ValidState>, [], Result> {
  return state => getValidValue(mapValid(state, fn), defaultResult);
}

export function updateValid<ValidState, Msg>(update: Update<ValidState, Msg>): Update<ValidatedState<ValidState>, Msg> {
  return ({ state, msg }) => {
    if (isInvalid(state)) { return [state]; }
    const result = update({
      state: state.value,
      msg
    });
    return [
      state.update('value', v => v && result[0]),
      result[1] && (async (state, dispatch) => {
        if (isInvalid(state) || !result[1]) { return state; }
        const newValidState = await result[1](state.value, dispatch);
        return newValidState && state.update('value', v => v && newValidState);
      })
    ];
  };
}

export function viewValid<ValidState, Msg>(view: ComponentView<ValidState, Msg>): ComponentView<ValidatedState<ValidState>, Msg> {
  return ({ state, dispatch }) => {
    if (isInvalid(state)) { return null; }
    return view({
      dispatch,
      state: state.value
    });
  };
}

export function sidebarValid<ValidState, Msg>(sidebar: PageSidebar<ValidState, Msg>): PageSidebar<ValidatedState<ValidState>, Msg> {
  return {
    ...sidebar,
    isEmptyOnMobile: sidebar.isEmptyOnMobile !== undefined ? withValid(sidebar.isEmptyOnMobile, false) : undefined,
    view: viewValid(sidebar.view)
  };
}

export function getMetadataValid<ValidState>(getMetadata: PageGetMetadata<ValidState>, defaultMetadata: PageMetadata): PageGetMetadata<ValidatedState<ValidState>> {
  return withValid(getMetadata, defaultMetadata);
}

export function getBreadcrumbsValid<ValidState, Msg>(getBreadcrumbs: PageGetBreadcrumbs<ValidState, Msg>): PageGetBreadcrumbs<ValidatedState<ValidState>, Msg> {
  return withValid(getBreadcrumbs, emptyPageBreadcrumbs());
}

export function getAlertsValid<ValidState, Msg>(getAlerts: PageGetAlerts<ValidState, Msg>): PageGetAlerts<ValidatedState<ValidState>, Msg> {
  return withValid(getAlerts, emptyPageAlerts());
}

export function getModalValid<ValidState, Msg>(getModal: PageGetModal<ValidState, Msg>): PageGetModal<ValidatedState<ValidState>, Msg> {
  return withValid(getModal, null);
}

export function getContextualActionsValid<ValidState, Msg>(getContextualActions: PageGetContextualActions<ValidState, Msg>): PageGetContextualActions<ValidatedState<ValidState>, Msg> {
  return ({ state, dispatch }) => {
    if (isInvalid(state)) { return null; }
    return getContextualActions({
      dispatch,
      state: state.value
    });
  };
}

export const TITLE_SEPARATOR = '—';

export function makePageMetadata(title: string): PageMetadata {
  return {
    title: `${title} ${TITLE_SEPARATOR} Digital Marketplace`
  };
}

export function getSignInUrl(userType: UserType, redirectOnSuccess?: string): string   {
  let result = `/auth/sign-in?provider=${userTypeToKeycloakIdentityProvider(userType)}`;
  if (redirectOnSuccess) { result += `&redirectOnSuccess=${window.encodeURIComponent(redirectOnSuccess)}`; }
  return result;
}
