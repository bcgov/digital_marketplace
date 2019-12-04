import { ComponentView, ComponentViewProps, View } from 'front-end/lib/framework';
// import Link from 'front-end/lib/views/link';
// import Icon from 'front-end/lib/views/icon';
import  React from 'react';

interface Params<State, Msg> {
  footer?:       ComponentView<State, Msg>;
  backMsg?:      Msg;
  title?:        string;
  description?:  string;
  links:        JSX.Element[];
}

function makeVerticalBar<State, Msg, Props extends ComponentViewProps<State, Msg> = ComponentViewProps<State, Msg>> (params: Params<State, Msg>): View<Props>
{
  return props => {
    return (
      <div className='d-flex flex-column pt-5 position-relative'>
        {
          params.links.map( link => {
            return(
              <div>
                {link}
              </div>
            )
          })
        }
      </div>
    )
  }
}

export default makeVerticalBar;
