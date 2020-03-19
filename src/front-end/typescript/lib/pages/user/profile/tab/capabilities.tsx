import { Route } from 'front-end/lib/app/types';
import { ComponentView, Dispatch, GlobalComponentMsg, Init, Update, View } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/user/profile/tab';
import Icon from 'front-end/lib/views/icon';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

const capabilities = [
  {
    name: 'Agile Coaching',
    pt: false,
    checked: false,
    collapsed: true
  },
  {
    name: 'Delivery Management',
    pt: false,
    checked: false,
    collapsed: true
  },
  {
    name: 'Frontend Development',
    pt: false,
    checked: false,
    collapsed: true
  },
  {
    name: 'Technical Architecture',
    pt: false,
    checked: false,
    collapsed: true
  },
  {
    name: 'User Research',
    pt: false,
    checked: false,
    collapsed: true
  },
  {
    name: 'Backend Development',
    pt: false,
    checked: false,
    collapsed: true
  },
  {
    name: 'DevOps Engineering',
    pt: false,
    checked: false,
    collapsed: true
  },
  {
    name: 'Security Engineering',
    pt: false,
    checked: false,
    collapsed: true
  },
  {
    name: 'User Experience Design',
    pt: false,
    checked: false,
    collapsed: true
  }
];

export interface Capability {
  index: number;
  name: string;
  pt: boolean;
  checked: boolean;
  collapsed: boolean;
  bodyBullets: string[];
}

interface CapabilityAndDispatch {
  capability: Capability;
  dispatch: Dispatch<Msg>;
}

export interface State extends Tab.Params {
  capabilities: Capability[];
}

export type InnerMsg =
  ADT<'toggleCollapsed', number> |
  ADT<'toggleChecked', number>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async (params) => {
  return ({
    ...params,
    capabilities: capabilities.map( (c, index) => ({...c, index, bodyBullets: ['body bullets for', 'this thing!']})  )
  });
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {

    case 'toggleChecked':
      state.capabilities[msg.value].checked = !state.capabilities[msg.value].checked;
      return [state];

    case 'toggleCollapsed':
      state.capabilities[msg.value].collapsed = !state.capabilities[msg.value].collapsed;
      return [state];

    default:
      return [state];
  }
};

export const ToggleView: View<CapabilityAndDispatch> = ({capability, dispatch}) => {
  const iconColor = 'blue-dark';
  const checkedIcon = capability.checked ? 'question-circle' : 'plus-circle' ;
  return (
    <div className=''>

      <div
        className={`${capability.collapsed ? '' : 'bg-light' } p-3 border d-flex align-items-center justify-content-between`}
        onClick={ (e) => {
          e.stopPropagation();
          dispatch(adt('toggleCollapsed', capability.index));
        }}
      >
        <div>
          <Icon name={checkedIcon}
            onClick={ (e) => {
              e.stopPropagation();
              dispatch(adt('toggleChecked', capability.index));
            }}
          />
          <span className={`pl-2`}>{capability.name}</span>
        </div>
        {
          capability.collapsed ?
          <Icon color={iconColor} className='justify-self-end' name='chevron-down' /> :
          <Icon color={iconColor} className='justify-self-end' name='chevron-up' />
        }
      </div>

      <div className={`${ capability.collapsed ? 'd-none' : 'border' }`}>
        <ul className='py-4 m-0'>
        {
          capability.bodyBullets.map(
            (bullet) => { return(
              <li>{bullet}</li>
            ); }
          )
        }
        </ul>
      </div>

    </div>
  );
};

const view: ComponentView<State, Msg> = props => {
  const dispatch = props.dispatch;
  return (
    <Row>

      <Col xs='12'>
        <h2>Capabilities & Skills</h2>
        <p>Sprint With Us opportunities call for teams with the capabilities and skills shown below. Let us know what you can do!</p>
      </Col>

      <Col className='pt-3' xs='12'>
        <h4>Capabilities</h4>

      {
        props.state.capabilities.map( (capability) => {
          return (
            <ToggleView
              key={capability.index}
              dispatch={dispatch}
              capability={capability}
            />
          );
        })
      }
      </Col>

    </Row>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view
};
