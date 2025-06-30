import * as router from "front-end/lib/framework/router";
import { adt, ADT, adtCurried } from "shared/lib/types";
import { Toast } from "front-end/lib/framework/component/global/toast";
import * as base from "front-end/lib/framework/component/base";

// Re-exports

export type { Toast } from "front-end/lib/framework/component/global/toast";
export * as toast from "front-end/lib/framework/component/global/toast";
export {
  newUrlMsg,
  replaceUrlMsg,
  newRouteMsg,
  replaceRouteMsg,
  type NewUrlMsg,
  type ReplaceUrlMsg,
  type ReplaceRouteMsg,
  type NewRouteMsg
} from "front-end/lib/framework/router";

// Msg

export type Msg<Msg_, Route> =
  | Msg_
  | router.RouterMsg<Route>
  | ShowToastMsg
  | ReloadMsg;

//// ToastMsg

type ShowToastMsg = ADT<"@showToast", Toast>;

export const showToastMsg = adtCurried<ShowToastMsg>("@showToast");

//// ReloadMsg

type ReloadMsg = ADT<"@reload">;

export const reloadMsg = () => adt("@reload") as ReloadMsg;

//// mapMsg

export function mapMsg<MsgA extends ADT<unknown, unknown>, MsgB, Route>(
  msg: Msg<MsgA, Route>,
  map: (msg: MsgA) => MsgB
): Msg<MsgB, Route> {
  switch (msg.tag) {
    case "@showToast":
    case "@newRoute":
    case "@replaceRoute":
    case "@newUrl":
    case "@replaceUrl":
    case "@reload":
      return msg as Msg<MsgB, Route>;
    default:
      return map(msg as MsgA);
  }
}

//// mapDispatch

export function mapDispatch<
  ParentMsg,
  ChildMsg extends ADT<unknown, unknown>,
  Route
>(
  dispatch: base.Dispatch<Msg<ParentMsg, Route>>,
  map: (msg: ChildMsg) => ParentMsg
): base.Dispatch<Msg<ChildMsg, Route>> {
  return (msg: Msg<ChildMsg, Route>) => dispatch(mapMsg(msg, map));
}
