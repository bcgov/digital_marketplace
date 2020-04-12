import { SWU_PROPOSAL_EVALUATION_CONTENT_ID } from 'front-end/config';
import { makePageMetadata, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Form from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/form';
import React from 'react';
import { UserType } from 'shared/lib/resources/user';
import { ADT, adt, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  form: Immutable<Form.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'form', Form.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: Id;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType<RouteParams, State, Msg>({
  userType: [UserType.Vendor],

  async success({ routeParams, shared, dispatch, routePath }) {
    const fail = () => {
      dispatch(replaceRoute(adt('notFound' as const, {
        path: routePath
      })));
      return invalid(null);
    };
    const opportunityResult = await api.opportunities.swu.readOne(routeParams.opportunityId);
    if (!api.isValid(opportunityResult)) { return fail(); }
    const organizationsResult = await api.organizations.readMany();
    if (!api.isValid(organizationsResult)) { return fail(); }
    const evalContentResult = await api.getMarkdownFile(SWU_PROPOSAL_EVALUATION_CONTENT_ID);
    if (!api.isValid(evalContentResult)) { return fail(); }
    return valid(immutable({
      form: immutable(await Form.init({
        viewerUser: shared.sessionUser,
        opportunity: opportunityResult.value,
        organizations: organizationsResult.value,
        evaluationContent: evalContentResult.value
      }))
    }));
  },

  async fail({ routeParams, shared }) {
    return invalid(null);
  }
});

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'form':
      return updateComponentChild({
        state,
        childStatePath: ['form'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('form', value)
      });
    default:
      return [state];
  }
});

const view: ComponentView<State, Msg> = viewValid(({ state, dispatch }) => {
  return (
    <Form.view
      state={state.form}
      dispatch={mapComponentDispatch(dispatch, v => adt('form' as const, v))} />
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Create Proposal');
  }
};
