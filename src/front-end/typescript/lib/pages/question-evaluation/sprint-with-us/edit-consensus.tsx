import { Route, SharedState } from "front-end/lib/app/types";
import { immutable, component as component_ } from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import { adt, Id } from "shared/lib/types";
import { invalid, valid } from "shared/lib/validation";
import * as Tab from "front-end/lib/pages/proposal/sprint-with-us/view/tab";
import {
  component as proposalComponent,
  State_,
  InnerMsg_,
  Msg
} from "front-end/lib/pages/proposal/sprint-with-us/view";
import { isUserType } from "front-end/lib/access-control";
import { UserType } from "shared/lib/resources/user";

export type RouteParams = {
  opportunityId: Id;
  proposalId: Id;
  evaluationId: Id;
  tab?: Tab.TabId;
};

function makeInit<K extends Tab.TabId>(): component_.page.Init<
  RouteParams,
  SharedState,
  State_<K>,
  InnerMsg_<K>,
  Route
> {
  return isUserType({
    userType: [UserType.Admin, UserType.Government],
    success({ routePath, routeParams, shared }) {
      const { opportunityId, proposalId, evaluationId } = routeParams;
      return [
        valid(
          immutable({
            proposal: null,
            tab: null,
            sidebar: null
          })
        ) as State_<K>,
        [
          component_.cmd.join4(
            api.proposals.swu.readOne(opportunityId)(proposalId, (response) =>
              api.isValid(response) ? response.value : null
            ),
            api.opportunities.swu.readOne()(opportunityId, (response) =>
              api.isValid(response) ? response.value : null
            ),
            api.proposals.swu.teamQuestions.consensuses.readOne(proposalId)(
              evaluationId,
              (response) => (api.isValid(response) ? response.value : null)
            ),
            api.proposals.swu.teamQuestions.evaluations.readMany(proposalId)(
              (response) => (api.isValid(response) ? response.value : null)
            ),
            (proposal, opportunity, evaluation, panelEvaluations) => {
              if (!proposal || !opportunity || !evaluation || !panelEvaluations)
                return component_.global.replaceRouteMsg(
                  adt("notFound" as const, { path: routePath })
                );
              return adt("onInitResponse", [
                shared.sessionUser,
                routeParams,
                proposal,
                opportunity,
                true,
                evaluation,
                panelEvaluations
              ]) as Msg;
            }
          )
        ]
      ];
    },
    fail({ routePath }) {
      return [
        invalid(null),
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
}

export const component = { ...proposalComponent, init: makeInit() };
