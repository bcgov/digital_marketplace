import {
  DEFAULT_ORGANIZATION_LOGO_IMAGE_PATH,
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
import * as ResourceQuestions from "front-end/lib/pages/proposal/team-with-us/lib/components/resource-questions";
import Accordion from "front-end/lib/views/accordion";
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
  isTWUOpportunityAcceptingProposals,
  TWUOpportunity
} from "shared/lib/resources/opportunity/team-with-us";
import {
  OrganizationSlim,
  doesOrganizationMeetTWUQualification,
  doesOrganizationProvideServiceArea
} from "shared/lib/resources/organization";
import {
  CreateRequestBody,
  CreateTWUProposalResourceQuestionResponseBody,
  CreateTWUProposalStatus,
  CreateValidationErrors,
  TWUProposal,
  UpdateEditValidationErrors
} from "shared/lib/resources/proposal/team-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import * as proposalValidation from "shared/lib/validation/proposal/team-with-us";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import * as Team from "front-end/lib/pages/proposal/team-with-us/lib/components/team";
import { makeViewTeamMemberModal } from "front-end/lib/pages/organization/lib/views/team-member";
import { userAvatarPath } from "front-end/lib/pages/user/lib";

export type TabId =
  | "Evaluation"
  | "Resource"
  | "Pricing"
  | "Questions"
  | "Review Proposal";

const TabbedFormComponent = TabbedForm.makeComponent<TabId>();

export interface Params {
  viewerUser: User;
  opportunity: TWUOpportunity;
  organizations: OrganizationSlim[];
  evaluationContent: string;
  proposal?: TWUProposal;
  activeTab?: TabId;
}

export function getActiveTab(state: Immutable<State>): TabId {
  return TabbedForm.getActiveTab(state.tabbedForm);
}

type ModalId = ADT<"viewTeamMember", Team.Member>;

export interface State
  extends Pick<
    Params,
    "viewerUser" | "opportunity" | "evaluationContent" | "organizations"
  > {
  proposal: TWUProposal | null;
  showModal: ModalId | null;
  getAffiliationsLoading: number;
  tabbedForm: Immutable<TabbedForm.State<TabId>>;
  viewerUser: User;
  // Team Tab
  organization: Immutable<Select.State>;
  team: Immutable<Team.State>;
  // Pricing Tab
  hourlyRate: Immutable<NumberField.State>;
  // Questions Tab
  resourceQuestions: Immutable<ResourceQuestions.State>;
  // Review Proposal Tab
  openReviewResourceQuestionResponseAccordions: Set<number>;
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
  | ADT<"hourlyRate", NumberField.Msg>
  // Questions Tab
  | ADT<"resourceQuestions", ResourceQuestions.Msg>
  // Review Proposal Tab
  | ADT<"toggleReviewResourceQuestionResponseAccordion", number>;

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
  opportunity: TWUOpportunity,
  organizations: OrganizationSlim[]
): [boolean, OrganizationSlim?] {
  if (!isTWUOpportunityAcceptingProposals(opportunity)) {
    return [true];
  }
  const org = find(organizations, ({ id }) => id === orgId);
  return [
    !org || !doesOrganizationMeetTWUQualification(org) ? false : true,
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
  const organizationOptions = organizations
    .filter(
      (o) =>
        doesOrganizationMeetTWUQualification(o) &&
        doesOrganizationProvideServiceArea(o, opportunity.serviceArea)
    )
    .map(({ id, legalName }) => ({ label: legalName, value: id }));
  // TODO: hourlyRate will need to be set differently after TWU moves away from a one-and-only-one-resource world
  const hourlyRate = proposal?.team.length ? proposal.team[0].hourlyRate : 0;
  const selectedOrganizationOption = proposal?.organization
    ? {
        label: proposal.organization.legalName,
        value: proposal.organization.id
      }
    : null;
  const [tabbedFormState, tabbedFormCmds] = TabbedFormComponent.init({
    tabs: ["Evaluation", "Resource", "Pricing", "Questions", "Review Proposal"],
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
      id: "twu-proposal-organization",
      options: adt("options", organizationOptions)
    }
  });

  const [teamState, teamCmds] = Team.init({
    orgId: proposal?.organization?.id,
    affiliations: [], // Re-initialize with affiliations once loaded.
    proposalTeam: proposal?.team || []
  });

  const [hourlyRateState, hourlyRateCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid([`Please enter a valid hourly rate.`]);
      }
      return proposalValidation.validateTWUHourlyRate(v);
    },
    child: {
      value: hourlyRate || null,
      id: "twu-proposal-cost",
      min: 1
    }
  });
  const [resourceQuestionsState, resourceQuestionsCmds] =
    ResourceQuestions.init({
      questions: opportunity.resourceQuestions,
      responses: proposal?.resourceQuestionResponses || []
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
      openReviewResourceQuestionResponseAccordions: new Set(
        opportunity.resourceQuestions.map((q, i) => i)
      ),
      tabbedForm: immutable(tabbedFormState),
      organization: immutable(organizationState),
      team: immutable(teamState),
      hourlyRate: immutable(hourlyRateState),
      resourceQuestions: immutable(resourceQuestionsState)
    },
    [
      ...component_.cmd.mapMany(tabbedFormCmds, (msg) =>
        adt("tabbedForm", msg)
      ),
      ...component_.cmd.mapMany(organizationCmds, (msg) =>
        adt("organization", msg)
      ),
      ...component_.cmd.mapMany(teamCmds, (msg) => adt("team", msg)),
      ...component_.cmd.mapMany(hourlyRateCmds, (msg) =>
        adt("hourlyRate", msg)
      ),
      ...component_.cmd.mapMany(resourceQuestionsCmds, (msg) =>
        adt("resourceQuestions", msg)
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
  return (
    state
      .update("organization", (s) =>
        FormField.setErrors(s, errors?.organization || [])
      )
      // .update( "team", (s) =>
      //   Team.setErrors(s, {
      //     team.errors?team
      //   })
      // )
      // .update("hourlyRate", (s) =>
      //   FormField.setErrors(
      //     s,
      //     (errors && (errors as CreateValidationErrors).hourlyRate) || []
      //   )
      // )
      .update("resourceQuestions", (s) =>
        ResourceQuestions.setErrors(
          s,
          (errors &&
            (errors as CreateValidationErrors).resourceQuestionResponses) ||
            []
        )
      )
  );
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state
    .update("organization", (s) => FormField.validate(s))
    .update("team", (s) => Team.validate(s))
    .update("hourlyRate", (s) => FormField.validate(s))
    .update("resourceQuestions", (s) => ResourceQuestions.validate(s));
}

export function isPricingTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.hourlyRate);
}

export function isOrganizationsTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.organization) && Team.isValid(state.team);
}
export function isResourceQuestionsTabValid(state: Immutable<State>): boolean {
  return ResourceQuestions.isValid(state.resourceQuestions);
}

export function isValid(state: Immutable<State>): boolean {
  return (
    isPricingTabValid(state) &&
    isResourceQuestionsTabValid(state) &&
    isOrganizationsTabValid(state)
  );
}

export function isLoading(state: Immutable<State>): boolean {
  return state.getAffiliationsLoading > 0;
}

export type Values = Omit<CreateRequestBody, "status">;

export function getValues(state: Immutable<State>): Values {
  const organization = FormField.getValue(state.organization);
  const hourlyRate = FormField.getValue(state.hourlyRate) || 0;
  const team = Team.getValues(state.team);
  return {
    team: team.map((member) => ({ member: member.id, hourlyRate })),
    attachments: [],
    opportunity: state.opportunity.id,
    organization: organization?.value,
    resourceQuestionResponses: ResourceQuestions.getValues(
      state.resourceQuestions
    )
  };
}

export function getSelectedOrganization(
  state: Immutable<State>
): OrganizationSlim | null {
  const value = FormField.getValue(state.organization);
  return (value && find(state.organizations, { id: value.value })) || null;
}

export type PersistAction =
  | ADT<"create", CreateTWUProposalStatus>
  | ADT<"update", Id>;

export type PersistResult = Validation<
  [Immutable<State>, TWUProposal],
  Immutable<State>
>;

export function persist(
  state: Immutable<State>,
  action: PersistAction
): component_.Cmd<PersistResult> {
  const formValues = getValues(state);
  switch (action.tag) {
    case "create":
      return api.proposals.twu.create<PersistResult>()(
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
      return api.proposals.twu.update<PersistResult>()(
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

const startGetAffiliationsLoading = makeStartLoading<State>(
  "getAffiliationsLoading"
);

const stopGetAffiliationsLoading = makeStopLoading<State>(
  "getAffiliationsLoading"
);

/**
 *
 * @see {@link Msg} - string values defined by type Msg
 *
 * @param state
 * @param msg
 */
export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const affiliations = msg.value;
      const [teamState, teamCmds] = Team.init({
        orgId: state.proposal?.organization?.id,
        affiliations,
        proposalTeam: state.proposal?.team || []
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

    case "hourlyRate":
      return component_.base.updateChild({
        state,
        childStatePath: ["hourlyRate"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("hourlyRate", value)
      });

    case "resourceQuestions":
      return component_.base.updateChild({
        state,
        childStatePath: ["resourceQuestions"],
        childUpdate: ResourceQuestions.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("resourceQuestions", value)
      });

    case "toggleReviewResourceQuestionResponseAccordion":
      return [
        state.update("openReviewResourceQuestionResponseAccordions", (s) => {
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

const EvaluationView: component_.base.View<Props> = ({ state }) => {
  return (
    <Row>
      <Col xs="12">
        <Markdown openLinksInNewTabs source={state.evaluationContent} />
      </Col>
      <Col xs="12">
        <h4 className="mt-5 mb-3">Scoring Table</h4>
        <div className="table-responsive">
          <table className="table-hover">
            <thead>
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
                <td>Step 1: Resource Questions</td>
                <td>{state.opportunity.questionsWeight}%</td>
                <td>{EMPTY_STRING}</td>
              </tr>
              <tr>
                <td>Step 2: Shortlisting</td>
                <td>{EMPTY_STRING}</td>
                <td>{EMPTY_STRING}</td>
              </tr>
              <tr>
                <td>Step 3: Interview/Challenge</td>
                <td>{state.opportunity.challengeWeight}%</td>
                <td>80%</td>
              </tr>
              <tr>
                <td>Step 4: Price</td>
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

const OrganizationView: component_.base.View<Props> = ({
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
            Team With Us opportunity. In order to submit your proposal for
            consideration, you must:
          </p>
          <ul className="mb-5">
            <li>Select at most, one member for this opportunity; and</li>
            <li>
              Ensure the member{"'"}s capabilities satisfy the required service
              area for the implementation.
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
                  and it is qualified to apply for Team With Us opportunities.
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

const PricingView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  const { maxBudget } = state.opportunity;
  return (
    <div>
      <Row>
        <Col xs="12" className="mb-4">
          <p className="font-weight-bold">
            Proponents take note of the following pricing rules and
            requirements:
          </p>
          <ol className="li-paren-lower-alpha">
            <li>
              Proponent pricing quoted will be taken to mean and deemed to be:
              <ol className="li-paren-lower-roman">
                <li>in Canadian dollars;</li>
                <li>
                  inclusive of all costs or expenses that may be incurred with
                  respect to the services specified by the Competition Notice;
                </li>
                <li>exclusive of any applicable taxes.</li>
              </ol>
            </li>
            <li>
              In addition, the following rules apply to pricing bid by
              Proponents:
              <ol className="li-paren-lower-roman">
                <li>
                  Team With Us Terms & Conditions section 1.8 regarding pricing
                  and its provisions are incorporated herein by this reference.
                </li>
                <li>
                  All pricing bid is required to be unconditional and
                  unqualified. If any pricing bid does not meet this
                  requirement, the Proponent’s Proposal may be rejected
                  resulting in the Proponent being eliminated from the
                  Competition Notice competition.
                </li>
                <li>
                  Failure to provide pricing where required by the Competition
                  Notice will result in the Proponent being unable to submit a
                  Proposal.
                </li>
                <li>
                  Entering the numerical figure of “$0”, “$zero”, or the like in
                  response to a call for a specific dollar amount will result in
                  the Proponent being unable to submit a Proposal.
                </li>
                <li>
                  The Contract will provide that the Contractor may request an
                  increase in the bid pricing for any extension term of the
                  Contract, limited to any increases, if any, as supported by
                  the Canadian Consumer Price Index or 3% whichever is lower.
                </li>
              </ol>
            </li>
          </ol>
          <p>
            Please provide the hourly rate you are proposing for this
            opportunity.
          </p>
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="6">
          <NumberField.view
            disabled={disabled}
            extraChildProps={{ prefix: "$" }}
            label="Hourly Rate"
            placeholder="Hourly Rate"
            hint={`Maximum opportunity budget is ${formatAmount(
              maxBudget,
              "$"
            )}`}
            state={state.hourlyRate}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("hourlyRate" as const, value)
            )}
          />
        </Col>
      </Row>
    </div>
  );
};

const ResourceQuestionsView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
      <Col xs="12">
        <p className="font-weight-bold">
          General Instructions for Team with Us Proposal Response Form:
        </p>
        <ul>
          <li>
            This Proposal Response Form includes response guidelines which are
            intended to assist Proponents in the development of their Proposals.
          </li>
          <li>
            The response guidelines are not intended to be comprehensive.
            Proponents should use their own judgement in determining what
            information to provide to demonstrate that the Proponent meets or,
            if applicable exceeds the Province’s expectations with respect to a
            particular response guideline.
          </li>
          <li>
            Proposals should not contain links to information that is not set
            down directly in the Proponent’s Proposal. Should this occur, the
            Province may disregard any referred to source of information that is
            not contained in the Proposal being evaluated.
          </li>
        </ul>
        <p className="mb-4">
          Provide a response to each of the team questions below. Please note
          that responses that exceed the word limit will receive a score of
          zero.
        </p>
        <Alert color="danger" fade={false} className="mb-5">
          <strong>Important!</strong> Do not reference your organization{"'"}s
          name, a team member{"'"}s name or specific company software in any of
          your responses.
        </Alert>
      </Col>
      <Col xs="12">
        <ResourceQuestions.view
          disabled={disabled}
          state={state.resourceQuestions}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("resourceQuestions" as const, value)
          )}
        />
      </Col>
    </Row>
  );
};

interface ReviewResourceQuestionResponseViewProps {
  opportunity: TWUOpportunity;
  response: CreateTWUProposalResourceQuestionResponseBody;
  index: number;
  isOpen: boolean;
  className?: string;
  toggleAccordion(): void;
}

function getQuestionTextByOrder(
  opp: TWUOpportunity,
  order: number
): string | null {
  for (const q of opp.resourceQuestions) {
    if (q.order === order) {
      return q.question;
    }
  }
  return null;
}

const ReviewResourceQuestionResponseView: component_.base.View<
  ReviewResourceQuestionResponseViewProps
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

interface ContractDateProps {
  label: string;
  date: Date;
}

const ContractDate: component_.base.View<ContractDateProps> = ({
  label,
  date
}) => (
  <>
    <p className="font-weight-bold d-flex flex-nowrap text-nowrap align-items-end mb-1">
      {label}
    </p>
    {formatDate(date)}
  </>
);

const ReviewProposalView: component_.base.View<Props> = ({
  state,
  dispatch
}) => {
  const organization = getSelectedOrganization(state);
  const team = Team.getValues(state.team);
  return (
    <Row>
      <Col xs="12">
        <p className="mb-0">
          This is a summary of your proposal for this Team With Us opportunity.
          Be sure to review all information for accuracy prior to submitting
          your proposal.
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
      <Col>
        <div className="mt-5 pt-5 border-top">
          <h2 className="mb-4">Contract Dates</h2>
        </div>
        <Row style={{ rowGap: "0.5rem" }}>
          <Col xs="12" sm="6">
            <ContractDate
              label="Contract Start Date"
              date={state.opportunity.startDate}
            />
          </Col>
          <Col xs="12" sm="6">
            <ContractDate
              label="Contract Completion Date"
              date={state.opportunity.completionDate}
            />
          </Col>
        </Row>
      </Col>
      <Col xs="12">
        <div className="mt-5 pt-5 border-top">
          <h2 className="mb-4">Resource and Pricing</h2>
        </div>
      </Col>
      {team.length > 0 ? (
        team.map((member) => (
          <Col key={member.id}>
            <Row style={{ rowGap: "0.5rem" }}>
              <Col xs="12" sm="6">
                <div
                  className="d-flex text-nowrap flex-nowrap align-items-center"
                  color="body">
                  <img
                    className="rounded-circle border mr-2"
                    style={{
                      width: "1.75rem",
                      height: "1.75rem",
                      objectFit: "cover"
                    }}
                    src={userAvatarPath(member)}
                  />
                  {member.name}
                </div>
              </Col>
              <Col xs="12" sm="6">
                <NumberField.view
                  disabled
                  extraChildProps={{ prefix: "$" }}
                  label="Hourly Rate"
                  placeholder="Hourly Rate"
                  state={state.hourlyRate}
                  dispatch={component_.base.mapDispatch(dispatch, (value) =>
                    adt("hourlyRate" as const, value)
                  )}
                />
              </Col>
            </Row>
          </Col>
        ))
      ) : (
        <Col xs="12">
          You have not yet selected a resource for this proposal.
        </Col>
      )}
      <Col xs="12">
        <div className="mt-5 pt-5 border-top">
          <h2 className="mb-4">Questions{"'"} Responses</h2>
          {ResourceQuestions.getValues(state.resourceQuestions).map(
            (r, i, rs) => (
              <ReviewResourceQuestionResponseView
                key={`twu-proposal-review-team-question-response-${i}`}
                className={i < rs.length - 1 ? "mb-4" : ""}
                opportunity={state.opportunity}
                isOpen={state.openReviewResourceQuestionResponseAccordions.has(
                  i
                )}
                toggleAccordion={() =>
                  dispatch(
                    adt("toggleReviewResourceQuestionResponseAccordion", i)
                  )
                }
                index={i}
                response={r}
              />
            )
          )}
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
    disabled: disabled
  };
  const activeTab = (() => {
    switch (TabbedForm.getActiveTab(state.tabbedForm)) {
      case "Evaluation":
        return <EvaluationView {...props} />;
      case "Pricing":
        return <PricingView {...props} />;
      case "Resource":
        return <OrganizationView {...props} />;
      case "Questions":
        return <ResourceQuestionsView {...props} />;
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
          case "Pricing":
            return isPricingTabValid(state);
          case "Resource":
            return isOrganizationsTabValid(state);
          case "Questions":
            return isResourceQuestionsTabValid(state);
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
                <Link dest={routeDest(adt("orgCreate", null))}>
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
                proposals for Team With Us opportunties. Please select a
                different organization or ensure it{" "}
                {org ? (
                  <Link
                    dest={routeDest(
                      adt("orgEdit", {
                        orgId: org.id,
                        tab: "twuQualification" as const
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
    })()
  };
}
