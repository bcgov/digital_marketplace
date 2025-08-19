import { fileBlobPath } from "front-end/lib";
import { component as component_, Immutable } from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import FileLink from "front-end/lib/views/file-link";
import Icon from "front-end/lib/views/icon";
import Link, {
  externalDest,
  iconLinkSymbol,
  leftPlacement
} from "front-end/lib/views/link";
import React from "react";
import { FormText } from "reactstrap";
import {
  CreateValidationErrors,
  enforceExtension,
  FileRecord,
  FileUploadMetadata,
  getExtension
} from "shared/lib/resources/file";
import { adt, ADT } from "shared/lib/types";
import {
  getInvalidValue,
  mapValid,
  optional,
  Validation
} from "shared/lib/validation";
import { validateFileName } from "shared/lib/validation/file";

interface NewAttachment extends api.files.CreateFileRequestBody {
  newName: string;
  errors: string[];
  url: string;
}

function validateNewName(name?: string): Validation<string> {
  return mapValid(optional(name, validateFileName), (v) => v || "");
}

export interface State {
  canRemoveExistingAttachments?: boolean;
  existingAttachments: FileRecord[];
  newAttachments: NewAttachment[];
  newAttachmentMetadata: FileUploadMetadata;
}

export type Msg =
  | ADT<"addAttachment", File>
  | ADT<"removeExistingAttachment", number>
  | ADT<"removeNewAttachment", number>
  | ADT<"onChangeNewAttachmentName", [number, string]>;

export type Params = Pick<
  State,
  | "canRemoveExistingAttachments"
  | "existingAttachments"
  | "newAttachmentMetadata"
>;

export function validate(state: Immutable<State>): Immutable<State> {
  return state.newAttachments.reduce((acc, a, i) => {
    return acc.updateIn(["newAttachments", i], (value) => {
      const newAttachment = value as NewAttachment;
      const errors = getInvalidValue(
        validateNewName(newAttachment.newName),
        []
      );
      return {
        ...newAttachment,
        errors
      };
    });
  }, state);
}

export function isValid(state: Immutable<State>): boolean {
  return state.newAttachments.reduce(
    (valid, attachment) => valid && !attachment.errors.length,
    true as boolean
  );
}

export function setNewAttachmentErrors(
  state: Immutable<State>,
  errors: CreateValidationErrors[]
): Immutable<State> {
  return state.update("newAttachments", (attachments) =>
    attachments.map((a, i) => ({ ...a, errors: errors[i].name || [] }))
  );
}

export function getNewAttachments(
  state: Immutable<State>
): api.files.CreateFileRequestBody[] {
  return state.newAttachments.map((a) => ({
    name: a.newName
      ? enforceExtension(a.newName, getExtension(a.name))
      : a.name,
    file: a.file,
    metadata: a.metadata
  }));
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  return [
    {
      ...params,
      newAttachments: []
    },
    []
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "addAttachment":
      return [
        state.update("newAttachments", (attachments) => [
          ...attachments,
          {
            name: msg.value.name,
            file: msg.value,
            url: URL.createObjectURL(msg.value),
            metadata: state.newAttachmentMetadata,
            newName: "",
            errors: []
          }
        ]),
        []
      ];
    case "removeExistingAttachment":
      return [
        state.update("existingAttachments", (attachments) =>
          attachments.filter((a, i) => i !== msg.value)
        ),
        []
      ];
    case "removeNewAttachment":
      return [
        state.update("newAttachments", (attachments) =>
          attachments.filter((a, i) => i !== msg.value)
        ),
        []
      ];
    case "onChangeNewAttachmentName":
      return [
        state.update("newAttachments", (attachments) =>
          attachments.map((a, i) => {
            if (i === msg.value[0]) {
              const errors = getInvalidValue(validateNewName(msg.value[1]), []);
              return {
                ...a,
                errors,
                newName: msg.value[1]
              };
            } else {
              return a;
            }
          })
        ),
        []
      ];
  }
};

interface FileFieldProps {
  defaultName: string;
  value: string;
  editable: boolean;
  disabled?: boolean;
  url: string;
  errors?: string[];
  onChange?(value: string): void;
  onRemove(): void;
}

const FileField: component_.base.View<FileFieldProps> = (props) => {
  const {
    defaultName,
    value,
    disabled,
    editable,
    url,
    onChange,
    onRemove,
    errors = []
  } = props;
  return (
    <div className="mb-3">
      <div className="d-flex flex-nowrap align-items-center">
        <input
          type="text"
          placeholder={defaultName}
          value={value}
          disabled={disabled || !editable}
          className={`form-control ${errors.length ? "is-invalid" : ""}`}
          onChange={onChange && ((e) => onChange(e.currentTarget.value))}
        />
        {disabled ? null : (
          <Icon
            name="trash"
            color="info"
            hover
            onClick={onRemove}
            className="ms-3"
          />
        )}
        <Link color="info" download dest={externalDest(url)} className="ms-3">
          <Icon name="download" />
        </Link>
      </div>
      {errors.length ? (
        <FormText color="danger">
          {errors.map((error, i) => (
            <div key={`form-field-conditional-errors-${i}`}>{error}</div>
          ))}
        </FormText>
      ) : null}
    </div>
  );
};

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
  className?: string;
  addButtonClassName?: string;
  accept?: readonly string[];
}

const AddButton: component_.base.View<Props> = ({
  addButtonClassName = "",
  state,
  dispatch,
  disabled,
  accept
}) => {
  if (disabled) {
    return null;
  }
  const hasAttachments = !!(
    state.existingAttachments.length || state.newAttachments.length
  );
  return (
    <FileLink
      button
      outline
      size="sm"
      color="primary"
      className={`${hasAttachments ? "mb-5" : ""} ${addButtonClassName}`}
      symbol_={leftPlacement(iconLinkSymbol("paperclip"))}
      disabled={disabled}
      onChange={(file) => dispatch(adt("addAttachment", file))}
      accept={accept}>
      Add Attachment
    </FileLink>
  );
};

export const view: component_.base.View<Props> = (props) => {
  const { className, state, dispatch, disabled } = props;
  return (
    <div className={className}>
      <AddButton {...props} />
      {state.existingAttachments.map((file, i) => (
        <FileField
          key={`attachments-existing-${i}`}
          defaultName={file.name}
          value={file.name}
          disabled={disabled || !state.canRemoveExistingAttachments}
          editable={false}
          url={fileBlobPath(file)}
          onRemove={() => dispatch(adt("removeExistingAttachment", i))}
        />
      ))}
      {state.newAttachments.map((file, i) => (
        <FileField
          key={`attachments-new-${i}`}
          defaultName={file.name}
          value={file.newName}
          disabled={disabled}
          editable
          url={file.url}
          errors={file.errors}
          onChange={(value) =>
            dispatch(
              adt("onChangeNewAttachmentName", [i, value] as [number, string])
            )
          }
          onRemove={() => dispatch(adt("removeNewAttachment", i))}
        />
      ))}
    </div>
  );
};

export const AttachmentList: component_.base.View<{ files: FileRecord[] }> = ({
  files
}) => {
  return (
    <div className="d-flex flex-column flex-nowrap align-items-start">
      {files.map((f, i) => (
        <Link
          key={`file-list-${i}`}
          download
          dest={externalDest(fileBlobPath(f))}
          className={`flex-nowrap ${i < files.length - 1 ? "mb-3" : ""}`}>
          <Icon
            name="paperclip"
            className="me-2 flex-shrink-0 align-self-start mt-1"
          />
          {f.name}
        </Link>
      ))}
    </div>
  );
};
