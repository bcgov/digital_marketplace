import * as Attachments from "front-end/lib/components/attachments";
import * as FormField from "front-end/lib/components/form-field";
import * as RadioGroup from "front-end/lib/components/form-field/radio-group";
import * as RichMarkdownEditor from "front-end/lib/components/form-field/rich-markdown-editor";
import * as Select from "front-end/lib/components/form-field/select";
import * as ShortText from "front-end/lib/components/form-field/short-text";
import * as TabbedForm from "front-end/lib/components/tabbed-form";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import Icon from "front-end/lib/views/icon";
import Link, { routeDest } from "front-end/lib/views/link";
import Markdown from "front-end/lib/views/markdown";
import React from "react";
import { Alert, Col, Row } from "reactstrap";
import { compareStrings, getString } from "shared/lib";
import {
  AffiliationSlim,
  memberIsOrgAdmin,
  memberIsOwner
} from "shared/lib/resources/affiliation";
import { FileUploadMetadata } from "shared/lib/resources/file";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import {
  createBlankIndividualProponent,
  CreateCWUProposalStatus,
  UpdateValidationErrors,
  CreateProponentRequestBody,
  CreateRequestBody,
  CreateValidationErrors,
  CWUProposal,
  UpdateEditValidationErrors
} from "shared/lib/resources/proposal/code-with-us";
import { isVendor, User } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import {
  isValid as isValid_,
  invalid,
  valid,
  Validation
} from "shared/lib/validation";
import * as proposalValidation from "shared/lib/validation/proposal/code-with-us";

type ProponentType = "individual" | "organization";

const ProponentTypeRadioGroup = RadioGroup.makeComponent<ProponentType>();

export type TabId = "Proponent" | "Proposal" | "Attachments";

const TabbedFormComponent = TabbedForm.makeComponent<TabId>();

const newAttachmentMetadata: FileUploadMetadata = [];

export interface State {
  opportunity: CWUOpportunity;
  tabbedForm: Immutable<TabbedForm.State<TabId>>;
  viewerUser: User;
  // Proponent Tab
  proponentType: Immutable<RadioGroup.State<ProponentType>>;
  // Individual
  legalName: Immutable<ShortText.State>;
  email: Immutable<ShortText.State>;
  phone: Immutable<ShortText.State>;
  street1: Immutable<ShortText.State>;
  street2: Immutable<ShortText.State>;
  city: Immutable<ShortText.State>;
  region: Immutable<ShortText.State>;
  mailCode: Immutable<ShortText.State>;
  country: Immutable<ShortText.State>;
  // Organziation
  organization: Immutable<Select.State>;
  // Proposal Tab
  showEvaluationCriteria: boolean;
  proposalText: Immutable<RichMarkdownEditor.State>;
  additionalComments: Immutable<RichMarkdownEditor.State>;
  existingProposalForOrganizationError: Id | null;
  // Attachments tab
  attachments: Immutable<Attachments.State>;
}

export type Msg =
  | ADT<"tabbedForm", TabbedForm.Msg<TabId>>
  // Proponent Tab
  | ADT<"proponentType", RadioGroup.Msg<ProponentType>>
  // Individual Proponent
  | ADT<"legalName", ShortText.Msg>
  | ADT<"email", ShortText.Msg>
  | ADT<"phone", ShortText.Msg>
  | ADT<"street1", ShortText.Msg>
  | ADT<"street2", ShortText.Msg>
  | ADT<"city", ShortText.Msg>
  | ADT<"region", ShortText.Msg>
  | ADT<"mailCode", ShortText.Msg>
  | ADT<"country", ShortText.Msg>
  // Organization Proponent
  | ADT<"organization", Select.Msg>
  // Proposal Tab
  | ADT<"toggleEvaluationCriteria">
  | ADT<"proposalText", RichMarkdownEditor.Msg>
  | ADT<"additionalComments", RichMarkdownEditor.Msg>
  // Attachments tab
  | ADT<"attachments", Attachments.Msg>;

export interface Params {
  opportunity: CWUOpportunity;
  viewerUser: User;
  canRemoveExistingAttachments: boolean;
  proposal?: CWUProposal;
  activeTab?: TabId;
  affiliations: AffiliationSlim[];
  idPrefix?: string;
}

export function getActiveTab(state: Immutable<State>): TabId {
  return TabbedForm.getActiveTab(state.tabbedForm);
}

const DEFAULT_ACTIVE_TAB: TabId = "Proponent";

function getProponent(
  proposal: CWUProposal | undefined,
  proponentType: CWUProposal["proponent"]["tag"],
  k: string,
  fallback = ""
): string {
  if (proposal && proponentType === proposal.proponent.tag) {
    return getString(proposal.proponent.value, k, fallback);
  }
  return fallback;
}

export const init: component_.base.Init<Params, State, Msg> = ({
  viewerUser,
  canRemoveExistingAttachments,
  opportunity,
  proposal,
  affiliations,
  activeTab = DEFAULT_ACTIVE_TAB,
  idPrefix = ""
}) => {
  const selectedOrganizationOption: Select.Option | null = (() => {
    if (proposal?.proponent.tag !== "organization") {
      return null;
    }
    return {
      value: proposal.proponent.value.id,
      label: proposal.proponent.value.legalName
    };
  })();
  const [tabbedFormState, tabbedFormCmds] = TabbedFormComponent.init({
    tabs: ["Proponent", "Proposal", "Attachments"],
    activeTab
  });

  // When multiple instances of this component are used on the same page,
  // we need to ensure that the IDs are unique for the radio button group.
  // Otherwise, the IDs will clash and the radio buttons will not render correctly.
  const proponentTypeId = idPrefix
    ? `${idPrefix}-cwu-proposal-proponent-type`
    : "cwu-proposal-proponent-type";

  const [proponentTypeState, proponentTypeCmds] = ProponentTypeRadioGroup.init({
    errors: [],
    validate: (v) =>
      v === null ? invalid(["Please select a proponent type."]) : valid(v),
    child: {
      id: proponentTypeId,
      value: proposal?.proponent.tag || null,
      options: [
        { label: "Individual", value: "individual" },
        { label: "Organization", value: "organization" }
      ]
    }
  });
  const [legalNameState, legalNameCmds] = ShortText.init({
    errors: [],
    validate: proposalValidation.validateIndividualProponentLegalName,
    child: {
      type: "text",
      value: getProponent(proposal, "individual", "legalName"),
      id: "cwu-proposal-individual-legalName"
    }
  });
  const [emailState, emailCmds] = ShortText.init({
    errors: [],
    validate: proposalValidation.validateIndividualProponentEmail,
    child: {
      type: "text",
      value: getProponent(proposal, "individual", "email"),
      id: "cwu-proposal-individual-email"
    }
  });
  const [phoneState, phoneCmds] = ShortText.init({
    errors: [],
    validate: proposalValidation.validateIndividualProponentPhone,
    child: {
      type: "text",
      value: getProponent(proposal, "individual", "phone"),
      id: "cwu-proposal-individual-phone"
    }
  });
  const [street1State, street1Cmds] = ShortText.init({
    errors: [],
    validate: proposalValidation.validateIndividualProponentStreet1,
    child: {
      type: "text",
      value: getProponent(proposal, "individual", "street1"),
      id: "cwu-proposal-individual-street1"
    }
  });
  const [street2State, street2Cmds] = ShortText.init({
    errors: [],
    validate: proposalValidation.validateIndividualProponentStreet2,
    child: {
      type: "text",
      value: getProponent(proposal, "individual", "street2"),
      id: "cwu-proposal-individual-street2"
    }
  });
  const [cityState, cityCmds] = ShortText.init({
    errors: [],
    validate: proposalValidation.validateIndividualProponentCity,
    child: {
      type: "text",
      value: getProponent(proposal, "individual", "city"),
      id: "cwu-proposal-individual-city"
    }
  });
  const [regionState, regionCmds] = ShortText.init({
    errors: [],
    validate: proposalValidation.validateIndividualProponentRegion,
    child: {
      type: "text",
      value: getProponent(proposal, "individual", "region"),
      id: "cwu-proposal-individual-region"
    }
  });
  const [mailCodeState, mailCodeCmds] = ShortText.init({
    errors: [],
    validate: proposalValidation.validateIndividualProponentMailCode,
    child: {
      type: "text",
      value: getProponent(proposal, "individual", "mailCode"),
      id: "cwu-proposal-individual-mailCode"
    }
  });
  const [countryState, countryCmds] = ShortText.init({
    errors: [],
    validate: proposalValidation.validateIndividualProponentCountry,
    child: {
      type: "text",
      value: getProponent(proposal, "individual", "country"),
      id: "cwu-proposal-individual-country"
    }
  });
  const [organizationState, organizationCmds] = Select.init({
    errors: [],
    validate: (option) => {
      if (!option) {
        return invalid(["Please select an organization."]);
      }
      return valid(option);
    },
    child: {
      value: selectedOrganizationOption,
      id: "cwu-proposal-organization-id",
      options: adt(
        "options",
        affiliations
          .filter((a) => memberIsOwner(a) || memberIsOrgAdmin(a))
          .sort((a, b) =>
            compareStrings(a.organization.legalName, b.organization.legalName)
          )
          .map((a) => ({
            value: a.organization.id,
            label: a.organization.legalName
          }))
      )
    }
  });
  const [proposalTextState, proposalTextCmds] = RichMarkdownEditor.init({
    errors: [],
    validate: proposalValidation.validateProposalText,
    child: {
      value: proposal?.proposalText || "",
      id: "cwu-proposal-proposalText"
    }
  });
  const [additionalCommentsState, additionalCommentsCmds] =
    RichMarkdownEditor.init({
      errors: [],
      validate: proposalValidation.validateAdditionalComments,
      child: {
        value: proposal?.additionalComments || "",
        id: "cwu-proposal-additional-comments"
      }
    });
  const [attachmentsState, attachmentsCmds] = Attachments.init({
    canRemoveExistingAttachments,
    existingAttachments: proposal?.attachments || [],
    newAttachmentMetadata
  });
  return [
    {
      opportunity,
      viewerUser,
      orgId: "",
      showEvaluationCriteria: true,
      tabbedForm: immutable(tabbedFormState),
      proponentType: immutable(proponentTypeState),
      legalName: immutable(legalNameState),
      email: immutable(emailState),
      phone: immutable(phoneState),
      street1: immutable(street1State),
      street2: immutable(street2State),
      city: immutable(cityState),
      region: immutable(regionState),
      mailCode: immutable(mailCodeState),
      country: immutable(countryState),
      organization: immutable(organizationState),
      proposalText: immutable(proposalTextState),
      additionalComments: immutable(additionalCommentsState),
      attachments: immutable(attachmentsState),
      existingProposalForOrganizationError: null
    },
    [
      ...component_.cmd.mapMany(tabbedFormCmds, (msg) =>
        adt("tabbedForm", msg)
      ),
      ...component_.cmd.mapMany(proponentTypeCmds, (msg) =>
        adt("proponentType", msg)
      ),
      ...component_.cmd.mapMany(legalNameCmds, (msg) => adt("legalName", msg)),
      ...component_.cmd.mapMany(emailCmds, (msg) => adt("email", msg)),
      ...component_.cmd.mapMany(phoneCmds, (msg) => adt("phone", msg)),
      ...component_.cmd.mapMany(street1Cmds, (msg) => adt("street1", msg)),
      ...component_.cmd.mapMany(street2Cmds, (msg) => adt("street2", msg)),
      ...component_.cmd.mapMany(cityCmds, (msg) => adt("city", msg)),
      ...component_.cmd.mapMany(regionCmds, (msg) => adt("region", msg)),
      ...component_.cmd.mapMany(mailCodeCmds, (msg) => adt("mailCode", msg)),
      ...component_.cmd.mapMany(countryCmds, (msg) => adt("country", msg)),
      ...component_.cmd.mapMany(organizationCmds, (msg) =>
        adt("organization", msg)
      ),
      ...component_.cmd.mapMany(proposalTextCmds, (msg) =>
        adt("proposalText", msg)
      ),
      ...component_.cmd.mapMany(additionalCommentsCmds, (msg) =>
        adt("additionalComments", msg)
      ),
      ...component_.cmd.mapMany(attachmentsCmds, (msg) =>
        adt("attachments", msg)
      )
    ] as component_.Cmd<Msg>[]
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "tabbedForm":
      return component_.base.updateChild({
        state,
        childStatePath: ["tabbedForm"],
        childUpdate: TabbedFormComponent.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("tabbedForm", value)
      });

    case "proponentType":
      return component_.base.updateChild({
        state,
        childStatePath: ["proponentType"],
        childUpdate: ProponentTypeRadioGroup.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("proponentType", value)
      });

    case "legalName":
      return component_.base.updateChild({
        state,
        childStatePath: ["legalName"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("legalName", value)
      });

    case "email":
      return component_.base.updateChild({
        state,
        childStatePath: ["email"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("email", value)
      });

    case "phone":
      return component_.base.updateChild({
        state,
        childStatePath: ["phone"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("phone", value)
      });

    case "street1":
      return component_.base.updateChild({
        state,
        childStatePath: ["street1"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("street1", value)
      });

    case "street2":
      return component_.base.updateChild({
        state,
        childStatePath: ["street2"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("street2", value)
      });

    case "city":
      return component_.base.updateChild({
        state,
        childStatePath: ["city"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("city", value)
      });

    case "region":
      return component_.base.updateChild({
        state,
        childStatePath: ["region"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("region", value)
      });

    case "mailCode":
      return component_.base.updateChild({
        state,
        childStatePath: ["mailCode"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("mailCode", value)
      });

    case "country":
      return component_.base.updateChild({
        state,
        childStatePath: ["country"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("country", value)
      });

    case "organization":
      return component_.base.updateChild({
        state,
        childStatePath: ["organization"],
        childUpdate: Select.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("organization", value)
      });

    case "toggleEvaluationCriteria":
      return [state.update("showEvaluationCriteria", (v) => !v), []];

    case "proposalText":
      return component_.base.updateChild({
        state,
        childStatePath: ["proposalText"],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("proposalText", value)
      });

    case "additionalComments":
      return component_.base.updateChild({
        state,
        childStatePath: ["additionalComments"],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("additionalComments", value)
      });

    case "attachments":
      return component_.base.updateChild({
        state,
        childStatePath: ["attachments"],
        childUpdate: Attachments.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("attachments", value)
      });
  }
};

function proponentFor(
  proponentType: ProponentType,
  state: State
): CreateProponentRequestBody {
  switch (proponentType) {
    case "individual":
      return adt("individual", {
        legalName: FormField.getValue(state.legalName),
        email: FormField.getValue(state.email),
        phone: FormField.getValue(state.phone),
        street1: FormField.getValue(state.street1),
        street2: FormField.getValue(state.street2),
        city: FormField.getValue(state.city),
        region: FormField.getValue(state.region),
        mailCode: FormField.getValue(state.mailCode),
        country: FormField.getValue(state.country)
      });
    case "organization": {
      const fieldValue = FormField.getValue(state.organization);
      const orgId = fieldValue ? fieldValue.value : "";
      if (orgId) {
        return adt("organization", orgId);
      } else {
        return createBlankIndividualProponent();
      }
    }
  }
}

type Values = Omit<CreateRequestBody, "opportunity" | "status">;

function getValues(state: State): Values {
  const proponentType = FormField.getValue(state.proponentType);
  const proponent = proponentType
    ? proponentFor(proponentType, state)
    : createBlankIndividualProponent();
  return {
    proponent,
    proposalText: FormField.getValue(state.proposalText),
    additionalComments: FormField.getValue(state.additionalComments),
    attachments: state.attachments.existingAttachments.map(({ id }) => id)
  };
}

export function isProponentTabValid(state: State): boolean {
  const proponentType = FormField.getValue(state.proponentType);
  if (!proponentType) {
    return false;
  }
  switch (proponentType) {
    case "individual":
      return (
        FormField.isValid(state.legalName) &&
        FormField.isValid(state.email) &&
        FormField.isValid(state.phone) &&
        FormField.isValid(state.street1) &&
        FormField.isValid(state.street2) &&
        FormField.isValid(state.city) &&
        FormField.isValid(state.region) &&
        FormField.isValid(state.mailCode) &&
        FormField.isValid(state.country)
      );
    case "organization":
      return FormField.isValid(state.organization);
  }
}

export function isProposalTabValid(state: State): boolean {
  return (
    FormField.isValid(state.proposalText) &&
    FormField.isValid(state.additionalComments)
  );
}

export function isAttachmentsTabValid(state: State): boolean {
  return Attachments.isValid(state.attachments);
}

export function isValid(state: State): boolean {
  return (
    isProponentTabValid(state) &&
    isProposalTabValid(state) &&
    isAttachmentsTabValid(state)
  );
}

interface Errors extends CreateValidationErrors, UpdateEditValidationErrors {
  proponentType?: string[];
}

function setErrors(state: Immutable<State>, errors?: Errors): Immutable<State> {
  const individualProponentErrors =
    errors && errors.proponent && errors.proponent.tag === "individual"
      ? errors.proponent.value
      : {};
  const organizationErrors =
    errors?.proponent?.tag === "organization"
      ? errors.proponent.value
      : errors?.existingOrganizationProposal
      ? errors.existingOrganizationProposal.errors
      : [];
  return state
    .update("proposalText", (s) =>
      FormField.setErrors(s, errors?.proposalText || [])
    )
    .update("additionalComments", (s) =>
      FormField.setErrors(s, errors?.additionalComments || [])
    )
    .update("proponentType", (s) =>
      FormField.setErrors(s, errors?.proponentType || [])
    )
    .update("legalName", (s) =>
      FormField.setErrors(s, individualProponentErrors.legalName || [])
    )
    .update("email", (s) =>
      FormField.setErrors(s, individualProponentErrors.email || [])
    )
    .update("phone", (s) =>
      FormField.setErrors(s, individualProponentErrors.phone || [])
    )
    .update("street1", (s) =>
      FormField.setErrors(s, individualProponentErrors.street1 || [])
    )
    .update("street2", (s) =>
      FormField.setErrors(s, individualProponentErrors.street2 || [])
    )
    .update("city", (s) =>
      FormField.setErrors(s, individualProponentErrors.city || [])
    )
    .update("region", (s) =>
      FormField.setErrors(s, individualProponentErrors.region || [])
    )
    .update("mailCode", (s) =>
      FormField.setErrors(s, individualProponentErrors.mailCode || [])
    )
    .update("country", (s) =>
      FormField.setErrors(s, individualProponentErrors.country || [])
    )
    .update("organization", (s) => FormField.setErrors(s, organizationErrors))
    .set(
      "existingProposalForOrganizationError",
      errors?.existingOrganizationProposal
        ? errors.existingOrganizationProposal.proposalId
        : null
    );
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state
    .update("proposalText", (s) => FormField.validate(s))
    .update("additionalComments", (s) => FormField.validate(s))
    .update("proponentType", (s) => FormField.validate(s))
    .update("legalName", (s) => FormField.validate(s))
    .update("email", (s) => FormField.validate(s))
    .update("phone", (s) => FormField.validate(s))
    .update("street1", (s) => FormField.validate(s))
    .update("street2", (s) => FormField.validate(s))
    .update("city", (s) => FormField.validate(s))
    .update("region", (s) => FormField.validate(s))
    .update("mailCode", (s) => FormField.validate(s))
    .update("country", (s) => FormField.validate(s))
    .update("organization", (s) => FormField.validate(s))
    .update("attachments", (s) => Attachments.validate(s));
}

type PersistAction = ADT<"create", CreateCWUProposalStatus> | ADT<"update", Id>;

export type PersistResult = Validation<
  [Immutable<State>, component_.Cmd<Msg>[], CWUProposal],
  Immutable<State>
>;

export function persist(
  state: Immutable<State>,
  action: PersistAction
): component_.Cmd<PersistResult> {
  const values = getValues(state);
  // Get new attachments to be uploaded.
  const newAttachments = Attachments.getNewAttachments(state.attachments);
  const existingAttachments = state.attachments.existingAttachments.map(
    ({ id }) => id
  );
  // Cmd helpers
  const uploadNewAttachmentsCmd = api.files.createMany<
    Validation<Id[], Immutable<State>>
  >()(newAttachments, (response) => {
    switch (response.tag) {
      case "valid":
        return valid([
          ...existingAttachments,
          ...response.value.map(({ id }) => id)
        ]);
      case "invalid":
        return invalid(
          state.update("attachments", (attachments) =>
            Attachments.setNewAttachmentErrors(attachments, response.value)
          )
        );
      case "unhandled":
        return invalid(state);
    }
  });
  const actionCmd = (
    attachments: Id[]
  ): component_.cmd.Cmd<
    api.ResponseValidation<
      CWUProposal,
      UpdateEditValidationErrors | CreateValidationErrors
    >
  > => {
    switch (action.tag) {
      case "create":
        return api.proposals.cwu.create<
          api.ResponseValidation<CWUProposal, CreateValidationErrors>
        >()(
          {
            ...values,
            opportunity: state.opportunity.id,
            attachments,
            status: action.value
          },
          (response) => response
        );
      case "update":
        return api.proposals.cwu.update<
          api.ResponseValidation<CWUProposal, UpdateEditValidationErrors>
        >()(
          action.value,
          adt("edit" as const, {
            ...values,
            attachments
          }),
          (
            response: api.ResponseValidation<
              CWUProposal,
              UpdateValidationErrors
            >
          ) => {
            return api.mapInvalid(response, (errors) => {
              if (errors.proposal && errors.proposal.tag === "edit") {
                return errors.proposal.value;
              } else {
                return {};
              }
            });
          }
        );
    }
  };
  // Upload new attachments if necessary.
  const attachmentsCmd: component_.cmd.Cmd<Validation<Id[], Immutable<State>>> =
    newAttachments.length
      ? uploadNewAttachmentsCmd
      : component_.cmd.dispatch(valid(existingAttachments));
  return component_.cmd.andThen(attachmentsCmd, (attachmentsResult) => {
    if (isValid_(attachmentsResult)) {
      return component_.cmd.map(
        actionCmd(attachmentsResult.value),
        (actionResult) => {
          switch (actionResult.tag) {
            case "unhandled":
              return invalid(state);
            case "invalid":
              return invalid(setErrors(state, actionResult.value));
            case "valid": {
              state = setErrors(state, {});
              // Update the attachments component accordingly.
              const [newAttachmentsState, newAttachmentsCmds] =
                Attachments.init({
                  existingAttachments: actionResult.value.attachments || [],
                  newAttachmentMetadata
                });
              state = state.set("attachments", immutable(newAttachmentsState));
              return valid([
                state,
                component_.cmd.mapMany(
                  newAttachmentsCmds,
                  (msg) => adt("attachments", msg) as Msg
                ),
                actionResult.value
              ]);
            }
          }
        }
      );
    } else {
      return component_.cmd.dispatch(invalid(attachmentsResult.value));
    }
  });
}

export const IndividualProponent: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
      <Col xs="12">
        <ShortText.view
          disabled={disabled}
          placeholder="Legal Name"
          help="Provide the first and last name of the individual that will complete the work as outlined in the opportunity’s acceptance criteria."
          required
          extraChildProps={{}}
          label="Legal Name"
          state={state.legalName}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("legalName" as const, value)
          )}
        />
      </Col>

      <Col xs="12">
        <ShortText.view
          disabled={disabled}
          placeholder="vendor@email.com"
          required
          extraChildProps={{}}
          label="Email Address"
          state={state.email}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("email" as const, value)
          )}
        />
      </Col>

      <Col xs="12">
        <ShortText.view
          disabled={disabled}
          placeholder="Phone Number"
          extraChildProps={{}}
          label="Phone Number"
          state={state.phone}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("phone" as const, value)
          )}
        />
      </Col>

      <Col xs="12">
        <ShortText.view
          disabled={disabled}
          placeholder="Street Address"
          required
          extraChildProps={{}}
          label="Street Address"
          state={state.street1}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("street1" as const, value)
          )}
        />
      </Col>

      <Col xs="12">
        <ShortText.view
          disabled={disabled}
          placeholder="Street Address"
          extraChildProps={{}}
          label="Street Address"
          state={state.street2}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("street2" as const, value)
          )}
        />
      </Col>

      <Col md="7" xs="12">
        <ShortText.view
          disabled={disabled}
          placeholder="City"
          required
          extraChildProps={{}}
          label="City"
          state={state.city}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("city" as const, value)
          )}
        />
      </Col>

      <Col md="5" xs="12">
        <ShortText.view
          disabled={disabled}
          placeholder="Province / State"
          required
          extraChildProps={{}}
          label="Province / State"
          state={state.region}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("region" as const, value)
          )}
        />
      </Col>

      <Col md="5" xs="12">
        <ShortText.view
          disabled={disabled}
          placeholder="Postal / ZIP Code"
          required
          extraChildProps={{}}
          label="Postal / ZIP Code"
          state={state.mailCode}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("mailCode" as const, value)
          )}
        />
      </Col>

      <Col md="7" xs="12">
        <ShortText.view
          disabled={disabled}
          placeholder="Country"
          required
          extraChildProps={{}}
          label="Country"
          state={state.country}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("country" as const, value)
          )}
        />
      </Col>
    </Row>
  );
};

export const OrganizationProponent: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
      <Col xs="12">
        <Select.view
          disabled={disabled}
          extraChildProps={{}}
          label="Organization"
          placeholder="Organization"
          help={`Select the Organization that will complete the work as outlined in the opportunity's acceptance criteria.`}
          hint={
            isVendor(state.viewerUser) ? (
              <span>
                If the organization you are looking for is not listed in this
                dropdown, please ensure that you have created the organization
                in{" "}
                <Link
                  newTab
                  dest={routeDest(
                    adt("userProfile", {
                      userId: state.viewerUser.id,
                      tab: "organizations" as const
                    })
                  )}>
                  your user profile
                </Link>
                . Also, please make sure that you have saved this proposal
                beforehand to avoid losing any unsaved changes you might have
                made.
              </span>
            ) : undefined
          }
          required
          state={state.organization}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("organization" as const, value)
          )}
        />
      </Col>
    </Row>
  );
};

export const ProponentView: component_.base.View<Props> = (props) => {
  const { state, dispatch, disabled } = props;

  const proponentType = FormField.getValue(state.proponentType);
  const activeView = (() => {
    switch (proponentType) {
      case "individual":
        return <IndividualProponent {...props} />;
      case "organization":
        return <OrganizationProponent {...props} />;
      default:
        return null;
    }
  })();

  return (
    <div>
      <Row>
        <Col xs="12">
          <p className="mb-4">
            Will you be submitting a proposal for this opportunity as an
            Individual or Organization?
          </p>
        </Col>
        <Col xs="12">
          <ProponentTypeRadioGroup.view
            extraChildProps={{ inline: true }}
            className="mb-0"
            required
            disabled={disabled}
            state={state.proponentType}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("proponentType" as const, value)
            )}
          />
        </Col>
      </Row>

      {activeView ? (
        <div className="mt-5 pt-5 border-top">
          <Row>
            <Col xs="12">
              <p className="mb-4">
                Please provide the following details for the proponent that will
                complete the work as outlined by the Acceptance Criteria of the
                opportunity.
              </p>
            </Col>
          </Row>
          {activeView}
        </div>
      ) : null}
    </div>
  );
};

export const ProposalView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
      <Col xs="12">
        <p className="mb-4">
          Enter your proposal and any additional comments in the spaces provided
          below. Be sure to address the Proposal Evaluation Criteria.
        </p>
      </Col>
      <Col xs="12">
        <Alert color="primary" fade={false} className="mb-4">
          <Link
            color="inherit"
            className="fw-bold d-flex justify-content-between flex-nowrap align-items-center w-100"
            onClick={() => dispatch(adt("toggleEvaluationCriteria"))}>
            Proposal Evaluation Criteria
            <Icon
              name={
                state.showEvaluationCriteria ? "chevron-up" : "chevron-down"
              }
              className="o-75"
            />
          </Link>
          {state.showEvaluationCriteria ? (
            <Markdown
              source={state.opportunity.evaluationCriteria}
              className="mt-3"
              openLinksInNewTabs
            />
          ) : null}
        </Alert>
      </Col>
      <Col xs="12">
        <RichMarkdownEditor.view
          disabled={disabled}
          required
          extraChildProps={{
            style: { height: "60vh", minHeight: "400px" }
          }}
          label="Proposal"
          help="Provide your complete proposal here. Be sure to address the Proposal Evaluation Criteria as outlined on the opportunity. You can format your proposal with Markdown."
          state={state.proposalText}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("proposalText" as const, value)
          )}
        />
      </Col>
      <Col xs="12">
        <RichMarkdownEditor.view
          disabled={disabled}
          extraChildProps={{
            style: { height: "300px" }
          }}
          label="Additional Comments"
          help="Provide any additional information or comments that are relevant to your proposal submission. You can format your additional comments with Markdown."
          state={state.additionalComments}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("additionalComments" as const, value)
          )}
        />
      </Col>
    </Row>
  );
};

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

// @duplicated-attachments-view
export const AttachmentsView: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  return (
    <Row>
      <Col xs="12">
        <p>
          Upload any supporting material for your proposal here. Attachments
          must be smaller than 10MB.
        </p>
        <Attachments.view
          dispatch={component_.base.mapDispatch(dispatch, (msg) =>
            adt("attachments" as const, msg)
          )}
          state={state.attachments}
          disabled={disabled}
          className="mt-4"
        />
      </Col>
    </Row>
  );
};

export const view: component_.base.View<Props> = (props) => {
  const { state, dispatch } = props;
  const activeTab = (() => {
    switch (TabbedForm.getActiveTab(state.tabbedForm)) {
      case "Proponent":
        return <ProponentView {...props} />;
      case "Proposal":
        return <ProposalView {...props} />;
      case "Attachments":
        return <AttachmentsView {...props} />;
    }
  })();
  return (
    <TabbedFormComponent.view
      valid={isValid(state)}
      disabled={props.disabled}
      getTabLabel={(a) => a}
      isTabValid={(tab) => {
        switch (tab) {
          case "Proponent":
            return isProponentTabValid(state);
          case "Proposal":
            return isProposalTabValid(state);
          case "Attachments":
            return isAttachmentsTabValid(state);
        }
      }}
      state={state.tabbedForm}
      dispatch={component_.base.mapDispatch(dispatch, (msg) =>
        adt("tabbedForm" as const, msg)
      )}>
      {activeTab}
    </TabbedFormComponent.view>
  );
};

export function getAlerts<Msg>(
  state: Immutable<State>
): component_.page.Alerts<Msg> {
  return {
    errors: (() => {
      if (state.existingProposalForOrganizationError) {
        return [
          {
            text: (
              <span>
                The selected organization already has a proposal with this
                opportunity. You may access it{" "}
                <Link
                  dest={routeDest(
                    adt("proposalCWUEdit", {
                      proposalId: state.existingProposalForOrganizationError,
                      opportunityId: state.opportunity.id
                    })
                  )}>
                  here
                </Link>
                .
              </span>
            )
          }
        ];
      }
      return [];
    })()
  };
}
