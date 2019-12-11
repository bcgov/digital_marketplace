import { View } from 'front-end/lib/framework';
import { Props, Value } from 'front-end/lib/views/form-field/lib/select';
import React from 'react';
import Select, { Props as SelectProps } from 'react-select/creatable';
import { OptionTypeBase } from 'react-select/src/types';

export { Option, Props, Value } from 'front-end/lib/views/form-field/lib/select';

export const view: View<Props> = props => {
  const { options, formatGroupLabel, disabled = false, className = '', onChange } = props;
  const selectProps: SelectProps<Value & OptionTypeBase> = {
    ...props,
    options: options.value,
    // Cast this type here because react-select's type definitions for this prop
    // use record syntax, causing the type-system to not recognize the "label" property in OptionGroup.
    formatGroupLabel: formatGroupLabel as SelectProps<Value & OptionTypeBase>['formatGroupLabel'],
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
