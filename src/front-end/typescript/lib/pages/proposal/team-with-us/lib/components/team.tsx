import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as Implementation from "front-end/lib/pages/proposal/team-with-us/lib/components/implementation";
import React from "react";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import {
  CreateValidationErrors,
  TWUProposal
} from "shared/lib/resources/proposal/team-with-us";
import { adt, ADT, Id } from "shared/lib/types";

export interface Params {
  orgId?: Id;
  affiliations: AffiliationMember[];
  opportunity: TWUOpportunity;
  proposal?: TWUProposal;
}

export interface State extends Omit<Params, "orgId"> {
  orgId: Id | null;
  teamMembers: Immutable<Implementation.State>;
}

export type Msg = ADT<"teamMembers", Implementation.Msg>;

export function setAffiliations(
  state: Immutable<State>,
  affiliations: AffiliationMember[],
  orgId: Id
): Immutable<State> {
  return state
    .set("orgId", orgId)
    .update("teamMembers", (s) =>
      Implementation.setAffiliations(s, affiliations, orgId)
    );
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  const { orgId, affiliations, opportunity, proposal } = params;
  const [teamMembersState, teamMembersCmds] = Implementation.init({
    orgId,
    affiliations
  });
  return [
    {
      affiliations,
      opportunity,
      proposal,
      orgId: orgId || null,
      teamMembers: immutable(teamMembersState)
    },
    [
      ...component_.cmd.mapMany(
        teamMembersCmds,
        (msg) => adt("teamMembers", msg) as Msg
      )
    ]
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "teamMembers":
      return component_.base.updateChild({
        state,
        childStatePath: ["teamMembers"],
        childUpdate: Implementation.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("teamMembers", value)
      });
  }
};

export interface Values {
  teamMembers: Implementation.Values;
}

export function getValues(state: Immutable<State>): Values {
  const teamMembers = Implementation.getValues(state.teamMembers);
  return { teamMembers };
}

interface MemberValues {
  teamMembers: Implementation.Member[];
}

export function getAddedMembers(state: Immutable<State>): MemberValues {
  return {
    teamMembers: Implementation.getAddedMembers(state.teamMembers)
  };
}

export type Errors = Pick<CreateValidationErrors, "implementation">;

export function setErrors(
  state: Immutable<State>,
  errors: Errors
): Immutable<State> {
  return state.update("teamMembers", (s) =>
    Implementation.setErrors(s, errors.implementation)
  );
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state.update("teamMembers", (s) => Implementation.validate(s));
}

export function isValid(state: Immutable<State>): boolean {
  return Implementation.isValid(state.teamMembers);
}

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  const isImplementationValid = Implementation.isValid(state.teamMembers);
  return (
    <div>
      <Implementation.view
        state={state.teamMembers}
        dispatch={component_.base.mapDispatch(dispatch, (value) =>
          adt("teamMembers" as const, value)
        )}
        icon={isImplementationValid ? "cogs" : "exclamation-circle"}
        iconColor={isImplementationValid ? undefined : "warning"}
        title={"Resource"}
        disabled={disabled}
      />
    </div>
  );
};

export const getModal: component_.page.GetModal<State, Msg> = (state) => {
  const implementationModal = () =>
    component_.page.modal.map(
      Implementation.getModal(state.teamMembers),
      (msg) => adt("teamMembers", msg) as Msg
    );
  const activeModal = [implementationModal()].filter(
    (modal) => modal && modal.tag === "show"
  );
  return activeModal[0] ?? implementationModal();
};
