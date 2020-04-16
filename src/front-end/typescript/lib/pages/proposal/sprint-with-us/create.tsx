import { SWU_PROPOSAL_EVALUATION_CONTENT_ID } from 'front-end/config';
import { makePageMetadata, sidebarValid, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Form from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/form';
import Link, { routeDest } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { UserType } from 'shared/lib/resources/user';
import { ADT, adt, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  opportunity: SWUOpportunity;
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
      opportunity: opportunityResult.value,
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

  sidebar: sidebarValid({
    size: 'large',
    color: 'blue-light',
    view: makeInstructionalSidebar<ValidState, Msg>({
      getTitle: () => 'Create a Sprint With Us Proposal',
      getDescription: state => (
        <div className='d-flex flex-column nowrap'>
          <Link newTab dest={routeDest(adt('opportunitySWUView', { opportunityId: state.opportunity.id }))} className='mb-3'>{state.opportunity.title}</Link>
          <span>Introductory text placeholder. Can provide brief instructions on how to create and manage an opportunity (e.g. save draft verion).</span>
        </div>
      ),
      getFooter: () => (
        <span>
          Need help? <Link dest={routeDest(adt('content', 'sprint-with-us-proposal-guide'))}>Read the guide</Link> to learn how to create and manage a SWU proposal.
        </span>
      )
    })
  }),

  getMetadata() {
    return makePageMetadata('Create Proposal');
  }
};
