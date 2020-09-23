import { Route } from 'front-end/lib/app/types';
import * as Addenda from 'front-end/lib/components/addenda';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { Addendum } from 'shared/lib/resources/addendum';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

export interface State extends Tab.Params {
  addenda: Immutable<Addenda.State>;
}

export type InnerMsg
  = ADT<'addenda', Addenda.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    addenda: immutable(await Addenda.init({
      existingAddenda: params.opportunity.addenda,
      disabled: false,
      async publishNewAddendum(value) {
        const result = await api.opportunities.cwu.update(params.opportunity.id, adt('addAddendum', value));
        let outcome: Validation<Addendum[], string[]> | undefined;
        switch (result.tag) {
          case 'valid':
            outcome = valid(result.value.addenda);
            break;
          case 'invalid':
            if (result.value.opportunity?.tag === 'addAddendum') {
              outcome = invalid(result.value.opportunity.value);
            }
            break;
        }
        return outcome || invalid(['Unable to add addenda due to a system error.']);
      }
    }))
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'addenda':
      return updateGlobalComponentChild({
        state,
        childStatePath: ['addenda'],
        childUpdate: Addenda.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('addenda', value)
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
            <h3 className='mb-4'>Addenda</h3>
            <p className='mb-4'>
              Provide additional information here to clarify or support the information in the original opportunity.
            </p>
            <Addenda.view
              dispatch={mapComponentDispatch(dispatch, msg => adt('addenda' as const, msg))}
              state={state.addenda} />
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

  getContextualActions({ state, dispatch }) {
    return Addenda.getContextualActions({
      state: state.addenda,
      dispatch: mapComponentDispatch(dispatch, msg => adt('addenda' as const, msg))
    });
  }
};
