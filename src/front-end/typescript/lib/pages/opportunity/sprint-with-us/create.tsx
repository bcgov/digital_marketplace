import { getContextualActionsValid, getModalValid, makePageMetadata, makeStartLoading, makeStopLoading, sidebarValid, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, newRoute, PageComponent, PageInit, replaceRoute, toast, Update, updateComponentChild } from 'front-end/lib/framework';
import * as Form from 'front-end/lib/pages/opportunity/sprint-with-us/lib/components/form';
import * as toasts from 'front-end/lib/pages/opportunity/sprint-with-us/lib/toasts';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { FORMATTED_MAX_BUDGET, SWUOpportunityStatus } from 'shared/lib/resources/opportunity/sprint-with-us';
import { isAdmin, User, UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

type SWUCreateSubmitStatus
  = SWUOpportunityStatus.Published
  | SWUOpportunityStatus.UnderReview;

type ModalId
  = ADT<'publish', SWUCreateSubmitStatus>
  | ADT<'cancel'>;

interface ValidState {
  showModal: ModalId | null;
  publishLoading: number;
  saveDraftLoading: number;
  viewerUser: User;
  form: Immutable<Form.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'publish', SWUCreateSubmitStatus>
  | ADT<'saveDraft'>
  | ADT<'form', Form.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType<RouteParams, State, Msg>({
  userType: [UserType.Government, UserType.Admin],
  async success({ shared }) {
    return valid(immutable({
      showModal: null,
      publishLoading: 0,
      saveDraftLoading: 0,
      viewerUser: shared.sessionUser,
      form: immutable(await Form.init({
        canRemoveExistingAttachments: true,
        viewerUser: shared.sessionUser
      }))
    }));
  },
  async fail({ routePath, dispatch }) {
    dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
    return invalid(null);
  }
});

const startPublishLoading = makeStartLoading<ValidState>('publishLoading');
const stopPublishLoading = makeStopLoading<ValidState>('publishLoading');
const startSaveDraftLoading = makeStartLoading<ValidState>('saveDraftLoading');
const stopSaveDraftLoading = makeStopLoading<ValidState>('saveDraftLoading');

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'showModal':
      return [state.set('showModal', msg.value)];

    case 'hideModal':
      return [state.set('showModal', null)];

    case 'publish':
      state = state.set('showModal', null);
      return [
        startPublishLoading(state),
        async (state, dispatch) => {
          const result = await Form.persist(state.form, adt('create', msg.value));
          const isPublish = msg.value === SWUOpportunityStatus.Published;
          switch (result.tag) {
            case 'valid':
              const opportunityId = result.value[1].id;
              dispatch(newRoute(adt('opportunitySWUEdit', {
                opportunityId,
                tab: 'summary'
              })) as Msg);
              if (isPublish) {
                dispatch(toast(adt('success', toasts.published.success(opportunityId))));
              } else {
                dispatch(toast(adt('success', toasts.statusChanged.success(msg.value))));
              }
              return state.set('form', result.value[0]);
            case 'invalid':
              if (isPublish) {
                dispatch(toast(adt('error', toasts.published.error)));
              } else {
                dispatch(toast(adt('error', toasts.statusChanged.error(msg.value))));
              }
              return stopPublishLoading(state);
          }
          return state;
        }
      ];

    case 'saveDraft':
      return [
        startSaveDraftLoading(state),
        async (state, dispatch) => {
          const result = await Form.persist(state.form, adt('create', SWUOpportunityStatus.Draft as const));
          switch (result.tag) {
            case 'valid':
              dispatch(newRoute(adt('opportunitySWUEdit', {
                opportunityId: result.value[1].id,
                tab: 'opportunity'
              })) as Msg);
              dispatch(toast(adt('success', toasts.draftCreated.success)));
              return state.set('form', result.value[0]);
            case 'invalid':
              dispatch(toast(adt('error', toasts.draftCreated.error)));
              return stopSaveDraftLoading(state);
          }
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

const view: ComponentView<State,  Msg> = viewValid(({ state, dispatch }) => {
  const isPublishLoading = state.publishLoading > 0;
  const isSaveDraftLoading = state.saveDraftLoading > 0;
  const isDisabled = isSaveDraftLoading || isPublishLoading;
  return (
    <Form.view
      state={state.form}
      dispatch={mapComponentDispatch(dispatch, value => adt('form' as const, value))}
      disabled={isDisabled} />
  );
});

export const component: PageComponent<RouteParams,  SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: sidebarValid({
    size: 'large',
    color: 'c-sidebar-instructional-bg',
    view: makeInstructionalSidebar<ValidState,  Msg>({
      getTitle: () => 'Create a Sprint With Us Opportunity',
      getDescription: state => (
        <div>
          <p><em>Sprint With Us</em> opportunities are used to procure an Agile product development team for your digital service at a variable cost of up to {FORMATTED_MAX_BUDGET}.</p>
          <p className='mb-0'>Use the form provided to create your <em>Sprint With Us</em> opportunity. You can either save a draft of your opportunity to complete the form at a later time, or you can complete the form now to {isAdmin(state.viewerUser) ? 'publish your opportunity immediately' : 'submit your opportunity for review to the Digital Marketplace\'s administrators'}.</p>
        </div>
      ),
      getFooter: () => (
        <span>
          Need help? <Link newTab dest={routeDest(adt('contentView', 'sprint-with-us-opportunity-guide'))}>Read the guide</Link> to learn how to create and manage a <em>Sprint With Us</em> opportunity.
        </span>
      )
    })
  }),
  getContextualActions: getContextualActionsValid(({ state, dispatch }) => {
    const isPublishLoading = state.publishLoading > 0;
    const isSaveDraftLoading = state.saveDraftLoading > 0;
    const isLoading = isPublishLoading || isSaveDraftLoading;
    const isValid = Form.isValid(state.form);
    const isViewerAdmin = isAdmin(state.viewerUser);
    return adt('links', [
      {
        children: isViewerAdmin ? 'Publish' : 'Submit for Review',
        symbol_: leftPlacement(iconLinkSymbol(isViewerAdmin ? 'bullhorn' : 'paper-plane')),
        button: true,
        loading: isPublishLoading,
        disabled: isLoading || !isValid,
        color: 'primary',
        onClick: () => dispatch(adt('showModal', adt('publish', isViewerAdmin ? SWUOpportunityStatus.Published : SWUOpportunityStatus.UnderReview)) as Msg)
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
        color: 'c-nav-fg-alt',
        disabled: isLoading,
        onClick: () => dispatch(adt('showModal', adt('cancel')) as Msg)
      }
    ]);
  }),
  getModal: getModalValid<ValidState, Msg>(state => {
    if (!state.showModal) { return null; }
    switch (state.showModal.tag) {
      case 'publish': {
        const publishStatus = state.showModal.value;
        return {
          title: publishStatus === SWUOpportunityStatus.Published
            ? 'Publish Sprint With Us Opportunity?'
            : 'Submit Opportunity for Review?',
          body: () => publishStatus === SWUOpportunityStatus.Published
            ? 'Are you sure you want to publish this opportunity? Once published, all subscribed users will be notified.'
            : 'Are you sure you want to submit this Sprint With Us opportunity for review? Once submitted, an administrator will review it and may reach out to you to request changes before publishing it.',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: publishStatus === SWUOpportunityStatus.Published
                ? 'Publish Opportunity'
                : 'Submit for Review',
              icon: publishStatus === SWUOpportunityStatus.Published ? 'bullhorn' : 'paper-plane',
              color: 'primary',
              msg: adt('publish', publishStatus),
              button: true
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
      }
      case 'cancel':
        return {
          title: 'Cancel New Sprint With Us Opportunity?',
          body: () => 'Are you sure you want to cancel? Any information you may have entered will be lost if you do so.',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Yes, I want to cancel',
              color: 'danger',
              msg: newRoute(adt('opportunities' as const, null)),
              button: true
            },
            {
              text: 'Go Back',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
    }
  }),
  getMetadata() {
    return makePageMetadata('Create a Sprint With Us Opportunity');
  }
};
