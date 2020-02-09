import * as Attachments from 'front-end/lib/components/attachments';
import * as FormField from 'front-end/lib/components/form-field';
import * as DateField from 'front-end/lib/components/form-field/date';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import * as NumberField from 'front-end/lib/components/form-field/number';
import * as RichMarkdownEditor from 'front-end/lib/components/form-field/rich-markdown-editor';
import * as SelectMulti from 'front-end/lib/components/form-field/select-multi';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { Component, ComponentViewProps, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Radio from 'front-end/lib/views/radio';
import { flatten } from 'lodash';
import React from 'react';
import { Col, Nav, NavItem, NavLink, Row } from 'reactstrap';
import SKILLS from 'shared/lib/data/skills';
import { CreateCWUOpportunityStatus, CreateRequestBody, CreateValidationErrors, CWUOpportunity } from 'shared/lib/resources/code-with-us';
import { fileBlobPath } from 'shared/lib/resources/file';
import { adt, ADT } from 'shared/lib/types';
import { invalid, mapInvalid, mapValid, valid, Validation } from 'shared/lib/validation';
import * as opportunityValidation from 'shared/lib/validation/code-with-us';

type TabValues = 'Overview' | 'Description' | 'Details' | 'Attachments';

export interface State {
  activeTab: TabValues;

  // Overview Tab
  title: Immutable<ShortText.State>;
  teaser: Immutable<LongText.State>;
  location: Immutable<ShortText.State>;
  reward: Immutable<NumberField.State>;
  skills: Immutable<SelectMulti.State>;
  remoteOk: boolean;
  // If remoteOk
  remoteDesc: Immutable<LongText.State>;

  // Description Tab
  description: Immutable<RichMarkdownEditor.State>;

  // Details Tab
  proposalDeadline: Immutable<DateField.State>;
  startDate: Immutable<DateField.State>;
  assignmentDate: Immutable<DateField.State>;
  completionDate: Immutable<DateField.State>;
  submissionInfo: Immutable<ShortText.State>;
  acceptanceCriteria: Immutable<LongText.State>;
  evaluationCriteria: Immutable<LongText.State>;

  // Attachments tab
  attachments: Immutable<Attachments.State>;
}

export type Msg
  = ADT<'updateActiveTab',   TabValues>

  // Details Tab
  | ADT<'title',             ShortText.Msg>
  | ADT<'teaser',            LongText.Msg>
  | ADT<'location',          ShortText.Msg>
  | ADT<'reward',            NumberField.Msg>
  | ADT<'skills',            SelectMulti.Msg>
  | ADT<'remoteOk',          boolean>
  | ADT<'remoteDesc',        LongText.Msg>

  // Description Tab
  | ADT<'description',       RichMarkdownEditor.Msg>

  // Details Tab
  | ADT<'proposalDeadline',    DateField.Msg>
  | ADT<'startDate',           DateField.Msg>
  | ADT<'assignmentDate',      DateField.Msg>
  | ADT<'completionDate',      DateField.Msg>
  | ADT<'submissionInfo',      ShortText.Msg>
  | ADT<'acceptanceCriteria',  LongText.Msg>
  | ADT<'evaluationCriteria',  LongText.Msg>

  // Attachments tab
  | ADT<'attachments', Attachments.Msg>;

export type Params = null;

export const init: Init<Params, State> = async () => {
  return {
    activeTab: 'Overview' as const,
    remoteOk: true,

    title: immutable(await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateTitle,
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-title'
      }
    })),

    teaser: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateTeaser,
      child: {
        value: '',
        id: 'opportunity-teaser'
      }
    })),

    location: immutable(await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateLocation,
      child: {
        type: 'text',
        value: 'Victoria',
        id: 'opportunity-location'
      }
    })),

    reward: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return valid(null); }
        return opportunityValidation.validateReward(v);
      },
      child: {
        value: null,
        id: 'opportunity-reward',
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
        value: [],
        id: 'opportunity-skills',
        creatable: true,
        options: SelectMulti.stringsToOptions(SKILLS)
      }
    })),

    remoteDesc: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateRemoteDesc,
      child: {
        value: '',
        id: 'opportunity-remote-desc'
      }
    })),

    description: immutable(await RichMarkdownEditor.init({
      errors: [],
      validate: opportunityValidation.validateDescription,
      child: {
        value: '',
        id: 'opportunity-description',
        async uploadFile(file) {
          const result = await api.files.create({
            name: file.name,
            file,
            metadata: [adt('any')]
          });
          if (api.isValid(result)) {
            return valid({
              name: result.value.name,
              url: fileBlobPath(result.value)
            });
          } else {
            return invalid([
              'Unable to upload file.'
            ]);
          }
        }
      }
    })),

    proposalDeadline: immutable(await DateField.init({
      errors: [],
      validate: DateField.validateDate(opportunityValidation.validateProposalDeadline),
      child: {
        value: null,
        id: 'opportunity-proposal-deadline'
      }
    })),

    startDate: immutable(await DateField.init({
      errors: [],
      validate: DateField.validateDate(opportunityValidation.validateStartDate),
      child: {
        value: null,
        id: 'opportunity-start-date'
      }
    })),

    assignmentDate: immutable(await DateField.init({
      errors: [],
      validate: DateField.validateDate(opportunityValidation.validateAssignmentDate),
      child: {
        value: null,
        id: 'opportunity-assignment-date'
      }
    })),

    completionDate: immutable(await DateField.init({
      errors: [],
      validate: DateField.validateDate(opportunityValidation.validateCompletionDate),
      child: {
        value: null,
        id: 'opportunity-completion-date'
      }
    })),

    submissionInfo: immutable(await ShortText.init({
      errors: [],
      validate: opportunityValidation.validateSubmissionInfo,
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-submission-info'
      }
    })),

    acceptanceCriteria: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateAcceptanceCriteria,
      child: {
        value: '',
        id: 'opportunity-acceptance-criteria'
      }
    })),

    evaluationCriteria: immutable(await LongText.init({
      errors: [],
      validate: opportunityValidation.validateEvaluationCriteria,
      child: {
        value: '',
        id: 'opportunity-evaluation-criteria'
      }
    })),

    attachments: immutable(await Attachments.init({
      existingAttachments: [],
      newAttachmentMetadata: [adt('any')]
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

type Errors = CreateValidationErrors;

export function isValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.title)                      &&
    FormField.isValid(state.teaser)                          &&
    (!state.remoteOk || FormField.isValid(state.remoteDesc)) &&
    FormField.isValid(state.location)                        &&
    FormField.isValid(state.reward)                          &&
    FormField.isValid(state.skills)                          &&
    FormField.isValid(state.description)                     &&
    FormField.isValid(state.proposalDeadline)                &&
    FormField.isValid(state.assignmentDate)                  &&
    FormField.isValid(state.startDate)                       &&
    FormField.isValid(state.completionDate)                  &&
    FormField.isValid(state.submissionInfo)                  &&
    FormField.isValid(state.acceptanceCriteria)              &&
    FormField.isValid(state.evaluationCriteria)              &&
    Attachments.isValid(state.attachments);
}

export type Values = Omit<CreateRequestBody, 'attachments' | 'status'>;

export function getValues(state: Immutable<State>, status?: CreateCWUOpportunityStatus): Values {
  return {
    title:               FormField.getValue(state.title),
    teaser:              FormField.getValue(state.teaser),
    remoteOk:            state.remoteOk,
    remoteDesc:          FormField.getValue(state.remoteDesc),
    location:            FormField.getValue(state.location),
    reward:              FormField.getValue(state.reward) || 0,
    skills:              SelectMulti.getValueAsStrings(state.skills),
    description:         FormField.getValue(state.description),

    proposalDeadline:    DateField.getValueAsString(state.proposalDeadline),
    assignmentDate:      DateField.getValueAsString(state.assignmentDate),
    startDate:           DateField.getValueAsString(state.startDate),
    completionDate:      DateField.getValueAsString(state.completionDate),

    submissionInfo:      FormField.getValue(state.submissionInfo),
    acceptanceCriteria:  FormField.getValue(state.acceptanceCriteria),
    evaluationCriteria:  FormField.getValue(state.evaluationCriteria)
  };
}

type PersistAction
  = ADT<'create', CreateCWUOpportunityStatus>;

export async function persist(state: Immutable<State>, action: PersistAction): Promise<Validation<[Immutable<State>, CWUOpportunity], Immutable<State>>> {
  const values = getValues(state);
  const newAttachments = Attachments.getNewAttachments(state.attachments);
  let attachments = state.attachments.existingAttachments.map(({ id }) => id);
  // Upload new attachments if necessary.
  if (newAttachments.length) {
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
  const actionResult = await (() => {
    switch (action.tag) {
        case 'create':
          return api.opportunities.cwu.create({
            ...values,
            attachments,
            status: action.value
          });
    }
  })();
  switch (actionResult.tag) {
    case 'unhandled':
      return invalid(state);
    case 'invalid':
      return invalid(setErrors(state, actionResult.value));
    case 'valid':
      return valid([state, actionResult.value]);
  }
}

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {

    case 'remoteOk':
      return[state.set('remoteOk', msg.value)];

    case 'updateActiveTab':
      return [state.set('activeTab', msg.value)];

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

    case 'proposalDeadline':
      return updateComponentChild({
        state,
        childStatePath: ['proposalDeadline'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('proposalDeadline', value)
      });

    case 'startDate':
      return updateComponentChild({
        state,
        childStatePath: ['startDate'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('startDate', value)
      });

    case 'assignmentDate':
      return updateComponentChild({
        state,
        childStatePath: ['assignmentDate'],
        childUpdate: DateField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('assignmentDate', value)
      });

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
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('acceptanceCriteria', value)
      });

    case 'evaluationCriteria':
      return updateComponentChild({
        state,
        childStatePath: ['evaluationCriteria'],
        childUpdate: LongText.update,
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

      <Col md='12' className='pb-3'>
        <div className=''>
          <label className='font-weight-bold'>Remote OK?</label>
          <FormField.ViewRequiredAsterisk />
        </div>
        <Radio
          id='remote-ok-true'
          label='Yes'
          checked={state.remoteOk}
          onClick={() => dispatch(adt('remoteOk' as const, true))} />
        <Radio
          id='remote-ok-false'
          label='No'
          checked={!state.remoteOk}
          onClick={() => dispatch(adt('remoteOk' as const, false))} />
      </Col>

      {state.remoteOk
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

      <Col md='8' xs='12'>
        <NumberField.view
          extraChildProps={{}}
          label='Fixed-Price Reward'
          placeholder='Fixed-Price Reward'
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

const DetailsView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>

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

      <Col xs='12' md='6'>
        <DateField.view
          required
          extraChildProps={{}}
          label='Proposed Start Date'
          state={state.startDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('startDate' as const, value))} />
      </Col>
      <Col xs='12' md='6'>
        <DateField.view
          required
          extraChildProps={{}}
          label='Completion Date'
          state={state.completionDate}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('completionDate' as const, value))} />
      </Col>

      <Col xs='12'>
        <ShortText.view
          extraChildProps={{}}
          label='Project Submission Info'
          placeholder='e.g. GitHub repository URL'
          state={state.submissionInfo}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('submissionInfo' as const, value))} />
      </Col>

      <Col xs='12'>
        <LongText.view
          required
          extraChildProps={{}}
          label='Acceptance Criteria'
          placeholder={`Describe this opportunity's acceptance criteria.`}
          style={{ height: '300px' }}
          state={state.acceptanceCriteria}
          disabled={disabled}
          dispatch={mapComponentDispatch(dispatch, value => adt('acceptanceCriteria' as const, value))} />
      </Col>

      <Col xs='12'>
        <LongText.view
          required
          extraChildProps={{}}
          label='Evaluation Criteria'
          placeholder={`Describe this opportunity's evaluation criteria.`}
          style={{ height: '300px' }}
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

// @duplicated-tab-helper-functions
function isActiveTab(state: State, tab: TabValues): boolean {
  return state.activeTab === tab;
}

// @duplicated-tab-helper-functions
const TabLink: View<Props & { tab: TabValues; }> = ({ state, dispatch, disabled, tab }) => {
  const isActive = isActiveTab(state, tab);
  return (
    <NavItem>
      <NavLink active={isActive} className={`text-nowrap ${isActive ? '' : 'text-primary'}`} onClick={() => {dispatch(adt('updateActiveTab', tab)); }} disabled={disabled}>{tab}</NavLink>
    </NavItem>
  );
};

interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: View<Props> = props => {
  const { state } = props;
  const activeTab = (() => {
    switch (state.activeTab) {
      case 'Overview': {
        return (<OverviewView {...props} />) ;
      }
      case 'Description': {
        return (<DescriptionView {...props} />) ;
      }
      case 'Details': {
        return (<DetailsView {...props} />) ;
      }
      case 'Attachments': {
        return (<AttachmentsView {...props} />) ;
      }
    }
  })();

  return (
    <div>
      <div className='d-flex mb-5' style={{ overflowX: 'auto' }}>
        <Nav tabs className='flex-grow-1 flex-nowrap'>
          <TabLink {...props} tab='Overview' />
          <TabLink {...props} tab='Description' />
          <TabLink {...props} tab='Details' />
          <TabLink {...props} tab='Attachments' />
        </Nav>
      </div>
      {activeTab}
    </div>
  );
};

export const component: Component<Params, State, Msg> = {
  init,
  update,
  view
};
