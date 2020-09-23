import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import * as FormField from 'front-end/lib/components/form-field';
import * as RichMarkdownEditor from 'front-end/lib/components/form-field/rich-markdown-editor';
import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, PageGetContextualActions, Update, updateComponentChild, View } from 'front-end/lib/framework';
import { makeUploadMarkdownImage } from 'front-end/lib/http/api';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import Markdown from 'front-end/lib/views/markdown';
import React from 'react';
import { formatDateAndTime } from 'shared/lib';
import { Addendum } from 'shared/lib/resources/opportunity/code-with-us';
import { adt, ADT } from 'shared/lib/types';
import { validateAddendumText } from 'shared/lib/validation/addendum';

interface ExistingAddendum extends Addendum {
  field: Immutable<RichMarkdownEditor.State>;
}

export interface State {
  isEditing: boolean;
  publishLoading: number;
  disabled: boolean;
  newAddendum: Immutable<RichMarkdownEditor.State> | null;
  existingAddenda: ExistingAddendum[];
}

export type Msg
  = ADT<'add'>
  | ADT<'cancel'>
  | ADT<'publish'>
  | ADT<'onChangeExisting', [number, RichMarkdownEditor.Msg]>
  | ADT<'onChangeNew', RichMarkdownEditor.Msg>;

export interface NewAddendumParam {
  errors: string[];
  value: string;
}

export interface Params {
  disabled: boolean;
  existingAddenda: Addendum[];
  newAddendum?: {
    errors: string[];
    value: string;
  };
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state.update('newAddendum', s => s ? FormField.validate(s) : s);
}

export function isValid(state: Immutable<State>): boolean {
  return state.newAddendum ? FormField.isValid(state.newAddendum) : true;
}

export function getNewAddendum(state: Immutable<State>): string | null {
  return state.newAddendum ? FormField.getValue(state.newAddendum) : null;
}

async function initAddendumField(id: string, value = '', errors: string[] = []): Promise<Immutable<RichMarkdownEditor.State>> {
  return immutable(await RichMarkdownEditor.init({
    errors,
    validate: validateAddendumText,
    child: {
      uploadImage: makeUploadMarkdownImage(),
      value,
      id
    }
  }));
}

export const init: Init<Params, State> = async params => {
  // Existing Addenda
  const existingAddenda: ExistingAddendum[] = [];
  let i = 0;
  for (const addendum of params.existingAddenda) {
    existingAddenda.push({
      ...addendum,
      field: await initAddendumField(`existing-addendum-${i}`, addendum.description)
    });
    i++;
  }
  return {
    disabled: params.disabled,
    isEditing: false,
    publishLoading: 0,
    existingAddenda, //existingAddenda sorted in the http/api module.
    newAddendum:
      params.newAddendum
        ? await initAddendumField('new-addendum', params.newAddendum.value, params.newAddendum.errors)
        : null
  };
};

const startPublishLoading = makeStartLoading<State>('publishLoading');
const stopPublishLoading = makeStopLoading<State>('publishLoading');

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'add':
      return [
        state,
        async state => {
          // Adding addenda asynchronously means that validation is momentarily
          // quirky when adding a new addendum.
          return state
            .set('newAddendum', await initAddendumField('new-addendum'))
            .set('isEditing', true);
        }
      ];
    case 'cancel':
      return [
        state.set('isEditing', false).set('newAddendum', null)
      ];
    case 'publish':
      return [
        startPublishLoading(state),
        async (state) => {
          state = stopPublishLoading(state);
          //TODO
          return state;
        }
      ];
    case 'onChangeExisting':
      return updateComponentChild({
        state,
        childStatePath: ['existingAddenda', String(msg.value[0]), 'field'],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value[1],
        mapChildMsg: value => adt('onChangeExisting', [msg.value[0], value]) as Msg
      });
    case 'onChangeNew':
      return updateComponentChild({
        state,
        childStatePath: ['newAddendum'],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('onChangeNew', value) as Msg
      });
  }
};

export const AddendaList: View<{ addenda: Addendum[]; }> = ({ addenda }) => {
  return (
    <div>
      {addenda.map((a, i) => (
        <div key={`addenda-list-${i}`} className={`border rounded overflow-hidden ${i < addenda.length - 1 ? 'mb-4' : ''}`}>
          <Markdown source={a.description} className='p-3' smallerHeadings openLinksInNewTabs />
          <div className='bg-light text-secondary p-3 border-top'>Posted on {formatDateAndTime(a.createdAt, true)}{a.createdBy ? `by ${a.createdBy.name}` : ''}</div>
        </div>
      ))}
    </div>
  );
};

export interface Props extends ComponentViewProps<State, Msg> {
  className?: string;
}

export const view: View<Props> = props => {
  const { className, state, dispatch } = props;
  const isPublishLoading = state.publishLoading > 0;
  const isDisabled = state.disabled || isPublishLoading;
  const style = {
    height: '300px'
  };
  return (
    <div className={className}>
      {state.newAddendum
        ? (<RichMarkdownEditor.view
            extraChildProps={{}}
            disabled={isDisabled}
            style={style}
            label='New Addendum'
            help='Provide additional information that was not provided on the original posting of the opportunity.'
            required
            state={state.newAddendum}
            dispatch={mapComponentDispatch(dispatch, msg => adt('onChangeNew', msg) as Msg)} />)
        : null}
      {state.existingAddenda.map((addendum, i) => (
        <RichMarkdownEditor.view
          key={`existing-addendum-${i}`}
          extraChildProps={{}}
          disabled
          style={style}
          label='Existing Addendum'
          hint={`Created ${formatDateAndTime(addendum.createdAt)}`}
          state={addendum.field}
          dispatch={mapComponentDispatch(dispatch, msg => adt('onChangeExisting', [i, msg]) as Msg)} />
      ))}
    </div>);
};

export const getContextualActions: PageGetContextualActions<State, Msg> = ({ state, dispatch }) => {
  if (state.disabled) { return null; }
  if (state.isEditing) {
    const isPublishLoading = state.publishLoading > 0;
    return adt('links', [
      {
        children: 'Publish Addendum',
        onClick: () => dispatch(adt('publish')),
        button: true,
        disabled: isPublishLoading,
        loading: isPublishLoading,
        symbol_: leftPlacement(iconLinkSymbol('bullhorn')),
        color: 'primary'
      },
      {
        children: 'Cancel',
        disabled: isPublishLoading,
        onClick: () => dispatch(adt('cancel')),
        color: 'white'
      }
    ]);
  } else {
    return adt('links', [
      {
        children: 'Add Addendum',
        onClick: () => dispatch(adt('add')),
        button: true,
        symbol_: leftPlacement(iconLinkSymbol('file-plus')),
        color: 'primary'
      }
    ]);
  }
};
