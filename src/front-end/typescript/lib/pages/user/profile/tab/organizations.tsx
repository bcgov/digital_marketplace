//import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, Dispatch, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/user/profile/tab';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { AffiliationSlim, MembershipType } from 'shared/lib/resources/affiliation';
import { adt, ADT, Id } from 'shared/lib/types';

type TableAffiliation = AffiliationSlim;

export interface State extends Tab.Params {
  deleteAffiliationLoading: Id | null;
  showDeleteAffiliationModal: Id | null;
  ownedRecords: TableAffiliation[];
  affiliatedRecords: TableAffiliation[];
  ownedTable: Immutable<Table.State>;
  affiliatedTable: Immutable<Table.State>;
}

export type InnerMsg
  = ADT<'ownedTable', Table.Msg>
  | ADT<'affiliatedTable', Table.Msg>
  | ADT<'deleteAffiliation', Id>
  | ADT<'hideDeleteAffiliationModal'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async ({ viewerUser, profileUser }) => {
  const result = await api.affiliations.readMany();
  let affiliations: TableAffiliation[] = [];
  if (api.isValid(result)) {
    affiliations = result.value.sort((a, b) => a.organization.legalName.localeCompare(b.organization.legalName));
  }
  return {
    deleteAffiliationLoading: null,
    showDeleteAffiliationModal: null,
    profileUser,
    viewerUser,
    ownedRecords: affiliations.filter(a => a.membershipType === MembershipType.Owner),
    affiliatedRecords: affiliations.filter(a => a.membershipType === MembershipType.Member),
    ownedTable: immutable(await Table.init({
      idNamespace: 'user-profile-orgs-owned'
    })),
    affiliatedTable: immutable(await Table.init({
      idNamespace: 'user-profile-orgs-affiliated'
    }))
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'ownedTable':
      return updateComponentChild({
        state,
        childStatePath: ['ownedTable'],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'ownedTable', value })
      });
    case 'affiliatedTable':
      return updateComponentChild({
        state,
        childStatePath: ['affiliatedTable'],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'affiliatedTable', value })
      });
    case 'deleteAffiliation':
      if (!state.showDeleteAffiliationModal) {
        return [state.set('showDeleteAffiliationModal', msg.value)];
      } else {
        state = state
          .set('deleteAffiliationLoading', msg.value)
          .set('showDeleteAffiliationModal', null);
      }
      return [
        state,
        async state => {
          state = state.set('deleteAffiliationLoading', null);
          const result = await api.affiliations.delete(msg.value);
          if (!api.isValid(result)) { return state; }
          return immutable(await init({
            profileUser: state.profileUser,
            viewerUser: state.viewerUser
          }));
        }
      ];
    case 'hideDeleteAffiliationModal':
      return [state.set('showDeleteAffiliationModal', null)];
    default:
      return [state];
  }
};

function ownedTableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: 'Legal Name',
      style: {
        width: '100%'
      }
    }
  ];
}

function ownedTableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.ownedRecords.map(affiliation => [
    {
      children: (<Link dest={routeDest(adt('orgEdit', { orgId: affiliation.organization.id})) }>{affiliation.organization.legalName}</Link>)
    }
  ]);
}

function affiliatedTableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: 'Legal Name',
      style: {
        width: '80%',
        minWidth: '200px'
      }
    },
    {
      children: '',
      style: {
        width: '20%'
      }
    }
  ];
}

function affiliatedTableBodyRows(state: Immutable<State>, dispatch: Dispatch<Msg>): Table.BodyRows {
  return state.affiliatedRecords.map(affiliation => {
    const isDeleteLoading = state.deleteAffiliationLoading === affiliation.id;
    const isDisabled = !!state.deleteAffiliationLoading;
    return [
      {
        children: affiliation.organization.legalName,
        style: {
          verticalAlign: 'middle'
        }
      },
      {
        children: (<LoadingButton disabled={isDisabled} loading={isDeleteLoading} size='sm' color='danger' symbol_={leftPlacement(iconLinkSymbol('user-times'))} onClick={() => dispatch(adt('deleteAffiliation', affiliation.id))}>Leave</LoadingButton>),
        className: 'py-2'
      }
    ];
  });
}

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const dispatchOwnedTable = mapComponentDispatch<Msg, Table.Msg>(dispatch, value => ({ tag: 'ownedTable', value }));
  const dispatchAffiliatedTable = mapComponentDispatch<Msg, Table.Msg>(dispatch, value => ({ tag: 'affiliatedTable', value }));
  return (
    <div>
      <Row>
        <Col xs='12'>
          <h2>Owned Organizations</h2>
          <p className={state.ownedRecords.length ? 'mb-5' : 'mb-0'}>
            {state.ownedRecords.length
              ? 'You are the owner of the following organizations.'
              : 'You do not own any organizations.'}
          </p>
        </Col>
      </Row>
      <Row>
        <Col xs='12' className='mb-5 pb-5 border-bottom'>
          {state.ownedRecords.length
            ? (<Table.view
                headCells={ownedTableHeadCells(state)}
                bodyRows={ownedTableBodyRows(state)}
                state={state.ownedTable}
                dispatch={dispatchOwnedTable} />)
            : null}
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <h2>Affiliated Organizations</h2>
          <p className='mb-5'>
            {state.affiliatedRecords.length
              ? 'You\'ve given these companies permission to put you forward as a team member on proposals for opportunities.'
              : 'You are not affiliated with any organizations'}
          </p>
        </Col>
      </Row>
      {state.affiliatedRecords.length
        ? (<Row>
            <Col xs='12'>
              <Table.view
                headCells={affiliatedTableHeadCells(state)}
                bodyRows={affiliatedTableBodyRows(state, dispatch)}
                state={state.affiliatedTable}
                dispatch={dispatchAffiliatedTable} />
            </Col>
          </Row>)
        : null}
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  getModal(state) {
    if (state.showDeleteAffiliationModal) {
      return {
        title: 'Leave Organization?',
        body: 'Are you sure you want to leave this organization? You will no longer be able to be included as a team member in its opportunity proposals.',
        onCloseMsg: adt('hideDeleteAffiliationModal'),
        actions: [
          {
            text: 'Leave Organization',
            color: 'primary',
            msg: adt('deleteAffiliation', state.showDeleteAffiliationModal),
            button: true
          },
          {
            text: 'Cancel',
            color: 'secondary',
            msg: adt('hideDeleteAffiliationModal')
          }
        ]
      };
    }
    return null;
  }
};
