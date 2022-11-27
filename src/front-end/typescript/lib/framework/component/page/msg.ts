import * as global from "front-end/lib/framework/component/global";
import * as base from "front-end/lib/framework/component/base";
import { adt, ADT } from "shared/lib/types";

// Msg

export type Msg<PageMsg, Route> = global.Msg<PageMsg, Route> | ReadyMsg;

//// ReadyMsg

export type ReadyMsg = ADT<"@pageReady">;

export function readyMsg(): ReadyMsg {
  return adt("@pageReady");
}

//// mapMsg

export function mapMsg<MsgA extends ADT<unknown, unknown>, MsgB, Route>(
  msg: Msg<MsgA, Route>,
  map: (msg: MsgA) => MsgB
): Msg<MsgB, Route> {
  switch (msg.tag) {
    case "@pageReady":
      return msg as Msg<MsgB, Route>;
    default:
      return global.mapMsg(msg as global.Msg<MsgA, Route>, map);
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
