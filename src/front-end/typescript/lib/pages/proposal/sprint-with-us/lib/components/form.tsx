import {
  DEFAULT_ORGANIZATION_LOGO_IMAGE_PATH,
  DEFAULT_USER_AVATAR_IMAGE_PATH,
  EMPTY_STRING
} from "front-end/config";
import { fileBlobPath, makeStartLoading, makeStopLoading } from "front-end/lib";
import * as FormField from "front-end/lib/components/form-field";
import * as NumberField from "front-end/lib/components/form-field/number";
import * as Select from "front-end/lib/components/form-field/select";
import * as TabbedForm from "front-end/lib/components/tabbed-form";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import {
  makeViewTeamMemberModal,
  PendingBadge
} from "front-end/lib/pages/organization/lib/views/team-member";
import * as Phase from "front-end/lib/pages/proposal/sprint-with-us/lib/components/phase";
import * as References from "front-end/lib/pages/proposal/sprint-with-us/lib/components/references";
import * as Team from "front-end/lib/pages/proposal/sprint-with-us/lib/components/team";
import * as TeamQuestions from "front-end/lib/pages/proposal/sprint-with-us/lib/components/team-questions";
import Accordion from "front-end/lib/views/accordion";
import Badge from "front-end/lib/views/badge";
import DescriptionList from "front-end/lib/views/description-list";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import Link, {
  imageLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import Markdown, { ProposalMarkdown } from "front-end/lib/views/markdown";
import { find } from "lodash";
import React from "react";
import { Alert, Col, Row } from "reactstrap";
import { formatAmount, formatDate } from "shared/lib";
import {
  AffiliationMember,
  MembershipStatus
} from "shared/lib/resources/affiliation";
import {
  isSWUOpportunityAcceptingProposals,
  SWUOpportunity,
  SWUOpportunityPhase,
  SWUOpportunityPhaseType,
  swuOpportunityPhaseTypeToTitleCase
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  doesOrganizationMeetSWUQualification,
  OrganizationSlim
} from "shared/lib/resources/organization";
import {
  CreateRequestBody,
  CreateSWUProposalStatus,
  CreateSWUProposalTeamQuestionResponseBody,
  CreateValidationErrors,
  SWUProposal,
  SWUProposalPhaseType,
  swuProposalPhaseTypeToTitleCase,
  UpdateEditValidationErrors
} from "shared/lib/resources/proposal/sprint-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import * as proposalValidation from "shared/lib/validation/proposal/sprint-with-us";

export type TabId =
  | "Evaluation"
  | "Team"
  | "Pricing"
  | "Team Questions"
  | "References"
  | "Review Proposal";

const TabbedFormComponent = TabbedForm.makeComponent<TabId>();

export interface Params {
  viewerUser: User;
  opportunity: SWUOpportunity;
  organizations: OrganizationSlim[];
  evaluationContent: string;
  proposal?: SWUProposal;
  activeTab?: TabId;
}

export function getActiveTab(state: Immutable<State>): TabId {
  return TabbedForm.getActiveTab(state.tabbedForm);
}

type ModalId = ADT<"viewTeamMember", Phase.Member>;

export interface State
  extends Pick<
    Params,
    "viewerUser" | "opportunity" | "evaluationContent" | "organizations"
  > {
  proposal: SWUProposal | null;
  showModal: ModalId | null;
  getAffiliationsLoading: number;
  tabbedForm: Immutable<TabbedForm.State<TabId>>;
  viewerUser: User;
  // Team Tab
  organization: Immutable<Select.State>;
  team: Immutable<Team.State>;
  // Pricing Tab
  inceptionCost: Immutable<NumberField.State>;
  prototypeCost: Immutable<NumberField.State>;
  implementationCost: Immutable<NumberField.State>;
  totalCost: Immutable<NumberField.State>;
  // Team Questions Tab
  teamQuestions: Immutable<TeamQuestions.State>;
  // References Tab
  references: Immutable<References.State>;
  // Review Proposal Tab
  isReviewInceptionPhaseAccordionOpen: boolean;
  isReviewPrototypePhaseAccordionOpen: boolean;
  isReviewImplementationPhaseAccordionOpen: boolean;
  openReviewTeamQuestionResponseAccordions: Set<number>;
  existingProposalForOrganizationError: Id | null;
}

export type Msg =
  | ADT<"onInitResponse", AffiliationMember[]>
  | ADT<"tabbedForm", TabbedForm.Msg<TabId>>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  // Team Tab
  | ADT<"organization", Select.Msg>
  | ADT<"onGetAffiliationsResponse", [Id, AffiliationMember[]]>
  | ADT<"team", Team.Msg>
  // Pricing Tab
  | ADT<"inceptionCost", NumberField.Msg>
  | ADT<"prototypeCost", NumberField.Msg>
  | ADT<"implementationCost", NumberField.Msg>
  | ADT<"totalCost", NumberField.Msg>
  // Team Questions Tab
  | ADT<"teamQuestions", TeamQuestions.Msg>
  // References Tab
  | ADT<"references", References.Msg>
  // Review Proposal Tab
  | ADT<"toggleReviewInceptionPhaseAccordion">
  | ADT<"toggleReviewPrototypePhaseAccordion">
  | ADT<"toggleReviewImplementationPhaseAccordion">
  | ADT<"toggleReviewTeamQuestionResponseAccordion", number>;

const DEFAULT_ACTIVE_TAB: TabId = "Evaluation";

function getAffiliations(orgId?: Id): component_.Cmd<AffiliationMember[]> {
  if (!orgId) {
    return component_.cmd.dispatch([]);
  }
  return api.affiliations.readManyForOrganization<AffiliationMember[]>(orgId)(
    (response) => api.getValidValue(response, [])
  );
}

function isSelectedOrgQualified(
  orgId: Id,
  opportunity: SWUOpportunity,
  organizations: OrganizationSlim[]
): [boolean, OrganizationSlim?] {
  if (!isSWUOpportunityAcceptingProposals(opportunity)) {
    return [true];
  }
  const org = find(organizations, ({ id }) => id === orgId);
  return [
    !org || !doesOrganizationMeetSWUQualification(org) ? false : true,
    org
  ];
}

export const init: component_.base.Init<Params, State, Msg> = ({
  viewerUser,
  opportunity,
  organizations,
  evaluationContent,
  proposal,
  activeTab = DEFAULT_ACTIVE_TAB
}) => {
  const inceptionCost = proposal?.inceptionPhase?.proposedCost || 0;
  const prototypeCost = proposal?.prototypePhase?.proposedCost || 0;
  const implementationCost = proposal?.implementationPhase?.proposedCost || 0;
  const organizationOptions = organizations
    .filter((o) => doesOrganizationMeetSWUQualification(o))
    .map(({ id, legalName }) => ({ label: legalName, value: id }));
  const selectedOrganizationOption = proposal?.organization
    ? {
        label: proposal.organization.legalName,
        value: proposal.organization.id
      }
    : null;
  const [tabbedFormState, tabbedFormCmds] = TabbedFormComponent.init({
    tabs: [
      "Evaluation",
      "Team",
      "Pricing",
      "Team Questions",
      "References",
      "Review Proposal"
    ],
    activeTab
  });
  const [organizationState, organizationCmds] = Select.init({
    errors: [],
    validate: (option) => {
      if (!option) {
        return invalid(["Please select an organization."]);
      }
      if (
        !isSelectedOrgQualified(option.value, opportunity, organizations)[0]
      ) {
        return invalid([
          "Please select an organization that is a Qualified Supplier."
        ]);
      }
      return valid(option);
    },
    child: {
      value: selectedOrganizationOption,
      id: "swu-proposal-organization",
      options: adt("options", organizationOptions)
    }
  });
  const [teamState, teamCmds] = Team.init({
    opportunity,
    orgId: proposal?.organization?.id,
    affiliations: [], // Re-initialize with affiliations once loaded.
    proposal
  });
  const [inceptionCostState, inceptionCostCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid([
          `Please enter a valid proposed cost for the ${swuProposalPhaseTypeToTitleCase(
            SWUProposalPhaseType.Inception
          )} phase.`
        ]);
      }
      return proposalValidation.validateSWUPhaseProposedCost(
        v,
        opportunity.inceptionPhase?.maxBudget || 0
      );
    },
    child: {
      value: inceptionCost || null,
      id: "swu-proposal-inception-cost",
      min: 1
    }
  });
  const [prototypeCostState, prototypeCostCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid([
          `Please enter a valid proposed cost for the ${swuProposalPhaseTypeToTitleCase(
            SWUProposalPhaseType.Prototype
          )} phase.`
        ]);
      }
      return proposalValidation.validateSWUPhaseProposedCost(
        v,
        opportunity.prototypePhase?.maxBudget || 0
      );
    },
    child: {
      value: prototypeCost || null,
      id: "swu-proposal-prototype-cost",
      min: 1
    }
  });
  const [implementationCostState, implementationCostCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid([
          `Please enter a valid proposed cost for the ${swuProposalPhaseTypeToTitleCase(
            SWUProposalPhaseType.Implementation
          )} phase.`
        ]);
      }
      return proposalValidation.validateSWUPhaseProposedCost(
        v,
        opportunity.implementationPhase?.maxBudget || 0
      );
    },
    child: {
      value: implementationCost || null,
      id: "swu-proposal-implementation-cost",
      min: 1
    }
  });
  const [totalCostState, totalCostCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return valid(v);
      }
      return proposalValidation.validateSWUProposalProposedCost(
        v,
        0,
        0,
        opportunity.totalMaxBudget
      );
    },
    child: {
      value: inceptionCost + prototypeCost + implementationCost,
      id: "swu-proposal-total-cost",
      min: 1
    }
  });
  const [teamQuestionsState, teamQuestionsCmds] = TeamQuestions.init({
    questions: opportunity.teamQuestions,
    responses: proposal?.teamQuestionResponses || []
  });
  const [referencesState, referencesCmds] = References.init({
    references: proposal?.references || []
  });
  return [
    {
      proposal: proposal || null,
      showModal: null,
      getAffiliationsLoading: 0,
      viewerUser,
      evaluationContent,
      opportunity,
      organizations,
      isReviewInceptionPhaseAccordionOpen: true,
      isReviewPrototypePhaseAccordionOpen: true,
      isReviewImplementationPhaseAccordionOpen: true,
      openReviewTeamQuestionResponseAccordions: new Set(
        opportunity.teamQuestions.map((q, i) => i)
      ),
      tabbedForm: immutable(tabbedFormState),
      organization: immutable(organizationState),
      team: immutable(teamState),
      inceptionCost: immutable(inceptionCostState),
      prototypeCost: immutable(prototypeCostState),
      implementationCost: immutable(implementationCostState),
      totalCost: immutable(totalCostState),
      teamQuestions: immutable(teamQuestionsState),
      references: immutable(referencesState),
      existingProposalForOrganizationError: null
    },
    [
      ...component_.cmd.mapMany(tabbedFormCmds, (msg) =>
        adt("tabbedForm", msg)
      ),
      ...component_.cmd.mapMany(organizationCmds, (msg) =>
        adt("organization", msg)
      ),
      ...component_.cmd.mapMany(teamCmds, (msg) => adt("team", msg)),
      ...component_.cmd.mapMany(inceptionCostCmds, (msg) =>
        adt("inceptionCost", msg)
      ),
      ...component_.cmd.mapMany(prototypeCostCmds, (msg) =>
        adt("prototypeCost", msg)
      ),
      ...component_.cmd.mapMany(implementationCostCmds, (msg) =>
        adt("implementationCost", msg)
      ),
      ...component_.cmd.mapMany(totalCostCmds, (msg) => adt("totalCost", msg)),
      ...component_.cmd.mapMany(teamQuestionsCmds, (msg) =>
        adt("teamQuestions", msg)
      ),
      ...component_.cmd.mapMany(referencesCmds, (msg) =>
        adt("references", msg)
      ),
      component_.cmd.map(
        getAffiliations(proposal?.organization?.id),
        (as) => adt("onInitResponse", as) as Msg
      )
    ] as component_.Cmd<Msg>[]
  ];
};

export type Errors = CreateValidationErrors | UpdateEditValidationErrors;

export function setErrors(
  state: Immutable<State>,
  errors?: Errors
): Immutable<State> {
  const organizationErrors = errors?.organization
    ? errors.organization
    : errors?.existingOrganizationProposal
    ? errors.existingOrganizationProposal.errors
    : [];
  return state
    .update("organization", (s) => FormField.setErrors(s, organizationErrors))
    .update("team", (s) =>
      Team.setErrors(s, {
        inceptionPhase: errors?.inceptionPhase,
        prototypePhase: errors?.prototypePhase,
        implementationPhase: errors?.implementationPhase
      })
    )
    .update("inceptionCost", (s) =>
      FormField.setErrors(s, errors?.inceptionPhase?.proposedCost || [])
    )
    .update("prototypeCost", (s) =>
      FormField.setErrors(s, errors?.prototypePhase?.proposedCost || [])
    )
    .update("implementationCost", (s) =>
      FormField.setErrors(s, errors?.implementationPhase?.proposedCost || [])
    )
    .update("totalCost", (s) =>
      FormField.setErrors(
        s,
        (errors && (errors as CreateValidationErrors).totalProposedCost) || []
      )
    )
    .update("teamQuestions", (s) =>
      TeamQuestions.setErrors(
        s,
        (errors && (errors as CreateValidationErrors).teamQuestionResponses) ||
          []
      )
    )
    .update("references", (s) =>
      References.setErrors(s, errors?.references || [])
    )
    .set(
      "existingProposalForOrganizationError",
      errors?.existingOrganizationProposal
        ? errors.existingOrganizationProposal.proposalId
        : null
    );
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state
    .update("organization", (s) => FormField.validate(s))
    .update("team", (s) => Team.validate(s))
    .update("inceptionCost", (s) => FormField.validate(s))
    .update("prototypeCost", (s) => FormField.validate(s))
    .update("implementationCost", (s) => FormField.validate(s))
    .update("totalCost", (s) => FormField.validate(s))
    .update("teamQuestions", (s) => TeamQuestions.validate(s))
    .update("references", (s) => References.validate(s));
}

export function isTeamTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.organization) && Team.isValid(state.team);
}

export function isPricingTabValid(state: Immutable<State>): boolean {
  return (
    (state.opportunity.inceptionPhase
      ? FormField.isValid(state.inceptionCost)
      : true) &&
    (state.opportunity.prototypePhase
      ? FormField.isValid(state.prototypeCost)
      : true) &&
    FormField.isValid(state.implementationCost) &&
    FormField.isValid(state.totalCost)
  );
}

export function isTeamQuestionsTabValid(state: Immutable<State>): boolean {
  return TeamQuestions.isValid(state.teamQuestions);
}

export function isReferencesTabValid(state: Immutable<State>): boolean {
  return References.isValid(state.references);
}

export function isValid(state: Immutable<State>): boolean {
  return (
    isTeamTabValid(state) &&
    isPricingTabValid(state) &&
    isTeamQuestionsTabValid(state) &&
    isReferencesTabValid(state)
  );
}

export function isLoading(state: Immutable<State>): boolean {
  return state.getAffiliationsLoading > 0;
}

export type Values = Omit<CreateRequestBody, "status">;

export function getValues(state: Immutable<State>): Values {
  const team = Team.getValues(state.team);
  const inceptionCost = FormField.getValue(state.inceptionCost);
  const prototypeCost = FormField.getValue(state.prototypeCost);
  const implementationCost = FormField.getValue(state.implementationCost);
  const organization = FormField.getValue(state.organization);
  return {
    opportunity: state.opportunity.id,
    organization: organization?.value,
    inceptionPhase: team.inceptionPhase && {
      ...team.inceptionPhase,
      proposedCost: inceptionCost || 0
    },
    prototypePhase: team.prototypePhase && {
      ...team.prototypePhase,
      proposedCost: prototypeCost || 0
    },
    implementationPhase: {
      ...team.implementationPhase,
      proposedCost: implementationCost || 0
    },
    references: References.getValues(state.references),
    teamQuestionResponses: TeamQuestions.getValues(state.teamQuestions),
    attachments: []
  };
}

export function getSelectedOrganization(
  state: Immutable<State>
): OrganizationSlim | null {
  const value = FormField.getValue(state.organization);
  return (value && find(state.organizations, { id: value.value })) || null;
}

export type PersistAction =
  | ADT<"create", CreateSWUProposalStatus>
  | ADT<"update", Id>;

export type PersistResult = Validation<
  [Immutable<State>, SWUProposal],
  Immutable<State>
>;

export function persist(
  state: Immutable<State>,
  action: PersistAction
): component_.Cmd<PersistResult> {
  const formValues = getValues(state);
  switch (action.tag) {
    case "create":
      return api.proposals.swu.create<PersistResult>()(
        {
          ...formValues,
          opportunity: state.opportunity.id,
          status: action.value
        },
        (response) => {
          switch (response.tag) {
            case "valid":
              state = setErrors(state, {});
              return valid([state, response.value]);
            case "invalid":
              return invalid(setErrors(state, response.value));
            case "unhandled":
              return invalid(state);
          }
        }
      );
    case "update": {
      return api.proposals.swu.update<PersistResult>()(
        action.value,
        adt("edit" as const, formValues),
        (response) => {
          switch (response.tag) {
            case "valid":
              state = setErrors(state, {});
              return valid([state, response.value]);
            case "invalid":
              if (
                response.value.proposal &&
                response.value.proposal.tag === "edit"
              ) {
                return invalid(setErrors(state, response.value.proposal.value));
              } else {
                return invalid(state);
              }
            case "unhandled":
              return invalid(state);
          }
        }
      );
    }
  }
}

function updateTotalCost(state: Immutable<State>): Immutable<State> {
  const inceptionCost = FormField.getValue(state.inceptionCost) || 0;
  const prototypeCost = FormField.getValue(state.prototypeCost) || 0;
  const implementationCost = FormField.getValue(state.implementationCost) || 0;
  const total = inceptionCost + prototypeCost + implementationCost;
  return state.update("totalCost", (s) => {
    s = FormField.setValue(s, total);
    return FormField.validate(s);
  });
}

const startGetAffiliationsLoading = makeStartLoading<State>(
  "getAffiliationsLoading"
);
const stopGetAffiliationsLoading = makeStopLoading<State>(
  "getAffiliationsLoading"
);

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const affiliations = msg.value;
      const [teamState, teamCmds] = Team.init({
        opportunity: state.opportunity,
        orgId: state.proposal?.organization?.id || undefined,
        affiliations,
        proposal: state.proposal || undefined
      });
      return [
        state.set("team", immutable(teamState)),
        component_.cmd.mapMany(teamCmds, (msg) => adt("team", msg) as Msg)
      ];
    }
    case "tabbedForm":
      return component_.base.updateChild({
        state,
        childStatePath: ["tabbedForm"],
        childUpdate: TabbedFormComponent.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("tabbedForm", value)
      });

    case "showModal":
      return [state.set("showModal", msg.value), []];

    case "hideModal":
      return [state.set("showModal", null), []];

    case "organization":
      return component_.base.updateChild({
        state,
        childStatePath: ["organization"],
        childUpdate: Select.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("organization", value),
        updateAfter: (state) => {
          const orgId = FormField.getValue(state.organization)?.value;
          if (
            msg.value.value?.tag !== "onChange" ||
            !orgId ||
            orgId === state.team.orgId
          ) {
            return [state, []];
          }
          state = startGetAffiliationsLoading(state);
          state = state.update("organization", (s) =>
            FormField.setErrors(s, [])
          );
          return [
            state,
            [
              component_.cmd.map(
                getAffiliations(orgId),
                (as) => adt("onGetAffiliationsResponse", [orgId, as]) as Msg
              )
            ]
          ];
        }
      });

    case "onGetAffiliationsResponse": {
      const [orgId, affiliations] = msg.value;
      state = state.update("team", (t) =>
        Team.setAffiliations(t, affiliations, orgId)
      );
      return [stopGetAffiliationsLoading(state), []];
    }

    case "team":
      return component_.base.updateChild({
        state,
        childStatePath: ["team"],
        childUpdate: Team.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("team", value)
      });

    case "inceptionCost":
      return component_.base.updateChild({
        state,
        childStatePath: ["inceptionCost"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("inceptionCost", value),
        updateAfter: (state) => [updateTotalCost(state), []]
      });

    case "prototypeCost":
      return component_.base.updateChild({
        state,
        childStatePath: ["prototypeCost"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("prototypeCost", value),
        updateAfter: (state) => [updateTotalCost(state), []]
      });

    case "implementationCost":
      return component_.base.updateChild({
        state,
        childStatePath: ["implementationCost"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("implementationCost", value),
        updateAfter: (state) => [updateTotalCost(state), []]
      });

    case "totalCost":
      return component_.base.updateChild({
        state,
        childStatePath: ["totalCost"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("totalCost", value)
      });

    case "teamQuestions":
      return component_.base.updateChild({
        state,
        childStatePath: ["teamQuestions"],
        childUpdate: TeamQuestions.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("teamQuestions", value)
      });

    case "references":
      return component_.base.updateChild({
        state,
        childStatePath: ["references"],
        childUpdate: References.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("references", value)
      });

    case "toggleReviewInceptionPhaseAccordion":
      return [
        state.update("isReviewInceptionPhaseAccordionOpen", (v) => !v),
        []
      ];

    case "toggleReviewPrototypePhaseAccordion":
      return [
        state.update("isReviewPrototypePhaseAccordionOpen", (v) => !v),
        []
      ];

    case "toggleReviewImplementationPhaseAccordion":
      return [
        state.update("isReviewImplementationPhaseAccordionOpen", (v) => !v),
        []
      ];

    case "toggleReviewTeamQuestionResponseAccordion":
      return [
        state.update("openReviewTeamQuestionResponseAccordions", (s) => {
          if (s.has(msg.value)) {
            s.delete(msg.value);
          } else {
            s.add(msg.value);
          }
          return s;
        }),
        []
      ];
  }
};

export const EvaluationView: component_.base.View<Props> = ({ state }) => {
  return (
    <Row>
      <Col xs="12">
        <Markdown openLinksInNewTabs source={state.evaluationContent} />
      </Col>
      <Col xs="12">
        <h4 className="mt-5 mb-3">Scoring Table</h4>
        <div className="table-responsive">
          <table className="table-hover">
            <thead className="table-light">
              <tr>
                <th style={{ width: "100%" }}>Evaluation Criteria</th>
                <th style={{ width: "0px" }}>Weightings</th>
                <th className="text-nowrap" style={{ width: "0px" }}>
                  Minimum Score
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Step 1: Team Questions</td>
                <td>{state.opportunity.questionsWeight}%</td>
                <td>{EMPTY_STRING}</td>
              </tr>
              <tr>
                <td>Step 2: Shortlisting</td>
                <td>{EMPTY_STRING}</td>
                <td>{EMPTY_STRING}</td>
              </tr>
              <tr>
                <td>Step 3: Code Challenge</td>
                <td>{state.opportunity.codeChallengeWeight}%</td>
                <td>80%</td>
              </tr>
              <tr>
                <td>Step 4: Team Scenario</td>
                <td>{state.opportunity.scenarioWeight}%</td>
                <td>{EMPTY_STRING}</td>
              </tr>
              <tr>
                <td>Step 5: Price</td>
                <td>{state.opportunity.priceWeight}%</td>
                <td>{EMPTY_STRING}</td>
              </tr>
              <tr>
                <td>
                  <strong>TOTAL</strong>
                </td>
                <td>
                  <strong>100%</strong>
                </td>
                <td>{EMPTY_STRING}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Col>
    </Row>
  );
};

export const TeamView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  const isGetAffiliationsLoading = state.getAffiliationsLoading > 0;
  return (
    <div>
      <Row>
        <Col xs="12">
          <p>
            Select your organization and team members for each phase of this
            Sprint With Us opportunity. In order to submit your proposal for
            consideration, you must:
          </p>
          <ul className="mb-5">
            <li>Select at least two members for each phase; and</li>
            <li>
              Ensure the aggregate of your team{"'"}s capabilities must satisfy
              all of the required capabilities for each phase.
            </li>
          </ul>
        </Col>
        <Col xs="12">
          <Select.view
            extraChildProps={{
              loading: isGetAffiliationsLoading
            }}
            required
            className="mb-0"
            label="Organization"
            placeholder="Organization"
            help="Select the Organization that will complete the work as outlined in the opportunity’s acceptance criteria."
            hint={
              state.viewerUser.type === UserType.Vendor ? (
                <span>
                  If the organization you are looking for is not listed in this
                  dropdown, please ensure that you have created the organization
                  in{" "}
                  <Link
                    newTab
                    dest={routeDest(
                      adt("userProfile", {
                        userId: state.viewerUser.id,
                        tab: "organizations" as const
                      })
                    )}>
                    your user profile
                  </Link>{" "}
                  and it is qualified to apply for Sprint With Us opportunities.
                  Also, please make sure that you have saved this proposal
                  beforehand to avoid losing any unsaved changes you might have
                  made.
                </span>
              ) : undefined
            }
            state={state.organization}
            dispatch={component_.base.mapDispatch(dispatch, (v) =>
              adt("organization" as const, v)
            )}
            disabled={disabled}
          />
        </Col>
        {FormField.getValue(state.organization) ? (
          <Col xs="12">
            <div className="mt-5 pt-5 border-top">
              <Team.view
                disabled={disabled}
                state={state.team}
                dispatch={component_.base.mapDispatch(dispatch, (value) =>
                  adt("team" as const, value)
                )}
              />
            </div>
          </Col>
        ) : null}
      </Row>
    </div>
  );
};

export const PricingView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  const {
    inceptionPhase,
    prototypePhase,
    implementationPhase,
    totalMaxBudget
  } = state.opportunity;
  return (
    <div>
      <Row>
        <Col xs="12" className="mb-4">
          <p>
            Propose a Total Cost for each of this opportunity{"'"}s phases using
            the fields provided below. In order to submit your proposal for
            consideration, you must:
          </p>
          <ul>
            <li>Not exceed the maximum budget for each phase; and</li>
            <li>Not exceed the total maximum budget for the opportunity.</li>
          </ul>
        </Col>
      </Row>
      {inceptionPhase ? (
        <Row>
          <Col xs="12" md="6">
            <NumberField.view
              required
              extraChildProps={{ prefix: "$" }}
              label={`${swuOpportunityPhaseTypeToTitleCase(
                SWUOpportunityPhaseType.Inception
              )} Cost`}
              placeholder={`${swuOpportunityPhaseTypeToTitleCase(
                SWUOpportunityPhaseType.Inception
              )} Cost`}
              help="Provide a dollar value for the expected cost to complete the work required for this phase."
              hint={`Maximum phase budget is ${formatAmount(
                inceptionPhase.maxBudget,
                "$"
              )}`}
              disabled={disabled}
              state={state.inceptionCost}
              dispatch={component_.base.mapDispatch(dispatch, (value) =>
                adt("inceptionCost" as const, value)
              )}
            />
          </Col>
        </Row>
      ) : null}
      {prototypePhase ? (
        <Row>
          <Col xs="12" md="6">
            <NumberField.view
              required
              extraChildProps={{ prefix: "$" }}
              label={`${swuOpportunityPhaseTypeToTitleCase(
                SWUOpportunityPhaseType.Prototype
              )} Cost`}
              placeholder={`${swuOpportunityPhaseTypeToTitleCase(
                SWUOpportunityPhaseType.Prototype
              )} Cost`}
              help="Provide a dollar value for the expected cost to complete the work required for this phase."
              hint={`Maximum phase budget is ${formatAmount(
                prototypePhase.maxBudget,
                "$"
              )}`}
              disabled={disabled}
              state={state.prototypeCost}
              dispatch={component_.base.mapDispatch(dispatch, (value) =>
                adt("prototypeCost" as const, value)
              )}
            />
          </Col>
        </Row>
      ) : null}
      <Row>
        <Col xs="12" md="6">
          <NumberField.view
            required
            extraChildProps={{ prefix: "$" }}
            label={`${swuOpportunityPhaseTypeToTitleCase(
              SWUOpportunityPhaseType.Implementation
            )} Cost`}
            placeholder={`${swuOpportunityPhaseTypeToTitleCase(
              SWUOpportunityPhaseType.Implementation
            )} Cost`}
            help="Provide a dollar value for the expected cost to complete the work required for this phase."
            hint={`Maximum phase budget is ${formatAmount(
              implementationPhase.maxBudget,
              "$"
            )}`}
            disabled={disabled}
            state={state.implementationCost}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("implementationCost" as const, value)
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="6">
          <NumberField.view
            extraChildProps={{ prefix: "$" }}
            label="Total Proposed Cost"
            placeholder="Total Proposed Cost"
            hint={`Maximum opportunity budget is ${formatAmount(
              totalMaxBudget,
              "$"
            )}`}
            disabled
            state={state.totalCost}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("totalCost" as const, value)
            )}
          />
        </Col>
      </Row>
    </div>
  );
};

export const TeamQuestionsView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
      <Col xs="12">
        <p className="mb-4">
          Provide a response to each of the team questions below. Please note
          that responses that exceed the word limit will receive a score of
          zero.
        </p>
        <Alert color="danger" fade={false} className="mb-5">
          <div>
            <strong>Important!</strong> Do not reference your organization{"'"}s
            name, a team member{"'"}s name or specific company software in any
            of your responses.
          </div>
          <br />
          <div>
            No points will be awarded for any Proponent answer to any question
            in this step that references the Proponent{"'"}s organization name,
            Resource name, or specific company software.
          </div>
        </Alert>
      </Col>
      <Col xs="12">
        <TeamQuestions.view
          disabled={disabled}
          state={state.teamQuestions}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("teamQuestions" as const, value)
          )}
        />
      </Col>
    </Row>
  );
};

export const ReferencesView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <div>
      <Row>
        <Col xs="12">
          <p className="mb-4">
            Provide the names and contact information of three references who
            will support your claims of experience and who can verify the
            quality of your work.
          </p>
          <Alert color="danger" fade={false} className="mb-5">
            <strong>Important!</strong> Please note that references from your
            own organization or team members will not be accepted.
          </Alert>
        </Col>
      </Row>
      <References.view
        disabled={disabled}
        state={state.references}
        dispatch={component_.base.mapDispatch(dispatch, (v) =>
          adt("references" as const, v)
        )}
      />
    </div>
  );
};

interface ReviewPhaseViewProps {
  className?: string;
  title: string;
  icon: AvailableIcons;
  proposedCost: number;
  opportunityPhase: SWUOpportunityPhase;
  members: Phase.Member[];
  isOpen: boolean;
  toggleAccordion(): void;
  viewTeamMember(m: Phase.Member): void;
}

const ReviewPhaseView: component_.base.View<ReviewPhaseViewProps> = ({
  className,
  title,
  icon,
  proposedCost,
  opportunityPhase,
  members,
  toggleAccordion,
  isOpen,
  viewTeamMember
}) => {
  return (
    <Accordion
      className={className}
      toggle={() => toggleAccordion()}
      color="info"
      title={title}
      titleClassName="h3 mb-0"
      icon={icon}
      iconWidth={2}
      iconHeight={2}
      iconClassName="me-3"
      chevronWidth={1.5}
      chevronHeight={1.5}
      open={isOpen}>
      <div className="d-flex flex-nowrap align-items-center mb-2">
        <Icon name="calendar" width={0.9} height={0.9} className="me-1" />
        <span className="fw-bold me-2">Phase Dates</span>
        <span>
          {formatDate(opportunityPhase.startDate)} to{" "}
          {formatDate(opportunityPhase.completionDate)}
        </span>
      </div>
      <div className="d-flex flex-nowrap align-items-center">
        <Icon name="comment-dollar" width={0.9} height={0.9} className="me-1" />
        <span className="fw-bold me-2">Proposed Phase Cost</span>
        <span>{formatAmount(proposedCost, "$")}</span>
      </div>
      <div className="mt-4">
        <h4 className="mb-4">Team Member(s)</h4>
        {members.length ? (
          <div className="border-top">
            {members.map((m, i) => (
              <div
                className="p-2 d-flex align-items-center border-bottom"
                key={`swu-proposal-review-phase-member-${i}`}>
                <Link
                  onClick={() => viewTeamMember(m)}
                  symbol_={leftPlacement(
                    imageLinkSymbol(
                      m.user.avatarImageFile
                        ? fileBlobPath(m.user.avatarImageFile)
                        : DEFAULT_USER_AVATAR_IMAGE_PATH
                    )
                  )}>
                  {m.user.name}
                </Link>
                {m.scrumMaster ? (
                  <Badge
                    text="Scrum Master"
                    color="c-proposal-swu-form-scrum-master"
                    className="ms-3"
                  />
                ) : null}
                {m.membershipStatus === MembershipStatus.Pending ? (
                  <PendingBadge className={m.scrumMaster ? "ms-2" : "ms-3"} />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          "You have not yet assigned team members for this phase."
        )}
      </div>
    </Accordion>
  );
};

interface ReviewTeamQuestionResponseViewProps {
  opportunity: SWUOpportunity;
  response: CreateSWUProposalTeamQuestionResponseBody;
  index: number;
  isOpen: boolean;
  className?: string;
  toggleAccordion(): void;
}

function getQuestionTextByOrder(
  opp: SWUOpportunity,
  order: number
): string | null {
  for (const q of opp.teamQuestions) {
    if (q.order === order) {
      return q.question;
    }
  }
  return null;
}

const ReviewTeamQuestionResponseView: component_.base.View<
  ReviewTeamQuestionResponseViewProps
> = ({ opportunity, response, index, isOpen, className, toggleAccordion }) => {
  const questionText = getQuestionTextByOrder(opportunity, response.order);
  if (!questionText) {
    return null;
  }
  return (
    <Accordion
      className={className}
      toggle={() => toggleAccordion()}
      color="c-proposal-swu-form-team-question-response-heading"
      title={`Question ${index + 1}`}
      titleClassName="h3 mb-0"
      chevronWidth={1.5}
      chevronHeight={1.5}
      open={isOpen}>
      <p style={{ whiteSpace: "pre-line" }} className="mb-4">
        {questionText}
      </p>
      <ProposalMarkdown
        box
        source={
          response.response ||
          "You have not yet entered a response for this question."
        }
      />
    </Accordion>
  );
};

export const ReviewProposalView: component_.base.View<Props> = ({
  state,
  dispatch
}) => {
  const phaseMembers = Team.getAddedMembers(state.team);
  const organization =
    state.proposal?.organization ?? getSelectedOrganization(state);
  const opportunity = state.opportunity;
  return (
    <Row>
      <Col xs="12">
        <p className="mb-0">
          This is a summary of your proposal for this Sprint With Us
          opportunity. Be sure to review all information for accuracy prior to
          submitting your proposal.
        </p>
      </Col>
      <Col xs="12">
        <div className="mt-5 pt-5 border-top">
          <h2>Organization Info</h2>
          {organization ? (
            <div>
              <p className="mb-4">
                Please review your organization{"'"}s information to ensure it
                is up-to-date by clicking on the link below.
              </p>
              <Link
                newTab
                symbol_={leftPlacement(
                  imageLinkSymbol(
                    organization.logoImageFile
                      ? fileBlobPath(organization.logoImageFile)
                      : DEFAULT_ORGANIZATION_LOGO_IMAGE_PATH
                  )
                )}
                symbolClassName="border"
                dest={routeDest(adt("orgEdit", { orgId: organization.id }))}>
                Review Organization: {organization.legalName}
              </Link>
            </div>
          ) : (
            "You have not yet selected an organization for this proposal."
          )}
        </div>
      </Col>
      <Col xs="12">
        <div className="mt-5 pt-5 border-top">
          <h2 className="mb-4">Phases</h2>
          <div className="d-flex flex-nowrap align-items-center mb-4">
            <Icon
              name="comment-dollar"
              width={0.9}
              height={0.9}
              className="me-1"
            />
            <span className="fw-bold me-2">Total Proposed Cost</span>
            <span>
              {formatAmount(FormField.getValue(state.totalCost) || 0, "$")}
            </span>
          </div>
          {phaseMembers.inceptionPhase && opportunity.inceptionPhase ? (
            <ReviewPhaseView
              className="mb-4"
              title={swuOpportunityPhaseTypeToTitleCase(
                SWUOpportunityPhaseType.Inception
              )}
              icon="map"
              proposedCost={FormField.getValue(state.inceptionCost) || 0}
              opportunityPhase={opportunity.inceptionPhase}
              members={phaseMembers.inceptionPhase}
              isOpen={state.isReviewInceptionPhaseAccordionOpen}
              toggleAccordion={() =>
                dispatch(adt("toggleReviewInceptionPhaseAccordion"))
              }
              viewTeamMember={(m) =>
                dispatch(adt("showModal", adt("viewTeamMember", m)) as Msg)
              }
            />
          ) : null}
          {phaseMembers.prototypePhase && opportunity.prototypePhase ? (
            <ReviewPhaseView
              className="mb-4"
              title={swuOpportunityPhaseTypeToTitleCase(
                SWUOpportunityPhaseType.Prototype
              )}
              icon="rocket"
              proposedCost={FormField.getValue(state.prototypeCost) || 0}
              opportunityPhase={opportunity.prototypePhase}
              members={phaseMembers.prototypePhase}
              isOpen={state.isReviewPrototypePhaseAccordionOpen}
              toggleAccordion={() =>
                dispatch(adt("toggleReviewPrototypePhaseAccordion"))
              }
              viewTeamMember={(m) =>
                dispatch(adt("showModal", adt("viewTeamMember", m)) as Msg)
              }
            />
          ) : null}
          <ReviewPhaseView
            title={swuOpportunityPhaseTypeToTitleCase(
              SWUOpportunityPhaseType.Implementation
            )}
            icon="cogs"
            proposedCost={FormField.getValue(state.implementationCost) || 0}
            opportunityPhase={opportunity.implementationPhase}
            members={phaseMembers.implementationPhase}
            isOpen={state.isReviewImplementationPhaseAccordionOpen}
            toggleAccordion={() =>
              dispatch(adt("toggleReviewImplementationPhaseAccordion"))
            }
            viewTeamMember={(m) =>
              dispatch(adt("showModal", adt("viewTeamMember", m)) as Msg)
            }
          />
        </div>
      </Col>
      <Col xs="12">
        <div className="mt-5 pt-5 border-top">
          <h2 className="mb-4">References</h2>
          <DescriptionList
            items={References.getValues(state.references).map((r, i) => ({
              name: `Reference ${i + 1}`,
              children:
                r.name || r.company || r.phone || r.email ? (
                  <div>
                    {r.name ? <div>{r.name}</div> : null}
                    {r.company ? <div>{r.company}</div> : null}
                    {r.phone ? <div>{r.phone}</div> : null}
                    {r.email ? <div>{r.email}</div> : null}
                  </div>
                ) : (
                  EMPTY_STRING
                )
            }))}
          />
        </div>
      </Col>
      <Col xs="12">
        <div className="mt-5 pt-5 border-top">
          <h2 className="mb-4">Team Questions{"'"} Responses</h2>
          {TeamQuestions.getValues(state.teamQuestions).map((r, i, rs) => (
            <ReviewTeamQuestionResponseView
              key={`swu-proposal-review-team-question-response-${i}`}
              className={i < rs.length - 1 ? "mb-4" : ""}
              opportunity={state.opportunity}
              isOpen={state.openReviewTeamQuestionResponseAccordions.has(i)}
              toggleAccordion={() =>
                dispatch(adt("toggleReviewTeamQuestionResponseAccordion", i))
              }
              index={i}
              response={r}
            />
          ))}
        </div>
      </Col>
    </Row>
  );
};

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  const props = {
    state,
    dispatch,
    disabled: disabled || isLoading(state)
  };
  const activeTab = (() => {
    switch (TabbedForm.getActiveTab(state.tabbedForm)) {
      case "Evaluation":
        return <EvaluationView {...props} />;
      case "Team":
        return <TeamView {...props} />;
      case "Pricing":
        return <PricingView {...props} />;
      case "Team Questions":
        return <TeamQuestionsView {...props} />;
      case "References":
        return <ReferencesView {...props} />;
      case "Review Proposal":
        return <ReviewProposalView {...props} />;
    }
  })();
  return (
    <TabbedFormComponent.view
      valid={isValid(state)}
      disabled={props.disabled}
      getTabLabel={(a) => a}
      isTabValid={(tab) => {
        switch (tab) {
          case "Evaluation":
            return true;
          case "Team":
            return isTeamTabValid(state);
          case "Pricing":
            return isPricingTabValid(state);
          case "Team Questions":
            return isTeamQuestionsTabValid(state);
          case "References":
            return isReferencesTabValid(state);
          case "Review Proposal":
            return true;
        }
      }}
      state={state.tabbedForm}
      dispatch={component_.base.mapDispatch(dispatch, (msg) =>
        adt("tabbedForm" as const, msg)
      )}>
      {activeTab}
    </TabbedFormComponent.view>
  );
};

export const component: component_.base.Component<Params, State, Msg> = {
  init,
  update,
  view
};

export const getModal: component_.page.GetModal<State, Msg> = (state) => {
  const teamModal = component_.page.modal.map(
    Team.getModal(state.team),
    (msg) => adt("team", msg) as Msg
  );
  if (teamModal && teamModal.tag === "show") {
    return teamModal;
  }
  if (!state.showModal) {
    return component_.page.modal.hide();
  }
  switch (state.showModal.tag) {
    case "viewTeamMember":
      return makeViewTeamMemberModal({
        member: state.showModal.value,
        onCloseMsg: adt("hideModal")
      });
  }
};

export function getAlerts<Msg>(
  state: Immutable<State>
): component_.page.Alerts<Msg> {
  const orgId = FormField.getValue(state.organization)?.value;
  if (!orgId) {
    return component_.page.alerts.empty();
  }
  const [isQualified, org] = isSelectedOrgQualified(
    orgId,
    state.opportunity,
    state.organizations
  );
  const meetsCriteria = "meets the criteria to be a Qualified Supplier";
  return {
    warnings: (() => {
      if (!isQualified && !org) {
        return [
          {
            text: (
              <span>
                The organization you have selected has been archived. Please
                select a different organization or{" "}
                <Link newTab dest={routeDest(adt("orgCreate", null))}>
                  create a new one
                </Link>{" "}
                and ensure it {meetsCriteria}.
              </span>
            )
          }
        ];
      } else if (!isQualified && org) {
        return [
          {
            text: (
              <span>
                The organization you have selected does not qualify to submit
                proposals for Sprint With Us opportunties. Please select a
                different organization or ensure it{" "}
                {org ? (
                  <Link
                    newTab
                    dest={routeDest(
                      adt("orgEdit", {
                        orgId: org.id,
                        tab: "swuQualification" as const
                      })
                    )}>
                    {meetsCriteria}
                  </Link>
                ) : (
                  meetsCriteria
                )}
                .
              </span>
            )
          }
        ];
      } else {
        return [];
      }
    })(),
    errors: (() => {
      if (state.existingProposalForOrganizationError) {
        return [
          {
            text: (
              <span>
                The selected organization already has a proposal with this
                opportunity. You may access it{" "}
                <Link
                  dest={routeDest(
                    adt("proposalSWUEdit", {
                      proposalId: state.existingProposalForOrganizationError,
                      opportunityId: state.opportunity.id
                    })
                  )}>
                  here
                </Link>
                .
              </span>
            )
          }
        ];
      }
      return [];
    })()
  };
}
