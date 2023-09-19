import {
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
import * as Form from "front-end/lib/pages/proposal/code-with-us/lib/components/form";
import * as toasts from "front-end/lib/pages/proposal/code-with-us/lib/toasts";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import makeInstructionalSidebar from "front-end/lib/views/sidebar/instructional";
import React from "react";
import {
  CWUOpportunity,
  isCWUOpportunityAcceptingProposals
} from "shared/lib/resources/opportunity/code-with-us";
import {
  CreateCWUProposalStatus,
  CWUProposalStatus,
  CWUProposalSlim
} from "shared/lib/resources/proposal/code-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import { AffiliationSlim } from "shared/lib/resources/affiliation";

type ModalId = "submit" | "cancel";

export type State = Validation<Immutable<ValidState>, null>;

export interface ValidState {
  sessionUser: User;
  showModal: ModalId | null;
  opportunity: CWUOpportunity | null;
  form: Immutable<Form.State> | null;
  submitLoading: number;
  saveDraftLoading: number;
  submitTerms: Immutable<SubmitProposalTerms.State>;
}

type InnerMsg =
  | ADT<"onInitResponse", [CWUOpportunity, AffiliationSlim[]]>
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
  opportunityId: string;
}

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType({
  userType: [UserType.Vendor],
  success({ routePath, shared, routeParams }) {
    const { opportunityId } = routeParams;
    const [submitTermsState, submitTermsCmds] = SubmitProposalTerms.init({
      proposal: {
        errors: [],
        child: {
          value: false,
          id: "create-cwu-proposal-submit-terms-proposal"
        }
      },
      app: {
        errors: [],
        child: {
          value: false,
          id: "create-cwu-proposal-submit-terms-app"
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
        component_.cmd.join3(
          api.proposals.cwu.readExistingProposalForOpportunity(
            opportunityId,
            (response) => response
          ) as component_.Cmd<CWUProposalSlim | undefined>,
          api.opportunities.cwu.readOne<
            api.ResponseValidation<CWUOpportunity, string[]>
          >()(opportunityId, (response) => response),
          api.affiliations.readMany<
            api.ResponseValidation<AffiliationSlim[], string[]>
          >()((response) => response),
          (existingProposal, opportunityResponse, affiliationsResponse) => {
            // Redirect to proposal edit page if the user has already created a proposal for this opportunity.
            if (existingProposal)
              return component_.global.replaceRouteMsg(
                adt("proposalCWUEdit" as const, {
                  opportunityId,
                  proposalId: existingProposal.id
                })
              );
            // Redirect to 404 page if there is a server error when fetching opportunity.
            if (!api.isValid(opportunityResponse))
              return component_.global.replaceRouteMsg(
                adt("notFound" as const, { path: routePath })
              );
            const opportunity = opportunityResponse.value as CWUOpportunity;
            // If the opportunity is not accepting proposals, redirect to opportunity page.
            if (!isCWUOpportunityAcceptingProposals(opportunity))
              return component_.global.replaceRouteMsg(
                adt("opportunityCWUView" as const, { opportunityId })
              );
            // Otherwise, everything looks good, continue with initialization.
            const affiliations = api.getValidValue(affiliationsResponse, []);
            return adt("onInitResponse", [opportunity, affiliations] as const);
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

const update: component_.page.Update<State, InnerMsg, Route> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "onInitResponse": {
        const [opportunity, affiliations] = msg.value;
        const [formState, formCmds] = Form.init({
          viewerUser: state.sessionUser,
          opportunity,
          affiliations,
          canRemoveExistingAttachments: true //moot
        });
        return [
          state
            .set("form", immutable(formState))
            .set("opportunity", opportunity),
          [
            ...component_.cmd.mapMany(formCmds, (msg) => adt("form", msg)),
            component_.cmd.dispatch(component_.page.readyMsg())
          ] as component_.Cmd<Msg>[]
        ];
      }

      case "showModal":
        return [state.set("showModal", msg.value), []];

      case "hideModal":
        return [hideModal(state), []];

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
                  CWUProposalStatus.Draft as CreateCWUProposalStatus
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
            const [newFormState, persistCmds, proposal] = result.value;
            return [
              state.set("form", newFormState),
              [
                ...component_.cmd.mapMany(
                  persistCmds,
                  (msg) => adt("form", msg) as Msg
                ),
                component_.cmd.dispatch(
                  component_.global.newRouteMsg(
                    adt("proposalCWUEdit" as const, {
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
            api.users.update<Msg>()(
              state.sessionUser.id,
              adt("acceptTerms"),
              (response) =>
                adt("onSubmitAcceptTermsResponse", api.isValid(response))
            )
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
                    CWUProposalStatus.Submitted as CreateCWUProposalStatus
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
            const [newFormState, persistCmds, proposal] = result.value;
            return [
              state.set("form", newFormState),
              [
                ...component_.cmd.mapMany(persistCmds, (msg) =>
                  adt("form", msg)
                ),
                component_.cmd.dispatch(
                  component_.global.newRouteMsg(
                    adt("proposalCWUEdit" as const, {
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

      case "submitTerms":
        return component_.base.updateChild({
          state,
          childStatePath: ["submitTerms"],
          childUpdate: SubmitProposalTerms.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("submitTerms", value)
        });

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
    const form = state.form;
    if (!form) return null;
    const isSubmitLoading = state.submitLoading > 0;
    const isSaveDraftLoading = state.saveDraftLoading > 0;
    const isLoading = isSubmitLoading || isSaveDraftLoading;
    return (
      <Form.view
        state={form}
        dispatch={component_.base.mapDispatch(dispatch, (value) =>
          adt("form" as const, value)
        )}
        disabled={isLoading}
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
      getTitle: () => "Create a Code With Us Proposal",
      getDescription: (state) => {
        const opportunity = state.opportunity;
        if (!opportunity) return null;
        return (
          <div className="d-flex flex-column nowrap">
            <Link
              newTab
              dest={routeDest(
                adt("opportunityCWUView", { opportunityId: opportunity.id })
              )}
              className="mb-3">
              {opportunity.title}
            </Link>
            <p className="mb-0">
              Use the form provided to create your proposal for this{" "}
              <em>Code With Us</em> opportunity. You can either save a draft of
              your proposal to complete the form at a later time, or you can
              complete the form now to submit your proposal immediately.
            </p>
          </div>
        );
      },
      getFooter: () => (
        <span>
          Need help?{" "}
          <Link dest={routeDest(adt("cwuVendorGuide", null))}>
            Read the guide
          </Link>{" "}
          to learn how to create and manage a <em>Code With Us</em> proposal.
        </span>
      )
    })
  }),

  getModal: getModalValid<ValidState, Msg>((state) => {
    const opportunity = state.opportunity;
    if (!opportunity) return component_.page.modal.hide();
    const hasAcceptedTerms =
      SubmitProposalTerms.getProposalCheckbox(state.submitTerms) &&
      SubmitProposalTerms.getAppCheckbox(state.submitTerms);
    switch (state.showModal) {
      case "submit":
        return component_.page.modal.show({
          title: "Review Terms and Conditions",
          body: (dispatch) => (
            <SubmitProposalTerms.view
              opportunityType="Code With Us"
              action="submitting"
              termsTitle="Code With Us Terms & Conditions"
              termsRoute={adt(
                "contentView",
                "code-with-us-terms-and-conditions"
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
          title: "Cancel New Code With Us Proposal?",
          body: () =>
            "Are you sure you want to cancel? Any information you may have entered will be lost if you do so.",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Yes, I want to cancel",
              color: "danger",
              msg: component_.global.newRouteMsg(
                adt("opportunityCWUView" as const, {
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
    return makePageMetadata(
      state.opportunity
        ? `Create Code With Us Proposal — ${state.opportunity.title}`
        : "Create Code With Us Proposal"
    );
  }, makePageMetadata("Create Code With Us Proposal")),

  getActions: getActionsValid(({ state, dispatch }) => {
    const form = state.form;
    if (!form) return component_.page.actions.none();
    const isSubmitLoading = state.submitLoading > 0;
    const isSaveDraftLoading = state.saveDraftLoading > 0;
    const isLoading = isSubmitLoading || isSaveDraftLoading;
    const isValid = () => Form.isValid(form);
    return component_.page.actions.links([
      {
        children: "Submit",
        symbol_: leftPlacement(iconLinkSymbol("paper-plane")),
        button: true,
        loading: isSubmitLoading,
        disabled: isLoading || !isValid(),
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
  })
};
