import { DEFAULT_ORGANIZATION_LOGO_IMAGE_PATH } from 'front-end/config';
import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentViewProps, GlobalComponentMsg, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import { AvatarFiletype } from 'front-end/lib/types';
import FileButton from 'front-end/lib/views/file-button';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { getString } from 'shared/lib';
import { fileBlobPath } from 'shared/lib/resources/file';
import { SUPPORTED_IMAGE_EXTENSIONS } from 'shared/lib/resources/file';
import { CreateRequestBody, Organization, UpdateRequestBody } from 'shared/lib/resources/organization';
import { adt, ADT, Id } from 'shared/lib/types';
import { ErrorTypeFrom, invalid, valid, validateThenMapValid, Validation } from 'shared/lib/validation';
import * as orgValidation from 'shared/lib/validation/organization';

export interface Params {
  organization?: Organization;
}

export interface State extends Params {
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
  newLogoImage?: AvatarFiletype;
}

export type InnerMsg
  = ADT<'legalName',       ShortText.Msg>
  | ADT<'websiteUrl',      ShortText.Msg>
  | ADT<'streetAddress1',  ShortText.Msg>
  | ADT<'streetAddress2',  ShortText.Msg>
  | ADT<'city',            ShortText.Msg>
  | ADT<'country',         ShortText.Msg>
  | ADT<'mailCode',        ShortText.Msg>
  | ADT<'contactTitle',    ShortText.Msg>
  | ADT<'contactName',     ShortText.Msg>
  | ADT<'contactEmail',    ShortText.Msg>
  | ADT<'contactPhone',    ShortText.Msg>
  | ADT<'region',          ShortText.Msg>
  | ADT<'onChangeAvatar',  File>
  ;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface Values extends Omit<Required<CreateRequestBody>, 'logoImageFile' | 'deactivatedOn' | 'deactivatedBy'> {
  newLogoImage?: File;
}

type Errors = ErrorTypeFrom<Values>;

export function isValid(state: Immutable<State>): boolean {
  const result: boolean = (
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

  return result;
}

export function getValues(state: Immutable<State>): Values {
  return {
    legalName:       FormField.getValue(state.legalName),
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
    websiteUrl:      FormField.getValue(state.websiteUrl),
    newLogoImage:    state.newLogoImage ? state.newLogoImage.file : undefined
  };
}

export function setErrors(state: Immutable<State>, errors?: Errors): Immutable<State> {
  if (errors) {
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
    .update('websiteUrl',      s => FormField.setErrors(s, errors.websiteUrl     || []))
    .update('newLogoImage', v => v && ({ ...v, errors: errors.newLogoImage   || []} ));
  } else {
    return state;
  }
}

export const init: Init<Params, State> = async ({ organization }) => {
  return {
    organization,
    newLogoImage: null,
    legalName: immutable(await ShortText.init({
      errors: [],
      validate: orgValidation.validateLegalName,
      child: {
        type: 'text',
        value: getString(organization, 'legalName'),
        id: 'organization-gov-legal-name'
      }
    })),
    websiteUrl: immutable(await ShortText.init({
      errors: [],
      validate: validateThenMapValid(orgValidation.validateWebsiteUrl, a => a || ''),
      child: {
        type: 'text',
        value: getString(organization, 'websiteUrl'),
        id: 'organization-gov-website-url'
      }
    })),
    streetAddress1: immutable(await ShortText.init({
      errors: [],
      validate: orgValidation.validateStreetAddress1,
      child: {
        type: 'text',
        value: getString(organization, 'streetAddress1'),
        id: 'organization-gov-street-address-one'
      }
    })),
    streetAddress2: immutable(await ShortText.init({
      errors: [],
      validate: validateThenMapValid(orgValidation.validateStreetAddress2, a => a || ''),
      child: {
        type: 'text',
        value: getString(organization, 'streetAddress2'),
        id: 'organization-gov-street-address-two'
      }
    })),
    city: immutable(await ShortText.init({
      errors: [],
      validate: orgValidation.validateCity,
      child: {
        type: 'text',
        value: getString(organization, 'city'),
        id: 'organization-gov-city'
      }
    })),
    country: immutable(await ShortText.init({
      errors: [],
      validate: orgValidation.validateCountry,
      child: {
        type: 'text',
        value: getString(organization, 'country'),
        id: 'organization-gov-country'
      }
    })),
    mailCode: immutable(await ShortText.init({
      errors: [],
      validate: orgValidation.validateMailCode,
      child: {
        type: 'text',
        value: getString(organization, 'mailCode'),
        id: 'organization-gov-mail-code'
      }
    })),
    contactTitle: immutable(await ShortText.init({
      errors: [],
      validate: validateThenMapValid(orgValidation.validateContactTitle, a => a || ''),
      child: {
        type: 'text',
        value: getString(organization, 'contactTitle'),
        id: 'organization-gov-contact-title'
      }
    })),
    contactName: immutable(await ShortText.init({
      errors: [],
      validate: orgValidation.validateContactName,
      child: {
        type: 'text',
        value: getString(organization, 'contactName'),
        id: 'organization-gov-contact-name'
      }
    })),
    contactEmail: immutable(await ShortText.init({
      errors: [],
      validate: orgValidation.validateContactEmail,
      child: {
        type: 'text',
        value: getString(organization, 'contactEmail'),
        id: 'organization-gov-contact-email'
      }
    })),
    contactPhone: immutable(await ShortText.init({
      errors: [],
      validate: validateThenMapValid(orgValidation.validateContactPhone, a => a || ''),
      child: {
        type: 'text',
        value: getString(organization, 'contactPhone'),
        id: 'organization-gov-contact-phone'
      }
    })),
    region: immutable(await ShortText.init({
      errors: [],
      validate: orgValidation.validateRegion,
      child: {
        type: 'text',
        value: getString(organization, 'region'),
        id: 'organization-gov-region'
      }
    }))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'onChangeAvatar':
      return [state, async state => {
        return state.set('newLogoImage', {
          file: msg.value,
          path: URL.createObjectURL(msg.value),
          errors: []
        });
      }
    ];
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

export interface Props extends ComponentViewProps<State, Msg> {
  disabled: boolean;
}

export function orgLogoPath(org?: Organization): string {
  return org && org.logoImageFile
    ? fileBlobPath(org.logoImageFile)
    : DEFAULT_ORGANIZATION_LOGO_IMAGE_PATH;
}

export const view: View<Props> = props => {
  const { state, dispatch, disabled } = props;
  return (
    <div>
      <Row>
        <Col xs='12' className='mb-4 d-flex align-items-center flex-nowrap'>
          <img
            className='rounded-circle border'
            style={{
              width: '5rem',
              height: '5rem',
              objectFit: 'cover'
            }}
            src={state.newLogoImage ? state.newLogoImage.path : orgLogoPath(state.organization)} />
          <div className='ml-3 d-flex flex-column align-items-start flex-nowrap'>
            <div className='mb-2'><b>Profile Picture (Optional)</b></div>
            <FileButton
              outline
              size='sm'
              style={{
                visibility: disabled ? 'hidden' : undefined,
                pointerEvents: disabled ? 'none' : undefined
              }}
              onChange={file => dispatch(adt('onChangeAvatar', file))}
              accept={SUPPORTED_IMAGE_EXTENSIONS}
              color='primary'>
              Choose Image
            </FileButton>
            {state.newLogoImage && state.newLogoImage.errors.length
              ? (<div className='mt-2 small text-danger'>{state.newLogoImage.errors.map((e, i) => (<div key={`org-logo-error-${i}`}>{e}</div>))}</div>)
              : null}
          </div>
        </Col>

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
          <div className='mb-5 pb-5 border-bottom'>
            <ShortText.view
              extraChildProps={{}}
              label='Website Url (Optional)'
              disabled={disabled}
              state={state.websiteUrl}
              dispatch={mapComponentDispatch(dispatch, value => adt('websiteUrl' as const, value))} />
          </div>
        </Col>

        <Col xs='12'>
          <h3 className='mb-4'>Legal Address</h3>
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

        <Col xs='12' md='8'>
          <ShortText.view
            extraChildProps={{}}
            label='City'
            required
            disabled={disabled}
            state={state.city}
            dispatch={mapComponentDispatch(dispatch, value => adt('city' as const, value))} />
        </Col>

        <Col xs='12' md='4'>
          <ShortText.view
            extraChildProps={{}}
            label='Province/State'
            required
            disabled={disabled}
            state={state.region}
            dispatch={mapComponentDispatch(dispatch, value => adt('region' as const, value))} />
        </Col>

        <Col xs='12'>
          <div className='mb-5 pb-5 border-bottom'>
            <Row>
              <Col md='5'>
                <ShortText.view
                  extraChildProps={{}}
                  label='Postal / ZIP Code'
                  required
                  disabled={disabled}
                  state={state.mailCode}
                  dispatch={mapComponentDispatch(dispatch, value => adt('mailCode' as const, value))} />
              </Col>

              <Col md='7'>
                <ShortText.view
                  extraChildProps={{}}
                  label='Country'
                  required
                  disabled={disabled}
                  state={state.country}
                  dispatch={mapComponentDispatch(dispatch, value => adt('country' as const, value))} />
              </Col>
            </Row>
          </div>
        </Col>

        <Col xs='12'>
          <h3 className='mb-4'>Contact Information</h3>
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

        <Col xs='12' md='7'>
          <ShortText.view
            extraChildProps={{}}
            label='Contact Email'
            required
            disabled={disabled}
            state={state.contactEmail}
            dispatch={mapComponentDispatch(dispatch, value => adt('contactEmail' as const, value))} />
        </Col>

        <Col xs='12' md='5'>
          <ShortText.view
            extraChildProps={{}}
            label='Phone Number (Optional)'
            disabled={disabled}
            state={state.contactPhone}
            dispatch={mapComponentDispatch(dispatch, value => adt('contactPhone' as const, value))} />
        </Col>
      </Row>
    </div>
  );
};

interface PersistUpdateParams {
  state: Immutable<State>;
  orgId: Id;
  extraBody: Omit<UpdateRequestBody, keyof Values>;
}

type PersistParams
  = ADT<'create', Immutable<State>>
  | ADT<'update', PersistUpdateParams>;

type PersistReturnValue = Validation<[Immutable<State>, Organization], Immutable<State>>;

export async function persist(params: PersistParams): Promise<PersistReturnValue> {
  const state = params.tag === 'create' ? params.value : params.value.state;
  const values = getValues(state);
  let logoImageFile: Id | undefined = params.tag === 'update'
    ? params.value.extraBody.logoImageFile
    : undefined;
  if (values.newLogoImage) {
    const fileResult = await api.files.create({
      name: values.newLogoImage.name,
      file: values.newLogoImage,
      metadata: [adt('any')]
    });
    switch (fileResult.tag) {
      case 'valid':
        logoImageFile = fileResult.value.id;
        break;
      case 'unhandled':
      case 'invalid':
        return invalid(setErrors(state, {
          newLogoImage: ['Please select a different avatar image.']
        }));
    }
  }
  values.newLogoImage = undefined; // So this property isn't passed to back-end.
  // Make the back-end request.
  const result = await (() => {
    switch (params.tag) {
      case 'create':
        return api.organizations.create({
          ...values,
          logoImageFile
        });
      case 'update':
        return api.organizations.update(params.value.orgId, {
          ...params.value.extraBody,
          ...values,
          logoImageFile
        });
    }
  })();
  // Handle the back-end response.
  switch (result.tag) {
    case 'invalid':
      return invalid(setErrors(state, result.value));
    case 'unhandled':
      return invalid(state);
    case 'valid':
      return valid([
        immutable(await init({ organization: result.value })),
        result.value
      ]);
  }
}
