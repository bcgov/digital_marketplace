// import { isAdmin } from 'shared/lib/resources/user'; //uncomment when ready to limit notes to admin
import { Route } from 'front-end/lib/app/types';
import * as History from 'front-end/lib/components/table/history';
import { ComponentViewProps, ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild, View, } from 'front-end/lib/framework';
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
import { invalid } from 'shared/lib/validation';
import {CWUOpportunityStatus, CWUOpportunityEvent} from 'shared/lib/resources/opportunity/code-with-us';

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

export function historyToHistoryTableRow(rawHistory){
  const convertHistoryItemToHistoryTableItem = status =>{
    switch (status) {
      case CWUOpportunityEvent.Edited:
        return {
          text: 'Note Added',
          color: undefined
        }
      case CWUOpportunityEvent.AddendumAdded:
        return {
          text: 'Addendum Added',
          color: undefined
        }
      case CWUOpportunityEvent.NoteAdded:
      return {
        text: 'Note Added',
        color: undefined
      }
      case CWUOpportunityStatus.Draft:
        return {
          text: 'Draft',
          color: 'secondary'
        }
      case CWUOpportunityStatus.Published:
        return {
          text: 'Published',
          color: 'success'
        }
      case CWUOpportunityStatus.Evaluation:
        return {
          text: 'Evaluation',
          color: 'warning'
        }
      case CWUOpportunityStatus.Awarded:
        return {
          text: 'Awarded',
          color: 'success'
        }
      case CWUOpportunityStatus.Suspended:
        return {
          text: 'Suspended',
          color: 'secondary'
        }
      case CWUOpportunityStatus.Canceled:
        return {
          text: 'Cancelled',
          color: 'danger'
        }
      //is the best way to handle? brianna
      default:
        return {
          text: null,
          color: undefined
        }
    }



  }

  return rawHistory
    .map(s => ({
      type: convertHistoryItemToHistoryTableItem(s.type.value),
      note: s.note,
      attachments: s.attachments,
      createdAt: s.createdAt,
      createdBy: s.createdBy || undefined
    }));
}

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    async publishNewNote(value) {
      const result = await api.opportunities.cwu.update(params.opportunity.id, adt('addNote', value));
      let outcome;
      switch (result.tag) {
        case 'valid':
          outcome = historyToHistoryTableRow(result.value.history)
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
      idNamespace: 'cwu-opportunity-history', //probably shouldn't hardcode this, brianna
      items: opportunityToHistoryItems(params.opportunity),
      viewerUser: params.viewerUser
    })),
    showModal: null,
    modalNote: immutable(await LongText.init({
      errors: [],
      // validate: contentValidation.validateSlug,
      child: {
        // type: 'text',
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


const sendNoteAttachmentsToDB = async function(state) {
  const newAttachments = Attachments.getNewAttachments(state.attachments);
  if (newAttachments.length) {
    // if valid, this adds the files to the files and fileBlobs tables
    const result = await api.uploadFiles(newAttachments);
    switch (result.tag) {
      case 'valid':
        return [...(result.value.map(({ id }) => id))];
        break;
      case 'invalid':
        return invalid(state.update('attachments', attachments => Attachments.setNewAttachmentErrors(attachments, result.value)));
      case 'unhandled':
        return invalid(state);
    }
  }
    return null
}

const createHistoryNote = async function(state){
  //send attachments to db
  const attachmentsBackFromDB = await sendNoteAttachmentsToDB(state);
  //send new note to db
  const notesBackFromDB = await state.publishNewNote({
    note: state.modalNote.child.value,
    attachments: attachmentsBackFromDB
  })

  state = state.setIn(['history','items'],notesBackFromDB).setIn(['modalNote', 'child','value'],'')
  return state;
}

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
        async (state) =>{
          return await createHistoryNote(state)
        }
      ]
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  // debugger;
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
                  extraChildProps={{style: { height: '125px' }}}
                  label='Notes'
                  required
                  state={state.modalNote}
                  dispatch={mapComponentDispatch(dispatch, value => adt('modalNote' as const, value))} />
              <AttachmentsView {...attachmentProps} />
              </div>

            );
          },
          actions: [
            {
              text: 'Submit Entry',
              button: true,
              disabled: state.modalNote.child.value.trim().length === 0,
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
    // if (!isAdmin(state.viewerUser)) { return null; } //uncomment to hide the button from all but admin
    // rewrite this for attachment loading
    // const isAddTeamMembersLoading = state.addTeamMembersLoading > 0;
    // const isRemoveTeamMemberLoading = !!state.removeTeamMemberLoading;
    // const isLoading = isAddTeamMembersLoading || isRemoveTeamMemberLoading;
    state; //to avoid TS errors about arguments not being used
    return adt('links', [{
      children: 'Add Entry',
      onClick: () => {
        dispatch(adt('showModal', adt('addNote')) as Msg)
      },
      button: true,
      // loading: isAddTeamMembersLoading,
      // disabled: isLoading,
      symbol_: leftPlacement(iconLinkSymbol('file-edit')),
      color: 'primary'
    }]);
  }
};
