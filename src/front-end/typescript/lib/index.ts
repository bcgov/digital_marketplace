import { PATH_PREFIX } from 'front-end/config';
import { ComponentView, emptyPageAlerts, emptyPageBreadcrumbs, Immutable, PageGetAlerts, PageGetBreadcrumbs, PageGetContextualActions, PageGetMetadata, PageGetModal, PageMetadata, PageSidebar, Update } from 'front-end/lib/framework';
import { COPY } from 'shared/config';
import { prefix } from 'shared/lib';
import { FileRecord } from 'shared/lib/resources/file';
import { UserType, userTypeToKeycloakIdentityProvider } from 'shared/lib/resources/user';
import { getValidValue, isInvalid, mapValid, Validation } from 'shared/lib/validation';

export function prefixPath(path: string): string {
  return `/${prefix(PATH_PREFIX)(path)}`;
}

export type WithState<State extends object, OtherArgs extends unknown[] = [], Result = Immutable<State>> = (state: Immutable<State>, ...otherArgs: OtherArgs) => Result;

export type AsyncWithState<State extends object, OtherArgs extends unknown[] = [], Result = Immutable<State>> = WithState<State, OtherArgs, Promise<Result>>;

export function makeStartLoading<State extends object>(key: keyof State): WithState<State> {
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

export function makeStopLoading<State  extends object>(key: keyof State): WithState<State> {
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

export type ValidatedState<ValidState  extends object> = Validation<Immutable<ValidState>, null>;

export function withValid<ValidState  extends object, Result>(fn: WithState<ValidState, [], Result>, defaultResult: Result): WithState<ValidatedState<ValidState>, [], Result> {
  return state => getValidValue(mapValid(state, fn), defaultResult);
}
//
export function updateValid<ValidState extends object, Msg>(update: Update<ValidState, Msg> | any): Update<ValidatedState<ValidState>, Msg> | any{
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

export function viewValid<ValidState  extends object, Msg>(view: ComponentView<ValidState, Msg>): ComponentView<ValidatedState<ValidState>, Msg> {
  return ({ state, dispatch }) => {
    if (isInvalid(state)) { return null; }
    return view({
      dispatch,
      state: state.value
    });
  };
}

export function sidebarValid<ValidState  extends object, Msg>(sidebar: PageSidebar<ValidState, Msg>): PageSidebar<ValidatedState<ValidState>, Msg> {
  return {
    ...sidebar,
    isEmptyOnMobile: sidebar.isEmptyOnMobile !== undefined ? withValid(sidebar.isEmptyOnMobile, false) : undefined,
    view: viewValid(sidebar.view)
  };
}

export function getMetadataValid<ValidState  extends object>(getMetadata: PageGetMetadata<ValidState>, defaultMetadata: PageMetadata): PageGetMetadata<ValidatedState<ValidState>> {
  return withValid(getMetadata, defaultMetadata);
}

export function getBreadcrumbsValid<ValidState  extends object, Msg>(getBreadcrumbs: PageGetBreadcrumbs<ValidState, Msg>): PageGetBreadcrumbs<ValidatedState<ValidState>, Msg> {
  return withValid(getBreadcrumbs, emptyPageBreadcrumbs());
}

export function getAlertsValid<ValidState extends object, Msg>(getAlerts: PageGetAlerts<ValidState, Msg>): PageGetAlerts<ValidatedState<ValidState>, Msg> {
  return withValid(getAlerts, emptyPageAlerts());
}

export function getModalValid<ValidState  extends object, Msg>(getModal: PageGetModal<ValidState, Msg>): PageGetModal<ValidatedState<ValidState>, Msg> {
  return withValid(getModal, null);
}

export function getContextualActionsValid<ValidState  extends object, Msg>(getContextualActions: PageGetContextualActions<ValidState, Msg>): PageGetContextualActions<ValidatedState<ValidState>, Msg> {
  return ({ state, dispatch }) => {
    if (isInvalid(state)) { return null; }
    return getContextualActions({
      dispatch,
      state: state.value
    });
  };
}

export const TITLE_SEPARATOR = '—';

export function makePageMetadata(title?: string): PageMetadata {
  return {
    title: title ? `${title} ${TITLE_SEPARATOR} ${COPY.region.name.short} Digital Marketplace` : `${COPY.region.name.short} Digital Marketplace`
  };
}

export function getSignInUrl(userType: UserType, redirectOnSuccess?: string): string   {
  let result = prefixPath(`auth/sign-in?provider=${userTypeToKeycloakIdentityProvider(userType)}`);
  if (redirectOnSuccess) { result += `&redirectOnSuccess=${window.encodeURIComponent(redirectOnSuccess)}`; }
  return result;
}

export function fileBlobPath(file: Pick<FileRecord, 'id'>) {
  return prefixPath(`api/files/${file.id}?type=blob`);
}
