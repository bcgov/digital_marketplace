import { component } from "front-end/lib/framework";
import Icon from "front-end/lib/views/icon";
import { startCase } from "lodash";
import React from "react";
import Select, { Props as SelectProps } from "react-select";
import SelectCreatable from "react-select/creatable";
import { Spinner } from "reactstrap";
import { adt, ADT } from "shared/lib/types";

export interface Option<Value = string> {
  value: Value;
  label: string;
}

export interface OptionGroup<Value = string> {
  label: string;
  options: Array<Option<Value>>;
}

export type Options =
  | ADT<"options", Option[]>
  | ADT<"optionGroups", OptionGroup[]>;

/**
 * Converts an Array of strings into the format needed for a select list.
 * For example, labels and values.
 *
 * @param values
 * @returns adt
 */
export function stringsToOptions(values: string[]): ADT<"options", Option[]> {
  return adt(
    "options",
    values.map((value) => ({ value, label: value }))
  );
}

/**
 * Converts an object with strings for both keys and values into the format
 * needed for a select list. For example, labels and values.
 * For label/key it converts `CamelCase` words to something
 * more readable, i.e. `Camel Case`.
 *
 * @param values - key/value object
 * @returns adt - options for a select list
 */
export function objectToOptions(
  values: Record<string, string>,
  formatter = startCase
): ADT<"options", Option[]> {
  return adt(
    "options",
    Object.entries(values).map(([key, value]) => ({
      value,
      label: formatter(key)
    }))
  );
}

export function coalesceOptions(options: Options): Option[] {
  switch (options.tag) {
    case "options":
      return options.value;
    case "optionGroups":
      return options.value.reduce<Option[]>(
        (acc, { options }) => [...acc, ...options],
        []
      );
  }
}

export type SingleValue = Option | undefined | null;

export type MultiValue = Option[];

export interface BaseProps {
  name: string;
  id: string;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
  options: Options;
  formatGroupLabel?: component.base.View<OptionGroup>;
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

export const view: component.base.View<Props> = (props) => {
  const {
    options,
    formatGroupLabel,
    disabled = false,
    loading = false,
    className = ""
  } = props;
  const baseProps = {
    ...props,
    value: undefined,
    onChange: undefined,
    formatGroupLabel,
    options: options.value,
    blurInputOnSelect: !props.multi,
    isSearchable: true,
    isClearable: true,
    isDisabled: disabled,
    className: `${className} react-select-container`,
    classNamePrefix: "react-select",
    menuPlacement: "auto",
    components: {
      ClearIndicator: ({ clearValue, hasValue, innerProps }) => {
        if (!hasValue || disabled) {
          return null;
        }
        return (
          <div
            className="d-flex align-items-center justify-content-center"
            style={{ lineHeight: 0 }}
            onMouseDown={innerProps.onMouseDown}
            onTouchEnd={innerProps.onTouchEnd}>
            <Icon
              hover
              color="gray-500"
              onClick={() => clearValue()}
              name="times"
            />
          </div>
        );
      },
      IndicatorSeparator: () => {
        return (
          <div className="h-100 d-flex align-items-stretch justify-content-center py-1">
            <div className="d-flex align-items-center justify-content-center border-end pe-2 me-2"></div>
          </div>
        );
      },
      DropdownIndicator: ({ innerProps }) => {
        return (
          <div
            className="d-flex align-items-center justify-content-center pe-2"
            style={{ lineHeight: 0 }}
            onMouseDown={innerProps.onMouseDown}
            onTouchEnd={innerProps.onTouchEnd}>
            {loading ? (
              <Spinner color="gray-500" size="sm" />
            ) : (
              <Icon hover color="gray-500" name="caret-down" />
            )}
          </div>
        );
      },
      MultiValueRemove: ({ innerProps }) => {
        if (disabled) {
          return null;
        }
        return (
          <div
            className={innerProps.className}
            onClick={innerProps.onClick}
            onTouchEnd={innerProps.onTouchEnd}
            onMouseDown={innerProps.onMouseDown}>
            <Icon hover width={0.8} height={0.8} name="times" />
          </div>
        );
      }
    },
    styles: {
      control(styles) {
        return {
          ...styles,
          minHeight: undefined,
          borderWidth: undefined,
          borderColor: undefined,
          borderStyle: undefined,
          boxShadow: undefined,
          "&:hover": undefined
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
      option(styles, state) {
        let backgroundColor;

        if (state.isFocused) {
          backgroundColor = "var(--c-select-option-hover) !important";
        } else if (state.isSelected) {
          backgroundColor = "var(--c-select-option-hover)";
        } else {
          backgroundColor = undefined;
        }

        return {
          ...styles,
          backgroundColor,
          ":active": undefined
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
          backgroundColor: "var(--c-multi-select-item-bg)",
          opacity: disabled ? 0.75 : undefined
        };
      },
      multiValueLabel(styles) {
        return {
          ...styles,
          color: "white",
          padding: "3px 8px",
          paddingLeft: undefined
        };
      },
      multiValueRemove(styles) {
        return {
          ...styles,
          borderRadius: "0 2px 2px 0",
          borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
          color: "var(--c-multi-select-item-remove)",
          ":hover": {
            cursor: "pointer",
            color: "#fff",
            backgroundColor: "var(--danger)"
          }
        };
      }
    }
  } as SelectProps;
  const { id, ...selectProps } = (() => {
    if (props.multi) {
      return {
        ...baseProps,
        isMulti: true,
        value: props.value,
        onChange(value) {
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
        onChange(value) {
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
    return <SelectCreatable inputId={id} {...selectProps} />;
  } else {
    return <Select inputId={id} {...selectProps} />;
  }
};

export default view;
