import { AsyncWithState, makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, PageContextualActions, replaceRoute, toast, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab';
import * as Form from 'front-end/lib/pages/opportunity/sprint-with-us/lib/components/form';
import * as toasts from 'front-end/lib/pages/opportunity/sprint-with-us/lib/toasts';
import EditTabHeader from 'front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount, formatDate } from 'shared/lib';
import { canAddAddendumToSWUOpportunity, canSWUOpportunityDetailsBeEdited, isSWUOpportunityPublic, SWUOpportunity, SWUOpportunityStatus, UpdateValidationErrors } from 'shared/lib/resources/opportunity/sprint-with-us';
import { isAdmin, User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

type ModalId
  = 'publish'
  | 'submit'
  | 'publishChanges'
  | 'submitChanges'
  | 'saveChangesAndPublish'
  | 'saveChangesAndSubmit'
  | 'delete'
  | 'cancel'
  | 'suspend';

export interface State extends Tab.Params {
  showModal: ModalId | null;
  startEditingLoading: number;
  saveChangesLoading: number;
  saveChangesAndUpdateStatusLoading: number;
  updateStatusLoading: number;
  deleteLoading: number;
  isEditing: boolean;
  form: Immutable<Form.State>;
}

type UpdateStatus
  = SWUOpportunityStatus.UnderReview
  | SWUOpportunityStatus.Published
  | SWUOpportunityStatus.Canceled
  | SWUOpportunityStatus.Suspended;

export type InnerMsg
  = ADT<'form', Form.Msg>
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'startEditing'>
  | ADT<'cancelEditing'>
  | ADT<'saveChanges'>
  | ADT<'saveChangesAndPublish'>
  | ADT<'saveChangesAndSubmit'>
  | ADT<'updateStatus', UpdateStatus>
  | ADT<'delete'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

async function initForm(opportunity: SWUOpportunity, viewerUser: User, activeTab?: Form.TabId): Promise<Immutable<Form.State>> {
  return immutable(await Form.init({
    opportunity,
    viewerUser,
    activeTab,
    showAddendaTab: canAddAddendumToSWUOpportunity(opportunity),
    canRemoveExistingAttachments: canSWUOpportunityDetailsBeEdited(opportunity, isAdmin(viewerUser))
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
  form: await initForm(params.opportunity, params.viewerUser)
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

async function saveChanges(state: Immutable<State>, onValid?: AsyncWithState<State, [SWUOpportunity]>, onInvalid?: AsyncWithState<State>): Promise<Immutable<State>> {
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

async function updateStatus(state: Immutable<State>, newStatus: UpdateStatus, onValid?: AsyncWithState<State, [SWUOpportunity]>, onInvalid?: AsyncWithState<State, [UpdateValidationErrors?]>): Promise<Immutable<State>> {
  const updateAction = (() => {
    switch (newStatus) {
      case SWUOpportunityStatus.UnderReview: return 'submitForReview';
      case SWUOpportunityStatus.Published: return 'publish';
      case SWUOpportunityStatus.Suspended: return 'suspend';
      case SWUOpportunityStatus.Canceled: return 'cancel';
    }
  })();
  const result = await api.opportunities.swu.update(state.opportunity.id, adt(updateAction, ''));
  switch (result.tag) {
    case 'valid':
      state = state
        .set('opportunity', result.value)
        .set('form', await initForm(result.value, state.viewerUser, Form.getActiveTab(state.form)));
      return onValid ? await onValid(state, result.value) : state;
    case 'invalid':
    case 'unhandled':
      return onInvalid ? await onInvalid(state, result.value) : state;
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
    case 'startEditing':
      return [
        startStartEditingLoading(state),
        async (state, dispatch) => {
          state = stopStartEditingLoading(state);
          const result = await api.opportunities.swu.readOne(state.opportunity.id);
          if (api.isValid(result)) {
            return state
              .set('isEditing', true)
              .set('form', await initForm(result.value, state.viewerUser, Form.getActiveTab(state.form)));
          } else {
            dispatch(toast(adt('error', toasts.startedEditing.error)));
            return state;
          }
        }
      ];
    case 'cancelEditing':
      return [
        state,
        async state => {
          return state
            .set('isEditing', false)
            .set('form', await initForm(state.opportunity, state.viewerUser, Form.getActiveTab(state.form)));
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
              dispatch(toast(adt('success', isSWUOpportunityPublic(state1.opportunity) ? toasts.changesPublished.success : toasts.changesSaved.success)));
              return state1;
            },
            async state1 => {
              dispatch(toast(adt('error', isSWUOpportunityPublic(state1.opportunity) ? toasts.changesPublished.error : toasts.changesSaved.error)));
              return state1;
            }
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
            state1 => updateStatus(state1, SWUOpportunityStatus.Published,
              async state2 => {
                dispatch(toast(adt('success', toasts.published.success(state.opportunity.id))));
                return state2;
              },
              async state2 => {
                dispatch(toast(adt('error', toasts.published.error)));
                return state2;
              }
            ),
            async state1 => {
              dispatch(toast(adt('error', toasts.published.error)));
              return state1;
            }
          );
          return state;
        }
      ];
    case 'saveChangesAndSubmit':
      state = state.set('showModal', null);
      return [
        startSaveChangesAndUpdateStatusLoading(state),
        async (state, dispatch) => {
          state = stopSaveChangesAndUpdateStatusLoading(state);
          return await saveChanges(
            state,
            state1 => updateStatus(state1, SWUOpportunityStatus.UnderReview,
              async state2 => {
                dispatch(toast(adt('success', toasts.statusChanged.success(SWUOpportunityStatus.UnderReview))));
                return state2;
              },
              async state2 => {
                dispatch(toast(adt('error', toasts.statusChanged.error(SWUOpportunityStatus.UnderReview))));
                return state2;
              }
            ),
            async state1 => {
              dispatch(toast(adt('error', toasts.statusChanged.error(SWUOpportunityStatus.UnderReview))));
              return state1;
            }
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
          const isPublish = msg.value === SWUOpportunityStatus.Published;
          return await updateStatus(
            state,
            msg.value,
            async (state1, opportunity) => {
              if (isPublish) {
                dispatch(toast(adt('success', toasts.published.success(opportunity.id))));
              } else {
                dispatch(toast(adt('success', toasts.statusChanged.success(opportunity.status))));
              }
              return state1;
            },
            async (state1) => {
              if (isPublish) {
                dispatch(toast(adt('error', toasts.published.error)));
              } else {
                dispatch(toast(adt('error', toasts.statusChanged.error(msg.value))));
              }
              return state1;
            }
          );
        }
      ];
    case 'delete':
      state = state.set('showModal', null);
      return [
        startDeleteLoading(state),
        async (state, dispatch) => {
          const result = await api.opportunities.swu.delete(state.opportunity.id);
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
  if (opportunity.status === SWUOpportunityStatus.Draft) { return null; }
  const reportCards: ReportCard[] = [
    {
      icon: 'alarm-clock',
      name: 'Proposals Due',
      value: formatDate(opportunity.proposalDeadline)
    },
    {
      icon: 'binoculars',
      name: 'Total Views',
      value: formatAmount(reporting?.numViews || 0)
    },
    {
      icon: 'eye',
      name: 'Watching',
      value: formatAmount(reporting?.numWatchers || 0)
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
      warnings: state.opportunity.status === SWUOpportunityStatus.Draft && !Form.isValid(state.form)
        ? [{ text: `This opportunity is a draft. Please select "Edit" from the Actions dropdown to complete and ${isAdmin(state.viewerUser) ? 'publish' : 'submit'} this opportunity.` }]
        : []
    };
  },

  getModal: state => {
    switch (state.showModal) {
      case 'publish':
      case 'saveChangesAndPublish':
        return {
          title: 'Publish Sprint With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Publish Opportunity',
              icon: 'bullhorn',
              color: 'primary',
              button: true,
              msg: state.showModal === 'publish'
                ? adt('updateStatus', SWUOpportunityStatus.Published) as Msg
                : adt('saveChangesAndPublish')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to publish this opportunity? Once published, all subscribers will be notified.'
        };
      case 'submit':
      case 'saveChangesAndSubmit':
        return {
          title: 'Submit Opportunity for Review?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Submit for Review',
              icon: 'paper-plane',
              color: 'primary',
              button: true,
              msg: state.showModal === 'submit' ? adt('updateStatus', SWUOpportunityStatus.UnderReview) as Msg : adt('saveChangesAndSubmit')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to submit this Sprint With Us opportunity for review? Once submitted, an administrator will review it and may reach out to you to request changes before publishing it.'
        };
      case 'publishChanges':
        return {
          title: 'Publish Changes to Sprint With Us Opportunity?',
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
      case 'submitChanges':
        return {
          title: 'Submit Changes for Review?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Submit Changes',
              icon: 'paper-plane',
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
          body: () => 'Are you sure you want to submit your changes to this Sprint With Us opportunity for review? Once submitted, an administrator will review it and may reach out to you to request changes before publishing it.'
        };
      case 'suspend':
        return {
          title: 'Suspend Sprint With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Suspend Opportunity',
              icon: 'pause-circle',
              color: 'warning',
              button: true,
              msg: adt('updateStatus', SWUOpportunityStatus.Suspended) as Msg
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
          title: 'Delete Sprint With Us Opportunity?',
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
          title: 'Cancel Sprint With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Cancel Opportunity',
              icon: 'minus-circle',
              color: 'danger',
              button: true,
              msg: adt('updateStatus', SWUOpportunityStatus.Canceled) as Msg
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
    const isValid = () => Form.isValid(state.form);
    const viewerIsAdmin = isAdmin(state.viewerUser);
    const isPublic = isSWUOpportunityPublic(opp);
    const isDraft = opp.status === SWUOpportunityStatus.Draft;
    const isUnderReview = opp.status === SWUOpportunityStatus.UnderReview;
    // Show relevant actions when the user is editing the opportunity.
    if (state.isEditing) {
      return adt('links', (() => {
        const links = [];
        if (!isPublic && viewerIsAdmin) {
          // Allow admins to publish changes directly after editing a non-public opp.
          links.push({
            children: 'Publish',
            symbol_: leftPlacement(iconLinkSymbol('bullhorn')),
            button: true,
            loading: isSaveChangesAndUpdateStatusLoading,
            disabled: isSaveChangesAndUpdateStatusLoading || !isValid(),
            color: 'primary',
            onClick: () => dispatch(adt('showModal', 'saveChangesAndPublish' as const))
          });
        } else if (isDraft && !viewerIsAdmin) {
          // Allow non-admin opp owners to submit changes directly to admins
          // when editing a draft opp.
          links.push({
            children: 'Submit for Review',
            symbol_: leftPlacement(iconLinkSymbol('paper-plane')),
            button: true,
            loading: isSaveChangesAndUpdateStatusLoading,
            disabled: isSaveChangesAndUpdateStatusLoading || !isValid(),
            color: 'primary',
            onClick: () => dispatch(adt('showModal', 'saveChangesAndSubmit' as const))
          });
        }
        if (viewerIsAdmin) {
          // Show the save button for admins.
          links.push({
            children: isSWUOpportunityPublic(opp) ? 'Publish Changes' : 'Save Changes',
            disabled: isSaveChangesLoading || (() => {
              if (isDraft) {
                // No validation required, always possible to save a draft.
                return false;
              } else {
                return !isValid();
              }
            })(),
            onClick: () => dispatch(isSWUOpportunityPublic(opp) ? adt('showModal', 'publishChanges' as const) : adt('saveChanges')),
            button: true,
            loading: isSaveChangesLoading,
            symbol_: leftPlacement(iconLinkSymbol(isSWUOpportunityPublic(opp) ? 'bullhorn' : 'save')),
            color: isSWUOpportunityPublic(opp) ? 'primary' : 'success'
          });
        } else if (!viewerIsAdmin && (isDraft || isUnderReview)) {
          // Show a save/submit button for non-admins only when the opp is a draft or under review.
          links.push({
            children: isUnderReview ? 'Submit Changes' : 'Save Changes',
            disabled: isSaveChangesLoading || (() => {
              if (isDraft) {
                // No validation required, always possible to save a draft.
                return false;
              } else {
                return !isValid();
              }
            })(),
            onClick: () => dispatch(isUnderReview ? adt('showModal', 'submitChanges' as const) : adt('saveChanges')),
            button: true,
            loading: isSaveChangesLoading,
            symbol_: leftPlacement(iconLinkSymbol(isUnderReview ? 'paper-plane' : 'save')),
            color: isUnderReview ? 'primary' : 'success'
          });
        }
        // Add cancel link.
        links.push({
          children: 'Cancel',
          disabled: isLoading,
          onClick: () => dispatch(adt('cancelEditing')),
          color: 'white'
        });
        return links;
      })()) as PageContextualActions; //TypeScript type inference not good enough here
    }
    // Show actions when the user is not editing the opportunity.
    switch (opp.status) {
      case SWUOpportunityStatus.Draft:
        return adt('dropdown', {
          text: 'Actions',
          loading: isLoading,
          linkGroups: [
            {
              links: [
                {
                  children: viewerIsAdmin ? 'Publish' : 'Submit for Review',
                  disabled: !isValid(),
                  symbol_: leftPlacement(iconLinkSymbol(viewerIsAdmin ? 'bullhorn' : 'paper-plane')),
                  onClick: () => dispatch(adt('showModal', viewerIsAdmin ? 'publish' : 'submit') as Msg)
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

      case SWUOpportunityStatus.UnderReview:
        if (viewerIsAdmin) {
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
                    onClick: () => dispatch(adt('showModal', 'publish') as Msg)
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
        } else {
          return adt('links', [
            {
              children: 'Edit',
              symbol_: leftPlacement(iconLinkSymbol('edit')),
              onClick: () => dispatch(adt('startEditing')),
              button: true,
              color: 'primary'
            }
          ]);
        }
      case SWUOpportunityStatus.Published:
        if (!viewerIsAdmin) { return null; }
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
      case SWUOpportunityStatus.Suspended:
        if (!viewerIsAdmin) { return null; }
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
      case SWUOpportunityStatus.EvaluationTeamQuestions:
      case SWUOpportunityStatus.EvaluationCodeChallenge:
      case SWUOpportunityStatus.EvaluationTeamScenario:
        if (!viewerIsAdmin) { return null; }
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
      case SWUOpportunityStatus.Awarded:
      case SWUOpportunityStatus.Canceled:
        if (!viewerIsAdmin) { return null; }
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
