import { makePageMetadata, updateValid, viewValid } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Form from "front-end/lib/pages/opportunity/team-with-us/lib/components/form";
import * as AddendaTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/addenda";
import * as HistoryTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/history";
import * as ProposalsTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/proposals";
import * as SummaryTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/summary";
import * as OpportunityTab from "front-end/lib/pages/opportunity/team-with-us/edit/tab/opportunity";
import React from "react";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid } from "shared/lib/http";
import { Validation } from "shared/lib/validation";
import {
  TWUProposalSlim,
  TWUProposal
} from "shared/lib/resources/proposal/team-with-us";
import { OrganizationSlim } from "shared/lib/resources/organization";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import * as OpportunityView from "../view";
import EditTabHeader from "../lib/views/edit-tab-header";
import * as ProposalDetailsSection from "./proposal-details";
import OpportunityReadOnly from "../edit/tab/opportunity-readonly";

export interface RouteParams {
  opportunityId: Id;
}

export interface ValidState {
  opportunity: TWUOpportunity | null;
  viewerUser: User;
  notFound: boolean;
  loading: boolean;
  form: Immutable<Form.State>;
  addendaState: Immutable<AddendaTab.State>;
  historyState: Immutable<HistoryTab.State>;
  proposalsState: Immutable<ProposalsTab.State>;
  summaryState: Immutable<SummaryTab.State>;
  opportunityState: Immutable<OpportunityTab.State>;
  proposals: TWUProposal[];
  organizations: OrganizationSlim[];
  proposalAffiliations: Record<Id, AffiliationMember[]>;
  opportunityViewState: Immutable<OpportunityView.State>;
  proposalDetailsState: Immutable<ProposalDetailsSection.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg =
  | ADT<"onInitResponse", api.ResponseValidation<TWUOpportunity, string[]>>
  | ADT<"addenda", AddendaTab.InnerMsg>
  | ADT<"history", HistoryTab.InnerMsg>
  | ADT<"proposals", ProposalsTab.InnerMsg>
  | ADT<"summary", SummaryTab.InnerMsg>
  | ADT<"opportunityTab", OpportunityTab.InnerMsg>
  | ADT<"opportunityView", OpportunityView.InnerMsg>
  | ADT<"onProposalsReceived", TWUProposalSlim[]>
  | ADT<"onProposalDetailResponse", TWUProposal>
  | ADT<"onAffiliationsResponse", [Id, AffiliationMember[]]>
  | ADT<"proposalDetails", ProposalDetailsSection.Msg>
  | ADT<"noop">;

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
      canRemoveExistingAttachments: false,
      users: []
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
      component_.cmd.map(
        cmd as component_.Cmd<OpportunityView.InnerMsg>,
        (msg) => adt("opportunityView" as const, msg) as InnerMsg
      )
    );

    const pageCommands = [
      api.opportunities.twu.readOne()(routeParams.opportunityId, (response) =>
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
            viewerUser: shared.sessionUser,
            opportunity: null,
            form: null,
            showModal: null,
            startEditingLoading: 0,
            saveChangesLoading: 0,
            saveChangesAndUpdateStatusLoading: 0,
            updateStatusLoading: 0,
            deleteLoading: 0,
            isEditing: false
          }),
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

        const [proposalDetailsState, initialProposalDetailsCmds] =
          ProposalDetailsSection.component.init({
            opportunity: currentOpportunity,
            proposals: currentState.proposals,
            viewerUser: currentState.viewerUser
          });

        const proposalDetailsCmds: component_.Cmd<Msg>[] =
          initialProposalDetailsCmds.map((cmd) =>
            component_.cmd.map(
              cmd,
              (pdMsg: ProposalDetailsSection.Msg) =>
                adt("proposalDetails", pdMsg) as Msg
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
          return [state.set("loading", false), []];
        }

        const finalOpportunityState = state.opportunityState.set(
          "opportunity",
          opportunity
        );

        // Create init messages for tabs that need the opportunity data
        const addendaOnInitMsg = AddendaTab.component.onInitResponse([
          opportunity,
          [] as TWUProposalSlim[],
          [],
          []
        ]);

        const historyOnInitMsg = HistoryTab.component.onInitResponse([
          opportunity,
          [] as TWUProposalSlim[],
          [],
          []
        ]);

        const oppTabOnInitMsg = OpportunityTab.component.onInitResponse([
          opportunity,
          [] as TWUProposalSlim[],
          [],
          []
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
          api.proposals.twu.readMany(opportunity.id)((proposalResponse) =>
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

        const proposalsOnInitMsg = ProposalsTab.component.onInitResponse([
          state.opportunity,
          proposalSlims,
          [],
          []
        ]);
        const summaryOnInitMsg = SummaryTab.component.onInitResponse([
          state.opportunity,
          proposalSlims,
          [],
          []
        ]);

        const proposalCmds = proposalSlims.map((slim) =>
          api.proposals.twu.readOne(state.opportunity!.id)(
            slim.id,
            (response) => {
              return api.isValid(response)
                ? adt("onProposalDetailResponse", response.value)
                : adt("noop");
            }
          )
        );

        const commands = [
          component_.cmd.dispatch(adt("proposals", proposalsOnInitMsg)),
          component_.cmd.dispatch(adt("summary", summaryOnInitMsg)),
          ...proposalCmds
        ];

        return [state, commands] as [
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
            competitionRulesContent:
              contentResponse.tag === "valid" ? contentResponse.value.body : "",
            viewerUser: state.viewerUser,
            activeInfoTab: "details",
            toggleWatchLoading: 0,
            qualification: "notQualified",
            table: state.opportunityViewState.table
          };

          const updatedState = state.set(
            "opportunityViewState",
            immutable(newInnerState)
          );
          return [updatedState, []];
        }
        return [state, []];
      }

      case "noop":
        return [state, []];

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

    const createOpportunityViewState = (
      activeTab: OpportunityView.State["activeInfoTab"]
    ): Immutable<OpportunityView.State> | null => {
      return state.opportunityViewState.set("activeInfoTab", activeTab);
    };

    const opportunityViewStates = {
      details: createOpportunityViewState("details"),
      attachments: createOpportunityViewState("attachments"),
      addenda: createOpportunityViewState("addenda"),
      competitionRules: createOpportunityViewState("competitionRules")
    };

    let sectionCounter = 1;

    return (
      <div className="opportunity-complete-page">
        {opportunityViewStates.details ? (
          <>
            <h2>{sectionCounter++}. Public View - Opportunity Details</h2>
            <OpportunityView.component.view
              state={opportunityViewStates.details}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Opportunity Details View...</div>
        )}

        {opportunityViewStates.competitionRules ? (
          <>
            <h2 className="complete-report-section-header">
              {sectionCounter++}. Public View - Competition Rules
            </h2>
            <OpportunityView.component.view
              state={opportunityViewStates.competitionRules}
              dispatch={() => {}}
            />
            <hr />
          </>
        ) : (
          <div>Loading Competition Rules View...</div>
        )}

        {opportunityViewStates.attachments ? (
          <>
            <h2 className="complete-report-section-header">
              {sectionCounter++}. Public View - Opportunity Attachments
            </h2>
            <OpportunityView.component.view
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
            <OpportunityView.component.view
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
        <SummaryTab.component.view
          state={state.summaryState}
          dispatch={() => {}}
        />
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
        <AddendaTab.component.view
          state={state.addendaState}
          dispatch={() => {}}
        />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Proposals
        </h2>
        <ProposalsTab.component.view
          state={state.proposalsState}
          dispatch={() => {}}
        />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Opportunity History
        </h2>
        <HistoryTab.component.view
          state={state.historyState}
          dispatch={() => {}}
        />
        <hr />

        <h2 className="complete-report-section-header">
          {sectionCounter++}. Admin View - Proposal Details
        </h2>
        <ProposalDetailsSection.component.view
          state={state.proposalDetailsState}
          dispatch={(msg: ProposalDetailsSection.Msg) =>
            dispatch(adt("proposalDetails", msg) as Msg)
          }
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
