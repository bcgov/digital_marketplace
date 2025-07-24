import { adt, ADT, ClientHttpMethod } from "shared/lib/types";
import { Metadata } from "front-end/lib/framework/component/page/metadata";
import {
  invalid,
  request,
  ResponseValidation,
  unhandled,
  valid
} from "shared/lib/http";
import * as router from "front-end/lib/framework/router";

export type Cmd<Msg> = ADT<"async", () => Promise<Msg>>;

// Constructors

export function dispatch<Msg>(msg: Msg): Cmd<Msg> {
  return adt("async", async () => msg);
}

export function delayedDispatch<Msg>(delay: number, msg: Msg): Cmd<Msg> {
  return adt("async", async (): Promise<Msg> => {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), delay);
    });
    return msg;
  });
}

/**
 * Limits the rate at which a function can fire. Returns a function that will
 * dispatch the `dispatchMsg` argument once, and only after the `duration`
 * (debounced) interval has passed regardless of how many times it continues
 * to be invoked. Should `makeDebouncedDispatch` be called multiple times during
 * the duration/debounce period, or if a dispatch has been "cancelled", the
 * `noOpMsg` argument is dispatched instead.
 *
 * @see {@link dispatchSearch} in 'src/front-end/typescript/lib/pages/opportunity/list.tsx'
 *
 * @param noOpMsg - Msg sent out during the duration period
 * @param dispatchMsg - Msg triggered once after the duration period
 * @param duration - delay, duration period in milliseconds
 */
export function makeDebouncedDispatch<Msg>(
  noOpMsg: Msg,
  dispatchMsg: Msg,
  duration: number
): () => Cmd<Msg> {
  let globalTimeout: NodeJS.Timeout | null = null;
  return () =>
    adt("async", async () => {
      let thisTimeout: NodeJS.Timeout | null = null;
      await new Promise<void>((resolve) => {
        thisTimeout = setTimeout(() => {
          resolve();
        }, duration);
        globalTimeout = thisTimeout;
      });
      return thisTimeout == globalTimeout ? dispatchMsg : noOpMsg;
    });
}

export interface HttpRequestParams<
  RawResponse,
  ValidResponse,
  InvalidResponse,
  Msg
> {
  method: ClientHttpMethod;
  url: string;
  headers?: object;
  body?: object | null | string;
  transformResponse(raw: RawResponse): ValidResponse;
  handleResponse(
    response: ResponseValidation<ValidResponse, InvalidResponse>
  ): Msg;
}

export function httpRequest<RawResponse, ValidResponse, InvalidResponse, Msg>(
  params: HttpRequestParams<RawResponse, ValidResponse, InvalidResponse, Msg>
): Cmd<Msg> {
  return adt("async", async () => {
    const response = await request(
      params.method,
      params.url,
      params.body || undefined
    );
    switch (response.status) {
      case 200:
      case 201:
        return params.handleResponse(
          valid(params.transformResponse(response.data as RawResponse))
        );
      case 400:
      case 401:
      case 404:
        return params.handleResponse(invalid(response.data as InvalidResponse));
      default:
        return params.handleResponse(unhandled());
    }
  });
}

export function setPageMetadata<Msg>(metadata: Metadata, msg: Msg): Cmd<Msg> {
  return adt("async", async () => {
    document.title = metadata.title;
    return msg;
  });
}

export function focus<Msg>(id: string, msg: Msg): Cmd<Msg> {
  return adt("async", async () => {
    document.getElementById(id)?.focus();
    return msg;
  });
}

export function blur<Msg>(id: string, msg: Msg): Cmd<Msg> {
  return adt("async", async () => {
    document.getElementById(id)?.blur();
    return msg;
  });
}

export function scrollTo<Msg>(x: number, y: number, msg: Msg): Cmd<Msg> {
  return adt("async", async () => {
    document.documentElement.scrollTo(x, y);
    return msg;
  });
}

export function scrollContainerTo<Msg>(
  x: number,
  y: number,
  msg: Msg,
  element: HTMLElement
): Cmd<Msg> {
  return adt("async", async () => {
    element.scrollTo(x, y);
    return msg;
  });
}

export function pushUrlState<Msg>(url: string, msg: Msg): Cmd<Msg> {
  return adt("async", async () => {
    router.pushState(url, 0);
    return msg;
  });
}

export function replaceUrlState<Msg>(url: string, msg: Msg): Cmd<Msg> {
  return adt("async", async () => {
    router.replaceState(url, 0);
    return msg;
  });
}

export function redirect<Msg>(path: string, msg: Msg): Cmd<Msg> {
  return adt("async", async () => {
    window.location.href = `${window.location.origin}/${path}`;
    return msg;
  });
}

export function back<Msg>(msg: Msg): Cmd<Msg> {
  return adt("async", async () => {
    if (window.history && window.history.back) {
      window.history.back();
    }
    return msg;
  });
}

function getItem<Msg>(
  key: string,
  toMsg: (value: string | null) => Msg
): Cmd<Msg> {
  return adt("async", async () => {
    if (!window.localStorage) return toMsg(null);
    return toMsg(window.localStorage.getItem(key));
  });
}

function setItem<Msg>(key: string, value: string, noOpMsg: Msg): Cmd<Msg> {
  return adt("async", async () => {
    if (window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return noOpMsg;
  });
}

function removeItem<Msg>(key: string, noOpMsg: Msg): Cmd<Msg> {
  return adt("async", async () => {
    if (window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return noOpMsg;
  });
}

function clear<Msg>(noOpMsg: Msg): Cmd<Msg> {
  return adt("async", async () => {
    if (window.localStorage) {
      window.localStorage.clear();
    }
    return noOpMsg;
  });
}

export const localStorage = {
  getItem,
  setItem,
  removeItem,
  clear
};

// Helpers

export function map<A, B>(cmd: Cmd<A>, convert: (msgA: A) => B): Cmd<B> {
  return adt("async", async () => convert(await cmd.value()));
}

export function mapMany<A, B>(
  cmds: Cmd<A>[],
  convert: (msgA: A) => B
): Cmd<B>[] {
  return cmds.map((cmd) => map(cmd, convert));
}

export function andThen<A, B>(
  cmdA: Cmd<A>,
  convert: (msgA: A) => Cmd<B>
): Cmd<B> {
  return adt("async", async () => {
    const msgA = await cmdA.value();
    const cmdB = convert(msgA);
    return await cmdB.value();
  });
}

export function sequence<A>(cmds: Cmd<A>[]): Cmd<A[]> {
  return cmds.reduce((acc, cmd) => {
    return join(acc, cmd, (results, a) => [...results, a]);
  }, dispatch([]) as Cmd<A[]>);
}

export function join<A, B, C>(
  cmdA: Cmd<A>,
  cmdB: Cmd<B>,
  merge: (msgA: A, msgB: B) => C
): Cmd<C> {
  return andThen(cmdA, (msgA) => {
    return andThen(cmdB, (msgB) => dispatch(merge(msgA, msgB)));
  });
}

export function join3<A, B, C, D>(
  cmdA: Cmd<A>,
  cmdB: Cmd<B>,
  cmdC: Cmd<C>,
  merge: (msgA: A, msgB: B, msgC: C) => D
): Cmd<D> {
  return join(
    cmdA,
    join(cmdB, cmdC, (msgB, msgC) => [msgB, msgC] as const),
    (msgA, [msgB, msgC]) => merge(msgA, msgB, msgC)
  );
}

export function join4<A, B, C, D, E>(
  cmdA: Cmd<A>,
  cmdB: Cmd<B>,
  cmdC: Cmd<C>,
  cmdD: Cmd<D>,
  merge: (msgA: A, msgB: B, msgC: C, msgD: D) => E
): Cmd<E> {
  return join(
    cmdA,
    join3(cmdB, cmdC, cmdD, (msgB, msgC, msgD) => [msgB, msgC, msgD] as const),
    (msgA, [msgB, msgC, msgD]) => merge(msgA, msgB, msgC, msgD)
  );
}

export function join5<A, B, C, D, E, F>(
  cmdA: Cmd<A>,
  cmdB: Cmd<B>,
  cmdC: Cmd<C>,
  cmdD: Cmd<D>,
  cmdE: Cmd<E>,
  merge: (msgA: A, msgB: B, msgC: C, msgD: D, msgE: E) => F
): Cmd<F> {
  return join(
    cmdA,
    join4(
      cmdB,
      cmdC,
      cmdD,
      cmdE,
      (msgB, msgC, msgD, msgE) => [msgB, msgC, msgD, msgE] as const
    ),
    (msgA, [msgB, msgC, msgD, msgE]) => merge(msgA, msgB, msgC, msgD, msgE)
  );
}

export function join6<A, B, C, D, E, F, G>(
  cmdA: Cmd<A>,
  cmdB: Cmd<B>,
  cmdC: Cmd<C>,
  cmdD: Cmd<D>,
  cmdE: Cmd<E>,
  cmdF: Cmd<F>,
  merge: (msgA: A, msgB: B, msgC: C, msgD: D, msgE: E, msgF: F) => G
): Cmd<G> {
  return join(
    cmdA,
    join5(
      cmdB,
      cmdC,
      cmdD,
      cmdE,
      cmdF,
      (msgB, msgC, msgD, msgE, msgF) => [msgB, msgC, msgD, msgE, msgF] as const
    ),
    (msgA, [msgB, msgC, msgD, msgE, msgF]) =>
      merge(msgA, msgB, msgC, msgD, msgE, msgF)
  );
}

export function join7<A, B, C, D, E, F, G, H>(
  cmdA: Cmd<A>,
  cmdB: Cmd<B>,
  cmdC: Cmd<C>,
  cmdD: Cmd<D>,
  cmdE: Cmd<E>,
  cmdF: Cmd<F>,
  cmdG: Cmd<G>,
  merge: (msgA: A, msgB: B, msgC: C, msgD: D, msgE: E, msgF: F, msgG: G) => H
): Cmd<H> {
  return join(
    cmdA,
    join6(
      cmdB,
      cmdC,
      cmdD,
      cmdE,
      cmdF,
      cmdG,
      (msgB, msgC, msgD, msgE, msgF, msgG) =>
        [msgB, msgC, msgD, msgE, msgF, msgG] as const
    ),
    (msgA, [msgB, msgC, msgD, msgE, msgF, msgG]) =>
      merge(msgA, msgB, msgC, msgD, msgE, msgF, msgG)
  );
}
