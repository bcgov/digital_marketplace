import { SWU_PROPOSAL_EVALUATION_CONTENT_ID } from "front-end/config";
import {
  getAlertsValid,
  getActionsValid,
  getMetadataValid,
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
import * as SubmitProposalTerms from "front-end/lib/components/submit-proposal-terms";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Form from "front-end/lib/pages/proposal/sprint-with-us/lib/components/form";
import * as toasts from "front-end/lib/pages/proposal/sprint-with-us/lib/toasts";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import makeInstructionalSidebar from "front-end/lib/views/sidebar/instructional";
import React from "react";
import {
  isSWUOpportunityAcceptingProposals,
  SWUOpportunity
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateSWUProposalStatus,
  SWUProposalStatus,
  SWUProposalSlim
} from "shared/lib/resources/proposal/sprint-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { ADT, adt, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import { OrganizationSlim } from "shared/lib/resources/organization";

type ModalId = "submit" | "cancel";

interface ValidState {
  sessionUser: User;
  showModal: ModalId | null;
  submitLoading: number;
  saveDraftLoading: number;
  opportunity: SWUOpportunity | null;
  form: Immutable<Form.State> | null;
  submitTerms: Immutable<SubmitProposalTerms.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg =
  | ADT<"onInitResponse", [SWUOpportunity, OrganizationSlim[], string]>
  | ADT<"hideModal">
  | ADT<"showModal", ModalId>
  | ADT<"form", Form.Msg>
  | ADT<"submitTerms", SubmitProposalTerms.Msg>
  | ADT<"submit">
  | ADT<"onSubmitAcceptTermsResponse", boolean>
  | ADT<"onSubmitPersistResponse", Form.PersistResult>
  | ADT<"saveDraft">
  | ADT<"onSaveDraftResponse", Form.PersistResult>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: Id;
}

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType({
  userType: [UserType.Vendor],
  success({ routeParams, shared, routePath }) {
    const { opportunityId } = routeParams;
    const [submitTermsState, submitTermsCmds] = SubmitProposalTerms.init({
      proposal: {
        errors: [],
        child: {
          value: false,
          id: "create-swu-proposal-submit-terms-proposal"
        }
      },
      app: {
        errors: [],
        child: {
          value: false,
          id: "create-swu-proposal-submit-terms-app"
        }
      }
    });
    return [
      valid(
        immutable({
          sessionUser: shared.sessionUser,
          showModal: null,
          submitLoading: 0,
          saveDraftLoading: 0,
          opportunity: null,
          form: null,
          submitTerms: immutable(submitTermsState)
        })
      ),
      [
        ...component_.cmd.mapMany(submitTermsCmds, (msg) =>
          adt("submitTerms", msg)
        ),
        // Make necessary network requests
        component_.cmd.join4(
          api.proposals.swu.readExistingProposalForOpportunity(
            opportunityId,
            (response) => response
          ) as component_.Cmd<SWUProposalSlim | undefined>,
          api.opportunities.swu.readOne(opportunityId, (response) =>
            api.isValid(response) ? response.value : null
          ) as component_.Cmd<SWUOpportunity | null>,
          api.organizations.owned.readMany((response) =>
            api.getValidValue(response, [])
          ) as component_.Cmd<OrganizationSlim[]>,
          api.content.readOne(SWU_PROPOSAL_EVALUATION_CONTENT_ID, (response) =>
            api.isValid(response) ? response.value.body : ""
          ) as component_.Cmd<string>,
          (existingProposal, opportunity, orgs, evalBody) => {
            // Redirect to proposal edit page if the user has already created a proposal for this opportunity.
            if (existingProposal)
              return component_.global.replaceRouteMsg(
                adt("proposalSWUEdit" as const, {
                  opportunityId,
                  proposalId: existingProposal.id
                })
              );
            // Redirect to 404 page if there is a server error when fetching opportunity.
            if (!opportunity || !evalBody)
              return component_.global.replaceRouteMsg(
                adt("notFound" as const, { path: routePath })
              );
            // If the opportunity is not accepting proposals, redirect to opportunity page.
            if (!isSWUOpportunityAcceptingProposals(opportunity))
              return component_.global.replaceRouteMsg(
                adt("opportunitySWUView" as const, { opportunityId })
              );
            // Otherwise, everything looks good, continue with initialization.
            return adt("onInitResponse", [opportunity, orgs, evalBody]) as Msg;
          }
        )
      ] as component_.Cmd<Msg>[]
    ];
  },
  fail({ routePath }) {
    return [
      invalid(null) as State,
      [
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            adt("notFound" as const, { path: routePath })
          )
        )
      ]
    ];
  }
});

const startSubmitLoading = makeStartLoading<ValidState>("submitLoading");
const stopSubmitLoading = makeStopLoading<ValidState>("submitLoading");
const startSaveDraftLoading = makeStartLoading<ValidState>("saveDraftLoading");
const stopSaveDraftLoading = makeStopLoading<ValidState>("saveDraftLoading");

function hideModal(state: Immutable<ValidState>): Immutable<ValidState> {
  return state
    .set("showModal", null)
    .update("submitTerms", (s) =>
      SubmitProposalTerms.setProposalCheckbox(s, false)
    )
    .update("submitTerms", (s) => SubmitProposalTerms.setAppCheckbox(s, false));
}

const update: component_.base.Update<State, Msg> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "onInitResponse": {
        const [opportunity, organizations, evaluationContent] = msg.value;
        const [formState, formCmds] = Form.init({
          viewerUser: state.sessionUser,
          opportunity,
          organizations,
          evaluationContent
        });
        return [
          state
            .set("opportunity", opportunity)
            .set("form", immutable(formState)),
          [
            ...component_.cmd.mapMany(
              formCmds,
              (msg) => adt("form", msg) as Msg
            ),
            component_.cmd.dispatch(component_.page.readyMsg())
          ]
        ];
      }
      case "saveDraft": {
        const form = state.form;
        if (!form) return [state, []];
        state = hideModal(state);
        return [
          startSaveDraftLoading(state),
          [
            component_.cmd.map(
              Form.persist(
                form,
                adt(
                  "create",
                  SWUProposalStatus.Draft as CreateSWUProposalStatus
                )
              ),
              (result) => adt("onSaveDraftResponse", result) as Msg
            )
          ]
        ];
      }

      case "onSaveDraftResponse": {
        state = stopSaveDraftLoading(state);
        const result = msg.value;
        switch (result.tag) {
          case "valid": {
            const [newFormState, proposal] = result.value;
            return [
              state.set("form", newFormState),
              [
                component_.cmd.dispatch(
                  component_.global.newRouteMsg(
                    adt("proposalSWUEdit" as const, {
                      proposalId: proposal.id,
                      opportunityId: proposal.opportunity.id
                    })
                  )
                ),
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("success", toasts.draftCreated.success)
                  )
                )
              ] as component_.Cmd<Msg>[]
            ];
          }
          case "invalid":
          default:
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

      case "submit": {
        const form = state.form;
        if (!form) return [state, []];
        state = hideModal(state);
        return [
          startSubmitLoading(state),
          [
            api.users.update(
              state.sessionUser.id,
              adt("acceptTerms"),
              (response) =>
                adt("onSubmitAcceptTermsResponse", api.isValid(response))
            ) as component_.Cmd<Msg>
          ]
        ];
      }

      case "onSubmitAcceptTermsResponse": {
        const termsAcceptedSuccessfully = msg.value;
        const form = state.form;
        if (form && termsAcceptedSuccessfully) {
          return [
            state,
            [
              component_.cmd.map(
                Form.persist(
                  form,
                  adt(
                    "create",
                    SWUProposalStatus.Submitted as CreateSWUProposalStatus
                  )
                ),
                (result) => adt("onSubmitPersistResponse", result)
              ) as component_.Cmd<Msg>
            ]
          ];
        } else {
          return [
            stopSubmitLoading(state),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.submitted.error)
                )
              )
            ]
          ];
        }
      }

      case "onSubmitPersistResponse": {
        state = stopSubmitLoading(state);
        const result = msg.value;
        switch (result.tag) {
          case "valid": {
            const [newFormState, proposal] = result.value;
            return [
              state.set("form", newFormState),
              [
                component_.cmd.dispatch(
                  component_.global.newRouteMsg(
                    adt("proposalSWUEdit" as const, {
                      proposalId: proposal.id,
                      opportunityId: proposal.opportunity.id
                    })
                  )
                ),
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("success", toasts.submitted.success)
                  )
                )
              ] as component_.Cmd<Msg>[]
            ];
          }
          case "invalid":
          default:
            return [
              state.set("form", result.value),
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("error", toasts.submitted.error)
                  )
                )
              ]
            ];
        }
      }

      case "showModal":
        return [state.set("showModal", msg.value), []];

      case "hideModal":
        return [hideModal(state), []];

      case "form":
        return component_.base.updateChild({
          state,
          childStatePath: ["form"],
          childUpdate: Form.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("form", value)
        });

      case "submitTerms":
        return component_.base.updateChild({
          state,
          childStatePath: ["submitTerms"],
          childUpdate: SubmitProposalTerms.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("submitTerms", value)
        });

      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state, dispatch }) => {
    const form = state.form;
    if (!form) return null;
    return (
      <Form.view
        state={form}
        dispatch={component_.base.mapDispatch(dispatch, (v) =>
          adt("form" as const, v)
        )}
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
      getTitle: () => "Create a Sprint With Us Proposal",
      getDescription: (state) => {
        const opportunity = state.opportunity;
        if (!opportunity) return null;
        return (
          <div className="d-flex flex-column nowrap">
            <Link
              newTab
              dest={routeDest(
                adt("opportunitySWUView", {
                  opportunityId: opportunity.id
                })
              )}
              className="mb-3">
              {opportunity.title}
            </Link>
            <p className="mb-0">
              Use the form provided to create your proposal for this{" "}
              <em>Sprint With Us</em> opportunity. You can either save a draft
              of your proposal to complete the form at a later time, or you can
              complete the form now to submit your proposal immediately.
            </p>
          </div>
        );
      },
      getFooter: () => (
        <span>
          Need help?{" "}
          <Link
            dest={routeDest(
              adt("contentView", "sprint-with-us-proposal-guide")
            )}>
            Read the guide
          </Link>{" "}
          to learn how to create and manage a <em>Sprint With Us</em> proposal.
        </span>
      )
    })
  }),

  getAlerts: getAlertsValid<ValidState, Msg>((state) => {
    return state.form
      ? Form.getAlerts(state.form)
      : component_.page.alerts.empty();
  }),

  getActions: getActionsValid(({ state, dispatch }) => {
    const isSubmitLoading = state.submitLoading > 0;
    const isSaveDraftLoading = state.saveDraftLoading > 0;
    const isLoading = isSubmitLoading || isSaveDraftLoading;
    const isValid = !!state.form && Form.isValid(state.form);
    return component_.page.actions.links([
      {
        children: "Submit",
        symbol_: leftPlacement(iconLinkSymbol("paper-plane")),
        button: true,
        loading: isSubmitLoading,
        disabled: isLoading || isValid,
        color: "primary",
        onClick: () => dispatch(adt("showModal", "submit" as const))
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

  getModal: getModalValid((state) => {
    const form = state.form;
    const opportunity = state.opportunity;
    if (!form || !opportunity) return component_.page.modal.hide();
    const formModal = component_.page.modal.map(
      Form.getModal(form),
      (msg) => adt("form", msg) as Msg
    );
    if (formModal !== null) {
      return formModal;
    }
    const hasAcceptedTerms =
      SubmitProposalTerms.getProposalCheckbox(state.submitTerms) &&
      SubmitProposalTerms.getAppCheckbox(state.submitTerms);
    switch (state.showModal) {
      case "submit":
        return component_.page.modal.show({
          title: "Review Terms and Conditions",
          body: (dispatch) => (
            <SubmitProposalTerms.view
              opportunityType="Sprint With Us"
              action="submitting"
              termsTitle="Sprint With Us Terms & Conditions"
              termsRoute={adt(
                "contentView",
                "sprint-with-us-terms-and-conditions"
              )}
              state={state.submitTerms}
              dispatch={component_.base.mapDispatch(
                dispatch,
                (msg) => adt("submitTerms", msg) as Msg
              )}
            />
          ),
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Submit Proposal",
              icon: "paper-plane",
              color: "primary",
              msg: adt("submit"),
              button: true,
              disabled: !hasAcceptedTerms
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
          title: "Cancel New Sprint With Us Proposal?",
          body: () =>
            "Are you sure you want to cancel? Any information you may have entered will be lost if you do so.",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Yes, I want to cancel",
              color: "danger",
              msg: component_.global.newRouteMsg(
                adt("opportunitySWUView" as const, {
                  opportunityId: opportunity.id
                })
              ),
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

  getMetadata: getMetadataValid((state) => {
    return state.opportunity
      ? makePageMetadata(
          `Create Sprint With Us Proposal — ${state.opportunity.title}`
        )
      : makePageMetadata("Create Sprint With Us Proposal");
  }, makePageMetadata("Create Sprint With Us Proposal"))
};
