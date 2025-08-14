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
import React, { useEffect } from "react";
import {
  TWUOpportunity,
  TWUOpportunityStatus
} from "shared/lib/resources/opportunity/team-with-us";
import { isAdmin, User, UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import { GUIDE_AUDIENCE } from "front-end/lib/pages/guide/view";
import { useCopilotChat, useCopilotReadable } from "@copilotkit/react-core";
import { MessageRole, Role, TextMessage } from "@copilotkit/runtime-client-gql";

import {
  opportunityToPublicState,
  CREATION_SYSTEM_INSTRUCTIONS,
  CREATION_WELCOME_MESSAGE,
  TAB_NAMES
} from "front-end/lib/pages/opportunity/team-with-us/lib/ai";
import {
  isCriteriaRelatedQuestion,
  identifyRelevantCriteria,
  generateEnhancedCitationText
} from "front-end/lib/pages/opportunity/team-with-us/lib/criteria-mapping";

// import ActionDebugPanel from "front-end/lib/pages/opportunity/team-with-us/lib/action-debug";
import { useCopilotActionWrapper } from "front-end/lib/pages/opportunity/team-with-us/lib/hooks/use-copilot-action-wrapper";

type TWUCreateSubmitStatus =
  | TWUOpportunityStatus.Published
  | TWUOpportunityStatus.UnderReview;

type ModalId = ADT<"publish", TWUCreateSubmitStatus> | ADT<"cancel">;

interface ValidState {
  routePath: string;
  showModal: ModalId | null;
  publishLoading: number;
  saveDraftLoading: number;
  reviewWithAILoading: number;
  viewerUser: User;
  form: Immutable<Form.State>;
  opportunityForReview: TWUOpportunity | null;
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
  | ADT<"reviewWithAI">
  | ADT<"onReviewWithAIResponse", Form.PersistResult>
  | ADT<"startGuidedCreation">
  | ADT<"triggerGuidedCreation">
  | ADT<"form", Form.Msg>
  | ADT<"setOpportunityForReview", TWUOpportunity>
  | ADT<"clearOpportunityForReview">
  | ADT<"analyzeOpportunity">;

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
          reviewWithAILoading: 0,
          viewerUser: shared.sessionUser,
          form: immutable(formState),
          opportunityForReview: null
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

const startReviewWithAILoading = makeStartLoading<ValidState>(
  "reviewWithAILoading"
);
const stopReviewWithAILoading = makeStopLoading<ValidState>(
  "reviewWithAILoading"
);

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
      case "reviewWithAI": {
        state = state.set("showModal", null);

        // Check if evaluation panel is properly configured
        const evaluationPanelValues = state.form
          ? state.form.evaluationPanel
          : null;
        const hasValidEvaluators =
          evaluationPanelValues &&
          state.form &&
          Form.isEvaluationPanelTabValid(state.form);

        if (!hasValidEvaluators) {
          // Navigate to evaluation panel tab and show error
          const switchTabMsg = adt(
            "form",
            adt("tabbedForm", adt("setActiveTab", "Evaluation Panel" as const))
          );

          return [
            state,
            [
              component_.cmd.dispatch(switchTabMsg as Msg),
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", {
                    title: "Evaluation Panel Required",
                    body: "Please complete the 'Evaluation Panel' tab first. You need to add at least one evaluator before creating the opportunity."
                  })
                )
              )
            ]
          ];
        }

        // Programmatically click the CopilotKit button to open the chat window
        setTimeout(() => {
          const copilotButton = document.querySelector(
            ".copilotKitButton"
          ) as HTMLButtonElement;
          if (copilotButton) {
            copilotButton.click();
          }
        }, 100);

        return [
          startReviewWithAILoading(state),
          [
            component_.cmd.map(
              Form.persist(
                state.form,
                adt("create", TWUOpportunityStatus.Draft)
              ),
              (result) => adt("onReviewWithAIResponse", result)
            )
          ]
        ];
      }
      case "onReviewWithAIResponse": {
        const result = msg.value;
        state = stopReviewWithAILoading(state);
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
                  component_.global.showToastMsg(
                    adt("success", toasts.draftCreated.success)
                  )
                ),
                component_.cmd.dispatch(
                  adt("setOpportunityForReview", opportunity) as Msg
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
        // Use globally accessible CopilotKit functions
        setTimeout(() => {
          const copilotButton = document.querySelector(
            ".copilotKitButton"
          ) as HTMLButtonElement;
          if (copilotButton) {
            copilotButton.click();
          }

          // Start guided creation using global functions
          setTimeout(() => {
            const appendMessage = (window as any).__copilotAppendMessage;
            const welcomeMessage = (window as any).__copilotCreationWelcome;

            if (appendMessage && welcomeMessage) {
              console.log(
                "🚀 Starting guided creation workflow using global functions"
              );

              // Set flag to prevent system instructions from interfering
              (window as any).__guidedCreationActive = true;

              // Clear chat and start guided creation
              // setMessages([]);
              console.log(welcomeMessage);
              setTimeout(() => {
                appendMessage(
                  new TextMessage({
                    content: welcomeMessage,
                    role: Role.Assistant,
                    id: "guided-creation"
                  })
                );

                // Reset flag after welcome message is sent
                setTimeout(() => {
                  (window as any).__guidedCreationActive = false;
                }, 100);
              }, 100);
            } else {
              console.error("❌ Global CopilotKit functions not available");
            }
          }, 200);
        }, 100);
        return [state, []];
      case "form":
        return component_.base.updateChild({
          state,
          childStatePath: ["form"],
          childUpdate: Form.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("form", value)
        });
      case "setOpportunityForReview":
        return [
          state.set("opportunityForReview", msg.value),
          [component_.cmd.dispatch(adt("analyzeOpportunity"))]
        ];
      case "clearOpportunityForReview":
        return [state.set("opportunityForReview", null), []];
      case "analyzeOpportunity":
        // This is handled by the useCopilotAction hook
        return [state, []];
      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state, dispatch }) => {
    const isPublishLoading = state.publishLoading > 0;
    const isSaveDraftLoading = state.saveDraftLoading > 0;
    const isReviewWithAILoading = state.reviewWithAILoading > 0;
    const isDisabled =
      isSaveDraftLoading || isPublishLoading || isReviewWithAILoading;

    const readableOpportunity = state.opportunityForReview
      ? opportunityToPublicState(state.opportunityForReview)
      : null;

    useCopilotReadable({
      description:
        "The Team With Us Opportunity that is currently being created or edited. This is the data that should be reviewed.",
      value: readableOpportunity
    });

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

    const { visibleMessages, appendMessage, reset } = useCopilotChat();

    // Update refs when functions change
    React.useEffect(() => {
      // Make functions globally accessible for actions
      (window as any).__copilotAppendMessage = appendMessage;
      (window as any).__copilotResetMessages = reset; // Use reset instead of setMessages
      (window as any).__copilotMessages = visibleMessages; // Note: deprecated format
      (window as any).__copilotCreationWelcome = CREATION_WELCOME_MESSAGE;
      (window as any).__guidedCreationActive = false;

      // Cleanup on unmount
      return () => {
        delete (window as any).__copilotAppendMessage;
        delete (window as any).__copilotResetMessages;
        delete (window as any).__copilotMessages;
        delete (window as any).__copilotCreationWelcome;
        delete (window as any).__guidedCreationActive;
      };
    }, [appendMessage, reset, visibleMessages]);

    // Add criteria mapping support for chat responses
    React.useEffect(() => {
      const handleNewMessages = () => {
        if (!visibleMessages || visibleMessages.length === 0) return;

        const lastMessage = visibleMessages[
          visibleMessages.length - 1
        ] as TextMessage;
        if (lastMessage && lastMessage.role === Role.User) {
          // Changed from Role.User
          const userQuestion = lastMessage.content;

          if (isCriteriaRelatedQuestion(userQuestion)) {
            const relevantCriteria = identifyRelevantCriteria(userQuestion);
            const citationText = generateEnhancedCitationText(relevantCriteria);

            // Add citation context to help the AI provide better responses
            setTimeout(() => {
              appendMessage(
                new TextMessage({
                  content: `CONTEXT FOR AI: The user asked a criteria-related question. Include these document references in your response:${citationText}

Please provide a comprehensive answer that references these authoritative sources and explains how they apply to Team With Us opportunities.`,
                  role: MessageRole.System, // Changed from Role.System
                  id: Math.random().toString()
                })
              );
            }, 100);
          }
        }
      };

      handleNewMessages();
    }, [visibleMessages, appendMessage]);

    // Add copilot action for criteria documentation lookup
    useCopilotActionWrapper("getCriteriaDocumentation", state, dispatch);

    // Add action to list all available documents with links
    useCopilotActionWrapper("listAvailableDocuments", state, dispatch);

    // Add a simple debug action to test if actions work at all
    useCopilotActionWrapper("debugTest", state, dispatch);

    // Add debug action specifically for generateQuestionsWithAI
    useCopilotActionWrapper("debugGenerateQuestionsWithAI", state, dispatch);

    // Add debug action for resource selection
    useCopilotActionWrapper("debugResourceSelection", state, dispatch);

    // Add action to update opportunity description
    useCopilotActionWrapper("updateOpportunityDescription", state, dispatch);

    // Action to get current creation progress and next steps
    useCopilotActionWrapper("getCreationProgress", state, dispatch);

    // Action to advance to next creation step
    useCopilotActionWrapper("getNextCreationStep", state, dispatch);

    // Comprehensive action to update any form field during creation
    useCopilotActionWrapper("updateOpportunityField", state, dispatch);

    // Action to get current field values during creation
    useCopilotActionWrapper("getOpportunityFieldValue", state, dispatch);

    // ==================== QUESTION MANAGEMENT ACTIONS ====================

    // Action to delete a question
    useCopilotActionWrapper("deleteQuestion", state, dispatch);

    // Action to update a question
    useCopilotActionWrapper("updateQuestion", state, dispatch);

    // Action to get question details
    useCopilotActionWrapper("getQuestionDetails", state, dispatch);

    // ==================== RESOURCE MANAGEMENT ACTIONS ====================

    // Action to add a new resource during creation
    useCopilotActionWrapper("addResource", state, dispatch);

    // Action to delete a resource during creation
    useCopilotActionWrapper("deleteResource", state, dispatch);

    // Action to update resource fields during creation
    useCopilotActionWrapper("updateResource", state, dispatch);

    // Action to get resource details during creation
    useCopilotActionWrapper("getResourceDetails", state, dispatch);

    // Add initial system message with action instructions
    useEffect(() => {
      // Add a system message explaining how to use actions (only once when no messages)
      // Don't send if guided creation is active - it will send its own welcome message
      const isGuidedCreationActive = (window as any).__guidedCreationActive;
      if (
        visibleMessages &&
        visibleMessages.length === 0 &&
        !isGuidedCreationActive
      ) {
        appendMessage(
          new TextMessage({
            content: CREATION_SYSTEM_INSTRUCTIONS,
            role: Role.System,
            id: "action-instructions-create"
          })
        );
      }
    }, [visibleMessages, appendMessage]);

    useEffect(() => {
      if (state.opportunityForReview) {
        // Clear chat history first for a fresh conversation
        reset(); // This replaces setMessages([])

        // Append the system message
        appendMessage(
          new TextMessage({
            content: `Please review this Team With Us opportunity and provide feedback based on the evaluation criteria. Here's the opportunity data:

${JSON.stringify(readableOpportunity, null, 2)}

${CREATION_SYSTEM_INSTRUCTIONS}`,
            role: Role.System,
            id: Math.random().toString()
          })
        );

        dispatch(adt("clearOpportunityForReview"));
      }
    }, [
      state.opportunityForReview,
      appendMessage,
      reset,
      dispatch,
      readableOpportunity
    ]);

    // Add dedicated guided creation action - separate from review workflow
    useCopilotActionWrapper(
      "startGuidedCreation",
      state,
      dispatch,
      reset,
      appendMessage
    );

    // Action to add a new question during creation
    useCopilotActionWrapper("addQuestion", state, dispatch);

    // Simple test action to verify resource addition works
    useCopilotActionWrapper("testAddResource", state, dispatch);

    // Simple test action to verify question addition works
    useCopilotActionWrapper("testAddQuestion", state, dispatch);

    // Action to generate questions with AI based on skills
    useCopilotActionWrapper("generateQuestionsWithAI", state, dispatch);

    // Action to check AI generation status
    useCopilotActionWrapper("checkQuestionGenerationStatus", state, dispatch);

    return (
      <div style={{ position: "relative" }}>
        {/* <ActionDebugPanel /> */}
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
    const isReviewWithAILoading = state.reviewWithAILoading > 0;
    const isLoading =
      isPublishLoading || isSaveDraftLoading || isReviewWithAILoading;
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
        loading: isReviewWithAILoading,
        disabled: isLoading,
        button: true,
        color: "info",
        onClick: () => {
          // Check if evaluation panel is properly configured first
          const evaluationPanelValues = state.form
            ? state.form.evaluationPanel
            : null;
          const hasValidEvaluators =
            evaluationPanelValues &&
            state.form &&
            Form.isEvaluationPanelTabValid(state.form);

          if (!hasValidEvaluators) {
            // Navigate to evaluation panel tab and show error
            const switchTabMsg = adt(
              "form",
              adt(
                "tabbedForm",
                adt("setActiveTab", "Evaluation Panel" as const)
              )
            );
            dispatch(switchTabMsg as Msg);

            setTimeout(() => {
              dispatch(
                component_.global.showToastMsg(
                  adt("error", {
                    title: "Evaluation Panel Required",
                    body: `Please complete the '${TAB_NAMES.EVALUATION_PANEL}' tab first. You need to add at least one evaluator before using Create with AI.`
                  })
                )
              );
            }, 100);
            return;
          }

          // If evaluators are valid, start guided creation
          console.log(
            "🌟 Starting guided creation workflow - evaluators validated"
          );

          // Dispatch the guided creation action
          dispatch(adt("startGuidedCreation"));

          // Open chat after a short delay
          setTimeout(() => {
            const copilotButton = document.querySelector(
              ".copilotKitButton"
            ) as HTMLButtonElement;
            if (copilotButton) {
              copilotButton.click();
            }
          }, 100);
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
  getMetadata() {
    return makePageMetadata("Create a Team With Us Opportunity");
  }
};
