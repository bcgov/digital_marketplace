import { DEFAULT_LOCATION, SWU_COST_RECOVERY_FIGURE } from "front-end/config";
import * as Attachments from "front-end/lib/components/attachments";
import * as FormField from "front-end/lib/components/form-field";
import * as DateField from "front-end/lib/components/form-field/date";
import * as LongText from "front-end/lib/components/form-field/long-text";
import * as NumberField from "front-end/lib/components/form-field/number";
import * as RadioGroup from "front-end/lib/components/form-field/radio-group";
import * as RichMarkdownEditor from "front-end/lib/components/form-field/rich-markdown-editor";
import * as Select from "front-end/lib/components/form-field/select";
import * as SelectMulti from "front-end/lib/components/form-field/select-multi";
import * as ShortText from "front-end/lib/components/form-field/short-text";
import * as TabbedForm from "front-end/lib/components/tabbed-form";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Phases from "front-end/lib/pages/opportunity/sprint-with-us/lib/components/phases";
import * as TeamQuestions from "front-end/lib/pages/opportunity/sprint-with-us/lib/components/team-questions";
import * as EvaluationPanel from "front-end/lib/components/swu-evaluation-panel";
import Icon from "front-end/lib/views/icon";
import Link, { routeDest } from "front-end/lib/views/link";
import { flatten } from "lodash";
import React from "react";
import { Alert, Col, Row } from "reactstrap";
import { getNumber } from "shared/lib";
import SKILLS from "shared/lib/data/skills";
import { FileUploadMetadata } from "shared/lib/resources/file";
import {
  canSWUOpportunityDetailsBeEdited,
  CreateRequestBody,
  CreateSWUOpportunityStatus,
  CreateValidationErrors,
  UpdateValidationErrors,
  DEFAULT_CODE_CHALLENGE_WEIGHT,
  DEFAULT_PRICE_WEIGHT,
  DEFAULT_QUESTIONS_WEIGHT,
  DEFAULT_SCENARIO_WEIGHT,
  parseSWUOpportunityPhaseType,
  SWUOpportunity,
  SWUOpportunityPhaseType,
  swuOpportunityPhaseTypeToTitleCase,
  SWUOpportunityStatus,
  UpdateEditValidationErrors
} from "shared/lib/resources/opportunity/sprint-with-us";
import { isAdmin, User } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import {
  invalid,
  mapInvalid,
  mapValid,
  valid,
  isValid as isValid_,
  Validation
} from "shared/lib/validation";
import * as opportunityValidation from "shared/lib/validation/opportunity/sprint-with-us";
import * as genericValidation from "shared/lib/validation/opportunity/utility";

type RemoteOk = "yes" | "no";

const RemoteOkRadioGroup = RadioGroup.makeComponent<RemoteOk>();

export type TabId =
  | "Agreement"
  | "Evaluation Panel"
  | "Overview"
  | "Description"
  | "Phases"
  | "Team Questions"
  | "Scoring"
  | "Attachments";

const TabbedFormComponent = TabbedForm.makeComponent<TabId>();

const newAttachmentMetadata: FileUploadMetadata = [];

export interface State {
  opportunity?: SWUOpportunity;
  viewerUser: User;
  tabbedForm: Immutable<TabbedForm.State<TabId>>;
  showPhaseInfo: boolean;
  // Evaluation Tab
  evaluationPanel: Immutable<EvaluationPanel.State>;
  // Overview Tab
  title: Immutable<ShortText.State>;
  teaser: Immutable<LongText.State>;
  remoteOk: Immutable<RadioGroup.State<RemoteOk>>;
  remoteDesc: Immutable<LongText.State>;
  location: Immutable<ShortText.State>;
  proposalDeadline: Immutable<DateField.State>;
  assignmentDate: Immutable<DateField.State>;
  totalMaxBudget: Immutable<NumberField.State>;
  costRecovery: Immutable<NumberField.State>;
  minTeamMembers: Immutable<NumberField.State>;
  mandatorySkills: Immutable<SelectMulti.State>;
  optionalSkills: Immutable<SelectMulti.State>;
  // Description Tab
  description: Immutable<RichMarkdownEditor.State>;
  // Phases Tab
  startingPhase: Immutable<Select.State>;
  phases: Immutable<Phases.State>;
  // Team Questions Tab
  teamQuestions: Immutable<TeamQuestions.State>;
  // Scoring Tab
  questionsWeight: Immutable<NumberField.State>;
  codeChallengeWeight: Immutable<NumberField.State>;
  scenarioWeight: Immutable<NumberField.State>;
  priceWeight: Immutable<NumberField.State>;
  weightsTotal: Immutable<NumberField.State>;
  // Attachments tab
  attachments: Immutable<Attachments.State>;
}

export type Msg =
  | ADT<"tabbedForm", TabbedForm.Msg<TabId>>
  | ADT<"hidePhaseInfo">
  // Team Questions Tab
  | ADT<"evaluationPanel", EvaluationPanel.Msg>
  // Overview Tab
  | ADT<"title", ShortText.Msg>
  | ADT<"teaser", LongText.Msg>
  | ADT<"remoteOk", RadioGroup.Msg<RemoteOk>>
  | ADT<"remoteDesc", LongText.Msg>
  | ADT<"location", ShortText.Msg>
  | ADT<"proposalDeadline", DateField.Msg>
  | ADT<"assignmentDate", DateField.Msg>
  | ADT<"totalMaxBudget", NumberField.Msg>
  | ADT<"costRecovery", NumberField.Msg>
  | ADT<"minTeamMembers", NumberField.Msg>
  | ADT<"mandatorySkills", SelectMulti.Msg>
  | ADT<"optionalSkills", SelectMulti.Msg>
  // Description Tab
  | ADT<"description", RichMarkdownEditor.Msg>
  // Phases Tab
  | ADT<"startingPhase", Select.Msg>
  | ADT<"phases", Phases.Msg>
  // Team Questions Tab
  | ADT<"teamQuestions", TeamQuestions.Msg>
  // Scoring Tab
  | ADT<"questionsWeight", NumberField.Msg>
  | ADT<"codeChallengeWeight", NumberField.Msg>
  | ADT<"scenarioWeight", NumberField.Msg>
  | ADT<"priceWeight", NumberField.Msg>
  | ADT<"weightsTotal", NumberField.Msg>
  // Attachments tab
  | ADT<"attachments", Attachments.Msg>;

export interface Params {
  canRemoveExistingAttachments: boolean;
  opportunity?: SWUOpportunity;
  viewerUser: User;
  activeTab?: TabId;
  users: User[];
}

export function getActiveTab(state: Immutable<State>): TabId {
  return TabbedForm.getActiveTab(state.tabbedForm);
}

const DEFAULT_ACTIVE_TAB: TabId = "Agreement";

function makePhaseTypeOption(value: SWUOpportunityPhaseType): Select.Option {
  return (
    value && {
      value,
      label: swuOpportunityPhaseTypeToTitleCase(value)
    }
  );
}

function getStartingPhase(
  opportunity?: SWUOpportunity
): SWUOpportunityPhaseType | null {
  if (opportunity?.inceptionPhase) {
    return SWUOpportunityPhaseType.Inception;
  } else if (opportunity?.prototypePhase) {
    return SWUOpportunityPhaseType.Prototype;
  } else if (opportunity?.implementationPhase) {
    return SWUOpportunityPhaseType.Implementation;
  } else {
    return null;
  }
}

function resetAssignmentDate(state: Immutable<State>): Immutable<State> {
  return state.update("assignmentDate", (s) => {
    return FormField.setValidate(
      s,
      DateField.validateDate((v) =>
        genericValidation.validateDateFormatMinMax(
          v,
          DateField.getDate(state.proposalDeadline) || new Date()
        )
      ),
      !!FormField.getValue(s)
    );
  });
}

export const init: component_.base.Init<Params, State, Msg> = ({
  canRemoveExistingAttachments,
  opportunity,
  viewerUser,
  users,
  activeTab = DEFAULT_ACTIVE_TAB
}) => {
  const startingPhase = getStartingPhase(opportunity);
  const questionsWeight = getNumber(
    opportunity,
    "questionsWeight",
    DEFAULT_QUESTIONS_WEIGHT
  );
  const codeChallengeWeight = getNumber(
    opportunity,
    "codeChallengeWeight",
    DEFAULT_CODE_CHALLENGE_WEIGHT
  );
  const scenarioWeight = getNumber(
    opportunity,
    "scenarioWeight",
    DEFAULT_SCENARIO_WEIGHT
  );
  const priceWeight = getNumber(
    opportunity,
    "priceWeight",
    DEFAULT_PRICE_WEIGHT
  );
  const [tabbedFormState, tabbedFormCmds] = TabbedFormComponent.init({
    tabs: [
      "Agreement",
      ...(!opportunity ? ["Evaluation Panel" as const] : []), // Only displayed on create
      "Overview",
      "Description",
      "Phases",
      "Team Questions",
      "Scoring",
      "Attachments"
    ],
    activeTab
  });
  const [titleState, titleCmds] = ShortText.init({
    errors: [],
    validate: genericValidation.validateTitle,
    child: {
      type: "text",
      value: opportunity?.title || "",
      id: "swu-opportunity-title"
    }
  });
  const [teaserState, teaserCmds] = LongText.init({
    errors: [],
    validate: genericValidation.validateTeaser,
    child: {
      value: opportunity?.teaser || "",
      id: "swu-opportunity-teaser"
    }
  });
  const [locationState, locationCmds] = ShortText.init({
    errors: [],
    validate: genericValidation.validateLocation,
    child: {
      type: "text",
      value: opportunity?.location || DEFAULT_LOCATION,
      id: "swu-opportunity-location"
    }
  });
  const [remoteOkState, remoteOkCmds] = RemoteOkRadioGroup.init({
    errors: [],
    validate: (v) =>
      v === null ? invalid(["Please select an option."]) : valid(v),
    child: {
      id: "swu-opportunity-remote-ok",
      value: (() => {
        const existing = opportunity?.remoteOk;
        if (existing === true) {
          return "yes" as const;
        } else if (existing === false) {
          return "no" as const;
        }
        return null;
      })(),
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" }
      ]
    }
  });
  const [remoteDescState, remoteDescCmds] = LongText.init({
    errors: [],
    validate: (v) =>
      genericValidation.validateRemoteDesc(v, !!opportunity?.remoteOk),
    child: {
      value: opportunity?.remoteDesc || "",
      id: "swu-opportunity-remote-desc"
    }
  });
  const [proposalDeadlineState, proposalDeadlineCmds] = DateField.init({
    errors: [],
    validate: DateField.validateDate((v) =>
      opportunityValidation.validateProposalDeadline(v, opportunity)
    ),
    child: {
      value: opportunity
        ? DateField.dateToValue(opportunity.proposalDeadline)
        : null,
      id: "swu-opportunity-proposal-deadline"
    }
  });
  const [assignmentDateState, assignmentDateCmds] = DateField.init({
    errors: [],
    validate: DateField.validateDate((v) =>
      genericValidation.validateDateFormatMinMax(
        v,
        opportunity?.proposalDeadline || new Date()
      )
    ),
    child: {
      value: opportunity
        ? DateField.dateToValue(opportunity.assignmentDate)
        : null,
      id: "swu-opportunity-assignment-date"
    }
  });
  const [totalMaxBudgetState, totalMaxBudgetCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid Total Maximum Budget."]);
      }
      return opportunityValidation.validateTotalMaxBudget(v);
    },
    child: {
      value: opportunity?.totalMaxBudget || null,
      id: "swu-opportunity-total-max-budget",
      min: 1
    }
  });
  const [costRecoveryState, costRecoveryCmds] = NumberField.init({
    errors: [],
    child: {
      value: SWU_COST_RECOVERY_FIGURE,
      id: "swu-opportunity-cost-recovery"
    }
  });
  const [minTeamMembersState, minTeamMembersCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return valid(null);
      }
      return opportunityValidation.validateMinimumTeamMembers(v);
    },
    child: {
      value: opportunity?.minTeamMembers || null,
      id: "swu-opportunity-min-team-members",
      min: 1
    }
  });
  const [mandatorySkillsState, mandatorySkillsCmds] = SelectMulti.init({
    errors: [],
    validate: (v) => {
      const strings = v.map(({ value }) => value);
      const validated0 = genericValidation.validateMandatorySkills(strings);
      const validated1 = mapValid(validated0 as Validation<string[]>, () => v);
      return mapInvalid(validated1, (es) => flatten(es));
    },
    child: {
      value:
        opportunity?.mandatorySkills.map((value) => ({
          value,
          label: value
        })) || [],
      id: "swu-opportunity-mandatory-skills",
      creatable: true,
      options: SelectMulti.stringsToOptions(SKILLS)
    }
  });
  const [optionalSkillsState, optionalSkillsCmds] = SelectMulti.init({
    errors: [],
    validate: (v) => {
      const strings = v.map(({ value }) => value);
      const validated0 = genericValidation.validateOptionalSkills(strings);
      const validated1 = mapValid(validated0 as Validation<string[]>, () => v);
      return mapInvalid(validated1, (es) => flatten(es));
    },
    child: {
      value:
        opportunity?.optionalSkills.map((value) => ({
          value,
          label: value
        })) || [],
      id: "swu-opportunity-optional-skills",
      creatable: true,
      options: SelectMulti.stringsToOptions(SKILLS)
    }
  });
  const [descriptionState, descriptionCmds] = RichMarkdownEditor.init({
    errors: [],
    validate: genericValidation.validateDescription,
    child: {
      value: opportunity?.description || "",
      id: "swu-opportunity-description",
      uploadImage: api.files.markdownImages.makeUploadImage()
    }
  });
  const [startingPhaseState, startingPhaseCmds] = Select.init({
    errors: [],
    validate: (option) => {
      if (!option) {
        return invalid(["Please select a starting phase."]);
      }
      return valid(option);
    },
    child: {
      value: startingPhase && makePhaseTypeOption(startingPhase),
      id: "swu-opportunity-starting-phase",
      options: adt(
        "options",
        [
          SWUOpportunityPhaseType.Inception,
          SWUOpportunityPhaseType.Prototype,
          SWUOpportunityPhaseType.Implementation
        ].map((value) => makePhaseTypeOption(value))
      )
    }
  });
  const [phasesState, phasesCmds] = Phases.init({
    opportunity,
    startingPhase: startingPhase || SWUOpportunityPhaseType.Inception
  });
  const [teamQuestionsState, teamQuestionsCmds] = TeamQuestions.init({
    questions: opportunity?.teamQuestions || []
  });
  const [evaluationPanelState, evaluationPanelCmds] = EvaluationPanel.init({
    evaluationPanel: opportunity?.evaluationPanel || [
      { user: viewerUser, chair: true, evaluator: true, order: 0 }
    ],
    users
  });
  const [questionsWeightState, questionsWeightCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid weight for team questions."]);
      }
      return opportunityValidation.validateQuestionsWeight(v);
    },
    child: {
      value: questionsWeight,
      id: "swu-opportunity-questions-weight",
      min: 0
    }
  });
  const [codeChallengeWeightState, codeChallengeWeightCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid code challenge weight."]);
      }
      return opportunityValidation.validateCodeChallengeWeight(v);
    },
    child: {
      value: codeChallengeWeight,
      id: "swu-opportunity-code-challenge-weight",
      min: 0
    }
  });
  const [scenarioWeightState, scenarioWeightCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid team scenario weight."]);
      }
      return opportunityValidation.validateTeamScenarioWeight(v);
    },
    child: {
      value: scenarioWeight,
      id: "swu-opportunity-scenario-weight",
      min: 0
    }
  });
  const [priceWeightState, priceWeightCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid price weight."]);
      }
      return opportunityValidation.validatePriceWeight(v);
    },
    child: {
      value: priceWeight,
      id: "swu-opportunity-price-weight",
      min: 0
    }
  });
  const [weightsTotalState, weightsTotalCmds] = NumberField.init({
    errors: [],
    validate: validateWeightsTotal,
    child: {
      value:
        questionsWeight + codeChallengeWeight + scenarioWeight + priceWeight,
      id: "swu-opportunity-weights-total",
      min: 1
    }
  });
  const [attachmentsState, attachmentsCmds] = Attachments.init({
    canRemoveExistingAttachments,
    existingAttachments: opportunity?.attachments || [],
    newAttachmentMetadata: [adt("any")]
  });
  return [
    {
      opportunity,
      viewerUser,
      showPhaseInfo: true,
      tabbedForm: immutable(tabbedFormState),
      title: immutable(titleState),
      teaser: immutable(teaserState),
      location: immutable(locationState),
      remoteOk: immutable(remoteOkState),
      remoteDesc: immutable(remoteDescState),
      proposalDeadline: immutable(proposalDeadlineState),
      assignmentDate: immutable(assignmentDateState),
      totalMaxBudget: immutable(totalMaxBudgetState),
      costRecovery: immutable(costRecoveryState),
      minTeamMembers: immutable(minTeamMembersState),
      mandatorySkills: immutable(mandatorySkillsState),
      optionalSkills: immutable(optionalSkillsState),
      description: immutable(descriptionState),
      startingPhase: immutable(startingPhaseState),
      phases: immutable(phasesState),
      teamQuestions: immutable(teamQuestionsState),
      evaluationPanel: immutable(evaluationPanelState),
      questionsWeight: immutable(questionsWeightState),
      codeChallengeWeight: immutable(codeChallengeWeightState),
      scenarioWeight: immutable(scenarioWeightState),
      priceWeight: immutable(priceWeightState),
      weightsTotal: immutable(weightsTotalState),
      attachments: immutable(attachmentsState)
    },
    [
      ...component_.cmd.mapMany(tabbedFormCmds, (msg) =>
        adt("tabbedForm", msg)
      ),
      ...component_.cmd.mapMany(titleCmds, (msg) => adt("title", msg)),
      ...component_.cmd.mapMany(teaserCmds, (msg) => adt("teaser", msg)),
      ...component_.cmd.mapMany(locationCmds, (msg) => adt("location", msg)),
      ...component_.cmd.mapMany(remoteOkCmds, (msg) => adt("remoteOk", msg)),
      ...component_.cmd.mapMany(remoteDescCmds, (msg) =>
        adt("remoteDesc", msg)
      ),
      ...component_.cmd.mapMany(proposalDeadlineCmds, (msg) =>
        adt("proposalDeadline", msg)
      ),
      ...component_.cmd.mapMany(assignmentDateCmds, (msg) =>
        adt("assignmentDate", msg)
      ),
      ...component_.cmd.mapMany(totalMaxBudgetCmds, (msg) =>
        adt("totalMaxBudget", msg)
      ),
      ...component_.cmd.mapMany(costRecoveryCmds, (msg) =>
        adt("costRecovery", msg)
      ),
      ...component_.cmd.mapMany(minTeamMembersCmds, (msg) =>
        adt("minTeamMembers", msg)
      ),
      ...component_.cmd.mapMany(mandatorySkillsCmds, (msg) =>
        adt("mandatorySkills", msg)
      ),
      ...component_.cmd.mapMany(optionalSkillsCmds, (msg) =>
        adt("optionalSkills", msg)
      ),
      ...component_.cmd.mapMany(descriptionCmds, (msg) =>
        adt("description", msg)
      ),
      ...component_.cmd.mapMany(startingPhaseCmds, (msg) =>
        adt("startingPhase", msg)
      ),
      ...component_.cmd.mapMany(phasesCmds, (msg) => adt("phases", msg)),
      ...component_.cmd.mapMany(teamQuestionsCmds, (msg) =>
        adt("teamQuestions", msg)
      ),
      ...component_.cmd.mapMany(evaluationPanelCmds, (msg) =>
        adt("evaluationPanel", msg)
      ),
      ...component_.cmd.mapMany(questionsWeightCmds, (msg) =>
        adt("questionsWeight", msg)
      ),
      ...component_.cmd.mapMany(codeChallengeWeightCmds, (msg) =>
        adt("codeChallengeWeight", msg)
      ),
      ...component_.cmd.mapMany(scenarioWeightCmds, (msg) =>
        adt("scenarioWeight", msg)
      ),
      ...component_.cmd.mapMany(priceWeightCmds, (msg) =>
        adt("priceWeight", msg)
      ),
      ...component_.cmd.mapMany(weightsTotalCmds, (msg) =>
        adt("weightsTotal", msg)
      ),
      ...component_.cmd.mapMany(attachmentsCmds, (msg) =>
        adt("attachments", msg)
      )
    ] as component_.Cmd<Msg>[]
  ];
};

export type Errors = CreateValidationErrors;

export function setErrors(
  state: Immutable<State>,
  errors: Errors
): Immutable<State> {
  if (errors) {
    return state
      .update("title", (s) => FormField.setErrors(s, errors.title || []))
      .update("teaser", (s) => FormField.setErrors(s, errors.teaser || []))
      .update("remoteOk", (s) => FormField.setErrors(s, errors.remoteOk || []))
      .update("remoteDesc", (s) =>
        FormField.setErrors(s, errors.remoteDesc || [])
      )
      .update("location", (s) => FormField.setErrors(s, errors.location || []))
      .update("proposalDeadline", (s) =>
        FormField.setErrors(s, errors.proposalDeadline || [])
      )
      .update("assignmentDate", (s) =>
        FormField.setErrors(s, errors.assignmentDate || [])
      )
      .update("totalMaxBudget", (s) =>
        FormField.setErrors(s, errors.totalMaxBudget || [])
      )
      .update("minTeamMembers", (s) =>
        FormField.setErrors(s, errors.minTeamMembers || [])
      )
      .update("mandatorySkills", (s) =>
        FormField.setErrors(s, flatten(errors.mandatorySkills || []))
      )
      .update("optionalSkills", (s) =>
        FormField.setErrors(s, flatten(errors.optionalSkills || []))
      )
      .update("description", (s) =>
        FormField.setErrors(s, errors.description || [])
      )
      .update("phases", (s) => Phases.setErrors(s, errors))
      .update("teamQuestions", (s) =>
        TeamQuestions.setErrors(s, errors.teamQuestions)
      )
      .update("evaluationPanel", (s) =>
        EvaluationPanel.setErrors(s, errors.evaluationPanel)
      );
  } else {
    return state;
  }
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state
    .update("title", (s) => FormField.validate(s))
    .update("teaser", (s) => FormField.validate(s))
    .update("remoteOk", (s) => FormField.validate(s))
    .update("remoteDesc", (s) => FormField.validate(s))
    .update("location", (s) => FormField.validate(s))
    .update("proposalDeadline", (s) => FormField.validate(s))
    .update("assignmentDate", (s) => FormField.validate(s))
    .update("totalMaxBudget", (s) => FormField.validate(s))
    .update("minTeamMembers", (s) => FormField.validate(s))
    .update("mandatorySkills", (s) => FormField.validate(s))
    .update("optionalSkills", (s) => FormField.validate(s))
    .update("description", (s) => FormField.validate(s))
    .update("phases", (s) => Phases.validate(s))
    .update("teamQuestions", (s) => TeamQuestions.validate(s))
    .update("questionsWeight", (s) => FormField.validate(s))
    .update("codeChallengeWeight", (s) => FormField.validate(s))
    .update("scenarioWeight", (s) => FormField.validate(s))
    .update("priceWeight", (s) => FormField.validate(s))
    .update("weightsTotal", (s) => FormField.validate(s))
    .update("attachments", (s) => Attachments.validate(s))
    .update("evaluationPanel", (s) => EvaluationPanel.validate(s));
}

export function isEvaluationPanelTabValid(state: Immutable<State>): boolean {
  return !state.opportunity
    ? EvaluationPanel.isValid(state.evaluationPanel)
    : true; // Not editable from form; do note validate
}

export function isOverviewTabValid(state: Immutable<State>): boolean {
  const remoteOk = FormField.getValue(state.remoteOk) === "yes";
  return (
    FormField.isValid(state.title) &&
    FormField.isValid(state.teaser) &&
    FormField.isValid(state.remoteOk) &&
    (!remoteOk || FormField.isValid(state.remoteDesc)) &&
    FormField.isValid(state.location) &&
    FormField.isValid(state.proposalDeadline) &&
    FormField.isValid(state.assignmentDate) &&
    FormField.isValid(state.totalMaxBudget) &&
    FormField.isValid(state.minTeamMembers) &&
    FormField.isValid(state.mandatorySkills) &&
    FormField.isValid(state.optionalSkills)
  );
}

export function isDescriptionTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.description);
}

export function isPhasesTabValid(state: Immutable<State>): boolean {
  return Phases.isValid(state.phases) && FormField.isValid(state.startingPhase);
}

export function isTeamQuestionsTabValid(state: Immutable<State>): boolean {
  return TeamQuestions.isValid(state.teamQuestions);
}

export function isScoringTabValid(state: Immutable<State>): boolean {
  return (
    FormField.isValid(state.questionsWeight) &&
    FormField.isValid(state.codeChallengeWeight) &&
    FormField.isValid(state.scenarioWeight) &&
    FormField.isValid(state.priceWeight) &&
    FormField.isValid(state.weightsTotal)
  );
}

export function isAttachmentsTabValid(state: Immutable<State>): boolean {
  return Attachments.isValid(state.attachments);
}

export function isValid(state: Immutable<State>): boolean {
  return (
    isOverviewTabValid(state) &&
    isEvaluationPanelTabValid(state) &&
    isDescriptionTabValid(state) &&
    isPhasesTabValid(state) &&
    isTeamQuestionsTabValid(state) &&
    isScoringTabValid(state) &&
    isAttachmentsTabValid(state)
  );
}

export type Values = Omit<CreateRequestBody, "attachments" | "status">;

export function getValues(state: Immutable<State>): Values {
  const totalMaxBudget = FormField.getValue(state.totalMaxBudget) || 0;
  const minTeamMembers = FormField.getValue(state.minTeamMembers) || undefined;
  const questionsWeight = FormField.getValue(state.questionsWeight) || 0;
  const codeChallengeWeight =
    FormField.getValue(state.codeChallengeWeight) || 0;
  const scenarioWeight = FormField.getValue(state.scenarioWeight) || 0;
  const priceWeight = FormField.getValue(state.priceWeight) || 0;
  const teamQuestions = TeamQuestions.getValues(state.teamQuestions);
  const phases = Phases.getValues(state.phases);
  const evaluationPanel = EvaluationPanel.getValues(state.evaluationPanel);
  return {
    ...phases,
    title: FormField.getValue(state.title),
    teaser: FormField.getValue(state.teaser),
    remoteOk: FormField.getValue(state.remoteOk) === "yes",
    remoteDesc: FormField.getValue(state.remoteDesc),
    location: FormField.getValue(state.location),
    proposalDeadline: DateField.getValueAsString(state.proposalDeadline),
    assignmentDate: DateField.getValueAsString(state.assignmentDate),
    totalMaxBudget,
    minTeamMembers,
    mandatorySkills: SelectMulti.getValueAsStrings(state.mandatorySkills),
    optionalSkills: SelectMulti.getValueAsStrings(state.optionalSkills),
    description: FormField.getValue(state.description),
    questionsWeight,
    codeChallengeWeight,
    scenarioWeight,
    priceWeight,
    teamQuestions,
    evaluationPanel
  };
}

type PersistAction = ADT<"create", CreateSWUOpportunityStatus> | ADT<"update">;

export type PersistResult = Validation<
  [Immutable<State>, component_.Cmd<Msg>[], SWUOpportunity],
  Immutable<State>
>;

export function persist(
  state: Immutable<State>,
  action: PersistAction
): component_.Cmd<PersistResult> {
  const values = getValues(state);
  const isRemoteOkChecked = RadioGroup.isChecked(state.remoteOk);
  const isCreateDraft =
    action.tag === "create" && action.value === SWUOpportunityStatus.Draft;
  const shouldUploadAttachmentsAndUpdate =
    action.tag === "create" ||
    (action.tag === "update" &&
      !!state.opportunity &&
      canSWUOpportunityDetailsBeEdited(
        state.opportunity,
        isAdmin(state.viewerUser)
      ));
  // Transform remoteOk
  if (!isRemoteOkChecked && !isCreateDraft) {
    return component_.cmd.dispatch(invalid(state));
  }
  // Default remoteOk to true for drafts where it isn't defined.
  const remoteOk =
    !isRemoteOkChecked && isCreateDraft
      ? true
      : RadioGroup.valueEquals(state.remoteOk, "yes");
  // Get new attachments to be uploaded.
  const newAttachments = Attachments.getNewAttachments(state.attachments);
  const existingAttachments = state.attachments.existingAttachments.map(
    ({ id }) => id
  );
  // Cmd helpers
  const uploadNewAttachmentsCmd = api.files.createMany<
    Validation<Id[], Immutable<State>>
  >()(newAttachments, (response) => {
    switch (response.tag) {
      case "valid":
        return valid([
          ...existingAttachments,
          ...response.value.map(({ id }) => id)
        ]);
      case "invalid":
        return invalid(
          state.update("attachments", (attachments) =>
            Attachments.setNewAttachmentErrors(attachments, response.value)
          )
        );
      case "unhandled":
        return invalid(state);
    }
  });
  const actionCmd = (
    attachments: Id[]
  ): component_.cmd.Cmd<
    api.ResponseValidation<
      SWUOpportunity,
      UpdateEditValidationErrors | CreateValidationErrors
    >
  > => {
    switch (action.tag) {
      case "create":
        return api.opportunities.swu.create<
          api.ResponseValidation<SWUOpportunity, CreateValidationErrors>
        >()(
          {
            ...values,
            remoteOk,
            attachments,
            status: action.value
          },
          (response) => response
        );
      case "update":
        if (state.opportunity && shouldUploadAttachmentsAndUpdate) {
          return api.opportunities.swu.update<
            api.ResponseValidation<SWUOpportunity, UpdateEditValidationErrors>
          >()(
            state.opportunity.id,
            adt("edit" as const, {
              ...values,
              remoteOk,
              attachments
            }),
            (
              response: api.ResponseValidation<
                SWUOpportunity,
                UpdateValidationErrors
              >
            ) => {
              return api.mapInvalid(response, (errors) => {
                if (errors.opportunity && errors.opportunity.tag === "edit") {
                  return errors.opportunity.value;
                } else {
                  return {};
                }
              });
            }
          );
        } else if (state.opportunity) {
          return component_.cmd.dispatch(valid(state.opportunity));
        } else {
          // Should never happen because state.opportunity should be defined
          // when updating.
          return component_.cmd.dispatch(invalid({}));
        }
    }
  };
  // Upload new attachments if necessary.
  const attachmentsCmd: component_.cmd.Cmd<Validation<Id[], Immutable<State>>> =
    shouldUploadAttachmentsAndUpdate && newAttachments.length
      ? uploadNewAttachmentsCmd
      : component_.cmd.dispatch(valid(existingAttachments));
  return component_.cmd.andThen(attachmentsCmd, (attachmentsResult) => {
    if (isValid_(attachmentsResult)) {
      return component_.cmd.map(
        actionCmd(attachmentsResult.value),
        (actionResult) => {
          switch (actionResult.tag) {
            case "unhandled":
              return invalid(state);
            case "invalid":
              return invalid(setErrors(state, actionResult.value));
            case "valid": {
              state = setErrors(state, {});
              // Update the attachments component accordingly.
              const [newAttachmentsState, newAttachmentsCmds] =
                Attachments.init({
                  existingAttachments: actionResult.value.attachments || [],
                  newAttachmentMetadata
                });
              state = state.set("attachments", immutable(newAttachmentsState));
              return valid([
                state,
                component_.cmd.mapMany(
                  newAttachmentsCmds,
                  (msg) => adt("attachments", msg) as Msg
                ),
                actionResult.value
              ]);
            }
          }
        }
      );
    } else {
      return component_.cmd.dispatch(invalid(attachmentsResult.value));
    }
  });
}

function validateWeightsTotal(n: number | null): Validation<number> {
  return n === 100
    ? valid(n)
    : invalid(["The scoring weights should total 100% exactly."]);
}

function updateWeightsTotal(state: Immutable<State>): Immutable<State> {
  const questionsWeight = FormField.getValue(state.questionsWeight) || 0;
  const codeChallengeWeight =
    FormField.getValue(state.codeChallengeWeight) || 0;
  const scenarioWeight = FormField.getValue(state.scenarioWeight) || 0;
  const priceWeight = FormField.getValue(state.priceWeight) || 0;
  const total =
    questionsWeight + codeChallengeWeight + scenarioWeight + priceWeight;
  return state.update("weightsTotal", (s) => {
    return FormField.validateAndSetValue(s, total, validateWeightsTotal);
  });
}

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

    case "hidePhaseInfo":
      return [state.set("showPhaseInfo", false), []];

    case "title":
      return component_.base.updateChild({
        state,
        childStatePath: ["title"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("title", value)
      });

    case "teaser":
      return component_.base.updateChild({
        state,
        childStatePath: ["teaser"],
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("teaser", value)
      });

    case "remoteOk":
      return component_.base.updateChild({
        state,
        childStatePath: ["remoteOk"],
        childUpdate: RemoteOkRadioGroup.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("remoteOk", value),
        updateAfter: (state) => [
          state.update("remoteDesc", (s) => {
            const remoteOk = FormField.getValue(state.remoteOk) === "yes";
            return FormField.setValidate(
              s,
              (v) => genericValidation.validateRemoteDesc(v, remoteOk),
              remoteOk
            );
          }),
          []
        ]
      });

    case "remoteDesc":
      return component_.base.updateChild({
        state,
        childStatePath: ["remoteDesc"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("remoteDesc", value)
      });

    case "location":
      return component_.base.updateChild({
        state,
        childStatePath: ["location"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("location", value)
      });

    case "proposalDeadline":
      return component_.base.updateChild({
        state,
        childStatePath: ["proposalDeadline"],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("proposalDeadline", value),
        updateAfter: (state) => [resetAssignmentDate(state), []]
      });

    case "assignmentDate":
      return component_.base.updateChild({
        state,
        childStatePath: ["assignmentDate"],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("assignmentDate", value),
        updateAfter: (state) => [
          state.update("phases", (s) =>
            Phases.updateAssignmentDate(
              s,
              DateField.getDate(state.assignmentDate)
            )
          ),
          []
        ]
      });

    case "totalMaxBudget":
      return component_.base.updateChild({
        state,
        childStatePath: ["totalMaxBudget"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("totalMaxBudget", value),
        updateAfter: (state) => [
          state.update("phases", (s) =>
            Phases.updateTotalMaxBudget(
              s,
              FormField.getValue(state.totalMaxBudget) || undefined
            )
          ),
          []
        ]
      });

    case "costRecovery":
      return component_.base.updateChild({
        state,
        childStatePath: ["costRecovery"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("costRecovery", value)
      });

    case "minTeamMembers":
      return component_.base.updateChild({
        state,
        childStatePath: ["minTeamMembers"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("minTeamMembers", value)
      });

    case "mandatorySkills":
      return component_.base.updateChild({
        state,
        childStatePath: ["mandatorySkills"],
        childUpdate: SelectMulti.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("mandatorySkills", value)
      });

    case "optionalSkills":
      return component_.base.updateChild({
        state,
        childStatePath: ["optionalSkills"],
        childUpdate: SelectMulti.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("optionalSkills", value)
      });

    case "description":
      return component_.base.updateChild({
        state,
        childStatePath: ["description"],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("description", value)
      });

    case "startingPhase":
      return component_.base.updateChild({
        state,
        childStatePath: ["startingPhase"],
        childUpdate: Select.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("startingPhase", value),
        updateAfter: (state) => {
          const rawStartingPhase = FormField.getValue(
            state.startingPhase
          )?.value;
          const startingPhase = rawStartingPhase
            ? parseSWUOpportunityPhaseType(rawStartingPhase)
            : undefined;
          return [
            state
              .set(
                "phases",
                Phases.setStartingPhase(
                  state.phases,
                  startingPhase || undefined,
                  DateField.getDate(state.assignmentDate)
                )
              )
              .set("showPhaseInfo", true),
            []
          ];
        }
      });

    case "phases":
      return component_.base.updateChild({
        state,
        childStatePath: ["phases"],
        childUpdate: Phases.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("phases", value)
      });

    case "teamQuestions":
      return component_.base.updateChild({
        state,
        childStatePath: ["teamQuestions"],
        childUpdate: TeamQuestions.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("teamQuestions", value)
      });

    case "questionsWeight":
      return component_.base.updateChild({
        state,
        childStatePath: ["questionsWeight"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("questionsWeight", value),
        updateAfter: (state) => [updateWeightsTotal(state), []]
      });

    case "codeChallengeWeight":
      return component_.base.updateChild({
        state,
        childStatePath: ["codeChallengeWeight"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("codeChallengeWeight", value),
        updateAfter: (state) => [updateWeightsTotal(state), []]
      });

    case "scenarioWeight":
      return component_.base.updateChild({
        state,
        childStatePath: ["scenarioWeight"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("scenarioWeight", value),
        updateAfter: (state) => [updateWeightsTotal(state), []]
      });

    case "priceWeight":
      return component_.base.updateChild({
        state,
        childStatePath: ["priceWeight"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("priceWeight", value),
        updateAfter: (state) => [updateWeightsTotal(state), []]
      });

    case "weightsTotal":
      return component_.base.updateChild({
        state,
        childStatePath: ["weightsTotal"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("weightsTotal", value)
      });

    case "attachments":
      return component_.base.updateChild({
        state,
        childStatePath: ["attachments"],
        childUpdate: Attachments.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("attachments", value)
      });

    case "evaluationPanel":
      return component_.base.updateChild({
        state,
        childStatePath: ["evaluationPanel"],
        childUpdate: EvaluationPanel.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("evaluationPanel", value)
      });
  }
};

export const AgreementView: component_.base.View = () => (
  <div className="table-responsive">
    <table className="table-hover" style={{ textAlign: "center" }}>
      <thead className="table-light">
        <tr>
          <th className="text-start" style={{ width: "50%" }}>
            Responsibility
          </th>
          <th className="text-nowrap" style={{ width: "50%" }}>
            Gov. Business Area
          </th>
          <th className="text-nowrap" style={{ width: 0 }}>
            Digital Marketplace
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="text-start">Project Funding</td>
          <td>
            <Icon name="check" />
          </td>
          <td />
        </tr>
        <tr>
          <td className="text-start">Problem Statement</td>
          <td>
            <Icon name="check" />
          </td>
          <td />
        </tr>
        <tr>
          <td className="text-start">Business Area Expertise</td>
          <td>
            <Icon name="check" />
          </td>
          <td />
        </tr>
        <tr>
          <td className="text-start">Technical SME</td>
          <td>
            <Icon name="check" />
          </td>
          <td />
        </tr>
        <tr>
          <td className="text-start">Product Owner/Roadmap</td>
          <td>
            <Icon name="check" />
          </td>
          <td />
        </tr>
        <tr>
          <td className="text-start">Creating Opportunity</td>
          <td>
            <Icon name="check" />
          </td>
          <td />
        </tr>
        <tr>
          <td className="text-start">Evaluating Proposals</td>
          <td>
            <Icon name="check" />
          </td>
          <td />
        </tr>
        <tr>
          <td className="text-start">Consultancy</td>
          <td />
          <td>
            <Icon name="check" />
          </td>
        </tr>
        <tr>
          <td className="text-start text-nowrap">
            Tech Advice (Code Challenge)
          </td>
          <td />
          <td>
            <Icon name="check" />
          </td>
        </tr>
        <tr>
          <td className="text-start">Procurement Advice</td>
          <td />
          <td>
            <Icon name="check" />
          </td>
        </tr>
        <tr>
          <td className="text-start">Support</td>
          <td />
          <td>
            <Icon name="check" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

export const EvaluationPanelView: component_.base.View<Props> = ({
  disabled,
  state,
  dispatch
}) => (
  <Row>
    <Col xs="12">
      <EvaluationPanel.view
        disabled={disabled}
        state={state.evaluationPanel}
        dispatch={component_.base.mapDispatch(dispatch, (value) =>
          adt("evaluationPanel" as const, value)
        )}
      />
    </Col>
  </Row>
);

export const OverviewView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
      <Col xs="12">
        <ShortText.view
          extraChildProps={{}}
          label="Title"
          placeholder="Opportunity Title"
          help="Provide a brief and short title for the opportunity that highlights the work that you need done."
          required
          disabled={disabled}
          state={state.title}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("title" as const, value)
          )}
        />
      </Col>

      <Col xs="12">
        <LongText.view
          label="Teaser"
          placeholder="Provide 1-2 sentences that describe to readers what you are inviting them to do."
          help="Provide 1-2 sentences that will entice readers to apply to this opportunity and that describes what you are inviting them to do."
          extraChildProps={{
            style: { height: "200px" }
          }}
          disabled={disabled}
          state={state.teaser}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("teaser" as const, value)
          )}
        />
      </Col>

      <Col md="12">
        <RemoteOkRadioGroup.view
          extraChildProps={{ inline: true }}
          required
          label="Remote OK?"
          help="Indicate if the successful proponent may complete the work as outlined in the opportunity’s acceptance criteria remotely or not. If you select “yes”, provide further details on acceptable remote work options."
          disabled={disabled}
          state={state.remoteOk}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("remoteOk" as const, value)
          )}
        />
      </Col>

      {RadioGroup.valueEquals(state.remoteOk, "yes") ? (
        <Col xs="12">
          <LongText.view
            label="Remote Description"
            placeholder={`Provide further information about this opportunity's remote work options.`}
            required
            disabled={disabled}
            extraChildProps={{
              style: { height: "160px" }
            }}
            state={state.remoteDesc}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("remoteDesc" as const, value)
            )}
          />
        </Col>
      ) : null}

      <Col md="8" xs="12">
        <ShortText.view
          extraChildProps={{}}
          label="Location"
          placeholder="Location"
          help="Provide the location where you are located or where the work is expected to be completed."
          required
          disabled={disabled}
          state={state.location}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("location" as const, value)
          )}
        />
      </Col>

      <Col xs="12" md="6">
        <DateField.view
          required
          extraChildProps={{}}
          label="Proposal Deadline"
          help={
            <div>
              <p>
                Choose a cut-off date for when proposals must be submitted by.
                The cut-off time is fixed to 4:00PM Pacific Time.
              </p>
              <p className="mb-0">
                A deadline of at least ten (10) days from the date that the
                opportunity is published is recommended.
              </p>
            </div>
          }
          state={state.proposalDeadline}
          disabled={disabled}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("proposalDeadline" as const, value)
          )}
        />
      </Col>

      <Col xs="12" md="6">
        <DateField.view
          required
          extraChildProps={{}}
          label="Assignment Date"
          help="Choose a date that you will award the successful proponent the opportunity. The assignment date is fixed to 4:00PM Pacific Time."
          state={state.assignmentDate}
          disabled={disabled}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("assignmentDate" as const, value)
          )}
        />
      </Col>

      <Col md="8" xs="12">
        <NumberField.view
          extraChildProps={{ prefix: "$" }}
          label="Total Maximum Budget"
          placeholder="Total Maximum Budget"
          help="Provide a dollar value for the maximum amount of money that you can spend to complete the work as provided in the opportunity’s details."
          required
          disabled={disabled}
          state={state.totalMaxBudget}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("totalMaxBudget" as const, value)
          )}
        />
      </Col>

      <Col md="8" xs="12">
        <NumberField.view
          extraChildProps={{ prefix: "$" }}
          label="Cost Recovery"
          placeholder="Cost Recovery"
          help={
            <div>
              <p className="mb-0">
                See{" "}
                <Link
                  dest={routeDest(
                    adt("contentView", "service-level-agreement")
                  )}>
                  Service Level Agreement
                </Link>{" "}
                for more details on Cost Recovery and Services provided
              </p>
            </div>
          }
          required
          disabled={true}
          state={state.costRecovery}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("costRecovery" as const, value)
          )}
        />
      </Col>

      <Col md="8" xs="12">
        <NumberField.view
          extraChildProps={{}}
          label="Recommended Minimum Team Members"
          placeholder="Recommended Minimum Team Members"
          help="Provide the recommended minimum number of team members that you will require the successful proponent to supply in order to complete the work as outlined in the opportunity’s details."
          disabled={disabled}
          state={state.minTeamMembers}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("minTeamMembers" as const, value)
          )}
        />
      </Col>

      <Col xs="12">
        <SelectMulti.view
          extraChildProps={{}}
          label="Mandatory Skills"
          placeholder="Mandatory Skills"
          help="Select the skill(s) from the list provided that the successful proponent must possess in order to be considered for the opportunity. If you do not see the skill(s) that you are looking for, you may create a new skill by entering it into the field below."
          required
          disabled={disabled}
          state={state.mandatorySkills}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("mandatorySkills" as const, value)
          )}
        />
      </Col>

      <Col xs="12">
        <SelectMulti.view
          extraChildProps={{}}
          label="Optional Skills"
          placeholder="Optional Skills"
          help="Select the skill(s) from the list provided that the successful proponent may possess that would be considered a bonus, or nice-to-have, but is/are not required in order to be awarded the opportunity. If you do not see the skill(s) that you are looking for, you may create a new skill by entering it into the field below."
          disabled={disabled}
          state={state.optionalSkills}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("optionalSkills" as const, value)
          )}
        />
      </Col>
    </Row>
  );
};

export const DescriptionView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
      <Col xs="12">
        <RichMarkdownEditor.view
          required
          label="Description"
          placeholder="Describe this opportunity."
          help="Provide a complete description of the opportunity. For example, you may choose to include background information, a description of what you are attempting to accomplish by offering the opportunity, etc. You can format this description with Markdown."
          extraChildProps={{
            style: { height: "60vh", minHeight: "400px" }
          }}
          disabled={disabled}
          state={state.description}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("description" as const, value)
          )}
        />
      </Col>
    </Row>
  );
};

export const PhasesView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  const rawStartingPhase = FormField.getValue(state.startingPhase);
  const startingPhase = rawStartingPhase
    ? parseSWUOpportunityPhaseType(rawStartingPhase.value)
    : null;
  return (
    <Row>
      <Col xs="12">
        <Select.view
          required
          extraChildProps={{}}
          className="mb-0"
          label="Which phase do you want to start with?"
          placeholder="Select Phase"
          help="Select the phase from which you would like to begin the opportunity. The phases progress in order from Inception, Proof of Concept and Implementation. Each phase has its own expected set of tasks and deliverables."
          state={state.startingPhase}
          disabled={disabled}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("startingPhase" as const, value)
          )}
        />
        {startingPhase && state.showPhaseInfo ? (
          <Alert color="primary" fade={false} className="mt-4 mb-0">
            <div className="d-flex align-items-start">
              <div
                className="flex-grow-1 pe-3"
                style={{ whiteSpace: "pre-line" }}>
                {(() => {
                  switch (startingPhase) {
                    case SWUOpportunityPhaseType.Inception:
                      return `You're ready for the Inception phase if you have:
                                - Completed Discovery work with stakeholders and potential end users.
                                - Have clear business objectives and a solid understanding of your users' needs.
                                - Have strong support from your senior executive.`;
                    case SWUOpportunityPhaseType.Prototype:
                      return `You're ready for the Proof of Concept phase if you have:
                                - A clear product vision.
                                - A three-month backlog.`;
                    case SWUOpportunityPhaseType.Implementation:
                      return `You've reached the Implementation phase when you:
                                - Have the product in production.
                                - Have a Product Roadmap.
                                - Know the resources you need for full implementation.`;
                  }
                })()}
              </div>
              <Icon
                hover
                name="times"
                width={1}
                height={1}
                color="primary"
                onClick={() => dispatch(adt("hidePhaseInfo"))}
                className="mt-1 o-75 flex-grow-0 flex-shrink-0"
              />
            </div>
          </Alert>
        ) : null}
      </Col>
      {startingPhase ? (
        <Col xs="12">
          <div className="mt-5 pt-5 border-top">
            <Phases.view
              disabled={disabled}
              state={state.phases}
              dispatch={component_.base.mapDispatch(dispatch, (value) =>
                adt("phases" as const, value)
              )}
            />
          </div>
        </Col>
      ) : null}
    </Row>
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

export const ScoringView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <div>
      <Row>
        <Col xs="12">
          <p>
            Each submitted proposal will be scored for each stage of the
            evaluation process. Assign a weight to each evaluation stage using
            the fields available below.
          </p>
          <p className="mb-4 font-size-small fst-italic">
            Note: Weights are specified as percentages and the sum of all
            weights must total 100%.
          </p>
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="4">
          <NumberField.view
            extraChildProps={{ suffix: "%" }}
            label="Team Questions"
            disabled={disabled}
            state={state.questionsWeight}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("questionsWeight" as const, value)
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="4">
          <NumberField.view
            extraChildProps={{ suffix: "%" }}
            label="Code Challenge"
            disabled={disabled}
            state={state.codeChallengeWeight}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("codeChallengeWeight" as const, value)
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="4">
          <NumberField.view
            extraChildProps={{ suffix: "%" }}
            label="Team Scenario"
            disabled={disabled}
            state={state.scenarioWeight}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("scenarioWeight" as const, value)
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="4">
          <NumberField.view
            extraChildProps={{ suffix: "%" }}
            label="Price"
            disabled={disabled}
            state={state.priceWeight}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("priceWeight" as const, value)
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="4">
          <NumberField.view
            extraChildProps={{ suffix: "%" }}
            label="Total Score"
            disabled
            state={state.weightsTotal}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("weightsTotal" as const, value)
            )}
          />
        </Col>
      </Row>
    </div>
  );
};

// @duplicated-attachments-view
export const AttachmentsView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
      <Col xs="12">
        <p>
          Upload any supporting material for your opportunity here. Attachments
          must be smaller than 10MB.
        </p>
        <Attachments.view
          dispatch={component_.base.mapDispatch(dispatch, (msg) =>
            adt("attachments" as const, msg)
          )}
          state={state.attachments}
          disabled={disabled}
          className="mt-4"
        />
      </Col>
    </Row>
  );
};

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: component_.base.View<Props> = (props) => {
  const { state, dispatch } = props;
  const activeTab = (() => {
    switch (TabbedForm.getActiveTab(state.tabbedForm)) {
      case "Agreement":
        return <AgreementView />;
      case "Evaluation Panel":
        return <EvaluationPanelView {...props} />;
      case "Overview":
        return <OverviewView {...props} />;
      case "Description":
        return <DescriptionView {...props} />;
      case "Phases":
        return <PhasesView {...props} />;
      case "Team Questions":
        return <TeamQuestionsView {...props} />;
      case "Scoring":
        return <ScoringView {...props} />;
      case "Attachments":
        return <AttachmentsView {...props} />;
    }
  })();
  return (
    <TabbedFormComponent.view
      valid={isValid(state)}
      disabled={props.disabled}
      getTabLabel={(a) => a}
      isTabValid={(tab) => {
        switch (tab) {
          case "Agreement":
            return true;
          case "Evaluation Panel":
            return isEvaluationPanelTabValid(state);
          case "Overview":
            return isOverviewTabValid(state);
          case "Description":
            return isDescriptionTabValid(state);
          case "Phases":
            return isPhasesTabValid(state);
          case "Team Questions":
            return isTeamQuestionsTabValid(state);
          case "Scoring":
            return isScoringTabValid(state);
          case "Attachments":
            return isAttachmentsTabValid(state);
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
