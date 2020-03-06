// import * as LongText from 'front-end/lib/components/form-field/long-text';
import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as DateField from 'front-end/lib/components/form-field/date';
import * as NumberField from 'front-end/lib/components/form-field/number';
import { Dispatch, GlobalComponentMsg, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
// import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

interface Phase {
  nothing: true;
}

export async function defaultPhase(): Promise<Phase> {
  return {
    nothing: true
  };
}

interface PhaseViewProps {
  empty: true;
}

export const PhaseView: View<PhaseViewProps> = props => {
  return ( <div> </div>);
};

type Params = {};

export interface State extends Params {
  startDate: Immutable<DateField.State>;
  completionDate: Immutable<DateField.State>;
  maxBudget: Immutable<NumberField.State>;
}

export type InnerMsg =
  ADT<'startDate', DateField.Msg> |
  ADT<'completionDate', DateField.Msg> |
  ADT<'maxBudget', NumberField.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export const init: Init<Params, State> = async (initParams) => {
  return {

    startDate: immutable(await DateField.init({
      errors: [],
      child: {
        value: null,
        id: ''
      }
    })),

    completionDate: immutable(await DateField.init({
      errors: [],
      child: {
        value: null,
        id: ''
      }
    })),

    maxBudget: immutable(await NumberField.init({
      errors: [],
      child: {
        value: 0,
        id: ''
      }
    }))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {

    case 'startDate':
      return updateComponentChild({
        state,
        childStatePath: ['startDate'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('startDate', value)
      });

    case 'completionDate':
      return updateComponentChild({
        state,
        childStatePath: ['completionDate'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('completionDate', value)
      });

    case 'maxBudget':
      return updateComponentChild({
        state,
        childStatePath: ['maxBudget'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('maxBudget', value)
      });

    default:
      return [state];
  }
};

interface Values {
  startDate: DateField.Value;
  completionDate: DateField.Value;
  maxBudget: NumberField.Value;
}

type Errors = ErrorTypeFrom<Values>;

export function getValues(state: Immutable<State>): Values {
  return {
    startDate: FormField.getValue(state.startDate),
    completionDate: FormField.getValue(state.completionDate),
    maxBudget: FormField.getValue(state.maxBudget)
  };
}

export function setErrors(state: Immutable<State>, errors: Errors): Immutable<State> {
  if (errors) {
    return state
    .update('startDate', s => FormField.setErrors(s, errors.startDate || []))
    .update('completionDate', s => FormField.setErrors(s, errors.completionDate || []))
    .update('maxBudget', s => FormField.setErrors(s, errors.maxBudget || []));
  } else {
    return state;
  }
}

type Props = {
  state: State;
  dispatch: Dispatch<Msg>;
  disabled: boolean;
};

export const view: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>

      <Col>
        <DateField.view
          required
          extraChildProps={{}}
          label='StartDate'
          state={state.startDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('startDate' as const, value))} />
      </Col>

      <Col>
        <DateField.view
          required
          extraChildProps={{}}
          label='CompletionDate'
          state={state.completionDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('completionDate' as const, value))} />
      </Col>

      <Col>
        <NumberField.view
          required
          extraChildProps={{}}
          label='MaxBudget'
          state={state.maxBudget}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('maxBudget' as const, value))} />
      </Col>

    </Row>
  );
};
