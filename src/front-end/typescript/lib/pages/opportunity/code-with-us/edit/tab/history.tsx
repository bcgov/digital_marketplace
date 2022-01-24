// import { isAdmin } from 'shared/lib/resources/user'; //uncomment when ready to limit notes to admin
import { Route } from 'front-end/lib/app/types';
import * as History from 'front-end/lib/components/table/history';
import { ComponentViewProps, ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import { opportunityToHistoryItems } from 'front-end/lib/pages/opportunity/code-with-us/lib';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';
import  { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import * as Attachments from 'front-end/lib/components/attachments'
import { Alert } from 'reactstrap';

import * as ShortText from 'front-end/lib/components/form-field/short-text';
// import * as FormField from 'front-end/lib/components/form-field';

// probably don't need this since there's only one kind of modal; but mimicking how it's done for the team member modals for now
type ModalId = ADT<'addAttachment'>

export interface State extends Tab.Params {
  history: Immutable<History.State>;
  showModal: ModalId | null;
  attachments: Immutable<Attachments.State>;
  modalNote: Immutable<ShortText.State>;
}

export type InnerMsg
  = ADT<'history', History.Msg>
  // Attachments tab
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'modalNote', ShortText.Msg>
  | ADT<'noop'>
  | ADT<'attachments',        Attachments.Msg>
  | ADT<'addAttachment'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;


const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    history: immutable(await History.init({
      idNamespace: 'cwu-opportunity-history',
      items: opportunityToHistoryItems(params.opportunity),
      viewerUser: params.viewerUser
    })),
    showModal: null,
    modalNote: immutable(await ShortText.init({
      errors: [],
      // validate: contentValidation.validateSlug,
      child: {
        type: 'text',
        value: '',
        id: 'modal-note'
      }
    })),

    //from form
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
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('modalNote', value)
      });
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
  // debugger;
  console.log(JSON.stringify(state, null, 2))
  return (
    <Row>
      <Col xs='12'>
        <Attachments.view
          dispatch={mapComponentDispatch(dispatch, msg => adt('attachments' as const, msg))}
          state={state.attachments}
          disabled={disabled}
          className='mt-4' />
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
      case 'addAttachment': {
        // add attachment validation
        // const isValid = isAddTeamMembersEmailsValid(state);
        return {
          title: 'Add Entry to Opportunity',
          onCloseMsg: adt('hideModal'),
          body: dispatch => {

          // const formProps = {
          //   extraChildProps: {},
          //   className: 'flex-grow-1 mb-0',
          //   placeholder: 'Email Address',
          //   dispatch: dispatch(adt('noop')),
          //   state
          // };

          // wrong dispatch?
          const attachmentProps = { state, dispatch, disabled: false }


            return (
              <div>
                <p>Provide a note or commentary below pertaining to the opportunity. You may also include any applicable attachments.</p>
                <Alert color='danger' style={{ whiteSpace: 'pre-line' }}><strong>Important! </strong>The notes and any attachments, if applicable, cannot be edited or deleted once submitted.
                </Alert>


              {/* this adds the note fields; they take the same props (see team.tsx) */}
                {/* <FormField.ConditionalLabel label='Email Addresses' required {...formProps}/> */}
                <div className='mb-3 d-flex align-items-start flex-nowrap'>
                <ShortText.view
                  extraChildProps={{}}
                  label='Note'
                  placeholder='Note'
                  required
                  state={state.modalNote}
                  dispatch={mapComponentDispatch(dispatch, value => adt('modalNote' as const, value))} />
                {/* <input type="text"></input> */}

              </div>
              <AttachmentsView {...attachmentProps} />
              </div>

            );
          },
          actions: [
            {
              text: 'Submit Entry',
              button: true,
              // disabled: !isValid,
              color: 'primary',
              icon: 'file-edit',
              msg: adt('addAttachment')
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
    console.log('History: getContextualActions is firing')
    console.log('History: in getContextualActions, state is:', state)
    return adt('links', [{
      children: 'Add Entry',
      onClick: () => {
        console.log('******************************')
        dispatch(adt('showModal', adt('addAttachment')) as Msg)
      },
      button: true,
      // loading: isAddTeamMembersLoading,
      // disabled: isLoading,
      symbol_: leftPlacement(iconLinkSymbol('file-edit')),
      color: 'primary'
    }]);
  }
};
