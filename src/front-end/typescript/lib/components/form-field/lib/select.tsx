import { View } from 'front-end/lib/framework';
import React from 'react';
import Select from 'react-select';
import { Props as SelectProps } from 'react-select/base';
import SelectCreatable from 'react-select/creatable';
import { adt, ADT } from 'shared/lib/types';

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

export function stringsToOptions(values: string[]): ADT<'options', Option[]> {
  return adt('options', values.map(value => ({ value, label: value })));
}

export function coalesceOptions(options: Options): Option[] {
  switch (options.tag) {
    case 'options':
      return options.value;
    case 'optionGroups':
      return options.value.reduce<Option[]>((acc, { options }) => [...acc, ...options], []);
  }
}

export type SingleValue = Option | undefined | null;

export type MultiValue = Option[];

export interface BaseProps {
  name: string;
  id: string;
  placeholder: string;
  disabled?: boolean;
  autoFocus?: boolean;
  options: Options;
  formatGroupLabel?: View<OptionGroup>;
  className?: string;
  creatable?: boolean;
}

export interface SingleProps extends BaseProps {
  multi?: false;
  value: SingleValue;
  onChange(value: SingleValue): void;
}

export interface MultiProps extends BaseProps {
  multi: true;
  value: MultiValue;
  onChange(value: MultiValue): void;
}

export type Props = SingleProps | MultiProps;

export const view: View<Props> = props => {
  const { options, formatGroupLabel, disabled = false, className = '' } = props;
  const baseProps = {
    ...props,
    value: undefined,
    onChange: undefined,
    formatGroupLabel,
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
      },
      multiValue(styles) {
        return {
          ...styles,
          backgroundColor: '#52489C'
        };
      },
      multiValueLabel(styles) {
        return {
          ...styles,
          color: 'white'
        };
      },
      multiValueRemove(styles) {
        return {
          ...styles,
          color: 'white',
          ':hover': {
            backgroundColor: '#DC3545'
          }
        };
      }
    }
  } as SelectProps;
  const selectProps = (() => {
    if (props.multi) {
      return {
        ...baseProps,
        isMulti: true,
        value: props.value,
        onChange(value, action) {
          if (value && Array.isArray(value)) {
            props.onChange(value);
          } else if (value) {
            props.onChange([value] as MultiValue);
          } else {
            props.onChange([]);
          }
        }
      } as SelectProps;
    } else {
      return {
        ...baseProps,
        isMulti: false,
        value: props.value,
        onChange(value, action) {
          if (value && Array.isArray(value)) {
            props.onChange(value[0]);
          } else if (value) {
            props.onChange(value as SingleValue);
          } else {
            props.onChange(null);
          }
        }
      } as SelectProps;
    }
  })();
  if (props.creatable) {
    return (<SelectCreatable {...selectProps} />);
  } else {
    return (<Select {...selectProps} />);
  }
};

export default view;
