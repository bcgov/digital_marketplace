import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as Phase from 'front-end/lib/pages/opportunity/sprint-with-us/lib/components/phase';
import React from 'react';
import { adt, ADT } from 'shared/lib/types';

export interface Params {
  startWith: 'inception' | 'proofOfConcept' | 'implementation';
}

export interface State {
  inception: Immutable<Phase.State> | null;
  proofOfConcept: Immutable<Phase.State> | null;
  implementation: Immutable<Phase.State>;
}

export type Msg
  = ADT<'inception', Phase.Msg>
  | ADT<'proofOfConcept', Phase.Msg>
  | ADT<'implementation', Phase.Msg>;

export const init: Init<Params, State> = async ({ startWith }) => {
  return {
    inception: startWith === 'inception' ? immutable(await Phase.init({ isAccordianOpen: false })) : null,
    proofOfConcept: startWith !== 'implementation' ? immutable(await Phase.init({ isAccordianOpen: false })) : null,
    implementation: immutable(await Phase.init({ isAccordianOpen: false }))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'inception':
      if (!state.inception) { return [state]; }
      return updateComponentChild({
        state,
        childStatePath: ['inception'],
        childUpdate: Phase.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('inception', value)
      });

    case 'proofOfConcept':
      if (!state.proofOfConcept) { return [state]; }
      return updateComponentChild({
        state,
        childStatePath: ['proofOfConcept'],
        childUpdate: Phase.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('proofOfConcept', value)
      });

    case 'implementation':
      if (!state.implementation) { return [state]; }
      return updateComponentChild({
        state,
        childStatePath: ['implementation'],
        childUpdate: Phase.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('implementation', value)
      });
  }
};

interface Values {
  inception?: Phase.Values;
  proofOfConcept?: Phase.Values;
  implementation: Phase.Values;
}

export function getValues(state: Immutable<State>, phaseIndex: number): Values {
  return {
    inception: state.inception ? Phase.getValues(state.inception) : undefined,
    proofOfConcept: state.proofOfConcept ? Phase.getValues(state.proofOfConcept) : undefined,
    implementation: Phase.getValues(state.implementation)
  };
}

//TODO setErrors

export interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <div>
      {state.inception
        ? (<Phase.view
            className='mb-4'
            state={state.inception}
            dispatch={mapComponentDispatch(dispatch, value => adt('inception' as const, value))}
            icon='map'
            title='Inception'
            description='During the Inception phase, you will take your business goals and research findings and explore the potential value that a new digital product can bring. You will then determine the features of a Minimum Viable Product (MVP) and the scope for an Alpha release.'
            deliverables={[
              'Happy stakeholders with a shared vision for your digital product', 'A product backlog for the Alpha release'
            ]}
            disabled={disabled} />)
        : null}
      {state.proofOfConcept
        ? (<Phase.view
            className='mb-4'
            state={state.proofOfConcept}
            dispatch={mapComponentDispatch(dispatch, value => adt('proofOfConcept' as const, value))}
            icon='rocket'
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
      {state.implementation
        ? (<Phase.view
            state={state.implementation}
            dispatch={mapComponentDispatch(dispatch, value => adt('implementation' as const, value))}
            icon='cogs'
            title='Implementation'
            description='As you reach the Implementation phase, you should be fully invested in your new digital product and plan for its continuous improvement. Next, you will need to carefully architect and automate the delivery pipeline for stability and continuous deployment.'
            deliverables={[
              'Delivery of the functional components in the Product Roadmap'
            ]}
            disabled={disabled} />)
        : null}
    </div>
  );
};
