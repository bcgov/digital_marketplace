import { isVendor } from 'shared/lib/resources/user';
import { Route } from 'front-end/lib/app/types';
import * as History from 'front-end/lib/components/table/history';
import { ComponentViewProps, ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild, View} from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import { opportunityToHistoryItems } from 'front-end/lib/pages/opportunity/code-with-us/lib';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';
import  { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import * as Attachments from 'front-end/lib/components/attachments'
import { Alert } from 'reactstrap';
import * as api from 'front-end/lib/http/api';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import { invalid, valid } from 'shared/lib/validation';
import {historyToHistoryTableRow,createHistoryNote, isNoteValid, isAttachmentValid, createAttachmentError, createNoteError } from 'front-end/lib/pages/opportunity/helpers'
import {MAX_NOTE_LENGTH, MAX_NOTE_ATTACHMENT_SIZE, SUPPORTED_NOTE_ATTACHMENT_FORMATS, SUPPORTED_NOTE_ATTACHMENT_EXTENSIONS} from 'shared/lib/resources/note'


// The history has only one type of modal, but I've done it the same way as the other modals (e.g. adding team members) for consistency.
type ModalId = ADT<'addNote'>

export interface State extends Tab.Params {
  history: Immutable<History.State>;
  showModal: ModalId | null;
  attachments: Immutable<Attachments.State>;
  modalNote: Immutable<LongText.State>;
}

export type InnerMsg
  = ADT<'history', History.Msg>
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'modalNote', LongText.Msg>
  | ADT<'attachments',        Attachments.Msg>
  | ADT<'addNote'>
  | ADT<'createHistoryNote'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    async publishNewNote(value) {
      const result = await api.opportunities.cwu.update(params.opportunity.id, adt('addNote', value));
      let outcome;
      switch (result.tag) {
        case 'valid':
          outcome = valid(historyToHistoryTableRow(result.value.history))
          break;
        case 'invalid':
          if (result.value.opportunity?.tag === 'addNote') {
            outcome = invalid(result.value.opportunity.value);
          }
          break;
      }
      return outcome || invalid(['Unable to add note due to a system error.']);
    },
    history: immutable(await History.init({
      idNamespace: 'cwu-opportunity-history',
      items: opportunityToHistoryItems(params.opportunity),
      viewerUser: params.viewerUser
    })),
    showModal: null,
    modalNote: immutable(await LongText.init({
      errors: [],
      child: {
        value: '',
        id: 'modal-note'
      }

    })),
    attachments: immutable(await Attachments.init({
      canRemoveExistingAttachments: true,
      existingAttachments:  [],
      newAttachmentMetadata: []
    }))
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'showModal':
      return [state.set('showModal', msg.value)];
    case 'hideModal': {
      return [state.set('showModal', null)];
    }
    case 'history':
      return updateComponentChild({
        state,
        childStatePath: ['history'],
        childUpdate: History.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'history', value })
      });
    case 'attachments':
      return updateComponentChild({
        state,
        childStatePath: ['attachments'],
        childUpdate: Attachments.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('attachments', value)
      });
    case 'modalNote':
      return updateComponentChild({
        state,
        childStatePath: ['modalNote'],
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('modalNote', value)
      });
      case 'createHistoryNote':
        return [state.set('showModal',null),
        async (state, dispatch) =>{
          return await createHistoryNote(state, dispatch)
        }
      ]
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      <EditTabHeader opportunity={state.opportunity} viewerUser={state.viewerUser} />
      <div className='mt-5 pt-5 border-top'>
        <Row>
          <Col xs='12'>
            <h3 className='mb-4'>History</h3>
            <History.view
              state={state.history}
              dispatch={mapComponentDispatch(dispatch, msg => adt('history' as const, msg))} />
          </Col>
        </Row>
      </div>
    </div>
  );
};

//props for the AttachmentsView component
interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

// @duplicated-attachments-view
const AttachmentsView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>
      <Col xs='12'>
        <Attachments.view
          dispatch={mapComponentDispatch(dispatch, msg => adt('attachments' as const, msg))}
          state={state.attachments}
          disabled={disabled}
          // className='mt-4'
          accept={SUPPORTED_NOTE_ATTACHMENT_EXTENSIONS}
          />
      </Col>
    </Row>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  getModal: state => {
    if (!state.showModal) { return null; }
    switch (state.showModal.tag) {
      case 'addNote': {
        return {
          title: 'Add Entry to Opportunity',
          onCloseMsg: adt('hideModal'),
          body: dispatch => {
          const attachmentProps = { state, dispatch, disabled: false }


            return (
              <div>
                <p>Provide a note or commentary below pertaining to the opportunity. You may also include any applicable attachments.</p>
                <Alert color='danger' style={{ whiteSpace: 'pre-line' }}><strong>Important! </strong>The notes and any attachments, if applicable, cannot be edited or deleted once submitted.
                </Alert>


                <LongText.view
                  extraChildProps={{style: {
                    height: '125px',
                    border: state.modalNote.child.value.length > MAX_NOTE_LENGTH ? '1px solid red' : ''
                  }}}
                  label='Notes'
                  required
                  state={state.modalNote}
                  dispatch={mapComponentDispatch(dispatch, value => adt('modalNote' as const, value))} />
                  {createNoteError(state, MAX_NOTE_LENGTH)}
              <AttachmentsView {...attachmentProps} />
                  {createAttachmentError(state, MAX_NOTE_ATTACHMENT_SIZE, SUPPORTED_NOTE_ATTACHMENT_FORMATS)}
              </div>

            );
          },
          actions: [
            {
              text: 'Submit Entry',
              button: true,
              disabled: !isNoteValid(state, MAX_NOTE_LENGTH) || !isAttachmentValid(state, MAX_NOTE_ATTACHMENT_SIZE, SUPPORTED_NOTE_ATTACHMENT_FORMATS),
              color: 'primary',
              icon: 'file-edit',
              msg: adt('createHistoryNote')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
      }
    }
  },
  getContextualActions: ({ state, dispatch }) => {
    if (isVendor(state.viewerUser)) { return null; }
    return adt('links', [{
      children: 'Add Entry',
      onClick: () => {
        dispatch(adt('showModal', adt('addNote')) as Msg)
      },
      button: true,
      symbol_: leftPlacement(iconLinkSymbol('file-edit')),
      color: 'primary'
    }]);
  }
};
