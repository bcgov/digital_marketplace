import * as FormField from 'front-end/lib/components/form-field';
import * as RichMarkdownEditor from 'front-end/lib/components/form-field/rich-markdown-editor';
import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import { uploadMarkdownImage } from 'front-end/lib/http/api';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { compareDates, formatDateAndTime } from 'shared/lib';
import { Addendum } from 'shared/lib/resources/opportunity/code-with-us';
import { adt, ADT } from 'shared/lib/types';
import { validateAddendumText } from 'shared/lib/validation/addendum';

interface ExistingAddendum extends Addendum {
  field: Immutable<RichMarkdownEditor.State>;
}

export interface State {
  existingAddenda: ExistingAddendum[];
  newAddenda: Array<Immutable<RichMarkdownEditor.State>>;
}

export type Msg
  = ADT<'addAddendum'>
  | ADT<'removeNewAddendum', number>
  | ADT<'onChangeExistingAddendum', [number, RichMarkdownEditor.Msg]>
  | ADT<'onChangeNewAddendum', [number, RichMarkdownEditor.Msg]>;

export interface NewAddendumParam {
  errors: string[];
  value: string;
}

export interface Params {
  existingAddenda: Addendum[];
  newAddenda?: NewAddendumParam[];
}

export function isValid(state: Immutable<State>): boolean {
  return state.newAddenda.reduce((valid, addendum) => valid && FormField.isValid(addendum), true as boolean);
}

export function getNewAddenda(state: Immutable<State>): string[] {
  return state.newAddenda.map(a => FormField.getValue(a));
}

async function initAddendumField(id: string, value = '', errors: string[] = []): Promise<Immutable<RichMarkdownEditor.State>> {
  return immutable(await RichMarkdownEditor.init({
    errors,
    validate: validateAddendumText,
    child: {
      uploadImage: uploadMarkdownImage,
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
  // New Addenda
  const newAddenda: State['newAddenda'] = [];
  const newAddendaParams = params.newAddenda || [];
  let j = newAddendaParams.length - 1;
  for (const addendum of newAddendaParams) {
    newAddenda.push(await initAddendumField(`new-addendum-${j}`, addendum.value, addendum.errors));
    j--;
  }
  return {
    // Show newest addenda first.
    existingAddenda: existingAddenda.sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1),
    newAddenda
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'addAddendum':
      return [
        state,
        async state => {
          // Adding addenda asynchronously means that validation is momentarily
          // quirky when adding a new addendum.
          const newAddendum = await initAddendumField(`new-addendum-${state.newAddenda.length}`);
          //Show newest additions first.
          return state.update('newAddenda', addenda => [newAddendum].concat(addenda));
        }
      ];
    case 'removeNewAddendum':
      return [state.update('newAddenda', addenda => addenda.filter((a, i) => i !== msg.value))];
    case 'onChangeExistingAddendum':
      return updateComponentChild({
        state,
        childStatePath: ['existingAddenda', String(msg.value[0]), 'field'],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value[1],
        mapChildMsg: value => adt('onChangeExistingAddendum', [msg.value[0], value]) as Msg
      });
    case 'onChangeNewAddendum':
      return updateComponentChild({
        state,
        childStatePath: ['newAddenda', String(msg.value[0])],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value[1],
        mapChildMsg: value => adt('onChangeNewAddendum', [msg.value[0], value]) as Msg
      });
  }
};

export interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
  className?: string;
  addButtonClassName?: string;
}

const AddButton: View<Props> = ({ addButtonClassName = '', dispatch, disabled }) => {
  if (disabled) { return null; }
  return (
    <Link
      button
      outline
      size='sm'
      color='primary'
      className={`mb-5 ${addButtonClassName}`}
      symbol_={leftPlacement(iconLinkSymbol('file-plus'))}
      disabled={disabled}
      onClick={() => dispatch(adt('addAddendum'))}
    >
      Add Addendum
    </Link>
  );
};

export const view: View<Props> = props => {
  const { className, state, dispatch, disabled } = props;
  const style = {
    height: '300px'
  };
  return (
    <div className={className}>
      <AddButton {...props} />
      {state.newAddenda.map((addendum, i) => (
        <RichMarkdownEditor.view
          key={`new-addendum-${i}`}
          extraChildProps={{}}
          disabled={disabled}
          style={style}
          label='New Addendum'
          required
          action={{
            icon: 'trash',
            onClick: () => dispatch(adt('removeNewAddendum', i))
          }}
          state={addendum}
          dispatch={mapComponentDispatch(dispatch, msg => adt('onChangeNewAddendum', [i, msg]) as Msg)} />
      ))}
      {state.existingAddenda.map((addendum, i) => (
        <RichMarkdownEditor.view
          key={`existing-addendum-${i}`}
          extraChildProps={{}}
          disabled
          style={style}
          label='Existing Addendum'
          hint={`Created ${formatDateAndTime(addendum.createdAt)}`}
          state={addendum.field}
          dispatch={mapComponentDispatch(dispatch, msg => adt('onChangeExistingAddendum', [i, msg]) as Msg)} />
      ))}
    </div>);
};
