import { ComponentView, ComponentViewProps, View } from 'front-end/lib/framework';
import  React from 'react';

interface Params<State, Msg> {
  footer?:       ComponentView<State, Msg>;
  backMsg?:      Msg;
  title?:        string;
  description?:  string;
  links?:        JSX.Element[];
}

function makeVerticalBar<State, Msg, Props extends ComponentViewProps<State, Msg> = ComponentViewProps<State, Msg>> (params: Params<State, Msg>): View<Props>
{
  return props => {
    return (
      <div>
        { params.links }
      </div>
    )
  }
}

export default makeVerticalBar;
