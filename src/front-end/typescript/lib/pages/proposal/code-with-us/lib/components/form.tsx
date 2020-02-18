import { Route } from 'front-end/lib/app/types';
import * as Attachments from 'front-end/lib/components/attachments';
import * as FormField from 'front-end/lib/components/form-field';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import * as RadioGroup from 'front-end/lib/components/form-field/radio-group';
import * as Select from 'front-end/lib/components/form-field/select';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentView, ComponentViewProps, GlobalComponentMsg, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import Radio from 'front-end/lib/views/radio';
import React from 'react';
import { Col, Nav, NavItem, Row } from 'reactstrap';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import * as CWUProposalResource from 'shared/lib/resources/proposal/code-with-us';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';
import * as opportunityValidation from 'shared/lib/validation/opportunity';

type ProponentType = 'individual' | 'organization';

const ProponentTypeRadioGroup = RadioGroup.makeComponent<ProponentType>();

type TabId = 'Proponent' | 'Proposal' | 'Attachments';

export interface State {
  opportunity: CWUOpportunity;
  activeTab: TabId;
  // Proponent Tab
  proponentType: Immutable<RadioGroup.State<ProponentType>>;
  // Individual
  legalName: Immutable<ShortText.State>;
  email: Immutable<ShortText.State>;
  phone: Immutable<ShortText.State>;
  street1: Immutable<ShortText.State>;
  street2: Immutable<ShortText.State>;
  city: Immutable<ShortText.State>;
  region: Immutable<ShortText.State>;
  mailCode: Immutable<ShortText.State>;
  country: Immutable<ShortText.State>;
  // Organziation
  organization: Immutable<Select.State>;
  // Proposal Tab
  proposalText: Immutable<LongText.State>;
  additionalComments: Immutable<LongText.State>;
  // Attachments tab
  attachments: Immutable<Attachments.State>;
}

type InnerMsg
  = ADT<'updateActiveTab',   TabId>
  | ADT<'saveDraft'>
  // Proponent Tab
  | ADT<'proponentType', RadioGroup.Msg<ProponentType>>
  // Individual Proponent
  | ADT<'legalName', ShortText.Msg>
  | ADT<'email', ShortText.Msg>
  | ADT<'phone', ShortText.Msg>
  | ADT<'street1', ShortText.Msg>
  | ADT<'street2', ShortText.Msg>
  | ADT<'city', ShortText.Msg>
  | ADT<'region', ShortText.Msg>
  | ADT<'mailCode', ShortText.Msg>
  | ADT<'country', ShortText.Msg>
  // Organization Proponent
  | ADT<'organization', Select.Msg>
  // Proposal Tab
  | ADT<'proposalText',           LongText.Msg>
  | ADT<'additionalComments', LongText.Msg>
  // Attachments tab
  | ADT<'attachments', Attachments.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface Params {
  opportunity: CWUOpportunity;
  organizations: OrganizationSlim[];
}

export const init: Init<Params, State> = async ({ opportunity, organizations }) => {
  return {
    opportunity,
    activeTab: 'Proponent',
    orgId: '',

    proponentType: immutable(await ProponentTypeRadioGroup.init({
      errors: [],
      validate: v => v === null ? invalid(['Please select a proponent type.']) : valid(v),
      child: {
        id: 'cwu-proposal-proponent-type',
        value: null,
        options: [
          { label: 'Individual', value: 'individual' },
          { label: 'Organization', value: 'organization' }
        ]
      }
    })),

    // Individual
    legalName: immutable(await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-individual-legalName'
      }
    })),

    email: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-individual-email'
      }
    })),

    phone: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-individual-phone'
      }
    })),

    street1: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-individual-street1'
      }
    })),

    street2: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-individual-street2'
      }
    })),

    city: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-individual-city'
      }
    })),

    region: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-individual-region'
      }
    })),

    mailCode: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-individual-mailCode'
      }
    })),

    country: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-individual-country'
      }
    })),

    organization: immutable(await Select.init({
      errors: [],
      child: {
        value: { value: organizations[0].id, label: organizations[0].legalName },
        id: 'proposal-organization-id',
        options: adt( 'options', organizations.map( O => ({ value: O.id, label: O.legalName })) )
      }
    })),

    proposalText: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'proposal-proposalText'
      }
    })),

    additionalComments: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'proposal-additional-comments'
      }
    })),

    attachments: immutable(await Attachments.init({
      existingAttachments: [],
      newAttachmentMetadata: [adt('any')]
    }))

  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'updateActiveTab':
      return [state.set('activeTab', msg.value)];

    case 'proponentType':
      return updateComponentChild({
        state,
        childStatePath: ['proponentType'],
        childUpdate: ProponentTypeRadioGroup.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('proponentType', value)
      });

    case 'legalName':
      return updateComponentChild({
        state,
        childStatePath: ['legalName'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('legalName', value)
      });

    case 'email':
      return updateComponentChild({
        state,
        childStatePath: ['email'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('email', value)
      });

    case 'phone':
      return updateComponentChild({
        state,
        childStatePath: ['phone'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('phone', value)
      });

    case 'street1':
      return updateComponentChild({
        state,
        childStatePath: ['street1'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('street1', value)
      });

    case 'street2':
      return updateComponentChild({
        state,
        childStatePath: ['street2'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('street2', value)
      });

    case 'city':
      return updateComponentChild({
        state,
        childStatePath: ['city'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('city', value)
      });

    case 'region':
      return updateComponentChild({
        state,
        childStatePath: ['region'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('region', value)
      });

    case 'mailCode':
      return updateComponentChild({
        state,
        childStatePath: ['mailCode'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('mailCode', value)
      });

    case 'country':
      return updateComponentChild({
        state,
        childStatePath: ['country'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('country', value)
      });

    case 'proposalText':
      return updateComponentChild({
        state,
        childStatePath: ['proposalText'],
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('proposalText', value)
      });

    case 'additionalComments':
      return updateComponentChild({
        state,
        childStatePath: ['additionalComments'],
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('additionalComments', value)
      });

    case 'attachments':
      return updateComponentChild({
        state,
        childStatePath: ['attachments'],
        childUpdate: Attachments.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('attachments', value)
      });

    default:
      return [state];
  }
};

type Values = Omit<CWUProposalResource.CreateRequestBody, 'opportunity'>;

function proponentFor(proponentType: ProponentType, state: State): CWUProposalResource.CreateProponentRequestBody {
  switch (proponentType) {
    case 'individual':
      return adt('individual', {
        legalName:  FormField.getValue(state.legalName),
        email:      FormField.getValue(state.email),
        phone:      FormField.getValue(state.phone),
        street1:    FormField.getValue(state.street1),
        street2:    FormField.getValue(state.street2),
        city:       FormField.getValue(state.city),
        region:     FormField.getValue(state.region),
        mailCode:   FormField.getValue(state.mailCode),
        country:    FormField.getValue(state.country)
      });
    case 'organization':
      const fieldValue = FormField.getValue(state.organization);
      return adt('organization', fieldValue ? fieldValue.value : '' );
  }
}

function getFormValues(state: State): Values | null {
  const proponentType = FormField.getValue(state.proponentType);
  if (!proponentType) { return null; }
  const proponent = proponentFor(proponentType, state);
  const result = {
    proposalText:        FormField.getValue(state.proposalText),
    additionalComments:  FormField.getValue(state.additionalComments),
    proponent,
    attachments: state.attachments.existingAttachments.map(({ id }) => id)
  };

  return result;
}

type Errors = CWUProposalResource.CreateValidationErrors;

export function isProponentTabValid(state: State): boolean {
  const proponentType = FormField.getValue(state.proponentType);
  if (!proponentType) { return false; }
  switch (proponentType) {
    case 'individual':
      return FormField.isValid(state.legalName)  &&
               FormField.isValid(state.email)    &&
               FormField.isValid(state.phone)    &&
               FormField.isValid(state.street1)  &&
               FormField.isValid(state.street2)  &&
               FormField.isValid(state.city)     &&
               FormField.isValid(state.region)   &&
               FormField.isValid(state.mailCode) &&
               FormField.isValid(state.country);
    case 'organization':
      return FormField.isValid(state.organization);
  }
}

export function isProposalTabValid(state: State): boolean {
  const result = FormField.isValid(state.proposalText) &&
                 FormField.isValid(state.additionalComments);
  return result;
}

export function isAttachmentsTabValid(state: State): boolean {
  return Attachments.isValid(state.attachments);
}

export function isValid(state: State): boolean {
  return (
    isProponentTabValid(state) &&
    isProposalTabValid(state) &&
    isAttachmentsTabValid(state)
  );
}

function setErrors(state: State, errors?: Errors): void {
  if (errors) {

    if (errors.proponent) {
      switch (errors.proponent.tag) {
        case 'individual': {
          if (errors.proponent.value.legalName) { FormField.setErrors(state.legalName, errors.proponent.value.legalName); }
          if (errors.proponent.value.email)     { FormField.setErrors(state.email, errors.proponent.value.email); }
          if (errors.proponent.value.phone)     { FormField.setErrors(state.phone, errors.proponent.value.phone); }
          if (errors.proponent.value.street1)   { FormField.setErrors(state.street1, errors.proponent.value.street1); }
          if (errors.proponent.value.street2)   { FormField.setErrors(state.street2, errors.proponent.value.street2); }
          if (errors.proponent.value.city)      { FormField.setErrors(state.city, errors.proponent.value.city); }
          if (errors.proponent.value.region)    { FormField.setErrors(state.region, errors.proponent.value.region); }
          if (errors.proponent.value.mailCode)  { FormField.setErrors(state.mailCode, errors.proponent.value.mailCode); }
          if (errors.proponent.value.country)   { FormField.setErrors(state.country, errors.proponent.value.country); }
          break;
        }
        case 'organization': {
          if (errors.proponent.value) { FormField.setErrors(state.organization, errors.proponent.value); }
          break;
        }
        case 'parseFailure': {
          // Note: Hard failure case from the backend.
          break;
        }
      }
    }

    if (errors.attachments) {
      // TODO(Jesse): Do we ever actually get attachment errors?
    }
  }
  return;
}

function requestBodyFromValues(opportunityId: Id, formValues: Values): CWUProposalResource.CreateRequestBody {
  return ({opportunity: opportunityId, ...formValues });
}

export async function persist(state: State): Promise<Validation<State, string[]>> {
  const formValues = getFormValues(state);

  const newAttachments = Attachments.getNewAttachments(state.attachments);
  // Upload new attachments if necessary.
  if (newAttachments.length) {
    const result = await api.uploadFiles(newAttachments);
    switch (result.tag) {
      case 'valid':
        formValues.attachments = [...formValues.attachments, ...(result.value.map(({ id }) => id))];
        break;
      case 'invalid':
      case 'unhandled':
        return invalid(['Error updating attachments.']);
    }
  }

  const requestBody = requestBodyFromValues(state.opportunity.id, formValues);
  const apiResult = await api.proposals.cwu.create(requestBody);

  switch (apiResult.tag) {
    case 'valid':
      return valid(state);
    case 'unhandled':
    case 'invalid':
      setErrors(state, apiResult.value);
      return invalid(['Error creating the Proposal.']);
  }
}

const IndividualProponent: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Row className='pt-5 border-top'>
      <Col xs='12'>
        Please provide the following details for the proponent that will
        complete the work as outlined by the Acceptance Criteria of the
        opportunity.
      </Col>

      <Col xs='12'>
        <ShortText.view
          placeholder='Vendor Name'
          required
          extraChildProps={{}}
          label='Name'
          state={state.legalName}
          dispatch={mapComponentDispatch(dispatch, value => adt('legalName' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          placeholder='vendor@email.com'
          required
          extraChildProps={{}}
          label='Email'
          state={state.email}
          dispatch={mapComponentDispatch(dispatch, value => adt('email' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          placeholder='Phone Number'
          extraChildProps={{}}
          label='Phone'
          state={state.phone}
          dispatch={mapComponentDispatch(dispatch, value => adt('phone' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          placeholder='Street Address'
          required
          extraChildProps={{}}
          label='Address'
          state={state.street1}
          dispatch={mapComponentDispatch(dispatch, value => adt('street1' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          placeholder='Street Address'
          extraChildProps={{}}
          label='Address'
          state={state.street2}
          dispatch={mapComponentDispatch(dispatch, value => adt('street2' as const, value)) }
        />
      </Col>

      <Col sm='8' xs='12'>
        <ShortText.view
          placeholder='City'
          required
          extraChildProps={{}}
          label='City'
          state={state.city}
          dispatch={mapComponentDispatch(dispatch, value => adt('city' as const, value)) }
        />
      </Col>

      <Col sm='4' xs='12'>
        <ShortText.view
          placeholder='Province / State'
          required
          extraChildProps={{}}
          label='Province / State'
          state={state.region}
          dispatch={mapComponentDispatch(dispatch, value => adt('region' as const, value)) }
        />
      </Col>

      <Col sm='5' xs='12'>
        <ShortText.view
          placeholder='Postal / ZIP Code'
          required
          extraChildProps={{}}
          label='Postal / ZIP Code'
          state={state.mailCode}
          dispatch={mapComponentDispatch(dispatch, value => adt('mailCode' as const, value)) }
        />
      </Col>

      <Col sm='7' xs='12'>
        <ShortText.view
          placeholder='Country'
          required
          extraChildProps={{}}
          label='Country'
          state={state.country}
          dispatch={mapComponentDispatch(dispatch, value => adt('country' as const, value)) }
        />
      </Col>
    </Row>
  );
};

const OrganizationProponent: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Row className='pt-5 border-top'>
      <Col xs='12'>
        <Select.view
          extraChildProps={{}}
          label='Organization'
          placeholder='Organization'
          required
          state={state.organization}
          dispatch={mapComponentDispatch(dispatch, value => adt('organization' as const, value))} />
      </Col>
    </Row>
  );
};

const ProponentView: ComponentView<State, Msg> = (params) => {
  const state = params.state;
  const dispatch = params.dispatch;

  let activeView;
  switch (state.proponentType) {
    case 'Individual': {
      activeView = (<IndividualProponent {...params} />);
      break;
    }
    case 'Organization': {
      activeView = (<OrganizationProponent {...params} />);
      break;
    }
  }

  return (
    <div>
      <Row className='pb-5'>
        <Col xs='12'>
          <p>
            Please select the type of proponent that will be submitting a
            proposal for the opportunity
          </p>
        </Col>

        <Col xs='12'>
          <Radio
            id='proponenet-is-individual'
            label='Individual'
            checked={state.proponentType === 'Individual'}
            onClick={ () => { dispatch(adt('proponentType' as const, 'Individual' as const)); } }
          />

          <Radio
            id='proponenet-is-org'
            label='Organization'
            checked={state.proponentType === 'Organization'}
            onClick={ () => { dispatch(adt('proponentType' as const, 'Organization' as const)); } }
          />
        </Col>
      </Row>

      { activeView }
    </div>
  );
};

const ProposalView: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Row>
      <Col xs='12'>
        Enter your proposal and any additional comments in the spaces provided
        below.  Be sure to address the Proposal Evaluation Criteria.
      </Col>
      <Col xs='12'>
        TODO(Jesse): How do we pull the proposal question point criteria for
        the context bubble as per the designs?
      </Col>
      <Col xs='12'>
        <LongText.view
          required
          extraChildProps={{}}
          style={{ height: '450px' }}
          label='Proposal'
          state={state.proposalText}
          dispatch={mapComponentDispatch(dispatch, value => adt('proposalText' as const, value))} />
      </Col>

      <Col xs='12'>
        <LongText.view
          required
          extraChildProps={{}}
          style={{ height: '200px' }}
          label='Additional Comments'
          state={state.additionalComments}
          dispatch={mapComponentDispatch(dispatch, value => adt('additionalComments' as const, value))} />
      </Col>
    </Row>
  );
};

interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

// @duplicated-attachments-view
const AttachmentsView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>
      <Col xs='12'>
        <p>
          Upload any supporting material for your opportunity here. Attachments must be smaller than 10MB.
        </p>
        <Attachments.view
          dispatch={mapComponentDispatch(dispatch, msg => adt('attachments' as const, msg))}
          state={state.attachments}
          disabled={disabled}
          className='mt-4' />
      </Col>
    </Row>
  );
};

// @duplicated-tab-helper-functions
function isActiveTab(state: State, tab: TabId): boolean {
  return state.activeTab === tab;
}

// @duplicated-tab-helper-functions
const TabLink: View<Props & { tab: TabId; }> = ({ state, dispatch, tab, disabled }) => {
  const isActive = isActiveTab(state, tab);
  const isValid = () => {
    switch (tab) {
      case 'Proponent':   return isProponentTabValid(state);
      case 'Proposal':    return isProposalTabValid(state);
      case 'Attachments': return isAttachmentsTabValid(state);
    }
  };
  return (
    <NavItem>
      <Link
        nav
        symbol_={isValid() ? undefined : leftPlacement(iconLinkSymbol('exclamation-circle'))}
        symbolClassName='text-warning'
        className={`text-nowrap ${isActive ? 'active text-body' : 'text-primary'}`}
        onClick={() => {dispatch(adt('updateActiveTab', tab)); }}>
        {tab}
      </Link>
    </NavItem>
  );
};

export const view: View<Props> = props => {
  const { state } = props;
  return (
    <div>
      <Nav tabs className='mb-5'>
        <TabLink {...props} tab='Proponent' />
        <TabLink {...props} tab='Proposal' />
        <TabLink {...props} tab='Attachments' />
      </Nav>
      {(() => {
        switch (state.activeTab) {
          case 'Proponent': {
            return (<ProponentView {...props} />);
          }
          case 'Proposal': {
            return (<ProposalView {...props} />);
          }
          case 'Attachments': {
            return (<AttachmentsView {...props} />);
          }
        }
      })()}
    </div>
  );
};
