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
import { DEFAULT_LOCATION } from "front-end/config";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Form from "front-end/lib/pages/opportunity/team-with-us/lib/components/form";
import * as toasts from "front-end/lib/pages/opportunity/team-with-us/lib/toasts";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import makeInstructionalSidebar from "front-end/lib/views/sidebar/instructional";
import React from "react";
import {
  TWUOpportunity,
  TWUOpportunityStatus,
  TWUServiceArea
} from "shared/lib/resources/opportunity/team-with-us";
import { isAdmin, User, UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import { GUIDE_AUDIENCE } from "front-end/lib/pages/guide/view";
import { useCopilotChat, useCopilotReadable } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { UNIFIED_SYSTEM_INSTRUCTIONS } from "front-end/lib/pages/opportunity/team-with-us/lib/ai";

// import ActionDebugPanel from "front-end/lib/pages/opportunity/team-with-us/lib/action-debug";
import { useCopilotActions } from "front-end/lib/pages/opportunity/team-with-us/lib/hooks/use-copilot-actions";
// import { ReviewActions } from "front-end/lib/pages/opportunity/team-with-us/lib/components/review-actions";

// Debug flag to enable test data initialization
const ENABLE_TEST_DATA = false; // Set to true to enable test data

// Function to derive opportunity from form state without saving
function deriveOpportunityFromForm(
  form: Immutable<Form.State>,
  viewerUser: User
): TWUOpportunity | null {
  // if (!Form.isValid(form)) return null;

  // Use the same logic as Form.persist but without API calls
  const values = Form.getValues(form);

  // Transform the values into opportunity format
  return {
    id: "draft", // Temporary ID for draft state
    title: values.title || "",
    teaser: values.teaser || "",
    remoteOk: values.remoteOk,
    remoteDesc: values.remoteDesc || "",
    location: values.location || "",
    proposalDeadline: values.proposalDeadline
      ? new Date(values.proposalDeadline)
      : new Date(),
    assignmentDate: values.assignmentDate
      ? new Date(values.assignmentDate)
      : new Date(),
    startDate: values.startDate ? new Date(values.startDate) : new Date(),
    completionDate: values.completionDate
      ? new Date(values.completionDate)
      : new Date(),
    maxBudget: values.maxBudget || 0,
    questionsWeight: values.questionsWeight || 0,
    challengeWeight: values.challengeWeight || 0,
    priceWeight: values.priceWeight || 0,
    description: values.description || "",
    resources: (values.resources || []).map((resource, index) => ({
      ...resource,
      id: `draft-resource-${index}`,
      serviceArea: resource.serviceArea as any // Cast to satisfy type requirements
    })),
    resourceQuestions: (values.resourceQuestions || []).map(
      (question, index) => ({
        ...question,
        id: `draft-question-${index}`,
        createdAt: new Date(),
        createdBy: viewerUser
      })
    ),
    status: TWUOpportunityStatus.Draft,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: viewerUser,
    updatedBy: viewerUser,
    publishedAt: undefined,
    reporting: undefined,
    history: [],
    attachments: [],
    addenda: []
  };
}

// Test data generator function
function createTestOpportunity(viewerUser: User): TWUOpportunity {
  return {
    id: "test-opportunity-id",
    title: "Digital Service Enhancement Project",
    teaser:
      "Enhance and modernize digital services for better user experience and streamlined operations.",
    remoteOk: true,
    remoteDesc: "Remote work is acceptable for this project.",
    location: "Toronto",
    proposalDeadline: new Date("2024-07-12"),
    assignmentDate: new Date("2024-07-15"),
    startDate: new Date("2024-08-01"),
    completionDate: new Date("2025-01-31"),
    maxBudget: 200000,
    questionsWeight: 30,
    challengeWeight: 40,
    priceWeight: 30,
    description:
      "Modernization of digital platforms, integration of analytics, and user-focused enhancements. Deliverables include updated platforms, documentation, training, and dashboards.",
    resources: [
      {
        id: "test-resource-1",
        serviceArea: TWUServiceArea.FullStackDeveloper,
        targetAllocation: 100,
        mandatorySkills: ["JavaScript", "React", "Node.js", "REST APIs"],
        optionalSkills: ["Agile", "TypeScript"],
        order: 1
      },
      {
        id: "test-resource-2",
        serviceArea: TWUServiceArea.DataProfessional,
        targetAllocation: 100,
        mandatorySkills: ["SQL", "Python", "Data Visualization"],
        optionalSkills: ["ETL", "Stakeholder Engagement"],
        order: 2
      }
    ],
    resourceQuestions: [
      {
        question: "What experience do you have with React and Node.js?",
        guideline:
          "Please provide specific examples of React applications you have built.",
        score: 5,
        wordLimit: 500,
        order: 1,
        createdAt: new Date(),
        createdBy: viewerUser
      },
      {
        question:
          "How would you approach data visualization for executive dashboards?",
        guideline:
          "Describe your experience with data visualization tools and methodologies.",
        score: 5,
        wordLimit: 500,
        order: 2,
        createdAt: new Date(),
        createdBy: viewerUser
      }
    ],
    status: TWUOpportunityStatus.Draft,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: viewerUser,
    updatedBy: viewerUser,
    publishedAt: undefined,
    reporting: undefined,
    history: [],
    attachments: [],
    addenda: []
  };
}

type TWUCreateSubmitStatus =
  | TWUOpportunityStatus.Published
  | TWUOpportunityStatus.UnderReview;

type ModalId = ADT<"publish", TWUCreateSubmitStatus> | ADT<"cancel">;

interface ValidState {
  routePath: string;
  showModal: ModalId | null;
  publishLoading: number;
  saveDraftLoading: number;
  viewerUser: User;
  form: Immutable<Form.State>;
  opportunity: TWUOpportunity | null;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg =
  | ADT<"onInitResponse", api.ResponseValidation<User[], string[]>>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"publish", TWUCreateSubmitStatus>
  | ADT<"onPublishResponse", [TWUCreateSubmitStatus, Form.PersistResult]>
  | ADT<"saveDraft">
  | ADT<"onSaveDraftResponse", Form.PersistResult>
  | ADT<"startGuidedCreation">
  | ADT<"triggerGuidedCreation">
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
    // Create test data if enabled
    const testOpportunity = ENABLE_TEST_DATA
      ? createTestOpportunity(shared.sessionUser)
      : undefined;

    const [formState, formCmds] = Form.init({
      opportunity: testOpportunity,
      canRemoveExistingAttachments: true, //moot
      viewerUser: shared.sessionUser,
      users: []
    });

    const derivedOpportunity =
      testOpportunity ||
      deriveOpportunityFromForm(immutable(formState), shared.sessionUser);

    return [
      valid(
        immutable({
          routePath,
          showModal: null,
          publishLoading: 0,
          saveDraftLoading: 0,
          viewerUser: shared.sessionUser,
          form: immutable(formState),
          opportunity: derivedOpportunity
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

        // Create test data if enabled
        const testOpportunity = ENABLE_TEST_DATA
          ? createTestOpportunity(state.viewerUser)
          : undefined;

        const [formState, formCmds] = Form.init({
          opportunity: testOpportunity,
          canRemoveExistingAttachments: true, //moot
          viewerUser: state.viewerUser,
          users: response.value
        });

        const derivedOpportunity =
          testOpportunity ||
          deriveOpportunityFromForm(immutable(formState), state.viewerUser);

        return [
          state
            .set("form", immutable(formState))
            .set("opportunity", derivedOpportunity),
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
        const isPublish = intendedStatus === TWUOpportunityStatus.Published;
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
                    adt("opportunityTWUEdit", {
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
                      "success",
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
                adt("create", TWUOpportunityStatus.Draft)
              ),
              (result) => adt("onSaveDraftResponse", result) as Msg
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
                    adt("opportunityTWUEdit", {
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
          default: {
            // Check if it's an evaluation panel error and provide specific guidance
            const formErrors = result.value?.evaluationPanel;
            let errorMessage = toasts.draftCreated.error;

            if (
              formErrors &&
              Array.isArray(formErrors) &&
              formErrors.length > 0
            ) {
              errorMessage = {
                title: "Evaluation Panel Required",
                body: "Please complete the 'Evaluation Panel' tab. Make sure to select valid users for all evaluators."
              };
              // Navigate to evaluation panel tab
              const switchTabMsg = adt(
                "form",
                adt(
                  "tabbedForm",
                  adt("setActiveTab", "Evaluation Panel" as const)
                )
              );
              return [
                state.set("form", result.value),
                [
                  component_.cmd.dispatch(switchTabMsg as Msg),
                  component_.cmd.dispatch(
                    component_.global.showToastMsg(adt("error", errorMessage))
                  )
                ]
              ];
            } else if (result.value?.resources) {
              errorMessage = {
                title: "Resource Details Required",
                body: `Please complete the 'Resource Details' tab by adding at least one resource with a service area and target allocation.`
              };
              const switchTabMsg = adt(
                "form",
                adt(
                  "tabbedForm",
                  adt("setActiveTab", "Resource Details" as const)
                )
              );
              return [
                state.set("form", result.value),
                [
                  component_.cmd.dispatch(switchTabMsg as Msg),
                  component_.cmd.dispatch(
                    component_.global.showToastMsg(adt("error", errorMessage))
                  )
                ]
              ];
            }

            return [
              state.set("form", result.value),
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(adt("error", errorMessage))
                )
              ]
            ];
          }
        }
      }
      case "startGuidedCreation":
        return [
          state.set("showModal", null),
          [component_.cmd.dispatch(adt("triggerGuidedCreation"))]
        ];
      case "triggerGuidedCreation":
        // Simply open the CopilotKit chat window
        setTimeout(() => {
          const copilotButton = document.querySelector(
            ".copilotKitButton"
          ) as HTMLButtonElement;
          if (copilotButton) {
            copilotButton.click();
          }
        }, 100);
        return [state, []];
      case "form": {
        const [newFormState, newFormCmds] = component_.base.updateChild({
          state,
          childStatePath: ["form"],
          childUpdate: Form.update,
          childMsg: msg.value,
          mapChildMsg: (value) => value
        });
        const derivedOpportunity = deriveOpportunityFromForm(
          newFormState.form,
          state.viewerUser
        );
        return [
          newFormState.set("opportunity", derivedOpportunity),
          newFormCmds.map((cmd) =>
            component_.cmd.map(cmd, (msg) => adt("form", msg) as Msg)
          )
        ];
      }
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

    // Add creation progress context to help guide the AI through the workflow
    useCopilotReadable({
      description:
        "Current creation progress and form completion status for guided creation workflow",
      value: {
        creationMode: "create", // Always in create mode on this page
        formProgress: {
          hasTitle: (state.form?.title?.child.value || "").trim().length > 0,
          hasTeaser: (state.form?.teaser?.child.value || "").trim().length > 0,
          hasDescription:
            (state.form?.description?.child.value || "").trim().length > 0,
          hasLocation:
            state.form?.location?.child.value &&
            state.form.location.child.value.trim() !== DEFAULT_LOCATION,
          hasProposalDeadline: !!state.form?.proposalDeadline?.child.value,
          hasStartDate: !!state.form?.startDate?.child.value,
          hasCompletionDate: !!state.form?.completionDate?.child.value,
          hasBudget: !!(
            state.form?.maxBudget?.child.value &&
            state.form.maxBudget.child.value > 0
          ),
          resourceCount: (state.form?.resources?.resources || []).length,
          questionCount: (state.form?.resourceQuestions?.questions || [])
            .length,
          currentValues: {
            title: state.form?.title?.child.value || "",
            teaser: state.form?.teaser?.child.value || "",
            location: state.form?.location?.child.value || DEFAULT_LOCATION,
            maxBudget: state.form?.maxBudget?.child.value || null,
            proposalDeadline: state.form?.proposalDeadline?.child.value || null,
            startDate: state.form?.startDate?.child.value || null,
            completionDate: state.form?.completionDate?.child.value || null
          }
        },
        nextSteps: (() => {
          if (!state.form?.title?.child.value) return "Need project title";
          if (!state.form?.teaser?.child.value) return "Need project summary";
          if (
            !state.form?.location?.child.value ||
            state.form.location.child.value === DEFAULT_LOCATION
          )
            return "Need project location";
          if (!state.form?.proposalDeadline?.child.value)
            return "Need proposal deadline";
          if (!state.form?.assignmentDate?.child.value)
            return "Need contract award date";
          if (!state.form?.startDate?.child.value)
            return "Need contract start date";
          if (!state.form?.completionDate?.child.value)
            return "Need contract end date";
          if (!state.form?.maxBudget?.child.value)
            return "Need budget information";
          if ((state.form?.resources?.resources || []).length === 0)
            return "Need resource requirements";
          if (!state.form?.description?.child.value)
            return "Need detailed description";
          if ((state.form?.resourceQuestions?.questions || []).length === 0)
            return "Need evaluation questions";
          return "Ready for final review";
        })()
      }
    });

    const { visibleMessages, appendMessage } = useCopilotChat();

    // Update refs when functions change
    // React.useEffect(() => {
    //   // Make functions globally accessible for actions
    //   (window as any).__copilotAppendMessage = appendMessage;
    //   (window as any).__copilotResetMessages = reset; // Use reset instead of setMessages
    //   (window as any).__copilotMessages = visibleMessages; // Note: deprecated format
    //   (window as any).__copilotCreationWelcome = CREATION_WELCOME_MESSAGE;
    //   (window as any).__guidedCreationActive = false;

    //   // Cleanup on unmount
    //   return () => {
    //     delete (window as any).__copilotAppendMessage;
    //     delete (window as any).__copilotResetMessages;
    //     delete (window as any).__copilotMessages;
    //     delete (window as any).__copilotCreationWelcome;
    //     delete (window as any).__guidedCreationActive;
    //   };
    // }, [appendMessage, reset, visibleMessages]);

    // Add criteria mapping support for chat responses
    //     React.useEffect(() => {
    //       const handleNewMessages = () => {
    //         if (!visibleMessages || visibleMessages.length === 0) return;

    //         const lastMessage = visibleMessages[
    //           visibleMessages.length - 1
    //         ] as TextMessage;
    //         if (lastMessage && lastMessage.role === Role.User) {
    //           // Changed from Role.User
    //           const userQuestion = lastMessage.content;

    //           if (isCriteriaRelatedQuestion(userQuestion)) {
    //             const relevantCriteria = identifyRelevantCriteria(userQuestion);
    //             const citationText = generateEnhancedCitationText(relevantCriteria);

    //             // Add citation context to help the AI provide better responses
    //             setTimeout(() => {
    //               appendMessage(
    //                 new TextMessage({
    //                   content: `CONTEXT FOR AI: The user asked a criteria-related question. Include these document references in your response:${citationText}

    // Please provide a comprehensive answer that references these authoritative sources and explains how they apply to Team With Us opportunities.`,
    //                   role: Role.System, // Changed from Role.System
    //                   id: Math.random().toString()
    //                 })
    //               );
    //             }, 100);
    //           }
    //         }
    //       };

    //       handleNewMessages();
    //     }, [visibleMessages, appendMessage]);

    // Store references globally for the component method to access
    React.useEffect(() => {
      (window as any).__copilotAppendMessage = appendMessage;
      (window as any).__copilotVisibleMessages = visibleMessages;
    }, [appendMessage, visibleMessages]);

    // useEffect(() => {
    //   // Add a system message explaining how to use actions (only once when no messages)
    //   // Don't send if guided creation is active - it will send its own welcome message
    //   // const isGuidedCreationActive = (window as any).__guidedCreationActive;
    //   if (
    //     visibleMessages &&
    //     visibleMessages.length === 0 //&&
    //     // !isGuidedCreationActive
    //   ) {
    //     appendMessage(
    //       new TextMessage({
    //         content: UNIFIED_SYSTEM_INSTRUCTIONS,
    //         role: Role.System,
    //         id: "action-instructions-create"
    //       })
    //     );
    //   }
    // }, [visibleMessages, appendMessage]);

    useCopilotActions({ state, dispatch, context: "create" });

    return (
      <div style={{ position: "relative" }}>
        {/* <ActionDebugPanel /> */}
        {/* <ReviewActions state={state} dispatch={dispatch} context="create" /> */}
        <Form.view
          state={state.form}
          dispatch={component_.base.mapDispatch(dispatch, (v) =>
            adt("form" as const, v)
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
      getTitle: () => "Create a Team With Us Opportunity",
      getDescription: (state) => (
        <div>
          <p>
            <em>Team With Us</em> opportunities are used to procure an Agile
            product development team for your digital service at a variable
            cost.
          </p>
          <p className="mb-0">
            Use the form provided to create your <em>Team With Us</em>{" "}
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
              adt("twuGuide", {
                guideAudience: GUIDE_AUDIENCE.Ministry
              })
            )}>
            Read the guide
          </Link>{" "}
          to learn how to create and manage a <em>Team With Us</em> opportunity.
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

    const buttonText = "Create with AI"; // Pure creation workflow

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
              "publish",
              isViewerAdmin
                ? TWUOpportunityStatus.Published
                : TWUOpportunityStatus.UnderReview
            ) as Msg
          )
      },
      {
        children: buttonText,
        symbol_: leftPlacement(iconLinkSymbol("question-circle")),
        disabled: isLoading,
        button: true,
        color: "info",
        onClick: () => {
          // Simply open the CopilotKit chat window
          dispatch(adt("startGuidedCreation"));
        }
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
            publishStatus === TWUOpportunityStatus.Published
              ? "Publish Team With Us Opportunity?"
              : "Submit Opportunity for Review?",
          body: () =>
            publishStatus === TWUOpportunityStatus.Published
              ? "Are you sure you want to publish this opportunity? Once published, all subscribed users will be notified."
              : "Are you sure you want to submit this Team With Us opportunity for review? Once submitted, an administrator will review it and may reach out to you to request changes before publishing it.",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text:
                publishStatus === TWUOpportunityStatus.Published
                  ? "Publish Opportunity"
                  : "Submit for Review",
              icon:
                publishStatus === TWUOpportunityStatus.Published
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
          title: "Cancel New Team With Us Opportunity?",
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
  getSidebarOpenCallback: () => {
    // console.log("Create page getSidebarOpenCallback called with state:", state);
    // console.log("Create page getSidebarOpenCallback method exists!");

    return (isOpen: boolean) => {
      // console.log("Create page getSidebarOpenCallback: sidebar open:", isOpen);
      if (!isOpen) return;

      // For create page, check if no messages exist
      const visibleMessages = (window as any).__copilotVisibleMessages;
      if (visibleMessages && visibleMessages.length > 0) {
        // console.log(
        //   "Messages already exist, skipping system message for create"
        // );
        return;
      }

      // console.log("appending system message for create");

      const appendMessage = (window as any).__copilotAppendMessage;

      if (appendMessage) {
        appendMessage(
          new TextMessage({
            content: UNIFIED_SYSTEM_INSTRUCTIONS,
            role: Role.System,
            id: "action-instructions-create"
          })
        );
      }
    };
  },
  getMetadata() {
    return makePageMetadata("Create a Team With Us Opportunity");
  }
};
