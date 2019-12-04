import { ComponentView, ComponentViewProps, View } from 'front-end/lib/framework';
// import Link from 'front-end/lib/views/link';
// import Icon from 'front-end/lib/views/icon';

import makeSignInVerticalBar from 'front-end/lib/views/vertical-bar/sign-in';
import makeMenuVerticalBar from 'front-end/lib/views/vertical-bar/menu';

import { GlobalComponentMsg } from 'front-end/lib/framework';
import { ADT } from 'shared/lib/types';
import { Route } from 'front-end/lib/app/types';
import  React from 'react';

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export interface State {
  empty: true;
}

interface ListSidebarParams<State, Msg> {
  type: "ListSidebarParams";
  links: JSX.Element[];
}

interface StaticTextSidebarParams<State, Msg> {
  type: "StaticTextSidebarParams";
  footer?:       ComponentView<State, Msg>;
  backMsg?:      Msg;
  title?:        string;
  description?:  string;
}

type SidebarParams<State, Msg> = ListSidebarParams<State, Msg> | StaticTextSidebarParams<State, Msg>;

type Props = ComponentViewProps<State, Msg>;





function pickVerticalBar<State, Msg>(params: SidebarParams<State, Msg>): View<Props> {
  let result: View<Props>;
  switch (params.type)
  {
    case "ListSidebarParams":
      result = makeMenuVerticalBar(params as ListSidebarParams);
    break;

    case "StaticTextSidebarParams":
      result = makeSignInVerticalBar(params as StaticTextSidebarParams<State, Msg>);
    break;
  }

  return result;
}


function makeVerticalBar<State, Msg, Props extends ComponentViewProps<State, Msg> = ComponentViewProps<State, Msg>> (params: SidebarParams<State, Msg>): View<Props>
{
  return props => {
    return (
      <div className='d-flex flex-column pt-5 position-relative'>
      { pickVerticalBar<State, Msg>() }
      </div>
    )
  }
}

export default makeVerticalBar;
