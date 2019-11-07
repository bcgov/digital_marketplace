import { View } from 'front-end/lib/framework';
import { OnChange } from 'front-end/lib/views/form-field/lib';
import React from 'react';
import Select from 'react-select';
import { Props as SelectProps } from 'react-select/base';
import { OptionTypeBase } from 'react-select/src/types';
import { ADT } from 'shared/lib/types';

export interface Option<Value = string> {
  value: Value;
  label: string;
}

export interface OptionGroup<Value = string> {
  label: string;
  options: Array<Option<Value>>;
}

export type Options
  = ADT<'options', Option[]>
  | ADT<'optionGroups', OptionGroup[]>;

export type Value = Option | undefined | null;

export interface Props {
  name: string;
  id: string;
  placeholder: string;
  value: Value;
  disabled?: boolean;
  autoFocus?: boolean;
  options: Options;
  formatGroupLabel?: View<OptionGroup>;
  className?: string;
  onChange: OnChange<Value>;
}

export const view: View<Props> = props => {
  const { options, formatGroupLabel, disabled = false, className = '', onChange } = props;
  const selectProps: SelectProps<Value & OptionTypeBase> = {
    ...props,
    // Cast this type here because react-select's type definitions for this prop
    // use record syntax, causing the type-system to not recognize the "label" property in OptionGroup.
    formatGroupLabel: formatGroupLabel as SelectProps<Value & OptionTypeBase>['formatGroupLabel'],
    options: options.value,
    isSearchable: true,
    isClearable: true,
    isDisabled: disabled,
    className: `${className} react-select-container`,
    classNamePrefix: 'react-select',
    styles: {
      control(styles) {
        return {
          ...styles,
          minHeight: undefined,
          borderWidth: undefined,
          borderColor: undefined,
          borderStyle: undefined,
          boxShadow: undefined,
          '&:hover': undefined
        };
      },
      placeholder(styles) {
        return {
          ...styles,
          color: undefined
        };
      },
      singleValue(styles) {
        return {
          ...styles,
          color: undefined
        };
      },
      option(styles) {
        return {
          ...styles,
          backgroundColor: undefined,
          ':active': undefined
        };
      },
      groupHeading(styles) {
        return {
          ...styles,
          fontWeight: undefined,
          fontSize: undefined,
          color: undefined
        };
      }
    },
    onChange(value, action) {
      if (value && Array.isArray(value)) {
        onChange(value[0]);
      } else {
        onChange(value as Value);
      }
    }
  };
  return (<Select {...selectProps} />);
};

export default view;
