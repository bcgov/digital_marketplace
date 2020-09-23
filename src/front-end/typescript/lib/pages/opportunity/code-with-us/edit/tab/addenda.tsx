import { Route } from 'front-end/lib/app/types';
import * as Addenda from 'front-end/lib/components/addenda';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
//import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import React from 'react';
import { Col, Row } from 'reactstrap';
//import { Addendum, CWUOpportunity, UpdateValidationErrors } from 'shared/lib/resources/opportunity/code-with-us';
import { adt, ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  addenda: Immutable<Addenda.State>;
}

export type InnerMsg
  = ADT<'addenda', Addenda.Msg>
  | ADT<'save'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    addenda: immutable(await Addenda.init({
      disabled: false,
      existingAddenda: params.opportunity.addenda
    }))
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'addenda':
      return updateComponentChild({
        state,
        childStatePath: ['addenda'],
        childUpdate: Addenda.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'addenda', value })
      });
    //case 'save':
      //return [
        //startLoading(state),
        //async (state, dispatch) => {
          //stopLoading(state);
          //const newAddenda = Addenda.getNewAddenda(state.addenda);
          //if (!newAddenda.length) { return state; }
          //let updatedExistingAddenda: Addendum[] = state.addenda.existingAddenda;
          //const updatedNewAddenda: Addenda.NewAddendumParam[] = [];
          ////Persist each addendum.
          //for (const addendum of newAddenda) {
            //const addAddendumResult: api.ResponseValidation<CWUOpportunity, UpdateValidationErrors> = await api.opportunities.cwu.update(state.opportunity.id, adt('addAddendum', addendum));
            //switch (addAddendumResult.tag) {
              //case 'valid':
                //updatedExistingAddenda = addAddendumResult.value.addenda;
                //break;
              //case 'invalid':
                //if (addAddendumResult.value.opportunity?.tag === 'addAddendum') {
                  //updatedNewAddenda.push({
                    //value: addendum,
                    //errors: addAddendumResult.value.opportunity.value
                  //});
                //}
                //break;
              //case 'unhandled':
                //updatedNewAddenda.push({
                  //value: addendum,
                  //errors: ['Unable to add addenda due to a system error.']
                //});
            //}
          //}
          ////Update the addenda field in state.
          //state = state.set('addenda', immutable(await Addenda.init({
            //existingAddenda: updatedExistingAddenda,
            //newAddenda: updatedNewAddenda
          //})));
          ////Check if any addenda failed.
          //if (updatedNewAddenda.length) {
            ////TODO send toast
          //}
          //return state;
        //}
      //];
    default:
      return [state];
  }
};

//function isValid(state: Immutable<State>): boolean {
  //return Addenda.isValid(state.addenda);
//}

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
