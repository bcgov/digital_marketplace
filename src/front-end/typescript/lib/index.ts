import { ComponentView, Immutable, PageMetadata, Update } from 'front-end/lib/framework';
import { UserType, userTypeToKeycloakIdentityProvider } from 'shared/lib/resources/user';
import { isInvalid, Validation } from 'shared/lib/validation';

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

export type ValidatedState<ValidState> = Validation<Immutable<ValidState>, null>;

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

export function makePageMetadata(title: string): PageMetadata {
  return {
    title: `${title} — Digital Marketplace`
  };
}

export function getSignInUrl(userType: UserType): string   {
  return `/auth/sign-in?provider=${userTypeToKeycloakIdentityProvider(userType)}`;
}
