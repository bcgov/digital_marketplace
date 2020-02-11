import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import * as Form from 'front-end/lib/pages/opportunity/code-with-us/lib/components/form';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount } from 'shared/lib';
import { CWUOpportunity, CWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';
import { adt, ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  startEditingLoading: number;
  saveChangesLoading: number;
  publishLoading: number;
  deleteLoading: number;
  isEditing: boolean;
  form: Immutable<Form.State>;
}

export type InnerMsg
  = ADT<'form', Form.Msg>
  | ADT<'startEditing'>
  | ADT<'cancelEditing'>
  | ADT<'saveChanges'>
  | ADT<'publish'>
  | ADT<'delete'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

async function resetForm(state: Immutable<State>, opportunity: CWUOpportunity): Promise<Immutable<State>> {
  return state.set('form', immutable(await Form.init({ opportunity })));
}

const init: Init<Tab.Params, State> = async params => ({
  ...params,
  startEditingLoading: 0,
  saveChangesLoading: 0,
  publishLoading: 0,
  deleteLoading: 0,
  isEditing: false,
  form: immutable(await Form.init({
    opportunity: params.opportunity
  }))
});

const startStartEditingLoading = makeStartLoading<State>('startEditingLoading');
const stopStartEditingLoading = makeStopLoading<State>('startEditingLoading');
const startSaveChangesLoading = makeStartLoading<State>('saveChangesLoading');
const stopSaveChangesLoading = makeStopLoading<State>('saveChangesLoading');
const startPublishLoading = makeStartLoading<State>('publishLoading');
const stopPublishLoading = makeStopLoading<State>('publishLoading');
const startDeleteLoading = makeStartLoading<State>('deleteLoading');
const stopDeleteLoading = makeStopLoading<State>('deleteLoading');

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
    case 'startEditing':
      return [
        startStartEditingLoading(state),
        async state => {
          state = stopStartEditingLoading(state);
          const result = await api.opportunities.cwu.readOne(state.opportunity.id);
          if (api.isValid(result)) {
            state = await resetForm(state, result.value);
            return state.set('isEditing', true);
          } else {
            return state;
          }
        }
      ];
    case 'cancelEditing':
      return [
        state,
        async state => {
          return await resetForm(state.set('isEditing', false), state.opportunity);
        }
      ];
    case 'saveChanges':
      return [
        startSaveChangesLoading(state),
        async state => {
          state = stopSaveChangesLoading(state);
          return state;
        }
      ];
    case 'publish':
      return [
        startPublishLoading(state),
        async state => {
          state = stopPublishLoading(state);
          return state;
        }
      ];
    case 'delete':
      return [
        startDeleteLoading(state),
        async state => {
          state = stopDeleteLoading(state);
          return state;
        }
      ];
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = props => {
  const { state, dispatch } = props;
  const isStartEditingLoading = state.startEditingLoading > 0;
  const isSaveChangesLoading = state.saveChangesLoading > 0;
  const isPublishLoading = state.publishLoading > 0;
  const isDeleteLoading = state.deleteLoading > 0;
  const isLoading = isStartEditingLoading || isSaveChangesLoading || isPublishLoading || isDeleteLoading;
  const reportCards: ReportCard[] = [
    {
      icon: 'binoculars',
      name: 'Total Views',
      value: formatAmount(0) //TODO
    },
    {
      icon: 'eye',
      name: 'Watching',
      value: formatAmount(0) //TODO
    },
    {
      icon: 'comment-dollar',
      name: 'Proposals Rec\'d',
      value: formatAmount(0) //TODO
    }
  ];
  return (
    <div>
      <EditTabHeader opportunity={props.state.opportunity} />
      <Row className='mt-5'>
        <Col xs='12'>
          <ReportCardList reportCards={reportCards} />
        </Col>
      </Row>
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
  getContextualActions({ state, dispatch }) {
    const isStartEditingLoading = state.startEditingLoading > 0;
    const isSaveChangesLoading = state.saveChangesLoading > 0;
    const isPublishLoading = state.publishLoading > 0;
    const isDeleteLoading = state.deleteLoading > 0;
    const isLoading = isStartEditingLoading || isSaveChangesLoading || isPublishLoading || isDeleteLoading;
    const oppStatus = state.opportunity.status;
    const isDraft = oppStatus === CWUOpportunityStatus.Draft;
    if (state.isEditing) {
      return adt('links', [
        {
          children: (() => {
            switch (oppStatus) {
              case CWUOpportunityStatus.Draft: return 'Save Draft';
              case CWUOpportunityStatus.Published: return 'Publish Changes';
              default: return 'Save Changes';
            }
          })(),
          disabled: (() => {
            if (isDraft) {
              // No validation required, always possible to save a draft.
              return false;
            } else {
              return Form.isValid(state.form);
            }
          })(),
          onClick: () => dispatch(adt('saveChanges')),
          button: true,
          loading: isSaveChangesLoading,
          symbol_: leftPlacement(iconLinkSymbol((() => {
            switch (oppStatus) {
              case CWUOpportunityStatus.Published: return 'bullhorn';
              default: return 'save';
            }
          })())),
          color: (() => {
            switch (oppStatus) {
              case CWUOpportunityStatus.Draft: return 'success';
              default: return 'primary';
            }
          })()
        },
        {
          children: 'Cancel',
          disabled: isLoading,
          onClick: () => dispatch(adt('cancelEditing')),
          color: 'white'
        }
      ]);
    } else {
      return adt('dropdown', {
        text: 'Actions',
        loading: isLoading,
        linkGroups: [
          {
            links: [
              {
                children: 'Publish',
                symbol_: leftPlacement(iconLinkSymbol('bullhorn')),
                onClick: () => dispatch(adt('publish'))
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
                onClick: () => dispatch(adt('delete'))
              }
            ]
          }
        ]
      });
    }
  }
};
