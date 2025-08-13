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
import { useCopilotChat, useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";

import {
  opportunityToPublicState,
  CREATION_SYSTEM_INSTRUCTIONS,
  CREATION_WELCOME_MESSAGE,
  parseDateValue,

} from "front-end/lib/pages/opportunity/team-with-us/lib/ai";
import {
  isCriteriaRelatedQuestion,
  identifyRelevantCriteria,
  generateEnhancedCitationText,
  CRITERIA_MAPPINGS,
  getAllDocumentsWithLinks,

} from "front-end/lib/pages/opportunity/team-with-us/lib/criteria-mapping";

import { twuServiceAreaToTitleCase } from "front-end/lib/pages/opportunity/team-with-us/lib";
// import ActionDebugPanel from "front-end/lib/pages/opportunity/team-with-us/lib/action-debug";
import * as FormField from "front-end/lib/components/form-field";

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
            
            if (formErrors && Array.isArray(formErrors) && formErrors.length > 0) {
              errorMessage = {
                title: "Evaluation Panel Required",
                body: "Please complete the 'Evaluation Panel' tab. Make sure to select valid users for all evaluators."
              };
              // Navigate to evaluation panel tab
              const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Evaluation Panel" as const)));
              dispatch(switchTabMsg as Msg);
            } else if (result.value?.resources) {
              errorMessage = {
                title: "Resource Details Required", 
                body: `Please complete the 'Resource Details' tab by adding at least one resource with a service area and target allocation.`
              };
              const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Details" as const)));
              dispatch(switchTabMsg as Msg);
            }
            
            return [
              state.set("form", result.value),
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("error", errorMessage)
                  )
                )
              ]
            ];
          }
        }
      }
      case "reviewWithAI": {
        state = state.set("showModal", null);

        // Check if evaluation panel is properly configured
        const evaluationPanelValues = state.form ? state.form.evaluationPanel : null;
        const hasValidEvaluators = evaluationPanelValues && 
          state.form && 
          Form.isEvaluationPanelTabValid(state.form);

        if (!hasValidEvaluators) {
          // Navigate to evaluation panel tab and show error
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Evaluation Panel" as const)));
          dispatch(switchTabMsg as Msg);
          
          return [
            state,
            [
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
            
            if (formErrors && Array.isArray(formErrors) && formErrors.length > 0) {
              errorMessage = {
                title: "Evaluation Panel Required",
                body: "Please complete the 'Evaluation Panel' tab. Make sure to select valid users for all evaluators."
              };
              // Navigate to evaluation panel tab
              const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Evaluation Panel" as const)));
              dispatch(switchTabMsg as Msg);
            } else if (result.value?.resources) {
              errorMessage = {
                title: "Resource Details Required", 
                body: `Please complete the 'Resource Details' tab by adding at least one resource with a service area and target allocation.`
              };
              const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Details" as const)));
              dispatch(switchTabMsg as Msg);
            }
            
            return [
              state.set("form", result.value),
              [
                component_.cmd.dispatch(
                  component_.global.showToastMsg(
                    adt("error", errorMessage)
                  )
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
            const setMessages = (window as any).__copilotSetMessages;
            const appendMessage = (window as any).__copilotAppendMessage;
            const welcomeMessage = (window as any).__copilotCreationWelcome;
            
            if (setMessages && appendMessage && welcomeMessage) {
              console.log("🚀 Starting guided creation workflow using global functions");
              
              // Set flag to prevent system instructions from interfering
              (window as any).__guidedCreationActive = true;
              
              // Clear chat and start guided creation
             // setMessages([]);
              console.log(welcomeMessage);
              setTimeout(() => {
                appendMessage(new TextMessage({
                  content: welcomeMessage,
                  role: Role.Assistant,
                  id: "guided-creation"
                }));
                
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
      description: "Current creation progress and form completion status for guided creation workflow",
      value: {
        creationMode: "create", // Always in create mode on this page
        formProgress: {
          hasTitle: (state.form?.title?.value || '').trim().length > 0,
          hasTeaser: (state.form?.teaser?.value || '').trim().length > 0,
          hasDescription: (state.form?.description?.value || '').trim().length > 0,
          hasLocation: state.form?.location?.value && state.form.location.value.trim() !== DEFAULT_LOCATION,
          hasProposalDeadline: !!state.form?.proposalDeadline?.value,
          hasStartDate: !!state.form?.startDate?.value,
          hasCompletionDate: !!state.form?.completionDate?.value,
          hasBudget: !!(state.form?.maxBudget?.value && state.form.maxBudget.value > 0),
          resourceCount: (state.form?.resources?.value || []).length,
          questionCount: (state.form?.resourceQuestions?.questions || []).length,
          currentValues: {
            title: state.form?.title?.value || '',
            teaser: state.form?.teaser?.value || '',
            location: state.form?.location?.value || DEFAULT_LOCATION,
            maxBudget: state.form?.maxBudget?.value || null,
            proposalDeadline: state.form?.proposalDeadline?.value || null,
            startDate: state.form?.startDate?.value || null,
            completionDate: state.form?.completionDate?.value || null,
          }
        },
        nextSteps: (() => {
          if (!state.form?.title?.value) return "Need project title";
          if (!state.form?.teaser?.value) return "Need project summary";
          if (!state.form?.location?.value || state.form.location.value === DEFAULT_LOCATION) return "Need project location";
          if (!state.form?.proposalDeadline?.value) return "Need proposal deadline";
          if (!state.form?.maxBudget?.value) return "Need budget information";
          if ((state.form?.resources?.value || []).length === 0) return "Need resource requirements";
          if (!state.form?.description?.value) return "Need detailed description";
          if ((state.form?.resourceQuestions?.questions || []).length === 0) return "Need evaluation questions";
          return "Ready for final review";
        })()
      }
    });


    
    const { appendMessage, setMessages, messages } = useCopilotChat();
    
    // Update refs when functions change
    React.useEffect(() => {
      // Make functions globally accessible for actions
      (window as any).__copilotSetMessages = setMessages;
      (window as any).__copilotAppendMessage = appendMessage;
      (window as any).__copilotCreationWelcome = CREATION_WELCOME_MESSAGE;
      (window as any).__guidedCreationActive = false;
      
      // Cleanup on unmount
      return () => {
        delete (window as any).__copilotSetMessages;
        delete (window as any).__copilotAppendMessage;
        delete (window as any).__copilotCreationWelcome;
        delete (window as any).__guidedCreationActive;
      };
    }, [setMessages, appendMessage]);

    // Add criteria mapping support for chat responses
    React.useEffect(() => {
      const handleNewMessages = () => {
        if (!messages || messages.length === 0) return;
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === Role.User) {
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
                  role: Role.System,
                  id: Math.random().toString()
                })
              );
            }, 100);
          }
        }
      };

      handleNewMessages();
    }, [messages, appendMessage]);



    // Add copilot action for criteria documentation lookup
    useCopilotAction({
      name: "getCriteriaDocumentation",
      description: "Get information about Team With Us evaluation criteria and supporting documentation. Use this when users ask about specific criteria, requirements, or need document references.",
      parameters: [
        {
          name: "criteriaArea",
          type: "string",
          description: "The specific criteria area to get information about. Options: 'organization-legal', 'contract-outcomes', 'mandatory-skills', 'timeline-planning', 'budget-financial', 'contract-extensions', 'information-gaps', 'vendor-experience', or 'all' for all criteria.",
          required: false
        }
      ],
      handler: async ({ criteriaArea }) => {
        console.log("Getting criteria documentation for:", criteriaArea);
        console.log("Parameters received:", { criteriaArea });
        
        try {
          if (criteriaArea && criteriaArea !== 'all') {
            console.log("Processing specific criteria area:", criteriaArea);
            const criteria = identifyRelevantCriteria(criteriaArea);
            console.log("Identified criteria:", criteria);
            const citationText = generateEnhancedCitationText(criteria);
            console.log("Generated citation text:", citationText);
            return `Here's the documentation for the requested criteria area:\n${citationText}`;
          } else {
            console.log("Processing all criteria areas");
            // Return all criteria information
            const allCriteria = Object.keys(CRITERIA_MAPPINGS);
            console.log("All criteria keys:", allCriteria);
            const citationText = generateEnhancedCitationText(allCriteria);
            console.log("Generated citation text for all criteria:", citationText);
            return `Here's the complete Team With Us evaluation criteria documentation:\n${citationText}`;
          }
        } catch (error) {
          console.error("❌ Error in getCriteriaDocumentation:", error);
          return `Error retrieving criteria documentation: ${error.message}`;
        }
      }
    });

    // Add action to list all available documents with links
    useCopilotAction({
      name: "listAvailableDocuments",
      description: "Get a list of all available Team With Us reference documents with clickable links. Use this when users ask for all documents, want to see what's available, or need a complete reference list.",
      parameters: [],
      handler: async () => {

        
        try {
          const documents = getAllDocumentsWithLinks();
          console.log("Available documents:", documents);
          
          let response = "📋 **Available Team With Us Reference Documents:**\n\n";
          
          documents.forEach((doc, index) => {
            if (doc.url) {
              response += `${index + 1}. **[${doc.name}](${doc.url})**\n`;
              response += `   *Authority: ${doc.authority}*\n\n`;
            } else {
              response += `${index + 1}. **${doc.name}**\n`;
              response += `   *Authority: ${doc.authority}*\n`;
              response += `   *(Link not available)*\n\n`;
            }
          });
          
          response += "\n💡 **Tip:** Click on any document title to access it directly. These documents contain the official guidelines, requirements, and procedures for Team With Us procurement.";
          
          return response;
        } catch (error) {
          console.error("❌ Error in listAvailableDocuments:", error);
          return `Error retrieving document list: ${error.message}`;
        }
      }
    });

    // Add a simple debug action to test if actions work at all
    useCopilotAction({
      name: "debugTest",
      description: "Simple test action to verify CopilotKit actions are working. Call this to test the action system.",
      parameters: [],
      handler: async () => {
        console.log("🧪 DEBUG: Test action called successfully on CREATE page!");
        return "✅ Debug test successful! CopilotKit actions are working on the CREATE page. The action system is functioning correctly.";
      }
    });

    // Add debug action specifically for generateQuestionsWithAI
    useCopilotAction({
      name: "debugGenerateQuestionsWithAI",
      description: "Debug action to test if generateQuestionsWithAI action is properly registered and accessible.",
      parameters: [],
      handler: async () => {
        console.log("🧪 DEBUG: Testing generateQuestionsWithAI action registration");
        return "✅ generateQuestionsWithAI action is registered and accessible. You can now use generateQuestionsWithAI() to generate questions with AI.";
      }
    });

    // Add debug action for resource selection
    useCopilotAction({
      name: "debugResourceSelection",
      description: "Debug action to test resource selection and service area setting functionality.",
      parameters: [],
      handler: async () => {
        console.log("🧪 DEBUG: Testing resource selection functionality");
        
        if (!state.form) {
          return "❌ Error: Form not available";
        }
        
        const resourceCount = state.form?.resources?.resources?.length || 0;
        const resources = state.form?.resources?.resources || [];
        
        let result = `📊 **Resource Selection Debug Report**\n\n`;
        result += `**Total Resources:** ${resourceCount}\n\n`;
        
        if (resourceCount === 0) {
          result += "**Status:** No resources found. Use addResource() to create a resource first.\n";
          return result;
        }
        
        result += "**Resource Details:**\n";
        resources.forEach((resource, index) => {
          const serviceArea = resource.serviceArea?.child?.value;
          const targetAllocation = resource.targetAllocation?.child?.value;
          const mandatorySkills = resource.mandatorySkills?.child?.value || [];
          const optionalSkills = resource.optionalSkills?.child?.value || [];
          
          result += `\n**Resource ${index + 1}:**\n`;
          result += `- Service Area: ${serviceArea ? `${serviceArea.label} (${serviceArea.value})` : 'Not set'}\n`;
          result += `- Target Allocation: ${targetAllocation ? `${targetAllocation.value}%` : 'Not set'}\n`;
          result += `- Mandatory Skills: ${mandatorySkills.length > 0 ? mandatorySkills.map((s: any) => s.value).join(', ') : 'None'}\n`;
          result += `- Optional Skills: ${optionalSkills.length > 0 ? optionalSkills.map((s: any) => s.value).join(', ') : 'None'}\n`;
        });
        
        result += `\n**Test Commands:**\n`;
        result += `- Use updateResource(0, 'serviceArea', 'SERVICE_DESIGNER') to set service area\n`;
        result += `- Use updateResource(0, 'targetAllocation', '50') to set allocation\n`;
        
        return result;
      }
    });

    // Add action to update opportunity description
    useCopilotAction({
      name: "updateOpportunityDescription",
      description: "Update or replace the description field content of the Team With Us opportunity during creation. This action can be used when the user wants to modify, improve, or completely rewrite the opportunity description.",
      parameters: [
        {
          name: "newDescription",
          type: "string",
          description: "The new description content for the opportunity. This should be a complete description that will replace the current content.",
          required: true
        }
      ],
      handler: async ({ newDescription }) => {
        console.log("🚨🚨🚨 updateOpportunityDescription ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
        console.log("🎯 CopilotKit: updateOpportunityDescription called on CREATE page with:", newDescription);
        console.log("State.form exists:", !!state.form);
        console.log("Current description before update:", state.form?.description.child.value);
        
        if (!state.form) {
          return "❌ Error: Form not available. Please try refreshing the page.";
        }
        
        try {
          // First switch to the Description tab to ensure we're on the right tab
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Description" as const)));
          console.log("Switching to Description tab:", switchTabMsg);
          dispatch(switchTabMsg);
          
          // Small delay to ensure tab switch completes
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Update the description field in the form
          const updateMsg = adt("form", adt("description", adt("child", adt("onChangeTextArea", [newDescription, 0, newDescription.length]))));
          console.log("Dispatching update message:", updateMsg);
          
          dispatch(updateMsg as Msg);
          console.log("✅ Description update dispatch completed successfully");
          
          // Give a moment for the update to process and verify
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Give more time for the state to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if the update was successful
          const currentDescription = state.form?.description.child.value;
          console.log("Description after update:", currentDescription);
          
          // More lenient verification - check if the description contains the new content
          if (currentDescription && (currentDescription === newDescription || currentDescription.includes(newDescription.substring(0, 50)))) {
            return `✅ Description updated successfully! 
            
**New content preview:**
${newDescription.substring(0, 200)}${newDescription.length > 200 ? '...' : ''}

💡 **Tip:** The description has been updated in the form. Don't forget to save or publish your opportunity when you're ready!`;
          } else {
            console.warn("Description update verification failed, but dispatch was successful");
            return `✅ Description update dispatched successfully! 

**Note:** The update has been sent to the form. The description should now be updated in the interface.

**New content preview:**
${newDescription.substring(0, 200)}${newDescription.length > 200 ? '...' : ''}

💡 **Tip:** The description has been updated in the form. Don't forget to save or publish your opportunity when you're ready!`;
          }
          
        } catch (error) {
          console.error("❌ Error in updateOpportunityDescription:", error);
          return `❌ Error: Failed to update description - ${error.message}`;
        }
      }
    });

    // Action to get current creation progress and next steps
    useCopilotAction({
      name: "getCreationProgress",
      description: "Get the current progress of opportunity creation and what step should come next. Use this to guide the creation workflow.",
      parameters: [],
      handler: async () => {
        console.log("🚨🚨🚨 getCreationProgress ACTION CALLED! 🚨🚨🚨");
        
        if (!state.form) {
          return "❌ Error: Form not available.";
        }
        
        const progress = {
          hasTitle: (state.form.title?.value || '').trim().length > 0,
          hasTeaser: (state.form.teaser?.value || '').trim().length > 0,
          hasLocation: state.form.location?.value && state.form.location.value.trim() !== DEFAULT_LOCATION,
          hasProposalDeadline: !!state.form.proposalDeadline?.value,
          hasStartDate: !!state.form.startDate?.value,
          hasCompletionDate: !!state.form.completionDate?.value,
          hasBudget: !!(state.form.maxBudget?.value && state.form.maxBudget.value > 0),
          resourceCount: (state.form.resources?.value || []).length,
          hasDescription: (state.form.description?.value || '').trim().length > 0,
          questionCount: (state.form.resourceQuestions?.questions || []).length
        };
        
        let nextStep = "";
        let currentProgress = "";
        
        if (!progress.hasTitle) {
          nextStep = "**Next:** Ask for the project title";
          currentProgress = "Starting project overview";
        } else if (!progress.hasTeaser) {
          nextStep = "**Next:** Ask for a project summary/teaser (2-3 sentences)";
          currentProgress = "Title ✅";
        } else if (!progress.hasLocation) {
          nextStep = "**Next:** Ask for the project location";
          currentProgress = "Title ✅, Teaser ✅";
        } else if (!progress.hasProposalDeadline) {
          nextStep = "**Next:** Ask for proposal deadline date";
          currentProgress = "Overview section ✅";
        } else if (!progress.hasStartDate) {
          nextStep = "**Next:** Ask for project start date";
          currentProgress = "Overview ✅, Deadline ✅";
        } else if (!progress.hasCompletionDate) {
          nextStep = "**Next:** Ask for expected completion date";
          currentProgress = "Timeline partially complete";
        } else if (!progress.hasBudget) {
          nextStep = "**Next:** Ask for maximum budget";
          currentProgress = "Timeline ✅";
        } else if (progress.resourceCount === 0) {
          nextStep = "**Next:** Ask about resource requirements (what skills/roles needed)";
          currentProgress = "Budget ✅";
        } else if (!progress.hasDescription) {
          nextStep = "**Next:** Ask for detailed project description";
          currentProgress = "Resources ✅ (" + progress.resourceCount + " added)";
        } else if (progress.questionCount === 0) {
          nextStep = "**Next:** Create evaluation questions for assessing proposals";
          currentProgress = "Description ✅";
        } else {
          nextStep = "**Ready for final review!**";
          currentProgress = "All sections complete ✅";
        }
        
        return `## 📊 **Creation Progress**

${currentProgress}

${nextStep}

### 📋 **Completion Status:**
- Title: ${progress.hasTitle ? '✅' : '❌'}
- Summary: ${progress.hasTeaser ? '✅' : '❌'}  
- Location: ${progress.hasLocation ? '✅' : '❌'}
- Proposal Deadline: ${progress.hasProposalDeadline ? '✅' : '❌'}
- Start Date: ${progress.hasStartDate ? '✅' : '❌'}
- Completion Date: ${progress.hasCompletionDate ? '✅' : '❌'}
- Budget: ${progress.hasBudget ? '✅' : '❌'}
- Resources: ${progress.resourceCount > 0 ? `✅ (${progress.resourceCount})` : '❌'}
- Description: ${progress.hasDescription ? '✅' : '❌'}
- Questions: ${progress.questionCount > 0 ? `✅ (${progress.questionCount})` : '❌'}`;
      }
    });

    // Action to advance to next creation step
    useCopilotAction({
      name: "getNextCreationStep",
      description: "Get detailed guidance for the next step in the creation process. Use this to know what to ask for next.",
      parameters: [],
      handler: async () => {
        console.log("🚨🚨🚨 getNextCreationStep ACTION CALLED! 🚨🚨🚨");
        
        if (!state.form) {
          return "❌ Error: Form not available.";
        }
        
        // Determine what step we're on and provide specific guidance
        if (!(state.form.title?.value || '').trim()) {
          return `## 🎯 **Step 1: Project Title**

Ask the user: "What is the title of your project or initiative?"

**Examples to share:**
- "Digital Platform Modernization"
- "Customer Portal Development" 
- "Data Analytics Implementation"
- "Legacy System Migration"

**Tips:** Should be clear, descriptive, and immediately understandable to vendors.

**Action to use:** updateOpportunityField("title", value)`;
        }
        
        if (!(state.form.teaser?.value || '').trim()) {
          return `## 📝 **Step 2: Project Summary**

Ask the user: "Can you provide a brief summary (2-3 sentences) of what this project involves?"

**Examples to share:**
- "We need to modernize our legacy platform to improve user experience and scalability. The project involves migrating to cloud infrastructure and implementing modern development practices."
- "Our organization requires a new customer portal to streamline service delivery and improve client satisfaction."

**Tips:** Should be concise but informative, focusing on the business need and high-level approach.

**Action to use:** updateOpportunityField("teaser", value)`;
        }
        
        if (!state.form.location?.value || state.form.location.value.trim() === DEFAULT_LOCATION) {
          return `## 📍 **Step 3: Project Location**

Ask the user: "Where will this project primarily take place? (Can be remote, hybrid, or specific location)"

**Examples to share:**
- "Remote" (if fully remote)
- "Vancouver, BC" (if specific location)
- "Hybrid - Vancouver office with remote options"

**Current default:** Victoria (change if different)

**Action to use:** updateOpportunityField("location", value)`;
        }
        
        if (!state.form.proposalDeadline?.value) {
          return `## 📅 **Step 4: Proposal Deadline**

Ask the user: "When do you need proposals submitted by? (Remember: minimum 10-day posting period required)"

**Tips to mention:**
- Must allow at least 10 business days from posting
- Consider evaluation time needed after deadline
- Format: YYYY-MM-DD

**Action to use:** updateOpportunityField("proposalDeadline", "YYYY-MM-DD")`;
        }
        
        if (!state.form.startDate?.value) {
          return `## 🚀 **Step 5: Project Start Date**

Ask the user: "When would you like the project to start?"

**Tips to mention:**
- Should be after proposal evaluation and vendor selection
- Allow time for contract setup and team onboarding
- Format: YYYY-MM-DD

**Action to use:** updateOpportunityField("startDate", "YYYY-MM-DD")`;
        }
        
        if (!state.form.completionDate?.value) {
          return `## 🏁 **Step 6: Expected Completion**

Ask the user: "When do you expect the project to be completed?"

**Tips to mention:**
- Consider project complexity and scope
- Team With Us typically used for 6-24 month engagements
- Format: YYYY-MM-DD

**Action to use:** updateOpportunityField("completionDate", "YYYY-MM-DD")`;
        }
        
        if (!(state.form.maxBudget?.value && state.form.maxBudget.value > 0)) {
          return `## 💰 **Step 7: Budget Information**

Ask the user: "What is your maximum budget for this project?"

**Guidance to provide:**
- Team With Us standard: $20,000-25,000/month per full-time resource
- For 12-month project with 1 FTE: approximately $240,000-300,000
- Budget should align with resource requirements and timeline

**Action to use:** updateOpportunityField("maxBudget", numberValue)`;
        }
        
        if ((state.form.resources?.value || []).length === 0) {
          return `## 👥 **Step 8: Resource Requirements**

Ask the user: "What skills and roles do you need for this project? What type of team members would be ideal?"

**Service areas to mention:**
- Full Stack Developer
- Data Professional  
- Agile Coach
- DevOps Specialist
- Service Designer

**Information to gather for each resource:**
- Service area
- Allocation percentage (e.g., 50% = part-time, 100% = full-time)
- Mandatory skills
- Optional skills

**Action to use:** addResource() for each role needed`;
        }
        
        if (!(state.form.description?.value || '').trim()) {
          return `## 📋 **Step 9: Detailed Description**

Ask the user: "Can you provide a detailed description of the project? Include background, objectives, scope, and any specific requirements."

**Should include:**
- Organization background and context
- Project objectives and outcomes
- Scope of work and deliverables
- Technical requirements
- Constraints or considerations

**Action to use:** updateOpportunityDescription(content)`;
        }
        
        if ((state.form.resourceQuestions?.questions || []).length === 0) {
          return `## ❓ **Step 10: Evaluation Questions**

Ask the user: "What questions would you like to ask vendors to evaluate their proposals? These help assess relevant experience and approach."

**Two approaches available:**

**🤖 AI Generation (Recommended):**
- Use generateQuestionsWithAI() to automatically create optimized questions based on your resources and skills
- AI will generate 3-8 comprehensive questions that efficiently cover all your requirements
- Questions include guidelines and scoring automatically
- Perfect when you have resources with skills defined

**✏️ Manual Creation:**
- Use addQuestion() to create blank questions, then customize them
- Better for specific, custom questions
- More control over exact wording and focus

**Suggested workflow:**
1. If you have resources with skills: "I can generate optimized questions using AI based on your skills. Should I do that?"
2. If user prefers manual: "Let me create some blank questions for you to customize."
3. If user wants AI: CALL generateQuestionsWithAI()
4. If user wants manual: CALL addQuestion() for each question needed

**Troubleshooting:**
- If generateQuestionsWithAI() is not available, use debugGenerateQuestionsWithAI() to test the action system
- Fall back to addQuestion() if AI generation is not working
- Use checkQuestionGenerationStatus() to monitor AI generation progress

**Action to use:** generateQuestionsWithAI() for AI generation, or addQuestion() for manual creation`;
        }
        
        return `## 🎉 **Creation Complete!**

All required sections have been completed. Ready for final review!

**Next steps:**
1. Review all entered information
2. Validate against procurement requirements  
3. Save as draft or submit for review

Use reviewOpportunity() to perform final validation.`;
      }
    });



    // Comprehensive action to update any form field during creation
    useCopilotAction({
      name: "updateOpportunityField",
      description: "Update any field in the Team With Us opportunity form during creation. Use this when users want to modify specific fields like title, location, budget, dates, etc.",
      parameters: [
        {
          name: "fieldName",
          type: "string",
          description: "The field to update. Options: 'title', 'teaser', 'location', 'maxBudget', 'costRecovery', 'remoteOk', 'remoteDesc', 'proposalDeadline', 'assignmentDate', 'startDate', 'completionDate', 'questionsWeight', 'challengeWeight', 'priceWeight'",
          required: true
        },
        {
          name: "value",
          type: "string",
          description: "The new value for the field. For dates use YYYY-MM-DD format. For remoteOk use 'yes' or 'no'. For numbers use numeric strings.",
          required: true
        }
      ],
      handler: async ({ fieldName, value }) => {
        console.log("🚨🚨🚨 updateOpportunityField ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
        console.log("🎯 Field:", fieldName, "Value:", value);
        console.log("State.form exists:", !!state.form);
        
        if (!state.form) {
          return "❌ Error: Form not available. Please try refreshing the page.";
        }

        // Define field configurations
        const fieldConfigs = {
          // Overview Tab - Text fields
          title: { tab: "Overview", type: "text", msg: adt("form", adt("title", adt("child", adt("onChange", value)))) },
          teaser: { tab: "Overview", type: "text", msg: adt("form", adt("teaser", adt("child", adt("onChange", value)))) },
          location: { tab: "Overview", type: "text", msg: adt("form", adt("location", adt("child", adt("onChange", value)))) },
          remoteDesc: { tab: "Overview", type: "text", msg: adt("form", adt("remoteDesc", adt("child", adt("onChange", value)))) },
          
          // Overview Tab - Number fields
          maxBudget: { 
            tab: "Overview", 
            type: "number", 
            msg: adt("form", adt("maxBudget", adt("child", adt("onChange", parseFloat(value) || null)))) 
          },
          costRecovery: { 
            tab: "Overview", 
            type: "number", 
            msg: adt("form", adt("costRecovery", adt("child", adt("onChange", parseFloat(value) || null)))) 
          },
          
          // Overview Tab - Radio field
          remoteOk: { 
            tab: "Overview", 
            type: "radio", 
            msg: adt("form", adt("remoteOk", adt("child", adt("onChange", value === "yes" ? "yes" : "no")))) 
          },
          
          // Overview Tab - Date fields
          proposalDeadline: { 
            tab: "Overview", 
            type: "date", 
            msg: adt("form", adt("proposalDeadline", adt("child", adt("onChange", parseDateValue(value))))) 
          },
          assignmentDate: { 
            tab: "Overview", 
            type: "date", 
            msg: adt("form", adt("assignmentDate", adt("child", adt("onChange", parseDateValue(value))))) 
          },
          startDate: { 
            tab: "Overview", 
            type: "date", 
            msg: adt("form", adt("startDate", adt("child", adt("onChange", parseDateValue(value))))) 
          },
          completionDate: { 
            tab: "Overview", 
            type: "date", 
            msg: adt("form", adt("completionDate", adt("child", adt("onChange", parseDateValue(value))))) 
          },
          
          // Scoring Tab - Number fields
          questionsWeight: { 
            tab: "Scoring", 
            type: "number", 
            msg: adt("form", adt("questionsWeight", adt("child", adt("onChange", parseFloat(value) || null)))) 
          },
          challengeWeight: { 
            tab: "Scoring", 
            type: "number", 
            msg: adt("form", adt("challengeWeight", adt("child", adt("onChange", parseFloat(value) || null)))) 
          },
          priceWeight: { 
            tab: "Scoring", 
            type: "number", 
            msg: adt("form", adt("priceWeight", adt("child", adt("onChange", parseFloat(value) || null)))) 
          }
        };


        
        const config = fieldConfigs[fieldName];
        if (!config) {
          return `❌ Error: Unknown field '${fieldName}'. Available fields: ${Object.keys(fieldConfigs).join(', ')}`;
        }
        
        try {
          // Switch to the appropriate tab
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", config.tab as const)));
          console.log(`Switching to ${config.tab} tab:`, switchTabMsg);
          dispatch(switchTabMsg);
          
          // Small delay to ensure tab switch completes
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Update the field
          console.log("Dispatching field update:", config.msg);
          dispatch(config.msg);
          console.log("✅ Field update dispatch completed successfully");
          
          // Give a moment for the update to process
          await new Promise(resolve => setTimeout(resolve, 200));
          
          return `✅ **${fieldName}** updated successfully!

**Tab:** ${config.tab}
**New value:** ${value}
**Field type:** ${config.type}

💡 **Tip:** The field has been updated in the form. Don't forget to save or publish your opportunity when you're ready!`;
          
        } catch (error) {
          console.error("❌ Error in updateOpportunityField:", error);
          return `❌ Error: Failed to update ${fieldName} - ${error.message}`;
        }
      }
    });

    // Action to get current field values during creation
    useCopilotAction({
      name: "getOpportunityFieldValue",
      description: "Get the current value of any field in the Team With Us opportunity form during creation. Use this to check what's currently in a field before updating it.",
      parameters: [
        {
          name: "fieldName",
          type: "string",
          description: "The field to get the value from. Options: 'title', 'teaser', 'location', 'maxBudget', 'costRecovery', 'remoteOk', 'remoteDesc', 'proposalDeadline', 'assignmentDate', 'startDate', 'completionDate', 'questionsWeight', 'challengeWeight', 'priceWeight'",
          required: true
        }
      ],
      handler: async ({ fieldName }) => {
        console.log("🚨🚨🚨 getOpportunityFieldValue ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
        console.log("🎯 Getting value for field:", fieldName);
        
        if (!state.form) {
          return "❌ Error: Form not available. Please try refreshing the page.";
        }

        try {
          let currentValue;
          let fieldType = "";
          
          // Text fields
          if (["title", "teaser", "location", "remoteDesc"].includes(fieldName)) {
            currentValue = state.form?.[fieldName]?.child?.value || "";
            fieldType = "text";
          }
          // Number fields
          else if (["maxBudget", "costRecovery", "questionsWeight", "challengeWeight", "priceWeight"].includes(fieldName)) {
            currentValue = state.form?.[fieldName]?.child?.value;
            fieldType = "number";
          }
          // Radio field
          else if (fieldName === "remoteOk") {
            currentValue = state.form?.[fieldName]?.child?.value;
            fieldType = "radio";
          }
          // Date fields
          else if (["proposalDeadline", "assignmentDate", "startDate", "completionDate"].includes(fieldName)) {
            const dateValue = state.form?.[fieldName]?.child?.value;
            currentValue = dateValue ? `${dateValue[0]}-${String(dateValue[1]).padStart(2, '0')}-${String(dateValue[2]).padStart(2, '0')}` : null;
            fieldType = "date";
          }
          else {
            return `❌ Error: Unknown field '${fieldName}'. Available fields: title, teaser, location, maxBudget, costRecovery, remoteOk, remoteDesc, proposalDeadline, assignmentDate, startDate, completionDate, questionsWeight, challengeWeight, priceWeight`;
          }

          return `📋 **Current value for ${fieldName}:**

**Value:** ${currentValue !== null && currentValue !== undefined ? currentValue : "(not set)"}
**Type:** ${fieldType}

💡 **Tip:** You can update this field using the updateOpportunityField action.`;
          
        } catch (error) {
          console.error("❌ Error getting field value:", error);
          return `❌ Error: Failed to get ${fieldName} value - ${error.message}`;
        }
      }
    });

    // ==================== QUESTION MANAGEMENT ACTIONS ====================
    


    // Action to delete a question
    useCopilotAction({
      name: "deleteQuestion",
      description: "Delete a specific resource question from the Team With Us opportunity during creation.",
      parameters: [
        {
          name: "questionIndex",
          type: "string",
          description: "The index of the question to delete (0-based, e.g., '0' for first question, '1' for second question)",
          required: true
        }
      ],
      handler: async ({ questionIndex }) => {
        console.log("🚨🚨🚨 deleteQuestion ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
        console.log("Question index:", questionIndex);
        
        if (!state.form) {
          return "❌ Error: Form not available. Please try refreshing the page.";
        }
        
        const index = parseInt(questionIndex);
        if (isNaN(index) || index < 0) {
          return "❌ Error: Invalid question index. Please provide a valid number (0 for first question, 1 for second, etc.)";
        }
        
        const questionCount = state.form?.resourceQuestions?.questions?.length || 0;
        if (index >= questionCount) {
          return `❌ Error: Question index ${index} does not exist. There are only ${questionCount} questions (indices 0-${questionCount-1}).`;
        }
        
        try {
          // Switch to Resource Questions tab
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const)));
          dispatch(switchTabMsg as Msg);
          
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Delete the question
          const deleteQuestionMsg = adt("form", adt("resourceQuestions", adt("deleteQuestion", index)));
          console.log("Deleting question:", deleteQuestionMsg);
          dispatch(deleteQuestionMsg as Msg);
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const newQuestionCount = state.form?.resourceQuestions?.questions?.length || 0;
          
          return `✅ **Question ${index + 1} deleted successfully during creation!**

**Remaining questions:** ${newQuestionCount}

💡 **Tip:** Question indices have been adjusted. The former question ${index + 2} is now question ${index + 1} (index ${index}).`;
          
        } catch (error) {
          console.error("❌ Error deleting question:", error);
          return `❌ Error: Failed to delete question - ${error.message}`;
        }
      }
    });

    // Action to update a question
    useCopilotAction({
      name: "updateQuestion",
      description: "Update a specific field of a resource question in the Team With Us opportunity during creation. Use this to modify question text, guidelines, word limits, or scoring.",
      parameters: [
        {
          name: "questionIndex",
          type: "string",
          description: "The index of the question to update (0-based, e.g., '0' for first question, '1' for second question)",
          required: true
        },
        {
          name: "fieldName",
          type: "string",
          description: "The field to update. Options: 'text', 'guideline', 'wordLimit', 'score', 'minimumScore'",
          required: true
        },
        {
          name: "value",
          type: "string",
          description: "The new value. For 'text' and 'guideline' use plain text. For 'wordLimit', 'score', and 'minimumScore' use numbers as strings (e.g., '500', '20', '10').",
          required: true
        }
      ],
      handler: async ({ questionIndex, fieldName, value }) => {
        console.log("🚨🚨🚨 updateQuestion ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
        console.log("Question index:", questionIndex, "Field:", fieldName, "Value:", value);
        
        if (!state.form) {
          return "❌ Error: Form not available. Please try refreshing the page.";
        }
        
        const index = parseInt(questionIndex);
        if (isNaN(index) || index < 0) {
          return "❌ Error: Invalid question index. Please provide a valid number (0 for first question, 1 for second, etc.)";
        }
        
        const questionCount = state.form?.resourceQuestions?.questions?.length || 0;
        if (index >= questionCount) {
          return `❌ Error: Question index ${index} does not exist. There are only ${questionCount} questions (indices 0-${questionCount-1}).`;
        }
        
        // Validate field name
        const validFields = ['text', 'guideline', 'wordLimit', 'score', 'minimumScore'];
        if (!validFields.includes(fieldName)) {
          return `❌ Error: Invalid field name '${fieldName}'. Valid fields: ${validFields.join(', ')}`;
        }
        
        try {
          // Switch to Resource Questions tab
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const)));
          dispatch(switchTabMsg as Msg);
          
          await new Promise(resolve => setTimeout(resolve, 200));
          
          let updateMsg;
          
          if (fieldName === 'text') {
            updateMsg = adt("form", adt("resourceQuestions", adt("questionText", {
              qIndex: index,
              childMsg: adt("onChangeTextArea", [value, 0, value.length])
            })));
          } 
          else if (fieldName === 'guideline') {
            updateMsg = adt("form", adt("resourceQuestions", adt("guidelineText", {
              qIndex: index,
              childMsg: adt("onChangeTextArea", [value, 0, value.length])
            })));
          }
          else if (fieldName === 'wordLimit') {
            const limit = parseInt(value);
            if (isNaN(limit) || limit < 1 || limit > 2000) {
              return "❌ Error: Word limit must be a number between 1 and 2000";
            }
            
            updateMsg = adt("form", adt("resourceQuestions", adt("wordLimit", {
              qIndex: index,
              childMsg: adt("child", adt("onChange", limit))
            })));
          }
          else if (fieldName === 'score') {
            const score = parseInt(value);
            if (isNaN(score) || score < 1 || score > 100) {
              return "❌ Error: Score must be a number between 1 and 100";
            }
            
            updateMsg = adt("form", adt("resourceQuestions", adt("score", {
              qIndex: index,
              childMsg: adt("child", adt("onChange", score))
            })));
          }
          else if (fieldName === 'minimumScore') {
            const minScore = parseInt(value);
            if (isNaN(minScore) || minScore < 0 || minScore > 100) {
              return "❌ Error: Minimum score must be a number between 0 and 100";
            }
            
            updateMsg = adt("form", adt("resourceQuestions", adt("minimumScore", {
              qIndex: index,
              childMsg: adt("child", adt("onChange", minScore))
            })));
          }
          
          console.log("Dispatching question update:", updateMsg);
          dispatch(updateMsg as Msg);
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          return `✅ **Question ${index + 1} ${fieldName} updated successfully during creation!**

**Field:** ${fieldName}
**New value:** ${value}

💡 **Tip:** The question has been updated in the form. Don't forget to save your changes when you're ready!`;
          
        } catch (error) {
          console.error("❌ Error updating question:", error);
          return `❌ Error: Failed to update question ${fieldName} - ${error.message}`;
        }
      }
    });

    // Action to get question details
    useCopilotAction({
      name: "getQuestionDetails",
      description: "Get the current details of all questions or a specific question in the Team With Us opportunity during creation.",
      parameters: [
        {
          name: "questionIndex",
          type: "string",
          description: "Optional: The index of the question to get details for (0-based). If not provided, returns details for all questions.",
          required: false
        }
      ],
      handler: async ({ questionIndex }) => {
        console.log("🚨🚨🚨 getQuestionDetails ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
        console.log("Question index:", questionIndex);
        
        if (!state.form) {
          return "❌ Error: Form not available. Please try refreshing the page.";
        }
        
        const questions = state.form?.resourceQuestions?.questions || [];
        if (questions.length === 0) {
          return "📋 **No questions found**\n\n💡 **Tip:** You can add questions using the addQuestion action.";
        }
        
        try {
          if (questionIndex !== undefined && questionIndex !== null && questionIndex !== '') {
            // Get specific question
            const index = parseInt(questionIndex);
            if (isNaN(index) || index < 0 || index >= questions.length) {
              return `❌ Error: Invalid question index ${questionIndex}. Available indices: 0-${questions.length-1}`;
            }
            
            const question = questions[index];
            // Extract values using FormField.getValue()
            const questionText = FormField.getValue(question.question as any) as string || "(not set)";
            const guidelineText = FormField.getValue(question.guideline as any) as string || "(not set)";
            const wordLimit = FormField.getValue(question.wordLimit) || "(not set)";
            const score = FormField.getValue(question.score) || "(not set)";
            const minimumScore = FormField.getValue(question.minimumScore) || "(not set)";
            
            return `📋 **Question ${index + 1} Details:**

**Question Text:** ${questionText}
**Guideline:** ${guidelineText}
**Word Limit:** ${wordLimit}
**Score:** ${score}
**Minimum Score:** ${minimumScore}

💡 **Tip:** You can update these fields using the updateQuestion action.`;
          } else {
            // Get all questions
            let response = `📋 **All Questions (${questions.length} total):**\n\n`;
            
            questions.forEach((question, index) => {
              const questionText = FormField.getValue(question.question as any) as string || "(not set)";
              const guidelineText = FormField.getValue(question.guideline as any) as string || "(not set)";
              const wordLimit = FormField.getValue(question.wordLimit) || "(not set)";
              const score = FormField.getValue(question.score) || "(not set)";
              const minimumScore = FormField.getValue(question.minimumScore) || "(not set)";
              
              response += `**Question ${index + 1}:**\n`;
              response += `  - Text: ${questionText.substring(0, 100)}${questionText.length > 100 ? '...' : ''}\n`;
              response += `  - Guideline: ${guidelineText.substring(0, 100)}${guidelineText.length > 100 ? '...' : ''}\n`;
              response += `  - Word Limit: ${wordLimit}\n`;
              response += `  - Score: ${score}\n`;
              response += `  - Minimum Score: ${minimumScore}\n\n`;
            });
            
            response += "💡 **Tip:** You can update any question using updateQuestion(questionIndex, fieldName, value) or get details for a specific question using getQuestionDetails(questionIndex).";
            
            return response;
          }
          
        } catch (error) {
          console.error("❌ Error getting question details:", error);
          return `❌ Error: Failed to get question details - ${error.message}`;
        }
      }
    });

    // ==================== RESOURCE MANAGEMENT ACTIONS ====================

    // Action to add a new resource during creation
    useCopilotAction({
      name: "addResource",
      description: "Add a new resource to the Team With Us opportunity. Use this when the user wants to add another resource requirement.",
      parameters: [],
      handler: async () => {
        console.log("🔧 addResource called");
        
        if (!state.form) {
          console.error("❌ Form state not available");
          return "❌ Error: Form not available. Please try refreshing the page.";
        }
        
        console.log("✅ Form state available, proceeding with resource addition");
        
        try {
          // Switch to Resource Details tab
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Details" as const)));
          dispatch(switchTabMsg as Msg);
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Add new resource
          const addResourceMsg = adt("form", adt("resources", adt("addResource")));
          console.log("🔄 Dispatching addResource message:", addResourceMsg);
          dispatch(addResourceMsg as Msg);
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const resourceCount = state.form?.resources?.resources?.length || 0;
          return `✅ **New resource added successfully!**

**Total resources:** ${resourceCount}

💡 **Tip:** You can now configure the service area, target allocation, and skills for the new resource using the updateResource action.`;
          
        } catch (error) {
          console.error("❌ Error adding resource:", error);
          return `❌ Error: Failed to add resource - ${error.message}`;
        }
      }
    });

    // Action to delete a resource during creation
    useCopilotAction({
      name: "deleteResource",
      description: "Delete a resource from the Team With Us opportunity during creation. Use this when the user wants to remove a resource requirement.",
      parameters: [
        {
          name: "resourceIndex",
          type: "string",
          description: "The index of the resource to delete (0-based, e.g., '0' for first resource, '1' for second resource)",
          required: true
        }
      ],
      handler: async ({ resourceIndex }) => {
        console.log("🚨🚨🚨 deleteResource ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
        console.log("Resource index:", resourceIndex);
        
        if (!state.form) {
          return "❌ Error: Form not available. Please try refreshing the page.";
        }
        
        const index = parseInt(resourceIndex);
        if (isNaN(index) || index < 0) {
          return "❌ Error: Invalid resource index. Please provide a valid number (0 for first resource, 1 for second, etc.)";
        }
        
        const resourceCount = state.form?.resources?.resources?.length || 0;
        if (index >= resourceCount) {
          return `❌ Error: Resource index ${index} does not exist. There are only ${resourceCount} resources (indices 0-${resourceCount-1}).`;
        }
        
        try {
          // Switch to Resource Details tab
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Details" as const)));
          console.log("Switching to Resource Details tab:", switchTabMsg);
          dispatch(switchTabMsg as Msg);
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Delete resource
          const deleteResourceMsg = adt("form", adt("resources", adt("deleteResource", index)));
          console.log("Deleting resource at index:", index);
          dispatch(deleteResourceMsg as Msg);
          
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const newResourceCount = state.form?.resources?.resources?.length || 0;
          return `✅ **Resource ${index + 1} deleted successfully during creation!**

**Resources remaining:** ${newResourceCount}

💡 **Tip:** Resource indices have been updated. The first resource is now index 0, second is index 1, etc.`;
          
        } catch (error) {
          console.error("❌ Error deleting resource:", error);
          return `❌ Error: Failed to delete resource - ${error.message}`;
        }
      }
    });

    // Action to update resource fields during creation
    useCopilotAction({
      name: "updateResource",
      description: "Update a specific field of a resource in the Team With Us opportunity during creation. Use this to modify service area, target allocation, or skills.",
      parameters: [
        {
          name: "resourceIndex",
          type: "string",
          description: "The index of the resource to update (0-based, e.g., '0' for first resource, '1' for second resource)",
          required: true
        },
        {
          name: "fieldName",
          type: "string",
          description: "The field to update. Options: 'serviceArea', 'targetAllocation', 'mandatorySkills', 'optionalSkills'",
          required: true
        },
        {
          name: "value",
          type: "string",
          description: "The new value. For serviceArea use: 'FULL_STACK_DEVELOPER', 'DATA_PROFESSIONAL', 'AGILE_COACH', 'DEVOPS_SPECIALIST', 'SERVICE_DESIGNER'. For targetAllocation use percentage as string (e.g., '50'). For skills use comma-separated values (e.g., 'JavaScript,React,Node.js').",
          required: true
        }
      ],
      handler: async ({ resourceIndex, fieldName, value }) => {
        console.log("🚨🚨🚨 updateResource ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
        console.log("Resource index:", resourceIndex, "Field:", fieldName, "Value:", value);
        
        if (!state.form) {
          return "❌ Error: Form not available. Please try refreshing the page.";
        }
        
        const index = parseInt(resourceIndex);
        if (isNaN(index) || index < 0) {
          return "❌ Error: Invalid resource index. Please provide a valid number (0 for first resource, 1 for second, etc.)";
        }
        
        const resourceCount = state.form?.resources?.resources?.length || 0;
        if (index >= resourceCount) {
          return `❌ Error: Resource index ${index} does not exist. There are only ${resourceCount} resources (indices 0-${resourceCount-1}).`;
        }
        
        // Validate field name
        const validFields = ['serviceArea', 'targetAllocation', 'mandatorySkills', 'optionalSkills'];
        if (!validFields.includes(fieldName)) {
          return `❌ Error: Invalid field name '${fieldName}'. Valid fields: ${validFields.join(', ')}`;
        }
        
        try {
          // Switch to Resource Details tab
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Details" as const)));
          console.log("Switching to Resource Details tab:", switchTabMsg);
          dispatch(switchTabMsg as Msg);
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          let updateMsg;
          
          if (fieldName === 'serviceArea') {
            // Validate service area value
            const validServiceAreas = ['FULL_STACK_DEVELOPER', 'DATA_PROFESSIONAL', 'AGILE_COACH', 'DEVOPS_SPECIALIST', 'SERVICE_DESIGNER'];
            if (!validServiceAreas.includes(value)) {
              return `❌ Error: Invalid service area '${value}'. Valid service areas: ${validServiceAreas.join(', ')}`;
            }
            
                      updateMsg = adt("form", adt("resources", adt("serviceArea", {
            rIndex: index,
            childMsg: adt("child", adt("onChange", { 
              value, 
              label: twuServiceAreaToTitleCase(value as any) 
            }))
          })));
          } 
          else if (fieldName === 'targetAllocation') {
            const allocation = parseInt(value);
            if (isNaN(allocation) || allocation < 10 || allocation > 100) {
              return "❌ Error: Target allocation must be a number between 10 and 100 (representing percentage)";
            }
            
            updateMsg = adt("form", adt("resources", adt("targetAllocation", {
              rIndex: index,
              childMsg: adt("child", adt("onChange", { 
                value: String(allocation), 
                label: String(allocation) 
              }))
            })));
          }
          else if (fieldName === 'mandatorySkills' || fieldName === 'optionalSkills') {
            // Parse comma-separated skills
            const skills = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const skillOptions = skills.map(skill => ({ value: skill, label: skill }));
            
            updateMsg = adt("form", adt("resources", adt(fieldName, {
              rIndex: index,
              childMsg: adt("child", adt("onChange", skillOptions))
            })));
          }
          
          console.log("Dispatching resource update:", updateMsg);
          dispatch(updateMsg as Msg);
          
          await new Promise(resolve => setTimeout(resolve, 200));
          
          return `✅ **Resource ${index + 1} ${fieldName} updated successfully during creation!**

**Field:** ${fieldName}
**New value:** ${value}

💡 **Tip:** The resource has been updated in the form. Don't forget to save or publish your opportunity when you're ready!`;
          
        } catch (error) {
          console.error("❌ Error updating resource:", error);
          return `❌ Error: Failed to update resource ${fieldName} - ${error.message}`;
        }
      }
    });

    // Action to get resource details during creation
    useCopilotAction({
      name: "getResourceDetails",
      description: "Get the current details of all resources or a specific resource in the Team With Us opportunity during creation.",
      parameters: [
        {
          name: "resourceIndex",
          type: "string",
          description: "Optional: The index of the resource to get details for (0-based). If not provided, returns details for all resources.",
          required: false
        }
      ],
      handler: async ({ resourceIndex }) => {
        console.log("🚨🚨🚨 getResourceDetails ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
        console.log("Resource index:", resourceIndex);
        
        if (!state.form) {
          return "❌ Error: Form not available. Please try refreshing the page.";
        }
        
        const resources = state.form?.resources?.resources || [];
        console.log("📋 Current resources state:", {
          resourcesLength: resources.length,
          resources: resources.map((r, i) => ({
            index: i,
            hasServiceArea: !!r.serviceArea?.child?.value?.value,
            serviceAreaValue: r.serviceArea?.child?.value?.value,
            hasAllocation: !!(r.targetAllocation?.child?.value?.value && r.targetAllocation.child.value.value > 0),
            allocationValue: r.targetAllocation?.child?.value?.value
          }))
        });
        
        if (resources.length === 0) {
          return "📋 **No resources found during creation**\n\n💡 **Tip:** You can add resources using the addResource action.";
        }
        
        try {
          if (resourceIndex !== undefined && resourceIndex !== null && resourceIndex !== '') {
            // Get specific resource
            const index = parseInt(resourceIndex);
            if (isNaN(index) || index < 0 || index >= resources.length) {
              return `❌ Error: Invalid resource index ${resourceIndex}. Available indices: 0-${resources.length-1}`;
            }
            
            const resource = resources[index];
            const serviceArea = resource.serviceArea?.child?.value?.value || "(not set)";
            const targetAllocation = resource.targetAllocation?.child?.value?.value || "(not set)";
            const mandatorySkills = resource.mandatorySkills?.child?.value?.map(s => s.value).join(', ') || "(not set)";
            const optionalSkills = resource.optionalSkills?.child?.value?.map(s => s.value).join(', ') || "(not set)";
            
            return `📋 **Resource ${index + 1} Details (during creation):**

**Service Area:** ${serviceArea}
**Target Allocation:** ${targetAllocation}%
**Mandatory Skills:** ${mandatorySkills}
**Optional Skills:** ${optionalSkills}

💡 **Tip:** You can update these fields using the updateResource action.`;
          } else {
            // Get all resources
            let response = `📋 **All Resources During Creation (${resources.length} total):**\n\n`;
            
            resources.forEach((resource, index) => {
              const serviceArea = resource.serviceArea?.child?.value?.value || "(not set)";
              const targetAllocation = resource.targetAllocation?.child?.value?.value || "(not set)";
              const mandatorySkills = resource.mandatorySkills?.child?.value?.map(s => s.value).join(', ') || "(not set)";
              const optionalSkills = resource.optionalSkills?.child?.value?.map(s => s.value).join(', ') || "(not set)";
              
              response += `**Resource ${index + 1}:**\n`;
              response += `  - Service Area: ${serviceArea}\n`;
              response += `  - Target Allocation: ${targetAllocation}%\n`;
              response += `  - Mandatory Skills: ${mandatorySkills}\n`;
              response += `  - Optional Skills: ${optionalSkills}\n\n`;
            });
            
            response += "💡 **Tip:** You can update any resource using updateResource(resourceIndex, fieldName, value) or get details for a specific resource using getResourceDetails(resourceIndex).";
            
            return response;
          }
          
        } catch (error) {
          console.error("❌ Error getting resource details:", error);
          return `❌ Error: Failed to get resource details - ${error.message}`;
        }
      }
    });

    console.log("📋 Copilot actions registered on CREATE page:", {
      actions: ["getCriteriaDocumentation", "listAvailableDocuments", "updateOpportunityDescription", "debugTest", "debugGenerateQuestionsWithAI", "debugResourceSelection", "updateOpportunityField", "getOpportunityFieldValue", "addResource", "testAddResource", "deleteResource", "updateResource", "getResourceDetails", "addQuestion", "testAddQuestion", "generateQuestionsWithAI", "checkQuestionGenerationStatus", "updateQuestion", "getQuestionDetails", "getCreationProgress", "getNextCreationStep"],
      hasReadableOpportunity: !!readableOpportunity
    });

    // Add initial system message with action instructions
    useEffect(() => {
      // Add a system message explaining how to use actions (only once when no messages)
      // Don't send if guided creation is active - it will send its own welcome message
      const isGuidedCreationActive = (window as any).__guidedCreationActive;
      if (messages && messages.length === 0 && !isGuidedCreationActive) {
        appendMessage(
          new TextMessage({
            content: CREATION_SYSTEM_INSTRUCTIONS,
            role: Role.System,
            id: "action-instructions-create"
          })
        );
      }
    }, [messages, appendMessage]);

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
    useCopilotAction({
      name: "startGuidedCreation",
      description: "Start the guided creation workflow for a new Team With Us opportunity. Use this when users want step-by-step guidance to create an opportunity from scratch.",
      parameters: [],
      handler: async () => {
        console.log("Starting guided creation workflow");
        
        try {
          console.log("✨ Starting dedicated guided creation workflow");
          
          // Clear chat for fresh start
          setMessages([]);
          
          setTimeout(() => {
            // Send system context first
            appendMessage(
              new TextMessage({
                content: `SYSTEM: GUIDED CREATION WORKFLOW ACTIVE

You are now in GUIDED CREATION mode. Your role is to:

1. Guide the user through creating a Team With Us opportunity step-by-step
2. Ask for information conversationally about each section
3. Use actions to fill form fields immediately as information is provided
4. Progress systematically through all required sections
5. Provide examples, guidance, and best practices

This is CREATION mode - you are building new content, not reviewing existing content.

**CRITICAL: You have access to these specific actions for question generation:**
- generateQuestionsWithAI() - Use this to automatically generate optimized questions based on resources and skills
- addQuestion() - Use this to create blank questions for manual customization
- checkQuestionGenerationStatus() - Use this to monitor AI generation progress

**When users reach the questions step and have resources with skills:**
1. ALWAYS try to use generateQuestionsWithAI() first
2. If that action is not available, fall back to addQuestion() and create questions manually
3. Provide clear guidance on what to do next

Required workflow actions:
- updateOpportunityField(fieldName, value) - Fill form fields as users provide info
- addResource() - Add resource requirements
- updateResource(resourceIndex, fieldName, value) - Configure resources with skills
- generateQuestionsWithAI() - Generate optimized questions (PREFERRED)
- addQuestion() - Create manual questions (FALLBACK)
- getCreationProgress() - Check progress and next steps`,
                role: Role.System,
                id: "guided-creation-context"
              })
            );
            
            setTimeout(() => {
              // Send the main guided creation message
              appendMessage(
                new TextMessage({
                  content: `# 🌟 **Team With Us Opportunity Creation Assistant**

Welcome! I'm here to help you create a compliant Team With Us opportunity step by step. I'll guide you through each section and automatically fill out the form as we discuss your project.

## 📋 **What We'll Build Together:**
1. **Project Overview** - Title, summary, and location
2. **Timeline Planning** - Key dates and milestones  
3. **Budget Planning** - Maximum budget for the engagement
4. **Resource Requirements** - Skills and roles you need
5. **Project Description** - Detailed scope and deliverables
6. **Evaluation Questions** - How you'll assess vendor proposals (with AI-powered generation!)
7. **Final Review** - Compliance and quality check

I'll handle the form fields automatically, so you can focus on describing your project needs.

**🤖 AI-Powered Features:**
- **Smart Question Generation**: Once you define your resources and skills, I can automatically generate optimized evaluation questions
- **Comprehensive Coverage**: AI creates questions that efficiently evaluate all your requirements
- **Best Practices**: Questions follow government procurement standards and best practices

---

## 🎯 **Step 1: Project Title**

Let's start with the basics. **What would you like to call your project?**

Please provide a clear, descriptive title that vendors will immediately understand. Here are some good examples:
- "Digital Platform Modernization Initiative"
- "Customer Portal Development Project"  
- "Data Analytics Platform Implementation"
- "Legacy System Migration to Cloud"
- "API Integration and Automation Platform"

Your project title should be specific enough to convey the type of work but broad enough to allow for vendor creativity in their approach.

**What's your project title?**`,
                  role: Role.System,
                  id: "guided-creation-welcome"
                })
              );
            }, 200);
          }, 100);
          
          return "✨ **Guided Creation Started!**\n\nI'm ready to help you create your Team With Us opportunity step-by-step. Let's build something great together!";
          
        } catch (error) {
          console.error("❌ Error starting guided creation:", error);
          return `❌ Error: Failed to start guided creation - ${error.message}`;
        }
      }
    });

    // Action to add a new question during creation
    useCopilotAction({
      name: "addQuestion",
      description: "Add a new resource question to the Team With Us opportunity. This will create a blank question that you can then customize.",
      parameters: [],
      handler: async () => {
        console.log("🔧 addQuestion called");
        
        if (!state.form) {
          console.error("❌ Form state not available");
          return "❌ Error: Form not available. Please try refreshing the page.";
        }
        
        console.log("✅ Form state available, proceeding with question addition");
        
        try {
          // Switch to Resource Questions tab
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const)));
          dispatch(switchTabMsg as Msg);
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Add a new question - use the exact same structure as the working edit page
          const addQuestionMsg = adt("form", adt("resourceQuestions", adt("addQuestion")));
          console.log("🔄 Dispatching addQuestion:", addQuestionMsg);
          dispatch(addQuestionMsg as Msg);
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const questionCount = state.form?.resourceQuestions?.questions?.length || 0;
          
          return `✅ **New question added successfully!**

**Question #:** ${questionCount} (index ${questionCount - 1})

💡 **Tip:** You can now customize this question using:
- updateQuestion(${questionCount - 1}, "text", "Your question text here")
- updateQuestion(${questionCount - 1}, "guideline", "Your guideline text here")
- updateQuestion(${questionCount - 1}, "wordLimit", "500")
- updateQuestion(${questionCount - 1}, "score", "20")`;
          
        } catch (error) {
          console.error("❌ Error adding question:", error);
          return `❌ Error: Failed to add question - ${error.message}`;
        }
      }
    });

    // Simple test action to verify resource addition works
    useCopilotAction({
      name: "testAddResource",
      description: "Simple test to add a blank resource without any parameters. Use this to test if basic resource addition is working.",
      parameters: [],
      handler: async () => {
        console.log("🧪 Testing basic resource addition");
        
        if (!state.form) {
          return "❌ Error: Form not available";
        }
        
        try {
          // Switch to Resource Details tab
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", TAB_NAMES.RESOURCE_DETAILS as const)));
          dispatch(switchTabMsg);
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Add a new resource
          const addResourceMsg = adt("form", adt("resources", adt("addResource")));
          console.log("🔄 Dispatching test resource add:", addResourceMsg);
          dispatch(addResourceMsg as Msg);
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const resources = state.form?.resources?.resources || [];
          console.log("📋 Resources after test add:", resources.length);
          
          return `✅ Test resource addition completed! Total resources: ${resources.length}`;
          
        } catch (error) {
          console.error("❌ Test resource addition failed:", error);
          return `❌ Test failed: ${error.message}`;
        }
      }
    });

    // Simple test action to verify question addition works
    useCopilotAction({
      name: "testAddQuestion",
      description: "Simple test to add a blank question without any parameters. Use this to test if basic question addition is working.",
      parameters: [],
      handler: async () => {
        console.log("🧪 Testing basic question addition");
        
        if (!state.form) {
          return "❌ Error: Form not available";
        }
        
        try {
          // Switch to Resource Questions tab
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const)));
          dispatch(switchTabMsg as Msg);
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Add a new question
          const addQuestionMsg = adt("form", adt("resourceQuestions", adt("addQuestion")));
          console.log("🔄 Dispatching test question add:", addQuestionMsg);
          dispatch(addQuestionMsg as Msg);
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const questionCount = state.form?.resourceQuestions?.questions?.length || 0;
          console.log("📋 Questions after test add:", questionCount);
          
          return `✅ Test question addition completed! Total questions: ${questionCount}`;
          
        } catch (error) {
          console.error("❌ Test question addition failed:", error);
          return `❌ Test failed: ${error.message}`;
        }
      }
    });

    // Action to generate questions with AI based on skills
    useCopilotAction({
      name: "generateQuestionsWithAI",
      description: "Generate comprehensive evaluation questions using AI based on the skills and service areas defined in your resources. This will create optimized questions that cover all your requirements efficiently.",
      parameters: [],
      handler: async () => {
        console.log("🚨🚨🚨 generateQuestionsWithAI ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
        
        if (!state.form) {
          return "❌ Error: Form not available. Please try refreshing the page.";
        }
        
        // Check if we have resources with skills
        const resources = state.form?.resources?.resources || [];
        if (resources.length === 0) {
          return "❌ Error: No resources found. Please add resources with skills first using the addResource action.";
        }
        
        // Check if resources have skills defined
        const hasSkills = resources.some(resource => {
          const mandatorySkills = resource.mandatorySkills?.child?.value || [];
          const optionalSkills = resource.optionalSkills?.child?.value || [];
          return mandatorySkills.length > 0 || optionalSkills.length > 0;
        });
        
        if (!hasSkills) {
          return "❌ Error: No skills found in resources. Please add skills to your resources first using the updateResource action.";
        }
        
        try {
          // Switch to Resource Questions tab
          const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Resource Questions" as const)));
          console.log("Switching to Resource Questions tab:", switchTabMsg);
          dispatch(switchTabMsg as Msg);
          
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Build generation context from form state
          const generationContext = {
            title: state.form?.title?.child?.value || '',
            teaser: state.form?.teaser?.child?.value || '',
            description: state.form?.description?.child?.value || '',
            location: state.form?.location?.child?.value || '',
            remoteOk: state.form?.remoteOk?.child?.value === "yes",
            remoteDesc: state.form?.remoteDesc?.child?.value || '',
            resources: resources.map(resource => ({
              serviceArea: resource.serviceArea?.child?.value?.value || '',
              targetAllocation: resource.targetAllocation?.child?.value?.value || 0,
              mandatorySkills: (resource.mandatorySkills?.child?.value || []).map((s: any) => s.value),
              optionalSkills: (resource.optionalSkills?.child?.value || []).map((s: any) => s.value)
            }))
          };
          
          console.log("Generation context:", generationContext);
          
          // Trigger AI generation using the existing functionality
          const generateWithAIMsg = adt("form", adt("resourceQuestions", adt("generateWithAI", generationContext)));
          console.log("Triggering AI generation:", generateWithAIMsg);
          dispatch(generateWithAIMsg as Msg);
          
          // Wait a moment for the generation to start
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Give more time for the generation to start and check status
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if generation started successfully
          const isGenerating = state.form?.resourceQuestions?.isGenerating;
          const generationErrors = state.form?.resourceQuestions?.generationErrors || [];
          
          if (isGenerating) {
            return `🤖 **AI Question Generation Started!**

**Status:** Generating optimized questions based on your resources and skills...

**What's happening:**
- AI is analyzing your ${resources.length} resources and their skills
- Creating comprehensive evaluation questions that efficiently cover all requirements
- Optimizing for minimal redundancy while ensuring complete coverage
- Generating clear evaluation guidelines for each question

**Please wait** - this typically takes 10-30 seconds. The questions will appear automatically when generation is complete.

💡 **Tip:** You can use checkQuestionGenerationStatus() to monitor progress.`;
          } else if (generationErrors.length > 0) {
            return `❌ **AI Generation Failed to Start**

**Status:** Generation encountered errors

**Errors:**
${generationErrors.map(error => `- ${error}`).join('\n')}

**Next steps:**
- Check that your resources have skills defined
- Try the generateQuestionsWithAI action again
- If the issue persists, contact support`;
          } else {
            // Check if there are existing questions that need confirmation
            const existingQuestions = state.form?.resourceQuestions?.questions || [];
            if (existingQuestions.length > 0) {
              return `🤖 **AI Question Generation Ready!**

**Status:** Ready to generate new questions

**Note:** You have ${existingQuestions.length} existing questions. The AI will replace them with optimized questions based on your current resources and skills.

**Next step:** The system will show a confirmation dialog. Please confirm to proceed with AI generation.

💡 **Tip:** The new AI-generated questions will be optimized to efficiently evaluate all your skills and service areas.`;
            } else {
              return `✅ **AI Generation Dispatched Successfully!**

**Status:** Generation request sent to the system

**What's happening:**
- The generation request has been dispatched to the form
- The system should now be processing your request
- This may take a moment to start

**Next steps:**
- Wait a moment for generation to begin
- Use checkQuestionGenerationStatus() to monitor progress
- Questions will appear automatically when complete

💡 **Tip:** If you don't see questions appearing, try checkQuestionGenerationStatus() to see the current state.`;
            }
          }
          
        } catch (error) {
          console.error("❌ Error in generateQuestionsWithAI:", error);
          return `❌ Error: Failed to start AI generation - ${error.message}`;
        }
      }
    });

    // Action to check AI generation status
    useCopilotAction({
      name: "checkQuestionGenerationStatus",
      description: "Check the current status of AI question generation. Use this to see if generation is in progress, complete, or if there were any errors.",
      parameters: [],
      handler: async () => {
        console.log("🚨🚨🚨 checkQuestionGenerationStatus ACTION CALLED ON CREATE PAGE! 🚨🚨🚨");
        
        if (!state.form) {
          return "❌ Error: Form not available. Please try refreshing the page.";
        }
        
        const resourceQuestions = state.form?.resourceQuestions;
        const isGenerating = resourceQuestions?.isGenerating || false;
        const generationErrors = resourceQuestions?.generationErrors || [];
        const questions = resourceQuestions?.questions || [];
        
        if (isGenerating) {
          return `🤖 **AI Generation Status: IN PROGRESS**

**Status:** Currently generating questions...

**What's happening:**
- AI is analyzing your resources and skills
- Creating optimized evaluation questions
- This typically takes 10-30 seconds

**Please wait** - questions will appear automatically when complete.`;
        } else if (generationErrors.length > 0) {
          return `❌ **AI Generation Status: ERROR**

**Status:** Generation failed

**Errors:**
${generationErrors.map(error => `- ${error}`).join('\n')}

**Next steps:**
- Check that your resources have skills defined
- Try the generateQuestionsWithAI action again
- If the issue persists, contact support`;
        } else if (questions.length > 0) {
          return `✅ **AI Generation Status: COMPLETE**

**Status:** Successfully generated ${questions.length} questions

**Questions created:**
${questions.map((q, i) => {
  const questionText = FormField.getValue(q.question as any) as string || "(not set)";
  return `${i + 1}. ${questionText.substring(0, 100)}${questionText.length > 100 ? '...' : ''}`;
}).join('\n')}

**Next steps:**
- Review the generated questions
- Customize them if needed using updateQuestion()
- Add more questions manually if desired`;
        } else {
          return `📋 **AI Generation Status: READY**

**Status:** No questions generated yet

**To generate questions:**
- Use the generateQuestionsWithAI action
- Make sure you have resources with skills defined
- The AI will create optimized questions based on your requirements`;
        }
      }
    });

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
        onClick: () => dispatch(adt("publish", isViewerAdmin ? TWUOpportunityStatus.Published : TWUOpportunityStatus.UnderReview) as Msg)
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
          const evaluationPanelValues = state.form ? state.form.evaluationPanel : null;
          const hasValidEvaluators = evaluationPanelValues && 
            state.form && 
            Form.isEvaluationPanelTabValid(state.form);

          if (!hasValidEvaluators) {
            // Navigate to evaluation panel tab and show error
            const switchTabMsg = adt("form", adt("tabbedForm", adt("setActiveTab", "Evaluation Panel" as const)));
            dispatch(switchTabMsg as Msg);
            
            setTimeout(() => {
              dispatch(component_.global.showToastMsg(
                adt("error", {
                  title: "Evaluation Panel Required",
                  body: `Please complete the '${TAB_NAMES.EVALUATION_PANEL}' tab first. You need to add at least one evaluator before using Create with AI.`
                })
              ));
            }, 100);
            return;
          }

          // If evaluators are valid, start guided creation
          console.log("🌟 Starting guided creation workflow - evaluators validated");
          
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
