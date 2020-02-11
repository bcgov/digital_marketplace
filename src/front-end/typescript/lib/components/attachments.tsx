import { ComponentViewProps, Immutable, Init, Update, View } from 'front-end/lib/framework';
import { CreateFileRequestBody } from 'front-end/lib/http/api';
import FileLink from 'front-end/lib/views/file-link';
import Icon from 'front-end/lib/views/icon';
import Link, { externalDest, iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { FormText } from 'reactstrap';
import { CreateValidationErrors, enforceExtension, fileBlobPath, FileRecord, FileUploadMetadata, getExtension } from 'shared/lib/resources/file';
import { adt, ADT } from 'shared/lib/types';

interface NewAttachment extends CreateFileRequestBody {
  newName: string;
  errors: string[];
  url: string;
}

export interface State {
  existingAttachments: FileRecord[];
  newAttachments: NewAttachment[];
  newAttachmentMetadata: FileUploadMetadata;
}

export type Msg
  = ADT<'addAttachment', File>
  | ADT<'removeExistingAttachment', number>
  | ADT<'removeNewAttachment', number>
  | ADT<'onChangeNewAttachmentName', [number, string]>;

export type Params = Pick<State, 'existingAttachments' | 'newAttachmentMetadata'>;

export function isValid(state: Immutable<State>): boolean {
  return state.newAttachments.reduce((valid, attachment) => valid && !attachment.errors.length, true as boolean);
}

export function setNewAttachmentErrors(state: Immutable<State>, errors: CreateValidationErrors[]): Immutable<State> {
  return state.update('newAttachments', attachments => attachments.map((a, i) => ({ ...a, errors: errors[i].name || [] })));
}

export function getNewAttachments(state: Immutable<State>): CreateFileRequestBody[] {
  return state.newAttachments.map(a => ({
    name: a.newName ? enforceExtension(a.newName, getExtension(a.name)) : a.name,
    file: a.file,
    metadata: a.metadata
  }));
}

export const init: Init<Params, State> = async params => {
  return {
    ...params,
    newAttachments: []
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'addAttachment':
      return [state.update('newAttachments', attachments => [
        ...attachments,
        {
          name: msg.value.name,
          file: msg.value,
          url: URL.createObjectURL(msg.value),
          metadata: state.newAttachmentMetadata,
          newName: '',
          errors: []
        }
      ])];
    case 'removeExistingAttachment':
      return [state.update('existingAttachments', attachments => attachments.filter((a, i) => i !== msg.value))];
    case 'removeNewAttachment':
      return [state.update('newAttachments', attachments => attachments.filter((a, i) => i !== msg.value))];
    case 'onChangeNewAttachmentName':
      return [state.update('newAttachments', attachments => attachments.map((a, i) => {
        if (i === msg.value[0]) {
          return { ...a, newName: msg.value[1] };
        } else {
          return a;
        }
      }))];
  }
};

interface FileFieldProps {
  defaultName: string;
  value: string;
  disabled?: boolean;
  url: string;
  errors?: string[];
  onChange?(value: string): void;
  onRemove(): void;
}

const FileField: View<FileFieldProps> = props => {
  const { defaultName, value, disabled, url, onChange, onRemove, errors = [] } = props;
  return (
    <div className='d-flex flex-nowrap align-items-center form-group'>
      <input
        type='text'
        placeholder={defaultName}
        value={value}
        disabled={disabled}
        className='form-control'
        onChange={onChange && (e => onChange(e.currentTarget.value))} />
      <Link color='info' download dest={externalDest(url)} className='ml-3'>
        <Icon name='download' />
      </Link>
      {disabled
        ? null
        : (<Icon name='trash' color='info' hover onClick={onRemove} className='ml-3' />)}
      {errors.length
        ? (<FormText color='danger'>
            {errors.map((error, i) => (<div key={`form-field-conditional-errors-${i}`}>{error}</div>))}
          </FormText>)
        : null}
    </div>
  );
};

interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
  className?: string;
  addButtonClassName?: string;
}

const AddButton: View<Props> = ({ addButtonClassName = '', dispatch, disabled }) => {
  return (
    <FileLink
      button
      outline
      size='sm'
      color='primary'
      className={`mb-5 ${addButtonClassName}`}
      symbol_={leftPlacement(iconLinkSymbol('paperclip'))}
      disabled={disabled}
      onChange={file => dispatch(adt('addAttachment', file))}
    >
      Add Attachment
    </FileLink>
  );
};

export const view: View<Props> = props => {
  const { className, state, dispatch, disabled } = props;
  return (
    <div className={className}>
      <AddButton {...props} />
      {state.existingAttachments.map((file, i) => (
        <FileField
          key={`attachments-existing-${i}`}
          defaultName={file.name}
          value={file.name}
          disabled
          url={fileBlobPath(file)}
          onRemove={() => dispatch(adt('removeExistingAttachment', i))}
        />
      ))}
      {state.newAttachments.map((file, i) => (
        <FileField
          key={`attachments-new-${i}`}
          defaultName={file.name}
          value={file.newName}
          disabled={disabled}
          url={file.url}
          errors={file.errors}
          onChange={value => dispatch(adt('onChangeNewAttachmentName', [i, value] as [number, string]))}
          onRemove={() => dispatch(adt('removeNewAttachment', i))}
        />
      ))}
    </div>);
};
