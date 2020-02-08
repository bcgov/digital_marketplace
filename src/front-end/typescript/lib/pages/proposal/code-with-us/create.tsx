import { makePageMetadata } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as ShortText from 'front-end/lib/components/form-field/long-text';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
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
  // TODO(Jesse): Do attachments @file-attachments
  // attachments: File[];
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

  // Attachments Tab
  // @file-attachments
  ;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = {
  opportunityId: string;
};

async function defaultState() {
  return {
    activeTab: 'Proponent' as const,
    proponentType: null,
    orgId: '',

    // Individual
    legalName: immutable(await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: 'legalName',
        id: 'opportunity-individual-legalName'
      }
    })),

    email: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: 'email@thing.ding',
        id: 'opportunity-individual-email'
      }
    })),

    phone: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '9979989999',
        id: 'opportunity-individual-phone'
      }
    })),

    street1: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: 'addresss',
        id: 'opportunity-individual-street1'
      }
    })),

    street2: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: 'addresss21',
        id: 'opportunity-individual-street2'
      }
    })),

    city: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: 'city',
        id: 'opportunity-individual-city'
      }
    })),

    region: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: 'region',
        id: 'opportunity-individual-region'
      }
    })),

    mailCode: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: 'mailCode',
        id: 'opportunity-individual-mailCode'
      }
    })),

    country: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: 'country',
        id: 'opportunity-individual-country'
      }
    })),

    proposalText: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: 'proposalText',
        id: 'proposal-proposalText'
      }
    })),

    additionalComments: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: 'additional comments',
        id: 'proposal-additional-comments'
      }
    }))

  };
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor, UserType.Government, UserType.Admin], // TODO(Jesse): Which users should be here?
  async success() {
    return {
      ...(await defaultState())
    };
  },
  async fail() {
    return {
      ...(await defaultState())
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
    attachments: []
  };

  return result;
}

type Errors = CWUProposalResource.CreateValidationErrors;

function setErrors(state: State, errors?: Errors): void {
  // TODO(Jesse): Implement this
  return;
}

function requestBodyFromValues(opportunityId: Id, formValues: Values): CWUProposalResource.CreateRequestBody {
  return ({opportunity: opportunityId, ...formValues});
}

export async function persist(state: State): Promise<Validation<State, string[]>> {
  const opportunityId = '8fddb90e-d7fe-43bb-8234-6e58e856c259';
  const formValues = getFormValues(state);
  const requestBody = requestBodyFromValues(opportunityId, formValues);
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
    <div>
      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Name'
          state={state.legalName}
          dispatch={mapComponentDispatch(dispatch, value => adt('legalName' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Email'
          state={state.email}
          dispatch={mapComponentDispatch(dispatch, value => adt('email' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Phone'
          state={state.phone}
          dispatch={mapComponentDispatch(dispatch, value => adt('phone' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Address'
          state={state.street1}
          dispatch={mapComponentDispatch(dispatch, value => adt('street1' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Address'
          state={state.street2}
          dispatch={mapComponentDispatch(dispatch, value => adt('street2' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='City'
          state={state.city}
          dispatch={mapComponentDispatch(dispatch, value => adt('city' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Province'
          state={state.region}
          dispatch={mapComponentDispatch(dispatch, value => adt('region' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Mail Code'
          state={state.mailCode}
          dispatch={mapComponentDispatch(dispatch, value => adt('mailCode' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Country'
          state={state.country}
          dispatch={mapComponentDispatch(dispatch, value => adt('country' as const, value)) }
        />
      </Col>
    </div>
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
        </Col>

        <Col xs='12'>
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

// @duplicated-attachments-view
const AttachmentsView: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Row>
      <Col xs='12'>

        <p>
          Note(Jesse): Regarding the copy, I believe being exhaustive and
          explicit on which file formats are accepted is better than having an
          etc.
        </p>
        <p>
          Upload any supporting material for your proposal here. Accepted file
          formats are pdf, jpeg, jpg.
        </p>

        <Link
          button
          color='primary'
          symbol_={leftPlacement(iconLinkSymbol('cog'))}
        >
          Add Attachment
        </Link>

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
    <div className='d-flex flex-column h-100 justify-content-between'>
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
    color: 'light-blue',
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
