import { MANDATORY_WEIGHTED_CRITERIA_URL } from 'front-end/config';
import * as Attachments from 'front-end/lib/components/attachments';
import * as FormField from 'front-end/lib/components/form-field';
import * as DateField from 'front-end/lib/components/form-field/date';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import * as NumberField from 'front-end/lib/components/form-field/number';
import * as RadioGroup from 'front-end/lib/components/form-field/radio-group';
import * as RichMarkdownEditor from 'front-end/lib/components/form-field/rich-markdown-editor';
import * as SelectMulti from 'front-end/lib/components/form-field/select-multi';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import * as TabbedForm from 'front-end/lib/components/tabbed-form';
import { ComponentViewProps, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Link, { externalDest } from 'front-end/lib/views/link';
import { flatten } from 'lodash';
import React from 'react';
import { Col, Row } from 'reactstrap';
import SKILLS from 'shared/lib/data/skills';
import { FileUploadMetadata } from 'shared/lib/resources/file';
import { FORMATTED_MAX_BUDGET, canCWUOpportunityDetailsBeEdited, CreateCWUOpportunityStatus, CreateRequestBody, CreateValidationErrors, CWUOpportunity, CWUOpportunityStatus, UpdateEditValidationErrors } from 'shared/lib/resources/opportunity/code-with-us';
import { adt, ADT } from 'shared/lib/types';
import { invalid, mapInvalid, mapValid, valid, Validation } from 'shared/lib/validation';
import * as opportunityValidation from 'shared/lib/validation/opportunity/code-with-us';

type RemoteOk = 'yes' | 'no';

const RemoteOkRadioGroup = RadioGroup.makeComponent<RemoteOk>();

export type TabId = 'Overview' | 'Description' | 'Details' | 'Attachments';

const TabbedFormComponent = TabbedForm.makeComponent<TabId>();

const newAttachmentMetadata: FileUploadMetadata = [];

export interface State {
  opportunity?: CWUOpportunity;
  tabbedForm: Immutable<TabbedForm.State<TabId>>;
  // Overview Tab
  title: Immutable<ShortText.State>;
  teaser: Immutable<LongText.State>;
  location: Immutable<ShortText.State>;
  reward: Immutable<NumberField.State>;
  skills: Immutable<SelectMulti.State>;
  // If remoteOk
  remoteOk: Immutable<RadioGroup.State<RemoteOk>>;
  remoteDesc: Immutable<LongText.State>;
  // Description Tab
  description: Immutable<RichMarkdownEditor.State>;
  // Details Tab
  proposalDeadline: Immutable<DateField.State>;
  startDate: Immutable<DateField.State>;
  assignmentDate: Immutable<DateField.State>;
  completionDate: Immutable<DateField.State>;
  submissionInfo: Immutable<ShortText.State>;
  acceptanceCriteria: Immutable<RichMarkdownEditor.State>;
  evaluationCriteria: Immutable<RichMarkdownEditor.State>;
  // Attachments tab
  attachments: Immutable<Attachments.State>;
}

export type Msg
  = ADT<'tabbedForm',         TabbedForm.Msg<TabId>>
  // Overview Tab
  | ADT<'title',              ShortText.Msg>
  | ADT<'teaser',             LongText.Msg>
  | ADT<'location',           ShortText.Msg>
  | ADT<'reward',             NumberField.Msg>
  | ADT<'skills',             SelectMulti.Msg>
  | ADT<'remoteOk',           RadioGroup.Msg<RemoteOk>>
  | ADT<'remoteDesc',         LongText.Msg>
  // Description Tab
  | ADT<'description',        RichMarkdownEditor.Msg>
  // Details Tab
  | ADT<'proposalDeadline',   DateField.Msg>
  | ADT<'startDate',          DateField.Msg>
  | ADT<'assignmentDate',     DateField.Msg>
  | ADT<'completionDate',     DateField.Msg>
  | ADT<'submissionInfo',     ShortText.Msg>
  | ADT<'acceptanceCriteria', RichMarkdownEditor.Msg>
  | ADT<'evaluationCriteria', RichMarkdownEditor.Msg>
  // Attachments tab
  | ADT<'attachments',        Attachments.Msg>;

export interface Params {
  canRemoveExistingAttachments: boolean;
  opportunity?: CWUOpportunity;
  activeTab?: TabId;
}

export function getActiveTab(state: Immutable<State>): TabId {
  return TabbedForm.getActiveTab(state.tabbedForm);
}

const DEFAULT_ACTIVE_TAB: TabId = 'Overview';

type DateFieldKey = 'startDate' | 'assignmentDate' | 'completionDate';
export function setValidateDate(state: Immutable<State>, k: DateFieldKey, validate: (_: string) => Validation<Date | null>): Immutable<State> {
  return state.update(k, s => FormField.setValidate(s, DateField.validateDate(validate), !!FormField.getValue(s)));
}

export const init: Init<Params, State> = async ({ canRemoveExistingAttachments, opportunity, activeTab = DEFAULT_ACTIVE_TAB }) => {
  return {
    opportunity,

    tabbedForm: immutable(await TabbedFormComponent.init({
      tabs: [
        'Overview',
        'Description',
        'Details',
        'Attachments'
      ],
      activeTab
    })),

    title: immutable(await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: opportunity?.title || '',
        id: 'cwu-opportunity-title'
      }
    })),

    teaser: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateTeaser,
      child: {
        value: opportunity?.teaser || '',
        id: 'cwu-opportunity-teaser'
      }
    })),

    location: immutable(await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateLocation,
      child: {
        type: 'text',
        value: opportunity?.location || 'Victoria',
        id: 'cwu-opportunity-location'
      }
    })),

    reward: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid(['Please enter a valid reward.']); }
        return opportunityValidation.validateReward(v);
      },
      child: {
        value: opportunity?.reward || null,
        id: 'cwu-opportunity-reward',
        min: 1
      }
    })),

    skills: immutable(await SelectMulti.init({
      errors: [],
      validate: v => {
        const strings = v.map(({ value }) => value);
        const validated0 = opportunityValidation.validateSkills(strings);
        const validated1 = mapValid(validated0, () => v);
        return mapInvalid(validated1, es => flatten(es));
      },
      child: {
        value: opportunity?.skills.map(value => ({ value, label: value })) || [],
        id: 'cwu-opportunity-skills',
        creatable: true,
        options: SelectMulti.stringsToOptions(SKILLS)
      }
    })),

    remoteOk: immutable(await RemoteOkRadioGroup.init({
      errors: [],
      validate: v => v === null ? invalid(['Please select an option.']) : valid(v),
      child: {
        id: 'cwu-opportunity-remote-ok',
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
      validate: v => opportunityValidation.validateRemoteDesc(v, !!opportunity?.remoteOk),
      child: {
        value: opportunity?.remoteDesc || '',
        id: 'cwu-opportunity-remote-desc'
      }
    })),

    description: immutable(await RichMarkdownEditor.init({
      errors: [],
      validate: opportunityValidation.validateDescription,
      child: {
        value: opportunity?.description || '',
        id: 'cwu-opportunity-description',
        uploadImage: api.makeUploadMarkdownImage()
      }
    })),

    proposalDeadline: immutable(await DateField.init({
      errors: [],
      validate: DateField.validateDate(v => opportunityValidation.validateProposalDeadline(v, opportunity)),
      child: {
        value: opportunity ? DateField.dateToValue(opportunity.proposalDeadline) : null,
        id: 'cwu-opportunity-proposal-deadline'
      }
    })),

    assignmentDate: immutable(await DateField.init({
      errors: [],
      validate: DateField.validateDate(v => opportunityValidation.validateAssignmentDate(v, opportunity?.proposalDeadline || new Date())),
      child: {
        value: opportunity ? DateField.dateToValue(opportunity.assignmentDate) : null,
        id: 'cwu-opportunity-assignment-date'
      }
    })),

    startDate: immutable(await DateField.init({
      errors: [],
      validate: DateField.validateDate(v => opportunityValidation.validateStartDate(v, opportunity?.assignmentDate || new Date())),
      child: {
        value: opportunity ? DateField.dateToValue(opportunity.startDate) : null,
        id: 'cwu-opportunity-start-date'
      }
    })),

    completionDate: immutable(await DateField.init({
      errors: [],
      validate: DateField.validateDate(v => {
        return mapValid(
          opportunityValidation.validateCompletionDate(v, opportunity?.startDate || new Date()),
          w => w || null
        );
      }),
      child: {
        value: opportunity?.completionDate ? DateField.dateToValue(opportunity.completionDate) : null,
        id: 'cwu-opportunity-completion-date'
      }
    })),

    submissionInfo: immutable(await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateSubmissionInfo,
      child: {
        type: 'text',
        value: opportunity?.submissionInfo || '',
        id: 'cwu-opportunity-submission-info'
      }
    })),

    acceptanceCriteria: immutable(await RichMarkdownEditor.init({
      errors: [],
      validate: opportunityValidation.validateAcceptanceCriteria,
      child: {
        value: opportunity?.acceptanceCriteria || '',
        id: 'cwu-opportunity-acceptance-criteria',
        uploadImage: api.makeUploadMarkdownImage()
      }
    })),

    evaluationCriteria: immutable(await RichMarkdownEditor.init({
      errors: [],
      validate: opportunityValidation.validateEvaluationCriteria,
      child: {
        value: opportunity?.evaluationCriteria || '',
        id: 'cwu-opportunity-evaluation-criteria',
        uploadImage: api.makeUploadMarkdownImage()
      }
    })),

    attachments: immutable(await Attachments.init({
      canRemoveExistingAttachments,
      existingAttachments: opportunity?.attachments || [],
      newAttachmentMetadata
    }))

  };
};

function setErrors(state: Immutable<State>, errors: Errors): Immutable<State> {
  if (errors) {
    return state
      .update('title',              s => FormField.setErrors(s, errors.title              || []))
      .update('teaser',             s => FormField.setErrors(s, errors.teaser             || []))
      .update('location',           s => FormField.setErrors(s, errors.location           || []))
      .update('reward',             s => FormField.setErrors(s, errors.reward             || []))
      .update('skills',             s => FormField.setErrors(s, errors.skills ? flatten(errors.skills) : []))
      .update('description',        s => FormField.setErrors(s, errors.description        || []))
      .update('remoteOk',           s => FormField.setErrors(s, errors.remoteOk           || []))
      .update('remoteDesc',         s => FormField.setErrors(s, errors.remoteDesc         || []))
      .update('proposalDeadline',   s => FormField.setErrors(s, errors.proposalDeadline   || []))
      .update('startDate',          s => FormField.setErrors(s, errors.startDate          || []))
      .update('assignmentDate',     s => FormField.setErrors(s, errors.assignmentDate     || []))
      .update('completionDate',     s => FormField.setErrors(s, errors.completionDate     || []))
      .update('submissionInfo',     s => FormField.setErrors(s, errors.submissionInfo     || []))
      .update('acceptanceCriteria', s => FormField.setErrors(s, errors.acceptanceCriteria || []))
      .update('evaluationCriteria', s => FormField.setErrors(s, errors.evaluationCriteria || []));
  } else {
    return state;
  }
}

export function validate(state: Immutable<State>): Immutable<State> {
  state = state
    .update('title',              s => FormField.validate(s))
    .update('teaser',             s => FormField.validate(s))
    .update('location',           s => FormField.validate(s))
    .update('reward',             s => FormField.validate(s))
    .update('skills',             s => FormField.validate(s))
    .update('description',        s => FormField.validate(s))
    .update('remoteOk',           s => FormField.validate(s))
    .update('proposalDeadline',   s => FormField.validate(s))
    .update('startDate',          s => FormField.validate(s))
    .update('assignmentDate',     s => FormField.validate(s))
    .update('completionDate',     s => FormField.validate(s))
    .update('submissionInfo',     s => FormField.validate(s))
    .update('acceptanceCriteria', s => FormField.validate(s))
    .update('evaluationCriteria', s => FormField.validate(s))
    .update('attachments',        s => Attachments.validate(s));
  if (FormField.getValue(state.remoteOk) === 'yes') {
    state = state.update('remoteDesc', s => FormField.validate(s));
  }
  return state;
}

type Errors = CreateValidationErrors;

export function isOverviewTabValid(state: Immutable<State>): boolean {
  const remoteOk = FormField.getValue(state.remoteOk) === 'yes';
  return FormField.isValid(state.title)                &&
    FormField.isValid(state.teaser)                    &&
    FormField.isValid(state.remoteOk)                  &&
    (!remoteOk || FormField.isValid(state.remoteDesc)) &&
    FormField.isValid(state.location)                  &&
    FormField.isValid(state.reward)                    &&
    FormField.isValid(state.skills);
}

export function isDescriptionTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.description);
}

export function isDetailsTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.proposalDeadline) &&
    FormField.isValid(state.assignmentDate)        &&
    FormField.isValid(state.startDate)             &&
    FormField.isValid(state.completionDate)        &&
    FormField.isValid(state.submissionInfo)        &&
    FormField.isValid(state.acceptanceCriteria)    &&
    FormField.isValid(state.evaluationCriteria);
}

export function isAttachmentsTabValid(state: Immutable<State>): boolean {
  return Attachments.isValid(state.attachments);
}

export function isValid(state: Immutable<State>): boolean {
  return isOverviewTabValid(state) &&
    isDescriptionTabValid(state)   &&
    isDetailsTabValid(state)       &&
    isAttachmentsTabValid(state);
}

export type Values = Omit<CreateRequestBody, 'attachments' | 'status'>;

export function getValues(state: Immutable<State>): Values {
  return {
    title:              FormField.getValue(state.title),
    teaser:             FormField.getValue(state.teaser),
    remoteOk:           FormField.getValue(state.remoteOk) === 'yes',
    remoteDesc:         FormField.getValue(state.remoteDesc),
    location:           FormField.getValue(state.location),
    reward:             FormField.getValue(state.reward) || 0,
    skills:             SelectMulti.getValueAsStrings(state.skills),
    description:        FormField.getValue(state.description),
    proposalDeadline:   DateField.getValueAsString(state.proposalDeadline),
    assignmentDate:     DateField.getValueAsString(state.assignmentDate),
    startDate:          DateField.getValueAsString(state.startDate),
    completionDate:     DateField.getValueAsString(state.completionDate),
    submissionInfo:     FormField.getValue(state.submissionInfo),
    acceptanceCriteria: FormField.getValue(state.acceptanceCriteria),
    evaluationCriteria: FormField.getValue(state.evaluationCriteria)
  };
}

type PersistAction
  = ADT<'create', CreateCWUOpportunityStatus>
  | ADT<'update'>;

export async function persist(state: Immutable<State>, action: PersistAction): Promise<Validation<[Immutable<State>, CWUOpportunity], Immutable<State>>> {
  const values = getValues(state);
  const isRemoteOkChecked = RadioGroup.isChecked(state.remoteOk);
  const isCreateDraft = action.tag === 'create' && action.value === CWUOpportunityStatus.Draft;
  const shouldUploadAttachmentsAndUpdate = action.tag === 'create' || (action.tag === 'update' && !!state.opportunity && canCWUOpportunityDetailsBeEdited(state.opportunity));
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
  const actionResult: api.ResponseValidation<CWUOpportunity, CreateValidationErrors | UpdateEditValidationErrors> = await (async () => {
    switch (action.tag) {
        case 'create':
          return await api.opportunities.cwu.create({
            ...values,
            remoteOk,
            attachments,
            status: action.value
          });
        case 'update':
          if (state.opportunity && shouldUploadAttachmentsAndUpdate) {
            const updateResult = await api.opportunities.cwu.update(state.opportunity.id, adt('edit' as const, {
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

    case 'title':
      return updateComponentChild({
        state,
        childStatePath: ['title'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('title', value)
      });

    case 'teaser':
      return updateComponentChild({
        state,
        childStatePath: ['teaser'],
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('teaser', value)
      });

    case 'location':
      return updateComponentChild({
        state,
        childStatePath: ['location'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('location', value)
      });

    case 'reward':
      return updateComponentChild({
        state,
        childStatePath: ['reward'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('reward', value)
      });

    case 'skills':
      return updateComponentChild({
        state,
        childStatePath: ['skills'],
        childUpdate: SelectMulti.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('skills', value)
      });

    case 'remoteOk':
      return updateComponentChild({
        state,
        childStatePath: ['remoteOk'],
        childUpdate: RemoteOkRadioGroup.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('remoteOk', value),
        updateAfter: state => [
          state.update('remoteDesc', s => {
            const remoteOk = FormField.getValue(state.remoteOk) === 'yes';
            return FormField.setValidate(
              s,
              v => opportunityValidation.validateRemoteDesc(v, remoteOk),
              remoteOk
            );
          })
        ]
      });

    case 'remoteDesc':
      return updateComponentChild({
        state,
        childStatePath: ['remoteDesc'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('remoteDesc', value)
      });

    case 'description':
      return updateComponentChild({
        state,
        childStatePath: ['description'],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('description', value)
      });

    case 'proposalDeadline': {
      return updateComponentChild({
        state,
        childStatePath: ['proposalDeadline'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('proposalDeadline' as const, value),
        updateAfter: state => [
          setValidateDate(state, 'assignmentDate', v => opportunityValidation.validateAssignmentDate(v, DateField.getDate(state.proposalDeadline) || new Date()))
        ]
      });
    }

    case 'assignmentDate': {
      return updateComponentChild({
        state,
        childStatePath: ['assignmentDate'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('assignmentDate' as const, value),
        updateAfter: state => [
          setValidateDate(state, 'startDate', v => opportunityValidation.validateStartDate(v, DateField.getDate(state.assignmentDate) || new Date()))
        ]
      });
    }

    case 'startDate': {
      return updateComponentChild({
        state,
        childStatePath: ['startDate'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('startDate' as const, value),
        updateAfter: state => [
          setValidateDate(state, 'completionDate', v => mapValid(
            opportunityValidation.validateCompletionDate(v, DateField.getDate(state.startDate) || new Date()),
            w => w || null
          ))
        ]
      });
    }

    case 'completionDate':
      return updateComponentChild({
        state,
        childStatePath: ['completionDate'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('completionDate', value)
      });

    case 'submissionInfo':
      return updateComponentChild({
        state,
        childStatePath: ['submissionInfo'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('submissionInfo', value)
      });

    case 'acceptanceCriteria':
      return updateComponentChild({
        state,
        childStatePath: ['acceptanceCriteria'],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('acceptanceCriteria', value)
      });

    case 'evaluationCriteria':
      return updateComponentChild({
        state,
        childStatePath: ['evaluationCriteria'],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('evaluationCriteria', value)
      });

    case 'attachments':
      return updateComponentChild({
        state,
        childStatePath: ['attachments'],
        childUpdate: Attachments.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('attachments', value)
      });
  }
};

const OverviewView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Title'
          help='Provide a brief and short title for the opportunity that highlights the work that you need done.'
          placeholder='Opportunity Title'
          required
          disabled={disabled}
          state={state.title}
          dispatch={mapComponentDispatch(dispatch, value => adt('title' as const, value))} />
      </Col>

      <Col xs='12'>
        <LongText.view
          label='Teaser'
          help='Provide 1-2 sentences that will entice readers to apply to this opportunity and that describes what you are inviting them to do.'
          placeholder='Provide 1-2 sentences that describe to readers what you are inviting them to do.'
          extraChildProps={{
            style: { height: '200px' }
          }}
          disabled={disabled}
          state={state.teaser}
          dispatch={mapComponentDispatch(dispatch, value => adt('teaser' as const, value))} />
      </Col>

      <Col md='12'>
        <RemoteOkRadioGroup.view
          extraChildProps={{ inline: true }}
          required
          label='Remote OK?'
          help='Indicate if the successful proponent may complete the work as outlined in the opportunity’s acceptance criteria remotely or not. If you select “yes”, provide further details on acceptable remote work options.'
          disabled={disabled}
          state={state.remoteOk}
          dispatch={mapComponentDispatch(dispatch, value => adt('remoteOk' as const, value))} />
      </Col>

      {RadioGroup.valueEquals(state.remoteOk, 'yes')
        ? (<Col xs='12'>
            <LongText.view
              required
              label='Remote Description'
              placeholder={`Provide further information about this opportunity's remote work options.`}
              disabled={disabled}
              extraChildProps={{
                style: { height: '160px' }
              }}
              state={state.remoteDesc}
              dispatch={mapComponentDispatch(dispatch, value => adt('remoteDesc' as const, value))} />
          </Col>)
        : null}

      <Col md='8' xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Location'
          help='Provide the location where you are located or where the work is expected to be completed.'
          placeholder='Location'
          required
          disabled={disabled}
          state={state.location}
          dispatch={mapComponentDispatch(dispatch, value => adt('location' as const, value))} />
      </Col>

      <Col md='8' xs='12'>
        <NumberField.view
          extraChildProps={{ prefix: '$' }}
          label='Fixed-Price Award'
          placeholder='Fixed-Price Award'
          help={(<div>
            <p>To the best of your ability, estimate a fair price for the amount of work that you think it should take from the successful proponent to meet the opportunity’s acceptance criteria. It is suggested that you overestimate.</p>
            <p className='mb-0'>The price estimate must not exceed {FORMATTED_MAX_BUDGET}.</p>
          </div>)}
          required
          disabled={disabled}
          state={state.reward}
          dispatch={mapComponentDispatch(dispatch, value => adt('reward' as const, value))} />
      </Col>

      <Col xs='12'>
        <SelectMulti.view
          extraChildProps={{}}
          label='Required Skills'
          placeholder='Required Skills'
          help='Select the skill(s) from the list provided that the successful proponent must possess in order to be considered for the opportunity. If you do not see the skill that you are looking for, you may create a new skill by entering it into the field below.'
          required
          disabled={disabled}
          state={state.skills}
          dispatch={mapComponentDispatch(dispatch, value => adt('skills' as const, value))} />
      </Col>

    </Row>
  );
};

const DescriptionView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>

      <Col xs='12'>
        <RichMarkdownEditor.view
          required
          label='Description'
          help='Provide a complete description of the opportunity. For example, you may choose to include background information, a description of what you are attempting to accomplish by offering the opportunity, etc. You can format this description with Markdown.'
          placeholder='Describe this opportunity.'
          extraChildProps={{
            style: { height: '60vh', minHeight: '400px' }
          }}
          disabled={disabled}
          state={state.description}
          dispatch={mapComponentDispatch(dispatch, value => adt('description' as const, value))} />
      </Col>

    </Row>
  );
};

const DetailsView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>

      <Col xs='12' md='6'>
        <DateField.view
          required
          extraChildProps={{}}
          label='Proposal Deadline'
          help={(<div>
            <p>Choose a cut-off date for when proposals must be submitted by. The cut-off time is fixed to 4:00PM Pacific Time.</p>
            <p className='mb-0'>A deadline of at least five (5) days from the date that the opportunity is published is recommended.</p>
          </div>)}
          state={state.proposalDeadline}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('proposalDeadline' as const, value))} />
      </Col>
      <Col xs='12' md='6'>
        <DateField.view
          required
          extraChildProps={{}}
          label='Assignment Date'
          help='Choose a date that you will award the successful proponent the opportunity. The assignment date is fixed to 4:00PM Pacific Time.'
          state={state.assignmentDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('assignmentDate' as const, value))} />
      </Col>

      <Col xs='12' md='6'>
        <DateField.view
          required
          extraChildProps={{}}
          label='Proposed Start Date'
          help='Choose a date that you expect the successful proponent to begin the work as outlined in the opportunity’s acceptance criteria.'
          state={state.startDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('startDate' as const, value))} />
      </Col>
      <Col xs='12' md='6'>
        <DateField.view
          extraChildProps={{}}
          label='Completion Date'
          help='Choose a date that you expect the successful proponent to meet the opportunity’s acceptance criteria.'
          state={state.completionDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('completionDate' as const, value))} />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Project Submission Info'
          help='Provide information on how the successful proponent may submit their work as outlined in the opportunity’s acceptance criteria (e.g. GitHub repository URL).'
          placeholder='e.g. GitHub repository URL'
          state={state.submissionInfo}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('submissionInfo' as const, value))} />
      </Col>

      <Col xs='12'>
        <RichMarkdownEditor.view
          required
          label='Acceptance Criteria'
          help='Clearly define what the successful proponent must deliver and all of the criteria that must be met in order for payment to be released. You can format this acceptance criteria with Markdown.'
          placeholder={`Describe this opportunity's acceptance criteria.`}
          extraChildProps={{
            style: { height: '300px' }
          }}
          state={state.acceptanceCriteria}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('acceptanceCriteria' as const, value))} />
      </Col>

      <Col xs='12'>
        <RichMarkdownEditor.view
          required
          label='Evaluation Criteria'
          placeholder={`Describe this opportunity's evaluation criteria.`}
          help={(
            <div>
              <p>Describe the criteria that you will use to score the submitted proposals. State the weight, or points, that you will give to each criterion (e.g. “Experience contributing Java code to any public code repositories with more than 5 contributors (10 points)”). You can format this evaluation criteria with Markdown.</p>
              <p className='mb-0'>It is at your discretion which mandatory and weighted criteria you wish to use.{MANDATORY_WEIGHTED_CRITERIA_URL ? (<span>&nbsp;Please refer to the Government of B.C.’s <Link newTab dest={externalDest(MANDATORY_WEIGHTED_CRITERIA_URL)}>information on procurement</Link> for guidance.</span>) : ''}</p>
            </div>
          )}
          extraChildProps={{
            style: { height: '300px' }
          }}
          state={state.evaluationCriteria}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('evaluationCriteria' as const, value))} />
      </Col>

    </Row>
  );
};

// @duplicated-attachments-view
const AttachmentsView: View<Props> = ({ state, dispatch, disabled }) => {
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

interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: View<Props> = props => {
  const { state, dispatch } = props;
  const activeTab = (() => {
    switch (TabbedForm.getActiveTab(state.tabbedForm)) {
      case 'Overview':    return (<OverviewView {...props} />);
      case 'Description': return (<DescriptionView {...props} />);
      case 'Details':     return (<DetailsView {...props} />);
      case 'Attachments': return (<AttachmentsView {...props} />);
    }
  })();
  return (
    <TabbedFormComponent.view
      valid={isValid(state)}
      disabled={props.disabled}
      getTabLabel={a => a}
      isTabValid={tab => {
        switch (tab) {
          case 'Overview':    return isOverviewTabValid(state);
          case 'Description': return isDescriptionTabValid(state);
          case 'Details':     return isDetailsTabValid(state);
          case 'Attachments': return isAttachmentsTabValid(state);
        }
      }}
      state={state.tabbedForm}
      dispatch={mapComponentDispatch(dispatch, msg => adt('tabbedForm' as const, msg))}>
      {activeTab}
    </TabbedFormComponent.view>
  );
};
