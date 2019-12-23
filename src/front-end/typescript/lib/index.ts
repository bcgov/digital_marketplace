import { Immutable, PageMetadata } from 'front-end/lib/framework';
import { UserType, userTypeToKeycloakIdentityProvider } from 'shared/lib/resources/user';

export type UpdateState<State> = (state: Immutable<State>) => Immutable<State>;

export function makeStartLoading<State>(key: keyof State): UpdateState<State> {
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

export function makeStopLoading<State>(key: keyof State): UpdateState<State> {
  return state => {
    const value = state.get(key);
    if (typeof value === 'number') {
      // Need to setIn to circumvent type system's lack of support
      // for recursive types.
      return state.setIn([key], value - 1);
    } else {
      return state;
    }
  };
}

export function makePageMetadata(title: string): PageMetadata {
  return {
    title: `${title} — Digital Marketplace`
  };
}

export function getSignInUrl(userType: UserType): string   {
  return `/auth/sign-in?provider=${userTypeToKeycloakIdentityProvider(userType)}`;
}
