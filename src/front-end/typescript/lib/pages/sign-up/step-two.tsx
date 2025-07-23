import { APP_TERMS_CONTENT_ID } from "front-end/config";
import {
  makePageMetadata,
  makeStartLoading,
  makeStopLoading,
  sidebarValid,
  updateValid,
  viewValid
} from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import * as FormField from "front-end/lib/components/form-field";
import * as Checkbox from "front-end/lib/components/form-field/checkbox";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import { userTypeToTitleCase } from "shared/lib/resources/user";
import * as ProfileForm from "front-end/lib/pages/user/lib/components/profile-form";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import makeInstructionalSidebar from "front-end/lib/views/sidebar/instructional";
import React from "react";
import { Col, Row } from "reactstrap";
import { mustAcceptTerms, User, UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState {
  completeProfileLoading: number;
  user: User;
  mustAcceptTerms: boolean;
  profileForm: Immutable<ProfileForm.State>;
  acceptedTerms: Immutable<Checkbox.State>;
  notificationsOn: Immutable<Checkbox.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg =
  | ADT<"profileForm", ProfileForm.Msg>
  | ADT<"acceptedTerms", Checkbox.Msg>
  | ADT<"notificationsOn", Checkbox.Msg>
  | ADT<"completeProfile">
  | ADT<"onCompleteProfileResponse", ProfileForm.PersistResult>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType({
  userType: [UserType.Vendor],
  success({ shared }) {
    const user = shared.sessionUser;
    if (user.lastAcceptedTermsAt) {
      return [
        invalid(null),
        [
          component_.cmd.dispatch(
            component_.global.replaceRouteMsg(adt("dashboard" as const, null))
          )
        ]
      ];
    }
    const [profileFormState, profileFormCmds] = ProfileForm.init({ user });
    const [acceptedTermsState, acceptedTermsCmds] = Checkbox.init({
      errors: [],
      child: {
        value: !!user.acceptedTermsAt,
        id: "user-sign-up-step-two-terms"
      }
    });
    const [notificationsOnState, notificationsOnCmds] = Checkbox.init({
      errors: [],
      child: {
        value: !!user.notificationsOn,
        id: "user-sign-up-step-two-notifications"
      }
    });
    return [
      valid(
        immutable({
          completeProfileLoading: 0,
          user,
          mustAcceptTerms: mustAcceptTerms(user),
          profileForm: immutable(profileFormState),
          acceptedTerms: immutable(acceptedTermsState),
          notificationsOn: immutable(notificationsOnState)
        })
      ) as State,
      [
        component_.cmd.dispatch(component_.page.readyMsg()),
        ...component_.cmd.mapMany(
          profileFormCmds,
          (msg) => adt("profileForm", msg) as Msg
        ),
        ...component_.cmd.mapMany(
          acceptedTermsCmds,
          (msg) => adt("acceptedTerms", msg) as Msg
        ),
        ...component_.cmd.mapMany(
          notificationsOnCmds,
          (msg) => adt("notificationsOn", msg) as Msg
        )
      ]
    ];
  },
  fail({ shared }) {
    if (shared.session?.user) {
      return [
        invalid(null),
        [
          component_.cmd.dispatch(
            component_.global.replaceRouteMsg(adt("dashboard" as const, null))
          )
        ]
      ];
    } else {
      return [
        invalid(null),
        [
          component_.cmd.dispatch(
            component_.global.replaceRouteMsg(adt("signIn" as const, {}))
          )
        ]
      ];
    }
  }
});

const startCompleteProfileLoading = makeStartLoading<ValidState>(
  "completeProfileLoading"
);
const stopCompleteProfileLoading = makeStopLoading<ValidState>(
  "completeProfileLoading"
);

const update: component_.page.Update<State, InnerMsg, Route> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "profileForm":
        return component_.base.updateChild({
          state,
          childStatePath: ["profileForm"],
          childUpdate: ProfileForm.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("profileForm", value)
        });
      case "acceptedTerms":
        return component_.base.updateChild({
          state,
          childStatePath: ["acceptedTerms"],
          childUpdate: Checkbox.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("acceptedTerms", value)
        });
      case "notificationsOn":
        return component_.base.updateChild({
          state,
          childStatePath: ["notificationsOn"],
          childUpdate: Checkbox.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("notificationsOn", value)
        });
      case "completeProfile":
        return [
          startCompleteProfileLoading(state),
          [
            component_.cmd.map(
              ProfileForm.persist({
                state: state.profileForm,
                userId: state.user.id,
                acceptedTerms:
                  state.mustAcceptTerms &&
                  FormField.getValue(state.acceptedTerms),
                notificationsOn: FormField.getValue(state.notificationsOn)
              }),
              (result) => adt("onCompleteProfileResponse", result)
            )
          ]
        ];
      case "onCompleteProfileResponse": {
        const result = msg.value;
        switch (result.tag) {
          case "valid": {
            const [formState, formCmds, user] = result.value;
            return [
              state.set("user", user).set("profileForm", formState),
              [
                ...component_.cmd.mapMany(
                  formCmds,
                  (msg) => adt("profileForm", msg) as Msg
                ),
                component_.cmd.dispatch(
                  component_.global.replaceRouteMsg(
                    adt("dashboard" as const, null)
                  )
                )
              ]
            ];
          }
          case "invalid":
          default:
            return [
              stopCompleteProfileLoading(state).set(
                "profileForm",
                result.value
              ),
              []
            ];
        }
      }
      default:
        return [state, []];
    }
  }
);

function isValid(state: Immutable<ValidState>): boolean {
  return (
    (!state.mustAcceptTerms || FormField.getValue(state.acceptedTerms)) &&
    ProfileForm.isValid(state.profileForm)
  );
}

const ViewProfileFormCheckboxes: component_.base.ComponentView<
  ValidState,
  Msg
> = ({ state, dispatch }) => {
  const isDisabled = state.completeProfileLoading > 0;
  return (
    <Row className="mt-4">
      <Col xs="12">
        {state.mustAcceptTerms ? (
          <Checkbox.view
            extraChildProps={{
              inlineLabel: (
                <b>
                  I acknowledge that I have read and agree to the{" "}
                  <Link
                    newTab
                    dest={routeDest(adt("contentView", APP_TERMS_CONTENT_ID))}>
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link newTab dest={routeDest(adt("contentView", "privacy"))}>
                    Privacy Policy
                  </Link>
                  .<FormField.ViewRequiredAsterisk />
                </b>
              )
            }}
            disabled={isDisabled}
            state={state.acceptedTerms}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("acceptedTerms" as const, value)
            )}
          />
        ) : null}
        <Checkbox.view
          extraChildProps={{
            inlineLabel: "Notify me about new opportunities."
          }}
          disabled={isDisabled}
          state={state.notificationsOn}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("notificationsOn" as const, value)
          )}
        />
      </Col>
    </Row>
  );
};

const ViewProfileFormButtons: component_.base.ComponentView<
  ValidState,
  Msg
> = ({ state, dispatch }) => {
  const isCompleteProfileLoading = state.completeProfileLoading > 0;
  const isDisabled = !isValid(state) || isCompleteProfileLoading;
  return (
    <Row className="mt-4">
      <Col xs="12" className="d-flex flex-nowrap justify-content-md-end">
        <Link
          button
          disabled={isDisabled}
          onClick={() => dispatch(adt("completeProfile"))}
          loading={isCompleteProfileLoading}
          symbol_={leftPlacement(iconLinkSymbol("user-check"))}
          color="primary">
          Complete Profile
        </Link>
      </Col>
    </Row>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  (props) => {
    const { state, dispatch } = props;
    const isDisabled = state.completeProfileLoading > 0;
    return (
      <div>
        <ProfileForm.view
          disabled={isDisabled}
          state={state.profileForm}
          dispatch={component_.base.mapDispatch(
            dispatch,
            (value) => adt("profileForm" as const, value) as Msg
          )}
        />
        <ViewProfileFormCheckboxes {...props} />
        <ViewProfileFormButtons {...props} />
      </div>
    );
  }
);

export const component: component_.page.Component<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = {
  init,
  update,
  view,
  sidebar: sidebarValid({
    size: "large",
    color: "c-sidebar-instructional-bg",
    view: makeInstructionalSidebar<ValidState, Msg>({
      getTitle: () => "You're almost done!",
      getDescription: (state) =>
        `Your ${userTypeToTitleCase(
          state.user.type
        )} account for the Digital Marketplace is almost ready. Please confirm your information below to complete your profile.`,
      getFooter: () => <span></span>
    })
  }),
  getMetadata() {
    return makePageMetadata("Complete Your Profile");
  }
};
