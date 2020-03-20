import { AsyncWithState, makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, PageContextualActions, replaceRoute, toast, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import * as Form from 'front-end/lib/pages/opportunity/code-with-us/lib/components/form';
import * as toasts from 'front-end/lib/pages/opportunity/code-with-us/lib/toasts';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import { compact } from 'lodash';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount } from 'shared/lib';
import { canAddAddendumToCWUOpportunity, CWUOpportunity, CWUOpportunityStatus, isCWUOpportunityPublic, UpdateValidationErrors } from 'shared/lib/resources/opportunity/code-with-us';
import { adt, ADT } from 'shared/lib/types';

type ModalId = 'publish' | 'publishChanges' | 'saveChangesAndPublish' | 'delete' | 'cancel' | 'suspend';

export interface State extends Tab.Params {
  showModal: ModalId | null;
  startEditingLoading: number;
  saveChangesLoading: number;
  saveChangesAndUpdateStatusLoading: number;
  updateStatusLoading: number;
  deleteLoading: number;
  isEditing: boolean;
  errorAlerts: string[];
  form: Immutable<Form.State>;
}

type UpdateStatus = 'publish' | 'cancel' | 'suspend';

export type InnerMsg
  = ADT<'form', Form.Msg>
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'dismissErrorAlert', number>
  | ADT<'startEditing'>
  | ADT<'cancelEditing'>
  | ADT<'saveChanges'>
  | ADT<'saveChangesAndPublish'>
  | ADT<'updateStatus', UpdateStatus>
  | ADT<'delete'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

function addErrorAlert(state: Immutable<State>, text: string): Immutable<State> {
  return state.update('errorAlerts', alerts => alerts.concat(text));
}

function addErrorAlertsFromUpdate(state: Immutable<State>, errors: UpdateValidationErrors): Immutable<State> {
  if (!errors.opportunity) { return state; }
  switch (errors.opportunity.tag) {
    case 'publish':
    case 'suspend':
    case 'cancel':
      return errors.opportunity.value.reduce((state: Immutable<State>, error: string) => addErrorAlert(state, error), state);
    case 'edit':
    case 'addAddendum':
      return addErrorAlert(state, 'Your changes could not be saved. Please review the form below, fix any errors and try again.');
    case 'parseFailure':
      return addErrorAlert(state, 'Sorry, a system error has occurred. Please contact us to report this issue.');
  }
}

async function initForm(opportunity: CWUOpportunity, activeTab?: Form.TabId): Promise<Immutable<Form.State>> {
  return immutable(await Form.init({
    opportunity,
    activeTab,
    showAddendaTab: canAddAddendumToCWUOpportunity(opportunity)
  }));
}

const init: Init<Tab.Params, State> = async params => ({
  ...params,
  showModal: null,
  startEditingLoading: 0,
  saveChangesLoading: 0,
  saveChangesAndUpdateStatusLoading: 0,
  updateStatusLoading: 0,
  deleteLoading: 0,
  isEditing: false,
  errorAlerts: [],
  form: await initForm(params.opportunity)
});

const startStartEditingLoading = makeStartLoading<State>('startEditingLoading');
const stopStartEditingLoading = makeStopLoading<State>('startEditingLoading');
const startSaveChangesLoading = makeStartLoading<State>('saveChangesLoading');
const stopSaveChangesLoading = makeStopLoading<State>('saveChangesLoading');
const startSaveChangesAndUpdateStatusLoading = makeStartLoading<State>('saveChangesAndUpdateStatusLoading');
const stopSaveChangesAndUpdateStatusLoading = makeStopLoading<State>('saveChangesAndUpdateStatusLoading');
const startUpdateStatusLoading = makeStartLoading<State>('updateStatusLoading');
const stopUpdateStatusLoading = makeStopLoading<State>('updateStatusLoading');
const startDeleteLoading = makeStartLoading<State>('deleteLoading');
const stopDeleteLoading = makeStopLoading<State>('deleteLoading');

async function saveChanges(state: Immutable<State>, onValid?: AsyncWithState<State, [CWUOpportunity]>, onInvalid?: AsyncWithState<State>): Promise<Immutable<State>> {
  const result = await Form.persist(state.form, adt('update' as const));
  switch (result.tag) {
    case 'valid':
      state = state
        .set('form', result.value[0])
        .set('opportunity', result.value[1])
        .set('isEditing', false);
      return onValid ? await onValid(state, result.value[1]) : state;
    case 'invalid':
      state = state.set('form', result.value);
      return onInvalid ? await onInvalid(state) : state;
  }
}

async function updateStatus(state: Immutable<State>, newStatus: UpdateStatus, onValid?: AsyncWithState<State, [CWUOpportunity]>, onInvalid?: AsyncWithState<State, [UpdateValidationErrors?]>): Promise<Immutable<State>> {
  const result = await api.opportunities.cwu.update(state.opportunity.id, adt(newStatus, ''));
  switch (result.tag) {
    case 'valid':
      state = state
        .set('opportunity', result.value)
        .set('form', await initForm(result.value, Form.getActiveTab(state.form)));
      return onValid ? await onValid(state, result.value) : state;
    case 'invalid':
      return onInvalid ? await onInvalid(state, result.value) : state;
    case 'unhandled':
      return onInvalid ? await onInvalid(state) : state;
  }
}

const update: Update<State, Msg> = ({ state, msg }) => {
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
    case 'dismissErrorAlert':
      return [
        state.update('errorAlerts', alerts => alerts.filter((a, i) => i !== msg.value))
      ];
    case 'startEditing':
      return [
        startStartEditingLoading(state),
        async state => {
          state = stopStartEditingLoading(state);
          const result = await api.opportunities.cwu.readOne(state.opportunity.id);
          if (api.isValid(result)) {
            return state
              .set('isEditing', true)
              .set('form', await initForm(result.value, Form.getActiveTab(state.form)));
          } else {
            return addErrorAlert(state, 'This opportunity cannot currently be edited.');
          }
        }
      ];
    case 'cancelEditing':
      return [
        state,
        async state => {
          return state
            .set('isEditing', false)
            .set('form', await initForm(state.opportunity, Form.getActiveTab(state.form)));
        }
      ];
    case 'saveChanges':
      state = state.set('showModal', null);
      return [
        startSaveChangesLoading(state),
        async (state, dispatch) => {
          state = stopSaveChangesLoading(state);
          return await saveChanges(
            state,
            async state1 => {
              dispatch(toast(adt('success', isCWUOpportunityPublic(state1.opportunity) ? toasts.changesPublished.success : toasts.changesSaved.success)));
              return state1;
            },
            async state1 => addErrorAlertsFromUpdate(state1, { opportunity: adt('edit', {}) })
          );
        }
      ];
    case 'saveChangesAndPublish':
      state = state.set('showModal', null);
      return [
        startSaveChangesAndUpdateStatusLoading(state),
        async (state, dispatch) => {
          state = stopSaveChangesAndUpdateStatusLoading(state);
          return await saveChanges(
            state,
            state1 => updateStatus(state1, 'publish',
              async state2 => {
                dispatch(toast(adt('success', toasts.changesPublished.success)));
                return state2;
              },
              async state2 => addErrorAlert(state2, 'Your changes were saved, but could not be published.')
            ),
            async state1 => addErrorAlertsFromUpdate(state1, { opportunity: adt('edit', {}) })
          );
          return state;
        }
      ];
    case 'updateStatus':
      state = state.set('showModal', null);
      return [
        startUpdateStatusLoading(state),
        async (state, dispatch) => {
          state = stopUpdateStatusLoading(state);
          return await updateStatus(
            state,
            msg.value,
            async (state1, opportunity) => {
              dispatch(toast(adt('success', toasts.statusChanged.success(opportunity.status))));
              return state1;
            },
            async (state1, errors) => errors ? addErrorAlertsFromUpdate(state1, errors) : state
          );
        }
      ];
    case 'delete':
      state = state.set('showModal', null);
      return [
        startDeleteLoading(state),
        async (state, dispatch) => {
          const result = await api.opportunities.cwu.delete(state.opportunity.id);
          switch (result.tag) {
            case 'valid':
              dispatch(replaceRoute(adt('opportunities' as const, null)));
              dispatch(toast(adt('success', toasts.deleted.success)));
              return state;
            default:
              dispatch(toast(adt('error', toasts.deleted.error)));
              return stopDeleteLoading(state);
          }
        }
      ];
    default:
      return [state];
  }
};

const Reporting: ComponentView<State, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  const reporting = opportunity.reporting;
  if (opportunity.status === CWUOpportunityStatus.Draft) { return null; }
  const reportCards: ReportCard[] = [
    {
      icon: 'binoculars',
      name: 'Total Views',
      value: formatAmount(reporting?.numViews || 0)
    },
    {
      icon: 'eye',
      name: 'Watching',
      value: formatAmount(reporting?.numWatchers || 0)
    },
    {
      icon: 'comment-dollar',
      name: 'Proposals',
      value: formatAmount(reporting?.numProposals || 0)
    }
  ];
  return (
    <Row className='mt-5'>
      <Col xs='12'>
        <ReportCardList reportCards={reportCards} />
      </Col>
    </Row>
  );
};

const view: ComponentView<State, Msg> = props => {
  const { state, dispatch } = props;
  const opportunity = state.opportunity;
  const viewerUser = state.viewerUser;
  const isStartEditingLoading = state.startEditingLoading > 0;
  const isSaveChangesLoading = state.saveChangesLoading > 0;
  const isUpdateStatusLoading = state.updateStatusLoading > 0;
  const isDeleteLoading = state.deleteLoading > 0;
  const isLoading = isStartEditingLoading || isSaveChangesLoading || isUpdateStatusLoading || isDeleteLoading;
  return (
    <div>
      <EditTabHeader opportunity={opportunity} viewerUser={viewerUser} />
      <Reporting {...props} />
      <Row className='mt-5'>
        <Col xs='12'>
          <Form.view
            disabled={!state.isEditing || isLoading}
            state={state.form}
            dispatch={mapComponentDispatch(dispatch, msg => adt('form' as const, msg))} />
          </Col>
      </Row>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,

  getAlerts(state) {
    return {
      warnings: state.opportunity.status === CWUOpportunityStatus.Draft && !Form.isValid(state.form)
        ? [{ text: 'Please edit, complete and save the form below in order to publish this opportunity.' }]
        : [],
      info: [],
      errors: state.errorAlerts.map((text, i) => ({
        text,
        dismissMsg: adt('dismissErrorAlert', i)
      }))
    };
  },

  getModal: state => {
    switch (state.showModal) {
      case 'publish':
        return {
          title: 'Publish Code With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Publish Opportunity',
              icon: 'bullhorn',
              color: 'primary',
              button: true,
              msg: adt('updateStatus', 'publish' as const)
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to publish this opportunity? Once published, all subscribers will be notified.'
        };
      case 'publishChanges':
        return {
          title: 'Publish Changes to Code With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Publish Changes',
              icon: 'bullhorn',
              color: 'primary',
              button: true,
              msg: adt('saveChanges') // This is the reason this is a different modal from 'saveChangesAndPublish'
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to publish your changes to this opportunity? Once published, all subscribers will be notified.'
        };
      case 'saveChangesAndPublish':
        return {
          title: 'Publish Changes to Code With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Publish Changes',
              icon: 'bullhorn',
              color: 'primary',
              button: true,
              msg: adt('saveChangesAndPublish')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to publish your changes to this opportunity? Once published, all subscribers will be notified.'
        };
      case 'suspend':
        return {
          title: 'Suspend Code With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Suspend Opportunity',
              icon: 'pause-circle',
              color: 'warning',
              button: true,
              msg: adt('updateStatus', 'suspend' as const)
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to suspend this opportunity? Once suspended, all subscribers and vendors with pending or submitted proposals will be notified.'
        };
      case 'delete':
        return {
          title: 'Delete Code With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Delete Opportunity',
              icon: 'trash',
              color: 'danger',
              button: true,
              msg: adt('delete')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to delete this opportunity? You will not be able to recover it once it has been deleted.'
        };
      case 'cancel':
        return {
          title: 'Cancel Code With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Cancel Opportunity',
              icon: 'minus-circle',
              color: 'danger',
              button: true,
              msg: adt('updateStatus', 'cancel' as const)
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to cancel this opportunity? Once cancelled, all subscribers and vendors with pending or submitted proposals will be notified.'
        };
      case null:
        return null;
    }
  },

  getContextualActions({ state, dispatch }) {
    const isStartEditingLoading = state.startEditingLoading > 0;
    const isSaveChangesLoading = state.saveChangesLoading > 0;
    const isSaveChangesAndUpdateStatusLoading = state.saveChangesAndUpdateStatusLoading > 0;
    const isUpdateStatusLoading = state.updateStatusLoading > 0;
    const isDeleteLoading = state.deleteLoading > 0;
    const isLoading = isStartEditingLoading || isSaveChangesLoading || isUpdateStatusLoading || isDeleteLoading;
    const opp = state.opportunity;
    const oppStatus = opp.status;
    const isValid = () => Form.isValid(state.form);
    if (state.isEditing) {
      return adt('links', compact([
        // Publish button
        !isCWUOpportunityPublic(opp)
          ? {
              children: 'Publish Changes',
              symbol_: leftPlacement(iconLinkSymbol('bullhorn')),
              button: true,
              loading: isSaveChangesAndUpdateStatusLoading,
              disabled: isSaveChangesAndUpdateStatusLoading || !isValid(),
              color: 'primary',
              onClick: () => dispatch(adt('showModal', 'saveChangesAndPublish' as const))
            }
          : null,
        // Save changes button
        {
          children: isCWUOpportunityPublic(opp) ? 'Publish Changes' : 'Save Changes',
          disabled: isSaveChangesLoading || (() => {
            if (oppStatus === CWUOpportunityStatus.Draft) {
              // No validation required, always possible to save a draft.
              return false;
            } else {
              return !isValid();
            }
          })(),
          onClick: () => dispatch(isCWUOpportunityPublic(opp) ? adt('showModal', 'publishChanges' as const) : adt('saveChanges')),
          button: true,
          loading: isSaveChangesLoading,
          symbol_: leftPlacement(iconLinkSymbol(isCWUOpportunityPublic(opp) ? 'bullhorn' : 'save')),
          color: isCWUOpportunityPublic(opp) ? 'primary' : 'success'
        },
        // Cancel link
        {
          children: 'Cancel',
          disabled: isLoading,
          onClick: () => dispatch(adt('cancelEditing')),
          color: 'white'
        }
      ])) as PageContextualActions; //TypeScript type inference not good enough here
    }
    switch (oppStatus) {
      case CWUOpportunityStatus.Draft:
        return adt('dropdown', {
          text: 'Actions',
          loading: isLoading,
          linkGroups: [
            {
              links: [
                {
                  children: 'Publish',
                  disabled: !isValid(),
                  symbol_: leftPlacement(iconLinkSymbol('bullhorn')),
                  onClick: () => dispatch(adt('showModal', 'publish' as const))
                },
                {
                  children: 'Edit',
                  symbol_: leftPlacement(iconLinkSymbol('edit')),
                  onClick: () => dispatch(adt('startEditing'))
                }
              ]
            },
            {
              links: [
                {
                  children: 'Delete',
                  symbol_: leftPlacement(iconLinkSymbol('trash')),
                  onClick: () => dispatch(adt('showModal', 'delete' as const))
                }
              ]
            }
          ]
        });
      case CWUOpportunityStatus.Published:
        return adt('dropdown', {
          text: 'Actions',
          loading: isLoading,
          linkGroups: [
            {
              links: [
                {
                  children: 'Edit',
                  symbol_: leftPlacement(iconLinkSymbol('edit')),
                  onClick: () => dispatch(adt('startEditing'))
                }
              ]
            },
            {
              links: [
                {
                  children: 'Suspend',
                  symbol_: leftPlacement(iconLinkSymbol('pause-circle')),
                  onClick: () => dispatch(adt('showModal', 'suspend' as const))
                },
                {
                  children: 'Cancel',
                  symbol_: leftPlacement(iconLinkSymbol('minus-circle')),
                  onClick: () => dispatch(adt('showModal', 'cancel' as const))
                }
              ]
            }
          ]
        });
      case CWUOpportunityStatus.Suspended:
        return adt('dropdown', {
          text: 'Actions',
          loading: isLoading,
          linkGroups: [
            {
              links: [
                {
                  children: 'Publish',
                  symbol_: leftPlacement(iconLinkSymbol('bullhorn')),
                  onClick: () => dispatch(adt('showModal', 'publish' as const))
                },
                {
                  children: 'Edit',
                  symbol_: leftPlacement(iconLinkSymbol('edit')),
                  onClick: () => dispatch(adt('startEditing'))
                }
              ]
            },
            {
              links: [
                {
                  children: 'Cancel',
                  symbol_: leftPlacement(iconLinkSymbol('minus-circle')),
                  onClick: () => dispatch(adt('showModal', 'cancel' as const))
                }
              ]
            }
          ]
        });
      case CWUOpportunityStatus.Evaluation:
        return adt('links', [
          {
            children: 'Edit',
            loading: isStartEditingLoading,
            symbol_: leftPlacement(iconLinkSymbol('edit')),
            onClick: () => dispatch(adt('startEditing')),
            button: true,
            color: 'primary'
          },
          {
            children: 'Cancel',
            symbol_: leftPlacement(iconLinkSymbol('minus-circle')),
            onClick: () => dispatch(adt('showModal', 'cancel' as const)),
            button: true,
            outline: true,
            color: 'white'
          }
        ]);
      case CWUOpportunityStatus.Awarded:
      case CWUOpportunityStatus.Canceled:
        return adt('links', [
          {
            children: 'Edit',
            loading: isStartEditingLoading,
            symbol_: leftPlacement(iconLinkSymbol('edit')),
            onClick: () => dispatch(adt('startEditing')),
            button: true,
            color: 'primary'
          }
        ]);
    }
  }
};
