import { APP_TERMS_CONTENT_ID } from 'front-end/config';
import { getContextualActionsValid, getMetadataValid, getModalValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, ValidatedState, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import * as router from 'front-end/lib/app/router';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Form from 'front-end/lib/pages/content/lib/components/form';
import DateMetadata from 'front-end/lib/views/date-metadata';
import DescriptionList from 'front-end/lib/views/description-list';
import Link, { iconLinkSymbol, leftPlacement, Props as LinkProps, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { COPY } from 'shared/config';
import { Content } from 'shared/lib/resources/content';
import { UserType } from 'shared/lib/resources/user';
import { ADT, adt } from 'shared/lib/types';
import { invalid, valid } from 'shared/lib/validation';

type ModalId = 'save' | 'notifyNewTerms' | 'delete';

interface ValidState {
  startEditingLoading: number;
  notifyNewUsersLoading: number;
  deleteLoading: number;
  saveLoading: number;
  showModal: ModalId | null;
  isEditing: boolean;
  showNotifyNewTerms: boolean;
  form: Immutable<Form.State>;
  content: Content;
}

export type State = ValidatedState<ValidState>;

type InnerMsg
  = ADT<'form', Form.Msg>
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'startEditing'>
  | ADT<'stopEditing'>
  | ADT<'save'>
  | ADT<'notifyNewTerms'>
  | ADT<'delete'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = string; //slug

export const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType<RouteParams, State, Msg>({
  userType: [UserType.Admin],
  async success({ routePath, routeParams, shared, dispatch }) {
    const result = await api.content.readOne(routeParams);
    if (!api.isValid(result)) {
      dispatch(replaceRoute(adt('notFound' as const, {
        path: routePath
      })));
      return invalid(null);
    }
    const content = result.value;
    return valid(immutable({
      startEditingLoading: 0,
      notifyNewUsersLoading: 0,
      deleteLoading: 0,
      saveLoading: 0,
      showModal: null,
      isEditing: false,
      showNotifyNewTerms: content.slug === APP_TERMS_CONTENT_ID,
      form: immutable(await Form.init({ content })),
      content
    }));
  },
  async fail({ dispatch, routePath }) {
    dispatch(replaceRoute(adt('notFound' as const, {
      path: routePath
    })));
    return invalid(null);
  }
});

const startStartEditingLoading = makeStartLoading<ValidState>('startEditingLoading');
const stopStartEditingLoading = makeStopLoading<ValidState>('startEditingLoading');
const startNotifyNewUsersLoading = makeStartLoading<ValidState>('notifyNewUsersLoading');
const stopNotifyNewUsersLoading = makeStopLoading<ValidState>('notifyNewUsersLoading');
const startDeleteLoading = makeStartLoading<ValidState>('deleteLoading');
const stopDeleteLoading = makeStopLoading<ValidState>('deleteLoading');
const startSaveLoading = makeStartLoading<ValidState>('saveLoading');
const stopSaveLoading = makeStopLoading<ValidState>('saveLoading');

async function resetForm(state: Immutable<ValidState>, content: Content): Promise<Immutable<ValidState>> {
  return state.merge({
    content,
    form: immutable(await Form.init({
      content
    }))
  });
}

export const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'form':
      return updateComponentChild({
        state,
        childStatePath: ['form'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('form', value)
      });
    case 'showModal':
      return [state.set('showModal', msg.value)];
    case 'hideModal':
      return [state.set('showModal', null)];
    case 'startEditing':
      return [
        startStartEditingLoading(state),
        async (state, dispatch) => {
          state = stopStartEditingLoading(state);
          const result = await api.content.readOne(state.content.slug);
          if (api.isValid(result)) {
            state = await resetForm(state, result.value);
            state = state.set('isEditing', true);
          }
          return state;
        }
      ];
    case 'stopEditing':
      return [
        state,
        async (state, dispatch) => {
          return (await resetForm(state, state.content)).merge({
            showModal: null,
            isEditing: false
          });
        }
      ];
    case 'save':
      return [
        startSaveLoading(state).set('showModal', null),
        async (state, dispatch) => {
          state = stopSaveLoading(state);
          const values = Form.getValues(state.form);
          //Use the old slug to reference the content.
          const result = await api.content.update(state.content.id, values);
          switch (result.tag) {
            case 'valid':
              //TODO toast
              router.replaceState(adt('contentEdit', result.value.slug));
              return (await resetForm(state, result.value)).set('isEditing', false);
            case 'invalid':
              //TODO toast
              return state.update('form', f => Form.setErrors(f, result.value));
            case 'unhandled':
              return state;
          }
        }
      ];
    case 'notifyNewTerms':
      return [
        startNotifyNewUsersLoading(state).set('showModal', null),
        async (state, dispatch) => {
          state = stopNotifyNewUsersLoading(state);
          const result = await api.emailNotifications.create(adt('updateTerms'));
          if (api.isValid(result)) {
            //TODO toast
          } else {
            //TODO toast
          }
          return state;
        }
      ];
    case 'delete':
      return [
        startDeleteLoading(state).set('showModal', null),
        async (state, dispatch) => {
          const result = await api.content.delete(state.content.id);
          if (api.isValid(result)) {
            dispatch(replaceRoute(adt('contentList', null) as Route));
            //TODO toast
            return state;
          } else {
            //TODO toast
            return stopDeleteLoading(state);
          }
        }
      ];
    default:
      return [state];
  }
});

const DEFAULT_USER_NAME = 'System';

export const view: ComponentView<State, Msg> = viewValid(({ state, dispatch }) => {
  const content = state.content;
  const dates = [
    {
      tag: 'dateAndTime' as const,
      date: content.createdAt,
      label: 'Published'
    },
    {
      tag: 'dateAndTime' as const,
      date: content.updatedAt,
      label: 'Updated'
    }
  ];
  const items = [
    {
      name: 'Published By',
      children: content.createdBy ? (<Link newTab dest={routeDest(adt('userProfile', { userId: content.createdBy.id }))}>{content.createdBy.name}</Link>) : DEFAULT_USER_NAME
    },
    {
      name: 'Updated By',
      children: content.updatedBy ? (<Link newTab dest={routeDest(adt('userProfile', { userId: content.updatedBy.id }))}>{content.updatedBy.name}</Link>) : DEFAULT_USER_NAME
    }
  ];
  const disabled = !state.isEditing || state.startEditingLoading > 0 || state.saveLoading > 0;
  return (
    <div>
      <Row>
        <Col xs='12' className='mb-5'>
          <Link className='h1 mb-4' newTab dest={routeDest(adt('contentView', state.content.slug))}>{state.content.title}</Link>
          <DateMetadata dates={dates} />
        </Col>
      </Row>
      <div className='mb-5 pb-5 border-bottom'>
        <Row>
          <Col xs='12'>
            <DescriptionList items={items} />
          </Col>
        </Row>
      </div>
      <Form.view disabled={disabled} state={state.form} dispatch={mapComponentDispatch(dispatch, msg => adt('form' as const, msg))} />
    </div>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata: getMetadataValid(state => {
    return makePageMetadata(state.content.title);
  }, makePageMetadata()),
  getContextualActions: getContextualActionsValid(({ state, dispatch }) => {
    const content = state.content;
    if (state.isEditing) {
      const isSaveLoading = state.saveLoading > 0;
      const disabled = isSaveLoading;
      return adt('links', [
        {
          children: 'Publish Changes',
          onClick: () => dispatch(adt('showModal', 'save') as Msg),
          button: true,
          loading: isSaveLoading,
          disabled,
          symbol_: leftPlacement(iconLinkSymbol('bullhorn')),
          color: 'primary'
        },
        {
          children: 'Cancel',
          color: 'c-nav-fg-alt',
          onClick: () => dispatch(adt('stopEditing') as Msg)

        }
      ]);
    } else if (!state.isEditing && state.showNotifyNewTerms) {
      const isStartEditingLoading = state.startEditingLoading > 0;
      const isNotifyNewUsersLoading = state.notifyNewUsersLoading > 0;
      const isDeleteLoading = state.deleteLoading > 0;
      const isLoading = isStartEditingLoading || isNotifyNewUsersLoading || isDeleteLoading;
      return adt('dropdown', {
        text: 'Actions',
        loading: isLoading,
        linkGroups: [
          {
            links: [
              {
                children: 'Edit',
                onClick: () => dispatch(adt('startEditing')),
                symbol_: leftPlacement(iconLinkSymbol('edit'))
              },
              {
                children: 'Notify Vendors',
                onClick: () => dispatch(adt('showModal', 'notifyNewTerms') as Msg),
                symbol_: leftPlacement(iconLinkSymbol('bell'))
              }
            ]
          },
          ...(content.fixed
            ? []
            : [{
                links: [{
                  children: 'Delete',
                  symbol_: leftPlacement(iconLinkSymbol('trash')),
                  onClick: () => dispatch(adt('showModal', 'delete') as Msg)
                }]
              }])
        ]
      });
    } else { //!state.isEditing && !state.showNotifyNewTerms
      const isStartEditingLoading = state.startEditingLoading > 0;
      const isDeleteLoading = state.deleteLoading > 0;
      const disabled = isStartEditingLoading || isDeleteLoading;
      return adt('links', [
        {
          children: 'Edit',
          onClick: () => dispatch(adt('startEditing')),
          button: true,
          loading: isStartEditingLoading,
          disabled,
          symbol_: leftPlacement(iconLinkSymbol('edit')),
          color: 'primary'
        },
        ...(content.fixed
          ? []
          : [{
              children: 'Delete',
              color: 'c-nav-fg-alt',
              button: true,
              outline: true,
              loading: isDeleteLoading,
              disabled,
              symbol_: leftPlacement(iconLinkSymbol('trash')),
              onClick: () => dispatch(adt('showModal', 'delete') as Msg)
            } as LinkProps])
      ]);
    }
  }),
  getModal: getModalValid<ValidState, Msg>(state => {
    switch (state.showModal) {
      case 'save':
        return {
          title: 'Publish Changes?',
          body: () => 'Are you sure you want to publish your changes to this page? Once published, they will be visible to all users who navigate to this page\'s URL.',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Publish Changes',
              icon: 'bullhorn',
              color: 'primary',
              msg: adt('save'),
              button: true
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
      case 'notifyNewTerms':
        return {
          title: 'Notify vendors of updated terms?',
          body: () => `Are you sure you want to notify all vendors of updated ${COPY.appTermsTitle}? Vendors will receive a notification email, and will be required to accept the new terms before continuing to submit proposals to opportunities.`,
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Notify Vendors',
              icon: 'bell',
              color: 'warning',
              msg: adt('notifyNewTerms'),
              button: true
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
      case 'delete':
        return {
          title: 'Delete page?',
          body: () => 'Are you sure you want to delete this page? It will no longer be accessible to users if you do.',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Delete Page',
              icon: 'trash',
              color: 'danger',
              msg: adt('delete'),
              button: true
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
      case null:
        return null;
    }
  })
};
