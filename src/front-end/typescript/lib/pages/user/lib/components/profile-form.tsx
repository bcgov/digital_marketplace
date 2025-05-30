import * as FormField from "front-end/lib/components/form-field";
import * as ShortText from "front-end/lib/components/form-field/short-text";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import {
  keyCloakIdentityProviderToTitleCase,
  userAvatarPath,
  userToKeyCloakIdentityProviderTitleCase
} from "front-end/lib/pages/user/lib";
import { AvatarFiletype } from "front-end/lib/types";
import FileLink from "front-end/lib/views/file-link";
import React from "react";
import { Col, Row } from "reactstrap";
import { getString } from "shared/lib";
import { SUPPORTED_IMAGE_EXTENSIONS } from "shared/lib/resources/file";
import {
  isPublicSectorUserType,
  User,
  userTypeToKeycloakIdentityProvider
} from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import {
  ErrorTypeFrom,
  invalid,
  mapValid,
  valid,
  Validation,
  isInvalid
} from "shared/lib/validation";
import {
  validateEmail,
  validateJobTitle,
  validateName
} from "shared/lib/validation/user";

export interface Params {
  user: User;
}

export interface State extends Params {
  name: Immutable<ShortText.State>;
  email: Immutable<ShortText.State>;
  jobTitle: Immutable<ShortText.State>;
  idpUsername: Immutable<ShortText.State>;
  newAvatarImage: AvatarFiletype;
}

export type Msg =
  | ADT<"jobTitle", ShortText.Msg>
  | ADT<"email", ShortText.Msg>
  | ADT<"name", ShortText.Msg>
  | ADT<"onChangeAvatar", File>
  | ADT<"idpUsername", ShortText.Msg>;

export interface Values {
  name: string;
  email: string;
  jobTitle: string;
  newAvatarImage?: File;
}

export type Errors = ErrorTypeFrom<State>;

export function getValues(state: Immutable<State>): Values {
  return {
    name: FormField.getValue(state.name),
    email: FormField.getValue(state.email),
    jobTitle: FormField.getValue(state.jobTitle),
    newAvatarImage: state.newAvatarImage ? state.newAvatarImage.file : undefined
  };
}

export function isValid(state: Immutable<State>): boolean {
  return (
    !!state.name.child.value &&
    !!state.email.child.value &&
    (!state.newAvatarImage || !state.newAvatarImage.errors.length) &&
    FormField.isValid(state.name) &&
    FormField.isValid(state.email) &&
    FormField.isValid(state.jobTitle)
  );
}

export function setErrors(
  state: Immutable<State>,
  errors: Errors
): Immutable<State> {
  return state
    .update("name", (s) => FormField.setErrors(s, errors.name || []))
    .update("email", (s) => FormField.setErrors(s, errors.email || []))
    .update("jobTitle", (s) => FormField.setErrors(s, errors.jobTitle || []))
    .update(
      "newAvatarImage",
      (v) => v && { ...v, errors: errors.newAvatarImage || [] }
    );
}

export const init: component_.base.Init<Params, State, Msg> = ({ user }) => {
  const [idpUsernameState, idpUsernameCmds] = ShortText.init({
    errors: [],
    child: {
      type: "text",
      value: getString(user, "idpUsername"),
      id: "user-profile-idp-username"
    }
  });
  const [emailState, emailCmds] = ShortText.init({
    errors: [],
    validate: validateEmail,
    child: {
      type: "text",
      value: getString(user, "email"),
      id: "user-profile-email"
    }
  });
  const [nameState, nameCmds] = ShortText.init({
    errors: [],
    validate: validateName,
    child: {
      type: "text",
      value: getString(user, "name"),
      id: "user-profile-name"
    }
  });
  const [jobTitleState, jobTitleCmds] = ShortText.init({
    errors: [],
    validate: (v) => mapValid(validateJobTitle(v), (w) => w || ""),
    child: {
      type: "text",
      value: getString(user, "jobTitle"),
      id: "user-profile-job-title"
    }
  });
  return [
    {
      user,
      newAvatarImage: null,
      newAvatarImageErrors: [],
      idpUsername: immutable(idpUsernameState),
      email: immutable(emailState),
      name: immutable(nameState),
      jobTitle: immutable(jobTitleState)
    },
    [
      ...component_.cmd.mapMany(idpUsernameCmds, (msg) =>
        adt("idpUsername", msg)
      ),
      ...component_.cmd.mapMany(emailCmds, (msg) => adt("email", msg)),
      ...component_.cmd.mapMany(nameCmds, (msg) => adt("name", msg)),
      ...component_.cmd.mapMany(jobTitleCmds, (msg) => adt("jobTitle", msg))
    ] as component_.Cmd<Msg>[]
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "idpUsername":
      return component_.base.updateChild({
        state,
        childStatePath: ["idpUsername"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("idpUsername", value)
      });
    case "jobTitle":
      return component_.base.updateChild({
        state,
        childStatePath: ["jobTitle"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("jobTitle", value)
      });
    case "email":
      return component_.base.updateChild({
        state,
        childStatePath: ["email"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("email", value)
      });
    case "name":
      return component_.base.updateChild({
        state,
        childStatePath: ["name"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("name", value)
      });
    case "onChangeAvatar":
      return [
        state.set("newAvatarImage", {
          file: msg.value,
          path: URL.createObjectURL(msg.value),
          errors: []
        }),
        []
      ];
  }
};

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: component_.base.View<Props> = (props) => {
  const { state, dispatch, disabled } = props;
  return (
    <Row>
      <Col xs="12">
        <Row>
          <Col xs="12" className="mb-4 d-flex align-items-center flex-nowrap">
            <img
              className="rounded-circle border"
              style={{
                width: "5rem",
                height: "5rem",
                objectFit: "cover"
              }}
              src={
                state.newAvatarImage
                  ? state.newAvatarImage.path
                  : userAvatarPath(state.user)
              }
            />
            <div className="ms-3 d-flex flex-column align-items-start flex-nowrap">
              <div className="mb-2">
                <b>Profile Picture (Optional)</b>
              </div>
              <FileLink
                button
                outline
                size="sm"
                style={{
                  visibility: disabled ? "hidden" : undefined,
                  pointerEvents: disabled ? "none" : undefined
                }}
                onChange={(file) => dispatch(adt("onChangeAvatar", file))}
                accept={SUPPORTED_IMAGE_EXTENSIONS}
                color="primary">
                Choose Image
              </FileLink>
              {state.newAvatarImage && state.newAvatarImage.errors.length ? (
                <div className="mt-2 small text-danger">
                  {state.newAvatarImage.errors.map((e, i) => (
                    <div key={`profile-avatar-error-${i}`}>{e}</div>
                  ))}
                </div>
              ) : null}
            </div>
          </Col>
        </Row>

        <ShortText.view
          extraChildProps={{}}
          help={`Your unique ${keyCloakIdentityProviderToTitleCase(
            userTypeToKeycloakIdentityProvider(state.user.type)
          )} username.`}
          label={
            userToKeyCloakIdentityProviderTitleCase(state.user) || undefined
          }
          disabled
          state={state.idpUsername}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("idpUsername" as const, value)
          )}
        />

        <ShortText.view
          extraChildProps={{}}
          label="Name"
          required
          disabled={disabled}
          state={state.name}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("name" as const, value)
          )}
        />

        {isPublicSectorUserType(state.user.type) ? (
          <ShortText.view
            extraChildProps={{}}
            label="Job Title"
            disabled={disabled}
            state={state.jobTitle}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("jobTitle" as const, value)
            )}
          />
        ) : null}

        <ShortText.view
          extraChildProps={{}}
          label="Email Address"
          required
          disabled={disabled}
          state={state.email}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("email" as const, value)
          )}
        />
      </Col>
    </Row>
  );
};

export interface PersistParams {
  state: Immutable<State>;
  userId: Id;
  existingAvatarImageFile?: Id;
  acceptedTerms?: boolean;
  notificationsOn?: boolean;
}

export type PersistResult = Validation<
  [Immutable<State>, component_.Cmd<Msg>[], User],
  Immutable<State>
>;

export function persist(params: PersistParams): component_.Cmd<PersistResult> {
  const {
    state,
    existingAvatarImageFile,
    acceptedTerms,
    notificationsOn,
    userId
  } = params;
  const values = getValues(state);
  // Cmd Helpers
  // Accept terms.
  const acceptTermsCmd: component_.Cmd<Validation<null, Immutable<State>>> =
    acceptedTerms
      ? api.users.update<Validation<null, Immutable<State>>>()(
          userId,
          adt("acceptTerms"),
          (response) => {
            if (!api.isValid(response)) {
              return invalid(state);
            }
            return valid(null);
          }
        )
      : component_.cmd.dispatch(valid(null));
  // Modify notification subscription.
  const notificationsOnCmd: component_.Cmd<Validation<null, Immutable<State>>> =
    notificationsOn !== undefined
      ? api.users.update<Validation<null, Immutable<State>>>()(
          userId,
          adt("updateNotifications", notificationsOn),
          (response) => {
            if (!api.isValid(response)) {
              return invalid(state);
            }
            return valid(null);
          }
        )
      : component_.cmd.dispatch(valid(null));
  // Update avatar image.
  const uploadAvatarImageCmd: component_.Cmd<
    Validation<Id | undefined, Immutable<State>>
  > = values.newAvatarImage
    ? api.files.avatars.create<Validation<Id, Immutable<State>>>()(
        {
          name: values.newAvatarImage.name,
          file: values.newAvatarImage,
          metadata: [adt("any")]
        },
        (response) => {
          if (!api.isValid(response)) {
            return invalid(
              setErrors(state, {
                newAvatarImage: ["Please select a different avatar image."]
              })
            );
          }
          return valid(response.value.id);
        }
      )
    : component_.cmd.dispatch(valid(existingAvatarImageFile));
  // Combine the above Cmds.
  const combinedPreparationCmds = component_.cmd.andThen(
    acceptTermsCmd,
    (acceptTermsResult) => {
      if (isInvalid(acceptTermsResult))
        return component_.cmd.dispatch(acceptTermsResult);
      return component_.cmd.andThen(
        notificationsOnCmd,
        (notificationsOnResult) => {
          if (isInvalid(notificationsOnResult))
            return component_.cmd.dispatch(notificationsOnResult);
          return uploadAvatarImageCmd;
        }
      );
    }
  );
  // Complete the flow by updating the user's profile.
  return component_.cmd.andThen(
    combinedPreparationCmds,
    (uploadAvatarImageResult) => {
      if (isInvalid(uploadAvatarImageResult))
        return component_.cmd.dispatch(uploadAvatarImageResult);
      return api.users.update<PersistResult>()(
        userId,
        adt("updateProfile", {
          name: values.name,
          email: values.email,
          jobTitle: values.jobTitle,
          avatarImageFile: uploadAvatarImageResult.value
        }),
        (response) => {
          switch (response.tag) {
            case "invalid":
              if (
                response.value.user &&
                response.value.user.tag === "updateProfile"
              ) {
                return invalid(setErrors(state, response.value.user.value));
              } else {
                return invalid(state);
              }
            case "unhandled":
              return invalid(state);
            case "valid": {
              const user = response.value;
              const [newState, cmds] = init({ user });
              return valid([immutable(newState), cmds, user]);
            }
          }
        }
      );
    }
  );
}
