import { makePageMetadata } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as Form from 'front-end/lib/pages/opportunity/lib/components/code-with-us-form';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import * as CWUOpportunityResource from 'shared/lib/resources/code-with-us';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  formState: Immutable<Form.State>;
}

type InnerMsg
  = ADT<'submit', CWUOpportunityResource.CWUOpportunityStatus>
  | ADT<'opportunityForm', Form.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor, UserType.Government, UserType.Admin], // TODO(Jesse): Which users should be here?
  async success() {
    return {
      formState: immutable(await Form.defaultState())
    };
  },
  async fail() {
    return {
      formState: immutable(await Form.defaultState())
    };
  }
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'submit':
      return [
        state,
        async (state, dispatch) => {
          const result = await Form.persist(state.formState, msg.value);
          switch (result.tag) {
            case 'valid':
            case 'invalid':
              return state;
          }
        }
      ];

    case 'opportunityForm':
      return updateComponentChild({
        state,
        childStatePath: ['formState'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('opportunityForm', value)
      });

    default:
      return [state];
  }
};

const view: ComponentView<State,  Msg> = (params) => {
  const state = params.state;
  const dispatch = params.dispatch;

  const saveButtonDisabled = true; // TODO(Jesse): How do we determine this?
  return (
    <div className='d-flex flex-column h-100 justify-content-between'>

      <Form.component.view
        state={state.formState}
        dispatch={mapComponentDispatch(dispatch, value => adt('opportunityForm' as const, value))}
      />

      <div className='d-flex justify-content-between'>
        <div>
          <Link
            disabled={saveButtonDisabled}
            button
            color='secondary'
            symbol_={leftPlacement(iconLinkSymbol('cog'))}
            onClick={() => dispatch(adt('submit', 'DRAFT' as CWUOpportunityResource.CWUOpportunityStatus)) }  // TODO(Jesse): Why must we cast here?
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
            onClick={() => dispatch(adt('submit', 'PUBLISHED' as CWUOpportunityResource.CWUOpportunityStatus)) }  // TODO(Jesse): Why must we cast here?
          >
            Publish
          </Link>
        </div>
      </div>

    </div>
  );
};

export const component: PageComponent<RouteParams,  SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: {
    size: 'large',
    color: 'light-blue',
    view: makeInstructionalSidebar<State,  Msg>({
      getTitle: () => 'Create a Code With Us Opportunity',
      getDescription: () => 'Intruductory text placeholder.  Can provide brief instructions on how to create and manage an opportunity (e.g. save draft verion).',
      getFooter: () => (
        <span>
          Need help? <a href='# TODO(Jesse): Where does this point?'>Read the guide</a> for creating and managing a CWU opportunity
        </span>
      )
    })
  },
  getMetadata() {
    return makePageMetadata('Create Opportunity');
  }
};
