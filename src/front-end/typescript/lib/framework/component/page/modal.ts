import * as base from "front-end/lib/framework/component/base";
import { Msg, mapMsg } from "front-end/lib/framework/component/page/msg";
import { AvailableIcons } from "front-end/lib/views/icon";
import { adt, ADT } from "shared/lib/types";

// Modal

export type Modal<Msg> = ADT<"show", VisibleModal<Msg>> | ADT<"hide">;

export function show<Msg>(modal: VisibleModal<Msg>): Modal<Msg> {
  return adt("show", modal);
}

export function hide<Msg>(): Modal<Msg> {
  return adt("hide");
}

//// VisibleModal

export interface VisibleModal<Msg> {
  title: string;
  onCloseMsg: Msg;
  actions: Array<Action<Msg>>;
  body(dispatch: base.Dispatch<Msg>): base.ViewElementChildren;
}

//// Action

export interface Action<Msg> {
  text: string;
  color: "primary" | "info" | "secondary" | "danger" | "success" | "warning";
  msg: Msg;
  button?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: AvailableIcons;
}

//// map

export function map<MsgA extends ADT<unknown, unknown>, MsgB>(
  modal: Modal<MsgA>,
  mapMsg_: (msgA: MsgA) => MsgB
): Modal<MsgB> {
  switch (modal.tag) {
    case "hide":
      return hide();
    case "show":
      return show({
        ...modal.value,
        body: (dispatch) =>
          modal.value.body(base.mapDispatch(dispatch, mapMsg_)),
        onCloseMsg: mapMsg_(modal.value.onCloseMsg),
        actions: modal.value.actions.map((action) => {
          return {
            ...action,
            msg: mapMsg_(action.msg)
          };
        })
      });
  }
}

export function mapPage<MsgA extends ADT<unknown, unknown>, MsgB, Route>(
  modal: Modal<Msg<MsgA, Route>>,
  mapMsg_: (msgA: MsgA) => MsgB
): Modal<Msg<MsgB, Route>> {
  return map(modal, (msg) => mapMsg(msg, mapMsg_));
}
