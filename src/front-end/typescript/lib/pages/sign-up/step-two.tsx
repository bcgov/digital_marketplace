import { makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid, withValid } from 'front-end/lib';
import { isSignedIn } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as Checkbox from 'front-end/lib/components/form-field/checkbox';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild } from 'front-end/lib/framework';
import { userTypeToTitleCase } from 'front-end/lib/pages/user/lib';
import * as ProfileForm from 'front-end/lib/pages/user/lib/components/profile-form';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  completeProfileLoading: number;
  user: User;
  profileForm: Immutable<ProfileForm.State>;
  acceptedTerms: Immutable<Checkbox.State>;
  notificationsOn: Immutable<Checkbox.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'profileForm', ProfileForm.Msg>
  | ADT<'acceptedTerms', Checkbox.Msg>
  | ADT<'notificationsOn', Checkbox.Msg>
  | ADT<'completeProfile'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = isSignedIn({
  async success({ shared, dispatch }) {
    const user = shared.sessionUser;
    if (user.acceptedTerms) {
      dispatch(replaceRoute(adt('userProfile' as const, {
        userId: user.id
      })));
      return invalid(null);
    }
    return valid(immutable({
      completeProfileLoading: 0,
      user,
      profileForm: immutable(await ProfileForm.init({ user })),
      acceptedTerms: immutable(await Checkbox.init({
        errors: [],
        child: {
          value: !!user.acceptedTerms,
          id: 'user-sign-up-step-two-terms'
        }
      })),
      notificationsOn: immutable(await Checkbox.init({
        errors: [],
        child: {
          value: !!user.notificationsOn,
          id: 'user-sign-up-step-two-notifications'
        }
      }))
    }));
  },
  async fail({ dispatch }) {
    dispatch(replaceRoute(adt('signIn' as const, {})));
    return invalid(null);
  }
});

const startCompleteProfileLoading = makeStartLoading<ValidState>('completeProfileLoading');
const stopCompleteProfileLoading = makeStopLoading<ValidState>('completeProfileLoading');

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'profileForm':
      return updateComponentChild({
        state,
        childStatePath: ['profileForm'],
        childUpdate: ProfileForm.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('profileForm', value)
      });
    case 'acceptedTerms':
      return updateComponentChild({
        state,
        childStatePath: ['acceptedTerms'],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('acceptedTerms', value)
      });
    case 'notificationsOn':
      return updateComponentChild({
        state,
        childStatePath: ['notificationsOn'],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('notificationsOn', value)
      });
    case 'completeProfile':
      return [
        startCompleteProfileLoading(state),
        async (state, dispatch) => {
          const result = await ProfileForm.persist({
            state: state.profileForm,
            userId: state.user.id,
            acceptedTerms: FormField.getValue(state.acceptedTerms),
            notificationsOn: FormField.getValue(state.notificationsOn)
          });
          switch (result.tag) {
            case 'valid':
              dispatch(replaceRoute(adt('landing' as const, null)));
              return state = state
                .set('user', result.value[1])
                .set('profileForm', result.value[0]);
            case 'invalid':
              return stopCompleteProfileLoading(state)
                .set('profileForm', result.value);
          }
        }
      ];
    default:
      return [state];
  }
});

function isValid(state: Immutable<ValidState>): boolean {
  return FormField.getValue(state.acceptedTerms)
      && ProfileForm.isValid(state.profileForm);
}

const ViewProfileFormCheckboxes: ComponentView<ValidState, Msg> = ({ state, dispatch }) => {
  const isDisabled = state.completeProfileLoading > 0;
  return (
    <Row className='mt-4'>
      <Col xs='12'>
        <Checkbox.view
          extraChildProps={{
            inlineLabel: (
              <b>I acknowledge that I have read and agree to the <Link newTab dest={routeDest(adt('content' as const, 'terms-and-conditions'))}>Terms and Conditions</Link> and <Link newTab dest={routeDest(adt('content' as const, 'privacy'))}>Privacy Policy</Link>.<FormField.ViewRequiredAsterisk /></b>
            )
          }}
          disabled={isDisabled}
          state={state.acceptedTerms}
          dispatch={mapComponentDispatch(dispatch, value => adt('acceptedTerms' as const, value))} />
        <Checkbox.view
          extraChildProps={{ inlineLabel: 'Notify me about new opportunities.' }}
          disabled={isDisabled}
          state={state.notificationsOn}
          dispatch={mapComponentDispatch(dispatch, value => adt('notificationsOn' as const, value))} />
      </Col>
    </Row>
  );
};

const ViewProfileFormButtons: ComponentView<ValidState, Msg> = ({ state, dispatch }) => {
  const isCompleteProfileLoading = state.completeProfileLoading > 0;
  const isDisabled = !isValid(state) || isCompleteProfileLoading;
  return (
    <Row className='mt-4'>
      <Col xs='12' className='d-flex flex-nowrap justify-content-md-end'>
          <LoadingButton
            disabled={isDisabled}
            onClick={() => dispatch(adt('completeProfile'))}
            loading={isCompleteProfileLoading}
            symbol_={leftPlacement(iconLinkSymbol('user-check'))}
            color='primary'>
            Complete Profile
          </LoadingButton>
      </Col>
    </Row>
  );
};

const view: ComponentView<State, Msg> = viewValid(props => {
  const { state, dispatch } = props;
  const isDisabled = state.completeProfileLoading > 0;
  return (
    <div>
      <ProfileForm.view
        disabled={isDisabled}
        state={state.profileForm}
        dispatch={mapComponentDispatch(dispatch, value => adt('profileForm' as const, value))} />
      <ViewProfileFormCheckboxes {...props} />
      <ViewProfileFormButtons {...props} />
    </div>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: {
    size: 'large',
    color: 'blue-light',
    view: makeInstructionalSidebar<State, Msg>({
      getTitle: () => 'You\'re almost done!',
      getDescription: withValid(state => `Your ${userTypeToTitleCase(state.user.type)} account for the Digital Marketplace is almost ready. Please confirm your information below to complete your profile.`, ''),
      getFooter: () => (<span></span>)
    })
  },
  getMetadata() {
    return makePageMetadata('Complete Your Profile');
  }
};
