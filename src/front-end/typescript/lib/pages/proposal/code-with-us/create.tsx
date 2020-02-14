import { getContextualActionsValid, makePageMetadata, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import * as Form from 'lib/pages/proposal/code-with-us/form';
import React from 'react';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

export type State = Validation<Immutable<ValidState>, null>;

export interface ValidState {
  opportunityId: Id;
  form: Form.State;
}

type InnerMsg
  = ADT<'form', Form.Msg>
  | ADT<'publish'>
  | ADT<'saveDraft'>
  ;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = {
  opportunityId: string;
};

async function defaultState(opportunityId: Id) {

  return {
    opportunityId,
    form: await Form.init({opportunityId})
  };
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor, UserType.Government, UserType.Admin], // TODO(Jesse): Which users should be here?
  async success(params) {
    return valid(immutable(
      await defaultState(params.routeParams.opportunityId)
    ));
  },
  async fail(params) {
    return invalid(immutable(
      await defaultState(params.routeParams.opportunityId)
    ));
  }
});

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {

    case 'publish':
      return [
        state,
        async (state, dispatch) => {
          await Form.persist(state.form);
          return state;
        }
      ];

    case 'form':
      return updateComponentChild({
        state,
        childStatePath: ['form'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('form', value)
      });

    default:
      return [state];
  }
});

const view: ComponentView<State, Msg> = viewValid((params) => {
  const state = params.state;
  const dispatch = params.dispatch;
  return (
    <div>
      <Form.view
        state={immutable(state.form)}
        dispatch={mapComponentDispatch(dispatch, value => adt('form' as const, value))}
        disabled={false}
      />
    </div>
  );
});

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
  },

  getContextualActions: getContextualActionsValid( ({state, dispatch}) => {
    const isPublishLoading   = false; // state.publishLoading > 0;
    const isSaveDraftLoading = false; // state.saveDraftLoading > 0;
    const isLoading          = false; // isPublishLoading || isSaveDraftLoading;
    const isValid            = true; // Form.isValid(state.form);
    return adt('links', [
      {
        children: 'Publish',
        symbol_: leftPlacement(iconLinkSymbol('bullhorn')),
        button: true,
        loading: isPublishLoading,
        disabled: isLoading || !isValid,
        color: 'primary',
        onClick: () => dispatch(adt('publish'))
      },
      {
        children: 'Save Draft',
        symbol_: leftPlacement(iconLinkSymbol('save')),
        loading: isSaveDraftLoading,
        disabled: isLoading,
        button: true,
        color: 'success',
        onClick: () => dispatch(adt('saveDraft'))
      },
      {
        children: 'Cancel',
        color: 'white',
        disabled: isLoading,
        dest: routeDest(adt('opportunities', null))
      }
    ]);
  })

};
