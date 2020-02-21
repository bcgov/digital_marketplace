import { getContextualActionsValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, newRoute, PageComponent, PageInit, replaceRoute, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Form from 'front-end/lib/pages/proposal/code-with-us/lib/components/form';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { CWUProposalStatus } from 'shared/lib/resources/proposal/code-with-us';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, isInvalid, valid, Validation } from 'shared/lib/validation';

export type State = Validation<Immutable<ValidState>, null>;

export interface ValidState {
  opportunity: CWUOpportunity;
  form: Immutable<Form.State>;
  submitLoading: number;
  saveDraftLoading: number;
}

type InnerMsg
  = ADT<'form', Form.Msg>
  | ADT<'submit'>
  | ADT<'saveDraft'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor],
  async success({ dispatch, routeParams }) {
    const opportunityResult = await api.opportunities.cwu.readOne(routeParams.opportunityId);
    const affiliationsResult = await api.affiliations.readMany();
    if (!api.isValid(opportunityResult) || !api.isValid(affiliationsResult)) {
      dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
      return invalid(null);
    }
    const opportunity = opportunityResult.value;
    const affiliations = affiliationsResult.value;
    return valid(immutable({
      submitLoading: 0,
      saveDraftLoading: 0,
      opportunity,
      form: immutable(await Form.init({
        opportunity,
        affiliations
      }))
    }));
  },
  async fail({ dispatch }) {
    dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
    return invalid(null);
  }
});

const startSubmitLoading = makeStartLoading<ValidState>('submitLoading');
const stopSubmitLoading = makeStopLoading<ValidState>('submitLoading');
const startSaveDraftLoading = makeStartLoading<ValidState>('saveDraftLoading');
const stopSaveDraftLoading = makeStopLoading<ValidState>('saveDraftLoading');

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {

    case 'saveDraft':
    case 'submit':
      const isSubmit = msg.tag === 'submit';
      return [
        isSubmit ? startSubmitLoading(state) : startSaveDraftLoading(state),
        async (state, dispatch) => {
          state = isSubmit ? stopSubmitLoading(state) : stopSaveDraftLoading(state);
          const result = await Form.persist(state.form, adt('create', isSubmit ? CWUProposalStatus.Submitted : CWUProposalStatus.Draft));
          if (isInvalid(result)) {
            return state.set('form', result.value);
          }
          dispatch(newRoute(adt('proposalCWUEdit', {
            proposalId: result.value[1].id,
            opportunityId: result.value[1].opportunity.id
          })));
          return state.set('form', result.value[0]);
        }
      ];

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

const view: ComponentView<State, Msg> = viewValid((params) => {
  const state = params.state;
  const dispatch = params.dispatch;
  return (
    <div>
      <Form.view
        state={state.form}
        dispatch={mapComponentDispatch(dispatch, value => adt('form' as const, value))}
        disabled={false}
      />
    </div>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: {
    size: 'large',
    color: 'blue-light',
    view: makeInstructionalSidebar<State, Msg>({
      getTitle: () => 'Create a Code With Us Proposal',
      getDescription: () => 'Intruductory text placeholder.  Can provide brief instructions on how to create and manage an opportunity (e.g. save draft verion).',
      getFooter: () => (
        <span>
          Need help? <Link dest={routeDest(adt('content', 'code-with-us-proposal-guide'))}>Read the guide</Link> for creating and managing a CWU proposal
        </span>
      )
    })
  },
  getMetadata() {
    return makePageMetadata('Create Proposal');
  },

  getContextualActions: getContextualActionsValid( ({state, dispatch}) => {
    const isSubmitLoading   = state.submitLoading > 0;
    const isSaveDraftLoading = state.saveDraftLoading > 0;
    const isLoading          = isSubmitLoading || isSaveDraftLoading;
    const isValid            = () => Form.isValid(state.form);
    return adt('links', [
      {
        children: 'Submit',
        symbol_: leftPlacement(iconLinkSymbol('paper-plane')),
        button: true,
        loading: isSubmitLoading,
        disabled: isLoading || !isValid(),
        color: 'primary',
        onClick: () => dispatch(adt('submit'))
      },
      {
        children: 'Save Draft',
        symbol_: leftPlacement(iconLinkSymbol('save')),
        loading: isSaveDraftLoading,
        disabled: isLoading,
        button: true,
        color: 'success',
        onClick: () => dispatch(adt('saveDraft'))
      },
      {
        children: 'Cancel',
        color: 'white',
        disabled: isLoading,
        dest: routeDest(adt('opportunityCWUView', {
          opportunityId: state.opportunity.id
        }))
      }
    ]);
  })

};
