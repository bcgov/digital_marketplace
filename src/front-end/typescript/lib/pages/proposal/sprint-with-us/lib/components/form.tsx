import * as FormField from 'front-end/lib/components/form-field';
import * as NumberField from 'front-end/lib/components/form-field/number';
import * as Select from 'front-end/lib/components/form-field/select';
import * as TabbedForm from 'front-end/lib/components/tabbed-form';
import { Component, ComponentViewProps, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as References from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/references';
import * as Review from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/review';
import * as Team from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/team';
import * as TeamQuestions from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/team-questions';
import Link, { routeDest } from 'front-end/lib/views/link';
import Markdown from 'front-end/lib/views/markdown';
import React from 'react';
import { Alert, Col, Row } from 'reactstrap';
import { formatAmount } from 'shared/lib';
import { SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { CreateRequestBody, CreateValidationErrors, SWUProposal, SWUProposalPhaseType, swuProposalPhaseTypeToTitleCase } from 'shared/lib/resources/proposal/sprint-with-us';
import { User, UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid } from 'shared/lib/validation';
import * as proposalValidation from 'shared/lib/validation/proposal/sprint-with-us';

export type TabId = 'Evaluation' | 'Team' | 'Pricing' | 'Team Questions' | 'References' | 'Review Proposal';

const TabbedFormComponent = TabbedForm.makeComponent<TabId>();

export interface Params {
  viewerUser: User;
  opportunity: SWUOpportunity;
  organizations: OrganizationSlim[];
  evaluationContent: string;
  proposal?: SWUProposal;
  activeTab?: TabId;
}

export interface State extends Pick<Params, 'viewerUser' | 'opportunity' | 'evaluationContent'> {
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

const DEFAULT_ACTIVE_TAB: TabId = 'Evaluation';

export const init: Init<Params, State> = async ({ viewerUser, opportunity, organizations, evaluationContent, proposal, activeTab = DEFAULT_ACTIVE_TAB }) => {
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
    viewerUser,
    evaluationContent,
    opportunity,

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
      organization: proposal?.organization,
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
      questions: proposal?.teamQuestionResponses || []
    })),

    references: immutable(await References.init({
      references: proposal?.references || []
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
      .update('organization', s => FormField.setErrors(s, errors.organization || []))
      .update('team', s => Team.setErrors(s, {
        inceptionPhase: errors.inceptionPhase,
        prototypePhase: errors.prototypePhase,
        implementationPhase: errors.implementationPhase
      }))
      .update('inceptionCost', s => FormField.setErrors(s, errors.inceptionPhase?.proposedCost || []))
      .update('prototypeCost', s => FormField.setErrors(s, errors.prototypePhase?.proposedCost || []))
      .update('implementationCost', s => FormField.setErrors(s, errors.implementationPhase?.proposedCost || []))
      .update('totalCost', s => FormField.setErrors(s, errors.totalProposedCost || []))
      .update('teamQuestions', s => TeamQuestions.setErrors(s, errors.teamQuestionResponses || []))
      .update('references', s => References.setErrors(s, errors.references || []));
  } else {
    return state;
  }
}

export function isTeamTabValid(state: Immutable<State>): boolean {
  return Team.isValid(state.team);
}

export function isPricingTabValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.inceptionCost)
      && FormField.isValid(state.prototypeCost)
      && FormField.isValid(state.implementationCost)
      && FormField.isValid(state.totalCost);
}

export function isTeamQuestionsTabValid(state: Immutable<State>): boolean {
  return TeamQuestions.isValid(state.teamQuestions);
}

export function isReferencesTabValid(state: Immutable<State>): boolean {
  return References.isValid(state.references);
}

export function isValid(state: Immutable<State>): boolean {
  return isTeamTabValid(state)
      && isPricingTabValid(state)
      && isTeamQuestionsTabValid(state)
      && isReferencesTabValid(state);
}

export type Values = Omit<CreateRequestBody, 'status'>;

export function getValues(state: Immutable<State>): Values | null {
  const inceptionCost = FormField.getValue(state.inceptionCost);
  const prototypeCost = FormField.getValue(state.prototypeCost);
  const implementationCost = FormField.getValue(state.implementationCost);
  const organization = FormField.getValue(state.organization);
  if (inceptionCost === null || prototypeCost === null || implementationCost === null || !organization) {
    return null;
  }
  const team = Team.getValues(state.team);
  return {
    opportunity: state.opportunity.id,
    organization: organization.value,
    inceptionPhase: team.inceptionPhase && {
      ...team.inceptionPhase,
      proposedCost: inceptionCost
    },
    prototypePhase: team.prototypePhase && {
      ...team.prototypePhase,
      proposedCost: prototypeCost
    },
    implementationPhase: {
      ...team.implementationPhase,
      proposedCost: implementationCost
    },
    references: References.getValues(state.references),
    teamQuestionResponses: TeamQuestions.getValues(state.teamQuestions),
    attachments: []
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

function updateTotalCost(state: Immutable<State>): Immutable<State> {
  const inceptionCost = FormField.getValue(state.inceptionCost) || 0;
  const prototypeCost = FormField.getValue(state.prototypeCost) || 0;
  const implementationCost = FormField.getValue(state.implementationCost) || 0;
  const total = inceptionCost + prototypeCost + implementationCost;
  return state.update('totalCost', s => {
    s = FormField.setValue(s, total);
    return FormField.validate(s);
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

    case 'organization':
      return updateComponentChild({
        state,
        childStatePath: ['organization'],
        childUpdate: Select.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('organization', value)
      });

    case 'team':
      return updateComponentChild({
        state,
        childStatePath: ['team'],
        childUpdate: Team.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('team', value)
      });

    case 'inceptionCost':
      return updateComponentChild({
        state,
        childStatePath: ['inceptionCost'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('inceptionCost', value),
        updateAfter: state => [updateTotalCost(state)]
      });

    case 'prototypeCost':
      return updateComponentChild({
        state,
        childStatePath: ['prototypeCost'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('prototypeCost', value),
        updateAfter: state => [updateTotalCost(state)]
      });

    case 'implementationCost':
      return updateComponentChild({
        state,
        childStatePath: ['implementationCost'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('implementationCost', value),
        updateAfter: state => [updateTotalCost(state)]
      });

    case 'totalCost':
      return updateComponentChild({
        state,
        childStatePath: ['totalCost'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('totalCost', value)
      });

    case 'teamQuestions':
      return updateComponentChild({
        state,
        childStatePath: ['teamQuestions'],
        childUpdate: TeamQuestions.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('teamQuestions', value)
      });

    case 'references':
      return updateComponentChild({
        state,
        childStatePath: ['references'],
        childUpdate: References.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('references', value)
      });

    case 'review':
      return updateComponentChild({
        state,
        childStatePath: ['review'],
        childUpdate: Review.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('review', value)
      });
  }
};

const EvaluationView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>
      <Col xs='12'>
        <Markdown openLinksInNewTabs source={state.evaluationContent} />
      </Col>
    </Row>
  );
};

const TeamView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <div>
      <Row>
        <Col xs='12'>
          <p>Select your organization and team members for each phase of this Sprint With Us opportunity. In order to submit your proposal for consideration, you must:</p>
          <ul className='mb-5'>
            <li>Select at least two members for each phase; and</li>
            <li>Ensure the aggregate of your team's capabilities must satisfy all of the required capabilities for each phase.</li>
          </ul>
        </Col>
        <Col xs='12'>
          <Select.view
            extraChildProps={{}}
            required
            className='mb-0'
            label='Organization'
            placeholder='Organization'
            hint={state.viewerUser.type === UserType.Vendor
              ? (<span>If the organization you are looking for is not listed in this dropdown, please ensure that you have created the organization in <Link newTab dest={routeDest(adt('userProfile', { userId: state.viewerUser.id, tabId: 'organizations' }))}>your user profile</Link> and that it is qualified to apply for Sprint With Us opportunities.</span>)
              : undefined}
            state={state.organization}
            dispatch={mapComponentDispatch(dispatch, v => adt('organization' as const, v))}
            disabled={disabled} />
        </Col>
        {FormField.getValue(state.organization)
          ? (<Col xs='12'>
              <div className='mt-5 pt-5 border-top'>
                <Team.view
                  disabled={disabled}
                  state={state.team}
                  dispatch={mapComponentDispatch(dispatch, value => adt('team' as const, value))} />
              </div>
            </Col>)
          : null}
      </Row>
    </div>
  );
};

const PricingView: View<Props> = ({ state, dispatch, disabled }) => {
  const { inceptionPhase, prototypePhase, implementationPhase, totalMaxBudget } = state.opportunity;
  return (
    <Row>
      {inceptionPhase
        ? (<Col xs='12' md='4'>
            <NumberField.view
              extraChildProps={{ prefix: '$' }}
              label='Inception Cost'
              placeholder='Inception Cost'
              hint={`Maximum phase budget is ${formatAmount(inceptionPhase.maxBudget, '$')}`}
              disabled={disabled}
              state={state.inceptionCost}
              dispatch={mapComponentDispatch(dispatch, value => adt('inceptionCost' as const, value))} />
          </Col>)
        : null}
      {prototypePhase
        ? (<Col xs='12' md='4'>
            <NumberField.view
              extraChildProps={{ prefix: '$' }}
              label='Prototype Cost'
              placeholder='Prototype Cost'
              hint={`Maximum phase budget is ${formatAmount(prototypePhase.maxBudget, '$')}`}
              disabled={disabled}
              state={state.prototypeCost}
              dispatch={mapComponentDispatch(dispatch, value => adt('prototypeCost' as const, value))} />
          </Col>)
        : null}
        <Col xs='12' md='4'>
          <NumberField.view
            extraChildProps={{ prefix: '$' }}
            label='Implementation Cost'
            placeholder='Implementation Cost'
            hint={`Maximum phase budget is ${formatAmount(implementationPhase.maxBudget, '$')}`}
            disabled={disabled}
            state={state.implementationCost}
            dispatch={mapComponentDispatch(dispatch, value => adt('implementationCost' as const, value))} />
        </Col>
        <Col xs='12' md='4'>
          <NumberField.view
            extraChildProps={{ prefix: '$' }}
            label='Total Proposed Cost'
            placeholder='Total Proposed Cost'
            hint={`Maximum budget is ${formatAmount(totalMaxBudget, '$')}`}
            disabled
            state={state.totalCost}
            dispatch={mapComponentDispatch(dispatch, value => adt('totalCost' as const, value))} />
        </Col>
    </Row>
  );
};

const TeamQuestionsView: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <Row>
      <Row>
        <Col xs='12'>
          <p className='mb-4'>Provide a response to each of the team questions belows. Please note that responses that exceed the word limit will receive a score of zero.</p>
          <Alert color='danger' fade={false} className='mb-5'>
            <strong>Important!</strong> Do not reference your organization's name, a team member's name or specific company software in any of your responses.
          </Alert>
        </Col>
      </Row>
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
        <Col xs='12'>
          <p className='mb-4'>Provide the names and contact information of three references who will support your claims of experience and who can verify the quality of your work.</p>
          <Alert color='danger' fade={false} className='mb-5'>
            <strong>Important!</strong> Please note that references from your own organization or team members will not be accepted.
          </Alert>
        </Col>
      </Row>
      <References.view
        disabled={disabled}
        state={state.references}
        dispatch={mapComponentDispatch(dispatch, v => adt('references' as const, v))} />
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
          case 'Evaluation':      return true;
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
