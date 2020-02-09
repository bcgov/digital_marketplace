import { getContextualActionsValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as Form from 'front-end/lib/pages/opportunity/lib/components/code-with-us-form';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { CWUOpportunityStatus } from 'shared/lib/resources/code-with-us';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  publishLoading: number;
  saveDraftLoading: number;
  form: Immutable<Form.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'publish'>
  | ADT<'saveDraft'>
  | ADT<'opportunityForm', Form.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Government, UserType.Admin],
  async success() {
    return valid(immutable({
      publishLoading: 0,
      saveDraftLoading: 0,
      form: immutable(await Form.init(null))
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
    case 'saveDraft':
      const isPublish = msg.tag === 'publish';
      return [
        isPublish ? startPublishLoading(state) : startSaveDraftLoading(state),
        async (state, dispatch) => {
          state = isPublish ? stopPublishLoading(state) : stopSaveDraftLoading(state);
          const result = await Form.persist(state.form, adt('create', isPublish ? CWUOpportunityStatus.Published : CWUOpportunityStatus.Draft));
          switch (result.tag) {
            case 'valid':
              //TODO redirect
              return state.set('form', result.value[0]);
            case 'invalid':
              state = state.set('form', result.value);
              //TODO set error alert.
              return state;
          }
        }
      ];

    case 'opportunityForm':
      return updateComponentChild({
        state,
        childStatePath: ['form'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('opportunityForm', value)
      });

    default:
      return [state];
  }
});

const view: ComponentView<State,  Msg> = viewValid(({ state, dispatch }) => {
  const isPublishLoading = state.publishLoading > 0;
  const isSaveDraftLoading = state.saveDraftLoading > 0;
  const isDisabled = isSaveDraftLoading || isPublishLoading;
  return (
    <div className='d-flex flex-column h-100 justify-content-between'>
      <Form.view
        state={state.form}
        dispatch={mapComponentDispatch(dispatch, value => adt('opportunityForm' as const, value))}
        disabled={isDisabled}
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
      getDescription: () => 'Introductory text placeholder. Can provide brief instructions on how to create and manage an opportunity (e.g. save draft verion).',
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
    const isValid = Form.isValid(state.form);
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
