import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Init, Update } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab';
//import EditTabHeader from 'front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header';
import React from 'react';
//import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export type State = Tab.Params;

export type InnerMsg
  = ADT<'noop'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => params;

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = props => {
  return (
    <div>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view
};
