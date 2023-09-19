import {
  getAlertsValid,
  getActionsValid,
  getModalValid,
  makePageMetadata,
  makeStartLoading,
  makeStopLoading,
  sidebarValid,
  updateValid,
  viewValid
} from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as Form from "front-end/lib/pages/opportunity/code-with-us/lib/components/form";
import * as toasts from "front-end/lib/pages/opportunity/code-with-us/lib/toasts";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import makeInstructionalSidebar from "front-end/lib/views/sidebar/instructional";
import React from "react";
import {
  CWUOpportunityStatus,
  FORMATTED_MAX_BUDGET
} from "shared/lib/resources/opportunity/code-with-us";
import { UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

type ModalId = "publish" | "cancel";

interface ValidState {
  showModal: ModalId | null;
  publishLoading: number;
  saveDraftLoading: number;
  showErrorAlert: "publish" | "save" | null;
  form: Immutable<Form.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg =
  | ADT<"dismissErrorAlert">
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"publish">
  | ADT<"onPublishResponse", Form.PersistResult>
  | ADT<"saveDraft">
  | ADT<"onSaveDraftResponse", Form.PersistResult>
  | ADT<"form", Form.Msg>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType<RouteParams, State, InnerMsg>({
  userType: [UserType.Government, UserType.Admin],
  success() {
    const [formState, formCmds] = Form.init({
      canRemoveExistingAttachments: true //moot
    });
    return [
      valid(
        immutable({
          showModal: null,
          publishLoading: 0,
          saveDraftLoading: 0,
          showErrorAlert: null,
          form: immutable(formState)
        })
      ),
      [
        ...component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg),
        component_.cmd.dispatch(component_.page.readyMsg())
      ]
    ];
  },
  fail({ routePath }) {
    return [
      invalid(null),
      [
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            adt("notFound", { path: routePath }) as Route
          )
        )
      ]
    ];
  }
});

const startPublishLoading = makeStartLoading<ValidState>("publishLoading");
const stopPublishLoading = makeStopLoading<ValidState>("publishLoading");
const startSaveDraftLoading = makeStartLoading<ValidState>("saveDraftLoading");
const stopSaveDraftLoading = makeStopLoading<ValidState>("saveDraftLoading");

const update: component_.page.Update<State, InnerMsg, Route> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "dismissErrorAlert":
        return [state.set("showErrorAlert", null), []];
      case "showModal":
        return [state.set("showModal", msg.value), []];
      case "hideModal":
        return [state.set("showModal", null), []];
      case "publish": {
        state = state.set("showModal", null);
        return [
          startPublishLoading(state),
          [
            component_.cmd.map(
              Form.persist(
                state.form,
                adt("create", CWUOpportunityStatus.Published)
              ),
              (result) => adt("onPublishResponse", result)
            )
          ]
        ];
      }
      case "onPublishResponse": {
        const result = msg.value;
        switch (result.tag) {
          case "valid": {
            const [resultFormState, resultCmds, opportunity] = result.value;
            return [
              state.set("form", resultFormState),
              [
                ...component_.cmd.mapMany(
                  resultCmds,
                  (msg) => adt("form", msg) as Msg
                ),
                component_.cmd.dispatch(
                  component_.global.newRouteMsg(
                    adt("opportunityCWUEdit", {
                      opportunityId: opportunity.id,
                      tab: "summary" as const
                    }) as Route
                  )
                ),
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("success", toasts.published.success(opportunity.id))
                  )
                )
              ]
            ];
          }
          case "invalid":
          default:
            state = stopPublishLoading(state);
            return [
              state.set("showErrorAlert", "publish").set("form", result.value),
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("error", toasts.published.error)
                  )
                )
              ]
            ];
        }
      }
      case "saveDraft": {
        state = state.set("showModal", null);
        return [
          startSaveDraftLoading(state),
          [
            component_.cmd.map(
              Form.persist(
                state.form,
                adt("create", CWUOpportunityStatus.Draft)
              ),
              (result) => adt("onSaveDraftResponse", result)
            )
          ]
        ];
      }
      case "onSaveDraftResponse": {
        const result = msg.value;
        switch (result.tag) {
          case "valid": {
            const [resultFormState, resultCmds, opportunity] = result.value;
            return [
              state.set("form", resultFormState),
              [
                ...component_.cmd.mapMany(
                  resultCmds,
                  (msg) => adt("form", msg) as Msg
                ),
                component_.cmd.dispatch(
                  component_.global.newRouteMsg(
                    adt("opportunityCWUEdit", {
                      opportunityId: opportunity.id,
                      tab: "opportunity" as const
                    }) as Route
                  )
                ),
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("success", toasts.draftCreated.success)
                  )
                )
              ]
            ];
          }
          case "invalid":
          default:
            state = stopSaveDraftLoading(state);
            return [
              state.set("showErrorAlert", "save").set("form", result.value),
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("error", toasts.draftCreated.error)
                  )
                )
              ]
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

      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state, dispatch }) => {
    const isPublishLoading = state.publishLoading > 0;
    const isSaveDraftLoading = state.saveDraftLoading > 0;
    const isDisabled = isSaveDraftLoading || isPublishLoading;
    return (
      <div className="d-flex flex-column h-100 justify-content-between">
        <Form.view
          state={state.form}
          dispatch={component_.base.mapDispatch(
            dispatch,
            (value) => adt("form", value) as Msg
          )}
          disabled={isDisabled}
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
  sidebar: sidebarValid({
    size: "large",
    color: "c-sidebar-instructional-bg",
    view: makeInstructionalSidebar<ValidState, Msg>({
      getTitle: () => "Create a Code With Us Opportunity",
      getDescription: () => (
        <div>
          <p>
            <em>Code With Us</em> opportunities pay a fixed price of up to{" "}
            {FORMATTED_MAX_BUDGET} for the delivery of code that meets your
            acceptance criteria.
          </p>
          <p className="mb-0">
            Use the form provided to create your <em>Code With Us</em>{" "}
            opportunity. You can either save a draft of your opportunity to
            complete the form at a later time, or you can complete the form now
            to publish your opportunity immediately.
          </p>
        </div>
      ),
      getFooter: () => (
        <span>
          Need help?{" "}
          <Link newTab dest={routeDest(adt("cwuMinistryGuide", null))}>
            Read the guide
          </Link>{" "}
          to learn how to create and manage a <em>Code With Us</em> opportunity.
        </span>
      )
    })
  }),
  getActions: getActionsValid(({ state, dispatch }) => {
    const isPublishLoading = state.publishLoading > 0;
    const isSaveDraftLoading = state.saveDraftLoading > 0;
    const isLoading = isPublishLoading || isSaveDraftLoading;
    const isValid = Form.isValid(state.form);
    return adt("links", [
      {
        children: "Publish",
        symbol_: leftPlacement(iconLinkSymbol("bullhorn")),
        button: true,
        loading: isPublishLoading,
        disabled: isLoading || !isValid,
        color: "primary",
        onClick: () => dispatch(adt("showModal", "publish" as const))
      },
      {
        children: "Save Draft",
        symbol_: leftPlacement(iconLinkSymbol("save")),
        loading: isSaveDraftLoading,
        disabled: isLoading,
        button: true,
        color: "success",
        onClick: () => dispatch(adt("saveDraft"))
      },
      {
        children: "Cancel",
        color: "c-nav-fg-alt",
        disabled: isLoading,
        onClick: () => dispatch(adt("showModal", "cancel" as const))
      }
    ]);
  }),
  getAlerts: getAlertsValid((state) => ({
    ...component_.page.alerts.empty(),
    errors: state.showErrorAlert
      ? [
          {
            text: `We were unable to ${state.showErrorAlert} your opportunity. Please fix the errors in the form below and try again.`,
            dismissMsg: adt("dismissErrorAlert")
          }
        ]
      : []
  })),
  getModal: getModalValid<ValidState, Msg>((state) => {
    switch (state.showModal) {
      case "publish":
        return component_.page.modal.show({
          title: "Publish Code With Us Opportunity?",
          body: () =>
            "Are you sure you want to publish this opportunity? Once published, all subscribed users will be notified.",
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Publish Opportunity",
              icon: "bullhorn",
              color: "primary",
              msg: adt("publish") as Msg,
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      case "cancel":
        return component_.page.modal.show({
          title: "Cancel New Code With Us Opportunity?",
          body: () =>
            "Are you sure you want to cancel? Any information you may have entered will be lost if you do so.",
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Yes, I want to cancel",
              color: "danger",
              msg: component_.global.newRouteMsg(
                adt("opportunities" as const, null)
              ) as Msg,
              button: true
            },
            {
              text: "Go Back",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      case null:
        return component_.page.modal.hide();
    }
  }),
  getMetadata() {
    return makePageMetadata("Create a Code With Us Opportunity");
  }
};
