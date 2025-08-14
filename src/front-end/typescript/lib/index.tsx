import { VITE_PATH_PREFIX } from "front-end/config";
import { component, Immutable } from "front-end/lib/framework";
import React from "react";
import { Fragment, ReactElement } from "react";
import { COPY } from "shared/config";
import { intersperse, prefix } from "shared/lib";
import { FileRecord } from "shared/lib/resources/file";
import {
  UserType,
  userTypeToKeycloakIdentityProvider
} from "shared/lib/resources/user";
import {
  getValidValue,
  isInvalid,
  mapValid,
  Validation
} from "shared/lib/validation";

export function prefixPath(path: string): string {
  return `/${prefix(VITE_PATH_PREFIX)(path)}`;
}

export type WithState<
  State,
  OtherArgs extends unknown[] = [],
  Result = Immutable<State>
> = (state: Immutable<State>, ...otherArgs: OtherArgs) => Result;

export type AsyncWithState<
  State,
  OtherArgs extends unknown[] = [],
  Result = Immutable<State>
> = WithState<State, OtherArgs, Promise<Result>>;

export function makeStartLoading<State>(key: keyof State): WithState<State> {
  return (state) => {
    const value = state.get(key);
    if (typeof value === "number") {
      // Need to setIn to circumvent type system's lack of support
      // for recursive types.
      return state.setIn([key], value + 1);
    } else {
      return state;
    }
  };
}

export function makeStopLoading<State>(key: keyof State): WithState<State> {
  return (state) => {
    const value = state.get(key);
    if (typeof value === "number") {
      // Need to setIn to circumvent type system's lack of support
      // for recursive types.
      return state.setIn([key], Math.max(0, value - 1));
    } else {
      return state;
    }
  };
}

export type ValidatedState<ValidState> = Validation<
  Immutable<ValidState>,
  null
>;

export function withValid<ValidState, Result>(
  fn: WithState<ValidState, [], Result>,
  defaultResult: Result
): WithState<ValidatedState<ValidState>, [], Result> {
  return (state) => getValidValue(mapValid(state, fn), defaultResult);
}
//
export function updateValid<ValidState, Msg>(
  update: component.base.Update<ValidState, Msg>
): component.base.Update<ValidatedState<ValidState>, Msg> {
  return ({ state, msg }) => {
    if (isInvalid(state)) {
      return [state, []];
    }
    const result = update({
      state: state.value,
      msg
    });
    return [state.set("value", result[0]), result[1]];
  };
}

export function viewValid<ValidState, Msg>(
  view: component.base.ComponentView<ValidState, Msg>
): component.base.ComponentView<ValidatedState<ValidState>, Msg> {
  return ({ state, dispatch }) => {
    if (isInvalid(state)) {
      return null;
    }
    return view({
      dispatch,
      state: state.value
    });
  };
}

export function sidebarValid<ValidState, Msg>(
  sidebar: component.page.Sidebar<ValidState, Msg>
): component.page.Sidebar<ValidatedState<ValidState>, Msg> {
  return {
    ...sidebar,
    isEmptyOnMobile:
      sidebar.isEmptyOnMobile !== undefined
        ? withValid(sidebar.isEmptyOnMobile, false)
        : undefined,
    view: viewValid(sidebar.view)
  };
}

export function getMetadataValid<ValidState>(
  getMetadata: component.page.GetMetadata<ValidState>,
  defaultMetadata: component.page.Metadata
): component.page.GetMetadata<ValidatedState<ValidState>> {
  return withValid(getMetadata, defaultMetadata);
}

export function getBreadcrumbsValid<ValidState, Msg>(
  getBreadcrumbs: component.page.GetBreadcrumbs<ValidState, Msg>
): component.page.GetBreadcrumbs<ValidatedState<ValidState>, Msg> {
  return withValid(getBreadcrumbs, component.page.breadcrumbs.empty());
}

export function getAlertsValid<ValidState, Msg>(
  getAlerts: component.page.GetAlerts<ValidState, Msg>
): component.page.GetAlerts<ValidatedState<ValidState>, Msg> {
  return withValid(getAlerts, component.page.alerts.empty());
}

export function getModalValid<ValidState, Msg>(
  getModal: component.page.GetModal<ValidState, Msg>
): component.page.GetModal<ValidatedState<ValidState>, Msg> {
  return withValid(getModal, component.page.modal.hide());
}

export function getActionsValid<ValidState, Msg>(
  getActions: component.page.GetActions<ValidState, Msg>
): component.page.GetActions<ValidatedState<ValidState>, Msg> {
  return ({ state, dispatch }) => {
    if (isInvalid(state)) {
      return component.page.actions.none();
    }
    return getActions({
      dispatch,
      state: state.value
    });
  };
}

export const TITLE_SEPARATOR = "—";

export function makePageMetadata(title?: string): component.page.Metadata {
  return {
    title: title
      ? `${title} ${TITLE_SEPARATOR} ${COPY.region.name.short} Digital Marketplace`
      : `${COPY.region.name.short} Digital Marketplace`
  };
}

export function getSignInUrl(
  userType: UserType,
  redirectOnSuccess?: string
): string {
  let result = prefixPath(
    `auth/sign-in?provider=${userTypeToKeycloakIdentityProvider(userType)}`
  );
  if (redirectOnSuccess) {
    result += `&redirectOnSuccess=${window.encodeURIComponent(
      redirectOnSuccess
    )}`;
  }
  return result;
}

export function fileBlobPath(file: Pick<FileRecord, "id">) {
  return prefixPath(`api/files/${file.id}?type=blob`);
}

interface IntersperseProps {
  collection: Array<ReactElement | string>;
  separator: ReactElement | string;
}

export const Intersperse: component.base.View<IntersperseProps> = ({
  collection,
  separator
}) => (
  <Fragment
    children={intersperse(collection, separator).map((child, i) => (
      <Fragment key={`${i}`}>{child}</Fragment>
    ))}
  />
);
