import * as DateField from 'front-end/lib/components/form-field/date';
import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as Phase from 'front-end/lib/pages/opportunity/sprint-with-us/lib/components/phase';
import React from 'react';
import { CreateRequestBody, CreateValidationErrors, SWUOpportunity, SWUOpportunityPhaseType } from 'shared/lib/resources/opportunity/sprint-with-us';
import { adt, ADT } from 'shared/lib/types';
import * as opportunityValidation from 'shared/lib/validation/opportunity/sprint-with-us';

export interface Params {
  opportunity?: SWUOpportunity;
  startingPhase?: SWUOpportunityPhaseType;
}

export interface State {
  startingPhase: SWUOpportunityPhaseType;
  inceptionPhase: Immutable<Phase.State>;
  prototypePhase: Immutable<Phase.State>;
  implementationPhase: Immutable<Phase.State>;
}

export type Msg
  = ADT<'inceptionPhase', Phase.Msg>
  | ADT<'prototypePhase', Phase.Msg>
  | ADT<'implementationPhase', Phase.Msg>;

export function updateAssignmentDate(state: Immutable<State>, assignmentDate: Date = new Date()): Immutable<State> {
  return state
    .update(
      'inceptionPhase',
      s => Phase.setValidateStartDate(
        s,
        raw => opportunityValidation.validateSWUOpportunityInceptionPhaseStartDate(raw, assignmentDate)
      )
    )
    .update(
      'prototypePhase',
      s => Phase.setValidateStartDate(
        s,
        raw => opportunityValidation.validateSWUOpportunityPrototypePhaseStartDate(raw, state.startingPhase === SWUOpportunityPhaseType.Prototype ? assignmentDate : DateField.getDate(state.inceptionPhase.completionDate))
      )
    )
    .update(
      'implementationPhase',
      s => Phase.setValidateStartDate(
        s,
        raw => opportunityValidation.validateSWUOpportunityImplementationPhaseStartDate(raw, state.startingPhase === SWUOpportunityPhaseType.Implementation ? assignmentDate : DateField.getDate(state.prototypePhase.completionDate))
      )
    );
}

export function updateTotalMaxBudget(state: Immutable<State>, totalMaxBudget?: number): Immutable<State> {
  return state
    .update('inceptionPhase', s => Phase.updateTotalMaxBudget(s, totalMaxBudget))
    .update('prototypePhase', s => Phase.updateTotalMaxBudget(s, totalMaxBudget))
    .update('implementationPhase', s => Phase.updateTotalMaxBudget(s, totalMaxBudget));
}

export function setStartingPhase(state: Immutable<State>, startingPhase: SWUOpportunityPhaseType = SWUOpportunityPhaseType.Inception, assignmentDate: Date = new Date()): Immutable<State> {
  state = state
    .set('startingPhase', startingPhase)
    .update('inceptionPhase', s => Phase.setIsAccordianOpen(s, false))
    .update('prototypePhase', s => Phase.setIsAccordianOpen(s, false))
    .update('implementationPhase', s => startingPhase === SWUOpportunityPhaseType.Implementation ? Phase.setIsAccordianOpen(s, true) : Phase.setIsAccordianOpen(s, false));
  return updateAssignmentDate(state, assignmentDate);
}

export const init: Init<Params, State> = async ({ opportunity, startingPhase = SWUOpportunityPhaseType.Inception }) => {
  const totalMaxBudget = opportunity?.totalMaxBudget;
  const assignmentDate = opportunity?.assignmentDate || new Date();
  return {
    startingPhase,
    inceptionPhase: immutable(await Phase.init({
      phase: opportunity?.inceptionPhase,
      totalMaxBudget,
      isAccordianOpen: false,
      validateStartDate: raw => opportunityValidation.validateSWUOpportunityInceptionPhaseStartDate(raw, assignmentDate),
      validateCompletionDate: opportunityValidation.validateSWUOpportunityPhaseCompletionDate
    })),
    prototypePhase: immutable(await Phase.init({
      phase: opportunity?.prototypePhase,
      totalMaxBudget,
      isAccordianOpen: false,
      validateStartDate: raw => opportunityValidation.validateSWUOpportunityPrototypePhaseStartDate(
        raw,
        startingPhase === SWUOpportunityPhaseType.Prototype ? opportunity?.assignmentDate : opportunity?.inceptionPhase?.completionDate
      ),
      validateCompletionDate: opportunityValidation.validateSWUOpportunityPhaseCompletionDate
    })),
    implementationPhase: immutable(await Phase.init({
      phase: opportunity?.implementationPhase,
      totalMaxBudget,
      // If only implementation phase, have it be open.
      isAccordianOpen: startingPhase === SWUOpportunityPhaseType.Implementation,
      validateStartDate: raw => opportunityValidation.validateSWUOpportunityImplementationPhaseStartDate(
        raw,
        startingPhase === SWUOpportunityPhaseType.Implementation ? opportunity?.assignmentDate : opportunity?.prototypePhase?.completionDate
      ),
      validateCompletionDate: opportunityValidation.validateSWUOpportunityPhaseCompletionDate
    }))
  };
};

function hasPhase(state: Immutable<State>, phase: SWUOpportunityPhaseType): boolean {
  switch (phase) {
    case SWUOpportunityPhaseType.Inception:
      return state.startingPhase === SWUOpportunityPhaseType.Inception;
    case SWUOpportunityPhaseType.Prototype:
      return state.startingPhase !== SWUOpportunityPhaseType.Implementation;
    case SWUOpportunityPhaseType.Implementation:
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
        mapChildMsg: value => adt('inceptionPhase', value),
        updateAfter: state => {
          if (msg.value.tag === 'completionDate') {
            return [
              state,
              async state1 => state1.set('prototypePhase', await Phase.setValidateStartDate(
                state1.prototypePhase,
                raw => opportunityValidation.validateSWUOpportunityPrototypePhaseStartDate(raw, DateField.getDate(state1.inceptionPhase.completionDate))
              ))
            ];
          }
          return [state];
        }
      });

    case 'prototypePhase':
      return updateComponentChild({
        state,
        childStatePath: ['prototypePhase'],
        childUpdate: Phase.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('prototypePhase', value),
        updateAfter: state => {
          if (msg.value.tag === 'completionDate') {
            return [
              state,
              async state1 => state1.set('implementationPhase', await Phase.setValidateStartDate(
                state1.implementationPhase,
                raw => opportunityValidation.validateSWUOpportunityImplementationPhaseStartDate(raw, DateField.getDate(state1.prototypePhase.completionDate))
              ))
            ];
          }
          return [state];
        }
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

export type Values = Pick<CreateRequestBody, 'inceptionPhase' | 'prototypePhase' | 'implementationPhase'>;

export function getValues(state: Immutable<State>): Values | null {
  const inceptionPhase = hasPhase(state, SWUOpportunityPhaseType.Inception) ? Phase.getValues(state.inceptionPhase) : undefined;
  const prototypePhase = hasPhase(state, SWUOpportunityPhaseType.Prototype) ? Phase.getValues(state.prototypePhase) : undefined;
  const implementationPhase = Phase.getValues(state.implementationPhase);
  if (inceptionPhase === null || prototypePhase === null || implementationPhase === null) { return null; }
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
  return (!hasPhase(state, SWUOpportunityPhaseType.Inception) || Phase.isValid(state.inceptionPhase))
      && (!hasPhase(state, SWUOpportunityPhaseType.Prototype) || Phase.isValid(state.prototypePhase))
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
      {hasPhase(state, SWUOpportunityPhaseType.Inception)
        ? (<Phase.view
            className='mb-4'
            state={state.inceptionPhase}
            dispatch={mapComponentDispatch(dispatch, value => adt('inceptionPhase' as const, value))}
            icon={isInceptionPhaseValid ? 'map' : 'exclamation-circle'}
            iconColor={isInceptionPhaseValid ? undefined : 'warning'}
            title='Inception'
            description='During the Inception phase, you will take your business goals and research findings and explore the potential value that a new digital product can bring. You will then determine the features of a Minimum Viable Product (MVP) and the scope for an Alpha release.'
            deliverables={[
              'Happy stakeholders with a shared vision for your digital product', 'A product backlog for the Alpha release'
            ]}
            disabled={disabled} />)
        : null}
      {hasPhase(state, SWUOpportunityPhaseType.Prototype)
        ? (<Phase.view
            className='mb-4'
            state={state.prototypePhase}
            dispatch={mapComponentDispatch(dispatch, value => adt('prototypePhase' as const, value))}
            icon={isPrototypePhaseValid ? 'rocket' : 'exclamation-circle'}
            iconColor={isPrototypePhaseValid ? undefined : 'warning'}
            title='Proof of Concept'
            description='During the Proof of Concept phase, you will make your value propositions tangible so that they can be validated. You will begin developing the core features of your product that were scoped out during the Inception phase, working towards the Alpha release!'
            deliverables={[
              'Alpha release of the product',
              'A build/buy/licence decision',
              'Product Roadmap',
              'Resourcing plan for Implementation'
            ]}
            disabled={disabled} />)
        : null}
      <Phase.view
        state={state.implementationPhase}
        dispatch={mapComponentDispatch(dispatch, value => adt('implementationPhase' as const, value))}
        icon={isImplementationPhaseValid ? 'cogs' : 'exclamation-circle'}
        iconColor={isImplementationPhaseValid ? undefined : 'warning'}
        title='Implementation'
        description='As you reach the Implementation phase, you should be fully invested in your new digital product and plan for its continuous improvement. Next, you will need to carefully architect and automate the delivery pipeline for stability and continuous deployment.'
        deliverables={[
          'Delivery of the functional components in the Product Roadmap'
        ]}
        disabled={disabled} />
    </div>
  );
};
