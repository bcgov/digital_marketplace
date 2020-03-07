// import * as LongText from 'front-end/lib/components/form-field/long-text';
import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as DateField from 'front-end/lib/components/form-field/date';
import * as NumberField from 'front-end/lib/components/form-field/number';
import { Dispatch, GlobalComponentMsg, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View, ViewElementChildren } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
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

const StartingPhaseView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <div className='pb-5 mb-3 border-bottom' >
      Starting Phase select goes here!
    </div>
  );
};

const TeamCapabilitiesView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>
      <Col>
        <h4>Team Capabilities</h4>
        <p>Select the capabilities that you will need during this phase and
          indicate whether you expect the need to be for part-time or
          full-time.</p>
        <div>TODO(Jesse): How should this piece be implemented.  Checkboxes?</div>
      </Col>
    </Row>
  );
};

const DetailsView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row className='py-4'>
      <Col sm='12'>
        <h4>Details</h4>
      </Col>

      <Col md='6' sm='12'>
        <DateField.view
          required
          extraChildProps={{}}
          label='Phase start date'
          state={state.startDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('startDate' as const, value))} />
      </Col>

      <Col md='6' sm='12'>
        <DateField.view
          extraChildProps={{}}
          label='Phase completion date'
          state={state.completionDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('completionDate' as const, value))} />
      </Col>

      <Col sm='8'>
        <NumberField.view
          required
          extraChildProps={{}}
          label='Phase max budget'
          state={state.maxBudget}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('maxBudget' as const, value))} />
      </Col>

    </Row>
  );
};

interface AccordionProps {
  title: string;
  collapsed: boolean;
  children: ViewElementChildren;
}

interface PhaseProps extends Props {
  description: string;
  commonDeliverables: string[];
}

export type PhaseAccordionState = Omit<PhaseProps & AccordionProps, 'children'>;

export const AccordionView: View<AccordionProps> = (props) => {
  return (
    <div className='pb-4 pt-3'>

      <div>
        <Icon name='paperclip' />
        <span className='pl-3 h3'>{props.title}</span>
      </div>

      <div className={`${ props.collapsed ? 'd-none' : null }`}>
        {props.children}
      </div>

    </div>
  );
};

const PhaseView: View<PhaseProps> = (props) => {
  return (
    <div>
      <div className='pt-3'>
        <p>{props.description}</p>
      </div>

      <div>
        <Icon name='paperclip' />
        <span className='pl-2 h6'>Common Deliverables</span>
      </div>

      <div>
        <ul>
        {
          props.commonDeliverables.map( (deliverable) => {
            return <li>{deliverable}</li>;
          })
        }
        </ul>
        <DetailsView {...props} />
        <TeamCapabilitiesView {...props} />
      </div>
    </div>
  );
};

const PhaseAccordionView: View<PhaseAccordionState> = (state) => {
  return (
    <AccordionView
      title={state.title}
      collapsed={state.collapsed}>

      <PhaseView
        description='During Inception you will take your business goals and research findings and explore the potential value that a new digital product can bring. You will then determine the features of a Minimum Viable Product (MVP) and the scope for an Alpha release.'
        commonDeliverables={['Happy stakeholders with a shared vision for your digital product', 'A product backlog for the Alpha release']}
        state={state.state}
        dispatch={state.dispatch}
        disabled={state.disabled}
      />

    </AccordionView>
  );
};

export const view: View<Props> = (props) => {
  return (
    <div>
      <StartingPhaseView {...props} />

      <PhaseAccordionView
        title='Inception'
        collapsed={false}
        description='During Inception you will take your business goals and research findings and explore the potential value that a new digital product can bring. You will then determine the features of a Minimum Viable Product (MVP) and the scope for an Alpha release.'
        commonDeliverables={['Happy stakeholders with a shared vision for your digital product', 'A product backlog for the Alpha release']}
        {...props}
      />

      <PhaseAccordionView
        title='Proof of Concept'
        collapsed={true}
        description='During Proof of Concept you will make your value propositions tangible so that they can be validated. You will begin developing the core features of your product that were scoped out during the Inception phase, working towards the Alpha release!'
        commonDeliverables={['Alpha release of the product', 'a build/buy/licence decision', 'Product Roadmap', 'Resourcing plan for Implementation']}
        {...props}
      />

      <PhaseAccordionView
        title='Implementation'
        collapsed={false}
        description='As you reach the Implementation phase you should be fully invested in your new digital product and plan for its continuous improvement. Next, you will need to carefully architect and automate the delivery pipeline for stability and continuous deployment.'
        commonDeliverables={['Delivery of the function components in the Product Roadmap']}
        {...props}
      />

    </div>
  );
};
