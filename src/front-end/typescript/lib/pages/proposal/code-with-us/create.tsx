import { makePageMetadata } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
// import * as FormField from 'front-end/lib/components/form-field';
import * as ShortText from 'front-end/lib/components/form-field/long-text';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild, View } from 'front-end/lib/framework';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { Col, Nav, NavItem, NavLink, Row } from 'reactstrap';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import * as opportunityValidation from 'shared/lib/validation/opportunity';

type TabValues = 'Proponent' | 'Proposal' | 'Attachments';

type ProponentType = 'Individual' | 'Organization' | null;

export interface State {
  activeTab: TabValues;

  // Proponent Tab
  proponentIsIndividual: ProponentType;
    // Individual
    name: Immutable<ShortText.State>;
    email: Immutable<ShortText.State>;
    phone: Immutable<ShortText.State>;
    address: Immutable<ShortText.State>;
    address2: Immutable<ShortText.State>;
    city: Immutable<ShortText.State>;
    province: Immutable<ShortText.State>;
    postal: Immutable<ShortText.State>;
    country: Immutable<ShortText.State>;
    // Organziation
    orgId: Id;

  // Proposal Tab
  proposal: Immutable<LongText.State>;
  additionalComments: Immutable<LongText.State>;

  // Attachments tab
  // TODO(Jesse): Do attachments @file-attachments
  // attachments: File[];
}

type InnerMsg
  = ADT<'updateActiveTab',   TabValues>

  // Proponent Tab
  // TODO(Jesse): Implement radio option @radio-option
  | ADT<'proponentIsIndividual', ProponentType>

  // Individual Proponent
  | ADT<'name', ShortText.Msg>
  | ADT<'email', ShortText.Msg>
  | ADT<'phone', ShortText.Msg>
  | ADT<'address', ShortText.Msg>
  | ADT<'address2', ShortText.Msg>
  | ADT<'city', ShortText.Msg>
  | ADT<'province', ShortText.Msg>
  | ADT<'postal', ShortText.Msg>
  | ADT<'country', ShortText.Msg>

  // Proposal Tab
  | ADT<'proposal',           LongText.Msg>
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
    proponentIsIndividual: null,
    orgId: '',

    // Individual
    name: immutable(await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'opportunity-individual-name'
      }
    })),

    email: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'opportunity-individual-email'
      }
    })),

    phone: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'opportunity-individual-phone'
      }
    })),

    address: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'opportunity-individual-address'
      }
    })),

    address2: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'opportunity-individual-address2'
      }
    })),

    city: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'opportunity-individual-city'
      }
    })),

    province: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'opportunity-individual-province'
      }
    })),

    postal: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'opportunity-individual-postal'
      }
    })),

    country: immutable( await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'opportunity-individual-country'
      }
    })),

    proposal: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'proposal-teaser'
      }
    })),

    additionalComments: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        value: '',
        id: 'proposal-teaser'
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

    case 'updateActiveTab':
      return [state.set('activeTab', msg.value)];

    case 'proponentIsIndividual':
      return [state.set('proponentIsIndividual', msg.value)];

    case 'name':
      return updateComponentChild({
        state,
        childStatePath: ['name'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('name', value)
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

    case 'address':
      return updateComponentChild({
        state,
        childStatePath: ['address'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('address', value)
      });

    case 'address2':
      return updateComponentChild({
        state,
        childStatePath: ['address2'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('address2', value)
      });

    case 'city':
      return updateComponentChild({
        state,
        childStatePath: ['city'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('city', value)
      });

    case 'province':
      return updateComponentChild({
        state,
        childStatePath: ['province'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('province', value)
      });

    case 'postal':
      return updateComponentChild({
        state,
        childStatePath: ['postal'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('postal', value)
      });

    case 'country':
      return updateComponentChild({
        state,
        childStatePath: ['country'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('country', value)
      });

    case 'proposal':
      return updateComponentChild({
        state,
        childStatePath: ['proposal'],
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('proposal', value)
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

interface RadioProps {
  id: string;
  label: string;
  checked: boolean;
  onClick: () => void;
}

const Radio: View<RadioProps> = (props) => {
  return (
    <div
      id={props.id}
      onClick={ (evt) => { props.onClick(); } }
    >
      <span>{props.label}</span>
    </div>
  );
};

const IndividualProponent: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Name'
          state={state.name}
          dispatch={mapComponentDispatch(dispatch, value => adt('name' as const, value)) }
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
          state={state.address}
          dispatch={mapComponentDispatch(dispatch, value => adt('address' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Address'
          state={state.address2}
          dispatch={mapComponentDispatch(dispatch, value => adt('address2' as const, value)) }
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
          state={state.province}
          dispatch={mapComponentDispatch(dispatch, value => adt('province' as const, value)) }
        />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Postal'
          state={state.postal}
          dispatch={mapComponentDispatch(dispatch, value => adt('postal' as const, value)) }
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

  let activeView = <div>No Active view selected</div>;
  switch (state.proponentIsIndividual) {
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
            checked={state.proponentIsIndividual === 'Individual'}
            onClick={ () => { dispatch(adt('proponentIsIndividual' as const, 'Individual' as const)); } }
          />
        </Col>

        <Col xs='12'>
          <Radio
            id='proponenet-is-org'
            label='Organization'
            checked={state.proponentIsIndividual === 'Organization'}
            onClick={ () => { dispatch(adt('proponentIsIndividual' as const, 'Organization' as const)); } }
          />
        </Col>
      </Row>

      {
        activeView
      }
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
          state={state.proposal}
          dispatch={mapComponentDispatch(dispatch, value => adt('proposal' as const, value))} />
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
