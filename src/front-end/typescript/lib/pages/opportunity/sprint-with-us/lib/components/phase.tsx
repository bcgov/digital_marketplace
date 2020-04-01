import * as FormField from 'front-end/lib/components/form-field';
import * as DateField from 'front-end/lib/components/form-field/date';
import * as NumberField from 'front-end/lib/components/form-field/number';
import { ComponentViewProps, Dispatch, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import Accordion from 'front-end/lib/views/accordion';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import CAPABILITIES from 'shared/lib/data/capabilities';
import { adt, ADT } from 'shared/lib/types';

export interface Capability {
  name: string;
  partTime: boolean;
  checked: boolean;
}

export interface Params {
  isAccordianOpen: boolean;
}

export interface State extends Params {
  startDate: Immutable<DateField.State>;
  completionDate: Immutable<DateField.State>;
  maxBudget: Immutable<NumberField.State>;
  capabilities: Capability[];
}

export type Msg
  = ADT<'toggleAccordion'>
  | ADT<'toggleCapabilityChecked', number> //index
  | ADT<'toggleCapabilityIsPartTime', number> //index
  | ADT<'startDate', DateField.Msg>
  | ADT<'completionDate', DateField.Msg>
  | ADT<'maxBudget', NumberField.Msg>;

export const init: Init<Params, State> = async params => {
  const idPrefix = String(Math.random());
  return {
    ...params,
    capabilities: CAPABILITIES.map(name => ({ name, partTime: false, checked: false })),
    collapsed: false,
    startDate: immutable(await DateField.init({
      errors: [],
      child: {
        value: null,
        id: `${idPrefix}-start-date`
      }
    })),
    completionDate: immutable(await DateField.init({
      errors: [],
      child: {
        value: null,
        id: `${idPrefix}-completion-date`
      }
    })),
    maxBudget: immutable(await NumberField.init({
      errors: [],
      child: {
        value: null,
        id: `${idPrefix}-max-budget`,
        min: 1
      }
    }))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'toggleAccordion':
      return [state.update('isAccordianOpen', v => !v)];

    case 'toggleCapabilityChecked':
      return [state.update('capabilities', cs => cs.map((c, i) => {
        return i === msg.value ? { ...c, checked: !c.checked } : c;
      }))];

    case 'toggleCapabilityIsPartTime':
      return [state.update('capabilities', cs => cs.map((c, i) => {
        return i === msg.value ? { ...c, partTime: !c.partTime } : c;
      }))];

    case 'startDate':
      return updateComponentChild({
        state,
        childStatePath: ['startDate'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('startDate', value)
      });

    case 'completionDate':
      return updateComponentChild({
        state,
        childStatePath: ['completionDate'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('completionDate', value)
      });

    case 'maxBudget':
      return updateComponentChild({
        state,
        childStatePath: ['maxBudget'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('maxBudget', value)
      });
  }
};

export interface Values {
  startDate: DateField.Value;
  completionDate: DateField.Value;
  maxBudget: NumberField.Value;
  capabilities: Capability[];
}

export function getValues(state: Immutable<State>): Values {
  return {
    startDate: FormField.getValue(state.startDate),
    completionDate: FormField.getValue(state.completionDate),
    maxBudget: FormField.getValue(state.maxBudget),
    capabilities: state.capabilities
  };
}

//TODO setErrors

export interface Props extends ComponentViewProps<State, Msg> {
  title: string;
  description: string;
  icon: AvailableIcons;
  deliverables: string[];
  disabled?: boolean;
  className?: string;
}

const Description: View<Props> = ({ description, deliverables }) => {
  return (
    <Row className='mb-4'>
      <Col xs='12'>
        <p>{description}</p>
        <div className='d-flex align-items-center flex-nowrap mb-3'>
          <Icon name='cubes' color='body' />
          <div className='ml-2 font-weight-bold'>Common Deliverables</div>
        </div>
        <ul>
          {deliverables.map((deliverable, i) => (<li key={`phase-deliverable-${i}`}>{deliverable}</li>))}
        </ul>
      </Col>
    </Row>
  );
};

const Details: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row className='mb-4'>
      <Col xs='12'>
        <h4 className='mb-4'>Details</h4>
      </Col>
      <Col xs='12' md='5'>
        <DateField.view
          required
          extraChildProps={{}}
          label='Phase Start Date'
          state={state.startDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('startDate' as const, value))} />
      </Col>
      <Col xs='12' md='5'>
        <DateField.view
          extraChildProps={{}}
          label='Phase Completion Date'
          state={state.completionDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('completionDate' as const, value))} />
      </Col>
      <Col xs='12' md='6' lg='5'>
        <NumberField.view
          required
          extraChildProps={{ prefix: '$' }}
          placeholder='Maximum Phase Budget'
          label='Maximum Phase Budget'
          state={state.maxBudget}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('maxBudget' as const, value))} />
      </Col>
    </Row>
  );
};

interface PartTimeSwitchProps {
  partTime: boolean;
  disabled?: boolean;
  index: number;
  dispatch: Dispatch<Msg>;
}

const PartTimeSwitch: View<PartTimeSwitchProps> = ({ partTime, disabled, index, dispatch }) => {
  const selectedClassName = (selected: boolean) => {
    return selected ? 'bg-purple text-white' : 'text-secondary border';
  };
  const baseSwitchClassName = 'd-flex justify-content-center align-items-center';
  const width = '2rem';
  const padding = '0.15rem 0.25rem';
  return (
    <div
      onClick={() => dispatch(adt('toggleCapabilityIsPartTime', index))}
      style={{ cursor: 'pointer' }}
      className='d-flex align-items-stretch font-size-extra-small font-weight-bold ml-auto'>
      <div className={`${baseSwitchClassName} ${selectedClassName(partTime)} rounded-left border-right-0`} style={{ width, padding }}>
        P/T
      </div>
      <div className={`${baseSwitchClassName} ${selectedClassName(!partTime)} rounded-right border-left-0`} style={{ width, padding }}>
        F/T
      </div>
    </div>
  );
};

interface CapabilityProps extends Capability {
  index: number;
  disabled?: boolean;
  dispatch: Dispatch<Msg>;
}

const Capability: View<CapabilityProps> = ({ name, partTime, checked, dispatch, index, disabled }) => {
  return (
    <div className='border-right border-bottom d-flex flex-nowrap align-items-center px-3 py-2'>
      <Link
        onClick={() => dispatch(adt('toggleCapabilityChecked', index))}
        symbol_={leftPlacement(iconLinkSymbol(checked ? 'check-circle' : 'circle'))}
        symbolClassName={checked ? 'text-success' : 'text-body'}
        className='py-1 font-size-small'
        iconSymbolSize={0.9}
        color='body'
        disabled={disabled}>
        {name}
      </Link>
      {checked ? (<PartTimeSwitch partTime={partTime} disabled={disabled} index={index} dispatch={dispatch} />) : null}
    </div>
  );
};

const Capabilities: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>
      <Col xs='12'>
        <h4>Team Capabilities</h4>
        <p className='mb-4'>Select the capabilities that you will need during this phase and
          indicate whether you expect the need to be for part-time or
          full-time.</p>
      </Col>
      <Col xs='12'>
        <Row noGutters className='border-top border-left'>
          {state.capabilities.map((c, i) => (
            <Col xs='12' md='6' key={`phase-capability-${i}`}>
              <Capability
                {...c}
                dispatch={dispatch}
                disabled={disabled}
                index={i} />
            </Col>
          ))}
        </Row>
      </Col>
    </Row>
  );
};

export const view: View<Props> = props => {
  const { state, title, icon, dispatch, className } = props;
  return (
    <Accordion
      className={className}
      toggle={() => dispatch(adt('toggleAccordion'))}
      color='blue-dark'
      title={title}
      titleClassName='h3 mb-0'
      icon={icon}
      iconWidth={2}
      iconHeight={2}
      iconClassName='mr-3'
      chevronWidth={1.5}
      chevronHeight={1.5}
      open={state.isAccordianOpen}>
      <Description {...props} />
      <Details {...props} />
      <Capabilities {...props} />
    </Accordion>
  );
};
