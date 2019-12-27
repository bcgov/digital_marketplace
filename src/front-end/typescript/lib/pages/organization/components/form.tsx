import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentViewProps, GlobalComponentMsg, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import { replaceRoute } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { getString } from 'shared/lib';
import { CreateRequestBody, Organization } from 'shared/lib/resources/organization';
import { adt, ADT } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';
import { validateUrl } from 'shared/lib/validation/organization';
import { validateName } from 'shared/lib/validation/user';

export interface Params {
  organization?: Organization;
}

export interface State {
  legalName: Immutable<ShortText.State>;
  websiteUrl: Immutable<ShortText.State>;
  streetAddress1: Immutable<ShortText.State>;
  streetAddress2: Immutable<ShortText.State>;
  city: Immutable<ShortText.State>;
  country: Immutable<ShortText.State>;
  mailCode: Immutable<ShortText.State>;
  contactName: Immutable<ShortText.State>;
  region: Immutable<ShortText.State>;
  contactTitle: Immutable<ShortText.State>;
  contactEmail: Immutable<ShortText.State>;
  contactPhone: Immutable<ShortText.State>;

  submitLoading: number;
  organization?: Organization;
}

export type InnerMsg =
  ADT<'legalName',       ShortText.Msg> |
  ADT<'websiteUrl',      ShortText.Msg> |
  ADT<'streetAddress1',  ShortText.Msg> |
  ADT<'streetAddress2',  ShortText.Msg> |
  ADT<'city',            ShortText.Msg> |
  ADT<'country',         ShortText.Msg> |
  ADT<'mailCode',        ShortText.Msg> |
  ADT<'contactTitle',    ShortText.Msg> |
  ADT<'contactName',     ShortText.Msg> |
  ADT<'contactEmail',    ShortText.Msg> |
  ADT<'contactPhone',    ShortText.Msg> |
  ADT<'submit',          SubmitHook>    |
  ADT<'region',          ShortText.Msg>
  ;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type Values = Required<CreateRequestBody>;

type Errors = ErrorTypeFrom<Values>;

export function isFormValid(state: Immutable<State>): boolean {
  return (
    FormField.isValid(state.legalName)      &&
    FormField.isValid(state.websiteUrl)     &&
    FormField.isValid(state.streetAddress1) &&
    FormField.isValid(state.streetAddress2) &&
    FormField.isValid(state.city)           &&
    FormField.isValid(state.country)        &&
    FormField.isValid(state.mailCode)       &&
    FormField.isValid(state.contactTitle)   &&
    FormField.isValid(state.contactName)    &&
    FormField.isValid(state.contactEmail)   &&
    FormField.isValid(state.contactPhone)   &&
    FormField.isValid(state.region)
  );
}

export function getValues(state: Immutable<State>): Values {
  return {
    legalName:       FormField.getValue(state.legalName),
    logoImageFile:   '', // TODO(Jesse):  Implement this!
    streetAddress1:  FormField.getValue(state.streetAddress1),
    streetAddress2:  FormField.getValue(state.streetAddress2),
    city:            FormField.getValue(state.city),
    country:         FormField.getValue(state.country),
    mailCode:        FormField.getValue(state.mailCode),
    contactTitle:    FormField.getValue(state.contactTitle),
    contactName:     FormField.getValue(state.contactName),
    contactEmail:    FormField.getValue(state.contactEmail),
    contactPhone:    FormField.getValue(state.contactPhone),
    region:          FormField.getValue(state.region),
    websiteUrl:      FormField.getValue(state.websiteUrl)
  };
}

export function setValues(state: Immutable<State>, org: Organization): Immutable<State> {
  return state
    .update('legalName',       s => FormField.setValue(s, org.legalName))
    .update('streetAddress1',  s => FormField.setValue(s, org.streetAddress1))
    .update('city',            s => FormField.setValue(s, org.city))
    .update('country',         s => FormField.setValue(s, org.country))
    .update('mailCode',        s => FormField.setValue(s, org.mailCode))
    .update('contactName',     s => FormField.setValue(s, org.contactName))
    .update('contactEmail',    s => FormField.setValue(s, org.contactEmail))
    .update('region',          s => FormField.setValue(s, org.region))
    .update('streetAddress2',  s => FormField.setValue(s, org.streetAddress2 || '' ))
    .update('contactTitle',    s => FormField.setValue(s, org.contactTitle   || '' ))
    .update('contactPhone',    s => FormField.setValue(s, org.contactPhone   || '' ))
    .update('websiteUrl',      s => FormField.setValue(s, org.websiteUrl     || '' ));
}

export function setErrors(state: Immutable<State>, errors: Errors): Immutable<State> {
  return state
    .update('legalName',       s => FormField.setErrors(s, errors.legalName      || []))
    .update('streetAddress1',  s => FormField.setErrors(s, errors.streetAddress1 || []))
    .update('streetAddress2',  s => FormField.setErrors(s, errors.streetAddress2 || []))
    .update('city',            s => FormField.setErrors(s, errors.city           || []))
    .update('country',         s => FormField.setErrors(s, errors.country        || []))
    .update('mailCode',        s => FormField.setErrors(s, errors.mailCode       || []))
    .update('contactTitle',    s => FormField.setErrors(s, errors.contactTitle   || []))
    .update('contactName',     s => FormField.setErrors(s, errors.contactName    || []))
    .update('contactEmail',    s => FormField.setErrors(s, errors.contactEmail   || []))
    .update('contactPhone',    s => FormField.setErrors(s, errors.contactPhone   || []))
    .update('region',          s => FormField.setErrors(s, errors.region         || []))
    .update('websiteUrl',      s => FormField.setErrors(s, errors.websiteUrl     || []));
}

export const init: Init<Params, State> = async (params) => {
  return {
    organization: params.organization,
    submitLoading: 0,
    legalName: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(params.organization, 'legalName'),
        id: 'organization-gov-legal-name'
      }
    })),
    websiteUrl: immutable(await ShortText.init({
      errors: [],
      validate: validateUrl,
      child: {
        type: 'text',
        value: getString(params.organization, 'websiteUrl'),
        id: 'organization-gov-website-url'
      }
    })),
    streetAddress1: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(params.organization, 'streetAddress1'),
        id: 'organization-gov-street-address-one'
      }
    })),
    streetAddress2: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(params.organization, 'streetAddress2'),
        id: 'organization-gov-street-address-two'
      }
    })),
    city: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(params.organization, 'city'),
        id: 'organization-gov-city'
      }
    })),
    country: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(params.organization, 'country'),
        id: 'organization-gov-country'
      }
    })),
    mailCode: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(params.organization, 'mailCode'),
        id: 'organization-gov-mail-code'
      }
    })),
    contactTitle: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(params.organization, 'contactTitle'),
        id: 'organization-gov-contact-title'
      }
    })),
    contactName: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(params.organization, 'contactName'),
        id: 'organization-gov-contact-name'
      }
    })),
    contactEmail: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(params.organization, 'contactEmail'),
        id: 'organization-gov-contact-email'
      }
    })),
    contactPhone: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(params.organization, 'contactPhone'),
        id: 'organization-gov-contact-phone'
      }
    })),
    region: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(params.organization, 'region'),
        id: 'organization-gov-region'
      }
    }))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'submit':
      return [state, async (state, dispatch) => {
        const result = state.organization
         ? await api.organizations.update(state.organization.id, getValues(state))
         : await api.organizations.create(getValues(state));

        if (api.isValid(result)) {
          if (state.organization) {
            const submitHook: SubmitHook = msg.value;
            if (submitHook) { submitHook(result.value); }
            state.set('organization', result.value);
          } else {
            // FIXME(Jesse): This compiles, but doesn't actually work..
            dispatch(replaceRoute(adt('orgEdit' as const, {orgId: result.value.id})));
          }
        } else {
          // TODO(Jesse): Handle errors
        }
        return state;
      }];
    case 'legalName':
      return updateComponentChild({
        state,
        childStatePath: ['legalName'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('legalName', value)
      });
    case 'websiteUrl':
      return updateComponentChild({
        state,
        childStatePath: ['websiteUrl'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('websiteUrl', value)
      });
    case 'streetAddress1':
      return updateComponentChild({
        state,
        childStatePath: ['streetAddress1'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('streetAddress1', value)
      });
    case 'streetAddress2':
      return updateComponentChild({
        state,
        childStatePath: ['streetAddress2'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('streetAddress2', value)
      });
    case 'city':
      return updateComponentChild({
        state,
        childStatePath: ['city'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('city', value)
      });
    case 'country':
      return updateComponentChild({
        state,
        childStatePath: ['country'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('country', value)
      });
    case 'mailCode':
      return updateComponentChild({
        state,
        childStatePath: ['mailCode'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('mailCode', value)
      });
    case 'contactTitle':
      return updateComponentChild({
        state,
        childStatePath: ['contactTitle'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('contactTitle', value)
      });
    case 'contactName':
      return updateComponentChild({
        state,
        childStatePath: ['contactName'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('contactName', value)
      });
    case 'contactEmail':
      return updateComponentChild({
        state,
        childStatePath: ['contactEmail'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('contactEmail', value)
      });
    case 'contactPhone':
      return updateComponentChild({
        state,
        childStatePath: ['contactPhone'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('contactPhone', value)
      });
    case 'region':
      return updateComponentChild({
        state,
        childStatePath: ['region'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('region', value)
      });

      default: return [state];
  }
};

type SubmitHook = (org: Organization) => void | undefined;
export interface Props extends ComponentViewProps<State, Msg> {
  disabled: boolean;
  submitHook: SubmitHook;
}

export const view: View<Props> = props => {
  const { state, dispatch, disabled } = props;
  const isSubmitLoading = state.submitLoading > 0;

  return (
    <div>
      <Row>

        <Row className='my-3 py-3'>
          <Col xs='2'>
          </Col>
          <Col xs='10'>
            <div className='pb-3'><strong>Logo (Optional)</strong></div>
            <Link button className='btn-secondary'>Choose Image</Link>
          </Col>
        </Row>

        <Col xs='12'>
          <ShortText.view
            extraChildProps={{}}
            label='Legal Name'
            required
            disabled={disabled}
            state={state.legalName}
            dispatch={mapComponentDispatch(dispatch, value => adt('legalName' as const, value))} />
        </Col>

        <Col xs='12'>
          <ShortText.view
            extraChildProps={{}}
            label='Website Url (Optional)'
            disabled={disabled}
            state={state.websiteUrl}
            dispatch={mapComponentDispatch(dispatch, value => adt('websiteUrl' as const, value))} />
        </Col>

        <Col xs='12'>
          <h2>Legal Address</h2>
        </Col >

        <Col xs='12'>
          <ShortText.view
            extraChildProps={{}}
            label='Street Address'
            required
            disabled={disabled}
            state={state.streetAddress1}
            dispatch={mapComponentDispatch(dispatch, value => adt('streetAddress1' as const, value))} />
        </Col>

        <Col xs='12'>
          <ShortText.view
            extraChildProps={{}}
            label='Street Address'
            disabled={disabled}
            state={state.streetAddress2}
            dispatch={mapComponentDispatch(dispatch, value => adt('streetAddress2' as const, value))} />
        </Col>

        <Col xs='8'>
          <ShortText.view
            extraChildProps={{}}
            label='City'
            required
            disabled={disabled}
            state={state.city}
            dispatch={mapComponentDispatch(dispatch, value => adt('city' as const, value))} />
        </Col>

        <Col xs='4'>
          <ShortText.view
            extraChildProps={{}}
            label='Province/State'
            required
            disabled={disabled}
            state={state.region}
            dispatch={mapComponentDispatch(dispatch, value => adt('region' as const, value))} />
        </Col>

          <Col xs='5' className='pb-4'>
            <ShortText.view
              extraChildProps={{}}
              label='Postal / ZIP Code'
              required
              disabled={disabled}
              state={state.mailCode}
              dispatch={mapComponentDispatch(dispatch, value => adt('mailCode' as const, value))} />
          </Col>

          <Col xs='7' className='pb-4'>
            <ShortText.view
              extraChildProps={{}}
              label='Country'
              required
              disabled={disabled}
              state={state.country}
              dispatch={mapComponentDispatch(dispatch, value => adt('country' as const, value))} />
          </Col>

        <Col xs='12' className='pt-5 border-top'>
          <h2>Contact Information</h2>
        </Col >

        <Col xs='12'>
          <ShortText.view
            extraChildProps={{}}
            label='Contact Name'
            required
            disabled={disabled}
            state={state.contactName}
            dispatch={mapComponentDispatch(dispatch, value => adt('contactName' as const, value))} />
        </Col>

        <Col xs='12'>
          <ShortText.view
            extraChildProps={{}}
            label='Job Title (Optional)'
            disabled={disabled}
            state={state.contactTitle}
            dispatch={mapComponentDispatch(dispatch, value => adt('contactTitle' as const, value))} />
        </Col>

        <Col xs='7'>
          <ShortText.view
            extraChildProps={{}}
            label='Contact Email'
            required
            disabled={disabled}
            state={state.contactEmail}
            dispatch={mapComponentDispatch(dispatch, value => adt('contactEmail' as const, value))} />
        </Col>

        <Col xs='5'>
          <ShortText.view
            extraChildProps={{}}
            label='Phone Number (Optional)'
            disabled={disabled}
            state={state.contactPhone}
            dispatch={mapComponentDispatch(dispatch, value => adt('contactPhone' as const, value))} />
        </Col>
      </Row>

      <Row>
        <Col className='d-flex justify-content-end pt-5'>
          <Link button className='mr-3'>Cancel</Link>
          <LoadingButton loading={isSubmitLoading}
            color='primary'
            symbol_={leftPlacement(iconLinkSymbol('plus-circle'))}
            onClick={() => dispatch(adt('submit', props.submitHook ))}
          >
            Save
          </LoadingButton>
        </Col>
      </Row>

    </div>
  );
};
