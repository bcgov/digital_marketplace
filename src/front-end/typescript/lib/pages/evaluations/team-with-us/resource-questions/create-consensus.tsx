import { Route, SharedState } from "front-end/lib/app/types";
import { immutable, component as component_ } from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import { adt, Id } from "shared/lib/types";
import { invalid, valid } from "shared/lib/validation";
import * as Tab from "front-end/lib/pages/proposal/team-with-us/view/tab";
import {
  component as proposalComponent,
  State_,
  InnerMsg_,
  Msg
} from "front-end/lib/pages/proposal/team-with-us/view";
import { isUserType } from "front-end/lib/access-control";
import { UserType } from "shared/lib/resources/user";

export type RouteParams = {
  opportunityId: Id;
  proposalId: Id;
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
      const { opportunityId, proposalId } = routeParams;
      return [
        valid(
          immutable({
            proposal: null,
            tab: null,
            sidebar: null
          })
        ) as State_<K>,
        [
          component_.cmd.join5(
            api.proposals.twu.readOne(opportunityId)(proposalId, (response) =>
              api.isValid(response) ? response.value : null
            ),
            api.opportunities.twu.readOne()(opportunityId, (response) =>
              api.isValid(response) ? response.value : null
            ),
            api.proposals.twu.resourceQuestions.evaluations.readMany(
              proposalId
            )((response) => (api.isValid(response) ? response.value : null)),
            api.proposals.twu.readMany(opportunityId)((response) =>
              api.isValid(response) ? response.value : null
            ),
            api.proposals.twu.resourceQuestions.consensuses.readOne(proposalId)(
              shared.sessionUser.id,
              (response) => (api.isValid(response) ? response.value : null)
            ),
            (
              proposal,
              opportunity,
              panelEvaluations,
              proposals,
              evaluation
            ) => {
              if (evaluation) {
                return component_.global.replaceRouteMsg(
                  adt("questionEvaluationConsensusTWUEdit", {
                    opportunityId,
                    proposalId,
                    userId: shared.sessionUser.id,
                    tab: "resourceQuestions"
                  }) as Route
                );
              }
              if (!proposal || !opportunity || !panelEvaluations || !proposals)
                return component_.global.replaceRouteMsg(
                  adt("notFound" as const, { path: routePath })
                );
              return adt("onInitResponse", [
                shared.sessionUser,
                routeParams,
                proposal,
                opportunity,
                true,
                undefined, // No evaluation to load
                panelEvaluations,
                proposals
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
