import { DEFAULT_LOCATION } from "front-end/config";
import * as Attachments from "front-end/lib/components/attachments";
import * as FormField from "front-end/lib/components/form-field";
import * as DateField from "front-end/lib/components/form-field/date";
import * as LongText from "front-end/lib/components/form-field/long-text";
import * as NumberField from "front-end/lib/components/form-field/number";
import * as RadioGroup from "front-end/lib/components/form-field/radio-group";
import * as RichMarkdownEditor from "front-end/lib/components/form-field/rich-markdown-editor";
import * as Select from "front-end/lib/components/form-field/select";
import * as ShortText from "front-end/lib/components/form-field/short-text";
import * as TabbedForm from "front-end/lib/components/tabbed-form";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as ResourceQuestions from "front-end/lib/pages/opportunity/team-with-us/lib/components/resource-questions";
import * as Resources from "front-end/lib/pages/opportunity/team-with-us/lib/components/resources";
import React from "react";
import { Col, Row } from "reactstrap";
import { getNumber } from "shared/lib";
import { FileUploadMetadata } from "shared/lib/resources/file";
import {
  canTWUOpportunityDetailsBeEdited,
  CreateRequestBody,
  CreateTWUOpportunityStatus,
  CreateValidationErrors,
  UpdateValidationErrors,
  DEFAULT_CODE_CHALLENGE_WEIGHT,
  DEFAULT_PRICE_WEIGHT,
  DEFAULT_QUESTIONS_WEIGHT,
  TWUOpportunity,
  TWUOpportunityStatus,
  UpdateEditValidationErrors,
  CreateTWUResourceBody
} from "shared/lib/resources/opportunity/team-with-us";
import { isAdmin, User } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import {
  invalid,
  mapValid,
  valid,
  isValid as isValid_,
  Validation
} from "shared/lib/validation";
import * as opportunityValidation from "shared/lib/validation/opportunity/team-with-us";
import * as genericValidation from "shared/lib/validation/opportunity/utility";

type RemoteOk = "yes" | "no";

const RemoteOkRadioGroup = RadioGroup.makeComponent<RemoteOk>();

export type TabId =
  | "Overview"
  | "Resource Details"
  | "Description"
  | "Resource Questions"
  | "Scoring"
  | "Attachments";

const TabbedFormComponent = TabbedForm.makeComponent<TabId>();

const newAttachmentMetadata: FileUploadMetadata = [];

export interface State {
  opportunity?: TWUOpportunity;
  viewerUser: User;
  tabbedForm: Immutable<TabbedForm.State<TabId>>;
  // Overview Tab
  title: Immutable<ShortText.State>;
  teaser: Immutable<LongText.State>;
  remoteOk: Immutable<RadioGroup.State<RemoteOk>>;
  remoteDesc: Immutable<LongText.State>;
  location: Immutable<ShortText.State>;
  proposalDeadline: Immutable<DateField.State>;
  assignmentDate: Immutable<DateField.State>;
  startDate: Immutable<DateField.State>;
  completionDate: Immutable<DateField.State>;
  maxBudget: Immutable<NumberField.State>;
  // Resource Details Tab
  resources: Immutable<Resources.State>;
  // Description Tab
  description: Immutable<RichMarkdownEditor.State>;
  // Team Questions Tab
  resourceQuestions: Immutable<ResourceQuestions.State>;
  // Scoring Tab
  questionsWeight: Immutable<NumberField.State>;
  challengeWeight: Immutable<NumberField.State>;
  priceWeight: Immutable<NumberField.State>;
  weightsTotal: Immutable<NumberField.State>;
  // Attachments tab
  attachments: Immutable<Attachments.State>;
  preserveData: boolean;
}

export type Msg =
  | ADT<"tabbedForm", TabbedForm.Msg<TabId>>
  // Overview Tab
  | ADT<"title", ShortText.Msg>
  | ADT<"teaser", LongText.Msg>
  | ADT<"remoteOk", RadioGroup.Msg<RemoteOk>>
  | ADT<"remoteDesc", LongText.Msg>
  | ADT<"location", ShortText.Msg>
  | ADT<"proposalDeadline", DateField.Msg>
  | ADT<"assignmentDate", DateField.Msg>
  | ADT<"startDate", DateField.Msg>
  | ADT<"completionDate", DateField.Msg>
  | ADT<"maxBudget", NumberField.Msg>
  // Resource Details Tab
  | ADT<"resources", Resources.Msg>
  // Description Tab
  | ADT<"description", RichMarkdownEditor.Msg>
  // Team Questions Tab
  | ADT<"resourceQuestions", ResourceQuestions.Msg>
  // Scoring Tab
  | ADT<"questionsWeight", NumberField.Msg>
  | ADT<"challengeWeight", NumberField.Msg>
  | ADT<"priceWeight", NumberField.Msg>
  | ADT<"weightsTotal", NumberField.Msg>
  // Attachments tab
  | ADT<"attachments", Attachments.Msg>;

export interface Params {
  canRemoveExistingAttachments: boolean;
  opportunity?: TWUOpportunity;
  viewerUser: User;
  activeTab?: TabId;
}

export function getActiveTab(state: Immutable<State>): TabId {
  return TabbedForm.getActiveTab(state.tabbedForm);
}

const DEFAULT_ACTIVE_TAB: TabId = "Overview";
type DateFieldKey = Extract<
  Msg["tag"],
  "startDate" | "assignmentDate" | "completionDate"
>;
export function setValidateDate(
  state: Immutable<State>,
  k: DateFieldKey,
  validate: (_: string) => Validation<Date | null>
): Immutable<State> {
  return state.update(k, (s) =>
    FormField.setValidate(
      s,
      DateField.validateDate(validate),
      !!FormField.getValue(s)
    )
  );
}

/**
 * Initializes components on the page
 */
export const init: component_.base.Init<Params, State, Msg> = ({
  canRemoveExistingAttachments,
  opportunity,
  viewerUser,
  activeTab = DEFAULT_ACTIVE_TAB
}) => {
  const questionsWeight = getNumber(
    opportunity,
    "questionsWeight",
    DEFAULT_QUESTIONS_WEIGHT
  );
  const challengeWeight = getNumber(
    opportunity,
    "challengeWeight",
    DEFAULT_CODE_CHALLENGE_WEIGHT
  );
  const priceWeight = getNumber(
    opportunity,
    "priceWeight",
    DEFAULT_PRICE_WEIGHT
  );

  // Used to flag when an opportunity is being created (undefined) or edited (draft/under review)
  const isStatusNotDraftOrUnderReview =
    opportunity?.status !== TWUOpportunityStatus.Draft &&
    opportunity?.status !== TWUOpportunityStatus.UnderReview &&
    opportunity?.status !== undefined;

  const [tabbedFormState, tabbedFormCmds] = TabbedFormComponent.init({
    tabs: [
      "Overview",
      "Resource Details",
      "Description",
      "Resource Questions",
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
      id: "twu-opportunity-title"
    }
  });
  const [teaserState, teaserCmds] = LongText.init({
    errors: [],
    validate: genericValidation.validateTeaser,
    child: {
      value: opportunity?.teaser || "",
      id: "twu-opportunity-teaser"
    }
  });
  const [locationState, locationCmds] = ShortText.init({
    errors: [],
    validate: genericValidation.validateLocation,
    child: {
      type: "text",
      value: opportunity?.location || DEFAULT_LOCATION,
      id: "twu-opportunity-location"
    }
  });
  const [remoteOkState, remoteOkCmds] = RemoteOkRadioGroup.init({
    errors: [],
    validate: (v) =>
      v === null ? invalid(["Please select an option."]) : valid(v),
    child: {
      id: "twu-opportunity-remote-ok",
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
      id: "twu-opportunity-remote-desc"
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
      id: "twu-opportunity-proposal-deadline"
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
      id: "twu-opportunity-assignment-date"
    }
  });

  const [startDateState, startDateCmds] = DateField.init({
    errors: [],
    validate: DateField.validateDate((v) =>
      genericValidation.validateDateFormatMinMax(
        v,
        opportunity?.assignmentDate || new Date()
      )
    ),
    child: {
      value: opportunity ? DateField.dateToValue(opportunity.startDate) : null,
      id: "twu-opportunity-start-date"
    }
  });
  const [completionDateState, completionDateCmds] = DateField.init({
    errors: [],
    validate: DateField.validateDate((v) =>
      genericValidation.validateDateFormatMinMax(
        v,
        opportunity?.startDate || new Date()
      )
    ),
    child: {
      value: opportunity?.completionDate
        ? DateField.dateToValue(opportunity.completionDate)
        : null,
      id: "twu-opportunity-completion-date"
    }
  });
  const [maxBudgetState, maxBudgetCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid Maximum Budget."]);
      }
      return opportunityValidation.validateMaxBudget(v);
    },
    child: {
      value: opportunity?.maxBudget ?? null,
      id: "twu-opportunity-max-budget",
      min: 1
    }
  });
  const [resourcesState, resourcesCmds] = Resources.init({
    resources: opportunity?.resources || []
  });
  const [descriptionState, descriptionCmds] = RichMarkdownEditor.init({
    errors: [],
    validate: genericValidation.validateDescription,
    child: {
      value: opportunity?.description || "",
      id: "twu-opportunity-description",
      uploadImage: api.files.markdownImages.makeUploadImage()
    }
  });

  const [resourceQuestionsState, resourceQuestionsCmds] =
    ResourceQuestions.init({
      questions: opportunity?.resourceQuestions || []
    });
  const [questionsWeightState, questionsWeightCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid weight for resource questions."]);
      }
      return opportunityValidation.validateQuestionsWeight(v);
    },
    child: {
      value: questionsWeight,
      id: "twu-opportunity-questions-weight",
      min: 0
    }
  });
  const [challengeWeightState, challengeWeightCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid code challenge weight."]);
      }
      return opportunityValidation.validateChallengeWeight(v);
    },
    child: {
      value: challengeWeight,
      id: "twu-opportunity-code-challenge-weight",
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
      id: "twu-opportunity-price-weight",
      min: 0
    }
  });
  const [weightsTotalState, weightsTotalCmds] = NumberField.init({
    errors: [],
    validate: validateWeightsTotal,
    child: {
      value: questionsWeight + challengeWeight + priceWeight,
      id: "twu-opportunity-weights-total",
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
      tabbedForm: immutable(tabbedFormState),
      title: immutable(titleState),
      teaser: immutable(teaserState),
      location: immutable(locationState),
      remoteOk: immutable(remoteOkState),
      remoteDesc: immutable(remoteDescState),
      proposalDeadline: immutable(proposalDeadlineState),
      assignmentDate: immutable(assignmentDateState),
      startDate: immutable(startDateState),
      completionDate: immutable(completionDateState),
      maxBudget: immutable(maxBudgetState),
      resources: immutable(resourcesState),
      description: immutable(descriptionState),
      resourceQuestions: immutable(resourceQuestionsState),
      questionsWeight: immutable(questionsWeightState),
      challengeWeight: immutable(challengeWeightState),
      priceWeight: immutable(priceWeightState),
      weightsTotal: immutable(weightsTotalState),
      attachments: immutable(attachmentsState),
      preserveData: isStatusNotDraftOrUnderReview
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
      ...component_.cmd.mapMany(startDateCmds, (msg) => adt("startDate", msg)),
      ...component_.cmd.mapMany(completionDateCmds, (msg) =>
        adt("completionDate", msg)
      ),
      ...component_.cmd.mapMany(maxBudgetCmds, (msg) => adt("maxBudget", msg)),
      ...component_.cmd.mapMany(resourcesCmds, (msg) => adt("resources", msg)),
      ...component_.cmd.mapMany(descriptionCmds, (msg) =>
        adt("description", msg)
      ),
      ...component_.cmd.mapMany(resourceQuestionsCmds, (msg) =>
        adt("resourceQuestions", msg)
      ),
      ...component_.cmd.mapMany(questionsWeightCmds, (msg) =>
        adt("questionsWeight", msg)
      ),
      ...component_.cmd.mapMany(challengeWeightCmds, (msg) =>
        adt("challengeWeight", msg)
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
      .update("startDate", (s) =>
        FormField.setErrors(s, errors.startDate || [])
      )
      .update("completionDate", (s) =>
        FormField.setErrors(s, errors.completionDate || [])
      )
      .update("maxBudget", (s) =>
        FormField.setErrors(s, errors.maxBudget || [])
      )
      .update("resources", (s) =>
        Resources.setErrors(s, errors.resources || [])
      )
      .update("description", (s) =>
        FormField.setErrors(s, errors.description || [])
      )
      .update("resourceQuestions", (s) =>
        ResourceQuestions.setErrors(s, errors.resourceQuestions)
      );
  } else {
    return state;
  }
}

/**
 * Checks and sets state. Takes a value, checks to see if it's of a type "Validate".
 * Returns state with the new value.
 *
 * @param state
 * @returns
 */
export function validate(state: Immutable<State>): Immutable<State> {
  return state
    .update("title", (s) => FormField.validate(s))
    .update("teaser", (s) => FormField.validate(s))
    .update("remoteOk", (s) => FormField.validate(s))
    .update("remoteDesc", (s) => FormField.validate(s))
    .update("location", (s) => FormField.validate(s))
    .update("proposalDeadline", (s) => FormField.validate(s))
    .update("assignmentDate", (s) => FormField.validate(s))
    .update("startDate", (s) => FormField.validate(s))
    .update("completionDate", (s) => FormField.validate(s))
    .update("maxBudget", (s) => FormField.validate(s))
    .update("resources", (s) => Resources.validate(s))
    .update("description", (s) => FormField.validate(s))
    .update("resourceQuestions", (s) => ResourceQuestions.validate(s))
    .update("questionsWeight", (s) => FormField.validate(s))
    .update("challengeWeight", (s) => FormField.validate(s))
    .update("priceWeight", (s) => FormField.validate(s))
    .update("weightsTotal", (s) => FormField.validate(s))
    .update("attachments", (s) => Attachments.validate(s));
}

/**
 * Certain form fields belong to different tabs on the page.
 * This checks that all fields in the 'Overview' tab (1 of 6) are valid, meaning
 * the state is an ADT.
 *
 * @param state
 * @returns
 */
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
    FormField.isValid(state.startDate) &&
    FormField.isValid(state.completionDate) &&
    FormField.isValid(state.maxBudget)
  );
}

/**
 * Checks that all fields in the 'Resource Details' tab (2 of 6) are valid.
 * @param state
 */
export function isResourceDetailsTabValid(state: Immutable<State>): boolean {
  return Resources.isValid(state.resources);
}

/**
 * Checks that all fields in the 'Description' tab (3 of 6) are valid.
 *
 * @param state
 * @returns
 */
export function isDescriptionTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.description);
}

/**
 * Checks that all fields in the 'Resource Questions' tab (4 of 6) are valid.
 *
 * @param state
 * @returns
 */
export function isResourceQuestionsTabValid(state: Immutable<State>): boolean {
  return ResourceQuestions.isValid(state.resourceQuestions);
}

/**
 * Checks that all fields in the 'Scoring' tab (5 of 6) are valid.
 *
 * @param state
 * @returns
 */
export function isScoringTabValid(state: Immutable<State>): boolean {
  return (
    FormField.isValid(state.questionsWeight) &&
    FormField.isValid(state.challengeWeight) &&
    FormField.isValid(state.priceWeight) &&
    FormField.isValid(state.weightsTotal)
  );
}

/**
 * Checks that all fields in the 'Attachments' tab (6 of 6) are valid.
 *
 * @param state
 * @returns
 */
export function isAttachmentsTabValid(state: Immutable<State>): boolean {
  return Attachments.isValid(state.attachments);
}

/**
 * Checks if all (6) tabs have valid content
 *
 * @param state
 * @returns boolean
 */
export function isValid(state: Immutable<State>): boolean {
  return (
    isOverviewTabValid(state) &&
    isResourceDetailsTabValid(state) &&
    isDescriptionTabValid(state) &&
    isResourceQuestionsTabValid(state) &&
    isScoringTabValid(state) &&
    isAttachmentsTabValid(state)
  );
}

/**
 * Gets the numerical value of a select field.
 *
 * @param state
 * @returns number | null
 */
export function getNumberSelectValue(state: Immutable<Select.State>) {
  const value = parseFloat(Select.getValue(state));
  return isNaN(value) ? null : value;
}

export type Values = Omit<CreateRequestBody, "attachments" | "status"> & {
  resources: CreateTWUResourceBody[];
};

/**
 * Where state is stored as an object, some types
 * require converting the values of state objects to their
 * desired type (such as Date, string, or string[])
 *
 * @param state
 * @returns
 */
export function getValues(state: Immutable<State>): Values {
  const questionsWeight = FormField.getValue(state.questionsWeight) || 0;
  const challengeWeight = FormField.getValue(state.challengeWeight) || 0;
  const priceWeight = FormField.getValue(state.priceWeight) || 0;
  const maxBudget = FormField.getValue(state.maxBudget) || 0;
  const resourceQuestions = ResourceQuestions.getValues(
    state.resourceQuestions
  );
  const resources = Resources.getValues(state.resources);
  return {
    title: FormField.getValue(state.title),
    teaser: FormField.getValue(state.teaser),
    remoteOk: FormField.getValue(state.remoteOk) === "yes",
    remoteDesc: FormField.getValue(state.remoteDesc),
    location: FormField.getValue(state.location),
    proposalDeadline: DateField.getValueAsString(state.proposalDeadline),
    assignmentDate: DateField.getValueAsString(state.assignmentDate),
    startDate: DateField.getValueAsString(state.startDate),
    completionDate: DateField.getValueAsString(state.completionDate),
    maxBudget,
    resources,
    description: FormField.getValue(state.description),
    questionsWeight,
    challengeWeight,
    priceWeight,
    resourceQuestions
  };
}

type PersistAction = ADT<"create", CreateTWUOpportunityStatus> | ADT<"update">;

export type PersistResult = Validation<
  [Immutable<State>, component_.Cmd<Msg>[], TWUOpportunity],
  Immutable<State>
>;

export function persist(
  state: Immutable<State>,
  action: PersistAction
): component_.Cmd<PersistResult> {
  const values = getValues(state);
  const isRemoteOkChecked = RadioGroup.isChecked(state.remoteOk);
  const isCreateDraft =
    action.tag === "create" && action.value === TWUOpportunityStatus.Draft;
  const shouldUploadAttachmentsAndUpdate =
    action.tag === "create" ||
    (action.tag === "update" &&
      !!state.opportunity &&
      canTWUOpportunityDetailsBeEdited(
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
      TWUOpportunity,
      UpdateEditValidationErrors | CreateValidationErrors
    >
  > => {
    switch (action.tag) {
      case "create":
        return api.opportunities.twu.create<
          api.ResponseValidation<TWUOpportunity, CreateValidationErrors>
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
          return api.opportunities.twu.update<
            api.ResponseValidation<TWUOpportunity, UpdateEditValidationErrors>
          >()(
            state.opportunity.id,
            adt("edit" as const, {
              ...values,
              remoteOk,
              attachments
            }),
            (
              response: api.ResponseValidation<
                TWUOpportunity,
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
  const challengeWeight = FormField.getValue(state.challengeWeight) || 0;
  const priceWeight = FormField.getValue(state.priceWeight) || 0;
  const total = questionsWeight + challengeWeight + priceWeight;
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
        updateAfter: (state) => [
          setValidateDate(state, "assignmentDate", (v) =>
            genericValidation.validateDateFormatMinMax(
              v,
              DateField.getDate(state.proposalDeadline) || new Date()
            )
          ),
          []
        ]
      });

    case "assignmentDate":
      return component_.base.updateChild({
        state,
        childStatePath: ["assignmentDate"],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("assignmentDate" as const, value),
        updateAfter: (state) => [
          setValidateDate(state, "startDate", (v) =>
            genericValidation.validateDateFormatMinMax(
              v,
              DateField.getDate(state.assignmentDate) || new Date()
            )
          ),
          []
        ]
      });

    case "startDate":
      return component_.base.updateChild({
        state,
        childStatePath: ["startDate"],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("startDate" as const, value),
        updateAfter: (state) => [
          setValidateDate(state, "completionDate", (v) =>
            mapValid(
              genericValidation.validateDateFormatMinMaxOrUndefined(
                v,
                DateField.getDate(state.startDate) || new Date()
              ),
              (w) => w || null
            )
          ),
          []
        ]
      });

    case "completionDate":
      return component_.base.updateChild({
        state,
        childStatePath: ["completionDate"],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("completionDate", value)
      });

    case "maxBudget":
      return component_.base.updateChild({
        state,
        childStatePath: ["maxBudget"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("maxBudget", value)
      });

    case "resources":
      return component_.base.updateChild({
        state,
        childStatePath: ["resources"],
        childUpdate: Resources.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("resources", value)
      });

    case "description":
      return component_.base.updateChild({
        state,
        childStatePath: ["description"],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("description", value)
      });

    case "resourceQuestions":
      return component_.base.updateChild({
        state,
        childStatePath: ["resourceQuestions"],
        childUpdate: ResourceQuestions.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("resourceQuestions", value)
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

    case "challengeWeight":
      return component_.base.updateChild({
        state,
        childStatePath: ["challengeWeight"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("challengeWeight", value),
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
  }
};

const OverviewView: component_.base.View<Props> = ({
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
          placeholder="Provide 1-2 sentences that describe to vendors what you are inviting them to do."
          help="Provide 1-2 sentences that will entice vendors to apply to this opportunity and that describes what you are inviting them to do."
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
          label="Contract Award Date"
          help="Choose a date that you will award the successful proponent the opportunity. The assignment date is fixed to 4:00PM Pacific Time."
          state={state.assignmentDate}
          disabled={disabled}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("assignmentDate" as const, value)
          )}
        />
      </Col>

      <Col xs="12" md="6">
        <DateField.view
          required
          extraChildProps={{}}
          label="Contract Start Date"
          help="Choose a date that you expect the successful proponent to begin the work as outlined in the opportunity’s acceptance criteria."
          state={state.startDate}
          disabled={disabled}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("startDate" as const, value)
          )}
        />
      </Col>

      <Col xs="12" md="6">
        <DateField.view
          required
          extraChildProps={{}}
          label="Contract Completion Date"
          help="Choose a date that you expect the successful proponent to meet the opportunity’s acceptance criteria."
          state={state.completionDate}
          disabled={disabled}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("completionDate" as const, value)
          )}
        />
      </Col>

      <Col xs="12">
        <NumberField.view
          extraChildProps={{ prefix: "$" }}
          label="Maximum Budget"
          placeholder="Maximum Budget"
          help="Provide a dollar value for the maximum amount of money that you can spend to complete the work as provided in the opportunity’s details."
          required
          disabled={disabled}
          state={state.maxBudget}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("maxBudget" as const, value)
          )}
        />
      </Col>
    </Row>
  );
};

const ResourceDetailsView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
      <Col xs="12">
        <Resources.view
          state={state.resources}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("resources" as const, value)
          )}
          disabled={state.preserveData ? true : disabled}
        />
      </Col>
    </Row>
  );
};
const DescriptionView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
      <Col xs="12">
        <RichMarkdownEditor.view
          required
          label="Description and Contract Details"
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

const ResourceQuestionsView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
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

const ScoringView: component_.base.View<Props> = ({
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
          <p className="mb-4 font-size-small font-italic">
            Note: Weights are specified as percentages and the sum of all
            weights must total 100%.
          </p>
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="4">
          <NumberField.view
            extraChildProps={{ suffix: "%" }}
            label="Resource Questions"
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
            label="Interview/Challenge"
            disabled={disabled}
            state={state.challengeWeight}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("challengeWeight" as const, value)
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
const AttachmentsView: component_.base.View<Props> = ({
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
      case "Overview":
        return <OverviewView {...props} />;
      case "Resource Details":
        return <ResourceDetailsView {...props} />;
      case "Description":
        return <DescriptionView {...props} />;
      case "Resource Questions":
        return <ResourceQuestionsView {...props} />;
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
          case "Overview":
            return isOverviewTabValid(state);
          case "Resource Details":
            return isResourceDetailsTabValid(state);
          case "Description":
            return isDescriptionTabValid(state);
          case "Resource Questions":
            return isResourceQuestionsTabValid(state);
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
