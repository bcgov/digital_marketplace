import { EMPTY_STRING, SWU_PROPOSAL_EVALUATION_CONTENT_ID } from 'front-end/config';
import { getContextualActionsValid, getModalValid, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, mapPageModalMsg, toast, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Form from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/form';
import * as toasts from 'front-end/lib/pages/proposal/sprint-with-us/lib/toasts';
import ViewTabHeader from 'front-end/lib/pages/proposal/sprint-with-us/lib/views/view-tab-header';
import * as Tab from 'front-end/lib/pages/proposal/sprint-with-us/view/tab';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount } from 'shared/lib';
import { hasSWUOpportunityPassedCodeChallenge } from 'shared/lib/resources/opportunity/sprint-with-us';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { NUM_SCORE_DECIMALS, SWUProposal, SWUProposalStatus } from 'shared/lib/resources/proposal/sprint-with-us';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';
import { validateDisqualificationReason } from 'shared/lib/validation/proposal/sprint-with-us';

type ModalId = 'disqualify' | 'award';

interface ValidState extends Tab.Params {
  organizations: OrganizationSlim[];
  evaluationContent: string;
  disqualifyLoading: number;
  awardLoading: number;
  showModal: ModalId | null;
  form: Immutable<Form.State>;
  disqualificationReason: Immutable<LongText.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg
  = ADT<'hideModal'>
  | ADT<'showModal', ModalId>
  | ADT<'form', Form.Msg>
  | ADT<'disqualificationReasonMsg', LongText.Msg>
  | ADT<'disqualify'>
  | ADT<'award'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  const { opportunity, proposal, viewerUser } = params;
  const organizationsResult = await api.organizations.readMany();
  if (!api.isValid(organizationsResult)) { return invalid(null); }
  const evalContentResult = await api.getMarkdownFile(SWU_PROPOSAL_EVALUATION_CONTENT_ID);
  if (!api.isValid(evalContentResult)) { return invalid(null); }
  const organizations = organizationsResult.value;
  const evaluationContent = evalContentResult.value;
  return valid(immutable({
    ...params,
    organizations,
    evaluationContent,
    disqualifyLoading: 0,
    awardLoading: 0,
    showModal: null,
    form: immutable(await Form.init({
      viewerUser,
      opportunity,
      proposal,
      organizations,
      evaluationContent
    })),
    disqualificationReason: immutable(await LongText.init({
      errors: [],
      validate: validateDisqualificationReason,
      child: {
        value: '',
        id: 'swu-proposal-disqualification-reason'
      }
    }))
  }));
};

const startDisqualifyLoading = makeStartLoading<ValidState>('disqualifyLoading');
const stopDisqualifyLoading = makeStopLoading<ValidState>('disqualifyLoading');
const startAwardLoading = makeStartLoading<ValidState>('awardLoading');
const stopAwardLoading = makeStopLoading<ValidState>('awardLoading');

async function resetProposal(state: Immutable<ValidState>, proposal: SWUProposal): Promise<Immutable<ValidState>> {
  state = state.set('proposal', proposal);
  return state
    .set('form', immutable(await Form.init({
      viewerUser: state.viewerUser,
      opportunity: state.opportunity,
      proposal: state.proposal,
      organizations: state.organizations,
      evaluationContent: state.evaluationContent,
      activeTab: Form.getActiveTab(state.form)
    })));
}

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'showModal':
      return [state.set('showModal', msg.value)];
    case 'hideModal':
      if (state.disqualifyLoading > 0) { return [state]; }
      return [state.set('showModal', null)];
    case 'form':
      return updateComponentChild({
        state,
        childStatePath: ['form'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('form', value)
      });
    case 'disqualificationReasonMsg':
      return updateComponentChild({
        state,
        childStatePath: ['disqualificationReason'],
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('disqualificationReasonMsg', value)
      });
    case 'disqualify':
      return [
        startDisqualifyLoading(state),
        async (state, dispatch) => {
          state = stopDisqualifyLoading(state);
          const reason = FormField.getValue(state.disqualificationReason);
          const result = await api.proposals.swu.update(state.proposal.id, adt('disqualify', reason));
          switch (result.tag) {
            case 'valid':
              dispatch(toast(adt('success', toasts.statusChanged.success(SWUProposalStatus.Disqualified))));
              return (await resetProposal(state, result.value))
                .set('showModal', null);
            case 'invalid':
              dispatch(toast(adt('error', toasts.statusChanged.error(SWUProposalStatus.Disqualified))));
              return state.update('disqualificationReason', s => {
                if (result.value.proposal?.tag !== 'disqualify') { return s; }
                return FormField.setErrors(s, result.value.proposal.value);
              });
            case 'unhandled':
              dispatch(toast(adt('error', toasts.statusChanged.error(SWUProposalStatus.Disqualified))));
              return state;
          }
        }
      ];
    case 'award':
      return [
        startAwardLoading(state).set('showModal', null),
        async (state, dispatch) => {
          state = stopAwardLoading(state);
          const result = await api.proposals.swu.update(state.proposal.id, adt('award', ''));
          if (!api.isValid(result)) {
            dispatch(toast(adt('error', toasts.awarded.error)));
            return state;
          }
          dispatch(toast(adt('success', toasts.awarded.success)));
          return await resetProposal(state, result.value);
        }
      ];
    default:
      return [state];
  }
});

const Reporting: ComponentView<ValidState, Msg> = ({ state }) => {
  const proposal = state.proposal;
  const reportCards: Array<ReportCard | null> = [
    {
      icon: 'star-full',
      iconColor: 'yellow',
      name: 'Total Score',
      value: proposal.totalScore ? `${proposal.totalScore.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING
    },
    {
      icon: 'trophy',
      iconColor: 'yellow',
      name: 'Ranking',
      value: proposal.rank ? formatAmount(proposal.rank, undefined, true) : EMPTY_STRING
    }
  ];
  return (
    <Row className='mt-5'>
      <Col xs='12'>
        <ReportCardList reportCards={reportCards} />
      </Col>
    </Row>
  );
};

const view: ComponentView<State, Msg> = viewValid(props => {
  const { state, dispatch } = props;
  const show = hasSWUOpportunityPassedCodeChallenge(state.opportunity);
  return (
    <div>
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      {show ? (<Reporting {...props} />) : null}
      <Row className='mt-5'>
        <Col xs='12'>
          {show
            ? (
                <Form.view
                  disabled
                  state={state.form}
                  dispatch={mapComponentDispatch(dispatch, v => adt('form' as const, v))} />
              )
            : <div className='pt-5 border-top'>This proposal's details will be available once the opportunity reaches the Code Challenge.</div>}
        </Col>
      </Row>
    </div>
  );
});

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,

  getModal: getModalValid<ValidState, Msg>(state => {
    const formModal = mapPageModalMsg(Form.getModal(state.form), msg => adt('form', msg) as Msg);
    if (formModal !== null) { return formModal; }
    const isDisqualifyLoading = state.disqualifyLoading > 0;
    switch (state.showModal) {
      case 'award':
        return {
          title: 'Award Sprint With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Award Opportunity',
              icon: 'award',
              color: 'primary',
              button: true,
              msg: adt('award')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to award this opportunity to this proponent? Once awarded, all of this opportunity\'s subscribers and proponents will be notified accordingly.'
        };
      case 'disqualify':
        return {
          title: 'Disqualification Reason',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Disqualify',
              icon: 'user-slash',
              color: 'danger',
              button: true,
              loading: isDisqualifyLoading,
              disabled: isDisqualifyLoading || !FormField.isValid(state.disqualificationReason),
              msg: adt('disqualify')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              disabled: isDisqualifyLoading,
              msg: adt('hideModal')
            }
          ],
          body: dispatch => (
            <div>
              <p>Provide the reason why this Vendor has been disqualified from the Sprint With Us opportunity.</p>
              <LongText.view
                extraChildProps={{
                  style: { height: '180px' }
                }}
                disabled={isDisqualifyLoading}
                help='Provide a reason for the disqualification of the proponent. This reason will not be shared with the disqualified proponent and is for record-keeping purposes only.'
                required
                label='Reason'
                placeholder='Reason'
                dispatch={mapComponentDispatch(dispatch, v => adt('disqualificationReasonMsg' as const, v))}
                state={state.disqualificationReason} />
            </div>
          )
        };
      case null:
        return null;
    }
  }),

  getContextualActions: getContextualActionsValid(({ state, dispatch }) => {
    const proposal = state.proposal;
    const propStatus = proposal.status;
    switch (propStatus) {
      case SWUProposalStatus.UnderReviewTeamQuestions:
      case SWUProposalStatus.UnderReviewCodeChallenge:
      case SWUProposalStatus.UnderReviewTeamScenario:
      case SWUProposalStatus.EvaluatedTeamQuestions:
      case SWUProposalStatus.EvaluatedCodeChallenge:
        return adt('links', [
          {
            children: 'Disqualify',
            symbol_: leftPlacement(iconLinkSymbol('user-slash')),
            button: true,
            outline: true,
            color: 'white',
            onClick: () => dispatch(adt('showModal', 'disqualify' as const))
          }
        ]);
      case SWUProposalStatus.EvaluatedTeamScenario:
        return adt('links', [
          {
            children: 'Award',
            symbol_: leftPlacement(iconLinkSymbol('award')),
            button: true,
            color: 'primary',
            onClick: () => dispatch(adt('showModal', 'award' as const))
          },
          {
            children: 'Disqualify',
            symbol_: leftPlacement(iconLinkSymbol('user-slash')),
            button: true,
            outline: true,
            color: 'white',
            onClick: () => dispatch(adt('showModal', 'disqualify' as const))
          }
        ]);
      case SWUProposalStatus.NotAwarded:
        return adt('links', [
          {
            children: 'Award',
            symbol_: leftPlacement(iconLinkSymbol('award')),
            button: true,
            color: 'primary',
            onClick: () => dispatch(adt('showModal', 'award' as const))
          }
        ]);
      case SWUProposalStatus.Draft:
      case SWUProposalStatus.Submitted:
      case SWUProposalStatus.Withdrawn:
      case SWUProposalStatus.Awarded:
      case SWUProposalStatus.Disqualified:
        return null;
    }
  })
};
