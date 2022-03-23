import * as FormField from 'front-end/lib/components/form-field';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { CreateSWUProposalReferenceBody, CreateSWUProposalReferenceValidationErrors, SWUProposalReference } from 'shared/lib/resources/proposal/sprint-with-us';
import { adt, ADT } from 'shared/lib/types';
import * as proposalValidation from 'shared/lib/validation/proposal/sprint-with-us';

interface ReferenceState {
  name: Immutable<ShortText.State>;
  company: Immutable<ShortText.State>;
  phone: Immutable<ShortText.State>;
  email: Immutable<ShortText.State>;
}

export interface Params {
  references: SWUProposalReference[];
}

export interface State {
  references: ReferenceState[];
}

export type Msg
  = ADT<'name', [number, ShortText.Msg]>
  | ADT<'company', [number, ShortText.Msg]>
  | ADT<'phone', [number, ShortText.Msg]>
  | ADT<'email', [number, ShortText.Msg]>;

function makeBlankReference(order: number): SWUProposalReference {
  return {
    name: '',
    company: '',
    phone: '',
    email: '',
    order
  };
}

export const init: Init<Params, State> = async ({ references }) => {
  // References sorted in the http/api module.
  // Ensure there are only three references.
  references = [
    references[0] || makeBlankReference(0),
    references[1] || makeBlankReference(1),
    references[2] || makeBlankReference(2)
  ];
  return {
    references: await Promise.all(references.map(async r => ({
      name: immutable(await ShortText.init({
        errors: [],
        validate: proposalValidation.validateSWUProposalReferenceName,
        child: {
          type: 'text',
          value: r.name,
          id: `swu-proposal-reference-${r.order}-name`
        }
      })),
      company: immutable(await ShortText.init({
        errors: [],
        validate: proposalValidation.validateSWUProposalReferenceCompany,
        child: {
          type: 'text',
          value: r.company,
          id: `swu-proposal-reference-${r.order}-company`
        }
      })),
      phone: immutable(await ShortText.init({
        errors: [],
        validate: proposalValidation.validateSWUProposalReferencePhone,
        child: {
          type: 'text',
          value: r.phone,
          id: `swu-proposal-reference-${r.order}-phone`
        }
      })),
      email: immutable(await ShortText.init({
        errors: [],
        validate: proposalValidation.validateSWUProposalReferenceEmail,
        child: {
          type: 'text',
          value: r.email,
          id: `swu-proposal-reference-${r.order}-email`
        }
      }))
    })))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'name':
      return updateComponentChild({
        state,
        childStatePath: ['references', String(msg.value[0]), 'name'],
        childUpdate: ShortText.update,
        childMsg: msg.value[1],
        mapChildMsg: value => adt('name', [msg.value[0], value])
      });
    case 'company':
      return updateComponentChild({
        state,
        childStatePath: ['references', String(msg.value[0]), 'company'],
        childUpdate: ShortText.update,
        childMsg: msg.value[1],
        mapChildMsg: value => adt('company', [msg.value[0], value])
      });
    case 'phone':
      return updateComponentChild({
        state,
        childStatePath: ['references', String(msg.value[0]), 'phone'],
        childUpdate: ShortText.update,
        childMsg: msg.value[1],
        mapChildMsg: value => adt('phone', [msg.value[0], value])
      });
    case 'email':
      return updateComponentChild({
        state,
        childStatePath: ['references', String(msg.value[0]), 'email'],
        childUpdate: ShortText.update,
        childMsg: msg.value[1],
        mapChildMsg: value => adt('email', [msg.value[0], value])
      });
  }
};

export type Values = CreateSWUProposalReferenceBody[];

export function getValues(state: Immutable<State>): Values {
  return state.references.map((r, order) => ({
    name: FormField.getValue(r.name),
    company: FormField.getValue(r.company),
    phone: FormField.getValue(r.phone),
    email: FormField.getValue(r.email),
    order
  }));
}

export type Errors = CreateSWUProposalReferenceValidationErrors[];

export function setErrors(state: Immutable<State> | any, errors: Errors): Immutable<State> {
  return errors.reduce(
    (acc, e, i) => acc
      .updateIn(['references', i, 'name'], s => FormField.setErrors(s, e.name || []))
      .updateIn(['references', i, 'company'], s => FormField.setErrors(s, e.company || []))
      .updateIn(['references', i, 'phone'], s => FormField.setErrors(s, e.phone || []))
      .updateIn(['references', i, 'email'], s => FormField.setErrors(s, e.email || [])),
    state
  );
}

export function validate(state: Immutable<State> | any): Immutable<State> {
  return state.references.reduce(
    (acc, r, i) => acc
      .updateIn(['references', i, 'name'], s => FormField.validate(s))
      .updateIn(['references', i, 'company'], s => FormField.validate(s))
      .updateIn(['references', i, 'phone'], s => FormField.validate(s))
      .updateIn(['references', i, 'email'], s => FormField.validate(s)),
    state
  );
}

export function isValid(state: Immutable<State>): boolean {
  return state.references.reduce((acc, r) => {
    return acc
        && FormField.isValid(r.name)
        && FormField.isValid(r.company)
        && FormField.isValid(r.phone)
        && FormField.isValid(r.email);
  }, true as boolean);
}

export interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

interface ReferenceViewProps extends Pick<Props, 'dispatch' | 'disabled'> {
  reference: ReferenceState;
  index: number;
}

export const ReferenceView: View<ReferenceViewProps> = ({ dispatch, disabled, index, reference }) => {
  return (
    <div>
      <Row>
        <Col xs='12' md='7'>
          <ShortText.view
            required
            extraChildProps={{}}
            label='Name'
            placeholder='Name'
            help='Provide the first and last name of your reference.'
            state={reference.name}
            dispatch={mapComponentDispatch(dispatch, v => adt('name', [index, v]) as Msg)}
            disabled={disabled} />
        </Col>
        <Col xs='12' md='5'>
          <ShortText.view
            required
            extraChildProps={{}}
            label='Company'
            placeholder='Company'
            help='Provide the name of the company that employs your reference.'
            state={reference.company}
            dispatch={mapComponentDispatch(dispatch, v => adt('company', [index, v]) as Msg)}
            disabled={disabled} />
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='5'>
          <ShortText.view
            required
            extraChildProps={{}}
            label='Phone Number'
            placeholder='Phone Number'
            state={reference.phone}
            dispatch={mapComponentDispatch(dispatch, v => adt('phone', [index, v]) as Msg)}
            disabled={disabled} />
        </Col>
        <Col xs='12' md='7'>
          <ShortText.view
            required
            extraChildProps={{}}
            label='Email'
            placeholder='Email'
            state={reference.email}
            dispatch={mapComponentDispatch(dispatch, v => adt('email', [index, v]) as Msg)}
            disabled={disabled} />
        </Col>
      </Row>
    </div>
  );
};

export const view: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <div>
      {state.references.map((r, i) => (
        <div className={i < state.references.length - 1 ? 'mb-4' : ''} key={`swu-proposal-reference-${i}`}>
          <h4 className='mb-4'>Reference {i + 1}</h4>
          <ReferenceView
            dispatch={dispatch}
            disabled={disabled}
            reference={r}
            index={i} />
        </div>
      ))}
    </div>
  );
};
