import { getContextualActionsValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as Form from 'front-end/lib/pages/opportunity/lib/components/code-with-us-form';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  publishLoading: number;
  saveDraftLoading: number;
  formState: Immutable<Form.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'publish'>
  | ADT<'saveDraft'>
  | ADT<'opportunityForm', Form.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor, UserType.Government, UserType.Admin], // TODO(Jesse): Which users should be here?
  async success() {
    return valid(immutable({
      publishLoading: 0,
      saveDraftLoading: 0,
      formState: immutable(await Form.defaultState())
    }));
  },
  async fail() {
    return invalid(null);
  }
});

const startPublishLoading = makeStartLoading<ValidState>('publishLoading');
const stopPublishLoading = makeStopLoading<ValidState>('publishLoading');
const startSaveDraftLoading = makeStartLoading<ValidState>('saveDraftLoading');
const stopSaveDraftLoading = makeStopLoading<ValidState>('saveDraftLoading');

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'publish':
      return [
        startPublishLoading(state),
        async (state, dispatch) => {
          state = stopPublishLoading(state);
          const result = await Form.persist(state.formState, adt('publish'));
          switch (result.tag) {
            case 'valid':
            case 'invalid':
              return state;
          }
        }
      ];

    case 'saveDraft':
      return [
        startSaveDraftLoading(state),
        async (state, dispatch) => {
          return stopSaveDraftLoading(state);
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
});

const view: ComponentView<State,  Msg> = viewValid(({ state, dispatch }) => {
  return (
    <div className='d-flex flex-column h-100 justify-content-between'>
      <Form.component.view
        state={state.formState}
        dispatch={mapComponentDispatch(dispatch, value => adt('opportunityForm' as const, value))}
      />
    </div>
  );
});

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
  getContextualActions: getContextualActionsValid(({ state, dispatch }) => {
    const isPublishLoading = state.publishLoading > 0;
    const isSaveDraftLoading = state.saveDraftLoading > 0;
    const isLoading = isPublishLoading || isSaveDraftLoading;
    const isValid = Form.isValid(state.formState);
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
        disabled: isLoading
      }
    ]);
  }),
  getMetadata() {
    return makePageMetadata('Create Opportunity');
  }
};
