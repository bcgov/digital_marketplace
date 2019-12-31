import * as router from 'front-end/lib/app/router';
import { ComponentView, ComponentViewProps, View } from 'front-end/lib/framework';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import Sticky from 'front-end/lib/views/sidebar/sticky';
import React from 'react';

interface Params<State, Msg> {
  showBackLink?: boolean;
  showOnMobile?: boolean;
  getFooter: ComponentView<State, Msg>;
  getTitle(state: State): string;
  getDescription(state: State): string;
}

function makeSidebar<State, Msg, Props extends ComponentViewProps<State, Msg> = ComponentViewProps<State, Msg>>(params: Params<State, Msg>): View<Props> {
  const { showBackLink = false, showOnMobile = true, getFooter, getTitle, getDescription } = params;
  return props => {
    const { state } = props;
    const footer = getFooter(props);
    return (
      <div className={`flex-grow-1 position-relative ${showOnMobile ? '' : 'd-none d-md-block'}`}>
        <Sticky>
          {showBackLink
            ? (<Link
                color='secondary'
                className='font-size-small d-flex flex-row flex-nowrap align-items-center mt-md-n5 mb-4'
                symbol_={leftPlacement(iconLinkSymbol('arrow-left'))}
                onClick={() => router.back()}>
                  Go Back
                </Link>)
            : null}
          <h1 className='mb-3 font-weight-bolder'>{getTitle(state)}</h1>
          <p className={footer ? 'mb-3' : 'mb-0'}>{getDescription(state)}</p>
          <div className='font-size-small'>{footer}</div>
        </Sticky>
      </div>
  );
  };
}

export default makeSidebar;
