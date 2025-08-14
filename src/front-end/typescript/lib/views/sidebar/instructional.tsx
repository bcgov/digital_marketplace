import { component } from "front-end/lib/framework";
import Link, { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import Sticky from "front-end/lib/views/sidebar/sticky";
import React from "react";

interface Params<State, Msg> {
  showBackLink?: Msg;
  showOnMobile?: boolean;
  getFooter: component.base.ComponentView<State, Msg>;
  getTitle(state: State): component.base.ViewElementChildren;
  getDescription(state: State): component.base.ViewElementChildren;
}

function makeSidebar<
  State,
  Msg,
  Props extends component.base.ComponentViewProps<
    State,
    Msg
  > = component.base.ComponentViewProps<State, Msg>
>(params: Params<State, Msg>): component.base.View<Props> {
  const {
    showBackLink = false,
    showOnMobile = true,
    getFooter,
    getTitle,
    getDescription
  } = params;
  return function StickyWrapper(props) {
    const { state, dispatch } = props;
    const footer = getFooter(props);
    return (
      <div
        className={`flex-grow-1 position-relative ${
          showOnMobile ? "" : "d-none d-md-block"
        }`}>
        <Sticky>
          {showBackLink ? (
            <Link
              color="secondary"
              className="font-size-small d-flex flex-row flex-nowrap align-items-center mt-md-n5 mb-4"
              symbol_={leftPlacement(iconLinkSymbol("arrow-left"))}
              onClick={() => dispatch(showBackLink)}>
              Go Back
            </Link>
          ) : null}
          <h1 className="mb-3 fw-bolder">{getTitle(state)}</h1>
          <div className={footer ? "mb-3" : "mb-0"}>
            {getDescription(state)}
          </div>
          <div className="font-size-small">{footer}</div>
        </Sticky>
      </div>
    );
  };
}

export default makeSidebar;
