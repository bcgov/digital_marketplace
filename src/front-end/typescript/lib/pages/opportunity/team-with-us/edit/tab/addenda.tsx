import { Route } from "front-end/lib/app/types";
import * as Addenda from "front-end/lib/components/addenda";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/opportunity/team-with-us/edit/tab";
import EditTabHeader from "front-end/lib/pages/opportunity/team-with-us/lib/views/edit-tab-header";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  TWUOpportunity,
  TWUOpportunityStatus
} from "shared/lib/resources/opportunity/team-with-us";
import { adt, ADT } from "shared/lib/types";
import { invalid, valid } from "shared/lib/validation";

export interface State extends Tab.Params {
  opportunity: TWUOpportunity | null;
  addenda: Immutable<Addenda.State> | null;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"addenda", Addenda.Msg>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  return [
    {
      ...params,
      opportunity: null,
      addenda: null
    },
    []
  ];
};

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const opportunity = msg.value[0];
      const existingAddenda = opportunity.addenda;
      const [addendaState, addendaCmds] = Addenda.init({
        existingAddenda: existingAddenda,
        publishNewAddendum(value) {
          return api.opportunities.twu.update<Addenda.PublishNewAddendumResponse>()(
            opportunity.id,
            adt("addAddendum", value),
            (response) => {
              switch (response.tag) {
                case "valid":
                  return valid(response.value.addenda);
                case "invalid":
                case "unhandled":
                  if (response.value?.opportunity?.tag === "addAddendum") {
                    return invalid(response.value.opportunity.value);
                  }
                  return invalid([
                    "Unable to add addenda due to a system error."
                  ]);
              }
            }
          );
        }
      });
      return [
        state
          .set("opportunity", opportunity)
          .set("addenda", immutable(addendaState)),
        [
          ...component_.cmd.mapMany(
            addendaCmds,
            (msg) => adt("addenda", msg) as Msg
          ),
          component_.cmd.dispatch(component_.page.readyMsg())
        ]
      ];
    }
    case "addenda":
      return component_.base.updateChild({
        state,
        childStatePath: ["addenda"],
        childUpdate: Addenda.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("addenda", value)
      });
    default:
      return [state, []];
  }
};

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  if (!state.opportunity || !state.addenda) return null;
  return (
    <div>
      <EditTabHeader
        opportunity={state.opportunity}
        viewerUser={state.viewerUser}
      />
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3 className="mb-4">Addenda</h3>
            <p className="mb-4">
              Provide additional information here to clarify or support the
              information in the original opportunity.
            </p>
            <Addenda.view
              state={state.addenda}
              dispatch={component_.base.mapDispatch(dispatch, (msg) =>
                adt("addenda" as const, msg)
              )}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
};

export const component: Tab.Component<State, InnerMsg> = {
  init,
  update,
  view,

  onInitResponse(response) {
    return adt("onInitResponse", response);
  },

  getModal(state) {
    if (!state.addenda) return component_.page.modal.hide();
    return component_.page.modal.map(Addenda.getModal(state.addenda), (value) =>
      adt("addenda", value)
    );
  },

  /**
   * Checks to see if state = isEditing and produces Publish and Cancel
   * actions (via buttons), otherwise an 'Add Addendum' action/button. Produces
   * nothing if the opportunity status is 'Canceled' or if addenda is not set.
   *
   * @param state - Immutable state
   * @param dispatch - Msg
   */
  getActions: function ({ state, dispatch }) {
    if (
      !state.addenda ||
      state.opportunity?.status === TWUOpportunityStatus.Canceled
    )
      return component_.page.actions.none();
    return Addenda.getActions({
      state: state.addenda,
      dispatch: component_.base.mapDispatch(dispatch, (msg) =>
        adt("addenda" as const, msg)
      )
    });
  }
};
