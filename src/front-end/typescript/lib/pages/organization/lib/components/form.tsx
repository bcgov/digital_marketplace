import { DEFAULT_ORGANIZATION_LOGO_IMAGE_PATH } from "front-end/config";
import { fileBlobPath } from "front-end/lib";
import * as FormField from "front-end/lib/components/form-field";
import * as ShortText from "front-end/lib/components/form-field/short-text";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import { AvatarFiletype } from "front-end/lib/types";
import FileLink from "front-end/lib/views/file-link";
import React from "react";
import { Col, Row } from "reactstrap";
import { getString } from "shared/lib";
import { SUPPORTED_IMAGE_EXTENSIONS } from "shared/lib/resources/file";
import {
  CreateRequestBody,
  Organization,
  UpdateProfileRequestBody
} from "shared/lib/resources/organization";
import { adt, ADT, Id } from "shared/lib/types";
import {
  ErrorTypeFrom,
  invalid,
  valid,
  validateThenMapValid,
  Validation,
  isInvalid
} from "shared/lib/validation";
import * as orgValidation from "shared/lib/validation/organization";

export interface Params {
  organization?: Organization;
}

export interface State extends Params {
  legalName: Immutable<ShortText.State>;
  websiteUrl: Immutable<ShortText.State>;
  streetAddress1: Immutable<ShortText.State>;
  streetAddress2: Immutable<ShortText.State>;
  city: Immutable<ShortText.State>;
  country: Immutable<ShortText.State>;
  mailCode: Immutable<ShortText.State>;
  contactName: Immutable<ShortText.State>;
  region: Immutable<ShortText.State>;
  contactTitle: Immutable<ShortText.State>;
  contactEmail: Immutable<ShortText.State>;
  contactPhone: Immutable<ShortText.State>;
  newLogoImage?: AvatarFiletype;
}

export type Msg =
  | ADT<"legalName", ShortText.Msg>
  | ADT<"websiteUrl", ShortText.Msg>
  | ADT<"streetAddress1", ShortText.Msg>
  | ADT<"streetAddress2", ShortText.Msg>
  | ADT<"city", ShortText.Msg>
  | ADT<"country", ShortText.Msg>
  | ADT<"mailCode", ShortText.Msg>
  | ADT<"contactTitle", ShortText.Msg>
  | ADT<"contactName", ShortText.Msg>
  | ADT<"contactEmail", ShortText.Msg>
  | ADT<"contactPhone", ShortText.Msg>
  | ADT<"region", ShortText.Msg>
  | ADT<"onChangeAvatar", File>;

export interface Values
  extends Omit<
    Required<CreateRequestBody>,
    | "logoImageFile"
    | "deactivatedOn"
    | "deactivatedBy"
    | "serviceAreas"
    | "history"
  > {
  newLogoImage?: File;
}

type Errors = ErrorTypeFrom<Values>;

export function isValid(state: Immutable<State>): boolean {
  const result: boolean =
    FormField.isValid(state.legalName) &&
    FormField.isValid(state.websiteUrl) &&
    FormField.isValid(state.streetAddress1) &&
    FormField.isValid(state.streetAddress2) &&
    FormField.isValid(state.city) &&
    FormField.isValid(state.country) &&
    FormField.isValid(state.mailCode) &&
    FormField.isValid(state.contactTitle) &&
    FormField.isValid(state.contactName) &&
    FormField.isValid(state.contactEmail) &&
    FormField.isValid(state.contactPhone) &&
    FormField.isValid(state.region);

  return result;
}

export function getValues(state: Immutable<State>): Values {
  return {
    legalName: FormField.getValue(state.legalName),
    streetAddress1: FormField.getValue(state.streetAddress1),
    streetAddress2: FormField.getValue(state.streetAddress2),
    city: FormField.getValue(state.city),
    country: FormField.getValue(state.country),
    mailCode: FormField.getValue(state.mailCode),
    contactTitle: FormField.getValue(state.contactTitle),
    contactName: FormField.getValue(state.contactName),
    contactEmail: FormField.getValue(state.contactEmail),
    contactPhone: FormField.getValue(state.contactPhone),
    region: FormField.getValue(state.region),
    websiteUrl: FormField.getValue(state.websiteUrl),
    newLogoImage: state.newLogoImage ? state.newLogoImage.file : undefined
  };
}

export function setErrors(
  state: Immutable<State>,
  errors?: Errors
): Immutable<State> {
  if (errors) {
    return state
      .update("legalName", (s) =>
        FormField.setErrors(s, errors.legalName || [])
      )
      .update("streetAddress1", (s) =>
        FormField.setErrors(s, errors.streetAddress1 || [])
      )
      .update("streetAddress2", (s) =>
        FormField.setErrors(s, errors.streetAddress2 || [])
      )
      .update("city", (s) => FormField.setErrors(s, errors.city || []))
      .update("country", (s) => FormField.setErrors(s, errors.country || []))
      .update("mailCode", (s) => FormField.setErrors(s, errors.mailCode || []))
      .update("contactTitle", (s) =>
        FormField.setErrors(s, errors.contactTitle || [])
      )
      .update("contactName", (s) =>
        FormField.setErrors(s, errors.contactName || [])
      )
      .update("contactEmail", (s) =>
        FormField.setErrors(s, errors.contactEmail || [])
      )
      .update("contactPhone", (s) =>
        FormField.setErrors(s, errors.contactPhone || [])
      )
      .update("region", (s) => FormField.setErrors(s, errors.region || []))
      .update("websiteUrl", (s) =>
        FormField.setErrors(s, errors.websiteUrl || [])
      )
      .update(
        "newLogoImage",
        (v) => v && { ...v, errors: errors.newLogoImage || [] }
      );
  } else {
    return state;
  }
}

export const init: component_.base.Init<Params, State, Msg> = ({
  organization
}) => {
  const [legalNameState, legalNameCmds] = ShortText.init({
    errors: [],
    validate: orgValidation.validateLegalName,
    child: {
      type: "text",
      value: getString(organization, "legalName"),
      id: "organization-gov-legal-name"
    }
  });
  const [websiteUrlState, websiteUrlCmds] = ShortText.init({
    errors: [],
    validate: validateThenMapValid(
      orgValidation.validateWebsiteUrl,
      (a) => a || ""
    ),
    child: {
      type: "text",
      value: getString(organization, "websiteUrl"),
      id: "organization-gov-website-url"
    }
  });
  const [streetAddress1State, streetAddress1Cmds] = ShortText.init({
    errors: [],
    validate: orgValidation.validateStreetAddress1,
    child: {
      type: "text",
      value: getString(organization, "streetAddress1"),
      id: "organization-gov-street-address-one"
    }
  });
  const [streetAddress2State, streetAddress2Cmds] = ShortText.init({
    errors: [],
    validate: validateThenMapValid(
      orgValidation.validateStreetAddress2,
      (a) => a || ""
    ),
    child: {
      type: "text",
      value: getString(organization, "streetAddress2"),
      id: "organization-gov-street-address-two"
    }
  });
  const [cityState, cityCmds] = ShortText.init({
    errors: [],
    validate: orgValidation.validateCity,
    child: {
      type: "text",
      value: getString(organization, "city"),
      id: "organization-gov-city"
    }
  });
  const [countryState, countryCmds] = ShortText.init({
    errors: [],
    validate: orgValidation.validateCountry,
    child: {
      type: "text",
      value: getString(organization, "country"),
      id: "organization-gov-country"
    }
  });
  const [mailCodeState, mailCodeCmds] = ShortText.init({
    errors: [],
    validate: orgValidation.validateMailCode,
    child: {
      type: "text",
      value: getString(organization, "mailCode"),
      id: "organization-gov-mail-code"
    }
  });
  const [contactTitleState, contactTitleCmds] = ShortText.init({
    errors: [],
    validate: validateThenMapValid(
      orgValidation.validateContactTitle,
      (a) => a || ""
    ),
    child: {
      type: "text",
      value: getString(organization, "contactTitle"),
      id: "organization-gov-contact-title"
    }
  });
  const [contactNameState, contactNameCmds] = ShortText.init({
    errors: [],
    validate: orgValidation.validateContactName,
    child: {
      type: "text",
      value: getString(organization, "contactName"),
      id: "organization-gov-contact-name"
    }
  });
  const [contactEmailState, contactEmailCmds] = ShortText.init({
    errors: [],
    validate: orgValidation.validateContactEmail,
    child: {
      type: "text",
      value: getString(organization, "contactEmail"),
      id: "organization-gov-contact-email"
    }
  });
  const [contactPhoneState, contactPhoneCmds] = ShortText.init({
    errors: [],
    validate: validateThenMapValid(
      orgValidation.validateContactPhone,
      (a) => a || ""
    ),
    child: {
      type: "text",
      value: getString(organization, "contactPhone"),
      id: "organization-gov-contact-phone"
    }
  });
  const [regionState, regionCmds] = ShortText.init({
    errors: [],
    validate: orgValidation.validateRegion,
    child: {
      type: "text",
      value: getString(organization, "region"),
      id: "organization-gov-region"
    }
  });
  return [
    {
      organization,
      newLogoImage: null,
      legalName: immutable(legalNameState),
      websiteUrl: immutable(websiteUrlState),
      streetAddress1: immutable(streetAddress1State),
      streetAddress2: immutable(streetAddress2State),
      city: immutable(cityState),
      country: immutable(countryState),
      mailCode: immutable(mailCodeState),
      contactTitle: immutable(contactTitleState),
      contactName: immutable(contactNameState),
      contactEmail: immutable(contactEmailState),
      contactPhone: immutable(contactPhoneState),
      region: immutable(regionState)
    },
    [
      ...component_.cmd.mapMany(
        legalNameCmds,
        (msg) => adt("legalName", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        websiteUrlCmds,
        (msg) => adt("websiteUrl", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        streetAddress1Cmds,
        (msg) => adt("streetAddress1", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        streetAddress2Cmds,
        (msg) => adt("streetAddress2", msg) as Msg
      ),
      ...component_.cmd.mapMany(cityCmds, (msg) => adt("city", msg) as Msg),
      ...component_.cmd.mapMany(
        countryCmds,
        (msg) => adt("country", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        mailCodeCmds,
        (msg) => adt("mailCode", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        contactTitleCmds,
        (msg) => adt("contactTitle", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        contactNameCmds,
        (msg) => adt("contactName", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        contactEmailCmds,
        (msg) => adt("contactEmail", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        contactPhoneCmds,
        (msg) => adt("contactPhone", msg) as Msg
      ),
      ...component_.cmd.mapMany(regionCmds, (msg) => adt("region", msg) as Msg)
    ]
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "onChangeAvatar":
      return [
        state.set("newLogoImage", {
          file: msg.value,
          path: URL.createObjectURL(msg.value),
          errors: []
        }),
        []
      ];
    case "legalName":
      return component_.base.updateChild({
        state,
        childStatePath: ["legalName"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("legalName", value)
      });
    case "websiteUrl":
      return component_.base.updateChild({
        state,
        childStatePath: ["websiteUrl"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("websiteUrl", value)
      });
    case "streetAddress1":
      return component_.base.updateChild({
        state,
        childStatePath: ["streetAddress1"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("streetAddress1", value)
      });
    case "streetAddress2":
      return component_.base.updateChild({
        state,
        childStatePath: ["streetAddress2"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("streetAddress2", value)
      });
    case "city":
      return component_.base.updateChild({
        state,
        childStatePath: ["city"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("city", value)
      });
    case "country":
      return component_.base.updateChild({
        state,
        childStatePath: ["country"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("country", value)
      });
    case "mailCode":
      return component_.base.updateChild({
        state,
        childStatePath: ["mailCode"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("mailCode", value)
      });
    case "contactTitle":
      return component_.base.updateChild({
        state,
        childStatePath: ["contactTitle"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("contactTitle", value)
      });
    case "contactName":
      return component_.base.updateChild({
        state,
        childStatePath: ["contactName"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("contactName", value)
      });
    case "contactEmail":
      return component_.base.updateChild({
        state,
        childStatePath: ["contactEmail"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("contactEmail", value)
      });
    case "contactPhone":
      return component_.base.updateChild({
        state,
        childStatePath: ["contactPhone"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("contactPhone", value)
      });
    case "region":
      return component_.base.updateChild({
        state,
        childStatePath: ["region"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("region", value)
      });
    default:
      return [state, []];
  }
};

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled: boolean;
}

export function orgLogoPath(org?: Organization): string {
  return org && org.logoImageFile
    ? fileBlobPath(org.logoImageFile)
    : DEFAULT_ORGANIZATION_LOGO_IMAGE_PATH;
}

export const view: component_.base.View<Props> = (props) => {
  const { state, dispatch, disabled } = props;
  return (
    <div>
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
              state.newLogoImage
                ? state.newLogoImage.path
                : orgLogoPath(state.organization)
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
            {state.newLogoImage && state.newLogoImage.errors.length ? (
              <div className="mt-2 small text-danger">
                {state.newLogoImage.errors.map((e, i) => (
                  <div key={`org-logo-error-${i}`}>{e}</div>
                ))}
              </div>
            ) : null}
          </div>
        </Col>

        <Col xs="12">
          <ShortText.view
            extraChildProps={{}}
            label="Legal Name"
            required
            disabled={disabled}
            state={state.legalName}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("legalName" as const, value)
            )}
          />
        </Col>

        <Col xs="12">
          <div className="mb-5 pb-5 border-bottom">
            <ShortText.view
              extraChildProps={{}}
              label="Website Url (Optional)"
              disabled={disabled}
              state={state.websiteUrl}
              dispatch={component_.base.mapDispatch(dispatch, (value) =>
                adt("websiteUrl" as const, value)
              )}
            />
          </div>
        </Col>

        <Col xs="12">
          <h3 className="mb-4">Legal Address</h3>
        </Col>

        <Col xs="12">
          <ShortText.view
            extraChildProps={{}}
            label="Street Address"
            required
            disabled={disabled}
            state={state.streetAddress1}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("streetAddress1" as const, value)
            )}
          />
        </Col>

        <Col xs="12">
          <ShortText.view
            extraChildProps={{}}
            label="Street Address"
            disabled={disabled}
            state={state.streetAddress2}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("streetAddress2" as const, value)
            )}
          />
        </Col>

        <Col xs="12" md="8">
          <ShortText.view
            extraChildProps={{}}
            label="City"
            required
            disabled={disabled}
            state={state.city}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("city" as const, value)
            )}
          />
        </Col>

        <Col xs="12" md="4">
          <ShortText.view
            extraChildProps={{}}
            label="Province/State"
            required
            disabled={disabled}
            state={state.region}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("region" as const, value)
            )}
          />
        </Col>

        <Col xs="12">
          <div className="mb-5 pb-5 border-bottom">
            <Row>
              <Col md="5">
                <ShortText.view
                  extraChildProps={{}}
                  label="Postal / ZIP Code"
                  required
                  disabled={disabled}
                  state={state.mailCode}
                  dispatch={component_.base.mapDispatch(dispatch, (value) =>
                    adt("mailCode" as const, value)
                  )}
                />
              </Col>

              <Col md="7">
                <ShortText.view
                  extraChildProps={{}}
                  label="Country"
                  required
                  disabled={disabled}
                  state={state.country}
                  dispatch={component_.base.mapDispatch(dispatch, (value) =>
                    adt("country" as const, value)
                  )}
                />
              </Col>
            </Row>
          </div>
        </Col>

        <Col xs="12">
          <h3 className="mb-4">Contact Information</h3>
        </Col>

        <Col xs="12">
          <ShortText.view
            extraChildProps={{}}
            label="Contact Name"
            required
            disabled={disabled}
            state={state.contactName}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("contactName" as const, value)
            )}
          />
        </Col>

        <Col xs="12">
          <ShortText.view
            extraChildProps={{}}
            label="Job Title (Optional)"
            disabled={disabled}
            state={state.contactTitle}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("contactTitle" as const, value)
            )}
          />
        </Col>

        <Col xs="12" md="7">
          <ShortText.view
            extraChildProps={{}}
            label="Contact Email"
            required
            disabled={disabled}
            state={state.contactEmail}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("contactEmail" as const, value)
            )}
          />
        </Col>

        <Col xs="12" md="5">
          <ShortText.view
            extraChildProps={{}}
            label="Phone Number (Optional)"
            disabled={disabled}
            state={state.contactPhone}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("contactPhone" as const, value)
            )}
          />
        </Col>
      </Row>
    </div>
  );
};

export interface PersistUpdateParams {
  state: Immutable<State>;
  orgId: Id;
  extraBody: Omit<UpdateProfileRequestBody, keyof Values>;
}

export type PersistParams =
  | ADT<"create", Immutable<State>>
  | ADT<"update", PersistUpdateParams>;

export type PersistResult = Validation<
  [Immutable<State>, component_.Cmd<Msg>[], Organization],
  Immutable<State>
>;

export function persist(params: PersistParams): component_.Cmd<PersistResult> {
  const state = params.tag === "create" ? params.value : params.value.state;
  const values = getValues(state);
  const newLogoImage = values.newLogoImage;
  values.newLogoImage = undefined; // So this isn't passed to the back-end.
  // Cmd Helpers
  // Update logo image.
  const existingLogoImageFile: Id | undefined =
    params.tag === "update" ? params.value.extraBody.logoImageFile : undefined;
  const uploadLogoImageCmd: component_.Cmd<
    Validation<Id | undefined, Immutable<State>>
  > = newLogoImage
    ? api.files.avatars.create<Validation<Id, Immutable<State>>>()(
        {
          name: newLogoImage.name,
          file: newLogoImage,
          metadata: [adt("any")]
        },
        (response) => {
          if (!api.isValid(response)) {
            return invalid(
              setErrors(state, {
                newLogoImage: ["Please select a different logo image."]
              })
            );
          }
          return valid(response.value.id);
        }
      )
    : component_.cmd.dispatch(valid(existingLogoImageFile));
  // Complete the flow by updating the organization.
  return component_.cmd.andThen(uploadLogoImageCmd, (uploadLogoImageResult) => {
    if (isInvalid(uploadLogoImageResult))
      return component_.cmd.dispatch(uploadLogoImageResult);
    const logoImageFile = uploadLogoImageResult.value;
    switch (params.tag) {
      case "create":
        return api.organizations.create<PersistResult>()(
          {
            ...values,
            logoImageFile
          },
          (response) => {
            switch (response.tag) {
              case "valid": {
                const organization = response.value;
                const [initState, initCmds] = init({ organization });
                return valid([immutable(initState), initCmds, organization]);
              }
              case "invalid":
                return invalid(setErrors(state, response.value));
              case "unhandled":
                return invalid(state);
            }
          }
        );
      case "update": {
        return api.organizations.update<PersistResult>()(
          params.value.orgId,
          adt("updateProfile", {
            ...params.value.extraBody,
            ...values,
            logoImageFile
          }),
          (response) => {
            switch (response.tag) {
              case "valid": {
                const organization = response.value;
                const [initState, initCmds] = init({ organization });
                return valid([immutable(initState), initCmds, organization]);
              }
              case "invalid":
                if (response.value.organization?.tag === "updateProfile") {
                  return invalid(
                    setErrors(state, response.value.organization.value)
                  );
                }
                return invalid(state);
              case "unhandled":
                return invalid(state);
            }
          }
        );
      }
    }
  });
}
