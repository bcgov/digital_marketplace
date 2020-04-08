import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as Phase from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/phase';
import React from 'react';
import { SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { CreateValidationErrors, SWUProposal, SWUProposalPhaseType } from 'shared/lib/resources/proposal/sprint-with-us';
import { adt, ADT } from 'shared/lib/types';

export interface Params {
  organization?: OrganizationSlim;
  opportunity: SWUOpportunity;
  proposal?: SWUProposal;
}

export interface State extends Params {
  inceptionPhase: Immutable<Phase.State>;
  prototypePhase: Immutable<Phase.State>;
  implementationPhase: Immutable<Phase.State>;
}

export type Msg
  = ADT<'inceptionPhase', Phase.Msg>
  | ADT<'prototypePhase', Phase.Msg>
  | ADT<'implementationPhase', Phase.Msg>;

export const init: Init<Params, State> = async params => {
  const { organization, opportunity, proposal } = params;
  return {
    ...params,
    inceptionPhase: immutable(await Phase.init({
      organization,
      opportunityPhase: opportunity.inceptionPhase,
      proposalPhase: proposal?.inceptionPhase,
      isAccordianOpen: false
    })),
    prototypePhase: immutable(await Phase.init({
      organization,
      opportunityPhase: opportunity.prototypePhase,
      proposalPhase: proposal?.prototypePhase,
      isAccordianOpen: false
    })),
    implementationPhase: immutable(await Phase.init({
      organization,
      opportunityPhase: opportunity.implementationPhase,
      proposalPhase: proposal?.implementationPhase,
      isAccordianOpen: !opportunity.prototypePhase
    }))
  };
};

function hasPhase(state: Immutable<State>, phase: SWUProposalPhaseType): boolean {
  switch (phase) {
    case SWUProposalPhaseType.Inception:
      return !!state.opportunity.inceptionPhase;
    case SWUProposalPhaseType.Prototype:
      return !!state.opportunity.prototypePhase;
    case SWUProposalPhaseType.Implementation:
      return true;
  }
}

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'inceptionPhase':
      return updateComponentChild({
        state,
        childStatePath: ['inceptionPhase'],
        childUpdate: Phase.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('inceptionPhase', value)
      });

    case 'prototypePhase':
      return updateComponentChild({
        state,
        childStatePath: ['prototypePhase'],
        childUpdate: Phase.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('prototypePhase', value)
      });

    case 'implementationPhase':
      return updateComponentChild({
        state,
        childStatePath: ['implementationPhase'],
        childUpdate: Phase.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('implementationPhase', value)
      });
  }
};

export interface Values {
  inceptionPhase?: Phase.Values;
  prototypePhase?: Phase.Values;
  implementationPhase: Phase.Values;
}

export function getValues(state: Immutable<State>): Values {
  const inceptionPhase = hasPhase(state, SWUProposalPhaseType.Inception) ? Phase.getValues(state.inceptionPhase) : undefined;
  const prototypePhase = hasPhase(state, SWUProposalPhaseType.Prototype) ? Phase.getValues(state.prototypePhase) : undefined;
  const implementationPhase = Phase.getValues(state.implementationPhase);
  return { inceptionPhase, prototypePhase, implementationPhase };
}

export type Errors = Pick<CreateValidationErrors, 'inceptionPhase' | 'prototypePhase' | 'implementationPhase'>;

export function setErrors(state: Immutable<State>, errors: Errors): Immutable<State> {
  return state
    .update('inceptionPhase', s => Phase.setErrors(s, errors.inceptionPhase))
    .update('prototypePhase', s => Phase.setErrors(s, errors.prototypePhase))
    .update('implementationPhase', s => Phase.setErrors(s, errors.implementationPhase));
}

export function isValid(state: Immutable<State>): boolean {
  return (!hasPhase(state, SWUProposalPhaseType.Inception) || Phase.isValid(state.inceptionPhase))
      && (!hasPhase(state, SWUProposalPhaseType.Prototype) || Phase.isValid(state.prototypePhase))
      && Phase.isValid(state.implementationPhase);
}

export interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: View<Props> = ({ state, dispatch, disabled }) => {
  const isInceptionPhaseValid = Phase.isValid(state.inceptionPhase);
  const isPrototypePhaseValid = Phase.isValid(state.prototypePhase);
  const isImplementationPhaseValid = Phase.isValid(state.implementationPhase);
  return (
    <div>
      {hasPhase(state, SWUProposalPhaseType.Inception)
        ? (<Phase.view
            className='mb-4'
            state={state.inceptionPhase}
            dispatch={mapComponentDispatch(dispatch, value => adt('inceptionPhase' as const, value))}
            icon={isInceptionPhaseValid ? 'map' : 'exclamation-circle'}
            iconColor={isInceptionPhaseValid ? undefined : 'warning'}
            title='Inception'
            disabled={disabled} />)
        : null}
      {hasPhase(state, SWUProposalPhaseType.Prototype)
        ? (<Phase.view
            className='mb-4'
            state={state.prototypePhase}
            dispatch={mapComponentDispatch(dispatch, value => adt('prototypePhase' as const, value))}
            icon={isPrototypePhaseValid ? 'rocket' : 'exclamation-circle'}
            iconColor={isPrototypePhaseValid ? undefined : 'warning'}
            title='Proof of Concept'
            disabled={disabled} />)
        : null}
      <Phase.view
        state={state.implementationPhase}
        dispatch={mapComponentDispatch(dispatch, value => adt('implementationPhase' as const, value))}
        icon={isImplementationPhaseValid ? 'cogs' : 'exclamation-circle'}
        iconColor={isImplementationPhaseValid ? undefined : 'warning'}
        title='Implementation'
        disabled={disabled} />
    </div>
  );
};
