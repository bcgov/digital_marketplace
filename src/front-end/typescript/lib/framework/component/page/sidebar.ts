import * as base from "front-end/lib/framework/component/base";
import { ThemeColor } from "front-end/lib/types";

export interface Sidebar<
  State,
  Msg,
  Props extends base.ComponentViewProps<State, Msg> = base.ComponentViewProps<
    State,
    Msg
  >
> {
  size: "medium" | "large";
  color: ThemeColor;
  view: base.View<Props>;
  // isEmptyOnMobile tells the framework whether the sidebar is empty and should adjust its padding for mobile viewports accordingly.
  isEmptyOnMobile?(state: base.Immutable<State>): boolean;
}
