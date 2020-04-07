import * as FormField from 'front-end/lib/components/form-field';
import * as DateField from 'front-end/lib/components/form-field/date';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import * as NumberField from 'front-end/lib/components/form-field/number';
import * as Select from 'front-end/lib/components/form-field/select';
import * as SelectMulti from 'front-end/lib/components/form-field/select-multi';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import * as TabbedForm from 'front-end/lib/components/tabbed-form';
import { Component, ComponentViewProps, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as References from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/references';
import * as Review from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/review';
//import * as api from 'front-end/lib/http/api';
import * as Team from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/team';
import * as TeamQuestions from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/team-questions';
import Icon from 'front-end/lib/views/icon';
import { flatten } from 'lodash';
import React from 'react';
import { Alert, Col, Row } from 'reactstrap';
import { CreateRequestBody, CreateValidationErrors, parseSWUOpportunityPhaseType, SWUOpportunity, SWUOpportunityPhaseType } from 'shared/lib/resources/opportunity/sprint-with-us';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { SWUProposal, SWUProposalPhaseType, swuProposalPhaseTypeToTitleCase } from 'shared/lib/resources/proposal/sprint-with-us';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';
import * as proposalValidation from 'shared/lib/validation/proposal/sprint-with-us';

export type TabId = 'Evaluation' | 'Team' | 'Pricing' | 'Team Questions' | 'References' | 'Review Proposal';

const TabbedFormComponent = TabbedForm.makeComponent<TabId>();

export interface State {
  tabbedForm: Immutable<TabbedForm.State<TabId>>;
  // Evaluation Tab
  evaluationContent: string;
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
  review: Immutable<Review.State>;
}

export type Msg
  = ADT<'tabbedForm', TabbedForm.Msg<TabId>>
  // Team Tab
  | ADT<'organization', Select.Msg>
  | ADT<'team', Team.Msg>
  // Pricing Tab
  | ADT<'inceptionCost', NumberField.Msg>
  | ADT<'prototypeCost', NumberField.Msg>
  | ADT<'implementationCost', NumberField.Msg>
  | ADT<'totalCost', NumberField.Msg>
  // Team Questions Tab
  | ADT<'teamQuestions', TeamQuestions.Msg>
  // References Tab
  | ADT<'references', References.Msg>
  // Review Proposal Tab
  | ADT<'review', Review.Msg>;

export interface Params {
  opportunity: SWUOpportunity;
  organizations: OrganizationSlim[];
  evaluationContent: string;
  proposal?: SWUProposal;
  activeTab?: TabId;
}

const DEFAULT_ACTIVE_TAB: TabId = 'Evaluation';

export const init: Init<Params, State> = async ({ opportunity, organizations, evaluationContent, proposal, activeTab = DEFAULT_ACTIVE_TAB }) => {
  const inceptionCost = proposal?.inceptionPhase?.proposedCost || 0;
  const prototypeCost = proposal?.prototypePhase?.proposedCost || 0;
  const implementationCost = proposal?.implementationPhase?.proposedCost || 0;
  const organizationOptions = organizations
    .filter(({ swuQualified }) => swuQualified)
    .map(({ id, legalName }) => ({ label: legalName, value: id }));
  const selectedOrganizationOption = proposal?.organization
    ? { label: proposal.organization.legalName, value: proposal.organization.id }
    : null;
  return {
    evaluationContent,

    tabbedForm: immutable(await TabbedFormComponent.init({
      tabs: [
        'Evaluation',
        'Team',
        'Pricing',
        'Team Questions',
        'References',
        'Review Proposal'
      ],
      activeTab
    })),

    organization: immutable(await Select.init({
      errors: [],
      validate: option => {
        if (!option) { return invalid(['Please select an organization.']); }
        return valid(option);
      },
      child: {
        value: selectedOrganizationOption,
        id: 'swu-proposal-organization',
        options: adt('options', organizationOptions)
      }
    })),

    team: immutable(await Team.init({
      opportunity,
      organizations,
      proposal
    })),

    inceptionCost: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid([`Please enter a valid proposed cost for the ${swuProposalPhaseTypeToTitleCase(SWUProposalPhaseType.Inception)} phase.`]); }
        return proposalValidation.validateSWUPhaseProposedCost(v, opportunity.inceptionPhase?.maxBudget || 0);
      },
      child: {
        value: inceptionCost || null,
        id: 'swu-proposal-inception-cost',
        min: 1
      }
    })),

    prototypeCost: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid([`Please enter a valid proposed cost for the ${swuProposalPhaseTypeToTitleCase(SWUProposalPhaseType.Prototype)} phase.`]); }
        return proposalValidation.validateSWUPhaseProposedCost(v, opportunity.prototypePhase?.maxBudget || 0);
      },
      child: {
        value: prototypeCost || null,
        id: 'swu-proposal-prototype-cost',
        min: 1
      }
    })),

    implementationCost: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid([`Please enter a valid proposed cost for the ${swuProposalPhaseTypeToTitleCase(SWUProposalPhaseType.Implementation)} phase.`]); }
        return proposalValidation.validateSWUPhaseProposedCost(v, opportunity.implementationPhase?.maxBudget || 0);
      },
      child: {
        value: implementationCost || null,
        id: 'swu-proposal-implementation-cost',
        min: 1
      }
    })),

    totalCost: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return valid(v); }
        return proposalValidation.validateSWUProposalProposedCost(v, 0, 0, opportunity.totalMaxBudget);
      },
      child: {
        value: inceptionCost + prototypeCost + implementationCost,
        id: 'swu-proposal-total-cost',
        min: 1
      }
    })),

    teamQuestions: immutable(await TeamQuestions.init({
      //TODO
      questions: []
    })),

    references: immutable(await References.init({
      proposal
    })),

    review: immutable(await Review.init({
      //TODO provide proposal data as view prop
      opportunity
    }))
  };
};

export type Errors = CreateValidationErrors;

export function setErrors(state: Immutable<State>, errors: Errors): Immutable<State> {
  if (errors) {
    return state
      .update('title', s => FormField.setErrors(s, errors.title || []))
      .update('teaser', s => FormField.setErrors(s, errors.teaser || []))
      .update('location', s => FormField.setErrors(s, errors.location || []))
      .update('proposalDeadline', s => FormField.setErrors(s, errors.proposalDeadline || []))
      .update('assignmentDate', s => FormField.setErrors(s, errors.assignmentDate || []))
      .update('totalMaxBudget', s => FormField.setErrors(s, errors.totalMaxBudget || []))
      .update('minTeamMembers', s => FormField.setErrors(s, errors.minTeamMembers || []))
      .update('mandatorySkills', s => FormField.setErrors(s, flatten(errors.mandatorySkills || [])))
      .update('optionalSkills', s => FormField.setErrors(s, flatten(errors.optionalSkills || [])))
      .update('phases', s => Phases.setErrors(s, errors))
      .update('teamQuestions', s => TeamQuestions.setErrors(s, errors.teamQuestions));
  } else {
    return state;
  }
}

export function isEvaluationTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.title)
      && FormField.isValid(state.teaser)
      && FormField.isValid(state.location)
      && FormField.isValid(state.proposalDeadline)
      && FormField.isValid(state.assignmentDate)
      && FormField.isValid(state.totalMaxBudget)
      && FormField.isValid(state.minTeamMembers)
      && FormField.isValid(state.mandatorySkills)
      && FormField.isValid(state.optionalSkills);
}

export function isTeamTabValid(state: Immutable<State>): boolean {
  return true;
}

export function isPricingTabValid(state: Immutable<State>): boolean {
  return Phases.isValid(state.phases)
      && FormField.isValid(state.startingPhase);
}

export function isTeamQuestionsTabValid(state: Immutable<State>): boolean {
  return TeamQuestions.isValid(state.teamQuestions);
}

export function isReferencesTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.questionsWeight)
      && FormField.isValid(state.codeChallengeWeight)
      && FormField.isValid(state.scenarioWeight)
      && FormField.isValid(state.priceWeight)
      && FormField.isValid(state.weightsTotal);
}

export function isValid(state: Immutable<State>): boolean {
  return isEvaluationTabValid(state)
      && isTeamTabValid(state)
      && isPricingTabValid(state)
      && isTeamQuestionsTabValid(state)
      && isReferencesTabValid(state);
}

export type Values = Omit<CreateRequestBody, 'attachments' | 'status'>;

export function getValues(state: Immutable<State>): Values | null {
  const totalMaxBudget = FormField.getValue(state.totalMaxBudget);
  const minTeamMembers = FormField.getValue(state.minTeamMembers);
  const questionsWeight = FormField.getValue(state.questionsWeight);
  const codeChallengeWeight = FormField.getValue(state.codeChallengeWeight);
  const scenarioWeight = FormField.getValue(state.scenarioWeight);
  const priceWeight = FormField.getValue(state.priceWeight);
  const teamQuestions = TeamQuestions.getValues(state.teamQuestions);
  const phases = Phases.getValues(state.phases);
  if (totalMaxBudget === null || minTeamMembers === null || questionsWeight === null || codeChallengeWeight === null || scenarioWeight === null || priceWeight === null || teamQuestions === null || phases === null) {
    return null;
  }
  return {
    ...phases,
    title:            FormField.getValue(state.title),
    teaser:           FormField.getValue(state.teaser),
    location:         FormField.getValue(state.location),
    proposalDeadline: DateField.getValueAsString(state.proposalDeadline),
    assignmentDate:   DateField.getValueAsString(state.assignmentDate),
    totalMaxBudget,
    minTeamMembers,
    mandatorySkills:  SelectMulti.getValueAsStrings(state.mandatorySkills),
    optionalSkills:   SelectMulti.getValueAsStrings(state.optionalSkills),
    questionsWeight,
    codeChallengeWeight,
    scenarioWeight,
    priceWeight,
    teamQuestions
  };
}

/*type PersistAction
  = ADT<'create', CreateSWUOpportunityStatus>
  | ADT<'update', Id>;

export async function persist(state: Immutable<State>, action: PersistAction): Promise<Validation<[Immutable<State>, SWUOpportunity], Immutable<State>>> {
  const values = getValues(state);
  if (!values) { return invalid(state); }
  const isCreateDraft = action.tag === 'create' && action.value === SWUOpportunityStatus.Draft;
  // Transform remoteOk
  if (!isCreateDraft) {
    return invalid(state);
  }
  const actionResult: api.ResponseValidation<SWUOpportunity, CreateValidationErrors | UpdateEditValidationErrors> = await (async () => {
    switch (action.tag) {
        case 'create':
          return await api.opportunities.swu.create({
            ...values,
            status: action.value
          });
        case 'update':
          const updateResult = await api.opportunities.swu.update(action.value, adt('edit' as const, {
            ...values
          }));
          return api.mapInvalid(updateResult, errors => {
            if (errors.opportunity && errors.opportunity.tag === 'edit') {
              return errors.opportunity.value;
            } else {
              return {};
            }
          });
    }
  })();
  switch (actionResult.tag) {
    case 'unhandled':
      return invalid(state);
    case 'invalid':
      return invalid(setErrors(state, actionResult.value));
    case 'valid':
      state = setErrors(state, {});
      return valid([state, actionResult.value]);
  }
}*/

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
            state.set('phases', Phases.setStartingPhase(state.phases, startingPhase || undefined, DateField.getDate(state.assignmentDate)))
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
  }
};

const EvaluationView: View<Props> = ({ state, dispatch, disabled }) => {
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
          label='Minimum Team Members Required'
          placeholder='Minimum Team Members Required'
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

const TeamView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>
      <Col xs='12'>
      </Col>
    </Row>
  );
};

const PricingView: View<Props> = ({ state, dispatch, disabled }) => {
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
        {startingPhase
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

const TeamQuestionsView: View<Props> = ({ state, dispatch, disabled }) => {
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

const ReferencesView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <div>
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

const ReviewProposalView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>
      <Col xs='12'>
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
      case 'Evaluation':      return (<EvaluationView {...props} />);
      case 'Team':            return (<TeamView {...props} />);
      case 'Pricing':         return (<PricingView {...props} />);
      case 'Team Questions':  return (<TeamQuestionsView {...props} />);
      case 'References':      return (<ReferencesView {...props} />);
      case 'Review Proposal': return (<ReviewProposalView {...props} />);
    }
  })();
  return (
    <TabbedFormComponent.view
      valid={isValid(state)}
      disabled={props.disabled}
      getTabLabel={a => a}
      isTabValid={tab => {
        switch (tab) {
          case 'Evaluation':      return isEvaluationTabValid(state);
          case 'Team':            return isTeamTabValid(state);
          case 'Pricing':         return isPricingTabValid(state);
          case 'Team Questions':  return isTeamQuestionsTabValid(state);
          case 'References':      return isReferencesTabValid(state);
          case 'Review Proposal': return true;
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
