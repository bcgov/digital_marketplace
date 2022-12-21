import { Msg, mapMsg } from "front-end/lib/framework/component/page/msg";
import { ReactElement } from "react";
import { ADT } from "shared/lib/types";

// Alerts

export interface Alerts<Msg> {
  info?: Array<Alert<Msg>>;
  warnings?: Array<Alert<Msg>>;
  errors?: Array<Alert<Msg>>;
}

export function empty<Msg>(): Alerts<Msg> {
  return {};
}

export function map<MsgA extends ADT<unknown, unknown>, MsgB, Route>(
  alerts: Alerts<Msg<MsgA, Route>>,
  mapMsg_: (msgA: MsgA) => MsgB
): Alerts<Msg<MsgB, Route>> {
  const { info, warnings, errors } = alerts;
  return {
    info: info?.map((i) => ({
      ...i,
      dismissMsg: i.dismissMsg && mapMsg(i.dismissMsg, mapMsg_)
    })),
    warnings: warnings?.map((i) => ({
      ...i,
      dismissMsg: i.dismissMsg && mapMsg(i.dismissMsg, mapMsg_)
    })),
    errors: errors?.map((i) => ({
      ...i,
      dismissMsg: i.dismissMsg && mapMsg(i.dismissMsg, mapMsg_)
    }))
  };
}

export function merge<Msg>(a: Alerts<Msg>, b: Alerts<Msg>): Alerts<Msg> {
  return {
    info: [...(a.info || []), ...(b.info || [])],
    warnings: [...(a.warnings || []), ...(b.warnings || [])],
    errors: [...(a.errors || []), ...(b.errors || [])]
  };
}

//// Alert

export interface Alert<Msg> {
  text: string | ReactElement;
  dismissMsg?: Msg;
}
