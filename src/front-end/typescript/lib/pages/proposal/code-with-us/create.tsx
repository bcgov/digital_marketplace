import { makePageMetadata } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import * as Radio from 'front-end/lib/components/form-field/radio';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { Col, Nav, NavItem, NavLink, Row } from 'reactstrap';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import * as opportunityValidation from 'shared/lib/validation/opportunity';

type TabValues = 'Proponent' | 'Proposal' | 'Attachments';

export interface State {
  activeTab: TabValues;

  // Proponent Tab
  proponentTypeIndividual: Immutable<Radio.State>;
  proponentTypeOrganization: Immutable<Radio.State>;

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
  | ADT<'proponentTypeIndividual', Radio.Msg>
  | ADT<'proponentTypeOrganization', Radio.Msg>

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

    // @radio-option
    proponentTypeIndividual: immutable(await Radio.init({
      errors: [],
      child: {
        value: false,
        id: 'proposal-proponent-type-individual'
      }
    })),

    // @radio-option
    proponentTypeOrganization: immutable(await Radio.init({
      errors: [],
      child: {
        value: false,
        id: 'proposal-proponent-type-organization'
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

    case 'proponentTypeIndividual':
      return updateComponentChild({
        state,
        childStatePath: ['proponentTypeIndividual'],
        childUpdate: Radio.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('proponentTypeIndividual', value)
      });

    case 'proponentTypeOrganization':
      return updateComponentChild({
        state,
        childStatePath: ['proponentTypeOrganization'],
        childUpdate: Radio.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('proponentTypeOrganization', value)
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

const ProponentView: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Row>
      <Col xs='12'>
        <p>
          Please select the type of proponent that will be submitting a
          proposal for the opportunity
        </p>
      </Col>

      {
        <Col xs='12'>
          <Radio.view
            extraChildProps={{ name: 'proponent-type' }}
            state={state.proponentTypeIndividual}
            dispatch={mapComponentDispatch(dispatch, value => adt('proponentTypeIndividual' as const, value))} />
        </Col>
      }

      {
        <Col xs='12'>
          <Radio.view
            extraChildProps={{ name: 'proponent-type' }}
            state={state.proponentTypeOrganization}
            dispatch={mapComponentDispatch(dispatch, value => adt('proponentTypeOrganization' as const, value))} />
        </Col>
      }

    </Row>
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
