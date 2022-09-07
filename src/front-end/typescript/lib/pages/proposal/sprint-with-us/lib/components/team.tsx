import {
  ComponentViewProps,
  immutable,
  Immutable,
  Init,
  mapComponentDispatch,
  mapPageModalMsg,
  PageGetModal,
  Update,
  updateComponentChild,
  View
} from "front-end/lib/framework";
import * as Phase from "front-end/lib/pages/proposal/sprint-with-us/lib/components/phase";
import React from "react";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import {
  SWUOpportunity,
  SWUOpportunityPhaseType,
  swuOpportunityPhaseTypeToTitleCase
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateValidationErrors,
  SWUProposal,
  SWUProposalPhaseType
} from "shared/lib/resources/proposal/sprint-with-us";
import { adt, ADT, Id } from "shared/lib/types";

export interface Params {
  orgId?: Id;
  affiliations: AffiliationMember[];
  opportunity: SWUOpportunity;
  proposal?: SWUProposal;
}

export interface State extends Omit<Params, "orgId"> {
  orgId: Id | null;
  inceptionPhase: Immutable<Phase.State>;
  prototypePhase: Immutable<Phase.State>;
  implementationPhase: Immutable<Phase.State>;
}

export type Msg =
  | ADT<"inceptionPhase", Phase.Msg>
  | ADT<"prototypePhase", Phase.Msg>
  | ADT<"implementationPhase", Phase.Msg>;

export function setAffiliations(
  state: Immutable<State>,
  affiliations: AffiliationMember[],
  orgId: Id
): Immutable<State> {
  return state
    .set("orgId", orgId)
    .update("inceptionPhase", (s) =>
      Phase.setAffiliations(s, affiliations, orgId)
    )
    .update("prototypePhase", (s) =>
      Phase.setAffiliations(s, affiliations, orgId)
    )
    .update("implementationPhase", (s) =>
      Phase.setAffiliations(s, affiliations, orgId)
    );
}

export const init: Init<Params, State> = async (params) => {
  const { orgId, affiliations, opportunity, proposal } = params;
  return {
    affiliations,
    opportunity,
    proposal,
    orgId: orgId || null,
    inceptionPhase: immutable(
      await Phase.init({
        orgId,
        affiliations,
        opportunityPhase: opportunity.inceptionPhase,
        proposalPhase: proposal?.inceptionPhase,
        isAccordionOpen: false
      })
    ),
    prototypePhase: immutable(
      await Phase.init({
        orgId,
        affiliations,
        opportunityPhase: opportunity.prototypePhase,
        proposalPhase: proposal?.prototypePhase,
        isAccordionOpen: false
      })
    ),
    implementationPhase: immutable(
      await Phase.init({
        orgId,
        affiliations,
        opportunityPhase: opportunity.implementationPhase,
        proposalPhase: proposal?.implementationPhase,
        isAccordionOpen: !opportunity.prototypePhase
      })
    )
  };
};

function hasPhase(
  state: Immutable<State>,
  phase: SWUProposalPhaseType
): boolean {
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
    case "inceptionPhase":
      return updateComponentChild({
        state,
        childStatePath: ["inceptionPhase"],
        childUpdate: Phase.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("inceptionPhase", value)
      });

    case "prototypePhase":
      return updateComponentChild({
        state,
        childStatePath: ["prototypePhase"],
        childUpdate: Phase.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("prototypePhase", value)
      });

    case "implementationPhase":
      return updateComponentChild({
        state,
        childStatePath: ["implementationPhase"],
        childUpdate: Phase.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("implementationPhase", value)
      });
  }
};

export interface Values {
  inceptionPhase?: Phase.Values;
  prototypePhase?: Phase.Values;
  implementationPhase: Phase.Values;
}

export function getValues(state: Immutable<State>): Values {
  const inceptionPhase = hasPhase(state, SWUProposalPhaseType.Inception)
    ? Phase.getValues(state.inceptionPhase)
    : undefined;
  const prototypePhase = hasPhase(state, SWUProposalPhaseType.Prototype)
    ? Phase.getValues(state.prototypePhase)
    : undefined;
  const implementationPhase = Phase.getValues(state.implementationPhase);
  return { inceptionPhase, prototypePhase, implementationPhase };
}

interface MemberValues {
  inceptionPhase?: Phase.Member[];
  prototypePhase?: Phase.Member[];
  implementationPhase: Phase.Member[];
}

export function getAddedMembers(state: Immutable<State>): MemberValues {
  return {
    inceptionPhase: hasPhase(state, SWUProposalPhaseType.Inception)
      ? Phase.getAddedMembers(state.inceptionPhase)
      : undefined,
    prototypePhase: hasPhase(state, SWUProposalPhaseType.Prototype)
      ? Phase.getAddedMembers(state.prototypePhase)
      : undefined,
    implementationPhase: Phase.getAddedMembers(state.implementationPhase)
  };
}

export type Errors = Pick<
  CreateValidationErrors,
  "inceptionPhase" | "prototypePhase" | "implementationPhase"
>;

export function setErrors(
  state: Immutable<State>,
  errors: Errors
): Immutable<State> {
  return state
    .update("inceptionPhase", (s) => Phase.setErrors(s, errors.inceptionPhase))
    .update("prototypePhase", (s) => Phase.setErrors(s, errors.prototypePhase))
    .update("implementationPhase", (s) =>
      Phase.setErrors(s, errors.implementationPhase)
    );
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state
    .update("inceptionPhase", (s) => Phase.validate(s))
    .update("prototypePhase", (s) => Phase.validate(s))
    .update("implementationPhase", (s) => Phase.validate(s));
}

export function isValid(state: Immutable<State>): boolean {
  return (
    (!hasPhase(state, SWUProposalPhaseType.Inception) ||
      Phase.isValid(state.inceptionPhase)) &&
    (!hasPhase(state, SWUProposalPhaseType.Prototype) ||
      Phase.isValid(state.prototypePhase)) &&
    Phase.isValid(state.implementationPhase)
  );
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
      {hasPhase(state, SWUProposalPhaseType.Inception) ? (
        <Phase.view
          className="mb-4"
          state={state.inceptionPhase}
          dispatch={mapComponentDispatch(dispatch, (value) =>
            adt("inceptionPhase" as const, value)
          )}
          icon={isInceptionPhaseValid ? "map" : "exclamation-circle"}
          iconColor={isInceptionPhaseValid ? undefined : "warning"}
          title={swuOpportunityPhaseTypeToTitleCase(
            SWUOpportunityPhaseType.Inception
          )}
          disabled={disabled}
        />
      ) : null}
      {hasPhase(state, SWUProposalPhaseType.Prototype) ? (
        <Phase.view
          className="mb-4"
          state={state.prototypePhase}
          dispatch={mapComponentDispatch(dispatch, (value) =>
            adt("prototypePhase" as const, value)
          )}
          icon={isPrototypePhaseValid ? "rocket" : "exclamation-circle"}
          iconColor={isPrototypePhaseValid ? undefined : "warning"}
          title={swuOpportunityPhaseTypeToTitleCase(
            SWUOpportunityPhaseType.Prototype
          )}
          disabled={disabled}
        />
      ) : null}
      <Phase.view
        state={state.implementationPhase}
        dispatch={mapComponentDispatch(dispatch, (value) =>
          adt("implementationPhase" as const, value)
        )}
        icon={isImplementationPhaseValid ? "cogs" : "exclamation-circle"}
        iconColor={isImplementationPhaseValid ? undefined : "warning"}
        title={swuOpportunityPhaseTypeToTitleCase(
          SWUOpportunityPhaseType.Implementation
        )}
        disabled={disabled}
      />
    </div>
  );
};

export const getModal: PageGetModal<State, Msg> = (state) => {
  const inceptionModal = () =>
    hasPhase(state, SWUProposalPhaseType.Inception)
      ? mapPageModalMsg(
          Phase.getModal(state.inceptionPhase),
          (msg) => adt("inceptionPhase", msg) as Msg
        )
      : null;
  const prototypeModal = () =>
    hasPhase(state, SWUProposalPhaseType.Prototype)
      ? mapPageModalMsg(
          Phase.getModal(state.prototypePhase),
          (msg) => adt("prototypePhase", msg) as Msg
        )
      : null;
  const implementationModal = () =>
    mapPageModalMsg(
      Phase.getModal(state.implementationPhase),
      (msg) => adt("implementationPhase", msg) as Msg
    );
  return inceptionModal() || prototypeModal() || implementationModal();
};
