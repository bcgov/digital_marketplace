import * as Attachments from 'front-end/lib/components/attachments';
import * as FormField from 'front-end/lib/components/form-field';
import * as RadioGroup from 'front-end/lib/components/form-field/radio-group';
import * as RichMarkdownEditor from 'front-end/lib/components/form-field/rich-markdown-editor';
import * as Select from 'front-end/lib/components/form-field/select';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentView, ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Icon from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import Markdown from 'front-end/lib/views/markdown';
import React from 'react';
import { Alert, Col, Nav, NavItem, Row } from 'reactstrap';
import { AffiliationSlim, MembershipType } from 'shared/lib/resources/affiliation';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import * as CWUProposalResource from 'shared/lib/resources/proposal/code-with-us';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';
import * as proposalValidation from 'shared/lib/validation/proposal/code-with-us';

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
  showEvaluationCriteria: boolean;
  proposalText: Immutable<RichMarkdownEditor.State>;
  additionalComments: Immutable<RichMarkdownEditor.State>;
  // Attachments tab
  attachments: Immutable<Attachments.State>;
}

export type Msg
  = ADT<'updateActiveTab',   TabId>
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
  | ADT<'toggleEvaluationCriteria'>
  | ADT<'proposalText',           RichMarkdownEditor.Msg>
  | ADT<'additionalComments', RichMarkdownEditor.Msg>
  // Attachments tab
  | ADT<'attachments', Attachments.Msg>;

export interface Params {
  opportunity: CWUOpportunity;
  affiliations: AffiliationSlim[];
}

export const init: Init<Params, State> = async ({ opportunity, affiliations }) => {
  return {
    opportunity,
    activeTab: 'Proponent',
    orgId: '',
    showEvaluationCriteria: true,

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
      validate: proposalValidation.validateIndividualProponentLegalName,
      child: {
        type: 'text',
        value: '',
        id: 'cwu-proposal-individual-legalName'
      }
    })),

    email: immutable( await ShortText.init({
      errors: [],
      validate: proposalValidation.validateIndividualProponentEmail,
      child: {
        type: 'text',
        value: '',
        id: 'cwu-proposal-individual-email'
      }
    })),

    phone: immutable( await ShortText.init({
      errors: [],
      validate: proposalValidation.validateIndividualProponentPhone,
      child: {
        type: 'text',
        value: '',
        id: 'cwu-proposal-individual-phone'
      }
    })),

    street1: immutable( await ShortText.init({
      errors: [],
      validate: proposalValidation.validateIndividualProponentStreet1,
      child: {
        type: 'text',
        value: '',
        id: 'cwu-proposal-individual-street1'
      }
    })),

    street2: immutable( await ShortText.init({
      errors: [],
      validate: proposalValidation.validateIndividualProponentStreet2,
      child: {
        type: 'text',
        value: '',
        id: 'cwu-proposal-individual-street2'
      }
    })),

    city: immutable( await ShortText.init({
      errors: [],
      validate: proposalValidation.validateIndividualProponentCity,
      child: {
        type: 'text',
        value: '',
        id: 'cwu-proposal-individual-city'
      }
    })),

    region: immutable( await ShortText.init({
      errors: [],
      validate: proposalValidation.validateIndividualProponentRegion,
      child: {
        type: 'text',
        value: '',
        id: 'cwu-proposal-individual-region'
      }
    })),

    mailCode: immutable( await ShortText.init({
      errors: [],
      validate: proposalValidation.validateIndividualProponentMailCode,
      child: {
        type: 'text',
        value: '',
        id: 'cwu-proposal-individual-mailCode'
      }
    })),

    country: immutable( await ShortText.init({
      errors: [],
      validate: proposalValidation.validateIndividualProponentCountry,
      child: {
        type: 'text',
        value: '',
        id: 'cwu-proposal-individual-country'
      }
    })),

    organization: immutable(await Select.init({
      errors: [],
      validate: option => {
        if (!option) { return invalid(['Please select an organization.']); }
        return valid(option);
      },
      child: {
        value: null,
        id: 'cwu-proposal-organization-id',
        options: adt('options', affiliations
          .filter(a => a.membershipType === MembershipType.Owner)
          .map(a => ({ value: a.organization.id, label: a.organization.legalName })))
      }
    })),

    proposalText: immutable(await RichMarkdownEditor.init({
      errors: [],
      validate: proposalValidation.validateProposalText,
      child: {
        value: '',
        id: 'cwu-proposal-proposalText',
        //TODO need to figure out how to set permissions for markdown images here
        //might require special back-end endpoint
        uploadImage: api.makeUploadMarkdownImage([
          adt('userType', UserType.Admin),
          adt('userType', UserType.Government)
        ])
      }
    })),

    additionalComments: immutable(await RichMarkdownEditor.init({
      errors: [],
      validate: proposalValidation.validateAdditionalComments,
      child: {
        value: '',
        id: 'cwu-proposal-additional-comments',
        //TODO need to figure out how to set permissions for markdown images here
        uploadImage: api.makeUploadMarkdownImage([
          adt('userType', UserType.Admin),
          adt('userType', UserType.Government)
        ])
      }
    })),

    attachments: immutable(await Attachments.init({
      existingAttachments: [],
      //TODO need to figure out how to set permissions for proposal attachments here
      newAttachmentMetadata: [
        adt('userType', UserType.Admin),
        adt('userType', UserType.Government)
      ]
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

    case 'organization':
      return updateComponentChild({
        state,
        childStatePath: ['organization'],
        childUpdate: Select.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('organization', value)
      });

    case 'toggleEvaluationCriteria':
      return [state.update('showEvaluationCriteria', v => !v)];

    case 'proposalText':
      return updateComponentChild({
        state,
        childStatePath: ['proposalText'],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('proposalText', value)
      });

    case 'additionalComments':
      return updateComponentChild({
        state,
        childStatePath: ['additionalComments'],
        childUpdate: RichMarkdownEditor.update,
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
  }
};

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

type Values = Omit<CWUProposalResource.CreateRequestBody, 'opportunity'>;

function getValues(state: State): Values | null {
  const proponentType = FormField.getValue(state.proponentType);
  if (!proponentType) { return null; }
  const proponent = proponentFor(proponentType, state);
  return {
    proponent,
    proposalText:       FormField.getValue(state.proposalText),
    additionalComments: FormField.getValue(state.additionalComments),
    attachments:        state.attachments.existingAttachments.map(({ id }) => id)
  };
}

export function isProponentTabValid(state: State): boolean {
  const proponentType = FormField.getValue(state.proponentType);
  if (!proponentType) { return false; }
  switch (proponentType) {
    case 'individual':
      return FormField.isValid(state.legalName) &&
             FormField.isValid(state.email)     &&
             FormField.isValid(state.phone)     &&
             FormField.isValid(state.street1)   &&
             FormField.isValid(state.street2)   &&
             FormField.isValid(state.city)      &&
             FormField.isValid(state.region)    &&
             FormField.isValid(state.mailCode)  &&
             FormField.isValid(state.country);
    case 'organization':
      return FormField.isValid(state.organization);
  }
}

export function isProposalTabValid(state: State): boolean {
  return FormField.isValid(state.proposalText) &&
         FormField.isValid(state.additionalComments);
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

interface Errors extends CWUProposalResource.CreateValidationErrors {
  proponentType?: string[];
}

function setErrors(state: Immutable<State>, errors?: Errors): Immutable<State> {
  const individualProponentErrors = errors && errors.proponent && errors.proponent.tag === 'individual' ? errors.proponent.value : {};
  const organizationErrors = errors && errors.proponent && errors.proponent.tag === 'organization' ? errors.proponent.value : [];
  return state
    .update('proposalText', s => FormField.setErrors(s, errors?.proposalText || []))
    .update('additionalComments', s => FormField.setErrors(s, errors?.additionalComments || []))
    .update('proponentType', s => FormField.setErrors(s, errors?.proponentType || []))
    .update('legalName', s => FormField.setErrors(s, individualProponentErrors.legalName || []))
    .update('email', s => FormField.setErrors(s, individualProponentErrors.email || []))
    .update('phone', s => FormField.setErrors(s, individualProponentErrors.phone || []))
    .update('street1', s => FormField.setErrors(s, individualProponentErrors.street1 || []))
    .update('street2', s => FormField.setErrors(s, individualProponentErrors.street2 || []))
    .update('city', s => FormField.setErrors(s, individualProponentErrors.city || []))
    .update('region', s => FormField.setErrors(s, individualProponentErrors.region || []))
    .update('mailCode', s => FormField.setErrors(s, individualProponentErrors.mailCode || []))
    .update('country', s => FormField.setErrors(s, individualProponentErrors.country || []))
    .update('organization', s => FormField.setErrors(s, organizationErrors));
}

export async function persist(state: Immutable<State>): Promise<Validation<[Immutable<State>, CWUProposalResource.CWUProposal], Immutable<State>>> {
  const formValues = getValues(state);

  if (!formValues) {
    return invalid(setErrors(state, {
      proponentType: ['Please select a proponent type.']
    }));
  }

  const newAttachments = Attachments.getNewAttachments(state.attachments);
  // Upload new attachments if necessary.
  if (newAttachments.length) {
    const result = await api.uploadFiles(newAttachments);
    switch (result.tag) {
      case 'valid':
        formValues.attachments = [
          ...formValues.attachments,
          ...(result.value.map(({ id }) => id))
        ];
        break;
      case 'invalid':
        return invalid(state.update('attachments', attachments => Attachments.setNewAttachmentErrors(attachments, result.value)));
      case 'unhandled':
        return invalid(state);
    }
  }

  const apiResult = await api.proposals.cwu.create({
    opportunity: state.opportunity.id,
    ...formValues
  });

  switch (apiResult.tag) {
    case 'valid':
      return valid([setErrors(state, {}), apiResult.value]);
    case 'unhandled':
    case 'invalid':
      return invalid(setErrors(state, apiResult.value));
  }
}

const IndividualProponent: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Row>
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
          label='Email Address'
          state={state.email}
          dispatch={mapComponentDispatch(dispatch, value => adt('email' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          placeholder='Phone Number'
          extraChildProps={{}}
          label='Phone Number'
          state={state.phone}
          dispatch={mapComponentDispatch(dispatch, value => adt('phone' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          placeholder='Street Address'
          required
          extraChildProps={{}}
          label='Street Address'
          state={state.street1}
          dispatch={mapComponentDispatch(dispatch, value => adt('street1' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          placeholder='Street Address'
          extraChildProps={{}}
          label='Street Address'
          state={state.street2}
          dispatch={mapComponentDispatch(dispatch, value => adt('street2' as const, value)) }
        />
      </Col>

      <Col md='7' xs='12'>
        <ShortText.view
          placeholder='City'
          required
          extraChildProps={{}}
          label='City'
          state={state.city}
          dispatch={mapComponentDispatch(dispatch, value => adt('city' as const, value)) }
        />
      </Col>

      <Col md='5' xs='12'>
        <ShortText.view
          placeholder='Province / State'
          required
          extraChildProps={{}}
          label='Province / State'
          state={state.region}
          dispatch={mapComponentDispatch(dispatch, value => adt('region' as const, value)) }
        />
      </Col>

      <Col md='5' xs='12'>
        <ShortText.view
          placeholder='Postal / ZIP Code'
          required
          extraChildProps={{}}
          label='Postal / ZIP Code'
          state={state.mailCode}
          dispatch={mapComponentDispatch(dispatch, value => adt('mailCode' as const, value)) }
        />
      </Col>

      <Col md='7' xs='12'>
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
  //TODO Add hint about creating an organization
  return (
    <Row>
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

const ProponentView: View<Props> = props => {
  const { state, dispatch, disabled } = props;
  const proponentType = FormField.getValue(state.proponentType);
  const activeView = (() => {
    switch (proponentType) {
      case 'individual':
        return (<IndividualProponent {...props} />);
      case 'organization':
        return (<OrganizationProponent {...props} />);
      default:
        return null;
    }
  })();

  return (
    <div>
      <Row>
        <Col xs='12'>
          <p className='mb-4'>
            Please select the type of proponent that will be submitting a
            proposal for the opportunity
          </p>
        </Col>
        <Col xs='12'>
          <ProponentTypeRadioGroup.view
            extraChildProps={{ inline: true }}
            className='mb-0'
            required
            disabled={disabled}
            state={state.proponentType}
            dispatch={mapComponentDispatch(dispatch, value => adt('proponentType' as const, value))} />
        </Col>
      </Row>

      {activeView
        ? (<div className='mt-5 pt-5 border-top'>
            <Row>
              <Col xs='12'>
                <p className='mb-4'>
                  Please provide the following details for the proponent that will
                  complete the work as outlined by the Acceptance Criteria of the
                  opportunity.
                </p>
              </Col>
            </Row>
            {activeView}
          </div>)
        : null}
    </div>
  );
};

const ProposalView: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Row>
      <Col xs='12'>
        <p className='mb-4'>
          Enter your proposal and any additional comments in the spaces provided
          below.  Be sure to address the Proposal Evaluation Criteria.
        </p>
      </Col>
      <Col xs='12'>
        <Alert color='blue-alt' fade={false} className='mb-4'>
          <Link color='inherit' className='font-weight-bold d-flex justify-content-between flex-nowrap align-items-center w-100' onClick={() => dispatch(adt('toggleEvaluationCriteria'))}>
            Proposal Evaluation Criteria
            <Icon name={state.showEvaluationCriteria ? 'chevron-up' : 'chevron-down'} className='o-75'/>
          </Link>
          {state.showEvaluationCriteria
            ? (<Markdown source={state.opportunity.evaluationCriteria} className='mt-3' openLinksInNewTabs />)
            : null}
        </Alert>
      </Col>
      <Col xs='12'>
        <RichMarkdownEditor.view
          required
          extraChildProps={{}}
          style={{ height: '60vh', minHeight: '400px' }}
          label='Proposal'
          state={state.proposalText}
          dispatch={mapComponentDispatch(dispatch, value => adt('proposalText' as const, value))} />
      </Col>
      <Col xs='12'>
        <RichMarkdownEditor.view
          extraChildProps={{}}
          style={{ height: '300px' }}
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
          Upload any supporting material for your proposal here. Attachments must be smaller than 10MB.
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
      <div className='sticky bg-white'>
        <div className='d-flex mb-5' style={{ overflowX: 'auto' }}>
          <Nav tabs className='flex-grow-1 flex-nowrap bg-white'>
            <TabLink {...props} tab='Proponent' />
            <TabLink {...props} tab='Proposal' />
            <TabLink {...props} tab='Attachments' />
          </Nav>
        </div>
      </div>
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
