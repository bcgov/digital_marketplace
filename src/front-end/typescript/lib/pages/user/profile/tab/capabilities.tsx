import { Route } from 'front-end/lib/app/types';
import { ComponentView, Dispatch, GlobalComponentMsg, Init, Update, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/user/profile/tab';
import Icon from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row, Spinner } from 'reactstrap';
import { CAPABILITIES_WITH_DESCRIPTIONS } from 'shared/lib/data/capabilities';
import { usersAreEquivalent } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface Capability {
  name: string;
  description: string[];
  checked: boolean;
  open: boolean;
}

export interface State extends Tab.Params {
  capabilities: Capability[];
  loading: number | null; //index of capability loading
}

export type InnerMsg
  = ADT<'toggleOpen', number>
  | ADT<'toggleChecked', number>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async (params) => {
  return ({
    ...params,
    loading: null,
    capabilities: CAPABILITIES_WITH_DESCRIPTIONS.map(capability => ({
      ...capability,
      checked: params.profileUser.capabilities.indexOf(capability.name) !== -1,
      open: false
    }))
  });
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {

    case 'toggleChecked':
      return [
        state.set('loading', msg.value),
        async (state, dispatch) => {
          state = state.set('loading', null);
          const capabilities = state.capabilities.filter((c, i) => i === msg.value ? !c.checked : c.checked);
          const result = await api.users.update(state.profileUser.id, adt('updateCapabilities', capabilities.map(({ name }) => name)));
          if (api.isValid(result)) {
            return state.update('capabilities', cs => cs.map(c => ({
              ...c,
              checked: result.value.capabilities.indexOf(c.name) !== -1
            })));
          }
          return state;
        }
      ];

    case 'toggleOpen':
      return [state.update('capabilities', cs => cs.map((c, i) => {
        return i === msg.value ? { ...c, open: !c.open } : c;
      }))];

    default:
      return [state];
  }
};

interface CapabilityProps extends Capability {
  dispatch: Dispatch<Msg>;
  index: number;
  loading: boolean;
  disabled: boolean;
}

const Capability: View<CapabilityProps> = ({ dispatch, index, loading, disabled, name, description, checked, open }) => {
  return (
    <div className='border border-top-0'>
      <div
        className={`${open ? 'bg-light border-bottom' : ''} p-3 d-flex align-items-center`}
        style={{ cursor: 'pointer' }}
        onClick={() => dispatch(adt('toggleOpen', index))}>
        <Link
          onClick={e => {
            if (e) { e.stopPropagation(); }
            dispatch(adt('toggleChecked', index));
          }}
          symbol_={leftPlacement(iconLinkSymbol(checked ? 'check-circle' : 'circle'))}
          symbolClassName={checked ? 'text-success' : 'text-body'}
          color='body'
          disabled={loading || disabled}>
          <span>{name}</span>
          {loading
            ? (<Spinner color='secondary' size='sm' className='ml-3'/>)
            : null}
        </Link>
        <Icon
          color='info'
          className='ml-auto'
          name={open ? 'chevron-up' : 'chevron-down'} />
      </div>
      {open
        ? (<ul className={open ? 'py-5 pr-4 pl-5 m-0' : 'd-none'}>
            {description.map((item, i) => (<li key={`capability-${index}-description-${i}`}>{item}</li>))}
          </ul>)
        : null}
    </div>
  );
};

const view: ComponentView<State, Msg> = props => {
  const { state, dispatch } = props;
  return (
    <Row>
      <Col xs='12'>
        <h2>Capabilities & Skills</h2>
        <p className='mb-5'>Sprint With Us opportunities require teams with the capabilities and skills shown below. Select the capabilities that you possess by clicking on their names or checkboxes. Let us know what you can do!</p>
      </Col>
      <Col xs='12'>
        <h4 className='mb-4'>Capabilities</h4>
        <div className='border-top'>
          {state.capabilities.map((capability, i) => (
            <Capability
              key={`user-profile-capability-${i}`}
              {...capability}
              index={i}
              loading={state.loading === i}
              disabled={!!state.loading || !usersAreEquivalent(state.viewerUser, state.profileUser)}
              dispatch={dispatch} />
          ))}
        </div>
      </Col>
    </Row>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view
};
