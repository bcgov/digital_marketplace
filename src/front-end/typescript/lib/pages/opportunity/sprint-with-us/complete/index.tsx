import { makePageMetadata, updateValid, viewValid } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Form from "front-end/lib/pages/opportunity/sprint-with-us/lib/components/form";
import * as AddendaTab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/addenda";
import React from "react";
import { Col, Row } from "reactstrap";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import EditTabHeader from "front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import { SWUProposalSlim } from "shared/lib/resources/proposal/sprint-with-us";
import { invalid, valid } from "shared/lib/http";
import { Validation } from "shared/lib/validation";

export interface RouteParams {
  opportunityId: Id;
}

export interface ValidState {
  opportunity: SWUOpportunity | null;
  viewerUser: User;
  notFound: boolean;
  loading: boolean;
  form: Immutable<Form.State>;
  addendaState: Immutable<AddendaTab.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg =
  | ADT<"onInitResponse", api.ResponseValidation<SWUOpportunity, string[]>>
  | ADT<"addenda", AddendaTab.InnerMsg>;

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
    const [formState, _formCmds] = Form.init({
      viewerUser: shared.sessionUser,
      canRemoveExistingAttachments: false
    });
    // console.log("shared.sessionUser in init:", shared.sessionUser);
    return [
      valid(
        immutable({
          opportunity: null,
          viewerUser: shared.sessionUser,
          notFound: false,
          loading: true,
          form: immutable(formState),
          addendaState: null
        })
      ),
      [
        api.opportunities.swu.readOne()(routeParams.opportunityId, (response) =>
          adt("onInitResponse", response)
        )
      ] as component_.Cmd<Msg>[]
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
    switch (msg.tag) {
      case "onInitResponse": {
        console.log("COMPLETE page update, onInitResponse", msg.value);
        const response = msg.value;
        switch (response.tag) {
          case "valid": {
            //   console.log("update, onInitResponse valid", response.value);
            //   console.log('update, state.viewerUser: ', state.viewerUser)
            const opportunity = response.value;
            // Initialize the form
            const [formState, _formCmds] = Form.init({
              opportunity,
              viewerUser: state.viewerUser,
              canRemoveExistingAttachments: false
            });

            // Initialize the basic addenda tab state structure
            // Note: AddendaTab.component.init likely just sets up the basic shape and viewerUser
            const [addendaInitState] = AddendaTab.component.init({
              viewerUser: state.viewerUser
            });

            console.log(
              "COMPLETE page update(), addendaInitState, calling AddendaTab.component.onInitResponse: ",
              addendaInitState
            );

            // Create the initialization message expected by AddendaTab's update function.
            const addendaOnInitMsg = AddendaTab.component.onInitResponse([
              opportunity,
              [] as SWUProposalSlim[],
              [] as SWUTeamQuestionResponseEvaluation[]
            ]);
            console.log(
              "COMPLETE page update(), addendaOnInitMsg: ",
              addendaOnInitMsg
            );

            return [
              state.merge({
                opportunity,
                loading: false,
                form: immutable(formState),
                addendaState: immutable(addendaInitState)
              }),
              [
                component_.cmd.dispatch(adt("addenda", addendaOnInitMsg)),
                component_.cmd.dispatch(component_.page.readyMsg())
              ]
            ];
          }
          case "invalid": {
            return [
              { ...state, notFound: true, loading: false },
              [
                component_.cmd.dispatch(
                  component_.global.replaceRouteMsg(
                    adt("notFound" as const, { path: "" })
                  )
                )
              ]
            ];
          }
          default: {
            return [state, []];
          }
        }
        // This line is never reached because all cases in the inner switch return
        // But adding it makes the linter happy
        break;
      }
      case "addenda":
        console.log('COMPLETE page update(), "addenda" msg value: ', msg.value);
        return component_.base.updateChild({
          state,
          childStatePath: ["addendaState"],
          childUpdate: AddendaTab.component.update,
          childMsg: msg.value,
          mapChildMsg: (value: AddendaTab.InnerMsg) => adt("addenda", value)
        });
      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state }) => {
    if (state.notFound) {
      return <div>Opportunity not found.</div>;
    }

    console.log("view, state: ", state);
    //   console.log('view, state.viewerUser: ', state.viewerUser)

    if (
      state.loading ||
      !state.opportunity ||
      !state.form ||
      !state.viewerUser ||
      !state.addendaState
    ) {
      return <div>Loading...</div>;
    }

    console.log(
      "rendering COMPLETE page, state.addendaState: ",
      state.addendaState
    );

    return (
      <div>
        <EditTabHeader
          opportunity={state.opportunity}
          viewerUser={state.viewerUser}
        />
        <Row className="mt-5">
          <Col xs="12">
            <Form.view
              disabled={true} // View mode only
              showAllTabs={true} // Display all tabs vertically
              expandAccordions={true} // Expand all accordions for better viewing
              state={state.form}
              dispatch={() => {}} // Empty dispatch as we're just viewing
            />
          </Col>
        </Row>

        <div className="mt-5 pt-5 border-top">
          <AddendaTab.component.view
            state={state.addendaState}
            dispatch={() => {}}
          />
        </div>
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
