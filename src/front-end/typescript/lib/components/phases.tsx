// import * as LongText from 'front-end/lib/components/form-field/long-text';
// import * as NumberField from 'front-end/lib/components/form-field/number';
import { ComponentViewProps, Init, Update, View } from 'front-end/lib/framework';
// import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
// import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

interface Phase {
  nothing: true;
}

export interface State {
  nothing: true;
}

export type Msg = ADT<'noop'>;

export type Params = {};

export const init: Init<Params, State> = async params => {
  return {
    nothing: true
  };
};

export async function defaultPhase(): Promise<Phase> {
  return {
    nothing: true
  };
}

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
      default: return [ state ];
  }
};

interface PhaseViewProps {
  empty: true;
}

export const PhaseView: View<PhaseViewProps> = props => {
  return ( <div> </div>);
};

interface Props extends ComponentViewProps<State, Msg> {}

export const view: View<Props> = props => {
  return ( <div> </div>);
};
