import React, { useRef, useEffect, useCallback } from "react";
// import { DndProvider } from "react-dnd";
// import { HTML5Backend } from "react-dnd-html5-backend";
import { Label } from "reactstrap";
import {
  Editor,
  EditorContainer
} from "front-end/lib/components/platejs/ui/editor";
// import { editorPlugins } from "front-end/lib/components/platejs/plugins/editor-plugins";
import { OpportunityContextPlugin } from "front-end/lib/components/platejs/components/editor/plugins/opportunity-context-plugin";
import type { OpportunityContext } from "front-end/lib/components/platejs/components/editor/plugins/opportunity-context-plugin";
import { Immutable, component as component_ } from "front-end/lib/framework";
import { adt, ADT } from "shared/lib/types";
import { Validation } from "shared/lib/validation";
// import { createFixedToolbarPlugin } from "../platejs/plugins/fixed-toolbar-plugin";
import { Plate } from "platejs/react";
import { useCreateEditor } from "../platejs/hooks/use-create-editor";

// State interface for the PlateJS editor
export interface State {
  errors: string[];
  showHelp: boolean;
  validate: (value: string) => Validation<string>;
  child: Child;
}

export interface Child {
  value: string;
  id: string;
  uploadImage?: () => void;
}

export type Msg = ADT<"child", ChildMsg>;

export type ChildMsg = ADT<"onChangeTextArea", [string, number, number]>;

export interface Params {
  errors: string[];
  child: Child;
  validate?: (value: string) => Validation<string>;
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  return [
    {
      errors: params.errors,
      showHelp: false,
      validate: params.validate || ((v) => ({ tag: "valid", value: v })),
      child: params.child
    },
    []
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "child":
      switch (msg.value.tag) {
        case "onChangeTextArea":
          return [
            state.set("child", {
              ...state.child,
              value: msg.value.value[0]
            }),
            []
          ];
      }
  }
};

export function getValue(state: Immutable<State>): string {
  return state.child.value;
}

export function setValue(
  state: Immutable<State>,
  value: string
): Immutable<State> {
  return state.set("child", {
    ...state.child,
    value
  });
}

export function setErrors(
  state: Immutable<State>,
  errors: string[]
): Immutable<State> {
  return state.set("errors", errors);
}

export function setValidate(
  state: Immutable<State>,
  validate: (value: string) => Validation<string>,
  runValidation?: boolean
): Immutable<State> {
  state = state.set("validate", validate);
  if (runValidation) {
    state = validateState(state);
  }
  return state;
}

export function validateState(state: Immutable<State>): Immutable<State> {
  const result = state.validate(state.child.value);
  return state.set("errors", result.tag === "invalid" ? result.value : []);
}

export function isValid(state: Immutable<State>): boolean {
  return state.errors.length === 0;
}

interface ViewProps extends component_.base.ComponentViewProps<State, Msg> {
  label?: string;
  placeholder?: string;
  help?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  extraChildProps?: {
    style?: React.CSSProperties;
  };
  opportunityContext?: OpportunityContext;
  toolbarMode?: "full" | "minimal";
}

export const view: component_.base.View<ViewProps> = ({
  state,
  dispatch,
  label,
  placeholder = "Enter text...",
  help,
  required = false,
  disabled = false,
  extraChildProps = {},
  opportunityContext,
  toolbarMode = "full"
}) => {
  const childId = state.child.id;
  const markdownContent = state.child.value;

  const editor = useCreateEditor(
    {
      //   plugins: [...editorPlugins, createFixedToolbarPlugin(toolbarMode)],
      readOnly: disabled
    },
    [disabled, toolbarMode]
  );

  // Debounce ref for handling editor changes
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize editor with markdown content on first load
  useEffect(() => {
    if (editor && markdownContent) {
      try {
        const deserializedValue =
          editor.api.markdown.deserialize(markdownContent);
        editor.tf.setValue(deserializedValue);
      } catch (error) {
        console.warn("Failed to deserialize markdown content:", error);
        // Fallback to plain text
        editor.tf.setValue([
          {
            type: "p",
            children: [{ text: markdownContent }]
          }
        ]);
      }
    }
  }, [editor]); // Only run on editor creation

  // Update the opportunity context in the editor
  useEffect(() => {
    if (editor && opportunityContext) {
      editor.setOption(OpportunityContextPlugin, "context", opportunityContext);
    }
  }, [editor, opportunityContext]);

  // Update editor content when markdown content changes externally
  useEffect(() => {
    if (editor && markdownContent !== undefined) {
      try {
        const currentMarkdown = editor.api.markdown.serialize();
        if (currentMarkdown !== markdownContent) {
          const deserializedValue =
            editor.api.markdown.deserialize(markdownContent);
          editor.tf.setValue(deserializedValue);
        }
      } catch (error) {
        console.warn("Failed to deserialize updated markdown content:", error);
      }
    }
  }, [markdownContent]); // Run when markdown content changes

  // Handle editor content changes with debouncing
  const handleEditorChange = useCallback(
    (_value: any) => {
      // Don't handle changes if editor is disabled/readonly
      if (disabled || !editor) return;

      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Set new timeout for debounced update
      updateTimeoutRef.current = setTimeout(() => {
        try {
          // Serialize editor content to markdown
          const markdownOutput = editor.api.markdown.serialize();

          // Only update if the markdown content has actually changed
          if (markdownOutput !== markdownContent) {
            // Update the form state with the markdown content
            // The Snapshot type is [string, number, number] = [value, selectionStart, selectionEnd]
            dispatch(
              adt(
                "child" as const,
                adt(
                  "onChangeTextArea" as const,
                  [
                    markdownOutput,
                    0, // selectionStart
                    markdownOutput.length // selectionEnd
                  ] as [string, number, number]
                )
              )
            );
          }
        } catch (error) {
          console.warn(
            "Failed to serialize editor content to markdown:",
            error
          );
        }
      }, 300); // 300ms debounce
      //   console.log("handleEditorChange", _value);
    },
    [editor, markdownContent, dispatch, disabled]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const hasErrors = state.errors.length > 0;

  return (
    <div className="form-group">
      {label && (
        <Label htmlFor={childId}>
          {label} {required && <span className="text-danger">*</span>}
        </Label>
      )}

      {help && <div className="form-text text-muted mb-2">{help}</div>}

      <div
        className={`form-control tw-scoped ${hasErrors ? "is-invalid" : ""}`}
        style={{
          border: "1px solid #cfd4da",
          borderRadius: "8px",
          padding: "12px",
          ...extraChildProps.style
        }}>
        <div className="preview relative flex size-full flex-col p-0 items-start">
          <div className="size-full grow">
            {/* <DndProvider backend={HTML5Backend}> */}
            <Plate
              editor={editor}
              onChange={disabled ? undefined : handleEditorChange}
              readOnly={disabled}>
              <EditorContainer variant="demo" className="h-72 overflow-y-auto">
                <Editor placeholder={placeholder} disabled={disabled} />
              </EditorContainer>
            </Plate>
            {/* </DndProvider> */}
          </div>
        </div>
        {/* Display the actual markdown content as preview*/}
        {/* <div className="preview-content">
          <pre>{markdownContent}</pre>
        </div> */}
      </div>
      {hasErrors && (
        <div className="invalid-feedback d-block">
          {state.errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
};
