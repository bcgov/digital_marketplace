import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as FormField from "front-end/lib/components/form-field";
import * as RichMarkdownEditor from "front-end/lib/components/form-field/rich-markdown-editor";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import Markdown from "front-end/lib/views/markdown";
import React from "react";
import { formatDateAndTime } from "shared/lib";
import { Addendum } from "shared/lib/resources/opportunity/code-with-us";
import { adt, ADT } from "shared/lib/types";
import * as validation from "shared/lib/validation";
import { validateAddendumText } from "shared/lib/validation/addendum";

const toasts = {
  success: {
    title: "Addendum Published",
    body: "Your addendum has been successfully published."
  },
  error: {
    title: "Unable to Publish Addendum",
    body: "Your addendum could not be published. Please try again later."
  }
};

interface ExistingAddendum extends Addendum {
  field: Immutable<RichMarkdownEditor.State>;
}

// Either return the updated list of existing addenda, or the list of errors for the new addendum field.
export type PublishNewAddendum = (
  value: string
) => component_.Cmd<PublishNewAddendumResponse>;

export type PublishNewAddendumResponse = validation.Validation<
  Addendum[],
  string[]
>;

type ModalId = "publish" | "cancel";

export interface State {
  isEditing: boolean;
  publishLoading: number;
  showModal: ModalId | null;
  publishNewAddendum: PublishNewAddendum;
  newAddendum: Immutable<RichMarkdownEditor.State> | null;
  existingAddenda: ExistingAddendum[];
}

type InnerMsg =
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"add">
  | ADT<"cancel">
  | ADT<"publish">
  | ADT<"onPublishResponse", PublishNewAddendumResponse>
  | ADT<"onChangeExisting", [number, RichMarkdownEditor.Msg]>
  | ADT<"onChangeNew", RichMarkdownEditor.Msg>;

export type Msg = component_.global.Msg<InnerMsg, Route>;

export interface Params extends Pick<State, "publishNewAddendum"> {
  existingAddenda: Addendum[];
  newAddendum?: {
    errors: string[];
    value: string;
  };
}

export function isValid(state: Immutable<State>): boolean {
  return state.newAddendum ? FormField.isValid(state.newAddendum) : true;
}

export function getNewAddendum(state: Immutable<State>): string | null {
  return state.newAddendum ? FormField.getValue(state.newAddendum) : null;
}

function initAddendumField(
  id: string,
  value = "",
  errors: string[] = []
): component_.base.InitReturnValue<
  Immutable<RichMarkdownEditor.State>,
  RichMarkdownEditor.Msg
> {
  const [state, cmds] = RichMarkdownEditor.init({
    errors,
    validate: validateAddendumText,
    child: {
      uploadImage: api.files.markdownImages.makeUploadImage(),
      value,
      id
    }
  });
  return [immutable(state), cmds];
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  // Existing Addenda
  const [existingAddenda, existingAddendaCmds] = params.existingAddenda.reduce<
    [ExistingAddendum[], component_.Cmd<Msg>[]]
  >(
    ([addenda, cmds], addendum, index) => {
      const [field, initCmds] = initAddendumField(
        `existing-addendum-${index}`,
        addendum.description
      );
      return [
        [...addenda, { ...addendum, field }],
        [
          ...cmds,
          ...component_.cmd.mapMany(
            initCmds,
            (msg) => adt("onChangeExisting", [index, msg]) as Msg
          )
        ]
      ];
    },
    [[], []]
  );
  const initNewAddendum: [
    Immutable<RichMarkdownEditor.State> | null,
    component_.Cmd<RichMarkdownEditor.Msg>[]
  ] = params.newAddendum
    ? initAddendumField(
        "new-addendum",
        params.newAddendum.value,
        params.newAddendum.errors
      )
    : [null, []];
  const newAddendum = initNewAddendum[0];
  const newAddendumCmds = component_.cmd.mapMany(
    initNewAddendum[1],
    (msg) => adt("onChangeNew", msg) as Msg
  );
  return [
    {
      publishNewAddendum: params.publishNewAddendum,
      isEditing: false,
      publishLoading: 0,
      showModal: null,
      existingAddenda, //existingAddenda sorted in the http/api module.
      newAddendum
    },
    [...existingAddendaCmds, ...newAddendumCmds]
  ];
};

const startPublishLoading = makeStartLoading<State>("publishLoading");
const stopPublishLoading = makeStopLoading<State>("publishLoading");

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "showModal":
      return [state.set("showModal", msg.value), []];
    case "hideModal":
      return [state.set("showModal", null), []];
    case "add": {
      const [newAddendum, newAddendumCmds] = initAddendumField("new-addendum");
      return [
        state.set("newAddendum", newAddendum).set("isEditing", true),
        component_.cmd.mapMany(
          newAddendumCmds,
          (msg) => adt("onChangeNew", msg) as Msg
        )
      ];
    }
    case "cancel":
      return [
        state
          .set("showModal", null)
          .set("isEditing", false)
          .set("newAddendum", null),
        []
      ];
    case "publish": {
      const newAddendum = getNewAddendum(state);
      return [
        startPublishLoading(state).set("showModal", null),
        newAddendum
          ? [
              component_.cmd.map(
                state.publishNewAddendum(newAddendum),
                (response) => adt("onPublishResponse", response) as Msg
              )
            ]
          : []
      ];
    }
    case "onPublishResponse": {
      const response: PublishNewAddendumResponse = msg.value;
      if (validation.isValid<Addendum[]>(response)) {
        const [initState, initCmds] = init({
          publishNewAddendum: state.publishNewAddendum,
          existingAddenda: response.value
        });
        return [
          immutable(initState),
          [
            ...initCmds,
            component_.cmd.dispatch(
              component_.global.showToastMsg(adt("success", toasts.success))
            )
          ]
        ];
      } else {
        return [
          stopPublishLoading(state).update("newAddendum", (s) =>
            s ? FormField.setErrors(s, response.value) : s
          ),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(adt("error", toasts.error))
            )
          ]
        ];
      }
    }
    case "onChangeExisting":
      return component_.base.updateChild({
        state,
        childStatePath: ["existingAddenda", String(msg.value[0]), "field"],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value[1],
        mapChildMsg: (value) =>
          adt("onChangeExisting", [msg.value[0], value]) as Msg
      });
    case "onChangeNew":
      return component_.base.updateChild({
        state,
        childStatePath: ["newAddendum"],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("onChangeNew", value) as Msg
      });
    default:
      return [state, []];
  }
};

export const AddendaList: component_.base.View<{ addenda: Addendum[] }> = ({
  addenda
}) => {
  return (
    <div>
      {addenda.map((a, i) => (
        <div
          key={`addenda-list-${i}`}
          className={`border rounded overflow-hidden ${
            i < addenda.length - 1 ? "mb-4" : ""
          }`}>
          <Markdown
            source={a.description}
            className="p-3"
            smallerHeadings
            openLinksInNewTabs
          />
          <div className="bg-light text-secondary p-3 border-top">
            Posted on {formatDateAndTime(a.createdAt, true)}
            {a.createdBy ? ` by ${a.createdBy.name}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
};

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  className?: string;
}

export const view: component_.base.View<Props> = (props) => {
  const { className, state, dispatch } = props;
  const isPublishLoading = state.publishLoading > 0;
  const isDisabled = isPublishLoading;
  const style = {
    height: "300px"
  };
  return (
    <div className={className}>
      {state.newAddendum ? (
        <RichMarkdownEditor.view
          extraChildProps={{}}
          disabled={isDisabled}
          style={style}
          label="New Addendum"
          help="Provide additional information that was not provided on the original posting of the opportunity."
          required
          state={state.newAddendum}
          dispatch={component_.base.mapDispatch(
            dispatch,
            (msg) => adt("onChangeNew", msg) as Msg
          )}
        />
      ) : null}
      {state.existingAddenda.map((addendum, i) => (
        <RichMarkdownEditor.view
          key={`existing-addendum-${i}`}
          extraChildProps={{}}
          disabled
          style={style}
          label="Existing Addendum"
          hint={`Created ${formatDateAndTime(addendum.createdAt)}`}
          state={addendum.field}
          dispatch={component_.base.mapDispatch(
            dispatch,
            (msg) => adt("onChangeExisting", [i, msg]) as Msg
          )}
        />
      ))}
    </div>
  );
};

export const getActions: component_.page.GetActions<State, Msg> = ({
  state,
  dispatch
}) => {
  if (state.isEditing) {
    const isPublishLoading = state.publishLoading > 0;
    return adt("links", [
      {
        children: "Publish Addendum",
        onClick: () => dispatch(adt("showModal", "publish" as const)),
        button: true,
        disabled: isPublishLoading || !isValid(state),
        loading: isPublishLoading,
        symbol_: leftPlacement(iconLinkSymbol("bullhorn")),
        color: "primary"
      },
      {
        children: "Cancel",
        disabled: isPublishLoading,
        onClick: () => dispatch(adt("showModal", "cancel" as const))
      }
    ]);
  } else {
    return adt("links", [
      {
        children: "Add Addendum",
        onClick: () => dispatch(adt("add")),
        button: true,
        symbol_: leftPlacement(iconLinkSymbol("file-plus")),
        color: "primary"
      }
    ]);
  }
};

export const getModal: component_.page.GetModal<State, Msg> = (state) => {
  switch (state.showModal) {
    case "publish":
      return component_.page.modal.show<Msg>({
        title: "Publish Addendum?",
        onCloseMsg: adt("hideModal"),
        actions: [
          {
            text: "Publish Addendum",
            icon: "bullhorn",
            color: "primary",
            button: true,
            msg: adt("publish")
          },
          {
            text: "Cancel",
            color: "secondary",
            msg: adt("hideModal")
          }
        ],
        body: () =>
          "Are you sure you want to publish this addendum? Once published, all subscribers will be notified."
      });
    case "cancel":
      return component_.page.modal.show<Msg>({
        title: "Cancel Adding an Addendum?",
        onCloseMsg: adt("hideModal"),
        actions: [
          {
            text: "Yes, I want to cancel",
            color: "danger",
            button: true,
            msg: adt("cancel")
          },
          {
            text: "Go Back",
            color: "secondary",
            msg: adt("hideModal")
          }
        ],
        body: () =>
          "Are you sure you want to cancel? Any information you may have entered will be lost if you do so."
      });
    case null:
      return component_.page.modal.hide();
  }
};
