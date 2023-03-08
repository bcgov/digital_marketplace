import {
  DEFAULT_ORGANIZATION_LOGO_IMAGE_PATH,
  EMPTY_STRING
} from "front-end/config";
import { fileBlobPath } from "front-end/lib";
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
import { formatAmount } from "shared/lib";
import {
  isTWUOpportunityAcceptingProposals,
  TWUOpportunity
} from "shared/lib/resources/opportunity/team-with-us";
import {
  // doesOrganizationMeetTWUQualification,
  OrganizationSlim
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

export type TabId =
  | "Evaluation"
  | "Organization"
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

export interface State
  extends Pick<
    Params,
    "viewerUser" | "opportunity" | "evaluationContent" | "organizations"
  > {
  proposal: TWUProposal | null;
  tabbedForm: Immutable<TabbedForm.State<TabId>>;
  viewerUser: User;
  // Team Tab
  organization: Immutable<Select.State>;
  // Pricing Tab
  proposedCost: Immutable<NumberField.State>;
  // Questions Tab
  resourceQuestions: Immutable<ResourceQuestions.State>;
  // Review Proposal Tab
  openReviewResourceQuestionResponseAccordions: Set<number>;
}

export type Msg =
  | ADT<"tabbedForm", TabbedForm.Msg<TabId>>
  // Organization Tab
  | ADT<"organization", Select.Msg>
  // Pricing Tab
  | ADT<"proposedCost", NumberField.Msg>
  // Questions Tab
  | ADT<"resourceQuestions", ResourceQuestions.Msg>
  // Review Proposal Tab
  | ADT<"toggleReviewResourceQuestionResponseAccordion", number>;

const DEFAULT_ACTIVE_TAB: TabId = "Evaluation";

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
    // TODO: add TWU qualification check when ready
    // !org || !doesOrganizationMeetTWUQualification(org) ? false : true,
    true,
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
    // TODO: add TWU qualification check when ready
    // .filter((o) => doesOrganizationMeetTWUQualification(o))
    .map(({ id, legalName }) => ({ label: legalName, value: id }));
  const proposedCost = proposal?.proposedCost ? proposal.proposedCost : 0;
  const selectedOrganizationOption = proposal?.organization
    ? {
        label: proposal.organization.legalName,
        value: proposal.organization.id
      }
    : null;
  const [tabbedFormState, tabbedFormCmds] = TabbedFormComponent.init({
    tabs: [
      "Evaluation",
      "Organization",
      "Pricing",
      "Questions",
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
      id: "twu-proposal-organization",
      options: adt("options", organizationOptions)
    }
  });
  const [proposedCostState, proposedCostCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid([`Please enter a valid proposed cost.`]);
      }
      return proposalValidation.validateTWUProposalProposedCost(
        v,
        opportunity.maxBudget,
        opportunity.targetAllocation,
        opportunity.assignmentDate,
        opportunity.completionDate
      );
    },
    child: {
      value: proposedCost || null,
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
      viewerUser,
      evaluationContent,
      opportunity,
      organizations,
      openReviewResourceQuestionResponseAccordions: new Set(
        opportunity.resourceQuestions.map((q, i) => i)
      ),
      tabbedForm: immutable(tabbedFormState),
      organization: immutable(organizationState),
      proposedCost: immutable(proposedCostState),
      resourceQuestions: immutable(resourceQuestionsState)
    },
    [
      ...component_.cmd.mapMany(tabbedFormCmds, (msg) =>
        adt("tabbedForm", msg)
      ),
      ...component_.cmd.mapMany(organizationCmds, (msg) =>
        adt("organization", msg)
      ),
      ...component_.cmd.mapMany(proposedCostCmds, (msg) =>
        adt("proposedCost", msg)
      ),
      ...component_.cmd.mapMany(resourceQuestionsCmds, (msg) =>
        adt("resourceQuestions", msg)
      )
    ] as component_.Cmd<Msg>[]
  ];
};

export type Errors = CreateValidationErrors | UpdateEditValidationErrors;

export function setErrors(
  state: Immutable<State>,
  errors?: Errors
): Immutable<State> {
  return state
    .update("organization", (s) =>
      FormField.setErrors(s, errors?.organization || [])
    )
    .update("proposedCost", (s) =>
      FormField.setErrors(
        s,
        (errors && (errors as CreateValidationErrors).totalProposedCost) || []
      )
    )
    .update("resourceQuestions", (s) =>
      ResourceQuestions.setErrors(
        s,
        (errors &&
          (errors as CreateValidationErrors).resourceQuestionResponses) ||
          []
      )
    );
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state
    .update("organization", (s) => FormField.validate(s))
    .update("proposedCost", (s) => FormField.validate(s))
    .update("resourceQuestions", (s) => ResourceQuestions.validate(s));
}

export function isPricingTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.proposedCost);
}

export function isOrganizationsTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.organization);
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

export type Values = Omit<CreateRequestBody, "status">;

export function getValues(state: Immutable<State>): Values {
  const organization = FormField.getValue(state.organization);
  return {
    opportunity: state.opportunity.id,
    organization: organization?.value,
    resourceQuestionResponses: ResourceQuestions.getValues(
      state.resourceQuestions
    ),
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
      return api.proposals.twu.create(
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
      ) as component_.Cmd<PersistResult>;
    case "update": {
      return api.proposals.twu.update(
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
      ) as component_.Cmd<PersistResult>;
    }
  }
}

/**
 *
 * @see {@link Msg} One of the string values defined by type Msg
 *
 * @param state
 * @param msg
 */
export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "tabbedForm":
      return component_.base.updateChild({
        state,
        childStatePath: ["tabbedForm"],
        childUpdate: TabbedFormComponent.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("tabbedForm", value)
      });

    case "organization":
      return component_.base.updateChild({
        state,
        childStatePath: ["organization"],
        childUpdate: Select.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("organization", value)
      });

    case "proposedCost":
      return component_.base.updateChild({
        state,
        childStatePath: ["proposedCost"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("proposedCost", value)
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
                <td>Step 1: Questions</td>
                <td>{state.opportunity.questionsWeight}%</td>
                <td>{EMPTY_STRING}</td>
              </tr>
              <tr>
                <td>Step 2: Shortlisting</td>
                <td>{EMPTY_STRING}</td>
                <td>{EMPTY_STRING}</td>
              </tr>
              <tr>
                <td>Step 3: Challenge</td>
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
  return (
    <div>
      <Row>
        <Col xs="12">
          <Select.view
            extraChildProps={{
              loading: true
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
      </Row>
    </div>
  );
};

const PricingView: component_.base.View<Props> = ({ state, dispatch }) => {
  const { maxBudget } = state.opportunity;
  return (
    <div>
      <Row>
        <Col xs="12" className="mb-4">
          <p>
            Propose an Hourly Rate for this opportunity using the fields
            provided below. In order to submit your proposal for consideration,
            you must:
          </p>
          <ul>
            <li>Not exceed the total maximum budget for the opportunity.</li>
          </ul>
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="6">
          <NumberField.view
            extraChildProps={{ prefix: "$" }}
            label="Proposed Hourly Rate"
            placeholder="Proposed Hourly Rate"
            hint={`Maximum opportunity budget is ${formatAmount(
              maxBudget,
              "$"
            )}`}
            disabled
            state={state.proposedCost}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("proposedCost" as const, value)
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

const ReviewProposalView: component_.base.View<Props> = ({
  state,
  dispatch
}) => {
  // const members = Team.getAddedMembers(state.team);
  const organization = getSelectedOrganization(state);
  // const opportunity = state.opportunity;
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
      case "Organization":
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
          case "Organization":
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
                proposals for Team With Us opportunties. Please select a
                different organization or ensure it{" "}
                {org ? (
                  <Link
                    newTab
                    dest={routeDest(
                      adt("orgEdit", {
                        orgId: org.id,
                        tab: "qualification" as const
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