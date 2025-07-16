/**
 * CWU OPPORTUNITY COMPLETE REPORT
 *
 * This file implements a comprehensive report that displays all aspects of a completed
 * Code with Us opportunity in a single, continuous document. Unlike typical pages in
 * this application, this component serves as a static report generator rather than an
 * interactive interface.
 *
 * FRAMEWORK USAGE DIFFERENCES:
 *
 * This file deviates from standard framework patterns in several important ways to
 * achieve its reporting objectives:
 *
 * 1. COMPONENT REUSE FOR STATIC DISPLAY:
 *    - Normal Usage: Components are used interactively with full dispatch functionality
 *    - This File: Reuses existing interactive components (OpportunityView, SummaryTab,
 *      ProposalsTab, etc.) but disables their interactivity by providing no-op dispatchers
 *    - Purpose: Leverages existing component rendering logic while preventing user interaction
 *
 * 2. STATE MANAGEMENT APPROACH:
 *    - Normal Usage: Each tab component manages its own state through proper initialization
 *      and update cycles, with state flowing through framework channels
 *    - This File: Manually constructs and manages all component states in a single location,
 *      bypassing individual component lifecycle management
 *    - Purpose: Ensures all sections are rendered simultaneously rather than tab-by-tab
 *
 * 3. COMPONENT LIFECYCLE BYPASSING:
 *    - Normal Usage: Components follow strict init → update → view lifecycle patterns
 *    - This File: Creates artificial state objects that match component interfaces without
 *      going through proper initialization sequences
 *    - Purpose: Eliminates interactive behavior while maintaining rendering compatibility
 *
 * 4. TABBED PAGE ABSTRACTION AVOIDANCE:
 *    - Normal Usage: Uses TabbedPage component for managing multiple tabs with sidebar
 *      navigation and proper URL routing
 *    - This File: Directly instantiates and renders multiple tab components simultaneously
 *      without tab navigation or routing
 *    - Purpose: Displays all sections in a linear, printable format
 *
 * 5. VIEW STATE MANIPULATION:
 *    - Normal Usage: Tab changes trigger proper update cycles and state transitions
 *    - This File: Creates multiple artificial view states for the same component to
 *      render different tabs (e.g., OpportunityView with different activeInfoTab values)
 *    - Purpose: Shows different "views" of the same data without user interaction
 *
 * 6. MESSAGE PASSING ELIMINATION:
 *    - Normal Usage: Components communicate through ADT-based message passing with
 *      proper dispatch routing
 *    - This File: Provides empty dispatch functions (() => {}) to all components
 *    - Purpose: Prevents any interactive behavior while maintaining component interfaces
 *
 * 7. DATA LOADING STRATEGY:
 *    - Normal Usage: Each tab component loads its own data as needed through API calls
 *    - This File: Loads all required data upfront and distributes it to manually
 *      constructed component states
 *    - Purpose: Ensures complete data availability for comprehensive reporting
 *
 * 8. COMPONENT INITIALIZATION PATTERNS:
 *    - Normal Usage: Components are initialized through proper framework channels with
 *      command execution and state management
 *    - This File: Uses component.init() functions but ignores returned commands,
 *      focusing only on initial state creation
 *    - Purpose: Generates states compatible with existing components without triggering
 *      side effects or async operations
 *
 * STRUCTURAL DIFFERENCES:
 *
 * - Public View Sections: Renders different "tabs" of the OpportunityView component
 *   by creating multiple states with different activeInfoTab values
 * - Admin View Sections: Renders various admin-only tab components (Summary, Opportunity
 *   Details, Addenda, History, Proposals) in sequential order
 * - Proposal Details: Uses a specialized ProposalDetailsSection component that manages
 *   multiple proposal forms and histories simultaneously
 * - Layout: Uses a linear, section-based layout instead of tabbed navigation
 * - Browser Warning: Includes client-side browser compatibility checking for optimal
 *   report rendering
 *
 * COMPONENT REUSE EXAMPLES:
 *
 * - OpportunityView: Rendered multiple times with different activeInfoTab values to
 *   show details, attachments, addenda, and terms sections
 * - Tab Components: SummaryTab, AddendaTab, HistoryTab, ProposalsTab rendered with
 *   disabled dispatchers
 * - Form Components: OpportunityReadOnly and ProposalFormReadOnly used for static
 *   display of form data
 *
 * DATA FLOW:
 *
 * 1. Single initialization loads opportunity data and proposals
 * 2. All component states are constructed manually in the update function
 * 3. ProposalDetailsSection handles complex proposal rendering internally
 * 4. View function renders all sections sequentially with section numbering
 * 5. No state updates occur after initial load (except for data loading states)
 *
 * This approach allows the application to generate comprehensive reports while reusing
 * existing component rendering logic, though it requires careful state management to
 * ensure compatibility with the underlying framework patterns.
 */

import { makePageMetadata, updateValid, viewValid } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Form from "front-end/lib/pages/opportunity/code-with-us/lib/components/form";
import * as AddendaTab from "front-end/lib/pages/opportunity/code-with-us/edit/tab/addenda";
import * as HistoryTab from "front-end/lib/pages/opportunity/code-with-us/edit/tab/history";
import * as ProposalsTab from "front-end/lib/pages/opportunity/code-with-us/edit/tab/proposals";
import * as SummaryTab from "front-end/lib/pages/opportunity/code-with-us/edit/tab/summary";
import * as OpportunityTab from "front-end/lib/pages/opportunity/code-with-us/edit/tab/opportunity";
import React from "react";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid } from "shared/lib/http";
import { Validation } from "shared/lib/validation";
import {
  CWUProposalSlim,
  CWUProposal,
  compareCWUProposalsForPublicSector
} from "shared/lib/resources/proposal/code-with-us";
import { OrganizationSlim } from "shared/lib/resources/organization";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import * as OpportunityView from "front-end/lib/pages/opportunity/code-with-us/view";
import EditTabHeader from "front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header";
import * as ProposalDetailsSection from "front-end/lib/pages/opportunity/code-with-us/complete/proposal-details";
import { InfoTab } from "front-end/lib/pages/opportunity/code-with-us/view";
import OpportunityReadOnly from "front-end/lib/pages/opportunity/code-with-us/edit/tab/opportunity-readonly";
import { ViewAlerts } from "front-end/lib/app/view/page";
import {
  BrowserWarning,
  isUnsupportedBrowser
} from "front-end/lib/pages/opportunity/lib/components/browser-warning";

export interface RouteParams {
  opportunityId: Id;
}

export interface ValidState {
  opportunity: CWUOpportunity | null;
  viewerUser: User;
  notFound: boolean;
  loading: boolean;
  form: Immutable<Form.State>;
  addendaState: Immutable<AddendaTab.State>;
  historyState: Immutable<HistoryTab.State>;
  proposalsState: Immutable<ProposalsTab.State>;
  summaryState: Immutable<SummaryTab.State>;
  opportunityState: Immutable<OpportunityTab.State>;
  proposals: CWUProposal[];
  organizations: OrganizationSlim[];
  proposalAffiliations: Record<Id, AffiliationMember[]>;
  opportunityViewState: Immutable<OpportunityView.State>;
  proposalDetailsState: Immutable<ProposalDetailsSection.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg =
  | ADT<"onInitResponse", api.ResponseValidation<CWUOpportunity, string[]>>
  | ADT<"addenda", AddendaTab.InnerMsg>
  | ADT<"history", HistoryTab.InnerMsg>
  | ADT<"proposals", ProposalsTab.InnerMsg>
  | ADT<"summary", SummaryTab.InnerMsg>
  | ADT<"opportunityTab", OpportunityTab.InnerMsg>
  | ADT<"opportunityView", OpportunityView.InnerMsg>
  | ADT<"onProposalsReceived", CWUProposalSlim[]>
  | ADT<"onProposalDetailResponse", CWUProposal>
  | ADT<"onAffiliationsResponse", [Id, AffiliationMember[]]>
  | ADT<"proposalDetails", ProposalDetailsSection.Msg>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType({
  userType: [UserType.Admin],
  success({ routeParams, shared }) {
    const adminUser = shared.sessionUser;

    const [formState] = Form.init({
      viewerUser: adminUser,
      canRemoveExistingAttachments: false
    });

    const [addendaInitState] = AddendaTab.component.init({
      viewerUser: adminUser
    });

    const [historyInitState] = HistoryTab.component.init({
      viewerUser: adminUser
    });

    const [proposalsInitState] = ProposalsTab.component.init({
      viewerUser: adminUser
    });

    const [summaryInitState] = SummaryTab.component.init({
      viewerUser: adminUser
    });

    const [opportunityViewState, initialOpportunityViewCmds] =
      OpportunityView.component.init({
        routeParams,
        shared: shared as unknown as SharedState,
        routePath: ""
      });

    const mappedOpportunityViewCmds = initialOpportunityViewCmds.map((cmd) =>
      component_.cmd.map(cmd, (msg) => adt("opportunityView", msg))
    );

    const pageCommands = [
      api.opportunities.cwu.readOne()(routeParams.opportunityId, (response) =>
        adt("onInitResponse", response)
      )
    ];

    return [
      valid(
        immutable({
          opportunity: null,
          viewerUser: adminUser,
          notFound: false,
          loading: true,
          form: immutable(formState),
          addendaState: immutable(addendaInitState),
          historyState: immutable(historyInitState),
          proposalsState: immutable(proposalsInitState),
          summaryState: immutable(summaryInitState),
          opportunityState: immutable({
            viewerUser: adminUser,
            opportunity: null,
            form: null,
            showModal: null,
            startEditingLoading: 0,
            saveChangesLoading: 0,
            saveChangesAndUpdateStatusLoading: 0,
            updateStatusLoading: 0,
            deleteLoading: 0,
            isEditing: false
          }), //immutable(opportunityInitState),
          proposals: [],
          organizations: [],
          proposalAffiliations: {},
          opportunityViewState: immutable(opportunityViewState),
          proposalDetailsState: immutable({ detailStates: {} })
        })
      ),
      [...pageCommands, ...mappedOpportunityViewCmds] as component_.Cmd<Msg>[]
    ];
  },
  fail({ routePath, shared }) {
    return [
      invalid(null) as any,
      [
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            shared.session
              ? adt("notFound" as const, { path: routePath })
              : adt("signIn" as const, { redirectOnSuccess: routePath })
          )
        )
      ] as component_.Cmd<Msg>[]
    ];
  }
});

const update: component_.page.Update<State, InnerMsg, Route> = updateValid(
  ({ state, msg }) => {
    const maybeInitProposalDetails = (
      currentState: Immutable<ValidState>
    ): [Immutable<ValidState>, component_.Cmd<Msg>[]] => {
      const expectedProposalCount =
        currentState.proposalsState.proposals.length;
      const allProposalsLoaded =
        currentState.proposals.length === expectedProposalCount &&
        expectedProposalCount > 0;
      const opportunityPresent = !!currentState.opportunity;

      if (
        allProposalsLoaded &&
        opportunityPresent &&
        Object.keys(currentState.proposalDetailsState.detailStates).length === 0
      ) {
        const currentOpportunity = currentState.opportunity;
        if (!currentOpportunity) return [currentState, []];

        // Sort the proposals before passing to ProposalDetailsComponent
        const sortedProposals = [...currentState.proposals].sort((a, b) =>
          compareCWUProposalsForPublicSector(a, b)
        );

        const [proposalDetailsState, initialProposalDetailsCmds] =
          ProposalDetailsSection.component.init({
            opportunity: currentOpportunity,
            proposals: sortedProposals,
            viewerUser: currentState.viewerUser
          });

        const proposalDetailsCmds: component_.Cmd<Msg>[] =
          initialProposalDetailsCmds.map((cmd) =>
            component_.cmd.map(
              cmd,
              (pdMsg) => adt("proposalDetails", pdMsg) as Msg
            )
          );

        const newState = currentState.set(
          "proposalDetailsState",
          immutable(proposalDetailsState)
        );
        return [newState, proposalDetailsCmds];
      }
      return [currentState, []];
    };

    switch (msg.tag) {
      case "onInitResponse": {
        const response = msg.value;
        if (response.tag === "invalid") {
          return [
            state.set("notFound", true).set("loading", false),
            [
              component_.cmd.dispatch(
                component_.global.replaceRouteMsg(
                  adt("notFound" as const, { path: "" })
                )
              )
            ]
          ];
        }

        const opportunity = response.value;
        if (!opportunity) {
          return [state, []];
        }

        const finalOpportunityState = state.opportunityState.set(
          "opportunity",
          opportunity
        );

        // Create init messages for tabs that need the opportunity data
        const addendaOnInitMsg = AddendaTab.component.onInitResponse([
          opportunity,
          [] as CWUProposalSlim[]
        ]);

        const historyOnInitMsg = HistoryTab.component.onInitResponse([
          opportunity,
          [] as CWUProposalSlim[]
        ]);

        const oppTabOnInitMsg = OpportunityTab.component.onInitResponse([
          opportunity,
          [] as CWUProposalSlim[]
        ]);

        // Update the state with the opportunity
        const newState = state.merge({
          opportunity,
          loading: false,
          opportunityState: finalOpportunityState
        });

        // Collect all commands
        const commands = [
          component_.cmd.dispatch(adt("addenda", addendaOnInitMsg)),
          component_.cmd.dispatch(adt("history", historyOnInitMsg)),
          component_.cmd.dispatch(adt("opportunityTab", oppTabOnInitMsg)),
          component_.cmd.dispatch(component_.page.readyMsg()),
          api.proposals.cwu.readMany(opportunity.id)((proposalResponse) =>
            adt("onProposalsReceived", api.getValidValue(proposalResponse, []))
          )
        ];

        return [newState, commands] as [
          Immutable<ValidState>,
          component_.Cmd<Msg>[]
        ];
      }
      case "onProposalsReceived": {
        const proposalSlims = msg.value;
        if (!state.opportunity) return [state, []];

        // Sort proposals using the same logic as the ProposalsTab component
        const sortedProposalSlims = [...proposalSlims].sort((a, b) =>
          compareCWUProposalsForPublicSector(a, b)
        );

        // Each component gets its own copy of the sorted array to prevent mutation
        const proposalsOnInitMsg = ProposalsTab.component.onInitResponse([
          state.opportunity,
          [...sortedProposalSlims]
        ]);
        const summaryOnInitMsg = SummaryTab.component.onInitResponse([
          state.opportunity,
          [...sortedProposalSlims]
        ]);

        const proposalCmds = sortedProposalSlims.map((slim) =>
          api.proposals.cwu.readOne(state.opportunity!.id)(
            slim.id,
            (response) => {
              if (api.isValid(response)) {
                return adt("onProposalDetailResponse", response.value);
              } else {
                return adt("noop");
              }
            }
          )
        );

        const updatedState = state;
        const summaryTabCmds: component_.Cmd<Msg>[] = [];

        const commands = [
          component_.cmd.dispatch(adt("proposals", proposalsOnInitMsg)),
          component_.cmd.dispatch(adt("summary", summaryOnInitMsg)),
          ...proposalCmds,
          ...summaryTabCmds
        ];

        return [updatedState, commands] as [
          Immutable<ValidState>,
          component_.Cmd<Msg>[]
        ];
      }
      case "onProposalDetailResponse": {
        const proposal = msg.value;
        const updatedState = state.update("proposals", (ps) => [
          ...ps,
          proposal
        ]);

        const orgCommands: component_.Cmd<Msg>[] = [];

        const [finalState, initCmds] = maybeInitProposalDetails(updatedState);

        return [finalState, [...orgCommands, ...initCmds]] as [
          Immutable<ValidState>,
          component_.Cmd<Msg>[]
        ];
      }
      case "addenda":
        return component_.base.updateChild({
          state,
          childStatePath: ["addendaState"],
          childUpdate: AddendaTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("addenda", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;
      case "history":
        return component_.base.updateChild({
          state,
          childStatePath: ["historyState"],
          childUpdate: HistoryTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("history", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;
      case "proposals":
        return component_.base.updateChild({
          state,
          childStatePath: ["proposalsState"],
          childUpdate: ProposalsTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("proposals", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;
      case "summary":
        return component_.base.updateChild({
          state,
          childStatePath: ["summaryState"],
          childUpdate: SummaryTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("summary", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;
      case "opportunityTab":
        // this will run 'resetOpportunity'
        return component_.base.updateChild({
          state,
          childStatePath: ["opportunityState"],
          childUpdate: OpportunityTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("opportunityTab", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;
      case "proposalDetails":
        return component_.base.updateChild({
          state,
          childStatePath: ["proposalDetailsState"],
          childUpdate: ProposalDetailsSection.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: ProposalDetailsSection.Msg) =>
            adt("proposalDetails", value)
        }) as component_.base.UpdateReturnValue<ValidState, Msg>;
      case "opportunityView": {
        const opportunityViewMsg = msg.value;
        if (opportunityViewMsg.tag === "onInitResponse") {
          const responsePayload = opportunityViewMsg.value;

          const [
            routePath,
            opportunityResponse,
            proposalResponse,
            contentResponse
          ] = responsePayload;

          if (opportunityResponse.tag !== "valid") {
            console.error(
              "OpportunityView initialization failed: Invalid opportunity response",
              opportunityResponse.value
            );
            return [state, []];
          }

          const newInnerState: OpportunityView.State = {
            routePath,
            opportunity: opportunityResponse.value,
            existingProposal: proposalResponse,
            termsContent:
              contentResponse.tag === "valid" ? contentResponse.value.body : "",
            viewerUser: state.viewerUser,
            activeInfoTab: "details",
            toggleWatchLoading: 0
          };

          const updatedState = state.set(
            "opportunityViewState",
            immutable(newInnerState)
          );
          return [updatedState, []];
        }
        return [state, []];
      }
      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state, dispatch }) => {
    if (state.notFound) {
      return <div>Opportunity not found.</div>;
    }

    if (
      state.loading ||
      !state.opportunity ||
      !state.form ||
      !state.opportunityViewState ||
      !state.addendaState ||
      !state.historyState ||
      !state.proposalsState ||
      !state.summaryState ||
      !state.opportunityState ||
      !state.proposalDetailsState
    ) {
      return <div>Loading...</div>;
    }

    // Extract components into PascalCase aliases for JSX usage
    const OpportunityViewComponent = OpportunityView.component.view;
    const AddendaTabComponent = AddendaTab.component.view;
    const ProposalsTabComponent = ProposalsTab.component.view;
    const HistoryTabComponent = HistoryTab.component.view;
    const SummaryTabComponent = SummaryTab.component.view;
    const ProposalDetailsComponent = ProposalDetailsSection.component.view;

    const createOpportunityViewState = (
      activeTab: InfoTab
    ): Immutable<OpportunityView.State> | null => {
      const opportunityViewState = state.opportunityViewState;
      const modifiedInnerState = opportunityViewState.set(
        "activeInfoTab",
        activeTab
      );
      return modifiedInnerState;
    };

    const opportunityViewStates = {
      details: createOpportunityViewState("details"),
      attachments: createOpportunityViewState("attachments"),
      addenda: createOpportunityViewState("addenda"),
      terms: createOpportunityViewState("terms")
    };

    let sectionCounter = 1;

    // Use the existing getAlerts function from OpportunityView
    const opportunityViewAlerts = OpportunityView.component.getAlerts
      ? OpportunityView.component.getAlerts(state.opportunityViewState)
      : component_.page.alerts.empty();

    // Cast the alerts for display only (we don't need the dispatch functionality)
    const alerts = opportunityViewAlerts as component_.page.Alerts<Msg>;

    return (
      <div className="opportunity-complete-page">
        {isUnsupportedBrowser() && <BrowserWarning />}

        {opportunityViewStates.details ? (
          <>
            <h2>{sectionCounter++}. Public View - Opportunity Details</h2>
            <ViewAlerts alerts={alerts} dispatch={dispatch} />
            <OpportunityViewComponent
              state={opportunityViewStates.details}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Opportunity Details View...</div>
        )}

        {opportunityViewStates.terms ? (
          <>
            <h2 className="complete-report-section-header">
              {sectionCounter++}. Public View - Terms and Conditions
            </h2>
            <OpportunityViewComponent
              state={opportunityViewStates.terms}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Terms and Conditions View...</div>
        )}

        {opportunityViewStates.attachments ? (
          <>
            <h2 className="complete-report-section-header">
              {sectionCounter++}. Public View - Opportunity Attachments
            </h2>
            <OpportunityViewComponent
              state={opportunityViewStates.attachments}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Opportunity Attachments View...</div>
        )}

        {opportunityViewStates.addenda ? (
          <>
            <h2 className="complete-report-section-header">
              {sectionCounter++}. Public View - Opportunity Addenda
            </h2>
            <OpportunityViewComponent
              state={opportunityViewStates.addenda}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Opportunity Addenda View...</div>
        )}

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Opportunity Summary
        </h2>
        <div className="opportunity-complete-page-header">
          <EditTabHeader
            opportunity={state.opportunity}
            viewerUser={state.viewerUser}
          />
        </div>
        <SummaryTabComponent state={state.summaryState} dispatch={() => {}} />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Opportunity Details
        </h2>
        <OpportunityReadOnly
          opportunity={state.opportunity}
          viewerUser={state.viewerUser}
          form={state.opportunityState.form}
        />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Opportunity Addenda
        </h2>
        <AddendaTabComponent state={state.addendaState} dispatch={() => {}} />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Opportunity History
        </h2>
        <HistoryTabComponent state={state.historyState} dispatch={() => {}} />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Proposals
        </h2>
        <ProposalsTabComponent
          state={state.proposalsState}
          dispatch={() => {}}
        />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Proposal Details
        </h2>
        <ProposalDetailsComponent
          state={state.proposalDetailsState}
          dispatch={(msg) => dispatch(adt("proposalDetails", msg) as Msg)}
        />
        <hr />
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
  getMetadata: (_state) => {
    return makePageMetadata(`Complete Competition`);
  }
};
