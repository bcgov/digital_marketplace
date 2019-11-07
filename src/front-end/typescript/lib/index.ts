import { Immutable, PageMetadata } from 'front-end/lib/framework';

export type UpdateState<State> = (state: Immutable<State>) => Immutable<State>;

export function makeStartLoading<State, Key extends keyof State>(key: Key): UpdateState<State> {
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

export function makeStopLoading<State, Key extends keyof State>(key: Key): UpdateState<State> {
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
    title: `${title} — Real Folk — Digital Marketplace Code Challenge`
  };
}
