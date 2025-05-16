import { makeStartLoading, makeStopLoading } from "front-end/lib";
import * as FormField from "front-end/lib/components/form-field";
import { Immutable, component as component_ } from "front-end/lib/framework";
import FileLink from "front-end/lib/views/file-link";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import Link, { routeDest } from "front-end/lib/views/link";
import React, { CSSProperties, Fragment } from "react";
import { FormText, Spinner } from "reactstrap";
import { countWords } from "shared/lib";
import { SUPPORTED_IMAGE_EXTENSIONS } from "shared/lib/resources/file";
import { adt, ADT } from "shared/lib/types";
import { isValid, Validation } from "shared/lib/validation";

export type Value = string;

type ImageData = {
  name: string;
  url: string;
};

export type UploadImageResult = Validation<ImageData>;

export type UploadImage = (file: File) => component_.Cmd<UploadImageResult>;

type Snapshot = [string, number, number]; // [value, selectionStart, selectionEnd]

type StackEntry = ADT<"single", Snapshot> | ADT<"batch", Snapshot>;

type Stack = StackEntry[];

function emptyStack(): Stack {
  return [];
}

function isStackEmpty(stack: Stack): boolean {
  return !stack.length;
}

interface ChildState extends FormField.ChildStateBase<Value> {
  wordLimit: number | null;
  currentStackEntry: StackEntry | null; // When in the middle of undoing/redoing to ensure continuity in UX.
  undo: Stack;
  redo: Stack;
  loading: number;
  selectionStart: number;
  selectionEnd: number;
  uploadImage?: UploadImage;
}

export interface ChildParams extends FormField.ChildParamsBase<Value> {
  wordLimit?: number;
  uploadImage?: UploadImage;
}

type InnerChildMsg =
  | ADT<"noop">
  | ADT<"onChangeTextArea", Snapshot>
  | ADT<"onChangeSelection", [number, number]> // [selectionStart, selectionEnd]
  | ADT<"controlUndo">
  | ADT<"controlRedo">
  | ADT<"controlH1">
  | ADT<"controlH2">
  | ADT<"controlH3">
  | ADT<"controlBold">
  | ADT<"controlItalics">
  | ADT<"controlOrderedList">
  | ADT<"controlUnorderedList">
  | ADT<"controlImage", File>
  | ADT<"onUploadImage", UploadImageResult>;

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
    ...params,
    wordLimit: params.wordLimit === undefined ? null : params.wordLimit,
    currentStackEntry: null,
    undo: emptyStack(),
    redo: emptyStack(),
    loading: 0,
    selectionStart: 0,
    selectionEnd: 0
  },
  []
];

const startLoading = makeStartLoading<ChildState>("loading");
const stopLoading = makeStopLoading<ChildState>("loading");

function validateAndFocus(
  id: string
): Array<component_.Cmd<FormField.ChildMsg<InnerChildMsg>>> {
  return [
    component_.cmd.dispatch(adt("@validate")),
    component_.cmd.focus(id, adt("noop"))
  ];
}

interface InsertParams {
  separateLine?: boolean;
  text(selectedText: string): string;
}

function insert(
  state: Immutable<ChildState>,
  params: InsertParams
): component_.base.UpdateReturnValue<
  ChildState,
  FormField.ChildMsg<InnerChildMsg>
> {
  const { text, separateLine = false } = params;
  const selectedText = state.value.substring(
    state.selectionStart,
    state.selectionEnd
  );
  const body = text(selectedText);
  let prefix = state.value.substring(0, state.selectionStart);
  if (prefix !== "" && separateLine) {
    prefix = prefix.replace(/\n?\n?$/, "\n\n");
  }
  let suffix = state.value.substring(state.selectionEnd);
  if (suffix !== "" && separateLine) {
    suffix = suffix.replace(/^\n?\n?/, "\n\n");
  }
  state = pushStack(state, "undo", getStackEntry(state));
  state = resetRedoStack(state);
  state = setSnapshot(state, [
    `${prefix}${body}${suffix}`,
    prefix.length,
    prefix.length + body.length
  ]);
  return [state, validateAndFocus(state.id)];
}

function getSnapshot(state: Immutable<ChildState>): Snapshot {
  return [state.value, state.selectionStart, state.selectionEnd];
}

function setSnapshot(
  state: Immutable<ChildState>,
  snapshot: Snapshot
): Immutable<ChildState> {
  return state
    .set("value", snapshot[0])
    .set("selectionStart", snapshot[1])
    .set("selectionEnd", snapshot[2]);
}

function getStackEntry(state: Immutable<ChildState>): StackEntry {
  return state.currentStackEntry || adt("single", getSnapshot(state));
}

function setStackEntry(
  state: Immutable<ChildState>,
  entry: StackEntry
): Immutable<ChildState> {
  return setSnapshot(state, entry.value).set("currentStackEntry", entry);
}

function resetRedoStack(state: Immutable<ChildState>): Immutable<ChildState> {
  return state.set("redo", emptyStack()).set("currentStackEntry", null);
}

const MAX_STACK_ENTRIES = 50;
const STACK_BATCH_SIZE = 5;

function pushStack(
  state: Immutable<ChildState>,
  k: "undo" | "redo",
  entry: StackEntry
): Immutable<ChildState> {
  return state.update(k, (stack) => {
    const addAsNewest = () => [entry, ...stack.slice(0, MAX_STACK_ENTRIES - 1)];
    // If stack is smaller than batch size, or are adding a batch, simply add the entry.
    if (stack.length < STACK_BATCH_SIZE || entry.tag === "batch") {
      return addAsNewest();
    }
    // If newest entries are batches, simply add the entry.
    for (let i = 0; i < STACK_BATCH_SIZE; i++) {
      if (stack[i].tag === "batch") {
        return addAsNewest();
      }
    }
    // Otherwise, the newest (single) entries need to be batched.
    return [
      entry,
      adt("batch", stack[STACK_BATCH_SIZE - 1].value), // convert single entry to batch
      ...stack.slice(STACK_BATCH_SIZE, MAX_STACK_ENTRIES - 2)
    ];
  });
}

function popStack(
  state: Immutable<ChildState>,
  k: "undo" | "redo"
): [StackEntry | undefined, Immutable<ChildState>] {
  const stack = state.get(k);
  if (!stack.length) {
    return [undefined, state];
  }
  const [entry, ...rest] = stack;
  return [entry, state.set(k, rest)];
}

const childUpdate: ChildComponent["update"] = ({ state, msg }) => {
  switch (msg.tag) {
    case "onChangeTextArea":
      state = pushStack(state, "undo", getStackEntry(state));
      state = resetRedoStack(state);
      return [setSnapshot(state, msg.value), []];
    case "onChangeSelection":
      return [
        state
          .set("selectionStart", msg.value[0])
          .set("selectionEnd", msg.value[1]),
        []
      ];
    case "controlUndo": {
      let entry: StackEntry | undefined;
      [entry, state] = popStack(state, "undo");
      if (!entry) {
        return [state, []];
      }
      state = pushStack(state, "redo", getStackEntry(state));
      state = setStackEntry(state, entry);
      return [state, validateAndFocus(state.id)];
    }
    case "controlRedo": {
      let entry: StackEntry | undefined;
      [entry, state] = popStack(state, "redo");
      if (!entry) {
        return [state, []];
      }
      state = pushStack(state, "undo", getStackEntry(state));
      state = setStackEntry(state, entry);
      return [state, validateAndFocus(state.id)];
    }
    case "controlH1":
      return insert(state, {
        text: (selectedText) => `# ${selectedText}`,
        separateLine: true
      });
    case "controlH2":
      return insert(state, {
        text: (selectedText) => `## ${selectedText}`,
        separateLine: true
      });
    case "controlH3":
      return insert(state, {
        text: (selectedText) => `### ${selectedText}`,
        separateLine: true
      });
    case "controlBold":
      return insert(state, {
        text: (selectedText) => `**${selectedText}**`
      });
    case "controlItalics":
      return insert(state, {
        text: (selectedText) => `*${selectedText}*`
      });
    case "controlOrderedList":
      return insert(state, {
        text: (selectedText) => `1. ${selectedText}`,
        separateLine: true
      });
    case "controlUnorderedList":
      return insert(state, {
        text: (selectedText) => `- ${selectedText}`,
        separateLine: true
      });
    case "controlImage":
      if (!state.uploadImage) {
        return [state, []];
      }
      return [
        startLoading(state),
        [
          component_.cmd.map(state.uploadImage(msg.value), (msg) =>
            adt("onUploadImage", msg)
          )
        ]
      ];
    case "onUploadImage": {
      state = stopLoading(state);
      const uploadResult: UploadImageResult = msg.value;
      if (isValid<ImageData>(uploadResult)) {
        return insert(state, {
          text: () => `![${uploadResult.value.name}](${uploadResult.value.url})`
        });
      } else {
        return [state, []];
      }
    }
    default:
      return [state, []];
  }
};

interface ControlIconProps {
  name: AvailableIcons;
  disabled: boolean;
  children?: component_.base.ViewElement;
  width?: number;
  height?: number;
  className?: string;
  desktopOnly?: boolean;
  onClick?(): void;
}

const ControlIcon: component_.base.View<ControlIconProps> = ({
  name,
  disabled,
  onClick,
  children,
  width = 1.25,
  height = 1.25,
  className = "",
  desktopOnly
}) => {
  return (
    <div className={desktopOnly ? "d-none d-sm-flex" : "d-flex"}>
      <Link
        focusable={false}
        color={disabled ? "secondary" : "dark"}
        className={`${className} justify-content-center align-items-center position-relative`}
        disabled={disabled}
        onClick={onClick}
        style={{ lineHeight: 0, pointerEvents: disabled ? "none" : undefined }}>
        <Icon name={name} width={width} height={height} />
        {children ? children : ""}
      </Link>
    </div>
  );
};

const ControlSeparator: component_.base.View<{ desktopOnly?: boolean }> = ({
  desktopOnly
}) => {
  return (
    <div
      className={`me-3 border-start h-100 ${
        desktopOnly ? "d-none d-sm-block" : ""
      }`}></div>
  );
};

const Controls: ChildComponent["view"] = ({
  state,
  dispatch,
  disabled = false
}) => {
  const isLoading = state.loading > 0;
  const isDisabled = disabled || isLoading;
  const onSelectFile = (file: File) => {
    if (isDisabled) {
      return;
    }
    dispatch(adt("controlImage", file));
  };
  return (
    <div className="bg-light flex-grow-0 flex-shrink-0 d-flex flex-nowrap align-items-center px-3 py-2 rounded-top border-top border-end border-start">
      <ControlIcon
        name="undo"
        width={0.9}
        height={0.9}
        disabled={isDisabled || isStackEmpty(state.undo)}
        className="me-2"
        onClick={() => dispatch(adt("controlUndo"))}
      />
      <ControlIcon
        name="redo"
        width={0.9}
        height={0.9}
        disabled={isDisabled || isStackEmpty(state.redo)}
        className="me-3"
        onClick={() => dispatch(adt("controlRedo"))}
      />
      <ControlSeparator />
      <ControlIcon
        name="h1"
        disabled={isDisabled}
        className="me-2"
        onClick={() => dispatch(adt("controlH1"))}
      />
      <ControlIcon
        name="h2"
        disabled={isDisabled}
        className="me-3"
        onClick={() => dispatch(adt("controlH2"))}
      />
      <ControlSeparator />
      <ControlIcon
        name="bold"
        disabled={isDisabled}
        width={0.9}
        height={0.9}
        className="me-2"
        onClick={() => dispatch(adt("controlBold"))}
      />
      <ControlIcon
        name="italics"
        width={0.9}
        height={0.9}
        disabled={isDisabled}
        className="me-3"
        onClick={() => dispatch(adt("controlItalics"))}
      />
      <ControlSeparator desktopOnly />
      <ControlIcon
        desktopOnly
        name="unordered-list"
        width={1}
        height={1}
        disabled={isDisabled}
        className="me-2"
        onClick={() => dispatch(adt("controlUnorderedList"))}
      />
      <ControlIcon
        desktopOnly
        name="ordered-list"
        width={1}
        height={1}
        disabled={isDisabled}
        className="me-3"
        onClick={() => dispatch(adt("controlOrderedList"))}
      />
      {state.uploadImage ? (
        <Fragment>
          <ControlSeparator desktopOnly />
          <div className="d-none d-sm-flex">
            <FileLink
              focusable={false}
              className="p-0"
              disabled={isDisabled}
              style={{
                pointerEvents: isDisabled ? "none" : undefined
              }}
              onChange={onSelectFile}
              accept={SUPPORTED_IMAGE_EXTENSIONS}
              color="secondary">
              <Icon name="image" width={1.1} height={1.1} />
            </FileLink>
          </div>
        </Fragment>
      ) : null}
      <div className="ms-auto d-flex align-items-center">
        <Spinner
          size="sm"
          color="secondary"
          className={`o-50 ${isLoading ? "" : "d-none"}`}
        />
        <Link
          focusable={false}
          newTab
          dest={routeDest(adt("contentView", "markdown-guide"))}
          color="primary"
          className="d-flex justify-content-center align-items-center ms-2"
          style={{ lineHeight: 0 }}>
          <Icon name="markdown" width={1.25} height={1.25} />
        </Link>
      </div>
    </div>
  );
};

const ChildView: ChildComponent["view"] = (props) => {
  const {
    state,
    dispatch,
    style,
    placeholder,
    className = "",
    validityClassName,
    disabled = false
  } = props;
  const isLoading = state.loading > 0;
  const isDisabled = disabled || isLoading;
  const onChangeSelection = (target: EventTarget & HTMLTextAreaElement) => {
    if (isDisabled) {
      return;
    }
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== state.selectionStart || end !== state.selectionEnd) {
      dispatch(adt("onChangeSelection", [start, end]));
    }
  };
  return (
    <div style={style} className="d-flex flex-column flex-grow-1">
      <div
        className={`${className} p-0 d-flex flex-column flex-nowrap align-items-stretch`}>
        <Controls {...props} />
        <textarea
          id={state.id}
          value={state.value}
          placeholder={placeholder}
          disabled={isDisabled}
          className={`${validityClassName} form-control flex-grow-1`}
          style={{
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0
          }}
          ref={(ref) => {
            const start = state.selectionStart;
            const end = state.selectionEnd;
            if (ref) {
              if (ref.selectionStart !== start) {
                ref.selectionStart = start;
              }
              if (ref.selectionEnd !== end) {
                ref.selectionEnd = end;
              }
            }
          }}
          onChange={(e) => {
            const value = e.currentTarget.value;
            dispatch(
              adt("onChangeTextArea", [
                value,
                e.currentTarget.selectionStart,
                e.currentTarget.selectionEnd
              ])
            );
            // Let the parent form field component know that the value has been updated.
            props.onChange(value);
          }}
          onKeyDown={(e) => {
            const isModifier = e.ctrlKey || e.metaKey;
            const code = e.keyCode || e.which;
            const isUndo = isModifier && !e.shiftKey && code === 90; //Ctrl-Z or Cmd-Z
            const isRedo =
              isModifier && ((e.shiftKey && code === 90) || code === 89); //Ctrl-Shift-Z, Cmd-Shift-Z, Ctrl-Y or Cmd-Y
            const run = (msg: InnerChildMsg) => {
              e.preventDefault();
              dispatch(msg);
            };
            if (isUndo) {
              run(adt("controlUndo"));
            } else if (isRedo) {
              run(adt("controlRedo"));
            }
          }}
          onSelect={(e) => onChangeSelection(e.currentTarget)}></textarea>
      </div>
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
