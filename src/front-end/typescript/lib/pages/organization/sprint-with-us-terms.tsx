import { SWU_QUALIFICATION_TERMS_ID } from 'front-end/config';
import { getAlertsValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import router from 'front-end/lib/app/router';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, newRoute, PageComponent, PageInit, replaceRoute, Update } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Link, { routeDest } from 'front-end/lib/views/link';
import Markdown from 'front-end/lib/views/markdown';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatDateAndTime } from 'shared/lib';
import { Organization } from 'shared/lib/resources/organization';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

export const TITLE = 'Sprint With Us Terms & Conditions';

export function acceptedSWUTermsText(organization: Organization, ifNotAcceptedText: string) {
  return organization.acceptedSWUTerms
    ? `${organization.legalName} agreed to the ${TITLE} on ${formatDateAndTime(organization.acceptedSWUTerms)}.`
    : ifNotAcceptedText;
}

export interface RouteParams {
  orgId: Id;
}

interface ValidState {
  acceptLoading: number;
  organization: Organization;
  body: string;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg = ADT<'accept'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor],

  async success({ routePath, routeParams, dispatch }) {
    const fail = () => {
      dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
      return invalid(null);
    };
    const orgResult = await api.organizations.readOne(routeParams.orgId);
    if (!api.isValid(orgResult)) { return fail(); }
    const markdownResult = await api.getMarkdownFile(SWU_QUALIFICATION_TERMS_ID);
    if (!api.isValid(markdownResult)) { return fail(); }
    return valid(immutable({
      acceptLoading: 0,
      organization: orgResult.value,
      body: markdownResult.value
    }));
  },

  async fail({ shared, routePath, routeParams, dispatch }) {
    if (!shared.session || !shared.session.user) {
      dispatch(replaceRoute(adt('signIn' as const, {
        redirectOnSuccess: router.routeToUrl(adt('orgSWUTerms', { orgId: routeParams.orgId }))
      })));
    } else {
      dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
    }
    return invalid(null);
  }
});

const startAcceptLoading = makeStartLoading<ValidState>('acceptLoading');
const stopAcceptLoading = makeStopLoading<ValidState>('acceptLoading');

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'accept':
      return [
        startAcceptLoading(state),
        async (state, dispatch) => {
          const orgId = state.organization.id;
          const result = await api.organizations.update(orgId, adt('acceptSWUTerms'));
          if (!api.isValid(result)) {
            return stopAcceptLoading(state);
          }
          dispatch(newRoute(adt('orgEdit', {
            orgId,
            tab: 'qualification'
          }) as Route));
          return state;
        }
      ];
    default:
      return [state];
  }
});

const view: ComponentView<State, Msg> = viewValid(({ state, dispatch }) => {
  const { acceptedSWUTerms } = state.organization;
  return (
    <Row>
      <Col xs='12'>
        <h1 className='mb-5'>{TITLE}</h1>
        <Markdown source={state.body} openLinksInNewTabs className={acceptedSWUTerms ? '' : 'mb-5'} />
        {acceptedSWUTerms
          ? null
          : (<div className='d-flex flex-nowrap flex-row-reverse'>
              <Link
                button
                className='ml-3'
                color='primary'
                onClick={() => dispatch(adt('accept'))}>
                Accept Terms & Conditions
              </Link>
              <Link
                color='secondary'
                dest={routeDest(adt('orgEdit', { orgId: state.organization.id, tab: 'qualification' }) as Route)}>
                Cancel
              </Link>
            </div>)}
      </Col>
    </Row>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata(state) {
    return makePageMetadata(TITLE);
  },
  getAlerts: getAlertsValid(state => {
    const acceptedText = acceptedSWUTermsText(state.organization, '');
    return {
      info: acceptedText
        ? [{ text: acceptedText }]
        : []
    };
  })
};
