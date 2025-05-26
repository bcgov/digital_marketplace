import * as FormField from "front-end/lib/components/form-field";
import React, { CSSProperties } from "react";
import { FormText } from "reactstrap";
import { countWords } from "shared/lib";
import { adt, ADT } from "shared/lib/types";
// Removed: VALIDATION_INVALID_IMAGE_DIMENSIONS, VALIDATION_INVALID_IMAGE_FILE_TYPE, VALIDATION_INVALID_IMAGE_SIZE // Not needed for CopilotTextarea
// import { isValid, Validation } from "shared/lib/validation"; // Might not be needed if we remove image uploads

import { CopilotTextarea } from "@copilotkit/react-textarea"; // Added

export type Value = string;

// Removed ImageData, UploadImageResult, UploadImage types

// Removed Snapshot, StackEntry, Stack types and related functions

interface ChildState extends FormField.ChildStateBase<Value> {
  wordLimit: number | null;
  autosuggestionsConfig?: any; // Added to state
  // Removed: currentStackEntry, undo, redo, loading, selectionStart, selectionEnd, uploadImage
  // We might add autosuggestionsConfig here if it needs to be dynamic per instance
}

export interface ChildParams extends FormField.ChildParamsBase<Value> {
  wordLimit?: number;
  // Removed: uploadImage
  autosuggestionsConfig?: any; // Placeholder for CopilotTextarea's config type
}

type InnerChildMsg =
  | ADT<"noop">
  | ADT<"onChange", Value>; // Simplified
  // Removed all control-related messages and onUploadImage

interface ExtraChildProps {
  style?: CSSProperties;
}

type ChildComponent = FormField.ChildComponent<
  Value,
  ChildParams,
  ChildState,
  InnerChildMsg,
  ExtraChildProps
>;

export type State = FormField.State<Value, ChildState>;

export type Params = FormField.Params<Value, ChildParams>;

export type Msg = FormField.Msg<InnerChildMsg>;

const childInit: ChildComponent["init"] = (params) => [
  {
    ...params, // Includes id, value, validate from FormField.ChildParamsBase
    wordLimit: params.wordLimit === undefined ? null : params.wordLimit
    // Removed initialization for undo, redo, loading, etc.
  },
  []
];

// Removed startLoading, stopLoading, validateAndFocus, insert, getSnapshot, setSnapshot, getStackEntry, setStackEntry, resetRedoStack, pushStack, popStack

const childUpdate: ChildComponent["update"] = ({ state, msg }) => {
  switch (msg.tag) {
    case "onChange":
      // This message is dispatched from CopilotTextarea's onValueChange handler
      // It updates the internal state. The parent FormField is notified directly in the handler.
      return [state.set("value", msg.value), []];
    // Removed all other message cases (controls, undo/redo, image upload)
    case "noop":
    default:
      return [state, []];
  }
};

// Removed ControlIcon, ControlSeparator, Controls components

const ChildView: ChildComponent["view"] = (props) => {
  const {
    state,
    dispatch, // dispatch for InnerChildMsg
    style,
    placeholder,
    className = "",
    validityClassName,
    disabled = false
  } = props;

  // isDisabled can be simplified if 'loading' state is removed
  const isDisabled = disabled; 

  return (
    <div style={style} className="d-flex flex-column flex-grow-1">
      <CopilotTextarea
        id={state.id}
        value={state.value}
        placeholder={placeholder}
        disabled={isDisabled}
        className={`${validityClassName} form-control ${className}`} // Combine classes
        style={{ minHeight: "200px" }} // Default style, can be overridden by props.style
        onValueChange={(newValue: string) => {
          // Dispatch message to update internal state via childUpdate
          dispatch(adt("onChange", newValue));
          // Notify FormField parent component of the change
          props.onChange(newValue);
        }}
        autosuggestionsConfig={state.autosuggestionsConfig || { // Use from state or a default
          textareaPurpose: "Provide a detailed description.",
          chatApiConfigs: {} 
          // Add other necessary chatApiConfigs if required by your CopilotKit setup
        }}
        // Ensure other necessary props for CopilotTextarea are added if any
      />
      {state.wordLimit !== null ? (
        <FormText color="secondary">
          {countWords(state.value)} / {state.wordLimit} word
          {state.wordLimit === 1 ? "" : "s"}
        </FormText>
      ) : null}
    </div>
  );
};

export const component = FormField.makeComponent<
  Value,
  ChildParams,
  ChildState,
  InnerChildMsg,
  ExtraChildProps
>({
  init: childInit,
  update: childUpdate,
  view: ChildView
});

export const init = component.init;

export const update = component.update;

export const view = component.view;

export default component; 