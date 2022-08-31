import { APP_TERMS_CONTENT_ID } from "front-end/config";
import {
  getAlertsValid,
  getActionsValid,
  getMetadataValid,
  getModalValid,
  makePageMetadata,
  makeStartLoading,
  makeStopLoading,
  updateValid,
  ValidatedState,
  viewValid
} from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import * as router from "front-end/lib/app/router";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Form from "front-end/lib/pages/content/lib/components/form";
import * as toasts from "front-end/lib/pages/content/lib/toasts";
import DateMetadata from "front-end/lib/views/date-metadata";
import DescriptionList from "front-end/lib/views/description-list";
import * as EmailNotificationsResource from "shared/lib/resources/email-notifications";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  Props as LinkProps,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { COPY } from "shared/config";
import {
  Content,
  UpdateValidationErrors,
  DeleteValidationErrors
} from "shared/lib/resources/content";
import { UserType } from "shared/lib/resources/user";
import { ADT, adt } from "shared/lib/types";
import { invalid, valid } from "shared/lib/validation";

type ModalId = "save" | "notifyNewTerms" | "delete";

interface ValidState {
  routePath: string;
  startEditingLoading: number;
  notifyNewUsersLoading: number;
  deleteLoading: number;
  saveLoading: number;
  showModal: ModalId | null;
  isEditing: boolean;
  showNotifyNewTerms: boolean;
  form: Immutable<Form.State> | null;
  content: Content | null;
}

export type State = ValidatedState<ValidState>;

type InnerMsg =
  | ADT<"noop">
  | ADT<"onInitResponse", api.ResponseValidation<Content, string[]>>
  | ADT<"form", Form.Msg>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"startEditing">
  | ADT<"onStartEditingResponse", api.ResponseValidation<Content, string[]>>
  | ADT<"stopEditing">
  | ADT<"save">
  | ADT<
      "onSaveResponse",
      api.ResponseValidation<Content, UpdateValidationErrors>
    >
  | ADT<"notifyNewTerms">
  | ADT<
      "onNotifyNewTermsResponse",
      api.ResponseValidation<
        null,
        EmailNotificationsResource.CreateValidationErrors
      >
    >
  | ADT<"delete">
  | ADT<
      "onDeleteResponse",
      api.ResponseValidation<Content, DeleteValidationErrors>
    >;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = string; //slug

export const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType<RouteParams, State, InnerMsg>({
  userType: [UserType.Admin],
  success({ routePath, routeParams }) {
    return [
      valid(
        immutable({
          routePath,
          startEditingLoading: 0,
          notifyNewUsersLoading: 0,
          deleteLoading: 0,
          saveLoading: 0,
          showModal: null,
          isEditing: false,
          showNotifyNewTerms: routeParams === APP_TERMS_CONTENT_ID,
          form: null,
          content: null
        })
      ),
      [
        api.content.readOne(routeParams, (response) =>
          adt("onInitResponse", response)
        ) as component_.Cmd<Msg>
      ]
    ];
  },
  fail({ routePath }) {
    return [
      invalid(null),
      [
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            adt("notFound", {
              path: routePath
            }) as Route
          )
        )
      ]
    ];
  }
});

const startStartEditingLoading = makeStartLoading<ValidState>(
  "startEditingLoading"
);
const stopStartEditingLoading = makeStopLoading<ValidState>(
  "startEditingLoading"
);
const startNotifyNewUsersLoading = makeStartLoading<ValidState>(
  "notifyNewUsersLoading"
);
const stopNotifyNewUsersLoading = makeStopLoading<ValidState>(
  "notifyNewUsersLoading"
);
const startDeleteLoading = makeStartLoading<ValidState>("deleteLoading");
const stopDeleteLoading = makeStopLoading<ValidState>("deleteLoading");
const startSaveLoading = makeStartLoading<ValidState>("saveLoading");
const stopSaveLoading = makeStopLoading<ValidState>("saveLoading");

function resetForm(
  state: Immutable<ValidState>,
  content: Content
): component_.page.UpdateReturnValue<ValidState, InnerMsg, Route> {
  const [formState, formCmds] = Form.init({
    content
  });
  return [
    state.merge({
      content,
      form: immutable(formState)
    }),
    component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg)
  ];
}

export const update: component_.page.Update<State, InnerMsg, Route> =
  updateValid<ValidState, Msg>(({ state, msg }) => {
    switch (msg.tag) {
      case "onInitResponse": {
        const response = msg.value;
        if (!api.isValid(response)) {
          return [
            state,
            [
              component_.cmd.dispatch(component_.page.readyMsg()),
              component_.cmd.dispatch(
                component_.global.replaceRouteMsg(
                  adt("notFound" as const, {
                    path: state.routePath
                  })
                )
              )
            ]
          ];
        } else {
          const [resetState, resetCmds] = resetForm(state, response.value);
          return [
            resetState,
            [...resetCmds, component_.cmd.dispatch(component_.page.readyMsg())]
          ];
        }
      }
      case "form":
        return component_.base.updateChild({
          state,
          childStatePath: ["form"],
          childUpdate: Form.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("form", value)
        });
      case "showModal":
        return [state.set("showModal", msg.value), []];
      case "hideModal":
        return [state.set("showModal", null), []];
      case "startEditing": {
        const content = state.content;
        if (!content) return [state, []];
        return [
          startStartEditingLoading(state),
          [
            api.content.readOne(content.slug, (response) =>
              adt("onStartEditingResponse", response)
            ) as component_.Cmd<Msg>
          ]
        ];
      }
      case "onStartEditingResponse": {
        const response = msg.value;
        state = stopStartEditingLoading(state);
        if (api.isValid(response)) {
          state = state.set("isEditing", true);
          return resetForm(state, response.value);
        } else {
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.startedEditing.error)
                )
              )
            ]
          ];
        }
      }
      case "stopEditing": {
        const content = state.content;
        if (!content) return [state, []];
        state = state.merge({
          showModal: null,
          isEditing: false
        });
        return resetForm(state, content);
      }
      case "save": {
        const content = state.content;
        const form = state.form;
        if (!content || !form) return [state, []];
        const values = Form.getValues(form);
        return [
          startSaveLoading(state).set("showModal", null),
          [
            api.content.update(content.id, values, (response) =>
              adt("onSaveResponse", response)
            ) as component_.Cmd<Msg>
          ]
        ];
      }
      case "onSaveResponse": {
        state = stopSaveLoading(state);
        const response = msg.value;
        switch (response.tag) {
          case "valid": {
            state = state.set("isEditing", false);
            const [resetState, resetCmds] = resetForm(state, response.value);
            return [
              resetState,
              [
                ...resetCmds,
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt(
                      "success",
                      toasts.changesPublished.success(response.value)
                    )
                  )
                ),
                router.replaceState(
                  adt("contentEdit", response.value.slug),
                  adt("noop")
                )
              ]
            ];
          }
          case "invalid":
            state = state.update(
              "form",
              (f) => f && Form.setErrors(f, response.value)
            );
            return [
              state,
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("error", toasts.changesPublished.error)
                  )
                )
              ]
            ];
          case "unhandled":
          default:
            return [
              state,
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("error", toasts.changesPublished.error)
                  )
                )
              ]
            ];
        }
      }
      case "notifyNewTerms":
        return [
          startNotifyNewUsersLoading(state).set("showModal", null),
          [
            api.emailNotifications.create(adt("updateTerms"), (response) =>
              adt("onNotifyNewTermsResponse", response)
            ) as component_.Cmd<Msg>
          ]
        ];
      case "onNotifyNewTermsResponse": {
        const response = msg.value;
        state = stopNotifyNewUsersLoading(state);
        if (api.isValid(response)) {
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.notifiedNewTerms.success)
                )
              )
            ]
          ];
        } else {
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.notifiedNewTerms.error)
                )
              )
            ]
          ];
        }
      }
      case "delete": {
        const content = state.content;
        if (!content) return [state, []];
        return [
          startDeleteLoading(state).set("showModal", null),
          [
            api.content.delete_(content.id, (response) =>
              adt("onDeleteResponse", response)
            ) as component_.Cmd<Msg>
          ]
        ];
      }
      case "onDeleteResponse": {
        const response = msg.value;
        if (api.isValid(response)) {
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.replaceRouteMsg(
                  adt("contentList", null) as Route
                )
              ),
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.deleted.success(response.value.title))
                )
              )
            ]
          ];
        } else {
          return [
            stopDeleteLoading(state),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.deleted.error)
                )
              )
            ]
          ];
        }
      }
      default:
        return [state, []];
    }
  });

const DEFAULT_USER_NAME = "System";

export const view: component_.base.ComponentView<State, Msg> = viewValid(
  ({ state, dispatch }) => {
    const content = state.content;
    if (!content || !state.form) return null;
    const dates = [
      {
        tag: "dateAndTime" as const,
        date: content.createdAt,
        label: "Published"
      },
      {
        tag: "dateAndTime" as const,
        date: content.updatedAt,
        label: "Updated"
      }
    ];
    const items = [
      {
        name: "Published By",
        children: content.createdBy ? (
          <Link
            newTab
            dest={routeDest(
              adt("userProfile", { userId: content.createdBy.id })
            )}>
            {content.createdBy.name}
          </Link>
        ) : (
          DEFAULT_USER_NAME
        )
      },
      {
        name: "Updated By",
        children: content.updatedBy ? (
          <Link
            newTab
            dest={routeDest(
              adt("userProfile", { userId: content.updatedBy.id })
            )}>
            {content.updatedBy.name}
          </Link>
        ) : (
          DEFAULT_USER_NAME
        )
      }
    ];
    const disabled =
      !state.isEditing ||
      state.startEditingLoading > 0 ||
      state.saveLoading > 0;
    return (
      <div>
        <Row>
          <Col xs="12" className="mb-5">
            <Link
              className="h1"
              newTab
              dest={routeDest(adt("contentView", content.slug))}>
              {content.title}
            </Link>
            <DateMetadata dates={dates} />
          </Col>
        </Row>
        <div className="mb-5 pb-5 border-bottom">
          <Row>
            <Col xs="12">
              <DescriptionList items={items} />
            </Col>
          </Row>
        </div>
        <Form.view
          disabled={disabled}
          state={state.form}
          dispatch={component_.base.mapDispatch(
            dispatch,
            (msg) => adt("form", msg) as Msg
          )}
        />
      </div>
    );
  }
);

export const component: component_.page.Component<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = {
  init,
  update,
  view,
  getMetadata: getMetadataValid((state) => {
    return makePageMetadata(state.content?.title || "");
  }, makePageMetadata()),
  getAlerts: getAlertsValid((state) => {
    if (!state.content?.fixed) {
      return component_.page.alerts.empty();
    } else {
      return {
        ...component_.page.alerts.empty(),
        warnings: [
          {
            text: 'This is a "fixed" page, which means this web app needs it to exist at a specific slug in order to function correctly. Consequently, this page cannot be deleted and its slug cannot be changed.'
          }
        ]
      };
    }
  }),
  getActions: getActionsValid(({ state, dispatch }) => {
    if (state.isEditing) {
      const isSaveLoading = state.saveLoading > 0;
      const disabled = isSaveLoading;
      return adt("links", [
        {
          children: "Publish Changes",
          onClick: () => dispatch(adt("showModal", "save") as Msg),
          button: true,
          loading: isSaveLoading,
          disabled,
          symbol_: leftPlacement(iconLinkSymbol("bullhorn")),
          color: "primary"
        },
        {
          children: "Cancel",
          color: "c-nav-fg-alt",
          onClick: () => dispatch(adt("stopEditing") as Msg)
        }
      ]);
    } else if (!state.isEditing && state.showNotifyNewTerms) {
      const isStartEditingLoading = state.startEditingLoading > 0;
      const isNotifyNewUsersLoading = state.notifyNewUsersLoading > 0;
      const disabled = isStartEditingLoading || isNotifyNewUsersLoading;
      return adt("links", [
        {
          children: "Edit",
          onClick: () => dispatch(adt("startEditing")),
          button: true,
          loading: isStartEditingLoading,
          disabled,
          symbol_: leftPlacement(iconLinkSymbol("edit")),
          color: "primary"
        },
        {
          children: "Notify Vendors",
          onClick: () => dispatch(adt("showModal", "notifyNewTerms") as Msg),
          symbol_: leftPlacement(iconLinkSymbol("bell")),
          loading: isNotifyNewUsersLoading,
          button: true,
          disabled,
          color: "success"
        }
      ]);
    } else {
      //!state.isEditing && !state.showNotifyNewTerms
      const isStartEditingLoading = state.startEditingLoading > 0;
      const isDeleteLoading = state.deleteLoading > 0;
      const disabled = isStartEditingLoading || isDeleteLoading;
      return adt("links", [
        {
          children: "Edit",
          onClick: () => dispatch(adt("startEditing")),
          button: true,
          loading: isStartEditingLoading,
          disabled,
          symbol_: leftPlacement(iconLinkSymbol("edit")),
          color: "primary"
        },
        ...(state.content?.fixed
          ? []
          : [
              {
                children: "Delete",
                color: "c-nav-fg-alt",
                button: true,
                outline: true,
                loading: isDeleteLoading,
                disabled,
                symbol_: leftPlacement(iconLinkSymbol("trash")),
                onClick: () => dispatch(adt("showModal", "delete") as Msg)
              } as LinkProps
            ])
      ]);
    }
  }),
  getModal: getModalValid<ValidState, Msg>((state) => {
    switch (state.showModal) {
      case "save":
        return component_.page.modal.show<Msg>({
          title: "Publish Changes?",
          body: () =>
            "Are you sure you want to publish your changes to this page? Once published, they will be visible to all users who navigate to this page's URL.",
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Publish Changes",
              icon: "bullhorn",
              color: "primary",
              msg: adt("save"),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      case "notifyNewTerms":
        return component_.page.modal.show<Msg>({
          title: "Notify vendors of updated terms?",
          body: () =>
            `Are you sure you want to notify all vendors of updated ${COPY.appTermsTitle}? Vendors will receive a notification email, and will be required to accept the new terms before continuing to submit proposals to opportunities.`,
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Notify Vendors",
              icon: "bell",
              color: "success",
              msg: adt("notifyNewTerms"),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      case "delete":
        return component_.page.modal.show<Msg>({
          title: "Delete page?",
          body: () =>
            "Are you sure you want to delete this page? It will no longer be accessible to users if you do.",
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Delete Page",
              icon: "trash",
              color: "danger",
              msg: adt("delete"),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      case null:
        return component_.page.modal.hide();
    }
  })
};
