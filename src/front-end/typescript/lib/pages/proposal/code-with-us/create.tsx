import { makePageMetadata } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Attachments from 'front-end/lib/components/attachments';
import * as FormField from 'front-end/lib/components/form-field';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentView, ComponentViewProps, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import Radio from 'front-end/lib/views/radio';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { Col, Nav, NavItem, NavLink, Row } from 'reactstrap';
import * as CWUProposalResource from 'shared/lib/resources/proposal/code-with-us';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';
import * as opportunityValidation from 'shared/lib/validation/opportunity';

type TabValues = 'Proponent' | 'Proposal' | 'Attachments';

type ProponentType = 'Individual' | 'Organization' | null;

export interface State {
  opportunityId: Id;
  activeTab: TabValues;

  // Proponent Tab
  proponentType: ProponentType;
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
    orgId: Id;

  // Proposal Tab
  proposalText: Immutable<LongText.State>;
  additionalComments: Immutable<LongText.State>;

  // Attachments tab
  attachments: Immutable<Attachments.State>;
}

type InnerMsg
  = ADT<'updateActiveTab',   TabValues>
  | ADT<'submit'>

  // Proponent Tab
  // TODO(Jesse): Implement radio option @radio-option
  | ADT<'proponentType', ProponentType>

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

  // Proposal Tab
  | ADT<'proposalText',           LongText.Msg>
  | ADT<'additionalComments', LongText.Msg>

  // Attachments tab
  | ADT<'attachments', Attachments.Msg>
  ;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = {
  opportunityId: string;
};

async function defaultState(opportunityId: Id) {
  return {
    opportunityId,

    activeTab: 'Proponent' as const,
    proponentType: null,
    orgId: '',

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
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor, UserType.Government, UserType.Admin], // TODO(Jesse): Which users should be here?
  async success(params) {
    return {
      ...(await defaultState(params.routeParams.opportunityId))
    };
  },
  async fail(params) {
    return {
      ...(await defaultState(params.routeParams.opportunityId))
    };
  }
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {

    case 'submit':
      return [
        state,
        async (state, dispatch) => {
          await persist(state);
          return state;
        }
      ];

    case 'updateActiveTab':
      return [state.set('activeTab', msg.value)];

    case 'proponentType':
      return [state.set('proponentType', msg.value)];

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

function proponentFor(typeTag: ProponentType, state: State): CWUProposalResource.CreateProponentRequestBody {
  switch (typeTag) {
    case 'Individual': {
      return ({
        tag: 'individual',
        value: {
          legalName:  FormField.getValue(state.legalName),
          email:      FormField.getValue(state.email),
          phone:      FormField.getValue(state.phone),
          street1:    FormField.getValue(state.street1),
          street2:    FormField.getValue(state.street2),
          city:       FormField.getValue(state.city),
          region:     FormField.getValue(state.region),
          mailCode:   FormField.getValue(state.mailCode),
          country:    FormField.getValue(state.country)
        }
      });
    }

    // TODO(Jesse): How do we prevent null from being passed to this function at
    // the type level?  ie: omit the default case here..
    case 'Organization':
    default:  {
      return {
        tag: 'organization' as const,
        value: state.orgId
      };
    }
  }

}

function getFormValues(state: State): Values {
  const proponent = proponentFor(state.proponentType, state);
  const result = {
    proposalText:        FormField.getValue(state.proposalText),
    additionalComments:  FormField.getValue(state.additionalComments),
    proponent,
    attachments: state.attachments.existingAttachments.map(({ id }) => id)
  };

  return result;
}

type Errors = CWUProposalResource.CreateValidationErrors;

// TODO(Jesse): Implement this
export function isValid(): boolean {
  return true;
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
        }
        case 'organization': {
          // TODO(Jesse): Have an acutal field for this
          // FormField.setErrors(state.organizationId, errors.proponent.value); }
        }
        case 'parseFailure': {
          // TODO: Hard fail case from the backend??  Cry?
        }
      }
    }

    if (errors.attachments) {
      // TODO(Jesse): What structrue do attachment errors take?
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

  const requestBody = requestBodyFromValues(state.opportunityId, formValues);
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
    <Row>
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
    <div>
      Organization
    </div>
  );
};

const ProponentView: ComponentView<State, Msg> = (params) => {
  const state = params.state;
  const dispatch = params.dispatch;

  let activeView;
  switch (state.proponentType) {
    case 'Individual': {
      activeView = <IndividualProponent {...params} /> ;
      break;
    }
    case 'Organization': {
      activeView = <OrganizationProponent {...params} /> ;
      break;
    }
  }

  return (
    <div>
      <Row>
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
        <LongText.view
          extraChildProps={{}}
          label='Proposal'
          state={state.proposalText}
          dispatch={mapComponentDispatch(dispatch, value => adt('proposalText' as const, value))} />
      </Col>

      <Col xs='12'>
        <LongText.view
          extraChildProps={{}}
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
function isActiveTab(state: State, activeTab: TabValues): boolean {
  const Result: boolean = state.activeTab === activeTab;
  return Result;
}

// @duplicated-tab-helper-functions
function renderTab(params: any, tabName: TabValues): JSX.Element {
  const state = params.state;
  const dispatch = params.dispatch;
  return (
    <NavItem>
      <NavLink active={isActiveTab(state, tabName)} onClick={() => {dispatch(adt('updateActiveTab', tabName)); }}> {tabName} </NavLink>
    </NavItem>
  );
}

const view: ComponentView<State, Msg> = (params) => {
  const state = params.state;
  const dispatch = params.dispatch;

  let activeView = <div>No Active view selected</div>;
  switch (state.activeTab) {
    case 'Proponent': {
      activeView = <ProponentView {...params} /> ;
      break;
    }
    case 'Proposal': {
      activeView = <ProposalView {...params} /> ;
      break;
    }
    case 'Attachments': {
      activeView = <AttachmentsView {...params} /> ;
      break;
    }
  }

  const saveButtonDisabled = true; // TODO(Jesse): How do we determine this?
  return (
    <div>
      <div>
        <Nav tabs className='mb-5'>
          {renderTab(params, 'Proponent')}
          {renderTab(params, 'Proposal')}
          {renderTab(params, 'Attachments')}
        </Nav>

        {activeView}
      </div>

      <div className='d-flex justify-content-between'>
        <div>

          <Link
            disabled={saveButtonDisabled}
            button
            color='secondary'
            symbol_={leftPlacement(iconLinkSymbol('cog'))}
          >
            Save Draft
          </Link>
        </div>

        <div>
          <Link
            button
            className='mr-1'
            symbol_={leftPlacement(iconLinkSymbol('cog'))}
          >
            Cancel
          </Link>

          <Link
            button
            className='mr-3'
            color='secondary'
            symbol_={leftPlacement(iconLinkSymbol('cog'))}
          >
            Prev
          </Link>

          <Link
            button
            color='primary'
            symbol_={leftPlacement(iconLinkSymbol('cog'))}
            onClick={() => dispatch(adt('submit')) }
          >
            Publish
          </Link>

        </div>
      </div>

    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: {
    size: 'large',
    color: 'blue-light',
    view: makeInstructionalSidebar<State, Msg>({
      getTitle: () => 'Create a Code With Us Proposal',
      getDescription: () => 'Intruductory text placeholder.  Can provide brief instructions on how to create and manage an opportunity (e.g. save draft verion).',
      getFooter: () => (
        <span>
          Need help? <a href='# TODO(Jesse): Where does this point?'>Read the guide</a> for creating and managing a CWU proposal
        </span>
      )
    })
  },
  getMetadata() {
    return makePageMetadata('Create Proposal');
  }
};
