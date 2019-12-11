import { MARKDOWN_HELP_URL } from 'front-end/config';
import { makeStartLoading, makeStopLoading, UpdateState } from 'front-end/lib';
import * as FormField from 'front-end/lib/components/form-field';
import { Immutable, UpdateReturnValue, View, ViewElement } from 'front-end/lib/framework';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import Link from 'front-end/lib/views/link';
import React, { ChangeEvent } from 'react';
import { Spinner } from 'reactstrap';
import { ADT } from 'shared/lib/types';
import { Validation } from 'shared/lib/validation';

export type Value = string;

type UploadFile = (file: File) => Promise<Validation<{ name: string; url: string }>>;

interface ChildState extends FormField.ChildStateBase<Value> {
  loading: number;
  selectionStart: number;
  selectionEnd: number;
  uploadFile: UploadFile;
}

export interface ChildParams extends FormField.ChildParamsBase<Value> {
  uploadFile: UploadFile;
}

type InnerChildMsg
  = ADT<'onChangeTextArea', [string, number, number]> // [value, selectionStart, selectionEnd]
  | ADT<'onChangeSelection', [number, number]> // [selectionStart, selectionEnd]
  | ADT<'controlH1'>
  | ADT<'controlH2'>
  | ADT<'controlH3'>
  | ADT<'controlBold'>
  | ADT<'controlItalics'>
  | ADT<'controlOrderedList'>
  | ADT<'controlUnorderedList'>
  | ADT<'controlImage', File>
  | ADT<'focus'>;

type ExtraChildProps = {};

type ChildComponent = FormField.ChildComponent<Value, ChildParams, ChildState, InnerChildMsg, ExtraChildProps>;

export type State = FormField.State<Value, ChildState>;

export type Params = FormField.Params<Value, ChildParams>;

export type Msg = FormField.Msg<InnerChildMsg>;

const childInit: ChildComponent['init'] = async params => ({
  ...params,
  loading: 0,
  selectionStart: 0,
  selectionEnd: 0
});

const startLoading: UpdateState<ChildState> = makeStartLoading('loading');
const stopLoading: UpdateState<ChildState>  = makeStopLoading('loading');

interface InsertParams {
  separateLine?: boolean;
  text(selectedText: string): string;
}

function insert(state: Immutable<ChildState>, params: InsertParams): UpdateReturnValue<ChildState, FormField.ChildMsg<InnerChildMsg>> {
  const { text, separateLine = false } = params;
  const selectedText = state.value.substring(state.selectionStart, state.selectionEnd);
  const body = text(selectedText);
  let prefix = state.value.substring(0, state.selectionStart);
  if (prefix !== '' && separateLine) {
    prefix = prefix.replace(/\n?\n?$/, '\n\n');
  }
  let suffix = state.value.substring(state.selectionEnd);
  if (suffix !== '' && separateLine) {
    suffix = suffix.replace(/^\n?\n?/, '\n\n');
  }
  state = state
    .set('value', `${prefix}${body}${suffix}`)
    .set('selectionStart', prefix.length)
    .set('selectionEnd', prefix.length + body.length);
  return [
    state,
    async (state, dispatch) => {
      dispatch({ tag: '@validate', value: undefined });
      dispatch({ tag: 'focus', value: undefined });
      return null;
    }
  ];
}

const childUpdate: ChildComponent['update'] = ({ state, msg }) => {
  switch (msg.tag) {
    case 'onChangeTextArea':
      return [state
        .set('value', msg.value[0])
        .set('selectionStart', msg.value[1])
        .set('selectionEnd', msg.value[2])
      ];
    case 'onChangeSelection':
      return [state
        .set('selectionStart', msg.value[0])
        .set('selectionEnd', msg.value[1])
      ];
    case 'controlH1':
      return insert(state, {
        text: selectedText => `# ${selectedText}`,
        separateLine: true
      });
    case 'controlH2':
      return insert(state, {
        text: selectedText => `## ${selectedText}`,
        separateLine: true
      });
    case 'controlH3':
      return insert(state, {
        text: selectedText => `### ${selectedText}`,
        separateLine: true
      });
    case 'controlBold':
      return insert(state, {
        text: selectedText => `**${selectedText}**`
      });
    case 'controlItalics':
      return insert(state, {
        text: selectedText => `*${selectedText}*`
      });
    case 'controlOrderedList':
      return insert(state, {
        text: selectedText => `1. ${selectedText}`,
        separateLine: true
      });
    case 'controlUnorderedList':
      return insert(state, {
        text: selectedText => `- ${selectedText}`,
        separateLine: true
      });
    case 'controlImage':
      return [
        startLoading(state),
        async (state, dispatch) => {
          state = stopLoading(state);
          const uploadResult = await state.uploadFile(msg.value);
          if (uploadResult.tag === 'invalid') { return state; }
          const result = insert(state, {
            text: () => `![${uploadResult.value.name}](${uploadResult.value.url})`
          });
          state = result[0];
          if (result[1]) {
            await result[1](state, dispatch);
          }
          return state;
        }
      ];
    case 'focus':
      return [
        state,
        async () => {
          const el = document.getElementById(state.id);
          if (el) { el.focus(); }
          return null;
        }
      ];
    default:
      return [state];
  }
};

interface ControlIconProps {
  name: AvailableIcons;
  disabled: boolean;
  children?: ViewElement;
  width?: number;
  height?: number;
  className?: string;
  onClick?(): void;
}

const ControlIcon: View<ControlIconProps> = ({ name, disabled, onClick, children, width = 1.25, height = 1.25, className = '' }) => {
  return (
    <Link color='secondary' className={`${className} d-flex justify-content-center align-items-center position-relative`} disabled={disabled} onClick={onClick} style={{ cursor: 'default', lineHeight: 0, pointerEvents: disabled ? 'none' : undefined }}>
      <Icon name={name} width={width} height={height} />
      {children ? children : ''}
    </Link>
  );
};

const ControlSeparator: View<{}> = () => {
  return (<div className='mr-3 border-left h-100'></div>);
};

const Controls: ChildComponent['view'] = ({ state, dispatch, disabled = false }) => {
  const isLoading = state.loading > 0;
  const isDisabled = disabled || isLoading;
  const onSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) { return; }
    const file = event.currentTarget.files && event.currentTarget.files[0];
    if (file) {
      dispatch({ tag: 'controlImage', value: file });
    }
  };
  return (
    <div className='bg-light flex-grow-0 flex-shrink-0 d-flex flex-nowrap align-items-center px-3 py-2 form-control border-0'>
      <ControlIcon
        name='h1'
        disabled={isDisabled}
        className='mr-2'
        onClick={() => dispatch({ tag: 'controlH1', value: undefined })} />
      <ControlIcon
        name='h2'
        disabled={isDisabled}
        className='mr-2'
        onClick={() => dispatch({ tag: 'controlH2', value: undefined })} />
      <ControlIcon
        name='h3'
        disabled={isDisabled}
        className='mr-3'
        onClick={() => dispatch({ tag: 'controlH3', value: undefined })} />
      <ControlSeparator />
      <ControlIcon
        name='bold'
        disabled={isDisabled}
        width={0.9}
        height={0.9}
        className='mr-2'
        onClick={() => dispatch({ tag: 'controlBold', value: undefined })} />
      <ControlIcon
        name='italics'
        width={0.9}
        height={0.9}
        disabled={isDisabled}
        className='mr-3'
        onClick={() => dispatch({ tag: 'controlItalics', value: undefined })} />
      <ControlSeparator />
      <ControlIcon
        name='unordered-list'
        width={1}
        height={1}
        disabled={isDisabled}
        className='mr-2'
        onClick={() => dispatch({ tag: 'controlUnorderedList', value: undefined })} />
      <ControlIcon
        name='ordered-list'
        width={1}
        height={1}
        disabled={isDisabled}
        className='mr-3'
        onClick={() => dispatch({ tag: 'controlOrderedList', value: undefined })} />
      <ControlSeparator />
      <ControlIcon name='image' disabled={isDisabled} width={1.1} height={1.1}>
        <input
          type='file'
          className='position-absolute w-100 h-100'
          style={{ top: '0px', left: '0px', opacity: 0 }}
          value=''
          onChange={onSelectFile} />
      </ControlIcon>
      <div className='ml-auto'>
        <Spinner
          size='xs'
          color='secondary'
          className={`o-50 ${isLoading ? '' : 'd-none'}`} />
        <Link newTab href={MARKDOWN_HELP_URL} color='primary' className='d-flex justify-content-center align-items-center ml-2' style={{ lineHeight: 0 }}>
          <Icon name='markdown' />
        </Link>
      </div>
    </div>
  );
};

const ChildView: ChildComponent['view'] = props => {
  const { state, dispatch, className = '', validityClassName, disabled = false } = props;
  const isLoading = state.loading > 0;
  const isDisabled = disabled || isLoading;
  const onChangeSelection = (target: EventTarget & HTMLTextAreaElement) => {
    if (isDisabled) { return; }
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== state.selectionStart || end !== state.selectionEnd) {
      dispatch({ tag: 'onChangeSelection', value: [start, end] });
    }
  };
  return (
    <div className={`form-control ${className} ${validityClassName} p-0 d-flex flex-column flex-nowrap align-items-stretch`}>
      <Controls {...props} />
      <textarea
        id={state.id}
        value={state.value}
        disabled={isDisabled}
        className={`${validityClassName} form-control flex-grow-1 border-left-0 border-right-0 border-bottom-0`}
        style={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0
        }}
        ref={ref => {
          const start = state.selectionStart;
          const end = state.selectionEnd;
          if (ref) {
            if (ref.selectionStart !== start) { ref.selectionStart = start; }
            if (ref.selectionEnd !== end) { ref.selectionEnd = end; }
          }
        }}
        onChange={e => {
          const value = e.currentTarget.value;
          dispatch({ tag: 'onChangeTextArea', value: [
            value,
            e.currentTarget.selectionStart,
            e.currentTarget.selectionEnd
          ]});
          // Let the parent form field component know that the value has been updated.
          props.onChange(value);
        }}
        onSelect={e => onChangeSelection(e.currentTarget)}>
      </textarea>
    </div>
  );
};

export const component = FormField.makeComponent<Value, ChildParams, ChildState, InnerChildMsg, ExtraChildProps>({
  init: childInit,
  update: childUpdate,
  view: ChildView
});

export const init = component.init;

export const update = component.update;

export const view = component.view;

export default component;
