import * as Addenda from 'front-end/lib/components/addenda';
import * as Attachments from 'front-end/lib/components/attachments';
import * as FormField from 'front-end/lib/components/form-field';
import * as DateField from 'front-end/lib/components/form-field/date';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import * as NumberField from 'front-end/lib/components/form-field/number';
import * as RadioGroup from 'front-end/lib/components/form-field/radio-group';
import * as RichMarkdownEditor from 'front-end/lib/components/form-field/rich-markdown-editor';
import * as Select from 'front-end/lib/components/form-field/select';
import * as SelectMulti from 'front-end/lib/components/form-field/select-multi';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import * as TabbedForm from 'front-end/lib/components/tabbed-form';
import { Component, ComponentViewProps, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Phases from 'front-end/lib/pages/opportunity/sprint-with-us/lib/components/phases';
import * as TeamQuestions from 'front-end/lib/pages/opportunity/sprint-with-us/lib/components/team-questions';
import Icon from 'front-end/lib/views/icon';
import { flatten } from 'lodash';
import React from 'react';
import { Alert, Col, Row } from 'reactstrap';
import SKILLS from 'shared/lib/data/skills';
import { canSWUOpportunityDetailsBeEdited, CreateRequestBody, CreateSWUOpportunityStatus, CreateValidationErrors, DEFAULT_CODE_CHALLENGE_WEIGHT, DEFAULT_PRICE_WEIGHT, DEFAULT_QUESTIONS_WEIGHT, DEFAULT_SCENARIO_WEIGHT, parseSWUOpportunityPhaseType, SWUOpportunity, SWUOpportunityPhaseType, swuOpportunityPhaseTypeToTitleCase, SWUOpportunityStatus, UpdateEditValidationErrors, UpdateValidationErrors } from 'shared/lib/resources/opportunity/sprint-with-us';
import { Addendum } from 'shared/lib/resources/opportunity/sprint-with-us';
import { isAdmin, User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, mapInvalid, mapValid, valid, Validation } from 'shared/lib/validation';
import * as opportunityValidation from 'shared/lib/validation/opportunity/sprint-with-us';

type RemoteOk = 'yes' | 'no';

const RemoteOkRadioGroup = RadioGroup.makeComponent<RemoteOk>();

export type TabId = 'Overview' | 'Description' | 'Phases' | 'Team Questions' | 'Scoring' | 'Attachments' | 'Addenda';

const TabbedFormComponent = TabbedForm.makeComponent<TabId>();

const newAttachmentMetadata = [adt('any' as const)];

export interface State {
  opportunity?: SWUOpportunity;
  viewerUser: User;
  tabbedForm: Immutable<TabbedForm.State<TabId>>;
  showPhaseInfo: boolean;
  // Overview Tab
  title: Immutable<ShortText.State>;
  teaser: Immutable<LongText.State>;
  remoteOk: Immutable<RadioGroup.State<RemoteOk>>;
  remoteDesc: Immutable<LongText.State>;
  location: Immutable<ShortText.State>;
  proposalDeadline: Immutable<DateField.State>;
  assignmentDate: Immutable<DateField.State>;
  totalMaxBudget: Immutable<NumberField.State>;
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
  // Addenda tab
  addenda: Immutable<Addenda.State> | null;
}

export type Msg
  = ADT<'tabbedForm',         TabbedForm.Msg<TabId>>
  | ADT<'hidePhaseInfo'>
  // Overview Tab
  | ADT<'title', ShortText.Msg>
  | ADT<'teaser', LongText.Msg>
  | ADT<'remoteOk', RadioGroup.Msg<RemoteOk>>
  | ADT<'remoteDesc', LongText.Msg>
  | ADT<'location', ShortText.Msg>
  | ADT<'proposalDeadline', DateField.Msg>
  | ADT<'assignmentDate', DateField.Msg>
  | ADT<'totalMaxBudget', NumberField.Msg>
  | ADT<'minTeamMembers', NumberField.Msg>
  | ADT<'mandatorySkills', SelectMulti.Msg>
  | ADT<'optionalSkills', SelectMulti.Msg>
  // Description Tab
  | ADT<'description', RichMarkdownEditor.Msg>
  // Phases Tab
  | ADT<'startingPhase', Select.Msg>
  | ADT<'phases', Phases.Msg>
  // Team Questions Tab
  | ADT<'teamQuestions', TeamQuestions.Msg>
  // Scoring Tab
  | ADT<'questionsWeight', NumberField.Msg>
  | ADT<'codeChallengeWeight', NumberField.Msg>
  | ADT<'scenarioWeight', NumberField.Msg>
  | ADT<'priceWeight', NumberField.Msg>
  | ADT<'weightsTotal', NumberField.Msg>
  // Attachments tab
  | ADT<'attachments', Attachments.Msg>
  // Addenda tab
  | ADT<'addenda', Addenda.Msg>;

export interface Params {
  canRemoveExistingAttachments: boolean;
  opportunity?: SWUOpportunity;
  viewerUser: User;
  activeTab?: TabId;
  showAddendaTab?: boolean;
}

export function getActiveTab(state: Immutable<State>): TabId {
  return TabbedForm.getActiveTab(state.tabbedForm);
}

const DEFAULT_ACTIVE_TAB: TabId = 'Overview';

function makePhaseTypeOption(value: SWUOpportunityPhaseType): Select.Option {
  return value && {
    value,
    label: swuOpportunityPhaseTypeToTitleCase(value)
  };
}

function getStartingPhase(opportunity?: SWUOpportunity): SWUOpportunityPhaseType | null {
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
  return state.update('assignmentDate', s => {
    return FormField.setValidate(
      s,
      DateField.validateDate(v => opportunityValidation.validateAssignmentDate(v, DateField.getDate(state.proposalDeadline) || new Date())),
      !!FormField.getValue(s)
    );
  });
}

export const init: Init<Params, State> = async ({ canRemoveExistingAttachments, opportunity, viewerUser, activeTab = DEFAULT_ACTIVE_TAB, showAddendaTab = false }) => {
  activeTab = !showAddendaTab && activeTab === 'Addenda' ? DEFAULT_ACTIVE_TAB : activeTab;
  const startingPhase = getStartingPhase(opportunity);
  const questionsWeight = opportunity?.questionsWeight || DEFAULT_QUESTIONS_WEIGHT;
  const codeChallengeWeight = opportunity?.codeChallengeWeight || DEFAULT_CODE_CHALLENGE_WEIGHT;
  const scenarioWeight = opportunity?.scenarioWeight || DEFAULT_SCENARIO_WEIGHT;
  const priceWeight = opportunity?.priceWeight || DEFAULT_PRICE_WEIGHT;
  return {
    opportunity,
    viewerUser,
    showPhaseInfo: true,
    tabbedForm: immutable(await TabbedFormComponent.init({
      tabs: [
        'Overview',
        'Description',
        'Phases',
        'Team Questions',
        'Scoring',
        'Attachments',
        ...(showAddendaTab ? ['Addenda' as const] : [])
      ],
      activeTab
    })),

    title: immutable(await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: opportunity?.title || '',
        id: 'swu-opportunity-title'
      }
    })),

    teaser: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateTeaser,
      child: {
        value: opportunity?.teaser || '',
        id: 'swu-opportunity-teaser'
      }
    })),

    location: immutable(await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateLocation,
      child: {
        type: 'text',
        value: opportunity?.location || 'Victoria',
        id: 'swu-opportunity-location'
      }
    })),

    remoteOk: immutable(await RemoteOkRadioGroup.init({
      errors: [],
      validate: v => v === null ? invalid(['Please select an option.']) : valid(v),
      child: {
        id: 'swu-opportunity-remote-ok',
        value: (() => {
          const existing = opportunity?.remoteOk;
          if (existing === true) {
            return 'yes' as const;
          } else if (existing === false) {
            return 'no' as const;
          }
          return null;
        })(),
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' }
        ]
      }
    })),

    remoteDesc: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateRemoteDesc,
      child: {
        value: opportunity?.remoteDesc || '',
        id: 'swu-opportunity-remote-desc'
      }
    })),

    proposalDeadline: immutable(await DateField.init({
      errors: [],
      validate: DateField.validateDate(v => opportunityValidation.validateProposalDeadline(v, opportunity)),
      child: {
        value: opportunity ? DateField.dateToValue(opportunity.proposalDeadline) : null,
        id: 'swu-opportunity-proposal-deadline'
      }
    })),

    assignmentDate: immutable(await DateField.init({
      errors: [],
      validate: DateField.validateDate(v => opportunityValidation.validateAssignmentDate(v, opportunity?.proposalDeadline || new Date())),
      child: {
        value: opportunity ? DateField.dateToValue(opportunity.assignmentDate) : null,
        id: 'swu-opportunity-assignment-date'
      }
    })),

    totalMaxBudget: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid(['Please enter a valid Total Maximum Budget.']); }
        return opportunityValidation.validateTotalMaxBudget(v);
      },
      child: {
        value: opportunity?.totalMaxBudget || null,
        id: 'swu-opportunity-total-max-budget',
        min: 1
      }
    })),

    minTeamMembers: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return valid(null); }
        return mapValid(opportunityValidation.validateMinimumTeamMembers(v), w => w || null);
      },
      child: {
        value: opportunity?.minTeamMembers || null,
        id: 'swu-opportunity-min-team-members',
        min: 1
      }
    })),

    mandatorySkills: immutable(await SelectMulti.init({
      errors: [],
      validate: v => {
        const strings = v.map(({ value }) => value);
        const validated0 = opportunityValidation.validateMandatorySkills(strings);
        const validated1 = mapValid(validated0, () => v);
        return mapInvalid(validated1, es => flatten(es));
      },
      child: {
        value: opportunity?.mandatorySkills.map(value => ({ value, label: value })) || [],
        id: 'swu-opportunity-mandatory-skills',
        creatable: true,
        options: SelectMulti.stringsToOptions(SKILLS)
      }
    })),

    optionalSkills: immutable(await SelectMulti.init({
      errors: [],
      validate: v => {
        const strings = v.map(({ value }) => value);
        const validated0 = opportunityValidation.validateOptionalSkills(strings);
        const validated1 = mapValid(validated0, () => v);
        return mapInvalid(validated1, es => flatten(es));
      },
      child: {
        value: opportunity?.optionalSkills.map(value => ({ value, label: value })) || [],
        id: 'swu-opportunity-optional-skills',
        creatable: true,
        options: SelectMulti.stringsToOptions(SKILLS)
      }
    })),

    description: immutable(await RichMarkdownEditor.init({
      errors: [],
      validate: opportunityValidation.validateDescription,
      child: {
        value: opportunity?.description || '',
        id: 'swu-opportunity-description',
        uploadImage: api.makeUploadMarkdownImage()
      }
    })),

    startingPhase: immutable(await Select.init({
      errors: [],
      validate: option => {
        if (!option) { return invalid(['Please select a starting phase.']); }
        return valid(option);
      },
      child: {
        value: startingPhase && makePhaseTypeOption(startingPhase),
        id: 'swu-opportunity-starting-phase',
        options: adt('options', [
          SWUOpportunityPhaseType.Inception,
          SWUOpportunityPhaseType.Prototype,
          SWUOpportunityPhaseType.Implementation
        ].map(value => makePhaseTypeOption(value)))
      }
    })),

    phases: immutable(await Phases.init({
      opportunity,
      startingPhase: startingPhase || SWUOpportunityPhaseType.Inception
    })),

    teamQuestions: immutable(await TeamQuestions.init({
      questions: opportunity?.teamQuestions || []
    })),

    questionsWeight: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid(['Please enter a valid weight for team questions.']); }
        return opportunityValidation.validateQuestionsWeight(v);
      },
      child: {
        value: questionsWeight,
        id: 'swu-opportunity-questions-weight',
        min: 1
      }
    })),

    codeChallengeWeight: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid(['Please enter a valid code challenge weight.']); }
        return opportunityValidation.validateCodeChallengeWeight(v);
      },
      child: {
        value: codeChallengeWeight,
        id: 'swu-opportunity-code-challenge-weight',
        min: 1
      }
    })),

    scenarioWeight: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid(['Please enter a valid team scenario weight.']); }
        return opportunityValidation.validateTeamScenarioWeight(v);
      },
      child: {
        value: scenarioWeight,
        id: 'swu-opportunity-scenario-weight',
        min: 1
      }
    })),

    priceWeight: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid(['Please enter a valid price weight.']); }
        return opportunityValidation.validatePriceWeight(v);
      },
      child: {
        value: priceWeight,
        id: 'swu-opportunity-price-weight',
        min: 1
      }
    })),

    weightsTotal: immutable(await NumberField.init({
      errors: [],
      validate: validateWeightsTotal,
      child: {
        value: questionsWeight + codeChallengeWeight + scenarioWeight + priceWeight,
        id: 'swu-opportunity-weights-total',
        min: 1
      }
    })),

    attachments: immutable(await Attachments.init({
      canRemoveExistingAttachments,
      existingAttachments: opportunity?.attachments || [],
      newAttachmentMetadata: [adt('any')]
    })),

    addenda: showAddendaTab
      ? immutable(await Addenda.init({
          existingAddenda: opportunity?.addenda || []
        }))
      : null

  };
};

export type Errors = CreateValidationErrors;

export function setErrors(state: Immutable<State>, errors: Errors): Immutable<State> {
  if (errors) {
    return state
      .update('title', s => FormField.setErrors(s, errors.title || []))
      .update('teaser', s => FormField.setErrors(s, errors.teaser || []))
      .update('remoteOk', s => FormField.setErrors(s, errors.remoteOk || []))
      .update('remoteDesc', s => FormField.setErrors(s, errors.remoteDesc || []))
      .update('location', s => FormField.setErrors(s, errors.location || []))
      .update('proposalDeadline', s => FormField.setErrors(s, errors.proposalDeadline || []))
      .update('assignmentDate', s => FormField.setErrors(s, errors.assignmentDate || []))
      .update('totalMaxBudget', s => FormField.setErrors(s, errors.totalMaxBudget || []))
      .update('minTeamMembers', s => FormField.setErrors(s, errors.minTeamMembers || []))
      .update('mandatorySkills', s => FormField.setErrors(s, flatten(errors.mandatorySkills || [])))
      .update('optionalSkills', s => FormField.setErrors(s, flatten(errors.optionalSkills || [])))
      .update('description', s => FormField.setErrors(s, errors.description || []))
      .update('phases', s => Phases.setErrors(s, errors))
      .update('teamQuestions', s => TeamQuestions.setErrors(s, errors.teamQuestions));
  } else {
    return state;
  }
}

export function isOverviewTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.title)
      && FormField.isValid(state.teaser)
      && FormField.isValid(state.remoteOk)
      && (!state.remoteOk || FormField.isValid(state.remoteDesc))
      && FormField.isValid(state.location)
      && FormField.isValid(state.proposalDeadline)
      && FormField.isValid(state.assignmentDate)
      && FormField.isValid(state.totalMaxBudget)
      && FormField.isValid(state.minTeamMembers)
      && FormField.isValid(state.mandatorySkills)
      && FormField.isValid(state.optionalSkills);
}

export function isDescriptionTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.description);
}

export function isPhasesTabValid(state: Immutable<State>): boolean {
  return Phases.isValid(state.phases)
      && FormField.isValid(state.startingPhase);
}

export function isTeamQuestionsTabValid(state: Immutable<State>): boolean {
  return TeamQuestions.isValid(state.teamQuestions);
}

export function isScoringTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.questionsWeight)
      && FormField.isValid(state.codeChallengeWeight)
      && FormField.isValid(state.scenarioWeight)
      && FormField.isValid(state.priceWeight)
      && FormField.isValid(state.weightsTotal);
}

export function isAttachmentsTabValid(state: Immutable<State>): boolean {
  return Attachments.isValid(state.attachments);
}

export function isAddendaTabValid(state: Immutable<State>): boolean {
  return (!state.addenda || Addenda.isValid(state.addenda));
}

export function isValid(state: Immutable<State>): boolean {
  return isOverviewTabValid(state)
      && isDescriptionTabValid(state)
      && isPhasesTabValid(state)
      && isTeamQuestionsTabValid(state)
      && isScoringTabValid(state)
      && isAttachmentsTabValid(state)
      && isAddendaTabValid(state);
}

export type Values = Omit<CreateRequestBody, 'attachments' | 'status'>;

export function getValues(state: Immutable<State>): Values {
  const totalMaxBudget = FormField.getValue(state.totalMaxBudget) || 0;
  const minTeamMembers = FormField.getValue(state.minTeamMembers) || undefined;
  const questionsWeight = FormField.getValue(state.questionsWeight) || 0;
  const codeChallengeWeight = FormField.getValue(state.codeChallengeWeight) || 0;
  const scenarioWeight = FormField.getValue(state.scenarioWeight) || 0;
  const priceWeight = FormField.getValue(state.priceWeight) || 0;
  const teamQuestions = TeamQuestions.getValues(state.teamQuestions);
  const phases = Phases.getValues(state.phases);
  return {
    ...phases,
    title:            FormField.getValue(state.title),
    teaser:           FormField.getValue(state.teaser),
    remoteOk:         FormField.getValue(state.remoteOk) === 'yes',
    remoteDesc:       FormField.getValue(state.remoteDesc),
    location:         FormField.getValue(state.location),
    proposalDeadline: DateField.getValueAsString(state.proposalDeadline),
    assignmentDate:   DateField.getValueAsString(state.assignmentDate),
    totalMaxBudget,
    minTeamMembers,
    mandatorySkills:  SelectMulti.getValueAsStrings(state.mandatorySkills),
    optionalSkills:   SelectMulti.getValueAsStrings(state.optionalSkills),
    description:      FormField.getValue(state.description),
    questionsWeight,
    codeChallengeWeight,
    scenarioWeight,
    priceWeight,
    teamQuestions
  };
}

type PersistAction
  = ADT<'create', CreateSWUOpportunityStatus>
  | ADT<'update'>;

export async function persist(state: Immutable<State>, action: PersistAction): Promise<Validation<[Immutable<State>, SWUOpportunity], Immutable<State>>> {
  const values = getValues(state);
  const isRemoteOkChecked = RadioGroup.isChecked(state.remoteOk);
  const isCreateDraft = action.tag === 'create' && action.value === SWUOpportunityStatus.Draft;
  const shouldUploadAttachmentsAndUpdate = action.tag === 'create' || (action.tag === 'update' && !!state.opportunity && canSWUOpportunityDetailsBeEdited(state.opportunity, isAdmin(state.viewerUser)));
  // Transform remoteOk
  if (!isRemoteOkChecked && !isCreateDraft) {
    return invalid(state);
  }
  // Default remoteOk to true for drafts where it isn't defined.
  const remoteOk = !isRemoteOkChecked && isCreateDraft ? true : RadioGroup.valueEquals(state.remoteOk, 'yes');
  // Get new attachments to be uploaded.
  const newAttachments = Attachments.getNewAttachments(state.attachments);
  let attachments = state.attachments.existingAttachments.map(({ id }) => id);
  // Upload new attachments if necessary.
  if (shouldUploadAttachmentsAndUpdate && newAttachments.length) {
    const result = await api.uploadFiles(newAttachments);
    switch (result.tag) {
      case 'valid':
        attachments = [...attachments, ...(result.value.map(({ id }) => id))];
        break;
      case 'invalid':
        return invalid(state.update('attachments', attachments => Attachments.setNewAttachmentErrors(attachments, result.value)));
      case 'unhandled':
        return invalid(state);
    }
  }
  if (action.tag === 'update' && state.opportunity && state.addenda) {
    const newAddenda = Addenda.getNewAddenda(state.addenda);
    if (newAddenda.length) {
      let updatedExistingAddenda: Addendum[] = state.addenda.existingAddenda;
      const updatedNewAddenda: Addenda.NewAddendumParam[] = [];
      //Persist each addendum.
      for (const addendum of newAddenda) {
        const addAddendumResult: api.ResponseValidation<SWUOpportunity, UpdateValidationErrors> = await api.opportunities.swu.update(state.opportunity.id, adt('addAddendum', addendum));
        switch (addAddendumResult.tag) {
          case 'valid':
            updatedExistingAddenda = addAddendumResult.value.addenda;
            break;
          case 'invalid':
            if (addAddendumResult.value.opportunity?.tag === 'addAddendum') {
              updatedNewAddenda.push({
                value: addendum,
                errors: addAddendumResult.value.opportunity.value
              });
            }
            break;
          case 'unhandled':
            updatedNewAddenda.push({
              value: addendum,
              errors: ['Unable to add addenda due to a system error.']
            });
        }
      }
      //Update the addenda field in state.
      state = state.set('addenda', immutable(await Addenda.init({
        existingAddenda: updatedExistingAddenda,
        newAddenda: updatedNewAddenda
      })));
      //Check if any addenda failed.
      if (updatedNewAddenda.length) {
        return invalid(state);
      }
    }
  }
  const actionResult: api.ResponseValidation<SWUOpportunity, CreateValidationErrors | UpdateEditValidationErrors> = await (async () => {
    switch (action.tag) {
        case 'create':
          return await api.opportunities.swu.create({
            ...values,
            remoteOk,
            attachments,
            status: action.value
          });
        case 'update':
          if (state.opportunity && shouldUploadAttachmentsAndUpdate) {
            const updateResult = await api.opportunities.swu.update(state.opportunity.id, adt('edit' as const, {
              ...values,
              remoteOk,
              attachments
            }));
            return api.mapInvalid(updateResult, errors => {
              if (errors.opportunity && errors.opportunity.tag === 'edit') {
                return errors.opportunity.value;
              } else {
                return {};
              }
            });
          } else if (state.opportunity) {
            return valid(state.opportunity);
          } else {
            // Should never happen because state.opportunity should be defined
            // when updating.
            return invalid({});
          }
    }
  })();
  switch (actionResult.tag) {
    case 'unhandled':
      return invalid(state);
    case 'invalid':
      return invalid(setErrors(state, actionResult.value));
    case 'valid':
      state = setErrors(state, {});
      // Update the attachments component accordingly.
      state = state.set('attachments', immutable(await Attachments.init({
        existingAttachments: actionResult.value.attachments || [],
        newAttachmentMetadata
      })));
      return valid([state, actionResult.value]);
  }
}

function validateWeightsTotal(n: number | null): Validation<number> {
  return n === 100 ? valid(n) : invalid(['The scoring weights should total 100% exactly.']);
}

function updateWeightsTotal(state: Immutable<State>): Immutable<State> {
  const questionsWeight = FormField.getValue(state.questionsWeight) || 0;
  const codeChallengeWeight = FormField.getValue(state.codeChallengeWeight) || 0;
  const scenarioWeight = FormField.getValue(state.scenarioWeight) || 0;
  const priceWeight = FormField.getValue(state.priceWeight) || 0;
  const total = questionsWeight + codeChallengeWeight + scenarioWeight + priceWeight;
  return state.update('weightsTotal', s => {
    return FormField.validateAndSetValue(s, total, validateWeightsTotal);
  });
}

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'tabbedForm':
      return updateComponentChild({
        state,
        childStatePath: ['tabbedForm'],
        childUpdate: TabbedFormComponent.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('tabbedForm', value)
      });

    case 'hidePhaseInfo':
      return [state.set('showPhaseInfo', false)];

    case 'title':
      return updateComponentChild({
        state,
        childStatePath: ['title'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('title', value)
      });

    case 'teaser':
      return updateComponentChild({
        state,
        childStatePath: ['teaser'],
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('teaser', value)
      });

    case 'remoteOk':
      return updateComponentChild({
        state,
        childStatePath: ['remoteOk'],
        childUpdate: RemoteOkRadioGroup.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('remoteOk', value)
      });

    case 'remoteDesc':
      return updateComponentChild({
        state,
        childStatePath: ['remoteDesc'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('remoteDesc', value)
      });

    case 'location':
      return updateComponentChild({
        state,
        childStatePath: ['location'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('location', value)
      });

    case 'proposalDeadline':
      return updateComponentChild({
        state,
        childStatePath: ['proposalDeadline'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('proposalDeadline', value),
        updateAfter: state => [resetAssignmentDate(state)]
      });

    case 'assignmentDate':
      return updateComponentChild({
        state,
        childStatePath: ['assignmentDate'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('assignmentDate', value),
        updateAfter: state => [state.update('phases', s => Phases.updateAssignmentDate(s, DateField.getDate(state.assignmentDate)))]
      });

    case 'totalMaxBudget':
      return updateComponentChild({
        state,
        childStatePath: ['totalMaxBudget'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('totalMaxBudget', value),
        updateAfter: state => [state.update('phases', s => Phases.updateTotalMaxBudget(s, FormField.getValue(state.totalMaxBudget) || undefined))]
      });

    case 'minTeamMembers':
      return updateComponentChild({
        state,
        childStatePath: ['minTeamMembers'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('minTeamMembers', value)
      });

    case 'mandatorySkills':
      return updateComponentChild({
        state,
        childStatePath: ['mandatorySkills'],
        childUpdate: SelectMulti.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('mandatorySkills', value)
      });

    case 'optionalSkills':
      return updateComponentChild({
        state,
        childStatePath: ['optionalSkills'],
        childUpdate: SelectMulti.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('optionalSkills', value)
      });

    case 'description':
      return updateComponentChild({
        state,
        childStatePath: ['description'],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('description', value)
      });

    case 'startingPhase':
      return updateComponentChild({
        state,
        childStatePath: ['startingPhase'],
        childUpdate: Select.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('startingPhase', value),
        updateAfter: state => {
          const rawStartingPhase = FormField.getValue(state.startingPhase)?.value;
          const startingPhase = rawStartingPhase ? parseSWUOpportunityPhaseType(rawStartingPhase) : undefined;
          return [
            state
              .set('phases', Phases.setStartingPhase(state.phases, startingPhase || undefined, DateField.getDate(state.assignmentDate)))
              .set('showPhaseInfo', true)
          ];
        }
      });

    case 'phases':
      return updateComponentChild({
        state,
        childStatePath: ['phases'],
        childUpdate: Phases.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('phases', value)
      });

    case 'teamQuestions':
      return updateComponentChild({
        state,
        childStatePath: ['teamQuestions'],
        childUpdate: TeamQuestions.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('teamQuestions', value)
      });

    case 'questionsWeight':
      return updateComponentChild({
        state,
        childStatePath: ['questionsWeight'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('questionsWeight', value),
        updateAfter: state => [updateWeightsTotal(state)]
      });

    case 'codeChallengeWeight':
      return updateComponentChild({
        state,
        childStatePath: ['codeChallengeWeight'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('codeChallengeWeight', value),
        updateAfter: state => [updateWeightsTotal(state)]
      });

    case 'scenarioWeight':
      return updateComponentChild({
        state,
        childStatePath: ['scenarioWeight'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('scenarioWeight', value),
        updateAfter: state => [updateWeightsTotal(state)]
      });

    case 'priceWeight':
      return updateComponentChild({
        state,
        childStatePath: ['priceWeight'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('priceWeight', value),
        updateAfter: state => [updateWeightsTotal(state)]
      });

    case 'weightsTotal':
      return updateComponentChild({
        state,
        childStatePath: ['weightsTotal'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('weightsTotal', value)
      });

    case 'attachments':
      return updateComponentChild({
        state,
        childStatePath: ['attachments'],
        childUpdate: Attachments.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('attachments', value)
      });

    case 'addenda':
      return updateComponentChild({
        state,
        childStatePath: ['addenda'],
        childUpdate: Addenda.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('addenda', value)
      });
  }
};

function areNonAddendaDisabled(viewerUser: User, opportunity?: SWUOpportunity, disabledProp?: boolean): boolean {
  return disabledProp || (!!opportunity && !canSWUOpportunityDetailsBeEdited(opportunity, isAdmin(viewerUser)));
}

const OverviewView: View<Props> = ({ state, dispatch, disabled: disabledProp }) => {
  const disabled = areNonAddendaDisabled(state.viewerUser, state.opportunity, disabledProp);
  return (
    <Row>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Title'
          placeholder='Opportunity Title'
          required
          disabled={disabled}
          state={state.title}
          dispatch={mapComponentDispatch(dispatch, value => adt('title' as const, value))} />
      </Col>

      <Col xs='12'>
        <LongText.view
          extraChildProps={{}}
          label='Teaser'
          placeholder='Provide 1-2 sentences that describe to readers what you are inviting them to do.'
          style={{ height: '200px' }}
          disabled={disabled}
          state={state.teaser}
          dispatch={mapComponentDispatch(dispatch, value => adt('teaser' as const, value))} />
      </Col>

      <Col md='12'>
        <RemoteOkRadioGroup.view
          extraChildProps={{ inline: true }}
          required
          label='Remote OK?'
          disabled={disabled}
          state={state.remoteOk}
          dispatch={mapComponentDispatch(dispatch, value => adt('remoteOk' as const, value))} />
      </Col>

      {RadioGroup.valueEquals(state.remoteOk, 'yes')
        ? (<Col xs='12'>
            <LongText.view
              extraChildProps={{}}
              label='Remote Description'
              placeholder={`Provide further information about this opportunity's remote work options.`}
              disabled={disabled}
              style={{ height: '160px' }}
              state={state.remoteDesc}
              dispatch={mapComponentDispatch(dispatch, value => adt('remoteDesc' as const, value))} />
          </Col>)
        : null}

      <Col md='8' xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Location'
          placeholder='Location'
          required
          disabled={disabled}
          state={state.location}
          dispatch={mapComponentDispatch(dispatch, value => adt('location' as const, value))} />
      </Col>

      <Col xs='12' md='6'>
        <DateField.view
          required
          extraChildProps={{}}
          label='Proposal Deadline'
          state={state.proposalDeadline}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('proposalDeadline' as const, value))} />
      </Col>

      <Col xs='12' md='6'>
        <DateField.view
          required
          extraChildProps={{}}
          label='Assignment Date'
          state={state.assignmentDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('assignmentDate' as const, value))} />
      </Col>

      <Col md='8' xs='12'>
        <NumberField.view
          extraChildProps={{ prefix: '$' }}
          label='Total Maximum Budget'
          placeholder='Total Maximum Budget'
          required
          disabled={disabled}
          state={state.totalMaxBudget}
          dispatch={mapComponentDispatch(dispatch, value => adt('totalMaxBudget' as const, value))} />
      </Col>

      <Col md='8' xs='12'>
        <NumberField.view
          extraChildProps={{}}
          label='Minimum Team Members'
          placeholder='Minimum Team Members'
          disabled={disabled}
          state={state.minTeamMembers}
          dispatch={mapComponentDispatch(dispatch, value => adt('minTeamMembers' as const, value))} />
      </Col>

      <Col xs='12'>
        <SelectMulti.view
          extraChildProps={{}}
          label='Mandatory Skills'
          placeholder='Mandatory Skills'
          required
          disabled={disabled}
          state={state.mandatorySkills}
          dispatch={mapComponentDispatch(dispatch, value => adt('mandatorySkills' as const, value))} />
      </Col>

      <Col xs='12'>
        <SelectMulti.view
          extraChildProps={{}}
          label='Optional Skills'
          placeholder='Optional Skills'
          disabled={disabled}
          state={state.optionalSkills}
          dispatch={mapComponentDispatch(dispatch, value => adt('optionalSkills' as const, value))} />
      </Col>

    </Row>
  );
};

const DescriptionView: View<Props> = ({ state, dispatch, disabled: disabledProp }) => {
  const disabled = areNonAddendaDisabled(state.viewerUser, state.opportunity, disabledProp);
  return (
    <Row>

      <Col xs='12'>
        <RichMarkdownEditor.view
          extraChildProps={{}}
          required
          label='Description'
          placeholder='Describe this opportunity.'
          style={{ height: '60vh', minHeight: '400px' }}
          disabled={disabled}
          state={state.description}
          dispatch={mapComponentDispatch(dispatch, value => adt('description' as const, value))} />
      </Col>

    </Row>
  );
};

const PhasesView: View<Props> = ({ state, dispatch, disabled: disabledProp }) => {
  const disabled = areNonAddendaDisabled(state.viewerUser, state.opportunity, disabledProp);
  const rawStartingPhase = FormField.getValue(state.startingPhase);
  const startingPhase = rawStartingPhase ? parseSWUOpportunityPhaseType(rawStartingPhase.value) : null;
  return (
    <Row>
      <Col xs='12'>
        <Select.view
          required
          extraChildProps={{}}
          className='mb-0'
          label='Which phase do you want to start with?'
          placeholder='Select Phase'
          state={state.startingPhase}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('startingPhase' as const, value))} />
        {startingPhase && state.showPhaseInfo
          ? (<Alert color='primary' fade={false} className='mt-4 mb-0'>
              <div className='d-flex align-items-start'>
                <div className='flex-grow-1 pr-3' style={{ whiteSpace: 'pre-line' }}>
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
                  name='times'
                  width={1}
                  height={1}
                  color='primary'
                  onClick={() => dispatch(adt('hidePhaseInfo'))}
                  className='mt-1 o-75 flex-grow-0 flex-shrink-0' />
              </div>
            </Alert>)
          : null}
      </Col>
      {startingPhase
        ? (<Col xs='12'>
            <div className='mt-5 pt-5 border-top'>
              <Phases.view
                disabled={disabled}
                state={state.phases}
                dispatch={mapComponentDispatch(dispatch, value => adt('phases' as const, value))} />
            </div>
          </Col>)
        : null}
    </Row>
  );
};

const TeamQuestionsView: View<Props> = ({ state, dispatch, disabled: disabledProp }) => {
  const disabled = areNonAddendaDisabled(state.viewerUser, state.opportunity, disabledProp);
  return (
    <Row>
      <Col xs='12'>
        <TeamQuestions.view
          disabled={disabled}
          state={state.teamQuestions}
          dispatch={mapComponentDispatch(dispatch, value => adt('teamQuestions' as const, value))} />
      </Col>
    </Row>
  );
};

const ScoringView: View<Props> = ({ state, dispatch, disabled: disabledProp }) => {
  const disabled = areNonAddendaDisabled(state.viewerUser, state.opportunity, disabledProp);
  return (
    <div>
      <Row>
        <Col xs='12'>
          <p>Each submitted proposal will be scored for each stage of the evaluation process. Assign a weight to each evaluation stage using the fields available below.</p>
          <p className='mb-4 font-size-small font-italic'>Note: Weights are specified as percentages and the sum of all weights must total 100%.</p>
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='4'>
          <NumberField.view
            extraChildProps={{ suffix: '%' }}
            label='Team Questions'
            disabled={disabled}
            state={state.questionsWeight}
            dispatch={mapComponentDispatch(dispatch, value => adt('questionsWeight' as const, value))} />
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='4'>
          <NumberField.view
            extraChildProps={{ suffix: '%' }}
            label='Code Challenge'
            disabled={disabled}
            state={state.codeChallengeWeight}
            dispatch={mapComponentDispatch(dispatch, value => adt('codeChallengeWeight' as const, value))} />
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='4'>
          <NumberField.view
            extraChildProps={{ suffix: '%' }}
            label='Team Scenario'
            disabled={disabled}
            state={state.scenarioWeight}
            dispatch={mapComponentDispatch(dispatch, value => adt('scenarioWeight' as const, value))} />
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='4'>
          <NumberField.view
            extraChildProps={{ suffix: '%' }}
            label='Price'
            disabled={disabled}
            state={state.priceWeight}
            dispatch={mapComponentDispatch(dispatch, value => adt('priceWeight' as const, value))} />
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='4'>
          <NumberField.view
            extraChildProps={{ suffix: '%' }}
            label='Total Score'
            disabled
            state={state.weightsTotal}
            dispatch={mapComponentDispatch(dispatch, value => adt('weightsTotal' as const, value))} />
        </Col>
      </Row>
    </div>
  );
};

// @duplicated-attachments-view
const AttachmentsView: View<Props> = ({ state, dispatch, disabled: disabledProp }) => {
  const disabled = areNonAddendaDisabled(state.viewerUser, state.opportunity, disabledProp);
  return (
    <Row>
      <Col xs='12'>
        <p>
          Upload any supporting material for your opportunity here. Attachments must be smaller than 10MB.
        </p>
        <Attachments.view
          dispatch={mapComponentDispatch(dispatch, msg => adt('attachments' as const, msg))}
          state={state.attachments}
          disabled={disabled}
          className='mt-4' />
      </Col>
    </Row>
  );
};

const AddendaView: View<Props> = ({ state, dispatch, disabled }) => {
  if (!state.addenda) { return null; }
  return (
    <Row>
      <Col xs='12'>
        <p>
          Provide additional information here to clarify or support the information in the original opportunity.
        </p>
        <Addenda.view
          dispatch={mapComponentDispatch(dispatch, msg => adt('addenda' as const, msg))}
          state={state.addenda}
          disabled={disabled}
          className='mt-4' />
      </Col>
    </Row>
  );
};

interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: View<Props> = props => {
  const { state, dispatch } = props;
  const activeTab = (() => {
    switch (TabbedForm.getActiveTab(state.tabbedForm)) {
      case 'Overview':       return (<OverviewView {...props} />);
      case 'Description':    return (<DescriptionView {...props} />);
      case 'Phases':         return (<PhasesView {...props} />);
      case 'Team Questions': return (<TeamQuestionsView {...props} />);
      case 'Scoring':        return (<ScoringView {...props} />);
      case 'Attachments':    return (<AttachmentsView {...props} />);
      case 'Addenda':        return (<AddendaView {...props} />);
    }
  })();
  return (
    <TabbedFormComponent.view
      valid={isValid(state)}
      disabled={props.disabled}
      getTabLabel={a => a}
      isTabValid={tab => {
        switch (tab) {
          case 'Overview':      return isOverviewTabValid(state);
          case 'Description':   return isDescriptionTabValid(state);
          case 'Phases':        return isPhasesTabValid(state);
          case 'Team Questions': return isTeamQuestionsTabValid(state);
          case 'Scoring':       return isScoringTabValid(state);
          case 'Attachments':   return isAttachmentsTabValid(state);
          case 'Addenda':       return isAddendaTabValid(state);
        }
      }}
      state={state.tabbedForm}
      dispatch={mapComponentDispatch(dispatch, msg => adt('tabbedForm' as const, msg))}>
      {activeTab}
    </TabbedFormComponent.view>
  );
};

export const component: Component<Params, State, Msg> = {
  init,
  update,
  view
};
