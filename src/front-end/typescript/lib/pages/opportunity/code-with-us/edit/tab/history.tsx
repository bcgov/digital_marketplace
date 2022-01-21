import { Route } from 'front-end/lib/app/types';
import * as History from 'front-end/lib/components/table/history';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import { opportunityToHistoryItems } from 'front-end/lib/pages/opportunity/code-with-us/lib';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';
import { isVendor} from 'shared/lib/resources/user';
import  { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import { AffiliationMember } from 'shared/lib/resources/affiliation';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import * as FormField from 'front-end/lib/components/form-field';
import Icon from 'front-end/lib/views/icon';

type ModalId
  = ADT<'addTeamMembers'>
  | ADT<'viewTeamMember', AffiliationMember>
  | ADT<'removeTeamMember', AffiliationMember>
  | ADT<'approveAffiliation', AffiliationMember>;

export interface State extends Tab.Params {
  history: Immutable<History.State>;
  showModal: ModalId | null;
  addTeamMembersEmails: Array<Immutable<ShortText.State>>;
}

export type InnerMsg
  = ADT<'history', History.Msg>
  | ADT<'addTeamMembersEmailsAddField'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

async function initAddTeamMemberEmailField(): Promise<Immutable<ShortText.State>> {
  return immutable(await ShortText.init({
    errors: [],
    child: {
      id: 'organization-team-add-team-members-emails',
      type: 'email',
      value: ''
    }
  }));
}


const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    addTeamMembersEmails: [await initAddTeamMemberEmailField()],
    showModal: null,
    history: immutable(await History.init({
      idNamespace: 'cwu-opportunity-history',
      items: opportunityToHistoryItems(params.opportunity),
      viewerUser: params.viewerUser
    }))
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'history':
      return updateComponentChild({
        state,
        childStatePath: ['history'],
        childUpdate: History.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'history', value })
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

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  getContextualActions({ state }) {
    if (!state.viewerUser || isVendor(state.viewerUser)) { return null; }
    return adt('links', [{
      children: 'Add Team Member(s)',
      onClick: () => dispatch(adt('showModal', adt('addTeamMembers')) as Msg),
      button: true,
      // loading: isAddTeamMembersLoading,
      // disabled: isLoading,
      symbol_: leftPlacement(iconLinkSymbol('user-plus')),
      color: 'primary'
    }]);
  },

  getModal: state => {
    if (!state.showModal) { return null; }
    switch (state.showModal.tag) {
      case 'addTeamMembers': {
        const isValid = true; //check if note meets requirements
        return {
          title: 'Add Team Member(s)',
          onCloseMsg: adt('hideModal'),
          body: dispatch => {
            const addField = () => dispatch(adt('addTeamMembersEmailsAddField'));
            return (
              <div>
                <p>Provide an email address for each team member to invite them to join your organization.</p>
                <p><strong>Please ensure team members have already signed up for a Digital Marketplace Vendor account before adding them to your organization, and only enter the email addresses associated with their Digital Marketplace accounts.</strong></p>
                {state.addTeamMembersEmails.map((s, i) => {
                  const isFirst = i === 0;
                  const isLast = i === state.addTeamMembersEmails.length - 1;
                  const props = {
                    extraChildProps: {},
                    className: 'flex-grow-1 mb-0',
                    placeholder: 'Email Address',

                    dispatch: mapComponentDispatch(dispatch, v => adt('addTeamMembersEmails', [i, v]) as Msg),
                    state: s
                  };
                  return (
                    <div key={`organization-add-team-member-email-${i}`}>
                      {isFirst
                        ? (<FormField.ConditionalLabel label='Email Addresses' required {...props} />)
                        : null}
                      <div className='mb-3 d-flex align-items-start flex-nowrap'>
                        <ShortText.view {...props} />
                        <div className='d-flex flex-nowrap align-items-center' style={{ marginTop: '0.625rem' }}>
                          {state.addTeamMembersEmails.length === 1
                            ? null
                            : (<Icon
                              hover
                              name='trash'
                              color='info'
                              className='ml-2'
                              width={0.9}
                              height={0.9}

                              onClick={() => dispatch(adt('addTeamMembersEmailsRemoveField', i))} />)}
                          <Icon
                            hover={isLast}
                            name='plus'
                            color='primary'
                            className={`ml-2 ${isLast ? 'o-100' : 'o-0'}`}
                            width={1.1}
                            height={1.1}
                            onClick={isLast ? addField : undefined} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          },
          actions: [
            {
              text: 'Add Team Member(s)',
              button: true,
              disabled: !isValid,
              color: 'primary',
              icon: 'user-plus',
              msg: adt('addTeamMembers')
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
};
