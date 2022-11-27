import { ADT } from "shared/lib/types";
import { Msg, mapMsg } from "front-end/lib/framework/component/page/msg";

// Breadcrumbs

export type Breadcrumbs<Msg> = Array<Breadcrumb<Msg>>;

export function empty<Msg>(): Breadcrumbs<Msg> {
  return [];
}

export function map<MsgA extends ADT<unknown, unknown>, MsgB, Route>(
  breadcrumbs: Breadcrumbs<Msg<MsgA, Route>>,
  mapMsg_: (msgA: MsgA) => MsgB
): Breadcrumbs<Msg<MsgB, Route>> {
  return breadcrumbs.map((b) => ({
    text: b.text,
    onClickMsg: b.onClickMsg && mapMsg(b.onClickMsg, mapMsg_)
  }));
}

//// Breadcrumb

export interface Breadcrumb<Msg> {
  text: string;
  onClickMsg?: Msg;
}
