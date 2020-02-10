import { getAlertsValid, getContextualActionsValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, newRoute, PageComponent, PageInit, replaceRoute, Update, updateComponentChild } from 'front-end/lib/framework';
import * as Form from 'front-end/lib/pages/opportunity/lib/components/code-with-us-form';
import { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { CWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  publishLoading: number;
  saveDraftLoading: number;
  showErrorAlert: 'publish' | 'save' | null;
  form: Immutable<Form.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'dismissErrorAlert'>
  | ADT<'publish'>
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
      showErrorAlert: null,
      form: immutable(await Form.init(null))
    }));
  },
  async fail({ dispatch }) {
    dispatch(replaceRoute(adt('notice', adt('notFound' as const))));
    return invalid(null);
  }
});

const startPublishLoading = makeStartLoading<ValidState>('publishLoading');
const stopPublishLoading = makeStopLoading<ValidState>('publishLoading');
const startSaveDraftLoading = makeStartLoading<ValidState>('saveDraftLoading');
const stopSaveDraftLoading = makeStopLoading<ValidState>('saveDraftLoading');

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'dismissErrorAlert':
      return [state.set('showErrorAlert', null)];
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
              dispatch(newRoute(adt('opportunityCwuEdit', {
                id: result.value[1].id
              })));
              return state.set('form', result.value[0]);
            case 'invalid':
              return state
                .set('showErrorAlert', isPublish ? 'publish' : 'save')
                .set('form', result.value);
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
        disabled: isLoading,
        dest: routeDest(adt('opportunities', null))
      }
    ]);
  }),
  getAlerts: getAlertsValid(state => ({
    ...emptyPageAlerts(),
    errors: state.showErrorAlert
    ? [{
        text: `We were unable to ${state.showErrorAlert} your opportunity. Please fix the errors in the form below and try again.`,
        dismissMsg: adt('dismissErrorAlert')
      }]
      : []
  })),
  getMetadata() {
    return makePageMetadata('Create Opportunity');
  }
};
