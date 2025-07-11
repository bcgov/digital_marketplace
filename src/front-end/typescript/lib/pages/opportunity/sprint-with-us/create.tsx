import {
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
import * as api from "front-end/lib/http/api";
import * as Form from "front-end/lib/pages/opportunity/sprint-with-us/lib/components/form";
import * as toasts from "front-end/lib/pages/opportunity/sprint-with-us/lib/toasts";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import makeInstructionalSidebar from "front-end/lib/views/sidebar/instructional";
import React from "react";
import {
  FORMATTED_MAX_BUDGET,
  SWUOpportunityStatus
} from "shared/lib/resources/opportunity/sprint-with-us";
import { isAdmin, User, UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import { GUIDE_AUDIENCE } from "front-end/lib/pages/guide/view";

type SWUCreateSubmitStatus =
  | SWUOpportunityStatus.Published
  | SWUOpportunityStatus.UnderReview;

type ModalId = ADT<"publish", SWUCreateSubmitStatus> | ADT<"cancel">;

interface ValidState {
  routePath: string;
  showModal: ModalId | null;
  publishLoading: number;
  saveDraftLoading: number;
  viewerUser: User;
  form: Immutable<Form.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg =
  | ADT<"onInitResponse", api.ResponseValidation<User[], string[]>>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"publish", SWUCreateSubmitStatus>
  | ADT<"onPublishResponse", [SWUCreateSubmitStatus, Form.PersistResult]>
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
  success({ shared, routePath }) {
    const [formState, formCmds] = Form.init({
      canRemoveExistingAttachments: true, //moot
      viewerUser: shared.sessionUser,
      users: []
    });
    return [
      valid(
        immutable({
          routePath,
          showModal: null,
          publishLoading: 0,
          saveDraftLoading: 0,
          viewerUser: shared.sessionUser,
          form: immutable(formState)
        })
      ),
      [
        ...component_.cmd.mapMany(formCmds, (msg) => adt("form", msg) as Msg),
        api.users.readMany<Msg>()((response) => adt("onInitResponse", response))
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
        }
        const [formState, formCmds] = Form.init({
          canRemoveExistingAttachments: true, //moot
          viewerUser: state.viewerUser,
          users: response.value
        });
        return [
          state.set("form", immutable(formState)),
          [
            ...component_.cmd.mapMany(
              formCmds,
              (msg) => adt("form", msg) as Msg
            ),
            component_.cmd.dispatch(component_.page.readyMsg())
          ]
        ];
      }
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
              Form.persist(state.form, adt("create", msg.value)),
              (result) => adt("onPublishResponse", [msg.value, result]) as Msg
            )
          ]
        ];
      }
      case "onPublishResponse": {
        const [intendedStatus, result] = msg.value;
        const isPublish = intendedStatus === SWUOpportunityStatus.Published;
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
                    adt("opportunitySWUEdit", {
                      opportunityId: opportunity.id,
                      tab: "summary" as const
                    }) as Route
                  )
                ),
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt(
                      "success",
                      isPublish
                        ? toasts.published.success(opportunity.id)
                        : toasts.statusChanged.success(intendedStatus)
                    )
                  )
                )
              ]
            ];
          }
          case "invalid":
          default:
            state = stopPublishLoading(state);
            return [
              state.set("form", result.value),
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt(
                      "error",
                      isPublish
                        ? toasts.published.error
                        : toasts.statusChanged.error(intendedStatus)
                    )
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
                adt("create", SWUOpportunityStatus.Draft)
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
                    adt("opportunitySWUEdit", {
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
              state.set("form", result.value),
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
      <Form.view
        state={state.form}
        dispatch={component_.base.mapDispatch(dispatch, (value) =>
          adt("form" as const, value)
        )}
        disabled={isDisabled}
      />
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
      getTitle: () => "Create a Sprint With Us Opportunity",
      getDescription: (state) => (
        <div>
          <p>
            <em>Sprint With Us</em> opportunities are used to procure an Agile
            product development team for your digital service at a variable cost
            of up to {FORMATTED_MAX_BUDGET}.
          </p>
          <p className="mb-0">
            Use the form provided to create your <em>Sprint With Us</em>{" "}
            opportunity. You can either save a draft of your opportunity to
            complete the form at a later time, or you can complete the form now
            to{" "}
            {isAdmin(state.viewerUser)
              ? "publish your opportunity immediately"
              : "submit your opportunity for review to the Digital Marketplace's administrators"}
            .
          </p>
        </div>
      ),
      getFooter: () => (
        <span>
          Need help?{" "}
          <Link
            newTab
            dest={routeDest(
              adt("swuGuide", {
                guideAudience: GUIDE_AUDIENCE.Ministry
              })
            )}>
            Read the guide
          </Link>{" "}
          to learn how to create and manage a <em>Sprint With Us</em>{" "}
          opportunity.
        </span>
      )
    })
  }),
  getActions: getActionsValid(({ state, dispatch }) => {
    const isPublishLoading = state.publishLoading > 0;
    const isSaveDraftLoading = state.saveDraftLoading > 0;
    const isLoading = isPublishLoading || isSaveDraftLoading;
    const isValid = Form.isValid(state.form);
    const isViewerAdmin = isAdmin(state.viewerUser);
    return adt("links", [
      {
        children: isViewerAdmin ? "Publish" : "Submit for Review",
        symbol_: leftPlacement(
          iconLinkSymbol(isViewerAdmin ? "bullhorn" : "paper-plane")
        ),
        button: true,
        loading: isPublishLoading,
        disabled: isLoading || !isValid,
        color: "primary",
        onClick: () =>
          dispatch(
            adt(
              "showModal",
              adt(
                "publish",
                isViewerAdmin
                  ? SWUOpportunityStatus.Published
                  : SWUOpportunityStatus.UnderReview
              )
            ) as Msg
          )
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
        onClick: () => dispatch(adt("showModal", adt("cancel")) as Msg)
      }
    ]);
  }),
  getModal: getModalValid<ValidState, Msg>((state) => {
    if (!state.showModal) {
      return component_.page.modal.hide();
    }
    switch (state.showModal.tag) {
      case "publish": {
        const publishStatus = state.showModal.value;
        return component_.page.modal.show({
          title:
            publishStatus === SWUOpportunityStatus.Published
              ? "Publish Sprint With Us Opportunity?"
              : "Submit Opportunity for Review?",
          body: () =>
            publishStatus === SWUOpportunityStatus.Published
              ? "Are you sure you want to publish this opportunity? Once published, all subscribed users will be notified."
              : "Are you sure you want to submit this Sprint With Us opportunity for review? Once submitted, an administrator will review it and may reach out to you to request changes before publishing it.",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text:
                publishStatus === SWUOpportunityStatus.Published
                  ? "Publish Opportunity"
                  : "Submit for Review",
              icon:
                publishStatus === SWUOpportunityStatus.Published
                  ? ("bullhorn" as const)
                  : ("paper-plane" as const),
              color: "primary" as const,
              msg: adt("publish", publishStatus),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      }
      case "cancel":
        return component_.page.modal.show({
          title: "Cancel New Sprint With Us Opportunity?",
          body: () =>
            "Are you sure you want to cancel? Any information you may have entered will be lost if you do so.",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Yes, I want to cancel",
              color: "danger" as const,
              msg: component_.global.newRouteMsg(
                adt("opportunities" as const, null)
              ),
              button: true
            },
            {
              text: "Go Back",
              color: "secondary" as const,
              msg: adt("hideModal")
            }
          ]
        });
    }
  }),
  getMetadata() {
    return makePageMetadata("Create a Sprint With Us Opportunity");
  }
};
